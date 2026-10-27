import { createHash } from "node:crypto";
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
export const requiredChecks = ["lint", "typecheck", "traceability", "contracts", "unit", "build", "integration", "api", "e2e"];
const shaPattern = /^[a-f0-9]{40}$/i;
const repoPattern = /^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i;

export function assertSourceIdentity({ expectedSha, actualSha, repository, expectedRepository }) {
  if (!shaPattern.test(expectedSha ?? "") || !shaPattern.test(actualSha ?? "")) {
    throw new Error("Expected and checked-out source must be immutable 40-character commit SHAs.");
  }
  if (expectedSha.toLowerCase() !== actualSha.toLowerCase()) throw new Error("Checked-out source SHA does not match the expected SHA.");
  if (!repoPattern.test(repository ?? "") || !repoPattern.test(expectedRepository ?? "")) throw new Error("Source repository must identify a GitHub owner/repository.");
  if (repository.toLowerCase() !== expectedRepository.toLowerCase()) throw new Error("Checked-out repository does not match the expected GitHub repository.");
}

/** Compare artifacts obtained from trusted, independent provider runs. */
export function compareManifests(left, right) {
  const errors = [];
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return ["Two source manifests are required."];
  const providers = new Set([left.provider, right.provider]);
  if (providers.size !== 2 || !providers.has("github") || !providers.has("azure")) errors.push("Require one GitHub and one Azure manifest.");
  for (const [label, manifest] of [["left", left], ["right", right]]) {
    if (!repoPattern.test(manifest.repository ?? "")) errors.push(`${label}: invalid repository identity.`);
    if (!shaPattern.test(manifest.sha ?? "")) errors.push(`${label}: invalid source SHA.`);
    if (!/^[a-f0-9]{64}$/i.test(manifest.lockfileSha256 ?? "")) errors.push(`${label}: invalid lockfile digest.`);
    if (typeof manifest.node !== "string" || !/^v\d+\.\d+\.\d+$/.test(manifest.node)) errors.push(`${label}: missing Node identity.`);
    if (typeof manifest.npm !== "string" || !/^\d+\.\d+\.\d+$/.test(manifest.npm)) errors.push(`${label}: missing npm identity.`);
    if (manifest.dirty !== false || manifest.status !== "passed") errors.push(`${label}: require a clean, successful run.`);
    if (!Array.isArray(manifest.checks)) {
      errors.push(`${label}: missing checks.`);
    } else {
      const names = manifest.checks.map((check) => check?.name);
      if (names.length !== requiredChecks.length || new Set(names).size !== names.length ||
        requiredChecks.some((name) => !manifest.checks.some((check) => check?.name === name && check.status === "passed"))) {
        errors.push(`${label}: all ${requiredChecks.length} required checks must pass exactly once.`);
      }
    }
  }
  for (const key of ["repository", "sha", "lockfileSha256", "node", "npm"]) {
    if (left[key] !== right[key]) errors.push(`Provider ${key} identities differ.`);
  }
  return errors;
}

function capture(command, args) {
  const result = spawnSync(command, args, { cwd: rootDir, encoding: "utf8", windowsHide: true });
  if (result.error || result.status !== 0) throw new Error(`Cannot read ${command} identity (exit ${result.status ?? "unavailable"}).`);
  return result.stdout.trim();
}

function sourceRepository() {
  // Never log raw remote URLs: they might contain embedded credentials.
  let remote;
  try { remote = capture("git", ["remote", "get-url", "origin"]); } catch { return "local/unconfigured"; }
  const match = /^(?:https:\/\/github\.com\/|git@github\.com:)([a-z0-9_.-]+\/[a-z0-9_.-]+?)(?:\.git)?$/i.exec(remote);
  if (!match) return "local/unconfigured";
  return match[1];
}

// Evidence collection must also work when dependency installation never ran.
// Raw local setup logs and generated configuration are deliberately excluded.
export function stageEvidence() {
  const reportDir = path.join(rootDir, "reports");
  const targetDir = path.join(reportDir, "ci-evidence");
  const allowed = new Set(["source-identity.json", "vitest-junit.xml", "integration-junit.xml",
    "api-junit.xml", "e2e-junit.xml", "all-junit.xml", "api-results.json", "e2e-results.json", "all-results.json"]);
  mkdirSync(reportDir, { recursive: true });
  if (realpathSync(reportDir) !== path.resolve(reportDir)) throw new Error("Refusing a linked report directory.");
  mkdirSync(targetDir, { recursive: true });
  if (realpathSync(targetDir) !== path.resolve(targetDir)) throw new Error("Refusing a linked evidence directory.");
  for (const name of readdirSync(targetDir)) {
    if (!allowed.has(name) || !lstatSync(path.join(targetDir, name)).isFile() || lstatSync(path.join(targetDir, name)).nlink !== 1) {
      throw new Error("Evidence staging contains an unexpected file; no cleanup or upload performed.");
    }
  }
  let staged = 0;
  for (const name of allowed) {
    const source = path.join(reportDir, name);
    if (!existsSync(source)) continue;
    const info = lstatSync(source);
    if (!info.isFile() || info.nlink !== 1) throw new Error("Refusing a linked or non-file validation report.");
    copyFileSync(source, path.join(targetDir, name));
    staged++;
  }
  console.log(`Staged ${staged} known validation reports; raw logs and local configuration excluded.`);
}

