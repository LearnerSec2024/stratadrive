import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  closeEnquiryFixtures, countEnquiries, enquiryApplicationPool, enquiryKey, postEnquiry,
  readEnquiry, resetEnquiries, sampleEnquiry, startEnquiryTestApp, submitEnquiry,
} from "../helpers/enquiries-fixtures";

describe("TC-P1B-IDEMPOTENCY-001 — atomic real-store retry", () => {
  beforeEach(resetEnquiries);
  afterAll(closeEnquiryFixtures);

  it("serializes simultaneous identical intents into one new row and original receipt replays", async () => {
    const key = enquiryKey();
    const pool = await enquiryApplicationPool();
    const results = await Promise.all(Array.from({ length: 8 }, () => submitEnquiry(key, sampleEnquiry, pool)));
    expect(results.filter((result) => result.outcome === "created")).toHaveLength(1);
    expect(results.filter((result) => result.outcome === "replayed")).toHaveLength(7);
    expect(new Set(results.map((result) => result.enquiry_id)).size).toBe(1);
    expect(new Set(results.map((result) => result.received_at?.toISOString())).size).toBe(1);
    expect(await countEnquiries()).toBe(1);
  });

  it("rejects changed content without disclosing the original receipt or altering the row", async () => {
    const key = enquiryKey();
    const first = await submitEnquiry(key);
    const conflict = await submitEnquiry(key, { ...sampleEnquiry, message: "Different synthetic intent." });
    expect(first.outcome).toBe("created");
    expect(conflict).toMatchObject({ outcome: "conflict", enquiry_id: null, received_at: null });
    expect((await readEnquiry(key))?.message).toBe(sampleEnquiry.message);
    expect(await countEnquiries()).toBe(1);
  });

  it("a committed receipt whose response was lost is safely recovered through the actual API", async () => {
    const key = enquiryKey();
    // The database commit succeeds, but this caller deliberately discards its receipt.
    await submitEnquiry(key);
    const stored = await readEnquiry(key);
    const app = await startEnquiryTestApp();
    try {
      const replay = await postEnquiry(app.url, key);
      expect(replay.status).toBe(200);
      expect(await replay.json()).toEqual({
        enquiryId: stored?.id, receivedAt: stored?.received_at.toISOString(), status: "received",
      });
      expect(await countEnquiries()).toBe(1);
    } finally { await app.stop(); }
  }, 45_000);

  it("compares API-normalized Unicode, whitespace, domain case and empty/omitted messages", async () => {
    const app = await startEnquiryTestApp();
    try {
      const key = enquiryKey();
      const first = await postEnquiry(app.url, key, {
        name: "  Te\u0301st Learner  ", email: "Learner@EXAMPLE.TEST", message: "\r\n\t ",
      });
      expect(first.status).toBe(201);
      const receipt = await first.json();
      const response = await fetch(`${app.url}/api/v1/enquiries`, {
        method: "POST", redirect: "error", headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify({ name: "Tést Learner", email: "Learner@example.test" }), signal: AbortSignal.timeout(6000),
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(receipt);
      expect(await readEnquiry(key)).toMatchObject({ name: "Tést Learner", email: "Learner@example.test", message: null });
      const conflict = await postEnquiry(app.url, key, { name: "Tést Learner", email: "learner@example.test", message: "" });
      expect(conflict.status).toBe(409); // Local-part case is deliberately preserved.
      expect(await conflict.json()).toEqual({ code: "IDEMPOTENCY_CONFLICT", message: expect.any(String) });
    } finally { await app.stop(); }
  }, 45_000);
});
