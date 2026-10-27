import { describe, expect, it } from "vitest";
import { validateSchemaExamples } from "../../scripts/validate-contract.mjs";

function errorSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["code", "message"],
    properties: {
      code: { type: "string", pattern: "^[A-Z][A-Z0-9_]*$" },
      message: { type: "string", minLength: 1 },
    },
    examples: [{ code: "VALIDATION_ERROR", message: "Invalid request." }],
  };
}

function document(schema: Record<string, unknown>) {
  return {
    openapi: "3.1.0",
    info: { title: "Contract validator test", version: "0.0.0" },
    paths: {},
    components: { schemas: { Error: schema } },
  };
}

describe("TC-CONTRACT-001 OpenAPI 3.1 schema example validation", () => {
  it("accepts an error example satisfying its schema", () => {
    expect(validateSchemaExamples(document(errorSchema()))).toEqual([]);
  });

  it.each([
    ["missing required message", { code: "VALIDATION_ERROR" }],
    ["incorrect code type", { code: 12, message: "Invalid request." }],
    ["incorrect message type", { code: "VALIDATION_ERROR", message: 12 }],
    ["non-nullable message", { code: "VALIDATION_ERROR", message: null }],
    ["empty message", { code: "VALIDATION_ERROR", message: "" }],
    ["incorrect code pattern", { code: "lowercase", message: "Invalid request." }],
    ["undeclared field", { code: "VALIDATION_ERROR", message: "Invalid request.", secret: "synthetic" }],
  ])("rejects %s", (_description, example) => {
    const schema = { ...errorSchema(), examples: [example] };
    expect(validateSchemaExamples(document(schema))).not.toEqual([]);
  });

  it("checks string formats instead of treating them as annotations", () => {
    const schema = {
      type: "object",
      required: ["email"],
      properties: { email: { type: "string", format: "email" } },
      examples: [{ email: "not-an-email" }],
    };
    expect(validateSchemaExamples(document(schema))).not.toEqual([]);
  });

  it("accepts explicit JSON Schema nullability", () => {
    const schema = {
      type: "object",
      required: ["message"],
      properties: { message: { type: ["string", "null"] } },
      examples: [{ message: null }, { message: "A message." }],
    };
    expect(validateSchemaExamples(document(schema))).toEqual([]);
  });

  it("enforces a JSON Schema 2020-12 keyword", () => {
    const schema = {
      type: "array",
      minItems: 1,
      prefixItems: [{ type: "string" }],
      items: false,
      examples: [["first", "unexpected"]],
    };
    expect(validateSchemaExamples(document({
      ...schema,
      examples: [["first"]],
    }))).toEqual([]);
    expect(validateSchemaExamples(document(schema))).not.toEqual([]);
  });

  it("resolves an internal component reference", () => {
    const value = document({
      $ref: "#/components/schemas/Message",
      examples: ["Valid message."],
    });
    Object.assign(value.components.schemas, {
      Message: { type: "string", minLength: 1, examples: ["Valid message."] },
    });
    expect(validateSchemaExamples(value)).toEqual([]);
  });

  it("rejects an unresolved internal reference", () => {
    expect(
      validateSchemaExamples(document({
        $ref: "#/components/schemas/Missing",
        examples: ["Anything"],
      })),
    ).not.toEqual([]);
  });

  it("rejects external references without fetching them", () => {
    expect(
      validateSchemaExamples(document({
        $ref: "https://stratadrive.example/schema.json",
        examples: ["Anything"],
      })),
    ).not.toEqual([]);
  });
});
