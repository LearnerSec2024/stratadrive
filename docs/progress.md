# Progress and phase history

This is the central history index for StrataDrive. Dates use Australia/Brisbane. See the latest dated handoff for candidate identity and GitHub publication status; local validation never implies remote pipeline results, deployment or owner acceptance. Detailed evidence lives in the linked records.

## Current phase status

| Phase | Current position | Record |
| --- | --- | --- |
| 0 — Foundation | Repository foundation implemented and locally validated; operational acceptance remains pending | [Iteration 0A](iterations/0a.md) |
| 1 — Public website and enquiries | 1A provisional visual approval; 1B synthetic enquiry implemented and locally verified across all nine gates. Ready for owner review; explicit acceptance pending | [Iteration 1A](iterations/1a.md), [Iteration 1B](iterations/1b.md), [Enquiry packet](iterations/1b-enquiry-packet.md) |
| 2 — CRM and enquiry workflow | Not started | [Roadmap](project.md) |
| 3 — Instructor availability and booking | Not started; live reservations remain in this phase unless reprioritized | [Roadmap](project.md) |
| 4 — Lesson records and competency assessments | Not started | [Roadmap](project.md) |
| 5 — Customer progress portal | Not started | [Roadmap](project.md) |
| 6 — Communications and automation | Not started | [Roadmap](project.md) |
| 7 — Multi-instructor operations | Not started | [Roadmap](project.md) |

## Dated history

### 2026-10-24 — HIST-001 — Foundation assessment and plan

- **Finished:** repository inspection and independent Planner, Tester and Critic assessment; consolidated Iteration 0A scope, roles, architecture, traceability, validation and governance proposal.
- **Decision:** owner authorized foundation implementation after reviewing the plan. GitHub remains authoritative; external infrastructure and deployments require separate approval.
- **Evidence:** [Iteration 0A record](iterations/0a.md) and [foundation ADR](adr/0001-foundation-boundaries.md). Initial assessment did not change repository files.
- **Next at that point:** implement the approved engineering foundation, preserving the existing user-owned `next.config.ts` change.

### 2026-10-24 — HIST-002 — Foundation repository implementation

- **Finished:** project documentation, four reusable role definitions and instruction dispatch, canonical requirement/test catalogue, OpenAPI scaffold, validators, independent test specifications and validation-only GitHub/Azure pipeline definitions.
- **Historical validation:** fresh install and full local chain passed: 117 unit tests, one HTTP smoke, one Chromium E2E smoke, lint, types, contracts and build. Detailed commands, evidence and review limits are in [Iteration 0A](iterations/0a.md); this is foundation coverage, not booking/enquiry functionality.
- **Preserved:** application source and the pre-existing `next.config.ts` content. The existing Tailwind processing warning remains documented.
- **Outstanding:** matching remote CI runs and comparison, successful enforced read-only verification, broader independent filesystem review and owner acceptance. Native role selection is unavailable in the installed transport; explicit instruction packets are used.
- **Status:** repository implementation finished; operational phase acceptance is not complete. No commit, push, publication or deployment was performed.

### 2026-10-24 — HIST-003 — Manual acceptance and Phase 1 planning

- **Owner direction:** every functional increment must be offered for local visual/manual review with clear steps; prepare the Phase 1 plan for a modern, appealing customer driving-instruction booking website.
- **Finished:** [manual-testing guide](manual-testing.md); standing instructions and role updates; approved `BR-ACCEPT-001 -> TR-LOCAL-001 -> TC-LOCAL-001` links; [Phase 1 plan](phase-1-plan.md) consolidated from independent specialist analyses.
- **Proposed design:** navy/off-white/blue, prominent booking entry, responsive homepage and a truthful booking-flow preview. Operational enquiries require a separate durable-intake decision. Live bookings remain Phase 3 unless reprioritized.
- **Historical validation:** traceability check and 52 affected role-packet/traceability tests passed; documentation links and preservation checks passed. No Phase 1 functional tests or owner acceptance are claimed.
- **Next:** obtain approval for the Phase 1A implementation packet. No application server was started for planning.

### 2026-10-24 — HIST-004 — Standing progress-history requirement

- **Owner direction:** always document progress and finished work on each phase for a clear reviewable history.
- **Finished:** this central index and retrospective milestones; progress-history rules in repository instructions, workflow and all four roles; phase-specific history sections; approved `BR-HISTORY-001 -> TR-HISTORY-001 -> TC-HISTORY-001` links.
- **Files:** `docs/progress.md`, `AGENTS.md`, `.codex/agents/*.toml`, `docs/agent-workflow.md`, `docs/project.md`, `docs/iterations/0a.md`, `docs/phase-1-plan.md`, `docs/requirements.yaml`, `README.md`.
- **Validation:** `npm run traceability:check` passed; 52 affected role-packet/traceability tests passed; updated documentation links and diff whitespace checks passed. These checks validate this documentation/governance update, not new application functionality.
- **Acceptance:** documentation process defined; no functional feature is being offered or accepted by this update. Phase 1A implementation and existing foundation operational gaps remain pending.

### 2026-10-24 — HIST-005 — Current local verification handoff

