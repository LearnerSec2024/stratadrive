import { describe, expect, it } from "vitest";
import { assertEnvironmentIdentity, assertTestConfiguration } from "../../scripts/enquiries-local.mjs";
import { assertVolumeMetadata } from "../../scripts/local-supabase.mjs";

const runId = "b2270214-2643-4c7a-b17a-b458552e9017";
const checksum = "a".repeat(64);
const password = "b".repeat(48);
const ownedState = { pristine: false, target: "test", runId, checksum };
const testEnvironment = { STRATA_ENQUIRY_TARGET: "test", STRATA_ENQUIRY_PASSWORD: password, STRATA_TEST_RUN_ID: runId };

describe("TC-P1B-SECURITY-001 local enquiry lifecycle identity guards", () => {
  it("permits a pristine enumerated target and the same owned test run", () => {
    expect(() => assertEnvironmentIdentity({ pristine: true }, "test", runId, checksum)).not.toThrow();
    expect(() => assertEnvironmentIdentity(ownedState, "test", runId, checksum)).not.toThrow();
    expect(() => assertTestConfiguration(testEnvironment, password)).not.toThrow();
  });

  it("rejects remote or unknown profiles before accepting even a pristine marker", () => {
    for (const target of ["production", "https://foreign.example.test", "postgres://remote.example.test/database", "unknown", ""]) {
      expect(() => assertEnvironmentIdentity({ pristine: true }, target, runId, checksum)).toThrow();
    }
  });

  it("refuses test mutation against development identity or another run", () => {
    expect(() => assertEnvironmentIdentity({ ...ownedState, target: "development" }, "test", runId, checksum)).toThrow();
    expect(() => assertEnvironmentIdentity({ ...ownedState, runId: "9bc045f2-47fc-407d-a504-069e6b396aad" }, "test", runId, checksum)).toThrow();
    expect(() => assertEnvironmentIdentity({ ...ownedState, target: "unknown" }, "test", runId, checksum)).toThrow();
  });

  it("refuses a changed migration checksum before database mutation", () => {
    expect(() => assertEnvironmentIdentity({ ...ownedState, checksum: "c".repeat(64) }, "test", runId, checksum)).toThrow();
  });

  it("rejects a missing or malformed non-pristine identity marker", () => {
    expect(() => assertEnvironmentIdentity({ pristine: false, target: "test", checksum }, "test", runId, checksum)).toThrow();
    expect(() => assertEnvironmentIdentity({ pristine: false, target: "test", runId }, "test", runId, checksum)).toThrow();
    expect(() => assertEnvironmentIdentity({ ...ownedState, checksum: "malformed-checksum" }, "test", runId, checksum)).toThrow();
  });

  it("rejects inherited development credentials and mismatched or unowned test configuration", () => {
    expect(() => assertTestConfiguration({ ...testEnvironment, STRATA_ENQUIRY_TARGET: "development" }, password)).toThrow();
    expect(() => assertTestConfiguration({ ...testEnvironment, STRATA_ENQUIRY_PASSWORD: "c".repeat(48) }, password)).toThrow();
    expect(() => assertTestConfiguration({ ...testEnvironment, STRATA_TEST_RUN_ID: "" }, password)).toThrow();
    expect(() => assertTestConfiguration({ ...testEnvironment, STRATA_ENQUIRY_PASSWORD: "" }, password)).toThrow();
    expect(() => assertTestConfiguration(testEnvironment, "")).toThrow();
    expect(() => assertTestConfiguration(testEnvironment, "not-a-generated-local-password")).toThrow();
  });
});

describe("TC-P1B-SECURITY-001 existing Docker volume ownership", () => {
  const testVolume = {
    Name: "stratadrive-test_db-data",
    Driver: "local",
    Scope: "local",
    Options: null,
    Labels: { "com.docker.compose.project": "stratadrive-test", "com.docker.compose.volume": "db-data" },
  };

  it("permits only the exact owned local volume for each approved profile and key", () => {
    expect(() => assertVolumeMetadata(testVolume, "db-data", "test")).not.toThrow();
    expect(() => assertVolumeMetadata({ ...testVolume, Options: {} }, "db-data", "test")).not.toThrow();
    for (const [target, project] of [["test", "stratadrive-test"], ["development", "stratadrive-local"]]) {
      for (const key of ["db-config", "snippets"]) {
        const volume = { ...testVolume, Name: `${project}_${key}`, Labels: { "com.docker.compose.project": project, "com.docker.compose.volume": key } };
        expect(() => assertVolumeMetadata(volume, key, target)).not.toThrow();
      }
    }
    const developmentVolume = { ...testVolume, Name: "stratadrive-local_db-data-bootstrap-v2", Labels: { "com.docker.compose.project": "stratadrive-local", "com.docker.compose.volume": "db-data" } };
    expect(() => assertVolumeMetadata(developmentVolume, "db-data")).not.toThrow();
  });

  it("refuses a development volume or misleading name when acquiring a test target", () => {
    expect(() => assertVolumeMetadata({ ...testVolume, Name: "stratadrive-local_db-data-bootstrap-v2" }, "db-data", "test")).toThrow();
    expect(() => assertVolumeMetadata({ ...testVolume, Name: "another-project_db-data" }, "db-data", "test")).toThrow();
    expect(() => assertVolumeMetadata({ ...testVolume, Labels: { ...testVolume.Labels, "com.docker.compose.project": "stratadrive-local" } }, "db-data", "test")).toThrow();
  });

  it("rejects unowned or falsely labelled existing storage", () => {
    for (const Labels of [null, undefined, {}, { "com.docker.compose.project": "stratadrive-test" }, { ...testVolume.Labels, "com.docker.compose.volume": "snippets" }]) {
      expect(() => assertVolumeMetadata({ ...testVolume, Labels }, "db-data", "test")).toThrow();
    }
  });

  it("rejects network/global drivers and local-driver bind or device options", () => {
    expect(() => assertVolumeMetadata({ ...testVolume, Driver: "nfs" }, "db-data", "test")).toThrow();
    expect(() => assertVolumeMetadata({ ...testVolume, Scope: "global" }, "db-data", "test")).toThrow();
    for (const Options of [{ device: "../unowned-storage" }, { type: "nfs" }, { o: "bind" }, { device: "" }]) {
      expect(() => assertVolumeMetadata({ ...testVolume, Options }, "db-data", "test")).toThrow();
    }
  });

  it("rejects unknown profiles and undeclared volume keys", () => {
    for (const target of ["production", "remote", ""]) expect(() => assertVolumeMetadata(testVolume, "db-data", target)).toThrow();
    for (const key of ["cache", "../db-data", ""]) expect(() => assertVolumeMetadata(testVolume, key, "test")).toThrow();
  });
});
