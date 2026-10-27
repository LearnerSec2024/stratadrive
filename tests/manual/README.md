# Iteration manual-test workbooks

Starting with Iteration 1B, save a feature/manual-test Excel workbook here after every iteration.

| Workbook | Coverage | Human execution / acceptance |
| --- | --- | --- |
| [iteration-1b-manual-tests.xlsx](iteration-1b-manual-tests.xlsx) | Cumulative baseline of all delivered 0A foundation tooling, 1A website/booking preview and 1B local setup/enquiry features | Starts Not run / Pending; owner records actual results |

Use `iteration-<id>-manual-tests.xlsx` for each later iteration. Carry forward applicable baseline features and regression cases, add or revise iteration changes, and label superseded behavior honestly. Do not overwrite earlier workbooks or the owner's results.

Each workbook includes feature IDs, feature purpose, delivered behavior/limits, linked manual case IDs, preconditions/sample data, numbered actions and matching expected results. Include editable result, actual result/evidence/notes, tester and date fields. New review results start Not run, with owner acceptance Pending. Automated results remain separate from human execution.

Begin with the **Start Here** first tab in every workbook. It gives ordered prerequisites, working directory, conditional installation, Docker/database/application startup, separate terminal guidance, exact URLs, expected readiness checks, recovery and shutdown. Complete startup successfully before running Manual Tests. The 1B workbook's Setup sheet retains the detailed command reference, synthetic samples and cleanup limits. Preserve recorded results when updating startup instructions.

For the Windows startup shortcut, open PowerShell 7 in `D:\Projects\stratadrive` and run `npm run review:local`. It checks the pinned tools, installs locked dependencies on first shortcut use or package/lockfile changes, opens Docker Desktop when needed, prepares/checks the development database, runs `npm start`, then opens the four review pages and a second PowerShell 7 after HTTP readiness succeeds. Stop any existing app first. Keep the app terminal open; stop with `Ctrl+C`, then run `npm run db:local:stop` to retain data and stop the database services. The workbook retains detailed steps 1–12 for troubleshooting. Selecting `enquiry_private` → `enquiries` in Studio and checking page appearance remain manual actions; startup records no manual pass or owner acceptance. See [the current command index](../../README.md#run-the-app).

Its **API testing** section references the [canonical contract](../../contracts/openapi.yaml), [Postman collection](../../postman/stratadrive-api.postman_collection.json), [local environment](../../postman/stratadrive-local.postman_environment.json) and [Postman guide](../../postman/README.md). Include current import/environment/URL settings, synthetic inputs, request order and expected outcomes, stable retry, scoped cleanup and evidence-recording guidance. Update this section with approved API/client changes each iteration. Preserve current Postman state before reimporting; complete all steps of a manual case, including any restart/private-row checks, before recording a pass.

For a first Postman run, use its expanded **Postman setup and first sample** steps: tools/install/workspace, service readiness, collection plus environment import, target/headers/body, one Send, actual response/Test Results and troubleshooting. The [beginner guide](../../postman/README.md#tools-needed) matches the workbook. Existing category cases/results remain unchanged by this setup-only update.

Use only sample information. Capacity, slow-stream and effective-role security controls retain clearly identified automated evidence where a manual exercise would be unsuitable; do not manufacture manual passes or fill/reset development quota.

Follow [the manual guide](../../docs/manual-testing.md) and preserve the current iteration's candidate identity, review evidence and explicit owner disposition in its history record. Verify the saved workbook and inspect its layout before every handoff.

## Staged QA expansion

The owner authorized completing **Functional UI Tests (`UI-xxx`) only** as the next category on 2026-10-27. Keep Start Here first, then Contract Tests, API Tests and Functional UI Tests, preserving existing baseline sheets/results. Stop after UI and wait for explicit owner confirmation before A11Y, then DB, SEC, SYS and PW in that order. Continuing the suite does not mark manual execution passed or accept the feature. The exact 11-column format and review protocol are in [the manual guide](../../docs/manual-testing.md#staged-test-categories).

The UI tab's [synthetic browser fixture](fixtures/iteration-1b-ui-fixture.js) is an optional local manual aid for reproducible pending/error states. Its rows explicitly distinguish simulation from real saves and automated evidence. Remove it and reload before real-server cases. See [fixture and report instructions](../../docs/manual-testing.md#functional-ui-simulations-and-automated-reports), including the standalone Playwright default `all` report filenames.

Every iteration/major-feature closure must add/update relevant cases and feature traceability, refresh Playwright execution steps, and update index counters (Total Steps, Pass, Fail, Not Run). Provide the exact Python update snippet or complete formatted table with the saved suite. The dedicated Playwright guide is required, with UI/headed desktop/mobile/filter/debug/trace/artifact modes, and will be built only when its staged review is authorized.
