# Controlled agent workflow

Four reusable role files live in `.codex/agents/`. The lead orchestrator assigns bounded tasks and consolidates evidence; it is not a fifth specialist implementation role. With four total execution slots, at most three specialists run alongside the orchestrator.

| Role | Output | Write boundary |
| --- | --- | --- |
| Planner | Requirements, decisions, API proposals and implementation packets | Read-only; an assigned writer persists approved proposals |
| Developer | Approved implementation and validation evidence | Exact assigned files only |
| Tester | Independent tests, reproductions and results | Assigned tests, fixtures and test configuration only; no application fixes |
| Critic | Severity-ranked architecture/security/quality findings | Read-only; no self-fixes |

## Permissions

Verified baseline: `codex-cli 0.164.0-alpha.11.1`; multi-agent support is enabled. Standalone role TOML requires `name`, `description` and `developer_instructions`. Model settings inherit by default. See [official subagent documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents).

Runtime limitation found by two ephemeral read-only CLI checks: this installed transport exposes `collaboration.spawn_agent` with task name and message but no custom-agent type selector, including with `multi_agent_v2` enabled. Native selection of these four files could not be demonstrated. The project configuration passes the installed CLI's strict startup validation, but that does not prove native custom-role loading.

Supported fallback: `npm run agent:packet -- planner "Inspect requirements only"` prints a task packet containing the reviewed role definition verbatim. Pass that packet to `collaboration.spawn_agent`; `task_name` is only a label, and role behavior comes from the included instructions. `fork_turns: "none"` supplies fresh context, improving reviewer independence and avoiding the installed ephemeral CLI's missing-rollout error when forking parent history. Generate Developer/Tester/Critic packets the same way. Do not duplicate or silently replace the role definitions. This command prints JSON; it does not spawn agents or grant permissions. A read-only CLI smoke with fresh contexts returned all four role replies. When a future client exposes native custom-agent selection, verify it before switching dispatch modes.

Custom roles inherit the parent sandbox, approval settings and MCP connections. Role instructions cannot establish a separate read-only sandbox. `.codex/config.toml` caps concurrency without changing session permissions; start approved writing sessions with `codex --sandbox workspace-write --ask-for-approval on-request`. Start Planner/Critic sessions separately with `codex --sandbox read-only --ask-for-approval on-request`. Do not weaken a shared parent's permissions while relying on its child reviewers to remain isolated. Explicit launch settings avoid changing permissions beneath an active client when project configuration reloads.

Use a credential-free process and reviewed tool connections. Read-only filesystem access does not prohibit a mutating external connector. Do not grant production-capable tools. Do not use approval bypass flags. Managed policy takes precedence over project defaults.

Read-only reviewers inspect a frozen commit. Test execution may create generated files: execute it in an isolated test checkout with designated output directories, rather than claiming the runner is wholly read-only. Worktrees isolate working state, not credentials or OS permissions.

The initial assessment used instruction-based read-only subagents in a shared workspace. No changes were made by those reviews. Separate CLI checks confirmed a read-only parent session was selected, but a successful OS write-denial probe has not been demonstrated: the Windows sandbox process helper currently fails before commands start. Record this operational limitation; do not infer enforcement from TOML presence or use elevated reviewer commands as proof of a read-only sandbox.

## Task packet template

```text
Task / owner / role:
Owner approval and scope:
Baseline commit and pre-existing dirty paths:
BR/TR/NFR identifiers and approved contract operations:
Exact permitted write paths (one writer per file):
Forbidden paths and external actions:
Dependencies / prerequisites / handoff:
Acceptance criteria and required test IDs:
Validation commands and evidence paths:
Local owner-review setup, commands, URLs, synthetic inputs, expected results and shutdown:
Owner acceptance status (pending / changes requested / accepted) and candidate identity:
Phase/iteration history record and progress entry to update at handoff:
Risks, unresolved decisions and stop conditions:
```

