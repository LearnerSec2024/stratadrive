import { createHash, createHmac, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { delimiter, dirname, isAbsolute, relative, resolve, sep, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROJECT = 'stratadrive-local';
export const IMAGES = Object.freeze({
  db: 'supabase/postgres:17.6.1.136',
  rest: 'postgrest/postgrest:v14.18',
  meta: 'supabase/postgres-meta:v0.100.0',
  studio: 'supabase/studio:2026.10.12-sha-3699278',
  'api-gw': 'envoyproxy/envoy:v1.39.1',
});
const PORTS = { db: [54322, 5432], studio: [54323, 3000], 'api-gw': [54321, 8000] };
const BINDS = {
  db: {
    'upstream/volumes/db/roles.sql': '/docker-entrypoint-initdb.d/init-scripts/99-roles.sql',
    'upstream/volumes/db/jwt.sql': '/docker-entrypoint-initdb.d/init-scripts/99-jwt.sql',
    'upstream/volumes/db/webhooks.sql': '/docker-entrypoint-initdb.d/init-scripts/98-webhooks.sql',
    'bootstrap/100-local-grants.sql': '/docker-entrypoint-initdb.d/init-scripts/zz-local-grants.sql',
  },
  'api-gw': {
    'upstream/volumes/api/envoy/envoy.yaml': '/etc/envoy/envoy.yaml',
    'upstream/volumes/api/envoy/cds.yaml': '/etc/envoy/cds.yaml',
    'upstream/volumes/api/envoy/lds.template.yaml': '/etc/envoy/lds.template.yaml',
    'upstream/volumes/api/envoy/docker-entrypoint.sh': '/docker-entrypoint.sh',
  },
};
const VOLUMES = { db: { 'db-data': '/var/lib/postgresql/data', 'db-config': '/etc/postgresql-custom' }, studio: { snippets: '/app/snippets' } };
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const setup = join(root, 'infra', 'local-supabase');
export const TARGETS = Object.freeze(JSON.parse(readFileSync(join(setup, 'targets.json'), 'utf8')));
const fixedTargets = {
  development: { project: 'stratadrive-local', databasePort: 54322, apiPort: 54321, studioPort: 54323, credentials: '.env.local', dataVolume: 'stratadrive-local_db-data-bootstrap-v2' },
  test: { project: 'stratadrive-test', databasePort: 55422, apiPort: 55421, studioPort: 55423, credentials: '.env.test.local', dataVolume: 'stratadrive-test_db-data' },
};
if (JSON.stringify(TARGETS) !== JSON.stringify(fixedTargets)) throw new Error('Local target configuration differs from the reviewed fixed profiles.');
let selectedTarget = 'development';
let project = PROJECT;
let ports = PORTS;
let credentialsPath = join(setup, '.env.local');
const composePath = join(setup, 'compose.local.yaml');
const reports = join(root, 'reports');

export function assertLocalDockerEndpoint(endpoint, env = {}) {
  if (env.DOCKER_HOST || env.DOCKER_CONTEXT) throw new Error('Remove Docker endpoint overrides before local setup.');
  if (!['npipe:////./pipe/dockerDesktopLinuxEngine', 'npipe:////./pipe/docker_engine', 'unix:///var/run/docker.sock'].includes(endpoint)
    && !/^unix:\/\/\/run\/user\/\d+\/docker\.sock$/.test(endpoint ?? '')) {
    throw new Error('Only an approved local Docker socket is allowed.');
  }
}

function within(parent, child) {
  const rel = relative(parent, child);
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

export function assertComposeModel(model, rootDir, target = 'development') {
  if (!Object.hasOwn(TARGETS, target)) throw new Error('Unknown local target.');
  const PROJECT = TARGETS[target].project;
  const PORTS = { db: [TARGETS[target].databasePort, 5432], studio: [TARGETS[target].studioPort, 3000], 'api-gw': [TARGETS[target].apiPort, 8000] };
  if (model.name !== PROJECT) throw new Error('Unexpected Compose project.');
  if (Object.keys(model.services ?? {}).sort().join() !== Object.keys(IMAGES).sort().join()) throw new Error('Unexpected Compose service set.');
  if (!model.networks?.default || model.networks.default.name !== `${PROJECT}_default`
    || model.networks.default.external || model.networks.default.driver === 'host') throw new Error('Network must belong to this project.');
  for (const [key, volume] of Object.entries(model.volumes ?? {})) {
    if (!['db-data', 'db-config', 'snippets'].includes(key) || volume.external || volume.driver_opts
      || (volume.name !== `${PROJECT}_${key}` && !(key === 'db-data' && volume.name === `${PROJECT}_db-data-bootstrap-v2`))) throw new Error('Unexpected Compose volume.');
  }
  const safeFiles = resolve(rootDir, 'infra', 'local-supabase');
  for (const [service, config] of Object.entries(model.services)) {
    if (config.image !== IMAGES[service] || config.build || config.privileged || config.network_mode || config.pid || config.ipc
      || config.devices?.length || config.cap_add?.length || config.volumes_from?.length || config.use_api_socket
      || config.container_name || config.restart !== 'no' || config.env_file?.length || config.develop || config.provider) {
      throw new Error(`Unsafe service configuration: ${service}.`);
    }
    if (Object.keys(config.networks ?? {}).join() !== 'default') throw new Error(`Unexpected service network: ${service}.`);
    const mappings = config.ports ?? [];
    const expected = PORTS[service];
    if (mappings.length !== (expected ? 1 : 0)) throw new Error(`Unexpected published port count: ${service}.`);
    for (const port of mappings) {
      if (typeof port !== 'object' || port.host_ip !== '127.0.0.1' || Number(port.published) !== expected[0]
        || Number(port.target) !== expected[1] || (port.protocol && port.protocol !== 'tcp')) throw new Error(`Non-loopback or unexpected port: ${service}.`);
    }
    for (const mount of config.volumes ?? []) {
      if (mount.type === 'volume') {
        if (!model.volumes?.[mount.source] || mount.volume?.subpath || VOLUMES[service]?.[mount.source] !== mount.target) throw new Error(`Unscoped volume: ${service}.`);
      } else if (mount.type === 'bind') {
        const key = relative(safeFiles, resolve(mount.source)).split(sep).join('/');
        if (!mount.read_only || !within(safeFiles, resolve(mount.source)) || BINDS[service]?.[key] !== mount.target
          || !existsSync(mount.source) || !statSync(mount.source).isFile()
          || realpathSync(mount.source) !== resolve(mount.source)) throw new Error(`Unsafe bind mount: ${service}.`);
      } else throw new Error(`Unexpected mount type: ${service}.`);
    }
    if (service === 'db' && !(config.volumes ?? []).some(m => m.type === 'volume' && m.source === 'db-data'
      && m.target === '/var/lib/postgresql/data')) throw new Error('Database requires its project data volume.');
  }
}

export function assertVolumeMetadata(value, key, target = 'development') {
  const targetProfile = TARGETS[target];
  if (!targetProfile || !['db-data', 'db-config', 'snippets'].includes(key)) throw new Error('Unknown volume profile.');
  const expectedName = key === 'db-data' ? targetProfile.dataVolume : `${targetProfile.project}_${key}`;
  if (value.Name !== expectedName || value.Driver !== 'local' || value.Scope !== 'local'
    || Object.keys(value.Options ?? {}).length || value.Labels?.['com.docker.compose.project'] !== targetProfile.project
    || value.Labels?.['com.docker.compose.volume'] !== key) throw new Error('Existing volume ownership or driver mismatch.');
}

function verifyExistingVolumes(model) {
  const existing = new Set(docker(['volume', 'ls', '--format', '{{.Name}}']).trim().split(/\s+/));
  for (const [key, value] of Object.entries(model.volumes ?? {})) {
    if (existing.has(value.name)) {
      const metadata = JSON.parse(docker(['volume', 'inspect', value.name]));
      if (metadata.length !== 1) throw new Error('Ambiguous existing volume.');
      assertVolumeMetadata(metadata[0], key, selectedTarget);
    }
  }
}

function token(role, secret) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ iss: 'supabase', role, iat: now, exp: now + 31536000 })}`;
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}

function initCredentials() {
  if (existsSync(credentialsPath)) { loadCredentials(); console.log('Existing project development credentials retained.'); return; }
  const secret = randomBytes(32).toString('hex');
  const values = {
    STRATA_LOCAL_ONLY: project,
    STRATA_DB_PASSWORD: randomBytes(24).toString('hex'),
    STRATA_JWT_SECRET: secret,
    STRATA_ANON_KEY: token('anon', secret),
    STRATA_SERVICE_ROLE_KEY: token('service_role', secret),
    STRATA_META_CRYPTO_KEY: randomBytes(32).toString('hex'),
    STRATA_DASHBOARD_PASSWORD: randomBytes(24).toString('hex'),
  };
  mkdirSync(setup, { recursive: true });
  writeFileSync(credentialsPath, Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n') + '\n', { flag: 'wx', mode: 0o600 });
  console.log(`Fresh ${selectedTarget} credentials created in the ignored project file; values are not printed.`);
}

function loadCredentials() {
  if (!existsSync(credentialsPath)) throw new Error('Run npm run db:local:init first.');
  const values = Object.fromEntries(readFileSync(credentialsPath, 'utf8').trim().split(/\r?\n/).map(line => {
    const match = /^(STRATA_[A-Z_]+)=([A-Za-z0-9_.-]+)$/.exec(line);
    if (!match) throw new Error('Invalid local credential file format.');
    return [match[1], match[2]];
  }));
  const keys = ['STRATA_LOCAL_ONLY', 'STRATA_DB_PASSWORD', 'STRATA_JWT_SECRET', 'STRATA_ANON_KEY', 'STRATA_SERVICE_ROLE_KEY', 'STRATA_META_CRYPTO_KEY', 'STRATA_DASHBOARD_PASSWORD'];
  if (Object.keys(values).sort().join() !== keys.sort().join() || values.STRATA_LOCAL_ONLY !== project) throw new Error('Unexpected local credential file.');
  return values;
}

export function commandEnvironment() {
  const allowed = ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'COMSPEC', 'TEMP', 'TMP', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA', 'HOMEDRIVE', 'HOMEPATH', 'HOME', 'LANG', 'LC_ALL'];
  const env = Object.fromEntries(allowed.filter(key => process.env[key] !== undefined).map(key => [key, process.env[key]]));
  const currentPath = env.PATH ?? env.Path ?? '';
  delete env.Path;
  env.PATH = isAbsolute(dockerBinary()) ? `${dirname(dockerBinary())}${delimiter}${currentPath}` : currentPath;
  env.COMPOSE_DISABLE_ENV_FILE = 'true';
  env.STRATA_DB_PORT = String(TARGETS[selectedTarget].databasePort);
  env.STRATA_API_PORT = String(TARGETS[selectedTarget].apiPort);
  env.STRATA_STUDIO_PORT = String(TARGETS[selectedTarget].studioPort);
  env.STRATA_DATA_VOLUME = TARGETS[selectedTarget].dataVolume;
  return env;
}

export function dockerBinary() {
  if (process.platform === 'win32') {
    for (const candidate of [join(process.env.LOCALAPPDATA ?? '', 'Programs', 'DockerDesktop', 'resources', 'bin', 'docker.exe'),
      'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe']) if (existsSync(candidate)) return candidate;
  }
  return 'docker';
}

function docker(args, timeout = 30000, input) {
  try { return execFileSync(dockerBinary(), args, { cwd: root, env: commandEnvironment(), stdio: ['pipe', 'pipe', 'pipe'], input, encoding: 'utf8', timeout, maxBuffer: 16 * 1024 * 1024, windowsHide: true }); }
  catch (error) {
    mkdirSync(reports, { recursive: true });
    writeFileSync(join(reports, 'local-supabase-last-error.log'), `${error.stdout ?? ''}\n${error.stderr ?? ''}`, { mode: 0o600 });
    throw new Error('Local Docker command failed. Details retained in ignored reports/local-supabase-last-error.log; do not share generated credentials.');
  }
}

function assertArtifacts() {
  const manifest = JSON.parse(readFileSync(join(setup, 'provenance.json'), 'utf8'));
  if (manifest.upstreamCommit !== 'bc27d2661edd09a5d0b8d76ce33da6d4071a756e') throw new Error('Unexpected upstream source pin.');
  const artifacts = [...manifest.artifacts, ...manifest.localArtifacts];
  if (!artifacts.some(item => item.path === 'compose.local.yaml') || !artifacts.some(item => item.path === 'bootstrap/100-local-grants.sql')) throw new Error('Local setup pin coverage is incomplete.');
  for (const artifact of artifacts) {
    const file = resolve(setup, artifact.path);
    if (!within(setup, file) || realpathSync(file) !== file || !statSync(file).isFile()
      || createHash('sha256').update(readFileSync(file)).digest('hex') !== artifact.sha256) throw new Error('Pinned setup artifact mismatch.');
  }
}

function preflight() {
  assertEngine();
  if (docker(['info', '--format', '{{.OSType}}']).trim() !== 'linux') throw new Error('A local Linux container engine is required.');
  loadCredentials();
  assertArtifacts();
  const model = JSON.parse(docker(composeArgs('config', '--format', 'json')));
  assertComposeModel(model, root, selectedTarget);
  verifyExistingVolumes(model);
  return model;
}

function assertEngine() {
  assertLocalDockerEndpoint(JSON.parse(docker(['context', 'inspect', '--format', '{{json .Endpoints.docker.Host}}']).trim()), process.env);
}

function ownedContainerIds() {
  const ids = docker(['ps', '-a', '--filter', `label=com.docker.compose.project=${project}`, '--format', '{{.ID}}']).trim().split(/\s+/).filter(Boolean);
  for (const id of ids) {
    const format = '{"service":{{json (index .Config.Labels "com.docker.compose.service")}},"directory":{{json (index .Config.Labels "com.docker.compose.project.working_dir")}}}';
    const labels = JSON.parse(docker(['inspect', '--format', format, id]));
    if (!IMAGES[labels.service] || resolve(labels.directory ?? '') !== setup) throw new Error('Compose project name is owned by another working directory or service.');
  }
  return ids;
}

function stopProject() {
  assertEngine();
  const ids = ownedContainerIds();
  if (ids.length) docker(['stop', ...ids], 120000);
  console.log('Only StrataDrive services stopped; project data retained.');
}

function developmentDatabaseId() {
  const ids = ownedContainerIds();
  const db = ids.find(id => docker(['inspect', '--format', '{{index .Config.Labels "com.docker.compose.service"}}', id]).trim() === 'db');
  if (!db || docker(['inspect', '--format', '{{.Config.Image}}', db]).trim() !== IMAGES.db) throw new Error('Expected owned development database before setup grants.');
  return db;
}

function verifyDatabaseProbe(id, expectedCommand) {
  const value = JSON.parse(docker(['inspect', '--format', '{"image":{{json .Config.Image}},"command":{{json .Config.Cmd}},"privileged":{{json .HostConfig.Privileged}},"network":{{json .HostConfig.NetworkMode}},"ports":{{json .HostConfig.PortBindings}},"mounts":{{json .Mounts}},"running":{{json .State.Running}}}', id]));
  const previousCommand = expectedCommand.slice(0, -2);
  if (value.image !== IMAGES.db || value.privileged || value.network !== `${project}_default`
    || ![JSON.stringify(expectedCommand), JSON.stringify(previousCommand)].includes(JSON.stringify(value.command))) throw new Error('Existing database probe configuration is not recognized.');
  const bindings = value.ports?.['5432/tcp'];
  if (Object.keys(value.ports ?? {}).join() !== '5432/tcp' || bindings?.length !== 1
    || bindings[0].HostIp !== '127.0.0.1' || Number(bindings[0].HostPort) !== TARGETS[selectedTarget].databasePort) throw new Error('Existing database probe ports are unsafe.');
  let data = false;
  for (const mount of value.mounts ?? []) {
    if (mount.Type === 'volume') {
      if (mount.Name === TARGETS[selectedTarget].dataVolume && mount.Destination === '/var/lib/postgresql/data') data = true;
      else if (mount.Name !== `${project}_db-config` || mount.Destination !== '/etc/postgresql-custom') throw new Error('Unexpected probe volume.');
    } else if (mount.Type === 'bind') {
      const key = relative(setup, resolve(mount.Source)).split(sep).join('/');
      if (mount.RW || BINDS.db[key] !== mount.Destination || realpathSync(mount.Source) !== resolve(mount.Source) || !statSync(mount.Source).isFile()) throw new Error('Unexpected probe bind.');
    } else throw new Error('Unexpected probe mount.');
  }
  if (!data) throw new Error('Expected probe data volume is missing.');
  return value.running;
}

async function waitForInitialization() {
  const db = developmentDatabaseId();
  const deadline = Date.now() + 120000;
  // The pinned upstream entrypoint execs postgres only after all init files and
  // migrations finish; pg_isready can succeed on its temporary bootstrap server.
  while (Date.now() < deadline) {
    // The pinned Nix-based image executes .postgres-wrapped (Linux comm is
    // truncated to 15 characters); both names identify the final server.
    if (['postgres', '.postgres-wrapp'].includes(docker(['exec', db, 'cat', '/proc/1/comm']).trim())) return;
    await new Promise(resolveWait => setTimeout(resolveWait, 1000));
  }
  throw new Error('Database initialization did not complete.');
}

function applyDevelopmentGrants() {
  const db = developmentDatabaseId();
  // Image migrations run after init-scripts and restore net grants. Reapply the
  // pinned, idempotent setup policy after startup; create no business objects.
  docker(['exec', '-i', '-e', 'PGCONNECT_TIMEOUT=3', '-e', 'PGOPTIONS=-c statement_timeout=10000 -c lock_timeout=3000 -c log_statement=none -c log_parameter_max_length=0 -c log_parameter_max_length_on_error=0 -c log_min_error_statement=panic -c log_error_verbosity=terse -c log_min_messages=fatal', db, 'psql', '--no-psqlrc', '--single-transaction', '-f', '-', '-v', 'ON_ERROR_STOP=1', '-U', 'supabase_admin', '-d', 'postgres'],
    30000, readFileSync(join(setup, 'bootstrap', '100-local-grants.sql'), 'utf8'));
}

function composeArgs(...args) { return ['compose', '--project-name', project, '--env-file', credentialsPath, '-f', composePath, ...args]; }

async function httpCheck(url, headers = {}, expectedStatus = 200) {
  let current = url;
  for (let i = 0; i < 4; i++) {
    const response = await fetch(current, { headers, redirect: 'manual', signal: AbortSignal.timeout(10000) });
    if (response.status >= 300 && response.status < 400) {
      const next = new URL(response.headers.get('location') ?? '', current);
      if (next.origin !== new URL(url).origin) throw new Error('Unexpected external redirect from local service.');
      current = next.href;
      await response.body?.cancel();
      continue;
    }
    await response.body?.cancel();
    if (response.status !== expectedStatus) throw new Error(`Local service returned unexpected HTTP ${response.status} at ${new URL(url).pathname}.`);
    return { url, status: response.status, expectedStatus };
  }
  throw new Error('Too many local service redirects.');
}

async function check() {
  const ids = docker(['ps', '--filter', `label=com.docker.compose.project=${project}`, '--format', '{{.ID}}']).trim().split(/\s+/).filter(Boolean);
  if (ids.length !== 5) throw new Error('Expected exactly five project containers.');
  const format = '{"name":{{json .Name}},"service":{{json (index .Config.Labels "com.docker.compose.service")}},"running":{{json .State.Running}},"health":{{if .State.Health}}{{json .State.Health.Status}}{{else}}null{{end}},"ports":{{json .NetworkSettings.Ports}}}';
  const containers = ids.map(id => ({ id, ...JSON.parse(docker(['inspect', '--format', format, id])) }));
  if (containers.map(c => c.service).sort().join() !== Object.keys(IMAGES).sort().join()) throw new Error('Unexpected running project services.');
  for (const container of containers) {
    if (!container.running || (container.health && container.health !== 'healthy')) throw new Error('Project container is not healthy.');
    const published = Object.entries(container.ports ?? {}).flatMap(([target, binds]) => (binds ?? []).map(bind => ({ target, ...bind })));
    const expected = ports[container.service];
    if (published.length !== (expected ? 1 : 0) || published.some(p => p.HostIp !== '127.0.0.1'
      || Number(p.HostPort) !== expected[0] || p.target !== `${expected[1]}/tcp`)) throw new Error('Runtime port isolation failed.');
  }
  let listeners = [];
  if (process.platform === 'win32') {
    const output = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      `$p = @(Get-NetTCPConnection -State Listen -LocalPort ${TARGETS[selectedTarget].apiPort},${TARGETS[selectedTarget].databasePort},${TARGETS[selectedTarget].studioPort} -ErrorAction SilentlyContinue | Select-Object LocalAddress,LocalPort); ConvertTo-Json -Compress -InputObject $p`],
    { encoding: 'utf8', timeout: 30000, windowsHide: true });
    listeners = JSON.parse(output);
    if (listeners.length !== 3 || listeners.some(p => p.LocalAddress !== '127.0.0.1')) throw new Error('Host listener isolation failed.');
  }
  const db = containers.find(c => c.service === 'db');
  docker(['exec', db.id, 'pg_isready', '-U', 'postgres', '-d', 'postgres']);
  if (docker(['exec', db.id, 'psql', '--no-psqlrc', '-U', 'postgres', '-d', 'postgres', '-Atc', 'BEGIN READ ONLY; SELECT 1; COMMIT;']).trim() !== 'BEGIN\n1\nCOMMIT') throw new Error('Read-only SQL probe failed.');
  const grantsQuery = "WITH defaults AS (SELECT COALESCE((SELECT defaclacl FROM pg_default_acl WHERE defaclrole='postgres'::regrole AND defaclnamespace=0 AND defaclobjtype='f'), acldefault('f', 'postgres'::regrole)) AS acl) SELECT has_schema_privilege('anon','public','USAGE')::text || ',' || has_schema_privilege('authenticated','public','USAGE')::text || ',' || has_schema_privilege('service_role','public','USAGE')::text || ',' || EXISTS(SELECT 1 FROM defaults, aclexplode(acl) AS a WHERE grantee=0 AND privilege_type='EXECUTE')::text || ',' || has_schema_privilege('anon','net','USAGE')::text || ',' || has_schema_privilege('anon','supabase_functions','USAGE')::text;";
  const effectiveGrants = docker(['exec', db.id, 'psql', '--no-psqlrc', '-U', 'postgres', '-d', 'postgres', '-Atc', grantsQuery]).trim();
  if (effectiveGrants !== 'false,false,true,false,false,false') throw new Error(`Effective development database grants failed verification (${effectiveGrants}).`);
  const credentials = loadCredentials();
  const endpoints = await Promise.all([
    httpCheck(`http://127.0.0.1:${TARGETS[selectedTarget].studioPort}/`),
    httpCheck(`http://127.0.0.1:${TARGETS[selectedTarget].apiPort}/rest/v1/`, { apikey: credentials.STRATA_SERVICE_ROLE_KEY, Authorization: `Bearer ${credentials.STRATA_SERVICE_ROLE_KEY}` }),
    httpCheck(`http://127.0.0.1:${TARGETS[selectedTarget].apiPort}/rest/v1/`, { apikey: credentials.STRATA_ANON_KEY, Authorization: `Bearer ${credentials.STRATA_ANON_KEY}` }, 403),
  ]);
  const evidence = { checkedAt: new Date().toISOString(), project, containers, listeners, endpoints, databaseReadOnlyProbe: 'passed', effectiveDatabaseGrants: 'passed', businessPersistenceTested: false };
  mkdirSync(reports, { recursive: true });
  writeFileSync(join(reports, `local-supabase-${selectedTarget}-check.json`), JSON.stringify(evidence, null, 2) + '\n');
  console.log('Local stack passed container-state, available health, loopback port, Studio/API and read-only database checks.');
  console.log(`Studio: http://127.0.0.1:${TARGETS[selectedTarget].studioPort}/`);
}

