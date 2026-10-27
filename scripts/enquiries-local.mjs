import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { TARGETS, IMAGES, assertLocalDockerEndpoint, dockerBinary, commandEnvironment } from './local-supabase.mjs';
const { Pool } = pg;
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const ENQUIRY_PROJECT_ROOT = root;
const setup = join(root, 'infra/local-supabase');
const helper = join(root, 'scripts/local-supabase.mjs');
const lockPath = join(setup, '.env.enquiries-test.lock');
const migrationPath = join(root, 'supabase/migrations/202610250001_enquiry_intake.sql');
export const TEST_TARGET = Object.freeze({ project: 'stratadrive-test', host: '127.0.0.1', port: 55422, database: 'postgres' });

function profile(target) { if (!Object.hasOwn(TARGETS, target)) throw new Error('Unknown enquiry target.'); return TARGETS[target]; }
function docker(args, input) {
  try { return execFileSync(dockerBinary(), args, { cwd: root, env: commandEnvironment(), input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 60000, windowsHide: true }); }
  catch { throw new Error('Guarded local Docker operation failed; no driver output is printed.'); }
}
function assertContainers(target, requireAll = true) {
  const p = profile(target);
  assertLocalDockerEndpoint(JSON.parse(docker(['context', 'inspect', '--format', '{{json .Endpoints.docker.Host}}']).trim()), process.env);
  const ids = docker(['ps', '--filter', `label=com.docker.compose.project=${p.project}`, '--format', '{{.ID}}']).trim().split(/\s+/).filter(Boolean);
  if ((requireAll && ids.length !== 5) || !ids.length) throw new Error('Expected owned running containers for the exact enquiry target.');
  let db;
  for (const id of ids) {
    const value = JSON.parse(docker(['inspect', '--format', '{"service":{{json (index .Config.Labels "com.docker.compose.service")}},"directory":{{json (index .Config.Labels "com.docker.compose.project.working_dir")}},"image":{{json .Config.Image}},"ports":{{json .NetworkSettings.Ports}},"mounts":{{json .Mounts}}}', id]));
    if (resolve(value.directory ?? '') !== setup || IMAGES[value.service] !== value.image) throw new Error('Container ownership/image mismatch.');
    for (const bindings of Object.values(value.ports ?? {})) for (const binding of bindings ?? []) if (binding.HostIp !== '127.0.0.1') throw new Error('Container is not loopback-only.');
    if (value.service === 'db') {
      if (value.ports?.['5432/tcp']?.length !== 1 || Number(value.ports['5432/tcp'][0].HostPort) !== p.databasePort) throw new Error('Unexpected database binding.');
      if (!value.mounts?.some(mount => mount.Type === 'volume' && mount.Name === p.dataVolume && mount.Destination === '/var/lib/postgresql/data')) throw new Error('Unexpected database volume.');
      db = id;
    }
  }
  if (!db) throw new Error('Expected database was not found.');
  return db;
}
function bootstrapCredentials(target) {
  const p = profile(target);
  const values = Object.fromEntries(readFileSync(join(setup, p.credentials), 'utf8').trim().split(/\r?\n/).map(line => line.split('=')));
  if (values.STRATA_LOCAL_ONLY !== p.project || !/^[0-9a-f]{48}$/.test(values.STRATA_DB_PASSWORD)) throw new Error('Unknown bootstrap credential file.');
  return values;
}
function appCredentials(target) {
  profile(target);
  const path = join(setup, target === 'test' ? '.env.enquiries.test.local' : '.env.enquiries.local');
  if (!existsSync(path)) writeFileSync(path, JSON.stringify({ marker: 'stratadrive-enquiries-v1', target, password: randomBytes(24).toString('hex') }), { flag: 'wx', mode: 0o600 });
  const value = JSON.parse(readFileSync(path, 'utf8'));
  if (value.marker !== 'stratadrive-enquiries-v1' || value.target !== target || !/^[0-9a-f]{48}$/.test(value.password)) throw new Error('Unknown application credential file.');
  return value;
}
function runTarget(action, target) {
  profile(target);
  const result = spawnSync(process.execPath, [helper, action, target], { cwd: root, env: process.env, stdio: 'inherit', windowsHide: true, timeout: 1000000 });
  if (result.status !== 0 || result.error) throw new Error('Guarded database lifecycle failed.');
}
function adminSQL(db, sql) {
  return docker(['exec', '-i', '-e', 'PGCONNECT_TIMEOUT=3', '-e', 'PGOPTIONS=-c statement_timeout=10000 -c lock_timeout=3000 -c log_statement=none -c log_parameter_max_length=0 -c log_parameter_max_length_on_error=0 -c log_min_error_statement=panic -c log_error_verbosity=terse -c log_min_messages=fatal', db, 'psql', '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', '-U', 'supabase_admin', '-d', 'postgres', '-At'], sql).trim();
}
function safeLogging(db) {
  const actual = adminSQL(db, "SELECT current_setting('log_statement') || ',' || current_setting('log_parameter_max_length') || ',' || current_setting('log_parameter_max_length_on_error') || ',' || current_setting('log_min_error_statement') || ',' || current_setting('log_error_verbosity') || ',' || current_setting('log_min_messages');");
  if (actual !== 'none,0,0,panic,terse,fatal') throw new Error('Database logging is not safe for credential/data provisioning.');
}
function literal(value) { return `'${value.replaceAll("'", "''")}'`; }

