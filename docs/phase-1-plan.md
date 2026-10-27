# Phase 1: customer-facing driving instruction website

Current status (2026-10-25, Australia/Brisbane): [Iteration 1A](iterations/1a.md) is implemented with provisional owner visual approval. [Iteration 1B](iterations/1b.md)'s approved synthetic enquiry form, POST API and private local Supabase storage are implemented and locally verified. All nine gates passed: 215 unit, 16 database, 7 HTTP and 25 browser tests. The candidate remains an uncommitted working tree based on `95c2c01`. The owner selected **“Keep 1B ready for review”**; explicit manual acceptance remains pending. See [README](../README.md) and [the manual walkthrough](manual-testing.md#enquiry-review) for current commands and expected results.

The proposal sections below preserve the original planning baseline. Their destination-TBD, approval-pending and implementation-pending statements are superseded by the [approved packet](iterations/1b-enquiry-packet.md) and current iteration record. Historical evidence is preserved; external activation remains separately controlled.

Confirmed direction: StrataDrive is a customer-facing driving instruction booking website. The owner wants a modern, visually appealing design and will manually inspect every functional increment locally before acceptance. Planner, Tester and Critic independently reviewed the planning context and returned recommendations; they made no changes or new execution claims for this plan.

Business service area, lesson types, prices, instructor credentials, public contact details, brand assets and final copy remain unconfirmed. Do not infer a service area from the development timezone. Do not invent testimonials, pass rates, certifications, availability or booking promises.

## Design direction

Propose a calm, premium driving-school identity with strong typography, generous spacing, clear customer actions and a mobile-first layout. This is a design proposal for owner review, not an existing brand standard.

| Element | Proposed treatment |
| --- | --- |
| Colour | Deep navy `#0B172A`, soft off-white `#F7F9FC`, blue `#1769E0` for the main action; restrained teal decorative accent. Verify text/control contrast before acceptance |
| Typography | Large concise headings, comfortable body text and a clear reading hierarchy; use the existing font setup initially |
| Header | StrataDrive wordmark, compact section navigation and a prominent Book a lesson action; accessible mobile menu |
| Hero | Booking-focused headline, short confidence-building copy, purposeful driving imagery/illustration and a prominent booking-entry card |
| Main content | Owner-approved lesson/service information, a simple how-booking-works sequence, instructor/service introduction, useful FAQs and clear contact expectations |
| Booking entry | Primary conversion path to a clearly labelled booking-flow preview in 1A; no invented slots, prices or reservation confirmation |
| Visual details | Consistent rounded controls, restrained shadows, intentional whitespace and modest motion that respects reduced-motion preferences |
| Mobile | Legible layouts, generous touch controls and a clear primary action without obscuring content |

Example draft headline for discussion: “Your next step towards confident driving.” Final wording and imagery need owner review. Generic illustrations must not impersonate the actual instructor, vehicle or customers. Use local licensed/approved assets; no external tracking or unapproved third-party embeds.

## Delivery boundaries

| Increment | Proposed result | Owner review |
| --- | --- | --- |
| **1A — website and booking-flow preview** | Responsive homepage and `/book` preview focused on customer confidence and the booking journey. Working navigation and responsive interactions; booking remains visibly unavailable in this local preview. No contact collection or reservation API | Review desktop/mobile design, copy hierarchy, navigation, booking-entry expectations, keyboard use and zoom |
| **1B — operational enquiries** | An approved enquiry form and contract-first endpoint that acknowledge only after a defined durable outcome. Storage, privacy, abuse controls and local fixture setup decided first | Submit synthetic enquiries, inspect durable local receipt and truthful error/retry states |
| **Live booking** | Availability, instructor selection, concurrency-safe reservation and any payments | Remains Phase 3 in the existing roadmap unless the owner explicitly reprioritizes it |

1A is the recommended next implementation packet. It gives the owner a useful visual result before adding personal-data handling. It must not display simulated success, selectable fictional availability or a statement that a lesson has been reserved. No fake enquiry form is needed. A Book a lesson action may lead to the labelled local preview; publication requires a deliberate operational contact/booking route.

1B is secondary to the booking-focused design and needs its own approval. If the owner wants live bookings ahead of enquiries, re-plan that scope explicitly rather than treating an enquiry as a reservation.

## Proposed requirements and verification

Phase 1A entries have been approved and transferred to the canonical `requirements.yaml`; Phase 1B entries remain proposals. Approval is not verification or owner acceptance. This table is a planning index, not a second requirements source of truth.