Before dispatch, the orchestrator reserves files in the task packet. A reservation ends only on explicit handoff. Shared package files, lockfiles, CI and contract changes have one writer at a time. Disjoint application/test edits can run in parallel only when their interfaces are agreed. No simultaneous overlapping writes, git resets, shared branch switches or unsupervised integration.

## Review report template

```text
Reviewer / role / reviewed commit (or explicitly uncommitted candidate):
Scope and checks actually performed:
Findings: severity, file/symbol, evidence, impact and proposed mitigation:
Requirement/contract/test gaps:
Limitations and unresolved disagreements:
Disposition by owner/orchestrator, with follow-up evidence:
```

Freeze the integrated candidate, run independent Tester and Critic review, resolve findings and rerun affected checks. Critical/high findings block acceptance until resolved; governance prohibitions cannot be waived by an agent. Owner decisions and lower-severity exceptions must be recorded. A second agent is additional review, not a substitute for owner approval or a human security audit.

Only the orchestrator integrates. Merging/publishing or external changes need explicit owner approval. Review acceptance and test evidence refer to the final candidate, not a superseded draft.

## Owner local visual/manual acceptance

Standing owner instruction: whenever functionality becomes available, offer it for local visual inspection and manual testing with clear steps. Do not launch a demonstration merely to record this rule or describe the starter as a completed feature.

Follow [the local manual-testing guide](manual-testing.md). Developer supplies a verified handoff; Tester checks its setup and expected results; Critic checks the acceptance boundary. The orchestrator presents it to the owner and records feedback. Automated checks passing means the candidate is ready for owner review, not owner-accepted. Wait for explicit owner disposition before accepting the feature or proceeding to a dependent functional increment.

Record `pending`, `changes requested` or `accepted` in the iteration record alongside candidate SHA/working-tree identity, reviewer, date, devices/viewports and feedback. A changed candidate needs renewed review of affected behavior. Local acceptance does not authorize publication, infrastructure changes or deployment.

