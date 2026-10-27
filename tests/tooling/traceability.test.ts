import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { validateTraceability as validateTraceabilityImplementation, validateOperationLinks } from "../../scripts/check-traceability.mjs";

describe("TC-P1B-CONTRACT-001 reciprocal operation requirement links", () => {
  const catalog = { requirements: [{ id: "TR-X-001", api: { operations: ["createEnquiry"] } }] };
  const operation = { operationId: "createEnquiry", "x-requirement-ids": ["TR-X-001"] };
  const contract = { paths: { "/api/v1/enquiries": { post: operation } } };

  it("accepts reciprocal links for the approved operation", () => {
    expect(validateOperationLinks(catalog, contract)).toEqual([]);
  });

  it("rejects duplicate operation IDs on distinct paths", () => {
    expect(validateOperationLinks(catalog, { paths: { ...contract.paths, "/api/v1/duplicate": { post: operation } } })).not.toEqual([]);
  });

  it("rejects missing reverse links and unknown requirement IDs", () => {
    expect(validateOperationLinks(catalog, { paths: { "/api/v1/enquiries": { post: { ...operation, "x-requirement-ids": [] } } } })).not.toEqual([]);
    expect(validateOperationLinks(catalog, { paths: { "/api/v1/enquiries": { post: { ...operation, "x-requirement-ids": ["TR-UNKNOWN-001"] } } } })).not.toEqual([]);
  });

  it("rejects operation claims absent from the requirement's own operation list", () => {
    expect(validateOperationLinks({ requirements: [{ id: "TR-X-001", api: { operations: [] } }] }, contract)).not.toEqual([]);
  });

  it("rejects duplicate requirement links", () => {
    expect(validateOperationLinks(catalog, { paths: { "/api/v1/enquiries": { post: { ...operation, "x-requirement-ids": ["TR-X-001", "TR-X-001"] } } } })).not.toEqual([]);
  });
});

type Requirement = {
  id: string;
  kind: string;
  title: string;
  phase: number;
  status: string;
  parents: string[];
  verification: string[];
  api: { applicability: string; reason?: string; operations?: string[] };
};

type TestCase = {
  id: string;
  title: string;
  requirements: string[];
  status: string;
  verification: string;
  file?: string;
  procedure?: string;
};

type Catalogue = {
  version: number;
  scope: string;
  activePhase: number;
  requirements: Requirement[];
  testCases: TestCase[];
};

// The JavaScript implementation's default [] otherwise infers never[] here.
// Describe its existing runtime input contract without changing the test cases.
const validateTraceability = validateTraceabilityImplementation as (
  value: Catalogue,
  options: { rootDir: string; operationIds?: string[] },
) => string[];

function catalogue(): Catalogue {
  return {
    version: 1,
    scope: "iteration-0a",
    activePhase: 0,
    requirements: [
      {
        id: "BR-GOV-001",
        kind: "business",
        title: "Requirements are traceable",
        phase: 0,
        status: "approved",
        parents: [],
        verification: [],
        api: { applicability: "none", reason: "Foundation governance only." },
      },
      {
        id: "TR-GOV-001",
        kind: "technical",
        title: "Validate the requirement catalogue",
        phase: 0,
        status: "approved",
        parents: ["BR-GOV-001"],
        verification: ["TC-TRACE-001"],
        api: { applicability: "none", reason: "No application API exists." },
      },
    ],
    testCases: [
      {
        id: "TC-TRACE-001",
        title: "Catalogue validation",
        requirements: ["TR-GOV-001"],
        status: "implemented",
        verification: "automated",
        file: "tests/tooling/traceability.test.ts",
      },
    ],
  };
}

