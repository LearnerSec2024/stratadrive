# StrataDrive

Driving instruction platform, initially operated by one owner/instructor and designed to grow into a multi-instructor business.

The local preview contains the StrataDrive homepage, a clearly labelled booking-flow preview at `/book`, and synthetic enquiry intake at `/enquire`. Enquiries save to private local PostgreSQL storage; no lesson is reserved and no email or notification is sent. Use made-up details only. Owner visual/manual acceptance is recorded separately from automated validation.

See [Technology stack](docs/tech-stack.md) for the single maintained component/version reference, visual architecture diagram and implemented/deferred status. This README remains the command and URL index.

## Peer review checkout

The owner approved sharing this snapshot in the public repository [LearnerSec2024/stratadrive](https://github.com/LearnerSec2024/stratadrive). Clone it into your own development directory:

```powershell
git clone https://github.com/LearnerSec2024/stratadrive.git
Set-Location stratadrive
```

Use your clone directory wherever these guides show `D:\Projects\stratadrive`, then follow the prerequisites and startup steps below. Local credentials, database rows, dependencies and ignored `reports/` evidence are excluded from Git; generate your own local setup and validation evidence with the documented commands. The saved manual workbook and dated history summaries are included. This peer-review snapshot keeps feature acceptance and the remaining staged QA categories pending; see [the current history](docs/progress.md).

## Run the app

This README is the command and link index for current manual checks. Detailed expected results and acceptance checklists live in the linked guides. Use Node **22.15.0** (`.node-version`) and npm **10.9.2**.

Open PowerShell:

```powershell
Set-Location 'D:\Projects\stratadrive'
npm run review:local
```

**One-command Windows review startup:** `npm run review:local` covers the service startup and page-opening actions in the workbook's Start Here steps 1–12. It checks Node/npm, PowerShell 7 and that port 3000 is free, installs locked dependencies on the first shortcut run or after `package.json`/`package-lock.json` changes, opens Docker Desktop when its engine needs starting, and waits up to three minutes for the approved local Linux engine. It prepares/checks the development database, runs `npm start`, waits for HTTP 200 from all four review pages, then opens those pages and a second PowerShell 7 in the project directory. In Studio, select `enquiry_private` → `enquiries`; assess the pages visually yourself. An empty private table is valid. HTTP readiness does not mark manual tests passed.

Keep the startup terminal open. Stop its app with `Ctrl+C`; in the second terminal run `npm run db:local:stop` to stop only the database services while retaining data. Docker Desktop, browser tabs and the second terminal stay open. A busy port, existing development lock or failed guard stops startup; stop an existing app in its original terminal and retry. The shortcut does not close another server or change Docker settings. Initial dependency installation and uncached Docker images require network access. Retain the individual steps below for diagnosis or an app-only restart:

```powershell
Set-Location 'D:\Projects\stratadrive'
npm ci
npm run enquiries:local:prepare
npm start
```

Run `npm ci` on first setup or after the lockfile changes. Open Docker Desktop before `enquiries:local:prepare`; that guarded command retains development rows and credentials, checks/applies the migration, and writes owned local application configuration. It refuses an unrecognized existing root environment file without reading or overwriting it. **`npm start` is the main local development command**, with hot reload at `http://127.0.0.1:3000/`. Keep the terminal open and stop with `Ctrl+C`. If another StrataDrive dev server is running, stop it in its original terminal first. Homepage and booking preview work without the database; an enquiry cannot succeed while storage is unavailable.

## Manual-check links

| Destination | URL | Expected result |
| --- | --- | --- |
| Public website | [Homepage](http://127.0.0.1:3000/) | StrataDrive design and “Your next step towards confident driving.” |
| Booking preview | [Booking journey](http://127.0.0.1:3000/book) | Clearly labelled preview; no lesson is reserved |
| Enquiry | [Synthetic enquiry](http://127.0.0.1:3000/enquire) | Sample-only form; a committed save returns a reference and says no lesson/email |
| Local database dashboard | [Studio Table Editor](http://127.0.0.1:54323/project/default/editor) | “Synthetic data only”; select `enquiry_private` to inspect local sample receipts |
| Local API gateway | [Gateway](http://127.0.0.1:54321/) | Development dashboard authentication applies; use `db:local:check` to verify API access safely |
| PostgreSQL | `127.0.0.1:54322` | Database connection port, not a browser page |

Use [the enquiry walkthrough](docs/manual-testing.md#enquiry-review) for synthetic submission, private-row inspection, restart replay, unavailable storage, reset and shutdown. The [Iteration 1A checklist](docs/iterations/1a.md#owner-manual-review) covers homepage/booking checks. Report findings so owner acceptance can be recorded against this candidate.

The [Iteration 1B Excel baseline](tests/manual/iteration-1b-manual-tests.xlsx) lists all features delivered so far, their purpose and numbered manual tests with expected results. Record your results in its editable fields. Each later iteration must provide its own workbook under [tests/manual](tests/manual/README.md), preserving earlier results and updating applicable regression coverage.

## Application commands

Run these from `D:\Projects\stratadrive`:

| Command | Purpose |
| --- | --- |
| `npm run review:local` | Windows shortcut: conditional locked install, Docker Desktop/Linux readiness, guarded database prepare/check, `npm start`, page readiness, four browser pages and second PowerShell 7 |
| `npm start` | Main local development server with hot reload, loopback port 3000 |
| `npm run dev:local` | Compatibility alias for the same local development server |
| `npm run dev` | Generic Next.js development CLI; prefer `npm start` for fixed local settings |
| `npm run build` | Create the production build; current fonts require internet access |
| `npm run start:production` | Review the built app in production mode on loopback port 3000; run build first and stop the dev server |
| `npm run start:local` | Compatibility alias for local production-mode startup |
| `npm run start:test` | Production-mode test server on loopback port 3100; normally managed automatically by Playwright |

Stop foreground app servers with `Ctrl+C`. Keep port 3100 free when running automated API/E2E tests. Production-mode startup is a local review command, not a deployment.

## Local Supabase commands

Open Docker Desktop and wait for Engine running. On first setup:

```powershell
Set-Location 'D:\Projects\stratadrive'
npm run db:local:init
npm run db:local:preflight
npm run db:local:start
```

| Command | Purpose |
| --- | --- |
| `npm run db:local:init` | Generate development credentials once; retain existing credentials on later runs |
| `npm run db:local:preflight` | Verify local Docker, pinned files and rendered loopback-only configuration |
| `npm run db:local:start` | Guarded start/resume and validation of the five-service stack |
| `npm run db:local:check` | Check current health, bindings, grants and Studio/API availability |
| `npm run db:local:stop` | Stop only StrataDrive services and retain data |
| `npm run enquiries:local:prepare` | Guard/start the development target, apply the checked private migration and prepare the narrow app role |
| `npm run enquiries:local:sample -- receipt UUID` / `-- remove UUID` | Inspect/remove only the exact standard synthetic sample/key; see the manual guide |

The [local Supabase guide](docs/local-supabase.md) explains credentials, recovery and stop/resume. Use synthetic data only. Studio is a loopback administrator interface; the application uses a separate execute-only role. Do not use `supabase start` or destructive reset/prune commands.

## Automated validation commands

Install Chromium once before browser tests: `npm exec playwright install chromium`. On Linux CI use `npm exec playwright install --with-deps chromium`.

| Command | Purpose |
| --- | --- |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generated Next.js types and TypeScript |
| `npm run traceability:check` | Requirement/test/API links |
| `npm run contracts:check` | Canonical enquiry operation, schema examples and generated-schema drift |
| `npm run test:unit` | Database-free tooling, contract and validation tests |
| `npm run test:integration` | Mandatory real PostgreSQL tests using the isolated test target |
| `npm run test:api` | Real local HTTP checks; run build first |
| `npm run test:e2e` | Local Chromium checks; run build first |
| `npm run ci:validate` | All nine required gates, including build, isolated database, HTTP and browser tests |

The integration/API/E2E wrappers require Docker and exclusively lease `stratadrive-test` on loopback ports 55421/55422/55423. They clean only matching test-run rows in `finally` and retain development records. Playwright uses `start:test` on port 3100 in production mode. Run these suites serially; a leftover lease or identity mismatch fails closed. Reports go to `reports/`, `playwright-report/` and `test-results/`. See [testing and dual CI](docs/testing-and-ci.md) for source-identity checks and remote limitations.

Reusable role instructions can be dispatched with `npm run agent:packet -- planner "Inspect requirements only"`; see the agent workflow for installed-client limitations and permission requirements.

## Project documentation

- [Technology stack and visual overview](docs/tech-stack.md) — current stack reference and maintenance rules
- [Progress and phase history](docs/progress.md)
- [Product and roadmap](docs/project.md)
- [Proposed Phase 1 website and enquiry plan](docs/phase-1-plan.md)
- [Iteration 1A implementation and local review](docs/iterations/1a.md)
- [Iteration 1B preparation and setup](docs/iterations/1b.md), [local Supabase setup](docs/local-supabase.md)
- [Approved 1B enquiry feature packet](docs/iterations/1b-enquiry-packet.md) — local synthetic scope; owner feature acceptance pending
- [Iteration 0A scope and evidence](docs/iterations/0a.md)
- [Agent workflow](docs/agent-workflow.md) and [repository instructions](AGENTS.md)
- [Architecture and API standards](docs/architecture.md), [initial decision](docs/adr/0001-foundation-boundaries.md)
- [Security and isolation](docs/security.md)
- [Testing and dual CI](docs/testing-and-ci.md)
- [Local visual/manual review process](docs/manual-testing.md)
- [Canonical requirements and verification cases](docs/requirements.yaml)
- [API contracts and visual reference](contracts/README.md)
- [Postman collection and local environment](postman/README.md) — manual API requests, expected results and cleanup
- [Canonical OpenAPI contract](contracts/openapi.yaml)

GitHub is the authoritative source repository. GitHub Actions is the primary validation system; Azure Pipelines independently validates the same immutable GitHub source. Pipeline definitions do not deploy anything. Connecting services, changing external settings, publishing, merging and deployments require explicit owner approval. Local repository preparation does not establish remote CI success.

Read the installed Next.js guides in `node_modules/next/dist/docs/` before changing Next.js code. Use the framework version recorded in [the stack reference](docs/tech-stack.md); do not assume older framework conventions apply.