| Proposed requirement | Technical mapping | API | Planned verification |
| --- | --- | --- | --- |
| `BR-P1-WEB-001`: customers understand the service and next booking step | `TR-P1-WEB-001`: responsive homepage and clear booking entry | N/A: public UI | `TC-P1A-CONTENT-001`, `TC-P1A-E2E-001` |
| `BR-P1-PREVIEW-001`: customers can understand the intended booking journey without false operational claims | `TR-P1-PREVIEW-001`: labelled `/book` preview with no submission or fictitious availability | N/A: preview only | `TC-P1A-E2E-001`, `TC-P1A-OWNER-001` |
| `BR-P1-ACCESS-001`: customers can use the public UI across devices and input methods | `NFR-P1-A11Y-001`: semantic markup, keyboard/focus, contrast, zoom/reflow and reduced motion | N/A: public UI | `TC-P1A-A11Y-001`, `TC-P1A-MANUAL-001` |
| `BR-P1-ENQ-001`: visitors can submit an enquiry and receive an honest acknowledgement | `TR-P1-ENQ-001`: validated intake with agreed durable receipt | Proposed `createEnquiry` | `TC-P1B-UNIT-001`, `TC-P1B-CONTRACT-001`, `TC-P1B-API-001`, `TC-P1B-E2E-001` |
| `BR-P1-PRIV-001`: personal information is limited and protected | `NFR-P1-PRIV-001`, `NFR-P1-ABUSE-001`: minimum fields, safe errors, access restrictions and abuse controls | Proposed `createEnquiry` | `TC-P1B-SECURITY-001` |
| Existing approved `BR-ACCEPT-001`: owner manually accepts functional increments | Existing `TR-LOCAL-001`: clear verified local handoff | N/A: engineering workflow | Existing `TC-LOCAL-001`, plus proposed `TC-P1A-OWNER-001` / `TC-P1B-OWNER-001` |

The 1A prerequisite was to extend the foundation catalogue deliberately beyond its original hard-coded phase 0 scope. The catalogue now declares `activePhase: 1`, matches its iteration scope, retains previous phase coverage and rejects approved/implemented future-phase claims; future work must remain proposed. All consumers/fixtures are migrated together and Phase 1 completeness checks are tested. Current business API paths remain empty.

## Proposed 1B contract and data boundary

Provisional operation: `POST /api/v1/enquiries`, `operationId: createEnquiry`. No public enquiry list, lookup, update or deletion endpoint is proposed. Customer authentication and a CRM interface are not prerequisites for intake.

Propose a name, one required reply channel and an optional message, subject to owner approval. Do not collect licence numbers, addresses, dates of birth or health information without a defined need. Decide exact fields, lengths, normalization, unknown-property handling and privacy wording before coding.

```text
Form -> OpenAPI Route Handler -> enquiry use case -> approved durable adapter
                                                    -> optional notification
```

Choose Supabase persistence or an approved durable delivery service before finalizing acknowledgement semantics. A success must follow a committed durable outcome; notification failure after a saved enquiry is a separate operational event and must not invite duplicate retries. The contract must specify success/error status codes, content type, payload limits, throttling, retries and uncertain-response/deduplication behavior. The acknowledgement must not imply that an instructor has read the message or reserved a lesson.

Preserve input on failure, show clear validation feedback and avoid personal information in URLs, routine logs, analytics, caches and errors. Treat text as untrusted plain text. Keep database/service credentials server-only and restrict anonymous data access. Enforce abuse controls at the approved intake boundary; do not permit a direct database write path that bypasses those controls. An in-memory limiter alone is not a multi-instance production abuse strategy.

Mock adapters can support isolated tests; they do not demonstrate durable operational receipt. Use the approved local database/delivery substitute to verify persistence across application restart. No hosted project, email provider, CAPTCHA, analytics or deployment connection is authorized by this plan.

## Proposed change inventory and ownership

Exact reservations will be recorded in each approved implementation packet. Do not let agents edit overlapping paths.

