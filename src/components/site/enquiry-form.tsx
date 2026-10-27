"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { Icon } from "./icon";

type Fields = { name: string; email: string; message: string };
type Field = keyof Fields;
type Receipt = { enquiryId: string; receivedAt: string; status: "received" };
type FormError = { message: string; uncertain: boolean; conflict?: boolean };
const emptyFields: Fields = { name: "", email: "", message: "" };
const fieldMessages: Record<Field, string> = {
  name: "Enter a name using 1 to 100 characters, without control characters.",
  email: "Enter a valid email address using at most 254 characters.",
  message: "Use at most 2,000 characters of plain text, without control characters.",
};
const errors: Record<string, string> = {
  INVALID_REQUEST: "Check your enquiry details.", REQUEST_NOT_ALLOWED: "This request is not allowed.",
  REQUEST_TIMEOUT: "We could not confirm whether your enquiry saved. Please retry this enquiry.",
  IDEMPOTENCY_CONFLICT: "This enquiry reference was used with different details. Start a different enquiry to continue.",
  PAYLOAD_TOO_LARGE: "Your enquiry is too long. Please shorten it.", UNSUPPORTED_MEDIA_TYPE: "Your enquiry could not be sent. Please try again.",
  RATE_LIMITED: "Please wait before sending another enquiry, then try again.",
  STORAGE_UNAVAILABLE: "We could not confirm whether your enquiry saved. Please retry this enquiry.",
  INTERNAL_ERROR: "We could not confirm whether your enquiry saved. Please retry this enquiry.",
};
const errorForStatus: Record<number, string> = { 400: "INVALID_REQUEST", 403: "REQUEST_NOT_ALLOWED", 408: "REQUEST_TIMEOUT", 409: "IDEMPOTENCY_CONFLICT", 413: "PAYLOAD_TOO_LARGE", 415: "UNSUPPORTED_MEDIA_TYPE", 429: "RATE_LIMITED", 503: "STORAGE_UNAVAILABLE", 500: "INTERNAL_ERROR" };

function isReceipt(value: unknown): value is Receipt {
  if (!value || typeof value !== "object") return false;
  const receipt = value as Record<string, unknown>;
  return Object.keys(receipt).sort().join() === "enquiryId,receivedAt,status" && receipt.status === "received"
    && typeof receipt.enquiryId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(receipt.enquiryId)
    && typeof receipt.receivedAt === "string" && /Z$/.test(receipt.receivedAt) && Number.isFinite(Date.parse(receipt.receivedAt));
}

