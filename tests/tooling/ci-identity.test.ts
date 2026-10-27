import { describe, expect, it } from "vitest";
import { assertSourceIdentity, compareManifests } from "../../scripts/ci.mjs";

const requiredChecks = [
  "lint", "typecheck", "traceability", "contracts", "unit", "build", "integration", "api", "e2e",
];

describe("TC-P1B-SECURITY-001 mandatory integration evidence", () => {
  it("rejects parity evidence that omits database integration", () => {
    const checks = requiredChecks.filter((name) => name !== "integration").map((name) => ({ name, status: "passed" as const }));
    expect(compareManifests(manifest(), manifest({ provider: "azure", checks }))).not.toEqual([]);
  });

  it("rejects a failed database integration check even when every other check passes", () => {
    const checks = requiredChecks.map((name) => ({ name, status: name === "integration" ? "failed" as const : "passed" as const }));
    expect(compareManifests(manifest(), manifest({ provider: "azure", checks }))).not.toEqual([]);
  });
});

type Manifest = {
  provider: string;
  repository: string;
  sha: string;
  lockfileSha256: string;
  node: string;
  npm: string;
  dirty: boolean;
  status: string;
  checks: { name: string; status: string }[];
};

function manifest(overrides: Partial<Manifest> = {}): Manifest {
  return {
    provider: "github",
    repository: "stratadrive/stratadrive",
    sha: "a".repeat(40),
    lockfileSha256: "b".repeat(64),
    node: "v22.15.0",
    npm: "10.9.2",
    dirty: false,
    status: "passed",
    checks: requiredChecks.map((name) => ({ name, status: "passed" })),
    ...overrides,
  };
}

describe("TC-CI-001 immutable source identity", () => {
  it("accepts the expected repository and exact source SHA", () => {
    expect(() => assertSourceIdentity({
      expectedSha: "a".repeat(40),
      actualSha: "a".repeat(40),
      repository: "stratadrive/stratadrive",
      expectedRepository: "stratadrive/stratadrive",
    })).not.toThrow();
  });

  it.each([
    { expectedSha: "b".repeat(40) },
    { actualSha: "branch-name" },
    { expectedSha: "" },
    { repository: "another/project" },
    { repository: "" },
  ])("rejects an invalid or mismatched source identity: %j", (override) => {
    expect(() => assertSourceIdentity({
      expectedSha: "a".repeat(40),
      actualSha: "a".repeat(40),
      repository: "stratadrive/stratadrive",
      expectedRepository: "stratadrive/stratadrive",
      ...override,
    })).toThrow();
  });

  it("accepts independently successful providers validating identical inputs", () => {
    expect(compareManifests(manifest(), manifest({ provider: "azure" }))).toEqual([]);
  });

  it.each<[string, Partial<Manifest>]>([
    ["different repository", { repository: "another/project" }],
    ["different commit", { sha: "c".repeat(40) }],
    ["different lockfile", { lockfileSha256: "c".repeat(64) }],
    ["different Node version", { node: "v22.16.0" }],
    ["different npm version", { npm: "10.9.3" }],
    ["same provider", { provider: "github" }],
    ["local run substituted for a CI provider", { provider: "local" }],
    ["dirty worktree", { dirty: true }],
    ["failed overall result", { status: "failed" }],
    ["preflight-only validation", { status: "preflight", checks: [] }],
    ["no executed checks", { checks: [] }],
    ["missing required check", { checks: requiredChecks.slice(1).map((name) => ({ name, status: "passed" })) }],
    ["failed required check", { checks: requiredChecks.map((name) => ({ name, status: name === "api" ? "failed" : "passed" })) }],
    ["invalid source SHA", { sha: "main" }],
    ["invalid lockfile digest", { lockfileSha256: "short" }],
  ])("rejects %s", (_description, override) => {
    expect(
      compareManifests(manifest(), manifest({ provider: "azure", ...override })),
    ).not.toEqual([]);
  });

  it("rejects missing toolchain identity rather than comparing absent values", () => {
    expect(compareManifests(
      { ...manifest(), npm: undefined },
      { ...manifest({ provider: "azure" }), npm: undefined },
    )).not.toEqual([]);
  });
});
