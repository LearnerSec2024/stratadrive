# Postman manual API tests

Import these two files:

- [stratadrive-api.postman_collection.json](stratadrive-api.postman_collection.json)
- [stratadrive-local.postman_environment.json](stratadrive-local.postman_environment.json)

They provide 11 manual scenarios for the currently contracted `POST /api/v1/enquiries` operation. [The canonical OpenAPI](../contracts/openapi.yaml) remains the API source of truth. The import files contain synthetic examples and no credentials.

## Tools needed

| Tool | Purpose in this walkthrough |
| --- | --- |
| Postman desktop app for Windows | Import the collection/environment, send the sample and read built-in test results |
| PowerShell 7 | Run project startup/readiness and optional scoped cleanup commands |
| Project-compatible Node.js and npm | Run the StrataDrive application; follow the pinned project setup in Start Here |
| Docker Desktop, local Linux engine | Run the guarded local Supabase/database services |
| A browser | Check the local enquiry page and optionally inspect the exact synthetic receipt in Studio |

The project must already be available at `D:\Projects\stratadrive`. Git is needed to obtain/update a checkout; it is not needed to click Send once the checkout is ready. VS Code is optional for reading files. Postman CLI, Newman, an API token and database credentials are not needed. See [the current technology inventory](../docs/tech-stack.md) for full tool/version details. These prerequisites are not a claim that each tool is installed.

## Install and open Postman

