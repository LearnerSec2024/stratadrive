import { randomUUID } from "node:crypto";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createConnection } from "node:net";
import { resolve } from "node:path";
import { Pool, type PoolClient } from "pg";
import { assertTestLease, getTestAdminPool, ENQUIRY_PROJECT_ROOT } from "../../scripts/enquiries-local.mjs";

export const sampleEnquiry = {
  name: "Test Learner",
  email: "learner@example.test",
  message: "Synthetic enquiry for local testing.",
};

export const enquiryKey = () => randomUUID();

export interface StoredEnquiry {
  id: string;
  idempotency_key: string;
  name: string;
  email: string;
  message: string | null;
  received_at: Date;
}

export interface IntakeResult {
  outcome: "created" | "replayed" | "conflict" | "throttled" | "invalid" | "unavailable";
  enquiry_id: string | null;
  received_at: Date | null;
  retry_after: number | null;
}

let adminPool: Pool | undefined;
const applicationPools = new Set<Pool>();

export async function enquiryAdminPool(): Promise<Pool> {
  await assertTestLease();
  adminPool ??= await getTestAdminPool();
  return adminPool;
}

export async function resetEnquiries(): Promise<void> {
  const pool = await enquiryAdminPool();
  await assertTestLease();
  await pool.query("TRUNCATE enquiry_private.enquiries, enquiry_private.intake_quota");
}

export async function countEnquiries(): Promise<number> {
  const pool = await enquiryAdminPool();
  const result = await pool.query<{ count: string }>("SELECT count(*)::text AS count FROM enquiry_private.enquiries");
  return Number(result.rows[0].count);
}

export async function readEnquiry(key: string): Promise<StoredEnquiry | null> {
  const pool = await enquiryAdminPool();
  const result = await pool.query<StoredEnquiry>(
    "SELECT id, idempotency_key, name, email, message, received_at FROM enquiry_private.enquiries WHERE idempotency_key = $1::uuid",
    [key],
  );
  return result.rows[0] ?? null;
}

export async function enquiryApplicationPool(): Promise<Pool> {
  await assertTestLease();
  if (process.env.STRATA_ENQUIRY_TARGET !== "test" || !process.env.STRATA_ENQUIRY_PASSWORD) {
    throw new Error("An owned isolated enquiry test configuration is required.");
  }
  const pool = new Pool({
    host: "127.0.0.1", port: 55422, database: "postgres", user: "stratadrive_enquiry_app",
    password: process.env.STRATA_ENQUIRY_PASSWORD,
    max: 6, connectionTimeoutMillis: 2000, statement_timeout: 2000, query_timeout: 3000,
    options: "-c lock_timeout=1000",
  });
  applicationPools.add(pool);
  return pool;
}

export async function submitEnquiry(
  key: string,
  value: { name: string; email: string; message?: string | null } = sampleEnquiry,
  pool?: Pool | PoolClient,
): Promise<IntakeResult> {
  const connection = pool ?? await enquiryApplicationPool();
  const result = await connection.query<IntakeResult>(
    "SELECT * FROM enquiry_private.submit_enquiry($1::uuid, $2::text, $3::text, $4::text, $5::text)",
    [key, value.name, value.email, value.message ?? null, "test"],
  );
  return result.rows[0];
}

export async function closeEnquiryFixtures(): Promise<void> {
  await Promise.all([...applicationPools].map(async (pool) => {
    applicationPools.delete(pool);
    await pool.end();
  }));
  if (adminPool) {
    const pool = adminPool;
    adminPool = undefined;
    await pool.end();
  }
}

const root = resolve(ENQUIRY_PROJECT_ROOT);
const delay = (milliseconds: number) => new Promise<void>((done) => setTimeout(done, milliseconds));

async function portIsListening(): Promise<boolean> {
  return await new Promise((done) => {
    const socket = createConnection({ host: "127.0.0.1", port: 3100 });
    socket.setTimeout(300);
    socket.once("connect", () => { socket.destroy(); done(true); });
    socket.once("error", () => { socket.destroy(); done(false); });
    socket.once("timeout", () => { socket.destroy(); done(false); });
  });
}

async function stopOwnedChild(child: ChildProcess): Promise<void> {
  if (!child.pid || child.exitCode !== null) return;
  if (process.platform === "win32") {
    const result = spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    if (result.status !== 0 && child.exitCode === null) throw new Error("Owned test application did not stop.");
  } else {
    try { process.kill(-child.pid, "SIGTERM"); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
    }
  }
  for (let attempt = 0; attempt < 100 && await portIsListening(); attempt++) await delay(50);
  if (await portIsListening()) throw new Error("Owned test application listener did not close.");
}

export async function startEnquiryTestApp() {
  await assertTestLease();
  if (await portIsListening()) throw new Error("Port 3100 is already occupied; no existing process was stopped.");
  const child = spawn(process.execPath, ["scripts/start-local.mjs", "test"], {
    cwd: root, env: { ...process.env }, detached: process.platform !== "win32",
    windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout?.on("data", (value: Buffer) => { output = (output + value.toString()).slice(-256_000); });
  child.stderr?.on("data", (value: Buffer) => { output = (output + value.toString()).slice(-256_000); });
  let spawnError = false;
  child.once("error", () => { spawnError = true; });
  try {
    for (let attempt = 0; attempt < 150; attempt++) {
      if (spawnError || child.exitCode !== null) throw new Error("Owned test application failed to start.");
      try {
        const response = await fetch("http://127.0.0.1:3100/enquire", { redirect: "error", signal: AbortSignal.timeout(500) });
        if (response.status === 200) return {
          url: "http://127.0.0.1:3100",
          output: () => output,
          stop: () => stopOwnedChild(child),
        };
      } catch { /* Await only the owned loopback process. */ }
      await delay(100);
    }
    throw new Error("Owned test application readiness deadline exceeded.");
  } catch (error) {
    await stopOwnedChild(child);
    throw error;
  }
}

export async function postEnquiry(url: string, key: string, body = sampleEnquiry) {
  return await fetch(`${url}/api/v1/enquiries`, {
    method: "POST", redirect: "error", headers: { "Content-Type": "application/json", "Idempotency-Key": key },
    body: JSON.stringify(body), signal: AbortSignal.timeout(6000),
  });
}
