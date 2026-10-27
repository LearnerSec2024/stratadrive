# Testing and independent CI

[Technology stack](tech-stack.md) is the maintained tool/version inventory and current CI implementation-status reference. This guide owns commands, required gates, isolation, source-identity checks and execution evidence.

## Commands and scope

Use Node 22.15.0 and npm 10.9.2. `npm ci` installs the lockfile. Install Chromium with `npm exec playwright install chromium` (Linux CI: `--with-deps chromium`). `npm run ci:validate` runs the same ordered gates in both providers:

1. ESLint (`lint`).
2. Next.js type generation and TypeScript (`typecheck`).
3. Requirements/traceability (`traceability`).
4. OpenAPI lint and component validation (`contracts`).
5. Non-watch Vitest (`unit`).
6. Next.js production build (`build`).
7. Mandatory real private PostgreSQL persistence, concurrency, quota, permissions, lifecycle and privacy checks (`integration`).
8. Public pages and actual enquiry HTTP checks, including streamed body budgets (`api`).
9. Chromium UI, retry/recovery, responsive, keyboard and scoped accessibility checks (`e2e`).

Playwright runs `npm run start:test` (`next start` bound to loopback:3100) after the build and never reuses an existing server. The owner's `npm start` launches development mode on loopback:3000; `start:production` reviews a build on port 3000. Tests exercise public pages, booking preview and synthetic enquiry intake. Database-free Vitest includes `tests/unit/**/*.test.ts`; integration discovery is separate, mandatory and serialized. No `passWithNoTests`, focused CI tests or ignored required failures.

Docker's local Linux engine and Compose are required for `test:integration`, `test:api`, `test:e2e` and the complete chain. The guarded wrappers exclusively lease `stratadrive-test`, its separate generated credentials and loopback ports 55421/55422/55423. The shared CI runner prepares one owned run and executes these three suites serially. Nested wrappers verify the same lease, dedicated test configuration and durable environment marker. Cleanup affects only matching test-run rows/resources; failures retain the lease for explicit recovery when ownership/cleanup cannot be confirmed. A stale lease is a failure, not permission to remove a file, truncate development data or prune Docker. Development records on 54322 are retained.

A stopped database must run to expose its durable marker. The probe checks its exact image, command, loopback binding, network and scoped mounts, then starts that exact container without Compose reconciliation. Only after marker/checksum validation may preparation recreate services, repair grants, migrate or provision roles. A foreign marker causes refusal; an inspection-only resume is not automatically stopped as if this run owned it. Administrator provisioning/grant sessions use explicit connection, statement and lock deadlines and private logging settings. This is a bounded local workflow, not an enforced OS permission boundary.

TC identifiers appear in test titles. Negative cases cover broken references, duplicate operations, reciprocal links, invalid schemas, unsafe targets and source-identity mismatches. The canonical contract defines only `createEnquiry`; generated runtime schemas are checked for drift. Schema conformance does not prove persistence or actual HTTP behavior. Product authentication and live reservations remain outside scope. Execution evidence and owner acceptance are tracked separately in the iteration record.

Every functional slice also needs the owner's [local visual/manual acceptance](manual-testing.md). Provide verified startup steps, URLs, synthetic inputs and expected behavior, then record explicit owner disposition against the candidate. CI passes and agent review do not satisfy this manual gate. Use the actual current preview, rather than an earlier starter, for the handoff.

## Source identity and parity

GitHub is the sole source. Azure connects directly to that repository. Each provider independently installs and builds; do not use GitHub's compiled app as Azure's validation input.

CI must supply `CI_SOURCE_SHA` (40-character immutable commit), `CI_SOURCE_REPOSITORY` (GitHub owner/repo) and `CI_PROVIDER` (`github` or `azure`). After selecting the pinned Node runtime, both pipelines run dependency-free `npm run ci:preflight` before dependency/browser installation. The shared runner asserts checkout identity and rejects tracked or untracked changes, then repeats these checks before validation. A preflight-only manifest is not a successful validation result. Local execution is explicitly marked local/dirty when appropriate and cannot count as remote dual-CI evidence.

Normal PR runs validate the GitHub synthetic merge commit, while push runs validate the pushed commit. Refs can advance between providers. Pair results only when repository, actual SHA, lockfile hash, Node/npm versions and required successful check sets match. A matching branch or PR number is insufficient.

Both definitions expose an immutable SHA rerun input. Trigger both for the same trusted GitHub revision; never substitute a different commit if fetching the requested one fails. `npm run ci:compare -- path/to/github-source-identity.json path/to/azure-source-identity.json` checks paired manifests. Do not manually edit manifests to manufacture parity. Downloaded artifacts are evidence supplied by their trusted CI runs, not signed attestations.

## Artifacts and external activation

`reports/source-identity.json` contains source/toolchain identity and gate outcomes. JUnit, JSON and HTML test reports live under ignored report directories. The source manifest is updated after each gate so failed runs retain completed/failed checks. Pipelines publish available reports on failure. GitHub retains artifacts for 14 days; configure the matching Azure retention policy during separately approved external activation.

GitHub Actions is primary validation; Azure is parallel validation. Neither has deployment stages. Required checks, branch protection, service connections and pipeline registration are external configuration: prepare/review definitions locally, then obtain explicit owner approval before activation. No Git remote was configured at the 0A baseline. Until successful runs for the same SHA are recorded, operational dual-CI acceptance is pending.

Runner images receive provider updates despite the `ubuntu-24.04` label; the exact Node/npm and dependency baseline is pinned. Review toolchain and action pins through normal changes. Google fonts currently require build-time network access; document failures honestly rather than changing application source within foundation scope.
