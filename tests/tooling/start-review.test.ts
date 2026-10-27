import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { REVIEW_URLS, assertNoDevelopmentLock, assertReviewEnvironment, dependencyFingerprint, needsInstall, runReview, waitForDocker } from "../../scripts/start-review.mjs";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const localEndpoint = "npipe:////./pipe/dockerDesktopLinuxEngine";
const markerName = ".stratadrive-review-dependencies.sha256";
afterEach(() => { vi.unstubAllEnvs(); });

function fixture(run: (directory: string) => void) {
  const fixtureRoot = path.join(projectRoot, "reports/start-review/tests/fixtures");
  mkdirSync(fixtureRoot, { recursive: true });
  const resolvedRoot = realpathSync(fixtureRoot);
  const directory = realpathSync(mkdtempSync(path.join(resolvedRoot, "startup-")));
  try {
    writeFileSync(path.join(directory, "package.json"), '{"name":"synthetic-startup-fixture"}');
    writeFileSync(path.join(directory, "package-lock.json"), '{"lockfileVersion":3}');
    run(directory);
  } finally {
    if (path.dirname(directory) !== resolvedRoot || !path.basename(directory).startsWith("startup-")) throw new Error("Refusing cleanup outside the assigned fixture directory.");
    rmSync(directory, { recursive: true, force: true });
  }
}

function installedFixture(directory: string) {
  mkdirSync(path.join(directory, "node_modules/next/dist/bin"), { recursive: true });
  writeFileSync(path.join(directory, "node_modules/next/dist/bin/next"), "synthetic fixture only");
  writeFileSync(path.join(directory, "node_modules", markerName), dependencyFingerprint(directory) + "\n");
}

function dockerHarness() {
  vi.stubEnv("DOCKER_HOST", "");
  vi.stubEnv("DOCKER_CONTEXT", "");
  let elapsed = 0;
  return {
    inspectEndpoint: vi.fn(async () => localEndpoint),
    engineType: vi.fn(async (): Promise<string> => "linux"),
    openDesktop: vi.fn(async () => undefined),
    now: () => elapsed,
    sleep: vi.fn(async (ms: number) => { elapsed += ms; }),
    timeoutMs: 6000,
  };
}

function reviewHarness() {
  const trace: string[] = [];
  const application = Object.freeze({ syntheticOwnedProcess: true });
  const stage = (name: string) => vi.fn(async () => { trace.push(name); });
  const runtime = {
    checkPrerequisites: stage("checkPrerequisites"), assertPortFree: stage("assertPortFree"),
    installDependencies: stage("installDependencies"), ensureDocker: stage("ensureDocker"),
    prepare: stage("prepare"), checkDatabase: stage("checkDatabase"),
    startApplication: vi.fn(async () => { trace.push("startApplication"); return application; }),
    waitForPages: vi.fn(async () => { trace.push("waitForPages"); }),
    openReviewWindows: stage("openReviewWindows"),
    waitForApplication: vi.fn(async () => { trace.push("waitForApplication"); return 7; }),
    stopApplication: vi.fn(async () => { trace.push("stopApplication"); }),
  };
  return { runtime, application, trace };
}

describe("TC-LOCAL-001 one-command startup environment boundary", () => {
  it("accepts pinned Windows development prerequisites", () => {
    expect(() => assertReviewEnvironment({}, "win32", "v22.15.0", "10.9.2")).not.toThrow();
    expect(() => assertReviewEnvironment({ STRATA_ENQUIRY_TARGET: "development" }, "win32", "v22.15.0", "10.9.2")).not.toThrow();
  });
  it.each([
    ["linux", "v22.15.0", "10.9.2"], ["darwin", "v22.15.0", "10.9.2"],
    ["win32", "v22.14.0", "10.9.2"], ["win32", "v23.0.0", "10.9.2"], ["win32", "v22.15.0", "11.0.0"],
  ])("refuses unsupported prerequisites %s / %s / %s", (platform, node, npm) => {
    expect(() => assertReviewEnvironment({}, platform, node, npm)).toThrow();
  });
  it.each([
    { DOCKER_HOST: "tcp://127.0.0.1:2375" }, { DOCKER_HOST: "ssh://synthetic@example.invalid" },
    { DOCKER_CONTEXT: "desktop-linux" }, { STRATA_TEST_RUN_ID: "synthetic-test-run" },
    { STRATA_ENQUIRY_TARGET: "test" }, { STRATA_ENQUIRY_TARGET: "production" }, { STRATA_ENQUIRY_TARGET: "unknown" },
  ])("refuses endpoint overrides and isolated/unknown targets: %j", env => {
    expect(() => assertReviewEnvironment(env, "win32", "v22.15.0", "10.9.2")).toThrow();
  });
  it("publishes only exact loopback review destinations", () => {
    expect(REVIEW_URLS).toEqual(["http://127.0.0.1:3000/", "http://127.0.0.1:3000/book", "http://127.0.0.1:3000/enquire", "http://127.0.0.1:54323/project/default/editor"]);
    expect(Object.isFrozen(REVIEW_URLS)).toBe(true);
  });
});