Every iteration handoff also includes the saved Excel feature/manual-test workbook required by [the manual guide](manual-testing.md#iteration-excel-workbooks). Start with the cumulative 1B baseline under `tests/manual/`; later workbooks retain applicable regression coverage and add/revise that iteration's changes. The assigned writer records feature purpose, numbered actions, expected results and editable human results/reviewer/date/notes, verifies export and visual layout, and confirms the saved path. Keep prior workbooks/results intact and manual acceptance separate from automated checks.

## Iteration QA closure and staged workbook review

The owner requires manual-suite maintenance before any development iteration or major feature delivery is closed. Review the iteration diff for changed routes, components and migrations. Append delta cases using each category's next sequential IDs, revise changed UI/contract procedures, update the feature-to-test traceability matrix and index counters (Total Steps, Pass, Fail, Not Run), and refresh the Playwright guide for new specs/tags/modes. Supply an exact Python (`openpyxl`/`pandas`) snippet or complete formatted update table with the saved workbook handoff. Preserve prior results; new steps start Not run with blank evidence/tester/date.

Workbook restructuring proceeds one category tab at a time, in this order: Contract Tests (`CT`), API Tests (`API`), Functional UI Tests (`UI`), Usability & a11y (`A11Y`), Database Integrity (`DB`), Security & Safety (`SEC`), System & Recovery (`SYS`), Playwright Execution Guide (`PW`). Stop after each category and wait for the owner's explicit review/confirmation before the next. On 2026-10-27, after the API handoff, the owner authorized everything needed to deliver **Functional UI Tests only** as the next tab. This authorizes the QA artifact work, not manual execution or feature acceptance. A category review checkpoint is not an iteration-completion handoff; subsequent category/index migration work remains gated. Existing Start Here and baseline sheets/results are retained.

The dedicated Playwright guide must use the same 11-column template with `PW-xxx` IDs, exact PowerShell commands, environment/fixture prerequisites and observable pass/fail signals. Cover UI mode, headed desktop/mobile viewports, spec/grep targeting, Inspector debug, Trace Viewer and video/screenshot inspection. Account for the project's guarded isolated test lifecycle rather than blindly forwarding unverified CLI examples. Build this tab only when its stage is approved.

See [the manual guide](manual-testing.md#staged-test-categories) for the exact table format and current review boundary.

## API contracts and Postman maintenance

The owner requires the canonical [OpenAPI contract](../contracts/openapi.yaml) and [Postman manual files](../postman/README.md) to stay aligned as APIs evolve. For every approved operation addition, change or removal, assign writers before editing and integrate the following in the same candidate:

1. Update the contract's affected paths, methods, fields/schemas, access requirements, examples, responses and requirement links.
2. Update corresponding Postman requests, saved examples, pre-request/post-response assertions and canonical-source identity. Update local environment defaults only where the approved target/setup changes, keeping credentials out of the import files.
3. Refresh affected generated runtime schemas and the visual API reference, plus relevant manual/regression coverage. Keep the current iteration workbook's **Start Here → API testing** references, environment/URL, request order, expected outcomes and retry/cleanup instructions current.
4. Validate the contract/generated-schema alignment and affected Postman artifacts, and record the checks actually executed in dated history. Native Postman/manual results remain distinct from schema/script checks and owner acceptance.

Preserve previous iteration workbooks and their results. Before reimporting changed Postman files, preserve the owner's current keys, receipts and execution state, especially an uncertain submission intent. Updating documentation or client files must not silently reset a test result, rotate a retry key or imply that an API has been accepted.

## Technology stack documentation

[Technology stack](tech-stack.md) is the single maintained explanatory inventory and diagram for current technologies. Manifests, lockfiles, runtime pins and infrastructure definitions remain the executable version authorities. Other current guides link to that reference and retain their own procedures or design rules.

For an approved stack/version/topology change, the assigned writer updates that reference and reviewed date in the same change, using the actual source/configuration as evidence. The orchestrator integrates it, checks versions, links, data flow and implemented/deferred status, and updates affected startup/test/security instructions plus dated history before handoff. Preserve historical decisions/evidence and manual workbooks/results. Do not treat a planned technology, prepared pipeline or local test pass as external activation or owner acceptance.

## Progress and phase history

Standing owner instruction: always document progress and finished work for each phase so its history can be reviewed later. [Progress and phase history](progress.md) is the central index; detailed evidence stays in the linked phase/iteration records.

The orchestrator is the single writer for shared history unless ownership is explicitly transferred. Every agent supplies a handoff note within its existing access boundaries; Planner and Critic remain read-only. Update the index and relevant record after meaningful progress, decisions, validation results, review feedback, blockers and phase completion, and before ending each work handoff. Do not log every command as a separate milestone.

Keep the current-status summary up to date and append dated history entries. Preserve earlier entries; record corrections or superseding decisions explicitly. Use Australia/Brisbane dates and include times only when actually known. Link requirement/test IDs, changed files and evidence where useful. Record a real candidate SHA when available; identify an uncommitted working tree honestly rather than inventing a commit.

Each entry records: phase/iteration/task; request or approval; finished work and files; checks actually run and outcomes; decisions and review findings; remaining work/blockers; owner manual acceptance; and next step. A defined procedure, prepared plan, implemented feature, successful test and owner acceptance are different outcomes. Do not mark a phase complete while required acceptance work remains outstanding.

Use this template in the applicable phase/iteration record:

```text
Date / entry ID / phase or iteration:
Request or approval / candidate identity:
Finished work and changed files:
Validation commands, outcomes and evidence (including skipped checks):
Decisions, review findings and dispositions:
Remaining work, blockers and next step:
Owner manual review: not applicable / pending / changes requested / accepted:
```
