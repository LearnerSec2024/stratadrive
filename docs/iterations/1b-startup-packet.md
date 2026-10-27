# Iteration 1B — One-command local review startup

Date: 2026-10-27, Australia/Brisbane. Owner request: consolidate Start Here steps 1–12, including opening Docker Desktop, into one command. This is bounded maintenance of the approved local synthetic review setup; feature acceptance remains Pending.

Continued by owner on 2026-10-28 after interruption. The interrupted first run installed locked dependencies successfully (424 packages, 54 seconds); the resumed check reused them. Final evidence and remaining owner checks are recorded in [the iteration history](1b.md#2026-10-28--one-command-local-review-startup).

Baseline: uncommitted working tree based on `95c2c019ab9fc18728c9dfff1396973d0d505ef7`. All existing changes, especially `next.config.ts`, belong to the pre-existing candidate and must be preserved.

## Ownership and scope

- Root is the only writer of `scripts/start-review.mjs`, `package.json`, `README.md`, `docs/manual-testing.md`, `docs/local-supabase.md`, this packet, `docs/progress.md`, `docs/iterations/1b.md`, and `reports/start-review/runtime/**`.
- Workbook worker exclusively owns `tests/manual/iteration-1b-manual-tests.xlsx`, `tests/manual/README.md`, and `reports/start-review/workbook/**`. Update Start Here only, preserve every other worksheet and recorded result, and supply a reproducible formatted update table or Python snippet. No category migration is authorized.
- Tester exclusively owns `tests/tooling/start-review.test.ts` and `reports/start-review/tests/**`; implementation review is read-only. Critic/explorer are read-only. Isolation in this shared parent is procedural, not an enforced read-only boundary.
- Shared manifests/configuration remain root-owned. No lockfile, dependency version, framework source, API, schema, Postman state, migration, CI or external setting change is needed.

## Result and acceptance checks

`npm run review:local` checks pinned Node/npm, rejects nonlocal Docker overrides and test configuration, refuses an occupied port 3000 without terminating its owner, conditionally installs locked dependencies, opens Docker Desktop when required, and waits with a deadline for the approved local Linux engine. It delegates development preparation/checks to the existing guarded commands, then runs the unchanged `npm start` convention. After successful loopback HTTP readiness checks it opens the homepage, booking preview, enquiry form and Studio, and a second PowerShell in the project directory. Studio schema/table selection and visual assessment remain human actions.

Dependency installation records a package/lockfile fingerprint under `node_modules` only after successful `npm ci`; the first shortcut run installs once to establish this record. Later unchanged launches retain dependencies. A busy app port is checked before any dependency replacement. Failed stages stop the sequence and return nonzero; no unknown process is killed and no volume is reset. Ctrl+C stops the shortcut-owned app; `npm run db:local:stop` retains database data. Docker Desktop and the second terminal remain available.

Traceability: existing `BR-ACCEPT-001` / `TR-LOCAL-001` / `TC-LOCAL-001`; this is startup convenience, API operation N/A. Independent tooling cases cover refusal/failure sequencing, Docker wait/local-target checks, installation decisions, readiness before opening pages, and cleanup of only the owned application. Record actual executable/HTTP evidence separately from owner visual acceptance. Preserve existing manual test results and detailed steps 1–12.

Handoff uses working directory `D:\Projects\stratadrive`, command `npm run review:local`, website `http://127.0.0.1:3000/` with `/book` and `/enquire`, and Studio `http://127.0.0.1:54323/project/default/editor`. Synthetic inputs and scoped cleanup remain in the existing manual guide. Update the 1B/progress records with changed files, actual checks, limitations and Pending owner acceptance. No deploy, publish, merge, production access or external resource provisioning is authorized.