1. If Postman desktop is missing, use [the official download page](https://www.postman.com/downloads/), select the Windows build for your processor, run its installer, then open the desktop app. You do not need the separate Desktop Agent for this desktop walkthrough. See [Postman's installation guide](https://learning.postman.com/docs/getting-started/installation/install-app).
2. Open a workspace that offers **Collections** and **Environments**. Postman's signed-out lightweight client supports individual requests; using the collection/environment workflow requires workspace access and may require signing in to your Postman account. That account is separate from this StrataDrive API, which requires **No Auth**. [Postman client/workspace documentation](https://learning.postman.com/latest-v-12/docs/getting-started/basics/using-api-client).
3. Use only the supplied synthetic files. Never put database passwords, Studio credentials or production tokens into this environment.

## Start the local application

Open Docker Desktop and wait for Engine running. From PowerShell:

```powershell
Set-Location 'D:\Projects\stratadrive'
npm run enquiries:local:prepare
npm start
```

Run `npm ci` first only on initial setup or after the lockfile changes. Reuse an already working StrataDrive server instead of starting a second one. Keep the app terminal and Docker running. [README](../README.md) is the command/URL index; the [manual workbook](../tests/manual/iteration-1b-manual-tests.xlsx) starts with the full ordered service setup.

Wait for **Ready**, then open `http://127.0.0.1:3000/enquire` in a browser. The local enquiry form must load before the Postman test. The API base is port **3000**; Studio uses **54323** and the isolated automated server uses **3100**.

## Import and run

1. **Already imported? Reuse the existing collection/environment for this walkthrough.** The import steps below are for first setup. For a deliberate file update, record `enquiryKey`, the original body, `receiptKey`, `receiptBaseUrl`, `enquiryId` and `receivedAt` before replacing anything; restore the same values in the active environment and the original request body before any Send. Import does not guarantee preservation of runtime values. An uncertain intent must keep its original key **and** body; do not run a different fresh sample over it.
2. In the desktop workspace open **Import**, or **Use resources or import → Import**. Choose `D:\Projects\stratadrive\postman\stratadrive-api.postman_collection.json`. Complete the import and check **StrataDrive API — local manual tests** appears under Collections. [Import instructions](https://learning.postman.com/docs/getting-started/importing-and-exporting/importing-data/).
3. Repeat Import for `D:\Projects\stratadrive\postman\stratadrive-local.postman_environment.json`.
4. From the environment selector at the top right, choose **StrataDrive local**. Inspect the effective local value `baseUrl = http://127.0.0.1:3000`. For a fresh import the other five variables are blank; do not clear an existing key/receipt to imitate a fresh import. [Environment selector and values](https://learning.postman.com/docs/use/send-requests/variables/managing-environments/).
5. Expand **StrataDrive API — local manual tests → 01 Enquiry save and retry** and open **01 Save synthetic enquiry**. Keep its imported scripts intact and follow the single-sample walkthrough below.

## Run one sample: save a synthetic enquiry

Check the existing request before clicking Send:

| Setting | Value |
| --- | --- |
| Method | `POST` |
| URL | `{{baseUrl}}/api/v1/enquiries` |
| Resolved URL | `http://127.0.0.1:3000/api/v1/enquiries` |
| Authorization | **No Auth** |
| Content-Type | `application/json` |
| Idempotency-Key | `{{requestKey}}`, supplied by the imported pre-request script |
| Settings | **Automatically follow redirects** off |

Under **Body → raw → JSON**, keep the prefilled sample:

```json
{
  "name": "Test Learner",
  "email": "learner@example.test",
  "message": "Synthetic enquiry for local manual testing."
}
```

1. Click **Send once** and wait. The script generates one UUIDv4 only when `enquiryKey` is blank, then pins it as `requestKey` for the request. Do not replace this with a fresh `{{$guid}}` on every send.
2. In the **actual response** inspect status, Body and Headers. Expect **201 Created** for a new intent, or **200 OK** for an identical intent already saved under this key. The response has exactly `enquiryId`, `receivedAt` and `status`; the status value is `received`, the ID is a UUID and the time ends in `Z`. Header `Cache-Control` is `no-store` and `Content-Type` includes `application/json`. ID/time vary on a new save. No name, email or message is echoed; no lesson is booked or email sent.
3. Open the response **Test Results** tab. The imported post-response assertions run after Send and should all pass. A failed assertion or script error requires investigation even if the HTTP status looks successful. A saved response Example is reference data, not evidence that a new request ran. [Post-response tests and Test Results](https://learning.postman.com/docs/tests-and-scripts/write-scripts/test-scripts/).
4. Inspect **StrataDrive local**: the valid receipt captures `enquiryId`, `receivedAt`, `receiptKey` and `receiptBaseUrl`; `enquiryKey` remains the current intent. Record those values and response/assertion evidence. Use workbook **API-002** for setup and **API-003** for the sample; complete API-003's exact private-row check before marking that full case Pass.
5. Optional: send this same request once more without editing the body/environment. Expect **200**, the original ID/time and passing assertions. This confirms the same intent; it does not create a second receipt. Keep the key/receipt for later replay/conflict tests.

This is one sample request. When ready for the broader suite, run **02 Replay the saved enquiry**, then **03 Conflict with changed message** in order. Next use the individual requests in **02 Validation and request guards**. Each has prepared input, a saved response example and expected-result assertions.

You can also run the collection once in its saved order. The positive sequence creates at most one standard sample for its current key; replay and error cases should not create further rows. A skipped request with missing prerequisites is **Blocked**, not a pass. Invalid target/environment selection also skips sending. Open the Postman Console to read the logged Blocked reason.

## If the first sample does not pass

| Observation | What to do |
| --- | --- |
| Connection refused / no response | Complete Start Here startup and verify `/enquire` loads on port 3000. Keep the current key/body; resend 01 once ready. |
| `503 STORAGE_UNAVAILABLE` | Restore the recognized local stack with `npm run enquiries:local:prepare`, then retry 01 with the same key/body. |
| `429 RATE_LIMITED` | Wait the response `Retry-After` seconds, then retry the same intent. Never rotate keys or fill/reset development quota. |
| Skipped / Blocked | Open **View → Show Postman Console**, read the reason and fix the active environment/target/prerequisite. Do not disable the guard. Record Blocked, not Pass. |
| Red Test Results or script error | Save actual response/error evidence and inspect the stated assertion. Check supported current desktop scripts and imported state; do not claim a pass from the status alone. |

After any uncertain result, a retry may return 200 if the original save committed. Do not clear `enquiryKey` or change the body to resolve uncertainty. Leave optional cleanup until replay and evidence are complete.

## Requests and expected results

| Request | Expected HTTP result | Purpose |
| --- | --- | --- |
| 01 Save synthetic enquiry | 201 new, 200 same-key resend | Save the standard sample and retain its receipt |
| 02 Replay the saved enquiry | 200 | Confirm the identical original reference/time |
| 03 Conflict with changed message | 409 `IDEMPOTENCY_CONFLICT` | Reject changed content under the saved key |
| 04 Missing idempotency key | 400 `INVALID_REQUEST` | Require the header |
| 05 Invalid idempotency key | 400 `INVALID_REQUEST` | Require a UUIDv4 |
| 06 Invalid required fields | 400 `INVALID_REQUEST` | Reject invalid name/email and show field errors |
| 07 Unknown JSON property | 400 `INVALID_REQUEST` | Reject fields outside the contract |
| 08 Malformed JSON | 400 `INVALID_REQUEST` | Reject an incomplete JSON body |
| 09 Unsupported content type | 415 `UNSUPPORTED_MEDIA_TYPE` | Require supported JSON media |
| 10 Foreign Origin header | 403 `REQUEST_NOT_ALLOWED` | Reject the foreign header while the destination stays loopback |
| 11 Oversized request body | 413 `PAYLOAD_TOO_LARGE` | Generate and reject an actual body over 8192 bytes |

The collection-level script checks the fully resolved initial request URL and permits only the local owner app on port 3000. It does not target the isolated automated server on 3100. Request scripts pin their generated key in local scope. Automatic redirects are disabled in the saved collection/request settings; keep **Automatically follow redirects** off in your client's request Settings. These are accidental-target guards, not an OS/network security boundary.

## Retry, new intent and retained data

The standard synthetic save uses:

```json
{
  "name": "Test Learner",
  "email": "learner@example.test",
  "message": "Synthetic enquiry for local manual testing."
}
```

After a network error, timeout, 503 or 429, keep `enquiryKey` and the original body unchanged. Restore local services or wait as appropriate, then resend **01** to confirm that same intent. A valid 200 receipt is expected if the earlier save already committed. Error/invalid responses do not replace the saved receipt. Requests 02/03 require a matching saved receipt/key/base URL.

To begin an explicitly different enquiry after the previous result is confirmed, record the old key/reference for cleanup and clear only `enquiryKey` in the environment. Request 01 will generate a new key. Do not clear keys merely to retry an uncertain save. If you edit the sample fields, keep them synthetic; the existing expected examples/assertions may need to change for your case.

The database admits 20 new enquiries per fixed ten-minute window; identical replays do not consume new quota. Do not fill or reset that quota as a manual collection test. Slow-stream 408, quota concurrency/429 and server-internal 500 are covered by the appropriate existing automated tests/contract, not forced by this collection. For a controlled storage-unavailable 503 walkthrough, use [the manual guide](../docs/manual-testing.md#controlled-unavailable-storage-and-recovery). No intentional outage runs as part of the normal collection.

Postman assertions check the API response. Inspect the matching private Studio row if you also want to confirm storage or absence of extra rows; there is no public list/read/delete API.

## Scoped cleanup and shutdown

For an exact standard sample, substitute the saved `enquiryKey` UUID in a second PowerShell terminal:

```powershell
Set-Location 'D:\Projects\stratadrive'
npm run enquiries:local:sample -- receipt UUID
npm run enquiries:local:sample -- remove UUID
```

The helper checks the development target and matches the key plus all standard sample fields. It retains other rows, quota and volumes. Other edited samples are outside that cleanup. Deleting a sample ends replay protection for its key: the next save can create a new receipt, and the old captured receipt should not be treated as a replay baseline. Record that intentional cleanup before clearing the related Postman state for a fresh review.

Stop the app with Ctrl+C in its original terminal and run `npm run db:local:stop` to retain data while stopping the local stack. Keep your recorded manual workbook results unchanged unless you are recording your actual execution.

## Maintenance and verification

For every approved API addition, change or removal, update this collection's requests, saved examples, assertions and source identity alongside [openapi.yaml](../contracts/openapi.yaml). Update environment defaults only where needed, keep them free of credentials, refresh affected generated schemas/visual docs and manual coverage, and keep the current workbook's **Start Here → API testing** section aligned. The collection description records the source SHA256 for this prepared copy. Preserve any personal Postman execution results/environment state before reimporting a fresh copy, especially an uncertain intent's key and receipt. Do not edit the canonical contract indirectly through Postman. See [the standing workflow](../docs/agent-workflow.md#api-contracts-and-postman-maintenance).

Repository checks validate the official collection format and exercise scripts with local fixtures, including failure controls. Native Postman import/manual execution remains for the owner; those checks do not mark manual tests or feature acceptance passed.

Postman references: [import files](https://learning.postman.com/docs/getting-started/importing-and-exporting/importing-data/), [collection format](https://schema.postman.com/collection/json/v2.1.0/draft-07/docs/index.html), [dynamic UUID variables](https://learning.postman.com/docs/tests-and-scripts/write-scripts/variables-list/), [skipping a request from a pre-request script](https://learning.postman.com/latest-v-12/docs/tests-and-scripts/write-scripts/postman-sandbox-reference/pm-execution), [redirect setting](https://support.postman.com/hc/en-us/articles/211913929-My-request-is-redirected-to-a-GET-request).
