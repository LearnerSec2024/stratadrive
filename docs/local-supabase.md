# Local Supabase with Docker Compose

Use synthetic data only. This is the local service lifecycle/recovery runbook, separate from any hosted project. [Technology stack](tech-stack.md#local-database-and-supporting-services) owns the current service inventory, image versions and data-flow diagram. The implemented enquiry form/API and private migration are prepared through `enquiries:local:prepare`; see [the enquiry walkthrough](manual-testing.md#enquiry-review).

## Stack and setup boundary

This project uses the Compose-managed setup because both CLI startup modes failed runtime loopback-isolation checks on this machine. Those attempts were stopped; their evidence is preserved in [Iteration 1B](iterations/1b.md). Do not use `supabase start` for this environment.

The [setup provenance](../infra/local-supabase/README.md) retains vendor origin, licenses, hashes and intentional configuration differences. The setup-only lifecycle commands apply privilege/bootstrap policy; the separate guarded enquiry preparation owns the business migration and application configuration.

Only the services listed in the stack reference are started; other Studio panels may be unavailable. The direct Studio address is an unauthenticated **loopback development administrator interface**, accessible to local machine users. Never use real customer data or production credentials, expose these ports through a tunnel/firewall rule, or use this configuration for deployment.

## Start and verify

For the whole Windows review environment, use `npm run review:local` from `D:\Projects\stratadrive`. It opens Docker Desktop when needed, waits for the approved local Linux engine, runs the guarded enquiry preparation and service check, then starts the app and opens its review pages. The [README startup index](../README.md#run-the-app) explains conditional dependency installation, readiness, failure recovery and shutdown. Existing data and credentials are retained. Use the individual database-only commands below for diagnosis or scoped lifecycle work.

Open Docker Desktop and wait for Engine running. Use an ordinary PowerShell terminal with the project's Node 22.15.0 / npm 10.9.2 baseline:

```powershell
Set-Location 'D:\Projects\stratadrive'
npm ci
npm run db:local:init
npm run db:local:preflight
npm run db:local:start
```

Initialization creates fresh development credentials in ignored `infra/local-supabase/.env.local`; rerunning it retains the existing file. Do not edit, copy to production, commit or paste that file into chat. Git ignore is not an access boundary. Do not remove it while retaining the database volume: regenerating passwords would not update existing database roles.

Preflight rejects remote Docker sockets and Docker endpoint overrides; verifies upstream/local artifact hashes; and checks the fully rendered model before startup. Only the five approved service/image versions, project-scoped volumes, approved read-only file mounts and exact loopback port mappings are accepted. The helper adds Docker's installed helper directory to its own process PATH without changing global settings.

The first start pulls images and can take several minutes. Guarded start deliberately stops existing project containers, starts PostgreSQL first, waits for its entrypoint initialization to finish, applies the pinned privilege-only development bootstrap in a transaction as the local bootstrap administrator, then starts the remaining services. This final grant application is necessary because upstream image migrations restore an unused schema grant after init scripts. It creates no business tables, functions or records.

The command then checks container state, available health checks, published ports, Windows host listeners, Studio HTTP 200, privileged REST readiness HTTP 200, intentional anonymous REST denial HTTP 403, read-only SQL and effective grants. If startup or runtime verification fails, it attempts to stop only this project's containers. It does not delete data. A failed startup is not readiness; share the concise console message first. Raw local error logs may contain generated development secrets and should not be pasted unreviewed. Use these guarded commands after restarts; do not start containers individually through Docker Desktop.

To recheck a running stack:

```powershell
npm run db:local:check
```

Sanitized evidence is written to `reports/local-supabase-development-check.json` (or the separate test-target report). Service health does not by itself establish enquiry persistence. The [manual enquiry walkthrough](manual-testing.md#enquiry-review) and [1B record](iterations/1b.md) describe actual feature review and evidence.

## Manual visual check

After the guarded start/check passes, open:

- Studio: `http://127.0.0.1:54323/`
- API base: `http://127.0.0.1:54321/` (gateway dashboard uses development basic authentication)
- PostgreSQL: loopback port `54322`

Use the **direct Studio URL**; no application account is needed. Confirm the project is local/synthetic-only. After `npm run enquiries:local:prepare`, the private enquiry tables exist: select `enquiry_private` → `enquiries` to inspect synthetic receipts. The public schema may still show no tables. Open SQL Editor and run this optional read-only query:

```sql
select current_database(), current_setting('server_version');
```

Expected: database `postgres` and PostgreSQL 17. Do not create tables, submit customer information, connect an external project or enable integrations. SQL Editor may offer to save a snippet; avoid saving one for this check. Auth/Storage/Functions panels are outside this reduced stack.

Tell us whether Studio opens and whether errors appear. Owner disposition is separate from automated service checks. The enquiry feature has its own sample-only manual checklist and remains pending explicit acceptance.

## Stop, retain and resume

```powershell
Set-Location 'D:\Projects\stratadrive'
npm run db:local:stop
```

This verifies the local engine and exact project/working-directory ownership, then stops only StrataDrive containers. It works even if the credential file or startup artifacts have changed. Data remains in this project's named volumes. It does not stop unrelated projects or Docker Desktop. Resume with `npm run db:local:start`, then recheck Studio. Keep Docker Desktop running while using the stack.

No broad development reset is provided. The [enquiry guide](manual-testing.md#enquiry-review) documents a guarded cleanup for one exact standard synthetic sample/key; it retains other rows, quota and volumes. Automated cleanup is restricted to the separately leased test target. Do not run volume/system prune, `down -v`, cloud login/link, remote database push or deployment commands. Retained data from earlier CLI attempts is separate and is not imported or deleted.

The initial Compose initialization also exposed a missing upstream webhook bootstrap dependency. It is now vendored and hashed with the other official assets; its unused HTTP functions are denied to public roles. The failed original data volume is retained, while the corrected environment uses the explicitly named `stratadrive-local_db-data-bootstrap-v2` volume. This is a setup correction, not an enquiry schema migration.

## Existing website review

The website works independently of Supabase. In another ordinary PowerShell terminal:

```powershell
Set-Location 'D:\Projects\stratadrive'
npm start
```

Keep it open and visit `http://127.0.0.1:3000/` and `http://127.0.0.1:3000/book`. Stop that terminal with `Ctrl+C`. The booking page remains a preview; no lesson or enquiry is submitted.

## References and history

[Official Supabase Docker guidance](https://supabase.com/docs/guides/self-hosting/docker), [Docker port publishing](https://docs.docker.com/engine/network/port-publishing/), and [Iteration 1B decisions and actual validation](iterations/1b.md). Windows prerequisite recovery and the failed CLI/network attempts remain dated history in that record; they are not current startup instructions.