export async function runCI({ preflightOnly = false } = {}) {
  const reportDir = path.join(rootDir, "reports");
  mkdirSync(reportDir, { recursive: true });
  const npmCli = process.env.npm_execpath ?? path.join(path.dirname(process.execPath), "node_modules/npm/bin/npm-cli.js");
  const isCI = Boolean(process.env.CI || process.env.GITHUB_ACTIONS || process.env.TF_BUILD);
  const manifest = { provider: "local", repository: "local/unconfigured", sha: "", lockfileSha256: "", node: process.version,
    npm: "", dirty: true, status: "running", checks: [] };
  const save = () => writeFileSync(path.join(reportDir, "source-identity.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  try {
    manifest.provider = isCI ? process.env.CI_PROVIDER : "local";
    manifest.sha = capture("git", ["rev-parse", "HEAD"]);
    manifest.repository = sourceRepository();
    manifest.dirty = capture("git", ["status", "--porcelain", "--untracked-files=all"]) !== "";
    manifest.npm = capture(process.execPath, [npmCli, "--version"]);
    manifest.lockfileSha256 = createHash("sha256").update(readFileSync(path.join(rootDir, "package-lock.json"))).digest("hex");
    save();
    const expectedNode = `v${readFileSync(path.join(rootDir, ".node-version"), "utf8").trim()}`;
    const expectedNpm = JSON.parse(readFileSync(path.join(rootDir, "package.json"), "utf8")).packageManager?.replace(/^npm@/, "");
    if (manifest.node !== expectedNode || manifest.npm !== expectedNpm) throw new Error(`Use pinned toolchain Node ${expectedNode} and npm ${expectedNpm}.`);
    if (isCI) {
      if (!["github", "azure"].includes(manifest.provider)) throw new Error("CI_PROVIDER must be github or azure.");
      assertSourceIdentity({ expectedSha: process.env.CI_SOURCE_SHA, actualSha: manifest.sha,
        repository: manifest.repository, expectedRepository: process.env.CI_SOURCE_REPOSITORY });
      if (manifest.dirty) throw new Error("CI requires a clean checkout including untracked files.");
    }
    if (preflightOnly) {
      manifest.status = "preflight";
      save();
      console.log("Source identity and pinned toolchain preflight passed; validation suites have not run.");
      return;
    }
    const scripts = { lint: "lint", typecheck: "typecheck", traceability: "traceability:check", contracts: "contracts:check",
      unit: "test:unit", build: "build", integration: "test:integration", api: "test:api", e2e: "test:e2e" };
    const runCheck = (name, isolatedEnv = {}) => {
      console.log(`\n[foundation] ${name}`);
      const result = spawnSync(process.execPath, [npmCli, "run", scripts[name]], {
        cwd: rootDir, stdio: "inherit", windowsHide: true,
        env: { ...process.env, ...isolatedEnv, NEXT_TELEMETRY_DISABLED: "1", ...(name === "api" || name === "e2e" ? { PLAYWRIGHT_REPORT_PREFIX: name } : {}) },
      });
      manifest.checks.push({ name, status: result.status === 0 && !result.error ? "passed" : "failed" });
      save();
      if (result.error || result.status !== 0) throw new Error(`Required ${name} check failed.`);
    };
    const integrationIndex = requiredChecks.indexOf("integration");
    for (const name of requiredChecks.slice(0, integrationIndex)) runCheck(name);
    // Import only after source preflight, dependency-dependent checks and build.
    // The pre-install preflight/import path above remains Node builtins only.
    try {
      const { withTestRun } = await import("./enquiries-local.mjs");
      await withTestRun(async (isolatedEnv) => {
        for (const name of requiredChecks.slice(integrationIndex)) runCheck(name, isolatedEnv);
      });
    } catch {
      if (!manifest.checks.some(check => check.name === "integration")) {
        manifest.checks.push({ name: "integration", status: "failed" });
        save();
      }
      throw new Error("Required isolated database validation or scoped cleanup failed.");
    }
    manifest.dirty = capture("git", ["status", "--porcelain", "--untracked-files=all"]) !== "";
    if (isCI && manifest.dirty) throw new Error("Validation changed source files; CI evidence is invalid.");
    manifest.status = "passed";
    save();
    console.log(`\nFoundation checks passed (${manifest.provider}; ${manifest.dirty ? "uncommitted working tree" : manifest.sha}).`);
  } catch (error) {
    manifest.status = "failed";
    save();
    console.error(error.message);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv[2] === "evidence" && process.argv.length === 3) {
    try { stageEvidence(); } catch (error) { console.error(error.message); process.exitCode = 1; }
  } else if (process.argv[2] === "compare") {
    try {
      if (process.argv.length !== 5) throw new Error("Usage: npm run ci:compare -- <github-manifest.json> <azure-manifest.json>");
      const errors = compareManifests(...process.argv.slice(3).map((file) => JSON.parse(readFileSync(file, "utf8"))));
      if (errors.length) throw new Error(errors.join("\n"));
      console.log("Independent GitHub and Azure validation identities and all required results match.");
    } catch (error) { console.error(error.message); process.exitCode = 1; }
  } else if (process.argv[2] === "preflight" && process.argv.length === 3) {
    await runCI({ preflightOnly: true });
  } else if (process.argv.length > 2) {
    console.error("Unknown validation command."); process.exitCode = 1;
  } else {
    await runCI();
  }
}