export function assertEnvironmentIdentity(state, target, runId, checksum) {
  profile(target);
  if (state.pristine === true) return;
  if (typeof state.runId !== 'string' || typeof state.checksum !== 'string' || (state.checksum && !/^[0-9a-f]{64}$/.test(state.checksum))) throw new Error('Incomplete database identity.');
  if (state.target !== target || (target === 'test' && state.runId && state.runId !== runId)) throw new Error('Database environment/run ownership mismatch.');
  if (state.checksum && state.checksum !== checksum) throw new Error('Applied migration checksum changed; create a new migration.');
}

function inspectIdentity(db) {
  const exists = adminSQL(db, "SELECT (to_regnamespace('stratadrive_meta') IS NOT NULL)::text || ',' || (to_regnamespace('enquiry_private') IS NOT NULL)::text;");
  if (exists === 'false,false') return { pristine: true };
  if (!exists.startsWith('true,')) throw new Error('Unrecognized existing enquiry database.');
  const markers = adminSQL(db, "SELECT (to_regclass('stratadrive_meta.environment') IS NOT NULL)::text || ',' || (to_regclass('stratadrive_meta.migrations') IS NOT NULL)::text;");
  if (markers !== 'true,true') throw new Error('Unrecognized migration metadata.');
  const rows = adminSQL(db, "SELECT target || ',' || COALESCE(run_id::text,'') FROM stratadrive_meta.environment WHERE singleton;");
  if (!rows || rows.includes('\n')) throw new Error('Missing or ambiguous environment marker.');
  const [target, runId] = rows.split(',');
  const checksum = adminSQL(db, "SELECT checksum FROM stratadrive_meta.migrations WHERE version='202610250001';");
  if (exists === 'true,true' && !checksum) throw new Error('Private schema has no matching migration ledger.');
  return { target, runId, checksum };
}

function claimIdentity(db, target, runId = null) {
  const checksum = createHash('sha256').update(readFileSync(migrationPath)).digest('hex');
  const identity = inspectIdentity(db);
  assertEnvironmentIdentity(identity, target, runId, checksum);
  if (identity.pristine) adminSQL(db, `BEGIN; CREATE SCHEMA stratadrive_meta; REVOKE ALL ON SCHEMA stratadrive_meta FROM PUBLIC,anon,authenticated,service_role; CREATE TABLE stratadrive_meta.environment (singleton boolean PRIMARY KEY CHECK(singleton), target text NOT NULL, run_id uuid); CREATE TABLE stratadrive_meta.migrations (version text PRIMARY KEY, checksum text NOT NULL); INSERT INTO stratadrive_meta.environment VALUES(true,${literal(target)},${runId ? `${literal(runId)}::uuid` : 'NULL'}); COMMIT;`);
  else if (target === 'test') adminSQL(db, `UPDATE stratadrive_meta.environment SET run_id=${literal(runId)}::uuid WHERE singleton;`);
}