describe("TC-LOCAL-001 dependency replacement guards", () => {
  it("requires first installation and retains an unchanged recorded installation", () => {
    fixture(directory => { expect(needsInstall(directory)).toBe(true); installedFixture(directory); expect(needsInstall(directory)).toBe(false); });
  });
  it.each(["package.json", "package-lock.json"])("requires installation after %s changes", filename => {
    fixture(directory => { installedFixture(directory); writeFileSync(path.join(directory, filename), '{"changed":"synthetic"}'); expect(needsInstall(directory)).toBe(true); });
  });
  it.each(["node_modules/next/dist/bin/next", `node_modules/${markerName}`])("requires installation when %s is missing", filename => {
    fixture(directory => { installedFixture(directory); unlinkSync(path.join(directory, filename)); expect(needsInstall(directory)).toBe(true); });
  });
  it("permits an unlocked checkout but refuses a development lock without deleting it", () => {
    fixture(directory => {
      expect(() => assertNoDevelopmentLock(directory)).not.toThrow();
      mkdirSync(path.join(directory, ".next/dev"), { recursive: true });
      writeFileSync(path.join(directory, ".next/dev/lock"), "synthetic-lock");
      expect(() => assertNoDevelopmentLock(directory)).toThrow(/development lock/);
      expect(() => assertNoDevelopmentLock(directory)).toThrow(/development lock/);
    });
  });
});

describe("TC-LOCAL-001 bounded local Docker readiness", () => {
  it("uses a ready local Linux engine without relaunching Desktop", async () => {
    const harness = dockerHarness(); await waitForDocker(harness);
    expect(harness.engineType).toHaveBeenCalledTimes(1); expect(harness.openDesktop).not.toHaveBeenCalled(); expect(harness.sleep).not.toHaveBeenCalled();
  });
  it("opens Desktop once and waits through startup failures until Linux is ready", async () => {
    const harness = dockerHarness();
    harness.engineType.mockRejectedValueOnce(new Error("synthetic unavailable")).mockRejectedValueOnce(new Error("synthetic starting"));
    await waitForDocker(harness);
    expect(harness.openDesktop).toHaveBeenCalledTimes(1); expect(harness.engineType).toHaveBeenCalledTimes(3); expect(harness.sleep).toHaveBeenCalledTimes(2);
  });
  it.each(["tcp://127.0.0.1:2375", "ssh://synthetic@example.invalid", "npipe:////remote/pipe/docker_engine"])("refuses %s before daemon access or GUI launch", async endpoint => {
    const harness = dockerHarness(); harness.inspectEndpoint.mockResolvedValue(endpoint);
    await expect(waitForDocker(harness)).rejects.toThrow(/local Docker socket/);
    expect(harness.engineType).not.toHaveBeenCalled(); expect(harness.openDesktop).not.toHaveBeenCalled();
  });
  it("revalidates context before the next daemon call while waiting", async () => {
    const harness = dockerHarness();
    harness.inspectEndpoint.mockResolvedValueOnce(localEndpoint).mockResolvedValueOnce(localEndpoint).mockResolvedValue("ssh://synthetic@example.invalid");
    harness.engineType.mockRejectedValue(new Error("synthetic unavailable"));
    await expect(waitForDocker(harness)).rejects.toThrow(/local Docker socket/); expect(harness.engineType).toHaveBeenCalledTimes(1);
  });
  it("refuses a Windows engine without changing Docker settings", async () => {
    const harness = dockerHarness(); harness.engineType.mockResolvedValue("windows");
    await expect(waitForDocker(harness)).rejects.toThrow(/Linux containers/);
    expect(harness.openDesktop).not.toHaveBeenCalled(); expect(harness.sleep).not.toHaveBeenCalled();
  });
  it("fails after a bounded deadline and never repeatedly launches Desktop", async () => {
    const harness = dockerHarness(); harness.engineType.mockRejectedValue(new Error("synthetic unavailable"));
    await expect(waitForDocker(harness)).rejects.toThrow(/not ready/);
    expect(harness.engineType).toHaveBeenCalledTimes(3); expect(harness.openDesktop).toHaveBeenCalledTimes(1); expect(harness.sleep).toHaveBeenCalledTimes(3);
  });
  it("stops immediately if Desktop launch fails", async () => {
    const harness = dockerHarness(); harness.engineType.mockRejectedValue(new Error("synthetic unavailable")); harness.openDesktop.mockRejectedValue(new Error("synthetic missing Desktop"));
    await expect(waitForDocker(harness)).rejects.toThrow("synthetic missing Desktop"); expect(harness.engineType).toHaveBeenCalledTimes(1); expect(harness.sleep).not.toHaveBeenCalled();
  });
});

