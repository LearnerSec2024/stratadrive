import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { assertTestLease } from "../../scripts/enquiries-local.mjs";
import { commandEnvironment, dockerBinary } from "../../scripts/local-supabase.mjs";
import {
  closeEnquiryFixtures, countEnquiries, enquiryAdminPool, enquiryApplicationPool, enquiryKey,
  postEnquiry, readEnquiry, resetEnquiries, startEnquiryTestApp, submitEnquiry,
} from "../helpers/enquiries-fixtures";

const root = resolve(import.meta.dirname, "../..");

async function databaseLogs(since: string): Promise<string> {
  await assertTestLease();
  const identity = spawnSync(dockerBinary(), ["ps", "--filter", "label=com.docker.compose.project=stratadrive-test", "--filter", "label=com.docker.compose.service=db", "--format", "{{.ID}}"], {
    cwd: root, env: { ...commandEnvironment(), NODE_ENV: "test" }, windowsHide: true, encoding: "utf8", timeout: 10_000,
  });
  const ids = (identity.stdout ?? "").trim().split(/\r?\n/).filter(Boolean);
  if (identity.status !== 0 || ids.length !== 1 || !/^[a-f0-9]{12,64}$/.test(ids[0])) {
    throw new Error("Exactly one owned isolated test database container is required for log checks.");
  }
  const logs = spawnSync(dockerBinary(), ["logs", "--since", since, ids[0]], {
    cwd: root, env: { ...commandEnvironment(), NODE_ENV: "test" }, windowsHide: true, encoding: "utf8", timeout: 10_000, maxBuffer: 2_000_000,
  });
  if (logs.status !== 0) throw new Error("Scoped isolated database log collection failed.");
  return (logs.stdout ?? "") + (logs.stderr ?? "");
}

async function javascriptBundles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return await javascriptBundles(path);
    return entry.isFile() && /\.(?:js|map)$/.test(entry.name) ? [await readFile(path, "utf8")] : [];
  }));
  return nested.flat();
}