| Stage / writer | Proposed files and purpose |
| --- | --- |
| Planning / orchestrator | This plan, `manual-testing.md`, `agent-workflow.md`, role instructions and approved standing manual-acceptance links |
| 1A shared foundation / one assigned writer | `schemas/requirements.schema.json`, `scripts/check-traceability.mjs`, `docs/requirements.yaml`: active-scope support and approved requirement links |
| 1A Developer | `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`: customer-facing visual design and metadata; `src/app/book/page.tsx`: truthful booking-flow preview |
| 1A Developer, if useful | `src/components/site/header.tsx`, `src/components/site/footer.tsx`, `src/components/site/booking-preview.tsx`: shared structure and accessible interactions; extract only where justified |
| 1A styling / one assigned writer | Proposed `postcss.config.mjs` and pinned `@tailwindcss/postcss` in package/lock files, following the installed Next.js CSS guide, to resolve the current `@theme` processing warning. Keep the user-owned `next.config.ts` change intact |
| 1A assets / Developer | Approved local assets under `public/images/`, with provenance/usage recorded; no fabricated customer or instructor claims |
| 1A Tester | `tests/e2e/public-site.spec.ts`, `tests/e2e/booking-preview.spec.ts`, `tests/e2e/public-accessibility.spec.ts`, affected traceability tests and existing scaffold checks deliberately updated to approved behavior |
| 1A orchestrator | `docs/iterations/1a.md`: packet, automated evidence, actual local startup/checklist and owner disposition; create only after 1A approval |
| 1B Developer | `src/app/enquire/page.tsx`, `src/app/api/v1/enquiries/route.ts`, focused `src/server/enquiries/` service/adapter files; exact persistence/configuration paths depend on the approved destination |
| 1B contract / one assigned writer | `contracts/openapi.yaml` and catalogue: approved `createEnquiry` schemas, requirement links and examples |
| 1B Tester | `tests/unit/enquiries/validation.test.ts`, `tests/contracts/enquiries.test.ts`, `tests/api/enquiries.spec.ts`, `tests/e2e/enquiries.spec.ts`, approved local fixture/reset helpers |
| Review / Planner and Critic | Read-only requirements/contract and architecture/security review; disclose runtime isolation limits |

The installed CSS guide recommends the PostCSS integration above. Validate compatibility with the exact installed packages before changing dependencies. Styling changes are a proposed 1A task; they are not applied during planning.

## Acceptance gates and local owner review

For 1A: approved or visibly draft factual content; clear booking focus; working navigation; usable approximately 390 px and desktop layouts; visible keyboard focus; 200% zoom/reflow; no dead destinations, fake availability, submission or reservation claims; no unresolved styling-processing warning for the reviewed design. Add relevant automated accessibility checks and record actual manual assistive-technology coverage without claiming exhaustive accessibility certification.

For 1B: approved contract and data policy; valid/invalid input tests; safe handling of malformed/oversized requests; durable synthetic receipt independently verified; no success on unavailable storage; notification-failure and duplicate/retry behavior tested; no public read access or client credentials; synthetic fixture cleanup limited to an identified disposable test store.

Both slices require relevant lint/type/unit/contract/build/API/E2E gates, independent review and then the owner's local review. Neither plan approval nor automated success counts as owner visual acceptance or publication approval. Record actual evidence and leave unavailable remote results pending.

When a slice is implemented and ready, supply a handoff following [manual-testing.md](manual-testing.md). Verify the exact commands at that time. Expected 1A preview setup uses the existing scripts, without a backend or credentials:

```powershell
Set-Location 'D:\Projects\stratadrive'
npm ci
npm start
```

Expected review URLs after implementation: `http://127.0.0.1:3000/` and `http://127.0.0.1:3000/book`. Keep the terminal open; stop with `Ctrl+C`. These are proposed future review destinations, not currently implemented Phase 1 screens. The final handoff must state changed behavior, candidate identity, setup requirements, synthetic inputs, expected outcomes, limitations and stop/reset instructions.

Owner checklist: visual appeal; accurate brand/copy; booking entry and preview expectations; desktop/mobile spacing; menu/navigation; keyboard/focus and zoom. Record **pending**, **changes requested** or explicit **accepted** for that candidate. After fixes, offer affected behavior for review again. Do not request a starter-page demo now.

## Decisions and implementation sequence

| Decision | Current position |
| --- | --- |
| Public design direction | Modern booking-focused customer site requested; palette/layout above proposed for local visual review |
| Business facts and assets | Service area, offerings, contact details, pricing, credentials and final copy TBD; use visibly draft content locally until approved |
| Live booking priority | Remains Phase 3 unless explicitly reprioritized; 1A preview does not reserve lessons |
| Enquiry destination | TBD: durable Supabase storage or approved durable delivery. Choice does not authorize provisioning |
| Data policy and operations | Minimum fields, privacy/retention/deletion, authorized access and failed-delivery monitoring TBD before 1B |
| Existing foundation gaps | Remote paired CI and successful enforced read-only verification remain pending; disclose these for any local prototype approval and retain production/secret prohibitions |

