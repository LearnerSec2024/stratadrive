import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  closeEnquiryFixtures, countEnquiries, enquiryAdminPool, enquiryApplicationPool, enquiryKey,
  postEnquiry, readEnquiry, resetEnquiries, sampleEnquiry, startEnquiryTestApp, submitEnquiry,
} from "../helpers/enquiries-fixtures";

describe("TC-P1B-DURABLE-001 — real private persistence", () => {
  beforeEach(resetEnquiries);
  afterAll(closeEnquiryFixtures);

  it("returns a receipt only for the committed private row, preserved across actual app-process restart", async () => {
    const key = enquiryKey();
    let app = await startEnquiryTestApp();
    let receipt: { enquiryId: string; receivedAt: string; status: string };
    try {
      const response = await postEnquiry(app.url, key);
      expect(response.status).toBe(201);
      expect(response.headers.get("cache-control")).toBe("no-store");
      receipt = await response.json();
      expect(receipt).toEqual({ enquiryId: expect.any(String), receivedAt: expect.any(String), status: "received" });
      const stored = await readEnquiry(key);
      expect(stored).toMatchObject({ id: receipt.enquiryId, idempotency_key: key, ...sampleEnquiry });
      expect(stored?.received_at.toISOString()).toBe(receipt.receivedAt);
      expect(await countEnquiries()).toBe(1);
    } finally { await app.stop(); }

    app = await startEnquiryTestApp();
    try {
      const replay = await postEnquiry(app.url, key);
      expect(replay.status).toBe(200);
      expect(await replay.json()).toEqual(receipt!);
      expect(await countEnquiries()).toBe(1);
    } finally { await app.stop(); }
  }, 60_000);

  it("rolls back an uncommitted intake and admits the same intent subsequently", async () => {
    const pool = await enquiryApplicationPool();
    const client = await pool.connect();
    const key = enquiryKey();
    try {
      await client.query("BEGIN");
      expect((await submitEnquiry(key, sampleEnquiry, client)).outcome).toBe("created");
      expect(await readEnquiry(key)).toBeNull();
      await client.query("ROLLBACK");
    } finally { await client.query("ROLLBACK"); client.release(); }
    expect(await readEnquiry(key)).toBeNull();
    expect((await submitEnquiry(key, sampleEnquiry, pool)).outcome).toBe("created");
    expect(await countEnquiries()).toBe(1);
  });

  it("a bounded database lock timeout produces safe 503 without a false receipt or row", async () => {
    const admin = await enquiryAdminPool();
    const lock = await admin.connect();
    const key = enquiryKey();
    const app = await startEnquiryTestApp();
    try {
      await lock.query("BEGIN");
      await lock.query("SELECT pg_advisory_xact_lock(1937006964, 1)");
      const began = performance.now();
      const response = await postEnquiry(app.url, key);
      expect(response.status).toBe(503);
      expect(performance.now() - began).toBeLessThan(6000);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toEqual({ code: "STORAGE_UNAVAILABLE", message: expect.any(String) });
      expect(await readEnquiry(key)).toBeNull();
      expect(await countEnquiries()).toBe(0);
    } finally {
      await lock.query("ROLLBACK");
      lock.release();
      await app.stop();
    }
    expect((await submitEnquiry(key)).outcome).toBe("created");
  }, 45_000);
});
