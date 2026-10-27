# Architecture and API standards

Use a modular monolith: thin HTTP/UI adapters call shared application services behind a server-only data-access boundary. The implemented enquiry path follows this structure. [Technology stack](tech-stack.md) owns the current component/version inventory, visual diagram and implementation status; this document owns architectural and API rules.

Implement additional boundaries when approved features need them; avoid empty abstractions without a concrete use.

Server Components can call shared services directly; avoid self-HTTP requests. Browser/external business mutations use contracted HTTP operations. Do not introduce undocumented parallel Server Action mutations. Any later alternative requires an explicit contract/testing decision.

Authentication establishes identity, not permission. Authorization must cover capabilities, business membership and access to each resource. Instructors are members/resources of the business; instructor assignment is distinct from record ownership and learner visibility. No hard-coded owner identity. Multi-business tenancy remains a separate decision.

Database changes require versioned migrations, RLS and application authorization, synthetic fixtures, denial tests appropriate to the approved identities/roles and separate development/test/production environments. Privileged clients are narrowly scoped and server-only. See [security](security.md). Product identity/cross-user controls remain future work until their feature scope is approved.

## Canonical HTTP contract

[contracts/openapi.yaml](../contracts/openapi.yaml) is the business HTTP source of truth and currently defines `createEnquiry`. Runtime and document-validation technologies are listed in [the stack reference](tech-stack.md#contracts-validation-and-development-tooling). Execution evidence remains separate from contract conformance.

For every operation require:

- A stable unique `operationId`, `x-requirement-ids`, explicit authentication/public access, request and response schemas, media types and status codes.
- Documented errors, input bounds, identifier and pagination conventions, UTC timestamps and explicit business timezone rules where relevant.
- Runtime input validation and independent response/behavior assertions. TypeScript types alone do not validate network payloads.
- Contract-derived or contract-checked client types; generated outputs must not become a competing source of truth.
- A compatibility review for removed operations/fields, narrowed inputs, changed status codes and authorization changes; inspect diffs on every contract change before adding an automated breaking-change tool.

Do not load remote schema references in foundation validation. Component payload validation uses AJV's JSON Schema 2020-12 implementation with format checks. OpenAPI linting validates the document; payload validation targets the component schema, not the complete OpenAPI document.

Requirements live once in `requirements.yaml`. BR outcomes map to TR/NFR entries, operation IDs (or reasoned N/A), TC identifiers and files. Execution artifacts are separate evidence: `approved` does not mean verified. The initial validator rejects `verified` claims until an execution-evidence schema is introduced. Future-phase requirements can be proposed with planned tests; coverage for the active approved increment must be explicit.

Read the installed Next.js `data-security`, `backend-for-frontend`, Route Handler and testing guides before implementation. These are authoritative for the installed version.
