import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2];
if (!['development', 'production', 'test'].includes(mode) || process.argv.length !== 3) throw new Error('Unknown local start mode.');
const rootFiles = readdirSync(root).filter(name => /^\.env(?:\.|$)/.test(name));
for (const file of rootFiles) {
  if (file !== '.env.local') throw new Error('An unrecognized root environment file exists; no contents were inspected.');
  const sidecar = join(root, 'infra/local-supabase/.env.enquiries.local');
  const saved = existsSync(sidecar) ? JSON.parse(readFileSync(sidecar, 'utf8')).rootEnvironment : null;
  const info = statSync(join(root, file));
  if (!saved || saved.ino !== info.ino || saved.size !== info.size || saved.mtimeMs !== info.mtimeMs) throw new Error('Root environment file ownership is not verified.');
}
if (mode === 'test' && (process.env.STRATA_ENQUIRY_TARGET !== 'test' || !process.env.STRATA_TEST_RUN_ID)) throw new Error('Production test server requires an isolated test run.');
const args = [join(root, 'node_modules/next/dist/bin/next'), mode === 'development' ? 'dev' : 'start', '--hostname', '127.0.0.1', '--port', mode === 'test' ? '3100' : '3000'];
const child = spawn(process.execPath, args, { cwd: root, env: { ...process.env, NODE_ENV: mode === 'development' ? 'development' : 'production' }, stdio: 'inherit', windowsHide: true });
child.on('error', () => { console.error('Local application startup failed.'); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
