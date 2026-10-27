import "server-only";
import { Pool } from "pg";
import { getEnquiryConfig, type EnquiryConfig } from "./config";
import type { NormalizedEnquiry } from "./validation";

type IntakeRow = { outcome: "created" | "replayed" | "conflict" | "throttled" | "unavailable" | "invalid"; enquiry_id: string | null; received_at: Date | null; retry_after: number | null };
const globalPools = globalThis as typeof globalThis & { strataEnquiryPools?: Map<string, { password: string; pool: Pool }> };

export class EnquiryStorageUnavailable extends Error {
  constructor() { super("Local enquiry storage is unavailable."); }
}

function getPool(config: EnquiryConfig): Pool {
  const pools = globalPools.strataEnquiryPools ??= new Map();
  const existing = pools.get(config.target);
  if (existing?.password === config.password) return existing.pool;
  if (existing) void existing.pool.end().catch(() => undefined);
  const pool = new Pool({
    host: config.host, port: config.port, database: config.database, user: config.user, password: config.password,
    ssl: false, max: 4, connectionTimeoutMillis: 2000, idleTimeoutMillis: 10000,
    statement_timeout: 2000, query_timeout: 3000,
    options: "-c lock_timeout=1000", application_name: `stratadrive-enquiries-${config.target}`,
  });
  // Idle connection errors must not escape to the framework or expose a driver error.
  pool.on("error", () => undefined);
  pools.set(config.target, { password: config.password, pool });
  return pool;
}

export async function saveEnquiry(key: string, value: NormalizedEnquiry): Promise<IntakeRow> {
  const config = getEnquiryConfig();
  if (!config) throw new EnquiryStorageUnavailable();
  try {
    const result = await getPool(config).query<IntakeRow>(
      "SELECT outcome, enquiry_id, received_at, retry_after FROM enquiry_private.submit_enquiry($1::uuid, $2::text, $3::text, $4::text, $5::text)",
      [key, value.name, value.email, value.message, config.target],
    );
    if (result.rows.length !== 1) throw new EnquiryStorageUnavailable();
    return result.rows[0];
  } catch { throw new EnquiryStorageUnavailable(); }
}