export function EnquiryForm() {
  const [fields, setFields] = useState<Fields>(emptyFields);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const [error, setError] = useState<FormError | null>(null);
  const [pending, setPending] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const intent = useRef<string | null>(null);
  const summary = useRef<HTMLDivElement>(null);
  const success = useRef<HTMLElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const frozen = pending || error?.uncertain === true || error?.conflict === true;

  function focusSummary() { requestAnimationFrame(() => summary.current?.focus()); }
  function change(field: Field, value: string) {
    if (frozen) return;
    setFields(current => ({ ...current, [field]: value }));
    setFieldErrors(current => ({ ...current, [field]: undefined }));
    setError(null);
    intent.current = null;
  }
  function reset(keepFields = false) {
    intent.current = null;
    if (!keepFields) setFields(emptyFields);
    setReceipt(null); setError(null); setFieldErrors({}); setConfirmNew(false);
    requestAnimationFrame(() => nameInput.current?.focus());
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || error?.conflict || confirmNew) return;
    const form = event.currentTarget;
    const clientErrors: Partial<Record<Field, string>> = {};
    for (const field of ["name", "email", "message"] as const) {
      const control = form.elements.namedItem(field) as HTMLInputElement | HTMLTextAreaElement;
      if (!control.validity.valid || (field === "name" && !fields.name.trim())) clientErrors[field] = fieldMessages[field];
    }
    const normalizedName = fields.name.trim().normalize("NFC");
    const normalizedMessage = fields.message.replace(/\r\n?/g, "\n").trim().normalize("NFC");
    if (!fields.name.isWellFormed() || Array.from(fields.name).length > 100 || Array.from(normalizedName).length < 1 || Array.from(normalizedName).length > 100) clientErrors.name = fieldMessages.name;
    if (!fields.message.isWellFormed() || Array.from(fields.message).length > 2000 || Array.from(normalizedMessage).length > 2000) clientErrors.message = fieldMessages.message;
    if (Object.keys(clientErrors).length) {
      setFieldErrors(clientErrors); setError({ message: errors.INVALID_REQUEST, uncertain: false }); focusSummary(); return;
    }
    setPending(true); setError(null); setFieldErrors({});
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      intent.current ??= crypto.randomUUID();
      const response = await fetch("/api/v1/enquiries", {
        method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": intent.current },
        body: JSON.stringify(fields), signal: controller.signal, cache: "no-store",
      });
      const result: unknown = await response.json();
      if ((response.status === 201 || response.status === 200) && isReceipt(result)) {
        setReceipt(result); setFields(emptyFields);
        requestAnimationFrame(() => success.current?.focus());
        return;
      }
      const problem = result && typeof result === "object" ? result as { code?: unknown; fieldErrors?: unknown } : {};
      const code = typeof problem.code === "string" && errorForStatus[response.status] === problem.code ? problem.code : "INTERNAL_ERROR";
      const safeFields: Partial<Record<Field, string>> = {};
      if (code === "INVALID_REQUEST" && problem.fieldErrors && typeof problem.fieldErrors === "object") {
        for (const field of ["name", "email", "message"] as const) if (Object.hasOwn(problem.fieldErrors, field)) safeFields[field] = fieldMessages[field];
      }
      setFieldErrors(safeFields);
      setError({ message: errors[code], uncertain: ["INTERNAL_ERROR", "STORAGE_UNAVAILABLE", "REQUEST_TIMEOUT"].includes(code), conflict: code === "IDEMPOTENCY_CONFLICT" });
      focusSummary();
    } catch {
      setError({ message: errors.STORAGE_UNAVAILABLE, uncertain: true }); focusSummary();
    } finally { clearTimeout(timer); setPending(false); }
  }

  if (receipt) return (
    <section ref={success} className="enquiry-card enquiry-success" tabIndex={-1} aria-labelledby="enquiry-saved" role="status">
      <span className="enquiry-success-icon"><Icon name="check" /></span>
      <p className="eyebrow">A CLEAR NEXT STEP</p>
      <h2 id="enquiry-saved">Your enquiry has been saved.</h2>
      <p>No lesson has been booked. This preview sends no email.</p>
      <dl className="enquiry-receipt"><div><dt>Reference</dt><dd>{receipt.enquiryId}</dd></div><div><dt>Received</dt><dd><time dateTime={receipt.receivedAt}>{new Date(receipt.receivedAt).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })}</time></dd></div></dl>
      <div className="enquiry-actions"><button className="button button-primary" type="button" onClick={() => reset()}>Start another enquiry<Icon name="arrow" /></button><Link href="/" className="text-link">Back to home</Link></div>
    </section>
  );

  return (
    <form className="enquiry-card" onSubmit={submit} noValidate autoComplete="off" aria-label="Lesson enquiry" aria-busy={pending}>
      <h2>Start the conversation.</h2>
      <p className="enquiry-form-intro">A name, a reply address, and what you have in mind. Use made-up details for this local preview.</p>
      {error && <div ref={summary} className="enquiry-error-summary" role="alert" tabIndex={-1}>
        <strong>{error.message}</strong>
        {Object.keys(fieldErrors).length > 0 && <ul>{(["name", "email", "message"] as const).filter(field => fieldErrors[field]).map(field => <li key={field}><a href={`#enquiry-${field}`} onClick={event => { event.preventDefault(); document.getElementById(`enquiry-${field}`)?.focus(); }}>{fieldErrors[field]}</a></li>)}</ul>}
        {error.uncertain && <p>Your details are kept here. The enquiry may already be saved. Retry to confirm this enquiry before starting another. Refreshing clears this draft.</p>}
      </div>}
      <div className="enquiry-fields">
        <div className="enquiry-field"><label htmlFor="enquiry-name">Name <span>Required</span></label><input ref={nameInput} id="enquiry-name" name="name" type="text" required maxLength={8192} autoComplete="off" value={fields.name} readOnly={frozen} onChange={event => change("name", event.target.value)} aria-invalid={!!fieldErrors.name} aria-describedby={fieldErrors.name ? "enquiry-name-error" : undefined} placeholder="Test Learner" />{fieldErrors.name && <p className="enquiry-field-error" id="enquiry-name-error">{fieldErrors.name}</p>}</div>
        <div className="enquiry-field"><label htmlFor="enquiry-email">Email address <span>Required</span></label><input id="enquiry-email" name="email" type="email" inputMode="email" required maxLength={254} autoComplete="off" value={fields.email} readOnly={frozen} onChange={event => change("email", event.target.value)} aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? "enquiry-email-error" : "enquiry-email-hint"} placeholder="learner@example.test" /><p className="enquiry-field-hint" id="enquiry-email-hint">Use a sample address. This preview does not send email.</p>{fieldErrors.email && <p className="enquiry-field-error" id="enquiry-email-error">{fieldErrors.email}</p>}</div>
        <div className="enquiry-field"><label htmlFor="enquiry-message">Message <span>Optional</span></label><textarea id="enquiry-message" name="message" rows={5} maxLength={8192} value={fields.message} readOnly={frozen} onChange={event => change("message", event.target.value)} aria-invalid={!!fieldErrors.message} aria-describedby={fieldErrors.message ? "enquiry-message-error" : "enquiry-message-hint"} placeholder="Tell us what you would like to work towards..." /><p className="enquiry-field-hint" id="enquiry-message-hint">Up to 2,000 characters. Please leave out real personal or sensitive information.</p>{fieldErrors.message && <p className="enquiry-field-error" id="enquiry-message-error">{fieldErrors.message}</p>}</div>
      </div>
      {confirmNew ? <div className="enquiry-new-intent" role="group" aria-label="Confirm a different enquiry"><p>The earlier enquiry may already be saved. Starting another can create a second enquiry.</p><div className="enquiry-actions"><button type="button" className="button button-primary" onClick={() => reset(true)}>Start a new enquiry</button><button type="button" className="text-link" onClick={() => setConfirmNew(false)}>Keep this enquiry</button></div></div> : <div className="enquiry-actions"><button className="button button-primary" type="submit" disabled={pending || error?.conflict === true}>{pending ? "Saving enquiry…" : error?.uncertain ? "Retry enquiry" : "Send enquiry"}<Icon name="arrow" /></button>{(error?.uncertain || error?.conflict) && <button type="button" className="text-link" onClick={() => setConfirmNew(true)}>Start a different enquiry</button>}</div>}
      <p className="enquiry-local-note">Your enquiry is saved locally for review. No lesson is booked, no instructor is notified, and no email is sent.</p>
    </form>
  );
}
