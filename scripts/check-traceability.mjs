import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { parse } from "yaml";

const schema = JSON.parse(
  readFileSync(new URL("../schemas/requirements.schema.json", import.meta.url), "utf8"),
);
const validateStructure = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
const active = (requirement, activePhase) =>
  requirement.phase <= activePhase && ["approved", "implemented"].includes(requirement.status);

function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

/** Validate catalogue links and source references; execution evidence remains separate. */
export function validateTraceability(catalog, { rootDir = process.cwd(), operationIds = [] } = {}) {
  if (!validateStructure(catalog)) {
    return (validateStructure.errors ?? []).map(
      (error) => `Catalogue schema ${error.instancePath || "/"}: ${error.message}`,
    );
  }

  const errors = [];
  if (new Set(operationIds).size !== operationIds.length) errors.push("Duplicate operation IDs are forbidden.");
  const requirements = new Map();
  const testCases = new Map();
  const operations = new Set(operationIds);
  const root = path.resolve(rootDir);
  const scopePhase = Number(/^iteration-([0-7])[a-z]$/.exec(catalog.scope)?.[1]);
  if (scopePhase !== catalog.activePhase) {
    errors.push("Catalogue scope must match its explicit activePhase.");
  }

  for (const requirement of catalog.requirements) {
    if (requirements.has(requirement.id)) errors.push(`Duplicate requirement ID ${requirement.id}.`);
    requirements.set(requirement.id, requirement);
    if (["approved", "implemented"].includes(requirement.status) && requirement.phase > catalog.activePhase) {
      errors.push(`${requirement.id}: approved or implemented work is outside activePhase; future work must remain proposed.`);
    }
    const expectedPrefix = { business: "BR-", technical: "TR-", nonfunctional: "NFR-" }[requirement.kind];
    if (!requirement.id.startsWith(expectedPrefix)) errors.push(`${requirement.id}: kind must match ID prefix.`);
    if (requirement.status === "verified") {
      errors.push(`${requirement.id}: verified status requires execution evidence; catalogue v1 does not store evidence.`);
    }
  }

  for (const testCase of catalog.testCases) {
    if (testCases.has(testCase.id)) errors.push(`Duplicate test case ID ${testCase.id}.`);
    testCases.set(testCase.id, testCase);
  }

  for (const requirement of catalog.requirements) {
    if (requirement.kind === "business" && requirement.parents.length) {
      errors.push(`${requirement.id}: business requirements cannot have technical parents.`);
    }
    if (requirement.kind !== "business" && !requirement.parents.length) {
      errors.push(`${requirement.id}: technical/nonfunctional requirement needs a business parent.`);
    }
    for (const parentId of requirement.parents) {
      if (requirements.get(parentId)?.kind !== "business") {
        errors.push(`${requirement.id}: parent ${parentId} must reference an existing business requirement.`);
      }
    }

    for (const operationId of requirement.api.operations ?? []) {
      if (!operations.has(operationId)) errors.push(`${requirement.id}: unknown API operation ${operationId}.`);
    }

    for (const testId of requirement.verification) {
      const testCase = testCases.get(testId);
      if (!testCase) {
        errors.push(`${requirement.id}: missing test case ${testId}.`);
      } else if (requirement.kind !== "business" && !testCase.requirements.includes(requirement.id)) {
        errors.push(`${requirement.id}: test case ${testId} must link back to the requirement.`);
      } else if (
        requirement.kind === "business" &&
        !testCase.requirements.some((id) => requirements.get(id)?.parents.includes(requirement.id))
      ) {
        errors.push(`${requirement.id}: test case ${testId} does not cover a technical child.`);
      }
    }

    if (active(requirement, catalog.activePhase)) {
      if (requirement.kind === "business") {
        const children = catalog.requirements.filter((item) => item.parents.includes(requirement.id) && active(item, catalog.activePhase));
        if (!children.length) errors.push(`${requirement.id}: approved business requirement needs an active technical child.`);
      } else if (!requirement.verification.length) {
        errors.push(`${requirement.id}: active requirement needs verification test cases.`);
      }
      if (requirement.kind !== "business") {
        for (const testId of requirement.verification) {
          if (testCases.get(testId)?.status !== "implemented") {
            errors.push(`${requirement.id}: active verification ${testId} must be implemented, not planned.`);
          }
        }
      }
    }
  }

  for (const testCase of catalog.testCases) {
    for (const requirementId of testCase.requirements) {
      const requirement = requirements.get(requirementId);
      if (!requirement || requirement.kind === "business") {
        errors.push(`${testCase.id}: missing technical/nonfunctional requirement ${requirementId}.`);
      } else if (!requirement.verification.includes(testCase.id)) {
        errors.push(`${testCase.id}: requirement ${requirementId} must link back to the test case.`);
      }
    }

    if (testCase.file) {
      if (
        path.isAbsolute(testCase.file) ||
        testCase.file.includes("\\") ||
        testCase.file.split("/").some((part) => part === ".." || part === "." || !part) ||
        !testCase.file.startsWith("tests/")
      ) {
        errors.push(`${testCase.id}: test file path must stay inside tests/ without traversal.`);
        continue;
      }
      const candidate = path.resolve(root, testCase.file);
      if (!inside(root, candidate)) {
        errors.push(`${testCase.id}: test file path escapes the repository.`);
        continue;
      }
      if (testCase.status === "implemented") {
        if (!existsSync(candidate) || !statSync(candidate).isFile()) {
          errors.push(`${testCase.id}: test file ${testCase.file} does not exist.`);
        } else if (!inside(realpathSync(root), realpathSync(candidate))) {
          errors.push(`${testCase.id}: test file symlink escapes the repository.`);
        } else if (!readFileSync(candidate, "utf8").includes(testCase.id)) {
          errors.push(`${testCase.id}: test file must contain its test case ID.`);
        }
      }
    }
  }

  return errors;
}

