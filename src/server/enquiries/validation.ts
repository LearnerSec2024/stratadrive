import Ajv2020, { type ErrorObject } from "ajv/dist/2020";
import addFormats from "ajv-formats";
import schemas from "./schema.generated.json";

export type EnquiryFields = "name" | "email" | "message";
export type FieldErrors = Partial<Record<EnquiryFields, string>>;
export type NormalizedEnquiry = { name: string; email: string; message: string | null };
export type EnquiryValidation = { ok: true; value: NormalizedEnquiry } | { ok: false; fieldErrors?: FieldErrors };

const messages: Record<EnquiryFields, string> = {
  name: "Enter a name using 1 to 100 characters, without control characters.",
  email: "Enter a valid email address using at most 254 characters.",
  message: "Use at most 2,000 characters of plain text, without control characters.",
};
const ajv = new Ajv2020({ strict: true, allErrors: true });
addFormats(ajv);
ajv.addSchema(schemas, "stratadrive-enquiries");
const rawValid = ajv.compile({ $ref: "stratadrive-enquiries#/$defs/EnquiryRequest" });
const normalizedValid = ajv.compile({ $ref: "stratadrive-enquiries#/$defs/EnquiryNormalized" });

function safeErrors(errors: ErrorObject[] | null | undefined): FieldErrors | undefined {
  const result: FieldErrors = {};
  for (const error of errors ?? []) {
    const field: unknown = error.keyword === "required" ? error.params.missingProperty : error.instancePath.slice(1).split("/")[0];
    if (field === "name" || field === "email" || field === "message") result[field] = messages[field];
  }
  return Object.keys(result).length ? result : undefined;
}

export function validateEnquiry(raw: unknown): EnquiryValidation {
  if (!rawValid(raw)) return { ok: false, fieldErrors: safeErrors(rawValid.errors) };
  const input = raw as { name: string; email: string; message?: string };
  const malformed: FieldErrors = {};
  for (const field of ["name", "email", "message"] as const) {
    const text = input[field];
    if (typeof text === "string" && !text.isWellFormed()) malformed[field] = messages[field];
  }
  if (Object.keys(malformed).length) return { ok: false, fieldErrors: malformed };
  const trimmedEmail = input.email.trim();
  const at = trimmedEmail.lastIndexOf("@");
  const value: NormalizedEnquiry = {
    name: input.name.trim().normalize("NFC"),
    email: at > 0 ? `${trimmedEmail.slice(0, at)}@${trimmedEmail.slice(at + 1).toLowerCase()}` : trimmedEmail,
    message: input.message?.replace(/\r\n?/g, "\n").trim().normalize("NFC") || null,
  };
  if (!normalizedValid(value)) return { ok: false, fieldErrors: safeErrors(normalizedValid.errors) };
  return { ok: true, value };
}

export function isIdempotencyKey(value: string | null): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
