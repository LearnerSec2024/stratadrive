# Local visual and manual review

The owner must be able to run every functional increment locally, inspect its appearance and test its behavior before accepting it. This is a standing project requirement. Automated tests and agent reviews provide separate evidence.

The current app has the StrataDrive homepage, labelled booking-flow preview and local synthetic enquiry form. Enquiry success requires a committed private PostgreSQL receipt. No reservation, notification, payment or product login is available. See [Iteration 1B](iterations/1b.md) for candidate evidence and pending owner acceptance.

## Iteration Excel workbooks

Every iteration now includes an Excel handoff under `tests/manual/`. The [Iteration 1B workbook](../tests/manual/iteration-1b-manual-tests.xlsx) is the cumulative baseline for all delivered 0A foundation tooling, 1A homepage/booking preview and 1B local setup/enquiry features.

The workbook opens with **Start Here**, the first tab: follow its ordered prerequisites, installation/startup commands, separate terminal guidance, service URLs and expected readiness checks before running tests. It also includes recovery and shutdown. Keep this first tab current in each later iteration's workbook.

Use its **API testing** section for the canonical contract, Postman collection/environment and guide references, import/target settings, synthetic sample, request order, expected outcomes, retry and cleanup. These references and the affected manual cases must follow approved API/client changes. Preserve Postman keys/receipts before reimporting updated files. Postman response assertions do not replace any restart/private-row steps required by the manual case; record a pass only after completing its full procedure.