async function main() {
  const action = process.argv[2];
  selectedTarget = process.argv[3] ?? 'development';
  if (!['init', 'preflight', 'start', 'check', 'stop', 'database'].includes(action) || process.argv.length > 4 || !Object.hasOwn(TARGETS, selectedTarget)
    ) throw new Error('Unknown local lifecycle action/target.');
  project = TARGETS[selectedTarget].project;
  ports = { db: [TARGETS[selectedTarget].databasePort, 5432], studio: [TARGETS[selectedTarget].studioPort, 3000], 'api-gw': [TARGETS[selectedTarget].apiPort, 8000] };
  credentialsPath = join(setup, TARGETS[selectedTarget].credentials);
  if (action === 'init') return initCredentials();
  if (action === 'stop') return stopProject();
  const model = preflight();
  const ownedIds = ownedContainerIds();
  if (action === 'preflight') { console.log('Local engine, pinned artifacts and rendered loopback-only model passed preflight.'); return; }
  // The enquiry runner resumes only the database to inspect its durable run
  // marker before any project-wide restart, grant repair or business migration.
  if (action === 'database') {
    const database = ownedIds.find(id => docker(['inspect', '--format', '{{index .Config.Labels "com.docker.compose.service"}}', id]).trim() === 'db');
    if (database) {
      // Resume the exact reviewed container without Compose reconciliation.
      // The enquiry runner reads its durable identity before any recreation.
      if (!verifyDatabaseProbe(database, model.services.db.command)) docker(['start', database], 120000);
    } else docker(composeArgs('up', '-d', '--wait', '--wait-timeout', '180', 'db'), 900000);
    await waitForInitialization();
    return;
  }
  if (action === 'start') {
    console.log('Validated local engine and rendered model. Starting five local services; initial image pulls can take several minutes.');
    try {
      stopProject();
      docker(composeArgs('up', '-d', '--wait', '--wait-timeout', '180', 'db'), 900000);
      await waitForInitialization();
      applyDevelopmentGrants();
      docker(composeArgs('up', '-d', '--wait', '--wait-timeout', '180'), 900000);
      await check();
    } catch (error) {
      try { stopProject(); } catch { console.error('Automatic project stop failed; inspect local Docker project state before continuing.'); }
      throw error;
    }
    return;
  }
  try { await check(); } catch (error) {
    try { stopProject(); } catch { console.error('Automatic project stop failed; inspect local Docker project state before continuing.'); }
    throw error;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
