import "server-only";
import { EnquiryStorageUnavailable, saveEnquiry } from "./repository";
import type { FieldErrors, NormalizedEnquiry } from "./validation";

export type EnquiryErrorCode = "INVALID_REQUEST" | "REQUEST_NOT_ALLOWED" | "REQUEST_TIMEOUT" | "IDEMPOTENCY_CONFLICT" | "PAYLOAD_TOO_LARGE" | "UNSUPPORTED_MEDIA_TYPE" | "RATE_LIMITED" | "STORAGE_UNAVAILABLE" | "INTERNAL_ERROR";
export type EnquiryError = { code: EnquiryErrorCode; message: string; fieldErrors?: FieldErrors };
export type EnquiryReceipt = { enquiryId: string; receivedAt: string; status: "received" };
export const errorMessages: Record<EnquiryErrorCode, string> = {
  INVALID_REQUEST: "Check your enquiry details.", REQUEST_NOT_ALLOWED: "This request is not allowed.",
  REQUEST_TIMEOUT: "The request took too long. Please retry.", IDEMPOTENCY_CONFLICT: "Start a new enquiry to send different details.",
  PAYLOAD_TOO_LARGE: "Your enquiry is too long. Please shorten it.", UNSUPPORTED_MEDIA_TYPE: "Send your enquiry as UTF-8 JSON.",
  RATE_LIMITED: "Please wait before sending another enquiry.", STORAGE_UNAVAILABLE: "We could not confirm your enquiry. Please retry.",
  INTERNAL_ERROR: "We could not confirm your enquiry. Please retry.",
};
export function enquiryError(code: EnquiryErrorCode, fieldErrors?: FieldErrors): EnquiryError {
  return { code, message: errorMessages[code], ...(fieldErrors ? { fieldErrors } : {}) };
}

export async function createEnquiry(key: string, value: NormalizedEnquiry): Promise<{ status: number; body: EnquiryReceipt | EnquiryError; retryAfter?: number }> {
  try {
    const row = await saveEnquiry(key, value);
    if (row.outcome === "conflict") return { status: 409, body: enquiryError("IDEMPOTENCY_CONFLICT") };
    if (row.outcome === "throttled" && Number.isInteger(row.retry_after) && row.retry_after! >= 1 && row.retry_after! <= 600) return { status: 429, body: enquiryError("RATE_LIMITED"), retryAfter: row.retry_after! };
    if (row.outcome === "unavailable") return { status: 503, body: enquiryError("STORAGE_UNAVAILABLE") };
    if (row.outcome === "invalid") return { status: 400, body: enquiryError("INVALID_REQUEST") };
    if ((row.outcome !== "created" && row.outcome !== "replayed") || !row.enquiry_id || !(row.received_at instanceof Date) || !Number.isFinite(row.received_at.getTime())) throw new Error("Unexpected receipt result.");
    return { status: row.outcome === "created" ? 201 : 200, body: { enquiryId: row.enquiry_id, receivedAt: row.received_at.toISOString(), status: "received" } };
  } catch (error) {
    if (error instanceof EnquiryStorageUnavailable) return { status: 503, body: enquiryError("STORAGE_UNAVAILABLE") };
    throw error;
  }
}
