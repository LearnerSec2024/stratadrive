import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertComposeModel, assertLocalDockerEndpoint } from "../../scripts/local-supabase.mjs";

const rootDir = fileURLToPath(new URL("../../", import.meta.url));

function localModel() {
  return {
    name: "stratadrive-local",
    services: {
      db: {
        image: "supabase/postgres:17.6.1.136",
        restart: "no",
        ports: [{ target: 5432, published: "54322", host_ip: "127.0.0.1", protocol: "tcp" }],
        volumes: [{ type: "volume", source: "db-data", target: "/var/lib/postgresql/data" }],
        networks: { default: null },
      },
      rest: { image: "postgrest/postgrest:v14.18", restart: "no", networks: { default: null } },
      meta: { image: "supabase/postgres-meta:v0.100.0", restart: "no", networks: { default: null } },
      studio: {
        image: "supabase/studio:2026.10.12-sha-3699278",
        restart: "no",
        ports: [{ target: 3000, published: "54323", host_ip: "127.0.0.1", protocol: "tcp" }],
        networks: { default: null },
      },
      "api-gw": {
        image: "envoyproxy/envoy:v1.39.1",
        restart: "no",
        ports: [{ target: 8000, published: "54321", host_ip: "127.0.0.1", protocol: "tcp" }],
        networks: { default: null },
      },
    },
    volumes: { "db-data": { name: "stratadrive-local_db-data" } },
    networks: { default: { name: "stratadrive-local_default", driver: "bridge" } },
  };
}

function addRolesBind(model: ReturnType<typeof localModel>, source: string, readOnly = true) {
  Object.assign(model.services.db, {
    volumes: [...model.services.db.volumes, {
      type: "bind",
      source,
      target: "/docker-entrypoint-initdb.d/init-scripts/99-roles.sql",
      read_only: readOnly,
    }],
  });
  return model;
}