export async function checkTraceability(rootDir = process.cwd()) {
  try {
    const catalog = parse(readFileSync(path.join(rootDir, "docs/requirements.yaml"), "utf8"));
    const contract = parse(readFileSync(path.join(rootDir, "contracts/openapi.yaml"), "utf8"));
    const operationIds = [];
    for (const item of Object.values(contract.paths ?? {})) {
      for (const [method, operation] of Object.entries(item ?? {})) {
        if (["get", "post", "put", "patch", "delete", "head", "options", "trace"].includes(method) && operation?.operationId) {
          operationIds.push(operation.operationId);
        }
      }
    }
    return [...validateTraceability(catalog, { rootDir, operationIds }), ...validateOperationLinks(catalog, contract)];
  } catch (error) {
    return [`Cannot check traceability: ${error.message}`];
  }
}

export function validateOperationLinks(catalog, contract) {
  const errors = [];
  const requirements = new Map((catalog.requirements ?? []).map(requirement => [requirement.id, requirement]));
  const seen = new Set();
  for (const item of Object.values(contract.paths ?? {})) for (const [method, operation] of Object.entries(item ?? {})) {
    if (!["get", "post", "put", "patch", "delete", "head", "options", "trace"].includes(method)) continue;
    const id = operation?.operationId;
    if (!id) { errors.push("Each business operation needs an operationId."); continue; }
    if (seen.has(id)) errors.push(`Duplicate operation ID ${id}.`);
    seen.add(id);
    const links = operation["x-requirement-ids"];
    if (!Array.isArray(links) || !links.length || new Set(links).size !== links.length) { errors.push(`${id}: unique x-requirement-ids are required.`); continue; }
    for (const requirementId of links) {
      const requirement = requirements.get(requirementId);
      if (!requirement || !requirement.api?.operations?.includes(id)) errors.push(`${id}: nonreciprocal or unknown requirement ${requirementId}.`);
    }
    for (const requirement of requirements.values()) if (requirement.api?.operations?.includes(id) && !links.includes(requirement.id)) errors.push(`${requirement.id}: missing reverse operation link ${id}.`);
  }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors = await checkTraceability();
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else {
    console.log("Requirements structure, links, active-scope coverage and source references are valid.");
  }
}