async function provision(target, runId = null, databaseId = null) {
  const db = databaseId ?? assertContainers(target);
  safeLogging(db);
  const migration = readFileSync(migrationPath, 'utf8');
  const checksum = createHash('sha256').update(migration).digest('hex');
  const identity = inspectIdentity(db);
  assertEnvironmentIdentity(identity, target, runId, checksum);
  const app = appCredentials(target);
  const bootstrap = bootstrapCredentials(target);
  if (identity.pristine) adminSQL(db, `BEGIN; CREATE SCHEMA stratadrive_meta; REVOKE ALL ON SCHEMA stratadrive_meta FROM PUBLIC,anon,authenticated,service_role; CREATE TABLE stratadrive_meta.environment (singleton boolean PRIMARY KEY CHECK(singleton), target text NOT NULL, run_id uuid); CREATE TABLE stratadrive_meta.migrations (version text PRIMARY KEY, checksum text NOT NULL); INSERT INTO stratadrive_meta.environment VALUES(true,${literal(target)},${runId ? `${literal(runId)}::uuid` : 'NULL'}); COMMIT;`);
  else if (target === 'test') adminSQL(db, `UPDATE stratadrive_meta.environment SET run_id=${literal(runId)}::uuid WHERE singleton;`);
  const prior = identity.checksum;
  if (!prior) adminSQL(db, `BEGIN;\n${migration}\nINSERT INTO stratadrive_meta.migrations VALUES ('202610250001',${literal(checksum)}); COMMIT;`);
  adminSQL(db, `BEGIN; ALTER ROLE stratadrive_enquiry_app PASSWORD ${literal(app.password)}; ALTER ROLE supabase_admin PASSWORD ${literal(bootstrap.STRATA_DB_PASSWORD)}; INSERT INTO enquiry_private.environment(singleton,target) VALUES(true,${literal(target)}) ON CONFLICT(singleton) DO UPDATE SET target=EXCLUDED.target; INSERT INTO stratadrive_meta.environment(singleton,target,run_id) VALUES(true,${literal(target)},${runId ? `${literal(runId)}::uuid` : 'NULL'}) ON CONFLICT(singleton) DO UPDATE SET target=EXCLUDED.target,run_id=EXCLUDED.run_id; COMMIT;`);
  return { STRATA_ENQUIRY_TARGET: target, STRATA_ENQUIRY_PASSWORD: app.password, ...(runId ? { STRATA_TEST_RUN_ID: runId } : {}) };
}

export async function getTestAdminPool() {
  const lease = assertTestLease();
  assertContainers('test');
  const credentials = bootstrapCredentials('test');
  const pool = new Pool({ ...TEST_TARGET, project: undefined, user: 'supabase_admin', password: credentials.STRATA_DB_PASSWORD, max: 2, connectionTimeoutMillis: 3000, statement_timeout: 3000 });
  try {
    const result = await pool.query('SELECT target,run_id::text FROM stratadrive_meta.environment WHERE singleton');
    if (result.rows[0]?.target !== 'test' || result.rows[0]?.run_id !== lease.runId) throw new Error('Test database/run marker mismatch.');
    return pool;
  } catch { await pool.end(); throw new Error('Test database identity verification failed.'); }
}
export function assertTestLease() {
  const lease = JSON.parse(readFileSync(lockPath, 'utf8'));
  if (lease.marker !== 'stratadrive-test-v1' || lease.runId !== process.env.STRATA_TEST_RUN_ID || !Number.isInteger(lease.pid)) throw new Error('No matching isolated test lease.');
  try { process.kill(lease.pid, 0); } catch { throw new Error('Test lease owner is not running.'); }
  return lease;
}

