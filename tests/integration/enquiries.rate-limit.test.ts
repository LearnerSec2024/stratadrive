import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  closeEnquiryFixtures, countEnquiries, enquiryAdminPool, enquiryApplicationPool, enquiryKey,
  postEnquiry, resetEnquiries, sampleEnquiry, startEnquiryTestApp, submitEnquiry,
} from "../helpers/enquiries-fixtures";

async function stableWindow() {
  const pool = await enquiryAdminPool();
  for (;;) {
    const { rows } = await pool.query<{ bucket: string; remaining: number }>(
      "SELECT floor(extract(epoch FROM clock_timestamp()) / 600)::bigint::text AS bucket, (600 - mod(extract(epoch FROM clock_timestamp()), 600))::double precision AS remaining",
    );
    if (rows[0].remaining >= 20) return rows[0].bucket;
    // Only wait for a near boundary; no application-visible clock override is introduced.
    await new Promise((done) => setTimeout(done, Math.ceil(rows[0].remaining * 1000) + 100));
  }
}

describe("TC-P1B-ABUSE-001 — durable global database-clock capacity", () => {
  beforeEach(resetEnquiries);
  afterAll(closeEnquiryFixtures);

  it("admits exactly the first 20, bounds Retry-After, and preserves full capacity across app restart", async () => {
    const bucket = await stableWindow();
    const pool = await enquiryApplicationPool();
    const keys = Array.from({ length: 20 }, enquiryKey);
    const receipts = await Promise.all(keys.map((key) => submitEnquiry(key, sampleEnquiry, pool)));
    expect(receipts.every((receipt) => receipt.outcome === "created")).toBe(true);
    expect(await countEnquiries()).toBe(20);
    const admission = await submitEnquiry(enquiryKey(), sampleEnquiry, pool);
    expect(admission).toMatchObject({ outcome: "throttled", enquiry_id: null, received_at: null });
    expect(Number.isInteger(admission.retry_after)).toBe(true);
    expect(admission.retry_after).toBeGreaterThanOrEqual(1);
    expect(admission.retry_after).toBeLessThanOrEqual(600);

    let app = await startEnquiryTestApp();
    try {
      const rejected = await postEnquiry(app.url, enquiryKey());
      expect(rejected.status).toBe(429);
      expect(rejected.headers.get("retry-after")).toMatch(/^\d+$/);
      expect(Number(rejected.headers.get("retry-after"))).toBeGreaterThanOrEqual(1);
      expect(Number(rejected.headers.get("retry-after"))).toBeLessThanOrEqual(600);
      expect(await rejected.json()).toEqual({ code: "RATE_LIMITED", message: expect.any(String) });
    } finally { await app.stop(); }
    app = await startEnquiryTestApp();
    try {
      const replay = await postEnquiry(app.url, keys[0]);
      expect(replay.status).toBe(200);
      expect(await replay.json()).toEqual({
        enquiryId: receipts[0].enquiry_id, receivedAt: receipts[0].received_at?.toISOString(), status: "received",
      });
      const spoofed = await fetch(`${app.url}/api/v1/enquiries`, {
        method: "POST", redirect: "error", headers: {
          "Content-Type": "application/json", "Idempotency-Key": enquiryKey(),
          "X-Forwarded-For": "192.0.2.17", "X-Real-IP": "198.51.100.22",
        }, body: JSON.stringify(sampleEnquiry), signal: AbortSignal.timeout(6000),
      });
      expect(spoofed.status).toBe(429);
      expect(await countEnquiries()).toBe(20);
      const admin = await enquiryAdminPool();
      const quota = await admin.query<{ count: number }>("SELECT count FROM enquiry_private.intake_quota WHERE bucket = $1::bigint", [bucket]);
      expect(quota.rows[0]?.count).toBe(20);
    } finally { await app.stop(); }
  }, 90_000);

  it("serializes competing new keys without admitting more than the durable capacity", async () => {
    await stableWindow();
    const pool = await enquiryApplicationPool();
    const results = await Promise.all(Array.from({ length: 26 }, () => submitEnquiry(enquiryKey(), sampleEnquiry, pool)));
    expect(results.filter((result) => result.outcome === "created")).toHaveLength(20);
    expect(results.filter((result) => result.outcome === "throttled")).toHaveLength(6);
    expect(await countEnquiries()).toBe(20);
  }, 45_000);

  it("a fully used expired bucket does not consume a slot in the new database-clock window", async () => {
    const bucket = await stableWindow();
    const pool = await enquiryAdminPool();
    await pool.query("INSERT INTO enquiry_private.intake_quota(bucket, count) VALUES ($1::bigint - 1, 20)", [bucket]);
    expect((await submitEnquiry(enquiryKey())).outcome).toBe("created");
    const quota = await pool.query<{ bucket: string; count: number }>(
      "SELECT bucket::text, count FROM enquiry_private.intake_quota WHERE bucket = $1::bigint", [bucket],
    );
    expect(quota.rows).toEqual([{ bucket, count: 1 }]);
  }, 45_000);
});
