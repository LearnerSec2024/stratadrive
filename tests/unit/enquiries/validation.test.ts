import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../../../src/server/enquiries/service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../src/server/enquiries/service")>();
  return { ...actual, createEnquiry: vi.fn() };
});
import { isIdempotencyKey, validateEnquiry } from "../../../src/server/enquiries/validation";
import { createEnquiry } from "../../../src/server/enquiries/service";
import { POST } from "../../../src/app/api/v1/enquiries/route";

const sample = { name: "Test Learner", email: "Learner@example.test" };

describe("TC-P1B-UNIT-001 enquiry canonicalization and safe validation", () => {
  it("trims, normalizes NFC and preserves email local-part case", () => {
    expect(validateEnquiry({ name: "  Jose\u0301 Learner  ", email: "  Learner@EXAMPLE.TEST  ", message: "  A\r\nB\rC\tCafe\u0301  " })).toEqual({
      ok: true,
      value: { name: "José Learner", email: "Learner@example.test", message: "A\nB\nC\tCafé" },
    });
  });

  it("canonicalizes omitted, empty and whitespace-only message identically", () => {
    for (const message of [undefined, "", " \t\r\n "]) {
      const input = message === undefined ? sample : { ...sample, message };
      expect(validateEnquiry(input)).toEqual({ ok: true, value: { ...sample, message: null } });
    }
  });

  it("counts Unicode code points and enforces raw limits before normalization", () => {
    expect(validateEnquiry({ ...sample, name: "😀".repeat(100), message: "😀".repeat(2000) }).ok).toBe(true);
    for (const input of [
      { ...sample, name: "😀".repeat(101) },
      { ...sample, name: " ".repeat(100) + "x" },
      { ...sample, name: "e\u0301".repeat(51) },
      { ...sample, message: "😀".repeat(2001) },
      { ...sample, message: " ".repeat(2001) },
      { ...sample, email: " ".repeat(255) },
    ]) expect(validateEnquiry(input).ok).toBe(false);
  });

  it("rejects missing, unknown, wrong-type and blank required fields", () => {
    for (const input of [null, [], "text", {}, { name: sample.name }, { email: sample.email }, { ...sample, name: 1 }, { ...sample, email: null }, { ...sample, message: false }, { ...sample, extra: true }, { ...sample, name: " \t " }]) {
      expect(validateEnquiry(input).ok).toBe(false);
    }
  });

  it("rejects controls, DEL, NUL and unpaired surrogates while allowing plain message whitespace", () => {
    for (const invalid of ["\u0000", "\u0001", "\u007f", "\ud800", "\udfff"]) {
      expect(validateEnquiry({ ...sample, name: `Test${invalid}Learner` }).ok).toBe(false);
      expect(validateEnquiry({ ...sample, message: `Test${invalid}message` }).ok).toBe(false);
    }
    for (const invalid of ["\n", "\t", "\r"]) {
      expect(validateEnquiry({ ...sample, name: `Test${invalid}Learner` }).ok).toBe(false);
    }
    expect(validateEnquiry({ ...sample, message: "Line one\nLine two\tplain text <b>literal</b>" }).ok).toBe(true);
  });

  it("accepts supported ASCII syntax and rejects malformed or non-ASCII email", () => {
    for (const email of ["learner@example.test", "Learner+sample@example.test"]) expect(validateEnquiry({ ...sample, email }).ok).toBe(true);
    for (const email of ["missing-at", "a b@example.test", "learner@", "@example.test", "élève@example.test", "learner@éxample.test", "a\n@example.test"]) expect(validateEnquiry({ ...sample, email }).ok).toBe(false);
  });

  it("returns only safe field names and fixed messages without submitted values", () => {
    const marker = "synthetic-invalid-marker";
    const result = validateEnquiry({ name: "", email: marker, message: "\u0000" });
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain(marker);
    if (!result.ok && result.fieldErrors) {
      expect(Object.keys(result.fieldErrors).every((key) => ["name", "email", "message"].includes(key))).toBe(true);
      for (const value of Object.values(result.fieldErrors)) expect(typeof value).toBe("string");
    }
  });

  it("accepts only a UUIDv4 idempotency intent", () => {
    expect(isIdempotencyKey("b2270214-2643-4c7a-b17a-b458552e9017")).toBe(true);
    for (const value of [null, "", "not-a-key", "b2270214-2643-1c7a-b17a-b458552e9017", "b2270214-2643-4c7a-717a-b458552e9017", " b2270214-2643-4c7a-b17a-b458552e9017 "]) expect(isIdempotencyKey(value)).toBe(false);
  });
});

describe("TC-P1B-UNIT-001 request adapter isolated failure branches", () => {
  afterEach(() => { vi.restoreAllMocks(); vi.mocked(createEnquiry).mockReset(); });

  it("maps an unexpected application fault to a safe 500 and safe correlation-only log", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const secretMarker = "synthetic-driver-detail-not-for-output";
    vi.mocked(createEnquiry).mockRejectedValueOnce(new Error(secretMarker));
    const response = await POST(new Request("http://127.0.0.1:3100/api/v1/enquiries", {
      method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": "b2270214-2643-4c7a-b17a-b458552e9017" }, body: JSON.stringify(sample),
    }));
    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(body)).not.toContain(secretMarker);
    expect(log).toHaveBeenCalledOnce();
    const entry = JSON.parse(log.mock.calls[0][0] as string);
    expect(Object.keys(entry).sort()).toEqual(["correlationId", "event"]);
    expect(entry.event).toBe("enquiry_unexpected_failure");
    expect(entry.correlationId).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("rejects nonlocal request targets and malformed UTF-8 before storage", async () => {
    const headers = { "Content-Type": "application/json", "Idempotency-Key": "b2270214-2643-4c7a-b17a-b458552e9017" };
    const foreign = await POST(new Request("https://foreign.example.test/api/v1/enquiries", { method: "POST", headers, body: JSON.stringify(sample) }));
    expect(foreign.status).toBe(403);
    expect((await foreign.json()).code).toBe("REQUEST_NOT_ALLOWED");
    const malformed = await POST(new Request("http://127.0.0.1:3100/api/v1/enquiries", { method: "POST", headers, body: new Uint8Array([0xc3, 0x28]) }));
    expect(malformed.status).toBe(400);
    expect((await malformed.json()).code).toBe("INVALID_REQUEST");
    expect(createEnquiry).not.toHaveBeenCalled();
  });
});