async function sampleReceipt(action, key) {
  if (!['receipt', 'remove'].includes(action) || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key ?? '')) throw new Error('Invalid sample action/key.');
  runTarget('check', 'development');
  const db = assertContainers('development');
  safeLogging(db);
  if (adminSQL(db, 'SELECT target FROM stratadrive_meta.environment WHERE singleton;') !== 'development') throw new Error('Development identity mismatch.');
  const checksum = createHash('sha256').update(readFileSync(migrationPath)).digest('hex');
  if (adminSQL(db, "SELECT checksum FROM stratadrive_meta.migrations WHERE version='202610250001';") !== checksum) throw new Error('Migration identity mismatch.');
  const predicate = `idempotency_key=${literal(key)}::uuid AND name='Test Learner' AND email='learner@example.test' AND message='Synthetic enquiry for local manual testing.'`;
  if (action === 'remove') {
    const removed = adminSQL(db, `WITH removed AS (DELETE FROM enquiry_private.enquiries WHERE ${predicate} RETURNING id) SELECT count(*) FROM removed;`);
    console.log(removed === '1' ? 'Matching synthetic sample removed. Replay protection for this key has ended; quota is retained.' : 'No matching standard synthetic sample removed.');
  } else {
    const receipt = adminSQL(db, `SELECT json_build_object('enquiryId',id,'receivedAt',received_at,'status','received') FROM enquiry_private.enquiries WHERE ${predicate};`);
    console.log(receipt || 'No matching standard synthetic sample.');
  }
}

export async function withTestRun(callback) {
  if (process.env.STRATA_TEST_RUN_ID) {
    assertTestLease();
    if (!existsSync(join(setup, '.env.enquiries.test.local'))) throw new Error('Owned test application configuration is missing.');
    const app = appCredentials('test');
    assertTestConfiguration(process.env, app.password);
    const pool = await getTestAdminPool();
    await pool.end();
    return callback({ ...process.env });
  }
  const lease = { marker: 'stratadrive-test-v1', runId: randomUUID(), pid: process.pid };
  writeFileSync(lockPath, JSON.stringify(lease), { flag: 'wx', mode: 0o600 });
  let lifecycleStarted = false;
  let cleanupComplete = false;
  try {
    assertLocalDockerEndpoint(JSON.parse(docker(['context', 'inspect', '--format', '{{json .Endpoints.docker.Host}}']).trim()), process.env);
    const running = docker(['ps', '--filter', 'label=com.docker.compose.project=stratadrive-test', '--filter', 'label=com.docker.compose.service=db', '--format', '{{.ID}}']).trim();
    if (running) {
      const db = assertContainers('test', false);
      const checksum = createHash('sha256').update(readFileSync(migrationPath)).digest('hex');
      assertEnvironmentIdentity(inspectIdentity(db), 'test', lease.runId, checksum);
    }
    runTarget('init', 'test');
    lifecycleStarted = true;
    runTarget('database', 'test');
    const db = assertContainers('test', false);
    claimIdentity(db, 'test', lease.runId);
    runTarget('start', 'test');
    const config = await provision('test', lease.runId);
    const previousRun = process.env.STRATA_TEST_RUN_ID;
    process.env.STRATA_TEST_RUN_ID = lease.runId;
    try { return await callback({ ...process.env, ...config }); }
    finally { if (previousRun === undefined) delete process.env.STRATA_TEST_RUN_ID; else process.env.STRATA_TEST_RUN_ID = previousRun; }
  } finally {
    try {
      if (lifecycleStarted) {
        const db = assertContainers('test', false);
        const identity = inspectIdentity(db);
        if (identity.runId !== lease.runId || identity.target !== 'test') throw new Error('Cleanup refused: no matching durable test ownership. Recovery lease retained.');
        const tablesExist = adminSQL(db, "SELECT (to_regclass('enquiry_private.enquiries') IS NOT NULL)::text;");
        if (tablesExist === 'true') adminSQL(db, 'TRUNCATE enquiry_private.enquiries,enquiry_private.intake_quota;');
        runTarget('stop', 'test');
        // The marker remains owned while stopping. A later database-only resume
        // must not reinterpret an interrupted cleanup as an unowned clean run.
        runTarget('database', 'test');
        const resumed = assertContainers('test', false);
        if (inspectIdentity(resumed).runId !== lease.runId) throw new Error('Cleanup ownership changed.');
        adminSQL(resumed, 'UPDATE stratadrive_meta.environment SET run_id=NULL WHERE singleton;');
        runTarget('stop', 'test');
      }
      cleanupComplete = true;
    } finally {
      if (cleanupComplete && existsSync(lockPath) && JSON.parse(readFileSync(lockPath, 'utf8')).runId === lease.runId) unlinkSync(lockPath);
    }
  }
}