- **Owner request:** identify what can be run and physically verified now.
- **Finished:** checked the current scripts and starter source; expanded [the manual-testing guide](manual-testing.md#what-can-be-verified-now) with current browser startup, expected starter screen, individual foundation checks and the full HTTP/Chromium validation command.
- **Scope:** the starter and engineering foundation are runnable. The customer-facing design, enquiries and booking features remain planned; `/book` is not yet a feature to review.
- **Validation:** command names and expected starter content checked against current files. No new build/test run or server launch was performed for this instructional handoff; earlier execution evidence remains historical.
- **Owner manual review:** offered for current foundation verification; awaiting actual feedback, with no acceptance inferred. Phase 1A implementation still awaits approval.

### 2026-10-24 — HIST-006 — PowerShell local launch correction

- **Owner finding:** dependency installation succeeded, but `npm run dev -- --hostname 127.0.0.1 --port 3000` reached Next.js as positional values without the option names and failed with an invalid project directory.
- **Finished:** added fixed `dev:local` and `start:local` package scripts; updated README, manual-testing guide and the proposed Phase 1 startup example to avoid argument forwarding. Existing generic scripts, dependencies, application source and user-owned Next configuration are preserved.
- **Independent check:** Tester reviewed the proposed scripts and acceptance checks without editing files.
- **Validation:** actual `npm run dev:local` invocation preserved both flags and reached startup, then Next.js refused a second development server for the same project. The existing server was independently checked at `http://localhost:3000/`: HTTP 200 and expected starter heading. The existing server was left running; only check-owned processes were stopped. Production `start:local` was defined but not runtime-verified against the occupied port. Diff whitespace checks passed; the Next configuration blob remains `335ff79b406d2f9f4e4fd9d632c2a6c19719dfc5`.
- **Owner handoff:** open the existing local URL now. For a fresh run, stop the project server in its original terminal and use `npm run dev:local`; reinstalling dependencies is unnecessary for this script-only fix. Owner review remains pending and no Phase 1 feature is claimed.

### 2026-10-24 — HIST-007 — Owner confirms successful local startup

- **Owner evidence:** `npm run dev:local` preserved the hostname/port flags, reported `http://127.0.0.1:3000/` and reached Ready in 858 ms; `next.config.ts` loaded successfully.
- **Outcome:** the corrected local launch works in the owner's PowerShell terminal. Keep that terminal open and open the reported URL for browser verification; stop with `Ctrl+C` when finished.
- **Acceptance:** startup confirmed by owner-provided output. Browser/visual verification is still pending; no feature acceptance or Phase 1 completion is inferred.

### 2026-10-24 — HIST-008 — Phase 1A implementation

- **Owner approval:** proceed with the next step after the iteration workflow discussion; local 1A homepage and labelled booking preview only.
- **Finished:** [Iteration 1A record](iterations/1a.md), responsive public site, mobile navigation, FAQ disclosures, preview controls, generated illustrative hero/provenance, road-mark icon, PostCSS integration and explicit active-phase traceability.
- **Ownership:** Planner supplied a read-only packet review and the asset worker delivered the image. Developer/Tester subagents hit usage limits; their unfinished file reservations transferred explicitly to the orchestrator. The Tester had saved the phase-scope test migration. No independent implementation/Critic approval is claimed.
- **Validation progress:** unit/traceability checks and build passed; browser checks caught a contrast issue that was corrected. FAQ testing was adjusted to target the native disclosure element and exercise keyboard open/close. Integrated final results are recorded in the iteration after execution.
- **Review:** desktop and mobile browser screenshot artifacts were inspected. The in-app preview tool failed to initialise; owner browser review remains available via the documented local commands.
- **Remaining:** explicit owner manual acceptance, independent review when available, Phase 0 remote CI/read-only gates, real business facts and future enquiry/live-booking work. No external services, publication, commit or deployment were performed.

### 2026-10-24 — HIST-009 — Phase 1A validated and offered for local review

- **Finished:** coherent responsive homepage, real section navigation and FAQ disclosures, accessible mobile menu, `/book` three-step preview and local-only preference reset. Tailwind processing is fixed; user-owned Next configuration is preserved.
- **Actual validation:** full local chain passed, including 126 unit tests, 2 HTTP checks and 18 browser tests. Four scoped accessibility scans are clear; desktop/mobile screenshots were inspected. Both dev pages and icon returned HTTP 200. [Iteration 1A](iterations/1a.md) records the corrections, evidence paths and source digest.
- **Review limits:** app/test completion was by the orchestrator after subagent usage limits; independent Tester/Critic approval remains pending. In-app browser initialisation failed; actual Chromium automated checks and screenshot inspection succeeded. No comprehensive assistive-technology certification or owner acceptance is inferred.
- **Owner handoff:** run `npm ci`, then `npm run dev:local`; review `/` and `/book`, mobile navigation, visual design and the clearly disclosed preview/reset behavior. Stop with `Ctrl+C`. No backend keys or test customer information are needed.
- **Next:** await explicit owner visual/manual feedback. Operational enquiries, live reservations, external CI activation and unresolved Phase 0 gates remain deferred. Work remains uncommitted and unpublished.

### 2026-10-24 — HIST-010 — Owner preview connection recovered

- **Owner finding:** browser reported `ERR_CONNECTION_REFUSED` at the local review URL.
- **Diagnosis:** neither local hostname responded; a live StrataDrive dev process without a port-3000 listener blocked a fresh start.
- **Action:** verified the specific process/parent against the project path, restarted only that project tree and retained the new local preview for the owner's review.
- **Actual verification:** `/` and `/book` returned HTTP 200 with expected StrataDrive content; loopback listener on port 3000 confirmed. No application source or dependency changes; no full test rerun was needed for this runtime recovery.
- **Current handoff:** the local server is running; refresh the homepage or booking-preview URL. Owner acceptance and independent review remain pending.

### 2026-10-24 — HIST-011 — Owner confirms preview access

- **Owner evidence:** the preview opens at the reported `http://localhost:3000` and local-network address `http://192.168.148.1:3000`.
- **Outcome:** owner access is confirmed following runtime recovery. The network address is environment-specific and is not a public deployment URL or a new firewall/infrastructure configuration.
- **Acceptance:** access verified only. Visual design, navigation and booking-preview behavior still await the owner's explicit accepted/changes-requested disposition.

### 2026-10-24 — HIST-012 — Visual feedback and local enquiry-store decision

- **Owner direction:** “Looks good for now, let us proceed further”; Supabase storage, notifications later; local Supabase with Docker selected.
- **Acceptance:** provisional visual approval of 1A and permission to progress. Detailed manual checklist, independent implementation/security review and Phase 0 operational gates remain open; the whole phase is not accepted.
- **Finished:** read-only Planner review for 1B, [Iteration 1B record](iterations/1b.md), [local setup/recovery guide](local-supabase.md), pinned Supabase CLI 2.122.0 and initialized local configuration. The orchestrator is the sole writer for setup/shared files.
- **Actual setup evidence:** CLI version and initialization passed; npm installation reported zero vulnerabilities. WinGet downloaded Docker Desktop 4.96.3 and verified its hash, but its installer failed because `VirtualMachinePlatform` is disabled. This session lacks Windows administrator rights. Docker and the local database are not running; no persistence tests or enquiry functionality are claimed.
- **Review/checks:** independent read-only Planner and Critic reviews completed for this setup/preparation slice. Critic's configuration recommendations were applied. Existing traceability/contracts and 126 unit tests pass; CLI lock consistency, 47 documentation links, whitespace and user-owned Next configuration preservation pass. CLI start confirms Docker is absent; runtime isolation is unverified. Existing website remains listening on loopback port 3000.
- **Next:** owner enables the Windows prerequisite and restarts when convenient, then Docker engine/loopback stack validation can resume. Finalize the 1B contract/schema/test packet before feature code. No cloud link, migrations, deployment or automatic restart occurred.

### 2026-10-24 — HIST-013 — Restart checked; prerequisite remains disabled

- **Owner evidence:** WSL command reported success/reboot required, followed by confirmation of restart.
- **Actual checks:** last boot confirmed at 19:02 Brisbane time; WSL prerequisites remain unavailable and both relevant Windows optional features report disabled. Session remains non-administrator; Docker is still absent.
- **Finished:** updated [local setup recovery](local-supabase.md) with explicit administrator verification, DISM feature enablement without automatic restart, and state inspection before another reboot.
- **Status:** local database setup remains blocked on Windows feature enablement. No app/dependency/Windows feature changes or new runtime test results are claimed in this diagnostic step.

### 2026-10-24 — HIST-014 — Prerequisites enabled and Docker installed

- **Owner action:** ran the explicit Windows feature commands and restarted. Boot at 19:11 Brisbane time verified; both required features report enabled and WSL prerequisite errors have cleared.
- **Finished:** retried approved Docker Desktop 4.96.3 per-user installation. Installer hash verification and installation succeeded. CLI 29.9.2 and local named-pipe context verified, with no Docker endpoint overrides.
- **Pending:** Docker Desktop first-run setup by owner; engine probe currently finds no running engine pipe. Supabase has not started, and database health/loopback isolation are unverified. No app code, dependencies or migrations changed; no functional test rerun or new acceptance claimed.
- **History:** updated [Iteration 1B](iterations/1b.md) and [local setup guide](local-supabase.md). No automatic restart, cloud connection or deployment.

### 2026-10-24 — HIST-015 — Engine verified; Supabase isolation blocker found

- **Finished:** owner completed Docker first-run setup; local Linux engine/context verified. Tested standard CLI on a loopback-configured network and then the experimental Docker runtime.
- **Actual failure:** standard runtime published PostgreSQL on all interfaces; experimental runtime published containers on loopback but opened host gateways on all interfaces. Both stacks were stopped successfully with data retained. No isolated Supabase readiness is claimed.
- **Independent review:** Tester confirmed the experimental wildcard listener in installed source; Critic recommended a bounded official Compose alternative with rendered-model and runtime isolation gates. Reviews made no edits or stack mutations; isolation of reviewer access was procedural.
- **Next at that point:** owner choice on the [Compose setup packet](iterations/1b.md#approved-compose-setup-packet). Existing Docker/Windows work is successful; enquiry implementation remains pending. Setup guide marked the failed startup procedure as historical and unsafe to repeat here. No global settings, firewall, cloud or application changes were made.

### 2026-10-24 — HIST-016 — Compose development setup verified and ready for owner review

- **Owner decision:** use official Docker Compose. Developer owned only the pinned infrastructure files; Tester owned the new guard test file; Critic remained read-only; orchestrator integrated lifecycle scripts, shared manifests/traceability and documentation.
- **Finished:** five-service local Supabase derivative, twelve hashed setup artifacts, fresh private development credentials, guarded init/preflight/start/check/stop and [current manual guide](local-supabase.md). No app feature or enquiry schema/API was added.
- **Corrections:** required upstream role/bootstrap dependency added; failed original volume retained; post-image grant restoration handled by pinned transactional hardening before enabling remaining services. Review findings on inherited PUBLIC grants, mount escapes, artifact coverage and recovery shutdown were resolved.
- **Actual checks:** lint/types/traceability/contracts and 183 unit tests pass, including 57 independent guard cases. Independent runtime verification confirms all five healthy, only loopback ports, read-only SQL and expected access denials. Local Chromium Table Editor check passes, screenshot inspected. Actual stop/resume retains cluster identity and passes all checks; stack left running for owner review.
- **Evidence/acceptance:** [Iteration 1B](iterations/1b.md) records source digest, exact files, reports, fixes and manual checklist. Owner Studio acceptance is pending; business enquiry persistence is not implemented/tested. No cloud, infrastructure deployment, Git commit/push or new remote CI result.

### 2026-10-25 — HIST-017 — Docker screenshot and Studio access rechecked

- **Owner evidence:** screenshot shows Docker Desktop's project/container log view, rather than the browser-based Studio dashboard.
- **Read-only verification:** local Docker context and no endpoint overrides confirmed; all five StrataDrive containers are healthy, with published ports still limited to loopback. Studio root redirects locally and `/project/default/editor` returns HTTP 200.
- **Handoff:** open `http://127.0.0.1:54323/project/default/editor` in the browser and check the synthetic-only empty Table Editor. Visible historical log warnings do not establish a current service failure; current health and HTTP checks pass.
- **Acceptance:** no restart, configuration change or new functional implementation. Owner Studio/manual acceptance remains pending; Docker Desktop access alone is not that acceptance.

### 2026-10-25 — HIST-018 — Studio confirmed and primary launch standardized

- **Owner evidence:** Studio opened and the supplied screenshot matches the synthetic-only empty Table Editor. Access/empty-screen check confirmed; optional SQL/full feature acceptance not inferred.
- **Owner request/finished:** `npm start` now launches local development at loopback:3000. Added explicit `start:production`/`start:test`, updated Playwright to keep production-mode testing, preserved aliases, and expanded README into the current manual command/URL index. Updated standing/current manual instructions and iteration records. Orchestrator was the sole writer; Tester reviewed read-only.
- **Actual checks:** real npm start plus homepage/booking HTTP 200; two HTTP tests and one Chromium smoke passed via the production `start:test` server using the existing build. Targeted lint, traceability, 37 documentation links, lock consistency, whitespace and user Next-config preservation passed. No new application/dependency/database changes or fresh full-suite/build claim.
- **Handoff:** the check-owned app server was stopped so the owner can run `npm start` in their own terminal; Supabase was not restarted. Keep the terminal open and stop with Ctrl+C. [README](../README.md) holds current commands and links; the [1B record](iterations/1b.md) preserves evidence and remaining work.

### 2026-10-25 — HIST-019 — Enquiry feature packet prepared for approval

- **Owner direction:** proceed with next steps after the npm-start/README update.
- **Finished:** [concrete 1B enquiry packet](iterations/1b-enquiry-packet.md) with field/contract semantics, least-privilege private storage, retry/quota/timeout/logging rules, isolated tests, shared CI changes, exact file ownership and future manual review. Linked it from README, the phase plan and 1B record.
- **Independent planning:** Planner, Tester and Critic reviewed read-only; root consolidated routine defaults and documented remaining public-launch decisions. Critic's clarifications about provisioning logs, timestamp meaning and explicit API replay procedures were incorporated. No separately enforced reviewer filesystem boundary is claimed.
- **Scope:** planning documentation only. Canonical API/catalogue, application code, dependencies, migrations, credentials, containers and data are unchanged. Historical setup/test passes are not enquiry coverage. Current AGENTS excludes feature APIs/migrations until the packet is approved.
- **Next:** owner reviews/approves the packet, then canonical contract and implementation/test handoffs can proceed. Notifications, reservations, login, deployment and real customer information remain excluded.
- **Planning validation:** 67 documentation links/whitespace checks pass; canonical business paths remain empty and proposed implementation files absent. Final packet review clarifications were incorporated. No new feature test/build/runtime result is claimed.

### 2026-10-25 — HIST-020 — Approved enquiry implementation and validation continuation

- **Approval/candidate:** owner-approved 1B enquiry packet, resumed by “go now”; existing uncommitted working tree based on `95c2c019ab9fc18728c9dfff1396973d0d505ef7`. Historical planning statements above are superseded by implementation, not rewritten as past execution.
- **Implemented:** `/enquire`, navigation/form/draft/retry state, canonical `POST /api/v1/enquiries`, private migration/execute-only app role, atomic receipts/idempotency/quota, guarded development preparation and separate test target. Root integrates contracts/generated schema/shared scripts/configuration; Developer owns application fixes; independent Testers own assigned tests.
- **Actual checks so far:** production build and canonical contract/schema checks passed. `enquiries:local:prepare` passed and `/enquire` returned HTTP 200 with the sample-only form; app and Studio are available on loopback ports 3000 and 54323 at this check. New unit tests exposed a name-control-character regex defect, corrected in canonical/generated schemas; the affected test now passes. Integrated database/API/browser execution remains in progress.
- **Review:** procedural Critic identified test-run ownership/cleanup and inherited-config gaps plus request-target and Unicode browser-limit issues. Fixes and independent guard tests are under verification. Sandbox helper and child approvals failed; no enforced read-only reviewer boundary is claimed.
- **Handoff:** owner asked what changed/how to test. [README](../README.md) and [manual walkthrough](manual-testing.md#enquiry-review) now give exact preparation, URLs, sample details, private-row inspection, retry/outage/restart, cleanup and shutdown steps. These instructions and incomplete validation do not constitute feature acceptance. No remote activation, publication, deployment, real data or external settings changes.
- **Remaining:** execute all nine gates, resolve findings, final independent review and explicit owner manual disposition. Owner acceptance **pending**.

### 2026-10-25 — HIST-021 — Enquiry candidate verified and manual walkthrough ready

- **Finished:** integrated the approved local enquiry feature and independent tests; corrected control-character validation, explicit uncertain-save copy, Unicode input truncation, request-target gating, test-run identity/cleanup ordering, existing-container/volume ownership, inherited test configuration and bounded/private administrator sessions. PostgreSQL primary error text leaked a synthetic canary during the first privacy test; project logging now suppresses those messages, and the original canary assertion passes unchanged. Playwright module boundaries and precise accessible locators were corrected without weakening business assertions.
- **Final execution:** `npm run ci:validate` passed all nine required gates on the integrated candidate: lint, types, traceability, contracts/generated schema, **215 unit tests**, production build, **16 real database tests**, **7 HTTP tests**, **25 browser tests**. Required suites were executed, not skipped. The scoped test project was stopped and matching run resources cleaned in `finally`; development rows were retained. This is local evidence, not remote GitHub/Azure parity.
- **Manual/visual evidence:** refreshed development preparation passed; a separate agent-created standard synthetic sample returned 201 then 200 with the identical receipt, was found through the guarded receipt helper, and was removed only through matching scoped cleanup. Desktop 1440 px and mobile 390 px screenshots were inspected. Reports: `reports/source-identity.json`, JUnit/Playwright results, `reports/enquiry-manual-command-check.json`, `reports/enquiry-desktop.png`, `reports/enquiry-mobile.png`.
- **Candidate/review:** uncommitted baseline `95c2c019ab9fc18728c9dfff1396973d0d505ef7`; the exact 91-file code/assets/contracts/tests/config list and SHA256 digest `29168fa50f992ff18df677140913a6b02ad79e4be849a3803e3ec1718e801141` are in `reports/iteration-1b-enquiry-source.json`. Narrative history is excluded from that digest. Independent source review has no remaining blocker within its reviewed scope. Reviewer restrictions were procedural. The user-owned Next configuration remains Git blob `335ff79b406d2f9f4e4fd9d632c2a6c19719dfc5`.
- **Handoff/remaining:** [README](../README.md) indexes commands; [the manual guide](manual-testing.md#enquiry-review) supplies synthetic form, private-row, restart/retry, outage, mobile/keyboard/zoom, cleanup and shutdown checks. The existing owner development server and refreshed development DB were retained; the QA server on 3100 was stopped. **Owner acceptance pending**. Remote CI activation/parity, public business/privacy decisions, real data, notifications, authentication, bookings and deployment remain outside this completed local verification; no dependent functional increment is accepted or started.

### 2026-10-25 — HIST-022 — Owner retains the verified 1B review candidate

- **Owner disposition:** **“Keep 1B ready for review.”** Manual acceptance remains pending; no dependent feature increment is started.
- **Readiness:** read-only checks returned HTTP 200 for homepage, `/book`, `/enquire` and Studio Table Editor; app/Studio listeners remain loopback-only. Existing processes and records were retained. Evidence: `reports/iteration-1b-review-readiness.json`.
- **Documentation:** corrected the phase plan's stale current-status summary and appended a dated superseding entry, preserving original planning/setup history. Root was the sole writer for the plan and shared records; procedural read-only audit confirmed the minimal approach.
- **Validation boundary:** 59 local documentation targets and `git diff --check` passed. Implementation/source digest and prior nine-gate results are unchanged. No application/configuration change, submission, restart, new functional test run or external action was needed. Current handoff is in [README](../README.md) and [the manual guide](manual-testing.md#enquiry-review); remaining work is the owner's walkthrough and feedback.

### 2026-10-25 — HIST-023 — Cumulative 1B Excel baseline and recurring workbook rule

- **Owner request:** after each iteration, save an Excel feature/purpose/manual-step/expected-result workbook under `tests/manual/`. Clarification: 1B must include all features delivered so far, establishing the cumulative 0A/1A/1B baseline.
- **Delivered:** `tests/manual/iteration-1b-manual-tests.xlsx` contains **24 features, 30 cases and 81 numbered steps** across Features, Manual Tests and Setup, with editable human results/evidence/tester/date fields. All manual results start **Not run** and owner acceptance remains **Pending**. Prepared remote CI definitions and automated-only security/capacity checks are identified honestly.
- **Future handoffs:** recorded the recurring workbook requirement in `AGENTS.md`, README, the manual guide/workflow and `tests/manual/README.md`. Later files retain applicable baseline/regression coverage, add/revise iteration changes and preserve prior workbooks/results. Root was the sole artifact/shared-document writer; Tester supplied procedural read-only content review.
- **Verification:** spreadsheet recalculation/input-change checks, zero formula errors, export/reimport, rendered-sheet visual QA and native package verification of filters/panes/dropdowns passed. Verified 81 local document/workbook links and whitespace. Final workbook SHA256 is `fd108fc411462779b31469be4b0d0d97db7e8a1d0962ef4a86d9896e8137c42b`; artifact evidence is under ignored `reports/manual-workbook-1b/` and detailed in [Iteration 1B](iterations/1b.md).
- **Boundary:** no application/database/runtime/dependency/external change or new functional test execution. Prior functional test evidence remains historical for its reviewed implementation; this workbook does not mark the owner's manual acceptance complete.

### 2026-10-26 — HIST-024 — Local Studio restored after Docker was stopped

- **Owner report/diagnosis:** Studio Table Editor refused connections on port 54323. Website port 3000 remained listening; Docker Desktop/backend processes and all three local database/Studio listeners were absent.
- **Recovery:** launched installed Docker Desktop in the background. Initial preparation failed; after local engine preflight passed, the approved guarded `enquiries:local:prepare` completed. Existing development data/credentials/volumes and website server were retained. Root alone maintained the manual guide, this history, [Iteration 1B](iterations/1b.md) and the ignored credential-free recovery report.
- **Verification:** five healthy local containers, guarded database/API/Studio checks, HTTP 200 for exact Table Editor and all three website routes, and loopback-only listeners on 3000/54321/54322/54323. Evidence: `reports/iteration-1b-studio-recovery-2026-10-26.json`. Studio and website remain running. No sample submission/deletion or application/test/dependency change; no new full-suite claim.
- **Handoff:** added Studio-specific connection-refused guidance to [manual testing](manual-testing.md#if-the-browser-reports-connection-refused), reviewed procedurally from supplied excerpts. Refresh Studio and select `enquiry_private.enquiries`. Workbook/human results were not edited; owner acceptance remains **Pending**. No new functional increment or external action.

### 2026-10-26 — HIST-025 — Startup instructions moved to the first workbook tab

- **Owner request/delivery:** added **Start Here** as the first and initially active tab in the cumulative 1B manual workbook. Its 13 steps cover prerequisites, conditional installation, all required service startup, terminal use, exact review URLs and expected readiness before tests. Service ports, recovery, isolated automation and shutdown are included.
- **Preserved:** existing 24 features, 30 cases, 81 test steps, human result/notes/tester/date fields and acceptance status. Only the directly affected Features navigation text changed. Root exclusively maintained the workbook, manual guide/index, AGENTS and shared history; read-only content review used supplied context.
- **Verification:** spreadsheet rendering/recalculation and saved-file reimport passed; zero formula errors; original values/formulas match except Features A5. Native package checks preserve original test/setup parts, tables, validation, shared strings and existing style definitions. First/active tab verified. File is 29,781 bytes, SHA256 `38814a14dfbc120186199e960a0988649418e2aa96ad3a79229aa1b7830d94c3`. Detailed evidence is in [Iteration 1B](iterations/1b.md) and ignored `reports/manual-workbook-1b/startup-edit/`.
- **Standing handoff/boundary:** future workbooks begin with current startup/readiness guidance. No application, dependency, test or service lifecycle change and no new functional-suite claim. Manual owner acceptance remains **Pending**.

### 2026-10-26 — HIST-026 — One maintained technology-stack reference

- **Owner request/delivery:** consolidated current technology information into [Technology stack](tech-stack.md), with a visual diagram, versions, purposes, implementation/configuration sources, local services, tooling, CI status and deferred choices.
- **Consolidation:** README/current product/architecture/database/testing/workflow guides link to the reference. Removed competing inventories and corrected stale future-storage/empty-contract wording. Preserved operational instructions and historical ADR/iteration entries. AGENTS/workflow now require the reference, diagram/date, affected instructions and history to change together when the approved stack changes.
- **Ownership/checks:** root alone maintained the assigned documents and ignored evidence, based on the existing uncommitted `95c2c019ab9fc18728c9dfff1396973d0d505ef7` tree. Verified 18 locked dependency versions, runtime pins, five container image tags/ports, local links/anchors and whitespace. Procedural excerpt-based Critic review found no material blocker; client-form diagram wording was clarified. Detailed scope/evidence: [Iteration 1B](iterations/1b.md), `reports/tech-stack-consolidation/verification.json`.
- **Boundary:** documentation only; no application/configuration/dependency/test/workbook change, service lifecycle, new functional-suite execution or external action. The existing manual workbook/results are retained and owner feature acceptance remains **Pending**. The canonical reference now owns the current explanatory inventory; executable source remains authoritative for actual versions.

### 2026-10-26 — HIST-027 — Quick-scan stack lists above the detailed reference

- **Owner request/delivery:** [Technology stack](tech-stack.md) now starts with version-free grouped lists for local tools, frontend, backend, database, testing and source control/CI, with relevant local URLs. The existing visual diagram, version tables and technical explanation follow under Full details.
- **Preservation/checks:** root exclusively maintained that reference, this index, [Iteration 1B](iterations/1b.md) and ignored layout evidence, based on the existing uncommitted baseline. Snapshot comparison verifies detailed content is preserved except heading levels and maintenance wording; summary checks, source-version/image checks, links/anchors and whitespace pass. Procedural read-only review found no material blocker.
- **Boundary:** layout/documentation only; no app/configuration/dependency/service/manual-results change or functional-suite rerun. The single reference's maintenance rule covers both the summary and full details; owner feature acceptance remains **Pending**.

### 2026-10-26 — HIST-028 — Visual API contract reference generated

- **Owner request/delivery:** the saved canonical API definition is `contracts/openapi.yaml`. Generated a local visual reader at `reports/api-reference/index.html`; [the contract guide](../contracts/README.md) provides navigation and regeneration instructions and is linked from README. The source currently defines one business operation, `POST /api/v1/enquiries`.
- **Verification:** offline Chromium opened the file, navigated to the operation and displayed request/response details without script errors. Screenshots were inspected; the optional external branding-image GET was blocked, and no API requests were sent. Report includes source identity and operation/schema inventory at `reports/api-reference/verification.json`. Local links/whitespace passed. Procedural read-only review checked freshness and isolated-server/owner-server wording.
- **Boundary:** root alone maintained assigned documentation/ignored outputs on the existing uncommitted baseline. Canonical contract, app/configuration/dependencies and manual workbook/results are unchanged; no services started, samples submitted, full suites rerun or external activation performed. Owner feature acceptance remains **Pending**.

### 2026-10-26 — HIST-029 — Importable Postman manual API files

- **Owner request/delivery:** saved `postman/stratadrive-api.postman_collection.json` and `stratadrive-local.postman_environment.json` for the existing enquiry API, with 11 manual scenarios, synthetic samples, canonical response examples/assertions and stable key/receipt handling. The local environment uses port 3000 and contains no credentials. [The guide](../postman/README.md) covers setup/import/order, expected outcomes, retry/new intent, exact scoped cleanup and shutdown.
- **Integration:** README/contract guide link the imports; the single stack reference adds Postman as an external manual client without claiming it is installed. Root owns these artifacts/documents/history; Tester alone authored the assigned ignored validator/evidence, and Critic supplied read-only excerpt review. Existing dirty application/configuration work and manual workbook/results were preserved.
- **Verification:** root executed the independently authored official-schema/local-script validator: **51 passed, 0 failed** after exact field-error and UTC receipt checks plus pre-skip diagnostics were corrected. Local links/anchors/whitespace and final artifact identity checks passed. Evidence: `reports/postman/validation.json`, `reports/postman/source-identity.json`; detailed history in [Iteration 1B](iterations/1b.md).
- **Boundary:** no native Postman import or live API execution is claimed; no app/API/dependency/service change or functional-suite rerun. Manual results and owner feature acceptance remain **Pending**. Quota filling, intentional outages, destructive reset and external activation are not part of the normal collection.

### 2026-10-26 — HIST-030 — API/Postman maintenance rule and workbook API testing section

- **Owner request/delivery:** recorded ongoing contract/Postman alignment for approved API changes and added **Start Here → API testing with Postman** to the 1B manual workbook. Its 11 instruction rows include four file links, import/environment/target details, synthetic input, request order/expected outcomes, stable retry, result recording and scoped cleanup.
- **Maintenance:** AGENTS/workflow plus contract/Postman/manual guides require canonical API, client requests/examples/assertions/source identity, applicable environment defaults, generated outputs and current workbook coverage to change together. Preserve older results and current Postman keys/receipts before reimport.
- **Preservation/checks:** owner saved/closed the locked workbook before editing. Root was the sole assigned writer. Actual saved test/result/acceptance fields and all other-sheet values/formulas were compared unchanged; 13 original native package parts and original styles remain intact. Recalculation/error scan, saved reimport, rendered API/recovery review, relative file targets, documentation links/anchors and source identities passed. Evidence/details: [Iteration 1B](iterations/1b.md), `reports/manual-workbook-1b/api-testing/`.
- **Saved/boundary:** workbook is 32,209 bytes, SHA256 `96ab9368b8d96ffe43c794aae617aa4eff048a4ba835e259d159a850e53a5ca3`. Procedural content review found no blocker. No app/API/Postman JSON/dependency/runtime change, live request or new functional-suite execution; existing human results and acceptance are preserved.

### 2026-10-26 — HIST-031 — Staged QA process and Contract Tests review checkpoint

- **Owner direction:** stop further functionality; maintain the suite before each iteration/major-feature closure; require a dedicated Playwright execution guide; build/review one category tab at a time. AGENTS/workflow/manual guides now record the exact format, closure checklist and CT/API/UI/A11Y/DB/SEC/SYS/PW sequence.
- **Stage 1 delivery:** added only **Contract Tests**, after Start Here, with **23 cases / 56 numbered steps**, existing feature mappings, concrete commands/fixtures and the exact 11 columns. New results are Not run; human evidence/tester/date remain blank. The complete formatted review table is under `reports/manual-workbook-1b/contract-tests/contract-tests.md`. Existing sheets/results are preserved.
- **Verification:** all 39 embedded local fixture probes passed; contract/traceability commands passed; three relevant offline specs passed 56 automated tests. Recalculation/input-change, saved import, native table/filter/validation/style relationships and rendered long-command layout were checked. These checks do not mark manual cases passed. Root is the sole writer; read-only review was procedural and excerpt-based. Detailed evidence is in [Iteration 1B](iterations/1b.md).
- **Saved/next gate:** workbook is 46,148 bytes, SHA256 `fd251164a4973b966cee9471388e2ac0c5f70a04365c959e37f5ab6f88429e1c`. **Await explicit owner review/confirmation before API Tests.** The future PW guide/index/traceability migration remains gated; this checkpoint does not close an iteration. No new functionality, live request, service mutation, external action or owner acceptance was performed.

### 2026-10-27 — HIST-032 — Contract table approved; API Tests review checkpoint

- **Owner direction:** “Contract tests look good, proceed with next tab.” Recorded CT table-content approval separately from execution/feature acceptance. Only the next **API Tests** category was authorized; current-stage wording in manual/workflow guides now matches.
- **Delivered:** added **API-001–API-029 / 67 steps** after Contract Tests, using the exact 11-column template, feature mappings, Postman/cURL instructions, concrete synthetic payloads, boundary/status/header/idempotency checks, restart/controlled 503 recovery and identified isolated automated fault evidence. All new results are Not run with blank human fields. Existing five sheets/results/native tables/styles are preserved. The complete formatted table is `reports/manual-workbook-1b/api-tests/api-tests.md`.
- **Verification:** offline PowerShell parsing/mocked-request fixtures, Postman **51/51**, validation/adapter unit tests **10/10**, recalculation/input-change/error scan, rendered review, saved reimport and native filter/pane/dropdown/style/preservation checks passed. Root was the sole writer; critic review was procedural and inventory/excerpt-based. No live API/service action, native Excel/Postman execution, full HTTP/DB rerun or new functionality is claimed. Details: [Iteration 1B](iterations/1b.md).
- **Saved/next:** workbook is **63,190 bytes**, SHA256 `2b12e3dce311e61715f0e8970935da9ddf94a5f5d59f25a2e886ba5ebf1d0955`. Stop for explicit API-tab review before Functional UI Tests. Later category/index/traceability work remains gated; owner enquiry acceptance is still Pending and this is not iteration closure.

### 2026-10-27 — HIST-033 — Functional UI Tests review checkpoint

- **Owner scope:** approved completing the next tab after the API handoff. Delivered **Functional UI Tests only**, preserving the staged review gate before A11Y. Authorization to continue is separate from manual execution and feature acceptance.
- **Delivered:** **UI-001–UI-037 / 101 steps**, exact 11 columns and feature mappings, covering homepage/navigation/FAQ/booking-preview regressions and enquiry validation, real saves, transient drafts, pending/retry/different-intent/error/recovery flows. The removable [synthetic browser fixture](../tests/manual/fixtures/iteration-1b-ui-fixture.js) provides deterministic failure states without API forwarding or false success; cases distinguish simulated, real and automated evidence. Full formatted table: `reports/manual-workbook-1b/ui-tests/ui-tests.md`.
- **Verification:** fixture lint, 25 offline fixture checks, 17 mode-command parses, four PowerShell parse units and mocked recovery/report-setting restoration passed. Recalculation/status-change/error scan, rendered layout, saved import and native table/filter/pane/dropdown/style/preservation checks passed. Six original workbook sheets and human results are unchanged. Root was the sole writer; read-only review used supplied source facts procedurally. No new browser/full-suite pass or service/database mutation is claimed; local page readiness was unavailable. See [Iteration 1B](iterations/1b.md).
- **Command clarity:** manual guide now explains standalone `all` report filenames versus selected API/E2E prefixes; new UI instructions explicitly select/restore `e2e`. The earlier API worksheet is preserved at this stage.
- **Saved/next:** workbook is **84,195 bytes**, SHA256 `55ae8a8e46a09c2e1a4f1be1a0f51defe656da72d4b57db146a8e12d1a974152`. New results remain Not run. Stop for explicit UI-tab review before Usability & a11y Tests. Owner enquiry acceptance remains Pending; this is not iteration closure.

### 2026-10-27 — HIST-034 — Postman setup and one-sample walkthrough

- **Owner request/delivery:** expanded **Start Here → API testing** to 27 instruction rows covering tools/install/workspace, service readiness, collection/environment import, existing-state preservation, method/URL/No Auth/header/JSON, one sample Send, actual response/Test Results, retry, troubleshooting and scoped cleanup. The [Postman guide](../postman/README.md) provides matching beginner instructions. No category tab was added or revised.
- **Verification:** source-matched request/environment settings, **51/51 offline Postman checks**, recalculation/error scan, rendered review, saved import and native link/startup-row/style/other-sheet preservation checks passed. The owner saved/closed an in-use workbook before root took a fresh snapshot and completed the exclusive-lock/hash-guarded save. All six other sheets and recorded results/acceptance are preserved; canonical/API/Postman JSON are unchanged. Detailed evidence and limits: [Iteration 1B](iterations/1b.md).
- **Saved/boundary:** workbook is **86,843 bytes**, SHA256 `7661094e97b9c62af3da9da891d7af1e7d296c9cb981a4d21e8016f7026bb531`. No installation, service mutation, native Postman import/live sample execution, new functionality or manual acceptance is claimed. Existing UI/A11Y and subsequent review gates remain in force.

### 2026-10-28 — HIST-035 — One-command Windows review startup

- **Owner request/delivery:** consolidate Start Here steps 1–12, including Docker Desktop. Added `npm run review:local`, with guarded local-engine startup, conditional locked installation, development database preparation/checks, unchanged `npm start`, four-page HTTP readiness, browser opening and a second PowerShell 7. Detailed steps remain available; Studio table selection and visual review remain manual. Scope and ownership: [startup packet](iterations/1b-startup-packet.md).
- **Verification:** 40 independent safety tests passed; focused lint, actual occupied-port refusal with the original listener retained, traceability and whitespace passed. Live startup completed with HTTP 200 from all four pages; browser/terminal launch calls succeeded. The smoke stopped only its app and confirmed port 3000 free/no development lock. Development data/services were retained. Subsequent startup skipped dependency installation. Evidence and exact candidate identity: [Iteration 1B](iterations/1b.md#2026-10-28--one-command-local-review-startup), `reports/start-review/`.
- **Review/boundary:** final procedural read-only Critic review found no remaining blocker after lifecycle/lock/PowerShell corrections. Keyboard Ctrl+C, page appearance, native Excel review and explicit owner acceptance remain Pending. No API/contract/Postman JSON, app source, dependency version, external setting or deployment change; no full-suite pass or enquiry submission is claimed. Workbook Start Here guidance is updated without authorizing another category or changing recorded results.

### 2026-10-28 — HIST-036 — Public GitHub peer-review snapshot prepared

- **Owner scope:** requested pushing the current project for peer review. After initially selecting private visibility, the owner explicitly authorized the existing public `LearnerSec2024/stratadrive` repository when root identified the mismatch. No upload occurred before that clarification. Root configured its Git origin; repository creation and visibility changes were not performed by this session. Scope/ownership: [peer-review packet](iterations/1b-github-review-packet.md).
- **Prepared:** preserved all existing 0A/1A/1B source, the pre-existing `next.config.ts` and saved manual results. Added Office lock-file ignoring and peer-clone instructions. The first full validation exposed the startup helper's generic timer callback type; root narrowed its default wrapper to the actual milliseconds-only usage without changing independent assertions. Root alone owns these corrections, shared history and integration.
- **Actual validation:** independent Tester reran `npm run ci:validate`; all nine gates passed: lint, typecheck, traceability, contracts, **255 unit/tooling/contract tests, production build, 16 database tests, 7 HTTP tests and 25 Chromium tests**. The initial typecheck failure is preserved separately. Scoped cleanup completed; port 3100 is free, test containers are stopped and data is retained. Executable source stayed frozen; only declared README/packet documentation changed during execution.
- **Review/evidence:** procedural read-only Critic found no blocking publication issue; source exclusions/credential indicators, validation-only CI, local Postman state and saved workbook package were checked. Evidence remains local under `reports/github-review/` and the existing test-report paths. The 129-file frozen manifest includes workbook SHA256 `ca040588d0f9743ec6fa7b65aa398b03a712461f11cb43a8189915277dc9e22c`, unchanged by this task. These are uncommitted local-candidate results based on `95c2c019ab9fc18728c9dfff1396973d0d505ef7`, captured before origin configuration, not remote CI.
- **Staged review:** the full staged whitespace check reports one existing extra blank line at `src/components/site/booking-preview.tsx:37`. Root retains that previously delivered application file unchanged rather than widening this publication task; it is a cosmetic advisory, with lint/types and the full functional chain passing. The publication task's changed files pass their scoped whitespace check.
- **Commit-preparation checkpoint:** source is ready to commit and push without force to the owner-approved public repository. Record the actual commit/remote receipt separately after the operation; do not infer it from this preparation entry. Remote GitHub/Azure evidence, manual feature acceptance and the remaining staged QA categories stay Pending. This peer-review snapshot does not close Iteration 1B or authorize deployment.

## How history is maintained

Follow [the workflow history rule](agent-workflow.md#progress-and-phase-history). The index contains concise milestones and current status; detailed phase/iteration entries contain changes, decisions, validation and owner feedback. Create a phase/iteration record when work starts, rather than creating empty records for all future phases. Preserve dated entries and link corrections or superseding decisions.

Before each handoff, update the relevant record and this index. Distinguish planning, implementation, verification and explicit owner acceptance. Never infer that unfinished phases are complete or convert historical test results into evidence for newer code.
