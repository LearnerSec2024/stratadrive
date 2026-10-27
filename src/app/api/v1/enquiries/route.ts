import { randomUUID } from "node:crypto";
import { createEnquiry, enquiryError, type EnquiryErrorCode } from "@/server/enquiries/service";
import { isIdempotencyKey, validateEnquiry } from "@/server/enquiries/validation";

export const runtime = "nodejs";
const origins = new Set(["http://127.0.0.1:3000", "http://localhost:3000", "http://127.0.0.1:3100", "http://localhost:3100"]);
const MAX_BODY = 8192;
const BODY_DEADLINE = 5000;
class BodyFailure extends Error {
  constructor(readonly code: "PAYLOAD_TOO_LARGE" | "REQUEST_TIMEOUT" | "INVALID_REQUEST", readonly status: number) { super(code); }
}

function respond(body: unknown, status: number, retryAfter?: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...(retryAfter === undefined ? {} : { "Retry-After": String(retryAfter) }) } });
}

function rejectRequest(request: Request, code: EnquiryErrorCode, status: number): Response {
  void request.body?.cancel().catch(() => undefined);
  return respond(enquiryError(code), status);
}

async function readJson(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new BodyFailure("INVALID_REQUEST", 400);
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new BodyFailure("REQUEST_TIMEOUT", 408)), BODY_DEADLINE); });
  try {
    while (true) {
      const next = await Promise.race([reader.read(), timedOut]);
      if (next.done) break;
      if (next.value.byteLength === 0) continue;
      bytes += next.value.byteLength;
      if (bytes > MAX_BODY) throw new BodyFailure("PAYLOAD_TOO_LARGE", 413);
      chunks.push(next.value);
    }
    const data = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(data));
  } catch (error) {
    void reader.cancel().catch(() => undefined);
    if (error instanceof BodyFailure) throw error;
    throw new BodyFailure("INVALID_REQUEST", 400);
  } finally {
    clearTimeout(timer);
    try { reader.releaseLock(); } catch { /* preserve the bounded-read result if cancellation is still settling */ }
  }
}

function supportedContent(request: Request): boolean {
  const encoding = request.headers.get("content-encoding");
  if (encoding && encoding.trim().toLowerCase() !== "identity") return false;
  const parts = (request.headers.get("content-type") ?? "").split(";").map(part => part.trim().toLowerCase());
  if (parts[0] !== "application/json") return false;
  return parts.slice(1).every(part => /^charset\s*=\s*(?:utf-8|"utf-8")$/.test(part));
}

export async function POST(request: Request): Promise<Response> {
  try {
    let target: URL;
    try { target = new URL(request.url); }
    catch { return rejectRequest(request, "REQUEST_NOT_ALLOWED", 403); }
    if (target.username || target.password || !origins.has(target.origin)) return rejectRequest(request, "REQUEST_NOT_ALLOWED", 403);
    const origin = request.headers.get("origin");
    if (origin !== null && !origins.has(origin)) return rejectRequest(request, "REQUEST_NOT_ALLOWED", 403);
    if (!supportedContent(request)) return rejectRequest(request, "UNSUPPORTED_MEDIA_TYPE", 415);
    const key = request.headers.get("idempotency-key");
    if (!isIdempotencyKey(key)) return rejectRequest(request, "INVALID_REQUEST", 400);
    const validated = validateEnquiry(await readJson(request));
    if (!validated.ok) return respond(enquiryError("INVALID_REQUEST", validated.fieldErrors), 400);
    const result = await createEnquiry(key, validated.value);
    return respond(result.body, result.status, result.retryAfter);
  } catch (error) {
    if (error instanceof BodyFailure) return respond(enquiryError(error.code), error.status);
    // Never attach the exception, submitted values or driver details to a log.
    console.error(JSON.stringify({ event: "enquiry_unexpected_failure", correlationId: randomUUID() }));
    return respond(enquiryError("INTERNAL_ERROR"), 500);
  }
}