Recommended sequence: approve 1A scope/design direction and identify draft copy -> reserve files and extend traceability scope -> implement styling/public website/booking preview -> independent Tester/Critic review -> provide verified local handoff -> owner visual/manual acceptance -> decide 1B destination/privacy/abuse semantics -> approve 1B packet and any separately required environment setup -> implement and verify -> owner manual acceptance.

External CI activation, publication, infrastructure and deployment remain separate approvals. The original planning work made no application changes; approved 1A implementation now proceeds under its own iteration record. Operational enquiry and live-booking functionality remain deferred.

## Planning review and checks

Planner recommended separately approved visual and durable-intake slices. Tester specified independent responsive/accessibility, contract, persistence and failure-path evidence. Critic challenged false receipt/reservation claims, public data access and abuse/privacy decisions. Their recommendations above are independent planning analyses based on the supplied repository context, not new implementation tests or a full filesystem audit.

The standing manual-review requirement is approved by the owner's instruction and recorded in the repository instructions, four role definitions, `agent-workflow.md`, `manual-testing.md` and canonical `BR-ACCEPT-001 -> TR-LOCAL-001 -> TC-LOCAL-001` links. The manual procedure is defined; no Phase 1 feature has been manually accepted.

Planning-change validation: catalogue/traceability check passed; 52 affected role-packet and traceability unit tests passed; diff whitespace checks passed. No application server was started for this planning task. Existing application source and the user-owned `next.config.ts` content remain unchanged. Previous 0A full-suite results are historical foundation evidence, not Phase 1 functional coverage.

## Dated phase history

### 2026-10-24 — Plan prepared, implementation not started

The owner selected Phase 1 planning and clarified the customer-facing driving-instruction booking purpose and modern visual direction. Independent Planner, Tester and Critic analyses informed the proposed 1A website/booking preview and separately approved 1B enquiry intake. The owner-review guide and 52-test planning validation are recorded above. Business facts, storage/privacy decisions, functional implementation and owner visual acceptance remain pending.

### 2026-10-24 — Phase-history requirement recorded

The owner requested a clear history of progress and finished work on every phase. [The central history index](progress.md) now tracks current status and dated milestones. Future approved 1A/1B iteration records will link back to this plan and record their actual changes, tests, decisions, remaining work and owner feedback. This entry is a documentation change; it does not approve or begin Phase 1 functionality.

### 2026-10-24 — Phase 1A approved and implemented locally

The owner authorized the next step. [Iteration 1A](iterations/1a.md) records the homepage, booking preview, styling and traceability work. Developer/Tester subagents hit usage limits, so the orchestrator took over their explicitly reserved files; independent approval is not claimed. The local design uses a generated illustrative image with recorded provenance. Validation and owner visual acceptance remain distinct gates; see the iteration record for current outcomes.

### 2026-10-24 — Provisional visual approval and 1B local setup

The owner provisionally approved the look of 1A and asked to proceed, then selected Supabase durable storage, notifications later and local Docker development. These decisions supersede the earlier destination-TBD planning state. [Iteration 1B](iterations/1b.md) records local setup and the feature packet still to be finalized. Docker installation is blocked by a disabled Windows prerequisite; CLI installation/configuration alone is not a working database. Enquiry functionality and full owner/independent acceptance remain pending.

### 2026-10-24 — Local Supabase setup verified using approved Compose alternative

Windows prerequisites and Docker are ready. CLI isolation failures led to the owner selecting official Docker Compose. The bounded five-service setup now passes independent runtime isolation/permission checks, local Studio browser review and guarded stop/resume; 183 unit tests and repository checks pass. [Iteration 1B](iterations/1b.md) preserves the failed attempts, corrections, evidence and current manual handoff. Studio is left running for owner review; the enquiry feature packet and functional implementation remain pending. No cloud service or deployment was activated, and neither Phase 0 operational acceptance nor full Phase 1 acceptance is inferred.

### 2026-10-25 — Enquiry implemented and retained for owner review

The approved 1B synthetic enquiry feature is implemented and verified across all nine local gates (215 unit, 16 database, 7 HTTP and 25 browser tests). This supersedes the earlier planning/setup statements about an undecided destination, unapproved feature packet, absent implementation and setup-only 183-test evidence. The [iteration record](iterations/1b.md) retains the final candidate identity, actual execution reports, review limitations and manual walkthrough.

The owner explicitly selected **“Keep 1B ready for review.”** Root rechecked the homepage, booking preview, enquiry form and local Studio: all returned HTTP 200, with app/Studio listeners on loopback. Existing services and data were retained; this follow-up changed documentation only. Enquiry/manual acceptance remains pending. Notifications, real bookings, product authentication, real customer data and deployment remain outside the approved local feature scope.
