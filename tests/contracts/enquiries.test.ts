import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";

const contract = parse(fs.readFileSync(path.resolve("contracts/openapi.yaml"), "utf8"));
const operation = contract.paths["/api/v1/enquiries"].post;
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
for (const [name, schema] of Object.entries(contract.components.schemas)) {
  ajv.addSchema(schema as object, `#/components/schemas/${name}`);
}

function validator(schema: object) {
  return ajv.compile(schema);
}

describe("TC-P1B-CONTRACT-001 independent canonical enquiry contract", () => {
  it("defines exactly the approved mutation and UUID intent header", () => {
    expect(operation.operationId).toBe("createEnquiry");
    expect(Object.keys(contract.paths["/api/v1/enquiries"])).toEqual(["post"]);
    const key = operation.parameters.find((parameter: { name: string }) => parameter.name.toLowerCase() === "idempotency-key");
    expect(key).toMatchObject({ in: "header", required: true });
    const validate = validator(key.schema);
    expect(validate("b2270214-2643-4c7a-b17a-b458552e9017")).toBe(true);
    expect(validate("not-a-uuid")).toBe(false);
  });

  it("accepts only closed, bounded request fields", () => {
    const validate = validator(operation.requestBody.content["application/json"].schema);
    const valid = { name: "Test Learner", email: "learner@example.test" };
    expect(validate(valid)).toBe(true);
    expect(validate({ ...valid, message: "Synthetic details only." })).toBe(true);
    for (const invalid of [null, [], {}, { ...valid, unexpected: true }, { ...valid, name: 7 }, { ...valid, name: "x".repeat(101) }, { ...valid, email: "x".repeat(255) }, { ...valid, message: "x".repeat(2001) }]) {
      expect(validate(invalid), JSON.stringify(invalid).slice(0, 100)).toBe(false);
    }
  });

  it("declares every approved status with JSON and no-store", () => {
    expect(Object.keys(operation.responses).sort()).toEqual(["200", "201", "400", "403", "408", "409", "413", "415", "429", "500", "503"].sort());
    for (const response of Object.values(operation.responses) as Array<{ headers: Record<string, { schema: object }>; content: Record<string, { schema: object }> }>) {
      expect(response.content["application/json"]).toBeDefined();
      const cache = Object.entries(response.headers).find(([name]) => name.toLowerCase() === "cache-control");
      expect(cache).toBeDefined();
      expect(validator(cache![1].schema)("no-store")).toBe(true);
      expect(validator(cache![1].schema)("public")).toBe(false);
    }
    const retry = Object.entries(operation.responses["429"].headers).find(([name]) => name.toLowerCase() === "retry-after");
    expect(retry).toBeDefined();
    const validateRetry = validator((retry![1] as { schema: object }).schema);
    expect(validateRetry(1)).toBe(true);
    expect(validateRetry(600)).toBe(true);
    expect(validateRetry(0)).toBe(false);
    expect(validateRetry(601)).toBe(false);
  });

  it("returns a minimal receipt, fixed errors and closed safe field errors", () => {
    const receipt = validator(operation.responses["201"].content["application/json"].schema);
    const valid = { enquiryId: "b2270214-2643-4c7a-b17a-b458552e9017", receivedAt: "2026-10-25T01:00:00.000Z", status: "received" };
    expect(receipt(valid)).toBe(true);
    expect(receipt({ ...valid, email: "learner@example.test" })).toBe(false);
    expect(receipt({ ...valid, retrievalUrl: "/api/v1/enquiries/1" })).toBe(false);
    const error = validator(operation.responses["400"].content["application/json"].schema);
    expect(error({ code: "INVALID_REQUEST", message: "Check your enquiry details." })).toBe(true);
    expect(error({ code: "INVALID_REQUEST", message: "Submitted learner@example.test" })).toBe(false);
    expect(error({ code: "INVALID_REQUEST", message: "Check your enquiry details.", fieldErrors: { password: "secret" } })).toBe(false);
    expect(error({ code: "INVALID_REQUEST", message: "Check your enquiry details.", extra: "driver detail" })).toBe(false);
  });
});
