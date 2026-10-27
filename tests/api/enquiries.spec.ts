import http from "node:http";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { parse } from "yaml";
import { test, expect, type APIResponse } from "@playwright/test";
import { closeEnquiryFixtures, countEnquiries, resetEnquiries, sampleEnquiry } from "../helpers/enquiries-fixtures";

test.describe.configure({ mode: "serial" });
test.beforeEach(async () => resetEnquiries());
test.afterAll(async () => closeEnquiryFixtures());

const canonical = parse(fs.readFileSync(path.resolve("contracts/openapi.yaml"), "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
for (const [name, schema] of Object.entries(canonical.components.schemas)) ajv.addSchema(schema as object, `#/components/schemas/${name}`);
function expectContractBody(status: number, body: unknown) {
  const schema = canonical.paths["/api/v1/enquiries"].post.responses[String(status)].content["application/json"].schema;
  const validate = ajv.compile(schema);
  expect(validate(body), JSON.stringify(validate.errors)).toBe(true);
}

async function expectError(response: APIResponse, status: number, code: string) {
  expect(response.status()).toBe(status);
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(response.headers()["content-type"]).toContain("application/json");
  const body = await response.json();
  expectContractBody(status, body);
  expect(body.code).toBe(code);
  expect(Object.keys(body).every((key) => ["code", "message", "fieldErrors"].includes(key))).toBe(true);
  expect(JSON.stringify(body)).not.toContain(sampleEnquiry.email);
  expect(response.headers()["access-control-allow-origin"]).toBeUndefined();
}

test("TC-P1B-API-001 commits once, replays the original receipt and rejects changed intent", async ({ request }) => {
  const headers = { "Idempotency-Key": randomUUID() };
  const first = await request.post("/api/v1/enquiries", { headers, data: sampleEnquiry });
  expect(first.status()).toBe(201);
  expect(first.headers()["cache-control"]).toBe("no-store");
  const receipt = await first.json();
  expectContractBody(201, receipt);
  expect(Object.keys(receipt).sort()).toEqual(["enquiryId", "receivedAt", "status"]);
  expect(receipt.status).toBe("received");
  expect(receipt.enquiryId).toMatch(/^[0-9a-f-]{36}$/i);
  expect(Number.isFinite(Date.parse(receipt.receivedAt))).toBe(true);
  const replay = await request.post("/api/v1/enquiries", { headers, data: sampleEnquiry });
  expect(replay.status()).toBe(200);
  const replayed = await replay.json();
  expectContractBody(200, replayed);
  expect(replayed).toEqual(receipt);
  const conflict = await request.post("/api/v1/enquiries", { headers, data: { ...sampleEnquiry, message: "A different synthetic intent." } });
  await expectError(conflict, 409, "IDEMPOTENCY_CONFLICT");
  expect(await countEnquiries()).toBe(1);
});

test("TC-P1B-API-001 rejects invalid key, JSON, unknown fields and raw limits without storing", async ({ request }) => {
  const cases: Array<{ headers: Record<string, string>; data: string | Record<string, unknown> }> = [
    { headers: { "Idempotency-Key": "invalid" }, data: sampleEnquiry },
    { headers: {}, data: sampleEnquiry },
    { headers: { "Idempotency-Key": randomUUID(), "Content-Type": "application/json" }, data: "{" },
    { headers: { "Idempotency-Key": randomUUID() }, data: { ...sampleEnquiry, extra: true } },
    { headers: { "Idempotency-Key": randomUUID() }, data: { ...sampleEnquiry, name: " ".repeat(101) } },
    { headers: { "Idempotency-Key": randomUUID() }, data: { ...sampleEnquiry, message: "\u0000" } },
  ];
  for (const options of cases) {
    await expectError(await request.post("/api/v1/enquiries", options), 400, "INVALID_REQUEST");
  }
  expect(await countEnquiries()).toBe(0);
});

test("TC-P1B-API-001 enforces media encoding and foreign/null origin gates", async ({ request, baseURL }) => {
  const idempotency = { "Idempotency-Key": randomUUID() };
  for (const contentType of ["text/plain", "application/json; charset=iso-8859-1", "application/json; charset=utf-16"]) {
    await expectError(await request.post("/api/v1/enquiries", { headers: { ...idempotency, "Content-Type": contentType }, data: JSON.stringify(sampleEnquiry) }), 415, "UNSUPPORTED_MEDIA_TYPE");
  }
  await expectError(await request.post("/api/v1/enquiries", { headers: { ...idempotency, "Content-Encoding": "gzip" }, data: sampleEnquiry }), 415, "UNSUPPORTED_MEDIA_TYPE");
  for (const origin of ["https://foreign.example.test", "null"]) {
    await expectError(await request.post("/api/v1/enquiries", { headers: { ...idempotency, Origin: origin }, data: sampleEnquiry }), 403, "REQUEST_NOT_ALLOWED");
  }
  const allowed = await request.post("/api/v1/enquiries", { headers: { ...idempotency, Origin: new URL(baseURL!).origin }, data: sampleEnquiry });
  expect(allowed.status()).toBe(201);
});

test("TC-P1B-API-001 rejects streamed oversized bodies and cancels slow body reads", async ({ baseURL }) => {
  test.setTimeout(20000);
  const target = new URL("/api/v1/enquiries", baseURL);
  if (target.protocol !== "http:" || target.hostname !== "127.0.0.1" || target.port !== "3100") throw new Error("Unsafe raw HTTP test target");
  async function streamed(chunks: string[], end: boolean) {
    return new Promise<{ status: number; body: string; cache: string | string[] | undefined }>((resolve, reject) => {
      const request = http.request(target, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": randomUUID(), "Transfer-Encoding": "chunked" } }, (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk: string) => { body += chunk; });
        response.on("end", () => { request.destroy(); resolve({ status: response.statusCode!, body, cache: response.headers["cache-control"] }); });
      });
      request.on("error", reject);
      request.setTimeout(12000, () => request.destroy(new Error("Raw HTTP test deadline exceeded")));
      for (const chunk of chunks) request.write(chunk);
      if (end) request.end();
    });
  }
  const oversized = await streamed(["{\"message\":\"", "x".repeat(8193), "\"}"], true);
  expect(oversized.status).toBe(413);
  expect(JSON.parse(oversized.body).code).toBe("PAYLOAD_TOO_LARGE");
  expectContractBody(413, JSON.parse(oversized.body));
  expect(oversized.cache).toBe("no-store");
  const slow = await streamed(["{"], false);
  expect(slow.status).toBe(408);
  expect(JSON.parse(slow.body).code).toBe("REQUEST_TIMEOUT");
  expectContractBody(408, JSON.parse(slow.body));
  expect(slow.cache).toBe("no-store");
  expect(await countEnquiries()).toBe(0);
});

test("TC-P1B-API-001 unsupported methods reveal no records", async ({ request }) => {
  for (const method of ["GET", "PUT", "PATCH", "DELETE"]) {
    const response = await request.fetch("/api/v1/enquiries", { method });
    expect(response.status()).toBe(405);
    expect(await response.text()).not.toContain(sampleEnquiry.email);
  }
});