export function assertTestConfiguration(env, expectedPassword) {
  if (!/^[0-9a-f]{48}$/.test(expectedPassword ?? '') || env.STRATA_ENQUIRY_TARGET !== 'test' || env.STRATA_ENQUIRY_PASSWORD !== expectedPassword || !env.STRATA_TEST_RUN_ID) throw new Error('An inherited run requires its owned isolated test configuration.');
}

async function main() {
  const action = process.argv[2];
  if (action === 'sample' && process.argv.length === 5) {
    await sampleReceipt(process.argv[3], process.argv[4]);
    return;
  }
  if (action === 'prepare' && process.argv.length === 3) {
    const path = join(root, '.env.local');
    const marker = '# StrataDrive generated local enquiries v1';
    const credentialPath = join(setup, '.env.enquiries.local');
    if (existsSync(path)) {
      // Use only file metadata to establish ownership. Never inspect the
      // contents of an unrecognized pre-existing environment file.
      const saved = existsSync(credentialPath) ? JSON.parse(readFileSync(credentialPath, 'utf8')).rootEnvironment : null;
      const actual = statSync(path);
      if (!saved || saved.ino !== actual.ino || saved.size !== actual.size || saved.mtimeMs !== actual.mtimeMs) throw new Error('Existing root environment file is not recognized; no contents were inspected or overwritten.');
    }
    runTarget('init', 'development'); runTarget('database', 'development');
    claimIdentity(assertContainers('development', false), 'development');
    runTarget('start', 'development');
    const config = await provision('development');
    writeFileSync(path, marker + '\n' + Object.entries(config).map(([key, value]) => `${key}=${value}`).join('\n') + '\n', { mode: 0o600 });
    const owned = JSON.parse(readFileSync(credentialPath, 'utf8'));
    const info = statSync(path);
    owned.rootEnvironment = { ino: info.ino, size: info.size, mtimeMs: info.mtimeMs };
    writeFileSync(credentialPath, JSON.stringify(owned), { mode: 0o600 });
    console.log('Local enquiries prepared with a dedicated application credential. Run npm start.');
    return;
  }
  if (action === 'run' && ['integration', 'api', 'e2e'].includes(process.argv[3]) && process.argv.length === 4) {
    const suite = process.argv[3];
    await withTestRun(async env => {
      const args = suite === 'integration' ? [join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--config', 'vitest.integration.config.mts']
        : [join(root, 'node_modules/@playwright/test/cli.js'), 'test', `--project=${suite}`];
      const result = spawnSync(process.execPath, args, { cwd: root, env, stdio: 'inherit', windowsHide: true });
      if (result.status !== 0 || result.error) throw new Error(`Required ${suite} suite failed.`);
    });
    return;
  }
  throw new Error('Usage: enquiries-local.mjs prepare | run integration|api|e2e | sample receipt|remove UUIDv4');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { mkdirSync(join(root, 'reports'), { recursive: true }); console.error('Enquiry setup/test command failed safely. No secrets or driver details are printed.'); process.exitCode = 1; });
}
