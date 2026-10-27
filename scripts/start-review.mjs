import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { assertLocalDockerEndpoint, commandEnvironment, dockerBinary } from './local-supabase.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const REVIEW_URLS = Object.freeze([
  'http://127.0.0.1:3000/',
  'http://127.0.0.1:3000/book',
  'http://127.0.0.1:3000/enquire',
  'http://127.0.0.1:54323/project/default/editor',
]);
const markerName = '.stratadrive-review-dependencies.sha256';

export function assertReviewEnvironment(env, platform, nodeVersion, npmVersion) {
  if (platform !== 'win32') throw new Error('This shortcut requires Windows and Docker Desktop. Use the individual startup steps on other systems.');
  if (nodeVersion !== 'v22.15.0' || npmVersion !== '10.9.2') throw new Error('Use Node v22.15.0 and npm 10.9.2 before running the shortcut.');
  assertLocalDockerEndpoint('npipe:////./pipe/dockerDesktopLinuxEngine', env);
  if (env.STRATA_TEST_RUN_ID || (env.STRATA_ENQUIRY_TARGET && env.STRATA_ENQUIRY_TARGET !== 'development')) {
    throw new Error('The review shortcut requires a development terminal without isolated-test configuration.');
  }
}

export function dependencyFingerprint(directory) {
  return createHash('sha256').update(readFileSync(join(directory, 'package.json')))
    .update('\0').update(readFileSync(join(directory, 'package-lock.json'))).digest('hex');
}

export function needsInstall(directory) {
  const marker = join(directory, 'node_modules', markerName);
  return !existsSync(join(directory, 'node_modules/next/dist/bin/next')) || !existsSync(marker)
    || readFileSync(marker, 'utf8').trim() !== dependencyFingerprint(directory);
}

export function assertNoDevelopmentLock(directory) {
  if (existsSync(join(directory, '.next/dev/lock'))) {
    throw new Error('A development lock exists. Stop the project dev server in its original terminal, then retry. Investigate a stale lock without deleting it to bypass this guard.');
  }
}

export async function waitForDocker({ inspectEndpoint, engineType, openDesktop, now = Date.now, sleep = (/** @type {number} */ ms) => delay(ms), timeoutMs = 180000 }) {
  // Context inspection is local client metadata. Validate it before any daemon call.
  assertLocalDockerEndpoint(await inspectEndpoint(), process.env);
  let opened = false;
  const deadline = now() + timeoutMs;
  while (now() < deadline) {
    assertLocalDockerEndpoint(await inspectEndpoint(), process.env);
    let type;
    try { type = await engineType(); } catch { /* Desktop may still be starting. */ }
    if (type === 'linux') return;
    if (type) throw new Error('Docker must use Linux containers. Select the Linux engine in Docker Desktop, then retry.');
    if (!opened) { await openDesktop(); opened = true; }
    await sleep(2000);
  }
  throw new Error('Docker Desktop was not ready within three minutes. Check its Linux engine, then retry.');
}

export async function runReview(runtime) {
  await runtime.checkPrerequisites();
  await runtime.assertPortFree();
  await runtime.installDependencies();
  await runtime.ensureDocker();
  await runtime.prepare();
  await runtime.checkDatabase();
  let application;
  try {
    application = await runtime.startApplication();
    await runtime.waitForPages(application);
    await runtime.openReviewWindows();
    return await runtime.waitForApplication(application);
  } finally {
    if (application) await runtime.stopApplication(application);
  }
}

function capture(binary, args, options = {}) {
  const result = spawnSync(binary, args, { cwd: root, windowsHide: true, encoding: 'utf8', timeout: 10000, ...options });
  if (result.error || result.status !== 0) throw new Error('Local command failed. Resolve the reported startup stage and retry.');
  return result.stdout?.trim() ?? '';
}

function npmCli() {
  const candidate = process.env.npm_execpath ?? join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
  if (!existsSync(candidate) || !candidate.endsWith('npm-cli.js')) throw new Error('Run this shortcut with npm run review:local using the pinned Node/npm installation.');
  return candidate;
}