function temporaryFixture(run: (directory: string) => void) {
  const temporaryRoot = realpathSync(tmpdir());
  const directory = realpathSync(mkdtempSync(path.join(temporaryRoot, "stratadrive-compose-test-")));
  try {
    run(directory);
  } finally {
    // Delete only this test's exact immediate child of the resolved temporary root.
    if (path.dirname(directory) !== temporaryRoot || !path.basename(directory).startsWith("stratadrive-compose-test-")) {
      throw new Error("Refusing cleanup outside the test fixture directory.");
    }
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("TC-P1B-SETUP-TARGET-001 local Docker engine boundary", () => {
  it.each([
    "npipe:////./pipe/dockerDesktopLinuxEngine",
    "npipe:////./pipe/docker_engine",
    "unix:///var/run/docker.sock",
    "unix:///run/user/1000/docker.sock",
  ])("accepts the approved local endpoint %s", (endpoint) => {
    expect(() => assertLocalDockerEndpoint(endpoint, {})).not.toThrow();
  });

  it.each([
    "tcp://127.0.0.1:2375",
    "tcp://192.168.1.10:2376",
    "ssh://developer@example.invalid",
    "https://docker.example.invalid",
    "npipe:////remote-machine/pipe/docker_engine",
    "npipe:////./pipe/unreviewed-engine",
    "unix://relative/docker.sock",
    "unix:///tmp/docker.sock",
    "unix:///run/user/not-a-user/docker.sock",
    "unix:///var/run/docker.sock?remote=true",
    " npipe:////./pipe/docker_engine",
    "",
  ])("rejects the unapproved endpoint %s", (endpoint) => {
    expect(() => assertLocalDockerEndpoint(endpoint, {})).toThrow();
  });

  it.each([
    { DOCKER_HOST: "tcp://remote.example.invalid:2375" },
    { DOCKER_HOST: "npipe:////./pipe/docker_engine" },
    { DOCKER_CONTEXT: "production" },
    { DOCKER_CONTEXT: "desktop-linux" },
  ])("rejects an endpoint override even when the inspected context is local: %j", (env) => {
    expect(() => assertLocalDockerEndpoint("npipe:////./pipe/dockerDesktopLinuxEngine", env)).toThrow();
  });
});

describe("TC-P1B-SETUP-ISOLATION-001 rendered Compose isolation", () => {
  it("accepts the explicit local project, image pins, ports and database volume", () => {
    expect(() => assertComposeModel(localModel(), rootDir)).not.toThrow();
  });

  it.each(["0.0.0.0", "::", "::1", "192.168.1.10", "localhost", ""])(
    "rejects a published database binding to %j",
    (hostIp) => {
      const model = localModel();
      model.services.db.ports[0].host_ip = hostIp;
      expect(() => assertComposeModel(model, rootDir)).toThrow();
    },
  );

  it("rejects a published port without an explicit host IP", () => {
    const model = localModel();
    delete (model.services.db.ports[0] as { host_ip?: string }).host_ip;
    expect(() => assertComposeModel(model, rootDir)).toThrow();
  });

  it("rejects a wildcard port left behind by an ordinary Compose override merge", () => {
    const model = localModel();
    model.services.studio.ports.push({ target: 3000, published: "54323", host_ip: "0.0.0.0", protocol: "tcp" });
    expect(() => assertComposeModel(model, rootDir)).toThrow();
  });

  it("rejects additional host-published services even when their binding is loopback", () => {
    const model = localModel();
    Object.assign(model.services.meta, { ports: [{ target: 8080, published: "54324", host_ip: "127.0.0.1", protocol: "tcp" }] });
    expect(() => assertComposeModel(model, rootDir)).toThrow();
  });

  it("rejects a missing expected Studio port", () => {
    const model = localModel();
    model.services.studio.ports = [];
    expect(() => assertComposeModel(model, rootDir)).toThrow();
  });

  it.each([
    ["published", "3000"],
    ["target", 5433],
    ["protocol", "udp"],
  ])("rejects altered database port %s", (field, value) => {
    const model = localModel();
    Object.assign(model.services.db.ports[0], { [field]: value });
    expect(() => assertComposeModel(model, rootDir)).toThrow();
  });

  it("rejects an unexpected service from the full upstream stack", () => {
    const model = localModel();
    Object.assign(model.services, { auth: { image: "supabase/gotrue:v2.197.0" } });
    expect(() => assertComposeModel(model, rootDir)).toThrow();
  });

  it("rejects omission of a required service", () => {
    const model = localModel();
    delete (model.services as Partial<typeof model.services>).rest;
    expect(() => assertComposeModel(model, rootDir)).toThrow();
  });

  it.each(["supabase/postgres:latest", "postgres:17", "unreviewed.invalid/postgres:17.6.1.136"])(
    "rejects an unapproved database image %s", (image) => {
      const model = localModel();
      model.services.db.image = image;
      expect(() => assertComposeModel(model, rootDir)).toThrow();
    },
  );

  it.each([
    { privileged: true },
    { network_mode: "host" },
    { pid: "host" },
    { ipc: "host" },
  ])("rejects host/privileged service access %j", (unsafe) => {
    const model = localModel();
    Object.assign(model.services.db, unsafe);
    expect(() => assertComposeModel(model, rootDir)).toThrow();
  });

  it("rejects a globally named container that could collide with another Supabase installation", () => {
    const model = localModel();
    Object.assign(model.services.db, { container_name: "supabase-db" });
    expect(() => assertComposeModel(model, rootDir)).toThrow();
  });

  it("accepts the real allowlisted read-only bootstrap file", () => {
    const source = path.resolve(rootDir, "infra/local-supabase/upstream/volumes/db/roles.sql");
    expect(() => assertComposeModel(addRolesBind(localModel(), source), rootDir)).not.toThrow();
  });

  it("rejects a writable version of the otherwise valid bootstrap bind", () => {
    const source = path.resolve(rootDir, "infra/local-supabase/upstream/volumes/db/roles.sql");
    expect(() => assertComposeModel(addRolesBind(localModel(), source, false), rootDir)).toThrow();
  });

  it("rejects an approved directory path redirected outside the workspace through a junction", () => {
    temporaryFixture((directory) => {
      const workspace = path.join(directory, "workspace");
      const vendor = path.join(workspace, "infra/local-supabase/upstream");
      const outside = path.join(directory, "outside");
      mkdirSync(path.dirname(vendor), { recursive: true });
      mkdirSync(path.join(outside, "volumes/db"), { recursive: true });
      writeFileSync(path.join(outside, "volumes/db/roles.sql"), "-- synthetic fixture only\n");
      symlinkSync(outside, vendor, "junction");
      const source = path.join(vendor, "volumes/db/roles.sql");
      expect(() => assertComposeModel(addRolesBind(localModel(), source), workspace)).toThrow();
    });
  });

  it("accepts a regular bootstrap fixture without a redirected path", () => {
    temporaryFixture((directory) => {
      const source = path.join(directory, "infra/local-supabase/upstream/volumes/db/roles.sql");
      mkdirSync(path.dirname(source), { recursive: true });
      writeFileSync(source, "-- synthetic fixture only\n");
      expect(() => assertComposeModel(addRolesBind(localModel(), source), directory)).not.toThrow();
    });
  });

  it.each([
    { type: "bind", source: "/var/run/docker.sock", target: "/var/run/docker.sock", read_only: true },
    { type: "bind", source: "//./pipe/docker_engine", target: "/var/run/docker.sock", read_only: true },
    { type: "bind", source: path.resolve(rootDir, "..", "outside.sql"), target: "/docker-entrypoint-initdb.d/outside.sql", read_only: true },
    { type: "bind", source: path.resolve(rootDir, "infra/local-supabase/upstream", "../../../../outside.sql"), target: "/docker-entrypoint-initdb.d/outside.sql", read_only: true },
  ])("rejects an unsafe host bind %j", (mount) => {
    const model = localModel();
    Object.assign(model.services.meta, { volumes: [mount] });
    expect(() => assertComposeModel(model, rootDir)).toThrow();
  });

  it("rejects a named database volume that refers outside this project's namespace", () => {
    const model = localModel();
    model.volumes["db-data"].name = "another-project_db-data";
    expect(() => assertComposeModel(model, rootDir)).toThrow();
  });

  it("rejects a missing named database data mount", () => {
    const model = localModel();
    model.services.db.volumes = [];
    expect(() => assertComposeModel(model, rootDir)).toThrow();
  });

  it("rejects an external database volume", () => {
    const model = localModel();
    Object.assign(model.volumes["db-data"], { external: true });
    expect(() => assertComposeModel(model, rootDir)).toThrow();
  });

  it("rejects an external network", () => {
    const model = localModel();
    Object.assign(model.networks.default, { external: true });
    expect(() => assertComposeModel(model, rootDir)).toThrow();
  });

  it("rejects a project name that could start or stop another stack", () => {
    const model = localModel();
    model.name = "another-project";
    expect(() => assertComposeModel(model, rootDir)).toThrow();
  });
});