describe("TC-LOCAL-001 startup sequencing and owned application cleanup", () => {
  const prerequisites = ["checkPrerequisites", "assertPortFree", "installDependencies", "ensureDocker", "prepare", "checkDatabase"] as const;
  it("checks services before starting, opens pages after readiness, and propagates the application exit code", async () => {
    const { runtime, application, trace } = reviewHarness(); await expect(runReview(runtime)).resolves.toBe(7);
    expect(trace).toEqual([...prerequisites, "startApplication", "waitForPages", "openReviewWindows", "waitForApplication", "stopApplication"]);
    expect(runtime.waitForPages).toHaveBeenCalledWith(application); expect(runtime.waitForApplication).toHaveBeenCalledWith(application); expect(runtime.stopApplication).toHaveBeenCalledExactlyOnceWith(application);
  });
  it.each(prerequisites)("halts when %s fails without starting or stopping any application", async failedStage => {
    const { runtime, trace } = reviewHarness(); runtime[failedStage].mockRejectedValueOnce(new Error(`synthetic ${failedStage} refusal`));
    await expect(runReview(runtime)).rejects.toThrow(`synthetic ${failedStage} refusal`);
    expect(trace).toEqual(prerequisites.slice(0, prerequisites.indexOf(failedStage)));
    expect(runtime.startApplication).not.toHaveBeenCalled(); expect(runtime.openReviewWindows).not.toHaveBeenCalled(); expect(runtime.stopApplication).not.toHaveBeenCalled();
  });
  it("does not invent an owned process when application creation fails", async () => {
    const { runtime } = reviewHarness(); runtime.startApplication.mockRejectedValueOnce(new Error("synthetic spawn failure"));
    await expect(runReview(runtime)).rejects.toThrow("synthetic spawn failure");
    expect(runtime.waitForPages).not.toHaveBeenCalled(); expect(runtime.openReviewWindows).not.toHaveBeenCalled(); expect(runtime.stopApplication).not.toHaveBeenCalled();
  });
  it.each(["waitForPages", "openReviewWindows", "waitForApplication"] as const)("stops exactly the owned application when %s fails", async failedStage => {
    const { runtime, application } = reviewHarness(); runtime[failedStage].mockRejectedValueOnce(new Error(`synthetic ${failedStage} failure`));
    await expect(runReview(runtime)).rejects.toThrow(`synthetic ${failedStage} failure`);
    expect(runtime.stopApplication).toHaveBeenCalledExactlyOnceWith(application);
    if (failedStage === "waitForPages") expect(runtime.openReviewWindows).not.toHaveBeenCalled();
  });
});