describe("TC-TRACE-001 requirement traceability validation", () => {
  let rootDir: string;

  beforeEach(() => {
    rootDir = mkdtempSync(join(tmpdir(), "stratadrive-trace-"));
    mkdirSync(join(rootDir, "tests", "tooling"), { recursive: true });
    writeFileSync(
      join(rootDir, "tests", "tooling", "traceability.test.ts"),
      'test("TC-TRACE-001 catalogue validation", () => {});\n',
    );
  });

  afterEach(() => {
    const target = resolve(rootDir);
    const temporaryRoot = resolve(tmpdir());
    const withinTemporaryRoot = relative(temporaryRoot, target);
    if (
      !withinTemporaryRoot ||
      withinTemporaryRoot.startsWith(`..${sep}`) ||
      isAbsolute(withinTemporaryRoot) ||
      !withinTemporaryRoot.startsWith("stratadrive-trace-")
    ) {
      throw new Error("Refusing cleanup outside the traceability fixture root.");
    }
    rmSync(target, { recursive: true, force: true });
  });

  it("accepts an approved foundation requirement with a real test file", () => {
    expect(validateTraceability(catalogue(), { rootDir })).toEqual([]);
  });

  it.each<[string, (value: Catalogue) => void]>([
    ["invalid requirement ID", (value) => { value.requirements[1].id = "bad id"; }],
    ["invalid test-case ID", (value) => { value.testCases[0].id = "test1"; }],
    ["requirement kind contradicting its ID", (value) => { value.requirements[1].kind = "nonfunctional"; }],
    ["duplicate requirement IDs", (value) => { value.requirements.push({ ...value.requirements[1] }); }],
    ["duplicate test-case IDs", (value) => { value.testCases.push({ ...value.testCases[0] }); }],
    ["unknown business parent", (value) => { value.requirements[1].parents = ["BR-MISSING-001"]; }],
    ["technical parent instead of a business parent", (value) => { value.requirements[1].parents = ["TR-GOV-001"]; }],
    ["business requirement with a parent", (value) => { value.requirements[0].parents = ["BR-GOV-001"]; }],
    ["unknown verification case", (value) => { value.requirements[1].verification = ["TC-MISSING-001"]; }],
    ["test case linked to an unknown requirement", (value) => { value.testCases[0].requirements = ["TR-MISSING-001"]; }],
    ["missing reciprocal test link", (value) => { value.testCases[0].requirements = []; }],
    ["approved phase-zero requirement without coverage", (value) => { value.requirements[1].verification = []; value.testCases = []; }],
    ["planned test for an active requirement", (value) => { value.testCases[0].status = "planned"; }],
    ["missing automated test file", (value) => { value.testCases[0].file = "tests/missing.test.ts"; }],
    ["parent path escape", (value) => { value.testCases[0].file = "../outside.test.ts"; }],
    ["absolute test path", (value) => { value.testCases[0].file = resolve(rootDir, "tests", "tooling", "traceability.test.ts"); }],
    ["unjustified API non-applicability", (value) => { value.requirements[1].api.reason = ""; }],
    ["missing operation IDs", (value) => { value.requirements[1].api = { applicability: "operations", operations: [] }; }],
    ["unknown operation ID", (value) => { value.requirements[1].api = { applicability: "operations", operations: ["missingOperation"] }; }],
    ["unsupported verified claim without execution evidence", (value) => { value.requirements[1].status = "verified"; }],
    ["invalid delivery phase", (value) => { value.requirements[1].phase = 8; }],
    ["invalid active phase", (value) => { value.activePhase = 8; }],
    ["scope and active phase mismatch", (value) => { value.scope = "iteration-1a"; }],
    ["invalid scope identifier", (value) => { value.scope = "phase-one"; }],
  ])("rejects %s", (_description, mutate) => {
    const value = catalogue();
    mutate(value);
    expect(validateTraceability(value, { rootDir })).not.toEqual([]);
  });

  it("rejects a test file that omits its declared test-case ID", () => {
    writeFileSync(
      join(rootDir, "tests", "tooling", "traceability.test.ts"),
      'test("different test", () => {});\n',
    );
    expect(validateTraceability(catalogue(), { rootDir })).not.toEqual([]);
  });

  it("accepts a known OpenAPI operation link", () => {
    const value = catalogue();
    value.requirements[1].api = {
      applicability: "operations",
      operations: ["createEnquiry"],
    };
    expect(
      validateTraceability(value, { rootDir, operationIds: ["createEnquiry"] }),
    ).toEqual([]);
  });

  it("accepts a documented manual verification procedure", () => {
    const value = catalogue();
    value.testCases[0].verification = "manual";
    value.testCases[0].procedure = "Review the immutable test report at its SHA.";
    delete value.testCases[0].file;
    expect(validateTraceability(value, { rootDir })).toEqual([]);
  });

  it("rejects manual verification without a procedure", () => {
    const value = catalogue();
    value.testCases[0].verification = "manual";
    delete value.testCases[0].file;
    expect(validateTraceability(value, { rootDir })).not.toEqual([]);
  });

  it("allows explicitly proposed future work without pretending it is tested", () => {
    const value = catalogue();
    value.requirements.push({
      ...value.requirements[1],
      id: "TR-CRM-001",
      title: "Deferred CRM workflow",
      phase: 2,
      status: "proposed",
      verification: [],
    });
    expect(validateTraceability(value, { rootDir })).toEqual([]);
  });

  it("requires coverage for later work claimed implemented", () => {
    const value = catalogue();
    value.requirements.push({
      ...value.requirements[1],
      id: "TR-CRM-001",
      title: "Implemented CRM workflow",
      phase: 2,
      status: "implemented",
      verification: [],
    });
    expect(validateTraceability(value, { rootDir })).not.toEqual([]);
  });

  it("accepts foundation coverage while Phase 1 is active", () => {
    const value = catalogue();
    value.scope = "iteration-1a";
    value.activePhase = 1;
    expect(validateTraceability(value, { rootDir })).toEqual([]);
  });

  it("rejects an approved Phase 1 requirement without verification", () => {
    const value = catalogue();
    value.scope = "iteration-1a";
    value.activePhase = 1;
    value.requirements.push({
      ...value.requirements[1],
      id: "TR-P1A-001",
      title: "Approved public website",
      phase: 1,
      status: "approved",
      verification: [],
    });
    expect(validateTraceability(value, { rootDir })).not.toEqual([]);
  });

  it("does not let Phase 1 scope bypass uncovered foundation requirements", () => {
    const value = catalogue();
    value.scope = "iteration-1a";
    value.activePhase = 1;
    value.requirements[1].verification = [];
    expect(validateTraceability(value, { rootDir })).not.toEqual([]);
  });

  it("allows proposed Phase 2 work while Phase 1 is active", () => {
    const value = catalogue();
    value.scope = "iteration-1a";
    value.activePhase = 1;
    value.requirements.push({
      ...value.requirements[1],
      id: "TR-CRM-001",
      title: "Deferred CRM workflow",
      phase: 2,
      status: "proposed",
      verification: [],
    });
    expect(validateTraceability(value, { rootDir })).toEqual([]);
  });

  it("rejects future implemented work even when its test links are complete", () => {
    const value = catalogue();
    value.requirements.push({
      ...value.requirements[1],
      id: "TR-P1A-001",
      title: "Out-of-scope implemented public website",
      phase: 1,
      status: "implemented",
    });
    value.testCases[0].requirements.push("TR-P1A-001");
    expect(validateTraceability(value, { rootDir })).not.toEqual([]);
  });

  it("rejects approved work beyond the active phase", () => {
    const value = catalogue();
    value.requirements.push({
      ...value.requirements[1],
      id: "TR-P1A-001",
      title: "Unactivated approved public website",
      phase: 1,
      status: "approved",
    });
    value.testCases[0].requirements.push("TR-P1A-001");
    expect(validateTraceability(value, { rootDir })).not.toEqual([]);
  });
});
