import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { parse } from "yaml";

function allReferences(value, found = []) {
  if (!value || typeof value !== "object") return found;
  if (typeof value.$ref === "string") found.push(value.$ref);
  for (const child of Object.values(value)) allReferences(child, found);
  return found;
}

function extractedSchemas(schemas) {
  const definitions = structuredClone(schemas);
  function rewrite(value) {
    if (!value || typeof value !== "object") return;
    if (typeof value.$ref === "string") {
      value.$ref = value.$ref.replace("#/components/schemas/", "#/$defs/");
    }
    for (const child of Object.values(value)) rewrite(child);
  }
  rewrite(definitions);
  return definitions;
}

/** Compile local OpenAPI 3.1 component schemas with JSON Schema 2020-12. */
export function validateSchemaExamples(document) {
  const errors = [];
  if (!document || typeof document !== "object" || !/^3\.1\.\d+$/.test(document.openapi ?? "")) {
    return ["Contract must use OpenAPI 3.1.x."];
  }
  if (!document.paths || typeof document.paths !== "object" || Array.isArray(document.paths)) {
    errors.push("Contract paths must be an object (empty in Iteration 0A).");
  }
  const schemas = document.components?.schemas;
  if (!schemas || typeof schemas !== "object" || Array.isArray(schemas) || !Object.keys(schemas).length) {
    return [...errors, "Contract needs reusable component schemas with examples."];
  }

  const references = allReferences(document);
  if (references.some((reference) => !reference.startsWith("#/components/schemas/"))) {
    return [...errors, "Only local #/components/schemas/ references are permitted; external references are forbidden."];
  }

  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  // OAS annotations are not validation keywords; examples are checked below.
  for (const keyword of ["example", "discriminator", "xml", "externalDocs"]) {
    ajv.addKeyword({ keyword, valid: true });
  }

  const componentRoot = {
    $id: "urn:stratadrive:api-components",
    $defs: extractedSchemas(schemas),
  };
  // Keep component references addressable without treating the entire OAS document
  // as a JSON Schema. Each extracted component is compiled as the actual schema.
  ajv.addSchema(componentRoot);
  for (const [name, schema] of Object.entries(schemas)) {
    if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
      errors.push(`Schema ${name} must be an object.`);
      continue;
    }
    try {
      const pointerName = name.replaceAll("~", "~0").replaceAll("/", "~1");
      const validate = ajv.compile({ $ref: `urn:stratadrive:api-components#/$defs/${pointerName}` });
      if (!Array.isArray(schema.examples) || !schema.examples.length) {
        errors.push(`Schema ${name} needs at least one example.`);
      } else {
        for (const [index, example] of schema.examples.entries()) {
          if (!validate(example)) {
            errors.push(`Schema ${name} example ${index} is invalid: ${ajv.errorsText(validate.errors)}.`);
          }
        }
      }
    } catch (error) {
      errors.push(`Schema ${name} cannot compile: ${error.message}`);
    }
  }
  return errors;
}

export async function validateContract(rootDir = process.cwd()) {
  try {
    return validateSchemaExamples(parse(readFileSync(path.join(rootDir, "contracts/openapi.yaml"), "utf8")));
  } catch (error) {
    return [`Cannot validate contract: ${error.message}`];
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors = await validateContract();
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else {
    console.log("OpenAPI 3.1 component schemas and examples are valid; executed API coverage is recorded separately.");
  }
}