describe("TC-P1B-SECURITY-001 — effective least privilege and scoped privacy", () => {
  beforeEach(resetEnquiries);
  afterAll(closeEnquiryFixtures);

  it("uses a dedicated non-administrative login and forced private-table RLS with a trusted definer", async () => {
    const admin = await enquiryAdminPool();
    const role = await admin.query("SELECT rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls, rolinherit FROM pg_roles WHERE rolname = 'stratadrive_enquiry_app'");
    expect(role.rows).toEqual([{
      rolcanlogin: true, rolsuper: false, rolcreatedb: false, rolcreaterole: false,
      rolreplication: false, rolbypassrls: false, rolinherit: false,
    }]);
    const owner = await admin.query("SELECT rolcanlogin, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'stratadrive_enquiry_owner'");
    expect(owner.rows).toEqual([{ rolcanlogin: false, rolsuper: false, rolbypassrls: false }]);
    const tables = await admin.query("SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relnamespace = 'enquiry_private'::regnamespace AND relname IN ('enquiries','intake_quota') ORDER BY relname");
    expect(tables.rows).toEqual([
      { relname: "enquiries", relrowsecurity: true, relforcerowsecurity: true },
      { relname: "intake_quota", relrowsecurity: true, relforcerowsecurity: true },
    ]);
    const fn = await admin.query<{ owner: string; prosecdef: boolean; proconfig: string[] }>(
      "SELECT pg_get_userbyid(proowner) AS owner, prosecdef, proconfig FROM pg_proc WHERE oid = 'enquiry_private.submit_enquiry(uuid,text,text,text,text)'::regprocedure",
    );
    expect(fn.rows[0]).toMatchObject({ owner: "stratadrive_enquiry_owner", prosecdef: true });
    const searchPath = fn.rows[0].proconfig.find((value) => value.startsWith("search_path="));
    expect(searchPath?.replaceAll(" ", "")).toBe("search_path=pg_catalog,enquiry_private,pg_temp");
  });

  it("denies application table reads/writes, persistent/temporary DDL and owner-role escalation", async () => {
    const pool = await enquiryApplicationPool();
    const grants = await pool.query("SELECT current_user, has_schema_privilege(current_user,'enquiry_private','USAGE') AS usage, has_schema_privilege(current_user,'enquiry_private','CREATE') AS schema_create, has_database_privilege(current_user,current_database(),'CREATE') AS database_create, has_database_privilege(current_user,current_database(),'TEMP') AS temporary, pg_has_role(current_user,'stratadrive_enquiry_owner','MEMBER') AS owner_member");
    expect(grants.rows).toEqual([{
      current_user: "stratadrive_enquiry_app", usage: true, schema_create: false,
      database_create: false, temporary: false, owner_member: false,
    }]);
    const executable = await pool.query("SELECT proname FROM pg_proc WHERE pronamespace = 'enquiry_private'::regnamespace AND has_function_privilege(current_user, oid, 'EXECUTE') ORDER BY proname");
    expect(executable.rows).toEqual([{ proname: "submit_enquiry" }]);
    for (const sql of [
      "SELECT * FROM enquiry_private.enquiries",
      "SELECT * FROM enquiry_private.intake_quota",
      "INSERT INTO enquiry_private.enquiries DEFAULT VALUES",
      "UPDATE enquiry_private.enquiries SET name = name",
      "DELETE FROM enquiry_private.enquiries",
      "CREATE TABLE enquiry_private.forbidden_test_table(id integer)",
      "CREATE TABLE public.forbidden_test_table(id integer)",
      "CREATE SCHEMA forbidden_test_schema",
      "CREATE TEMP TABLE forbidden_test_table(id integer)",
      "SET ROLE stratadrive_enquiry_owner",
    ]) {
      let code: string | undefined;
      try { await pool.query(sql); } catch (error) { code = (error as { code?: string }).code; }
      expect(code).toBe("42501");
    }
    expect((await submitEnquiry(enquiryKey(), undefined, pool)).outcome).toBe("created");
  });

  it("denies public API roles execution/reads while allowing the explicit Studio administrator read", async () => {
    const admin = await enquiryAdminPool();
    for (const role of ["anon", "authenticated"]) {
      const permissions = await admin.query("SELECT has_schema_privilege($1,'enquiry_private','USAGE') AS usage, has_table_privilege($1,'enquiry_private.enquiries','SELECT') AS table_read, has_function_privilege($1,'enquiry_private.submit_enquiry(uuid,text,text,text,text)','EXECUTE') AS execute", [role]);
      expect(permissions.rows).toEqual([{ usage: false, table_read: false, execute: false }]);
    }
    const publicExecution = await admin.query("SELECT count(*)::integer AS count FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f',p.proowner))) a WHERE p.oid = 'enquiry_private.submit_enquiry(uuid,text,text,text,text)'::regprocedure AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'");
    expect(publicExecution.rows[0].count).toBe(0);
    const client = await admin.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL ROLE postgres");
      expect((await client.query("SELECT count(*)::integer AS count FROM enquiry_private.enquiries")).rows[0].count).toBe(0);
    } finally { await client.query("ROLLBACK"); client.release(); }
  });

  it("database intake rejects invalid stored values and mismatched environment markers", async () => {
    const pool = await enquiryApplicationPool();
    for (const value of [
      { name: "", email: "learner@example.test" },
      { name: "x".repeat(101), email: "learner@example.test" },
      { name: "Test\u0001Learner", email: "learner@example.test" },
      { name: "Test Learner", email: "not-an-email" },
      { name: "Test Learner", email: "learner@example.test", message: "x".repeat(2001) },
      { name: "Test Learner", email: "learner@example.test", message: "Forbidden\u0001control" },
    ]) expect((await submitEnquiry(enquiryKey(), value, pool)).outcome).toBe("invalid");
    const mismatch = await pool.query("SELECT * FROM enquiry_private.submit_enquiry($1::uuid,$2,$3,$4,$5)", [enquiryKey(), "Test Learner", "learner@example.test", null, "development"]);
    expect(mismatch.rows[0]).toMatchObject({ outcome: "unavailable", enquiry_id: null, received_at: null });
    expect(await countEnquiries()).toBe(0);
  });

  it("suppresses SQL/parameter/detail logging and finds no synthetic markers or app credential in scoped logs/client bundles", async () => {
    const pool = await enquiryApplicationPool();
    const admin = await enquiryAdminPool();
    for (const [setting, expected] of [
      ["log_statement", "none"], ["log_parameter_max_length", "0"],
      ["log_parameter_max_length_on_error", "0"], ["log_min_error_statement", "panic"], ["log_error_verbosity", "terse"],
      ["log_min_messages", "fatal"],
    ]) {
      const result = await pool.query<{ value: string }>("SELECT current_setting($1) AS value", [setting]);
      expect(result.rows[0].value).toBe(expected);
      const administration = await admin.query<{ value: string }>("SELECT current_setting($1) AS value", [setting]);
      expect(administration.rows[0].value).toBe(expected);
    }
    const marker = `synthetic-${randomUUID()}`;
    const app = await startEnquiryTestApp();
    let appOutput = "";
    try {
      const response = await postEnquiry(app.url, enquiryKey(), { name: marker, email: `${marker}@example.test`, message: marker });
      expect(response.status).toBe(201);
      const invalid = await postEnquiry(app.url, enquiryKey(), { name: marker, email: "invalid", message: marker });
      expect(invalid.status).toBe(400);
      const lock = await admin.connect();
      try {
        await lock.query("BEGIN");
        await lock.query("SELECT pg_advisory_xact_lock(1937006964, 1)");
        const unavailable = await postEnquiry(app.url, enquiryKey(), { name: marker, email: `${marker}@example.test`, message: marker });
        expect(unavailable.status).toBe(503);
      } finally { await lock.query("ROLLBACK"); lock.release(); }
      let failedSafely = false;
      try { await pool.query("SELECT $1::integer", [marker]); } catch (error) { failedSafely = (error as { code?: string }).code === "22P02"; }
      expect(failedSafely).toBe(true);
    } finally { await app.stop(); appOutput = app.output(); }
    // Include this owned container's preparation history to detect generated-credential leakage too.
    const logs = appOutput + await databaseLogs("1970-01-01T00:00:00.000Z");
    expect(logs.includes(marker)).toBe(false);
    const password = process.env.STRATA_ENQUIRY_PASSWORD!;
    expect(logs.includes(password)).toBe(false);
    const bundles = await javascriptBundles(resolve(root, ".next/static"));
    expect(bundles.length).toBeGreaterThan(0);
    expect(bundles.some((value) => value.includes(password))).toBe(false);
    expect(bundles.some((value) => value.includes("stratadrive_enquiry_app"))).toBe(false);
  }, 60_000);

  it("retains private rows, execution and denials after the guarded test DB stop/start lifecycle", async () => {
    const key = enquiryKey();
    const receipt = await submitEnquiry(key);
    await closeEnquiryFixtures();
    await assertTestLease();
    const run = (command: "stop" | "start") => spawnSync(process.execPath, ["scripts/local-supabase.mjs", command, "test"], {
      cwd: root, env: { ...process.env }, windowsHide: true, encoding: "utf8", timeout: 120_000, maxBuffer: 2_000_000,
    });
    const stopped = run("stop");
    expect(stopped.status === 0).toBe(true);
    const started = run("start");
    expect(started.status === 0).toBe(true);
    await assertTestLease();
    expect((await readEnquiry(key))?.id).toBe(receipt.enquiry_id);
    const pool = await enquiryApplicationPool();
    expect((await submitEnquiry(key, undefined, pool)).outcome).toBe("replayed");
    let denied = false;
    try { await pool.query("SELECT * FROM enquiry_private.enquiries"); } catch (error) { denied = (error as { code?: string }).code === "42501"; }
    expect(denied).toBe(true);
    expect((await submitEnquiry(enquiryKey(), undefined, pool)).outcome).toBe("created");
  }, 240_000);
});