function powershell(script, env = process.env) {
  return capture('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `$ErrorActionPreference = 'Stop'; ${script}`], { env });
}

async function assertPortFree() {
  await new Promise((accept, reject) => {
    const server = createServer();
    server.once('error', () => reject(new Error('Port 3000 is occupied. Stop the existing server in its original terminal, then retry. No process was stopped.')));
    server.listen({ host: '127.0.0.1', port: 3000, exclusive: true }, () => server.close(accept));
  });
}

export function createRuntime() {
  let interrupted = false;
  let signalCleanup;
  const children = new Set();
  const stop = child => {
    if (!children.has(child)) return;
    children.delete(child);
    if (child.exitCode === null && child.pid) {
      // Only a process created by this invocation can enter the set.
      spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore', timeout: 10000 });
    }
  };
  const onSignal = () => {
    interrupted = true;
    // The console delivers Ctrl+C to the child tree too. Give Next time to
    // release its development lock before terminating any remaining owned tree.
    signalCleanup = setTimeout(() => { for (const child of [...children]) stop(child); }, 2000);
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);
  const launch = args => {
    const child = spawn(process.execPath, [npmCli(), ...args], { cwd: root, env: process.env, stdio: 'inherit', windowsHide: true });
    children.add(child);
    child.finished = new Promise(accept => {
      child.once('error', () => accept(1));
      child.once('exit', code => accept(code ?? (interrupted ? 0 : 1)));
    });
    return child;
  };
  const npm = async (args, timeout = 1000000) => {
    if (interrupted) throw new Error('Startup interrupted.');
    const child = launch(args);
    let timer;
    try {
      const code = await Promise.race([
        child.finished,
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            stop(child);
            reject(new Error('Local setup command timed out; its owned process tree was stopped. Check the stage output before retrying.'));
          }, timeout);
        }),
      ]);
      if (interrupted || code !== 0) throw new Error('Local setup command failed or was interrupted. Check the stage output before retrying.');
    } finally { clearTimeout(timer); stop(child); }
  };
  return {
    async checkPrerequisites() {
      console.log('[1/7] Checking Windows, Node/npm and development target.');
      assertReviewEnvironment(process.env, process.platform, process.version, capture(process.execPath, [npmCli(), '--version']));
      capture('pwsh.exe', ['-NoProfile', '-NonInteractive', '-Command', 'if ($PSVersionTable.PSVersion.Major -lt 7) { exit 1 }']);
      assertNoDevelopmentLock(root);
    },
    assertPortFree,
    async installDependencies() {
      if (interrupted) throw new Error('Startup interrupted.');
      if (needsInstall(root)) {
        console.log('[2/7] Installing locked dependencies (first shortcut run or changed package/lockfile).');
        // Verify the port again immediately before npm ci can replace dependencies.
        await assertPortFree();
        assertNoDevelopmentLock(root);
        await npm(['ci']);
        writeFileSync(join(root, 'node_modules', markerName), dependencyFingerprint(root) + '\n');
      } else console.log('[2/7] Locked dependencies unchanged; keeping the installation.');
    },
    async ensureDocker() {
      console.log('[3/7] Checking the local Linux engine; opening Docker Desktop if needed.');
      const docker = args => capture(dockerBinary(), args, { env: commandEnvironment(), timeout: 5000 });
      await waitForDocker({
        inspectEndpoint: () => JSON.parse(docker(['context', 'inspect', '--format', '{{json .Endpoints.docker.Host}}'])),
        engineType: () => docker(['info', '--format', '{{.OSType}}']),
        openDesktop: () => {
          const candidates = [join(process.env.LOCALAPPDATA ?? '', 'Programs/DockerDesktop/Docker Desktop.exe'), 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe'];
          const executable = candidates.find(path => existsSync(path));
          if (!executable) throw new Error('Docker Desktop was not found in its standard Windows locations. Open your installed Docker Desktop, then retry.');
          powershell('Start-Process -FilePath $env:STRATA_REVIEW_DESKTOP -WindowStyle Normal', { ...process.env, STRATA_REVIEW_DESKTOP: executable });
        },
        sleep: async ms => { if (interrupted) throw new Error('Startup interrupted.'); await delay(ms); },
      });
    },
    async prepare() {
      if (interrupted) throw new Error('Startup interrupted.');
      console.log('[4/7] Preparing the guarded development database; retaining sample rows.');
      await npm(['run', 'enquiries:local:prepare']);
    },
    async checkDatabase() {
      if (interrupted) throw new Error('Startup interrupted.');
      console.log('[5/7] Checking development services, ownership and loopback bindings.');
      await npm(['run', 'db:local:check']);
    },
    async startApplication() {
      if (interrupted) throw new Error('Startup interrupted.');
      await assertPortFree();
      assertNoDevelopmentLock(root);
      console.log('[6/7] Starting npm start on http://127.0.0.1:3000/. Keep this terminal open.');
      return launch(['start']);
    },
    async waitForPages(child) {
      const deadline = Date.now() + 180000;
      for (const url of REVIEW_URLS) {
        let ready = false;
        while (Date.now() < deadline) {
          if (interrupted || child.exitCode !== null || child.pid === undefined) throw new Error('Application stopped before startup checks completed.');
          try {
            const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(5000) });
            ready = response.status === 200;
            await response.body?.cancel();
          } catch { /* Retry only this fixed loopback URL during initial compilation. */ }
          if (ready) break;
          await delay(1000);
        }
        if (!ready) throw new Error(`Startup readiness timed out at ${url}. Check the app output and Docker Desktop.`);
      }
    },
    async openReviewWindows() {
      if (interrupted) throw new Error('Startup interrupted.');
      console.log('[7/7] HTTP readiness passed. Opening the review pages and a second PowerShell.');
      for (const url of REVIEW_URLS) powershell('Start-Process -FilePath $env:STRATA_REVIEW_URL', { ...process.env, STRATA_REVIEW_URL: url });
      // Environment arguments avoid embedding the working directory in shell code.
      powershell("Start-Process pwsh.exe -WorkingDirectory $env:STRATA_REVIEW_ROOT -ArgumentList '-NoExit','-NoProfile' -WindowStyle Normal", { ...process.env, STRATA_REVIEW_ROOT: root });
      console.log('In Studio, select enquiry_private > enquiries. Check page appearance and use synthetic details only.');
      console.log('Ctrl+C stops this app. Then run npm run db:local:stop in the second terminal to retain data and stop database services.');
    },
    waitForApplication: child => child.finished,
    async stopApplication(child) {
      if (interrupted && child.exitCode === null) await Promise.race([child.finished, delay(2000)]);
      stop(child);
    },
    dispose() { clearTimeout(signalCleanup); process.removeListener('SIGINT', onSignal); process.removeListener('SIGTERM', onSignal); },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const runtime = createRuntime();
  try {
    if (process.argv.length !== 2) throw new Error('Usage: npm run review:local');
    process.exitCode = await runReview(runtime);
  } catch (error) {
    console.error(`Review startup stopped: ${error.message}`);
    process.exitCode = 1;
  } finally { runtime.dispose(); }
}