The expanded **Start Here → API testing — Postman setup and first sample** walkthrough lists the required tools, desktop installation/workspace prerequisites, local readiness, exact import files, environment selection, request settings/JSON, Send, actual response and Test Results, retained key/receipt values, troubleshooting and optional scoped cleanup. Follow [the Postman guide](../postman/README.md#tools-needed) for the full beginner procedure. Postman workspace sign-in is distinct from this API's **No Auth** setting. This setup update does not execute or accept the API/CT/UI cases.

Features, Manual Tests and Setup retain the feature inventory, test steps and detailed reference. Each numbered test action has an expected result and editable Result, Actual result/notes, Tested by and Tested on fields. All human results start **Not run**; automated evidence is recorded separately and owner acceptance starts **Pending**. Preserve recorded results when updating startup guidance. Use made-up details only.

Future iteration handoffs save `iteration-<id>-manual-tests.xlsx`, retaining applicable baseline/regression coverage and adding or revising changed features/tests. Preserve prior workbooks and their results. Update superseded behavior honestly rather than carrying obsolete expectations forward. [The workbook index](../tests/manual/README.md) records this recurring requirement.

## Staged test categories

The owner is reviewing the expanded suite one category at a time. On 2026-10-27 the owner authorized completing **Functional UI Tests (`UI-xxx`) only** as the next stage after API Tests. Keep Start Here first, followed by Contract Tests, API Tests and Functional UI Tests; existing baseline sheets and recorded results remain intact. Stop for explicit owner review/confirmation before creating Usability & a11y Tests or any later category. Authorization to continue and approval of a tab's content do not mark its steps executed or accept the enquiry feature.

| Stage | Category | Case prefix |
| --- | --- | --- |
| 1 | Contract Tests | CT-xxx |
| 2 | API Tests | API-xxx |
| 3 | Functional UI Tests | UI-xxx |
| 4 | Usability & a11y Tests | A11Y-xxx |
| 5 | Database Integrity Tests | DB-xxx |
| 6 | Security & Safety Tests | SEC-xxx |
| 7 | System & Recovery Tests | SYS-xxx |
| 8 | Playwright Execution Guide | PW-xxx |

All eight categories use this exact 11-column structure:

| Case ID | Feature IDs | Test Case | Step | Action | Expected result | Preconditions / test data | Result | Actual result / evidence / notes | Tested by | Tested on |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

Each action is a separate sequential step, with real feature IDs and copyable commands, payloads, UI inputs or SQL as appropriate. New rows have Result **Not run**, with blank evidence/notes, tester and date. Preserve recorded results when revising existing rows. Contract-only schema checks must not be presented as live HTTP, persistence or accessibility evidence.

Before closing every development iteration or major feature delivery: review modified routes/components/migrations, add the delta cases with the next IDs, revise shifted procedures, update Playwright commands for changed specs/tags, synchronize the feature matrix and index counters (Total Steps, Pass, Fail, Not Run), and provide an exact Python (`openpyxl`/`pandas`) update snippet or complete formatted update table. This staged category review does not close the iteration or authorize later tabs automatically.

The future dedicated Playwright tab is required to cover UI mode, headed desktop/mobile runs, spec/grep filters, Inspector debugging, Trace Viewer and video/screenshot artifacts. Each PW row must specify exact commands, prerequisites and observable windows/terminal output/pass-fail interpretation, verified against the actual guarded runner configuration. Its creation waits for Stage 8 approval.

### Functional UI simulations and automated reports

The UI tab includes the [synthetic browser fixture](../tests/manual/fixtures/iteration-1b-ui-fixture.js) for pending, network/error, conflict, rate-limit and malformed-response states. Follow UI-022 in a fresh dedicated local enquiry tab. It intercepts this page's enquiry `fetch` calls, records synthetic key/body evidence in memory and never forwards them or returns a valid saved receipt. Confirm that no actual enquiry POST appears in Network. This is a UI simulation aid, not a browser/network security boundary or API/database evidence. Real save, optional-message and storage-recovery cases run with the fixture absent.

The [Chrome Snippets guide](https://developer.chrome.com/docs/devtools/javascript/snippets) describes Sources → Snippets and running the selected snippet. If browser safeguards block execution, record Blocked; do not bypass them. After a simulated case settles, restore and immediately reload to a blank form before any real-server action. Do not click Retry on a simulated draft after restoring native fetch. Refresh removes the in-page fixture/draft; it does not delete database rows or deliberately retained Network evidence. Never refresh a real uncertain intent to recover it.

Standalone `npm run test:api` and `npm run test:e2e` default to `reports/all-results.json`, `reports/all-junit.xml`, `playwright-report/all/` and `test-results/all/` unless `PLAYWRIGHT_REPORT_PREFIX` is explicitly selected. The CI runner selects `api`/`e2e`. UI-036 temporarily selects `e2e` and restores the previous setting, so its stated `e2e` report paths are exact. When following the earlier API tab's standalone command, inspect the default `all` paths or deliberately select the `api` report prefix; the command itself does not select it. Keep this report naming clarification with the existing API tab while the workbook migration is reviewed one category at a time.

## Enquiry review

For the complete Windows startup, run `npm run review:local` from `D:\Projects\stratadrive`. The shortcut checks the pinned tools, PowerShell 7 and free app port, installs locked dependencies on its first use or after package/lockfile changes, opens/waits for Docker Desktop's local Linux engine, prepares/checks the existing development database, then runs `npm start`. After HTTP 200 readiness it opens the homepage, `/book`, `/enquire`, Studio and a second PowerShell 7. Keep the startup terminal open. In Studio choose `enquiry_private` → `enquiries`; an empty table is valid. Check page appearance yourself before recording any manual result. The detailed Start Here steps remain available for diagnosis. See [README](../README.md#run-the-app) for the current command/URL index.

If a guard fails, resolve its reported stage before retrying. A busy port or existing development lock is refused without stopping its owner. The first shortcut run establishes a dependency fingerprint with `npm ci`; later unchanged runs skip installation. No environment-file or development-lock refusal should be bypassed by deleting the file. Stop the shortcut-owned app with `Ctrl+C`, then run `npm run db:local:stop` in the second terminal to retain sample data. The browser pages, Docker Desktop and second terminal remain open. The manual commands below remain valid when you want to perform the steps individually.

Use Node 22.15.0, npm 10.9.2 and Docker Desktop's local Linux engine. In PowerShell:

```powershell
Set-Location 'D:\Projects\stratadrive'
npm ci
npm run enquiries:local:prepare
npm start
```

Run `npm ci` on first setup or after the lockfile changes. Preparation guards the exact development project, image, loopback ports, environment marker and migration checksum; retains existing rows/volumes/credentials; and creates the dedicated application credential in ignored, owned local configuration. An unrecognized root environment file causes refusal without reading/overwriting its contents. Do not remove a file to bypass that refusal. Keep the app terminal open and wait for Ready. If another StrataDrive server is already running, use its original terminal to stop it first.

Open `http://127.0.0.1:3000/enquire`. Use only these made-up details: name `Test Learner`, email `learner@example.test`, message `Synthetic enquiry for local manual testing.` Data goes to local `enquiry_private.enquiries`; no email is sent. Studio at `http://127.0.0.1:54323/project/default/editor` is an administrator interface: choose schema `enquiry_private`, table `enquiries`, and match the reference shown after saving. Public-schema emptiness does not mean the private row is missing. Do not create tables or enable integrations.

| Task | Expected result | Owner result |
| --- | --- | --- |
| Open homepage, `/book`, `/enquire` and enquiry navigation | Existing design and labelled preview remain usable; sample-only notice is clear | Pending |
| Submit blank or invalid fields | Focused error summary, linked/associated field errors and no success | Pending |
| Submit the sample | Saved reference and received time; explicit no lesson/no email acknowledgement; one matching private row | Pending |
| Try mobile near 390 px, keyboard and 200% zoom | Readable reflow, visible focus and usable controls without page overflow | Pending |
| Start another enquiry | Fresh form; prior receipt remains in local storage | Pending |
| Test the storage outage below | No false success; retained read-only draft, stable retry and explicit choice before another intent | Pending |
| Replay the fixed API sample across app restart below | 201 first, 200 replay, same original receipt and one row | Pending |

### Repeatable API receipt and restart

With the app/DB running, use a second PowerShell terminal:

```powershell
Set-Location 'D:\Projects\stratadrive'
$sampleKey = '8c81dcda-830b-455a-8e6e-21791316d6cb'
$sampleBody = '{"name":"Test Learner","email":"learner@example.test","message":"Synthetic enquiry for local manual testing."}'
$sampleHeaders = @{ 'Idempotency-Key' = $sampleKey }
$firstReceipt = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/v1/enquiries' -Method Post -ContentType 'application/json' -Headers $sampleHeaders -Body $sampleBody
$firstReceipt.StatusCode
$firstReceipt.Content
npm run enquiries:local:sample -- receipt $sampleKey
```

Expect 201 for a new key, or 200 if this exact sample already exists. The helper returns only the matching standard sample's receipt after checking the development identity and migration. Stop the app with Ctrl+C in its original terminal and run `npm start` again. In the second terminal:

```powershell
$replayedReceipt = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/v1/enquiries' -Method Post -ContentType 'application/json' -Headers $sampleHeaders -Body $sampleBody
$replayedReceipt.StatusCode
$firstReceipt.Content -eq $replayedReceipt.Content
```

Expect 200 and `True`: the original ID/time and one private row. This API procedure supplies an explicit stable key; refreshing the browser loses its in-memory draft/key and cannot resume that browser intent.

### Controlled unavailable storage and recovery

Fill a new browser draft but do not submit yet. In a second terminal run `npm run db:local:stop`, then submit. Expect a safe failure with no saved acknowledgement, retained details and **Retry enquiry**. Fields stay read-only while the result is uncertain. Run `npm run enquiries:local:prepare` to restore the same development target, then choose Retry enquiry: expect one durable receipt. **Start a different enquiry** requires a separate confirmation that the earlier enquiry may already have saved. No browser contact data is persisted in storage or URLs.

### Sample cleanup and shutdown

The guarded helper removes only a row matching both the supplied UUIDv4 idempotency key and all three standard synthetic fields above:

```powershell
npm run enquiries:local:sample -- remove $sampleKey
```

It retains quota counts, all other rows, credentials and volumes. Removing the sample ends replay protection for that key; reusing it then creates a new receipt. For a browser-created standard sample, obtain its `idempotency_key` from that exact receipt's private Studio row and substitute that UUID. Other drafts/receipts remain until an explicitly scoped owner cleanup; there is no public read/delete endpoint or automatic expiry. Never use broad truncation/prune/reset commands on development data.

Stop the app with Ctrl+C and the database with `npm run db:local:stop`. Report candidate, viewport/device, tasks tried and findings. Owner acceptance remains **pending** until explicit feedback; automated checks do not accept this feature.

## What can be verified now

The local Supabase setup is available in Studio after its guarded start/check passes. Follow [the database setup walkthrough](local-supabase.md) for service checks and the enquiry instructions above for private synthetic receipts. Owner setup acceptance remains separate from feature acceptance.

Use the Windows startup sequence below and open `http://127.0.0.1:3000/`. Expect the StrataDrive homepage with the heading “Your next step towards confident driving.”, navy/blue styling and an illustrative car image. Open `http://127.0.0.1:3000/book` to explore the three-step preview. The previous Tailwind processing warning is resolved by the PostCSS integration. Stop the server with `Ctrl+C`.

No login, backend credentials or fixture seeding is needed for 1A. Choose a general starting point, continue to the unavailable-availability screen, then see the explicit “No lesson has been booked” outcome. `Start again` or a refresh clears the choice. No personal information is needed.

From the project directory, the foundation checks can be run independently:

```powershell
npm run test:unit
npm run traceability:check
npm run contracts:check
```

Expect passing database-free tests, valid requirement/test links and the canonical `createEnquiry` contract. Schema/example checks alone are not live API coverage.

For the complete foundation validation, including a production build and actual HTTP/Chromium smoke tests:

```powershell
npm exec playwright install chromium
npm run ci:validate
```

Keep port 3100 free for the automated server. Internet access may be needed for the browser download and build-time fonts. A successful run prints “Foundation checks passed” and writes reports under the ignored report directories. These local results do not establish remote GitHub/Azure parity or owner acceptance of future features.

## Required handoff

Each functional handoff must identify the candidate commit, or explicitly uncommitted working tree, and provide:

1. What is newly available, its scope and limitations.
2. Required Node/npm versions, working directory and exact setup commands. Explain whether dependency installation is needed because this is the first run or the lockfile changed.
3. Exact launch commands and local URLs for each screen to review.
4. Any synthetic fixtures, local-only environment setup, data destination and safe reset instructions. Never require production credentials or real customer data.
5. A short task-based checklist with expected results, including relevant validation and failure states.
6. Representative desktop/mobile, keyboard and zoom checks for the implemented UI.
7. How to stop the process and report feedback.

Do not offer a form as operational if it only simulates success. A clearly labelled preview must explain what is unavailable. Give no unverified database, seeding or reset commands: confirm the actual implementation and approved target first.

## Standard Windows startup sequence

The current repository pins Node 22.15.0 and npm 10.9.2. A future handoff must update these instructions if the baseline changes.

Open PowerShell:

```powershell
Set-Location 'D:\Projects\stratadrive'
node --version
npm --version
```

For the first run or after a lockfile change:

```powershell
npm ci
```

For local visual/manual review:

```powershell
npm start
```

Keep the terminal open and open `http://127.0.0.1:3000/` and `http://127.0.0.1:3000/book` in your browser. Use `npm ci` after pulling this dependency/lockfile update and restart any earlier dev server so it loads the PostCSS integration.

When the review needs to match the production build instead, stop the development server with `Ctrl+C`, then use:

```powershell
npm run build
npm run start:production
```

The fixed scripts include the hostname/port and require no extra arguments. `npm start` is the owner's main development convention; `dev:local` remains a compatibility alias, while `start:production` explicitly reviews a build. If PowerShell/npm previously printed `next dev 127.0.0.1 3000` and reported an invalid project directory, use `npm start` without forwarded flags. A successful `npm ci` does not need repeating for this script-only change.

If Next.js reports that another development server is already running for this project, open the URL it reports (for example `http://localhost:3000/`). To start a fresh server, stop that server with `Ctrl+C` in its original terminal first. Changing the port does not bypass the project's development-server lock. Do not terminate an unrelated process or blindly copy a PID-kill suggestion.

The existing Google-font setup needs internet access while building. Explain any further prerequisites when a slice is ready. Automated browser tests use port 3100; manual review uses port 3000. If an unrelated process occupies 3000 and this project has no running development server, leave that process running and use the installed Next.js CLI directly for an alternate local development port:

```powershell
node .\node_modules\next\dist\bin\next dev --hostname 127.0.0.1 --port 3001
```

Then open `http://127.0.0.1:3001/`. This alternate port supports homepage/booking visual review only; the enquiry origin gate requires port 3000 for owner review. Do not terminate unrelated processes.

Stop the server with `Ctrl+C` in its terminal. Browser refresh alone does not stop it.

### If the browser reports connection refused

For Studio at `http://127.0.0.1:54323/project/default/editor`, open Docker Desktop and wait for Engine running, then run:

```powershell
Set-Location 'D:\Projects\stratadrive'
npm run enquiries:local:prepare
```

Wait for preparation to complete successfully, then refresh the Studio URL. `npm start` serves the website on port 3000; Studio and enquiry storage require the separate Docker services. The guarded preparation retains existing development rows, volumes and credentials. A Studio-only connection refusal does not require reinstalling dependencies or restarting a working website. If preparation refuses a guard/ownership check, keep the concise error and investigate it without deleting configuration or resetting volumes.

The review URL is available only while a local server is listening. If you start it yourself, keep the `npm start` terminal open and wait for Ready before opening the URL. If an agent starts it for your review, the handoff must say explicitly whether that server remains running; a stopped QA process cannot serve the preview link.

On 2026-10-24 a live project process blocked startup while neither local hostname had a port-3000 listener. The process was verified against the StrataDrive project path and restarted; both review pages then returned HTTP 200. Do not blindly terminate a PID from an old message. If this happens again, supply the current terminal output so the actual project process and listener can be checked safely. Reinstalling dependencies, changing firewall settings or deleting project files is not the first troubleshooting step.

## Per-feature checklist template

For the current 1A candidate, use the specific checklist in [its iteration record](iterations/1a.md#owner-manual-review). The general template is:

| Check | Expected result | Owner result |
| --- | --- | --- |
| Open supplied local URL | The implemented feature loads, with no unexpected errors | Pending |
| Desktop visual review | Readable hierarchy, spacing, imagery and content; owner likes the result | Pending |
| Mobile review around 390 px wide | Usable layout and controls, without horizontal page scrolling | Pending |
| Navigation and primary action | Each implemented destination/action behaves as documented | Pending |
| Keyboard and 200% zoom | Visible focus, operable controls and readable reflow | Pending |
| Happy path using supplied synthetic input | The documented result occurs | Pending if applicable |
| Validation or failure path | Clear feedback, retained input where appropriate, no false success | Pending if applicable |

For enquiry or booking work, provide the actual fixture/reset commands only after the local backend exists. A synthetic address such as `learner@example.test` is suitable; no real email delivery or booking should occur during review. State how durable local acceptance is verified and which integrations remain disabled.

## Record owner acceptance

The iteration record must include candidate identity, review date, devices/viewports, owner findings and one of:

- **Pending:** handoff supplied, awaiting the owner's review.
- **Changes requested:** record requested changes and offer the revised candidate again.
- **Accepted:** record the owner's explicit acceptance of that candidate and scope.

Do not infer acceptance from elapsed time, silence, a successful build, automated tests or an agent's approval. Local acceptance does not grant deployment or external infrastructure approval.
