# Security and development isolation

## Non-negotiable boundaries

- Agents and CI must not access production secrets, real customer information, production databases or production-capable connectors.
- No deployment, infrastructure provisioning, external settings changes, publication or merge without explicit owner approval for that action.
- Only synthetic fixtures and loopback test targets are permitted in 0A. No Supabase project is connected.

Keep production credentials and customer exports outside agent-accessible filesystems, environment variables and connected tools. Do not inspect environment-file contents to check this; the owner supplies a credential-free development process. `.env` ignoring prevents accidental commits, not reads or external access. Read-only filesystem permissions also do not constrain MCP/browser service mutations.

Project role prompts describe behavior, not a complete security boundary. Use separate read-only reviewer sessions, constrained writing worktrees, least-privilege tools and credential-free processes. Never select a full-access sandbox or approval bypass for this workflow.

## Local automated testing

The test-target guard accepts only explicit HTTP loopback hosts on port 3100 and rejects credentials, query strings, fragments and non-root URLs. Browser tests restrict network requests to their local app origin; HTTP smoke disables redirects. These checks reduce accidental targeting but do not replace OS/network controls or prove that no other process can access production.

Tests do not consume application environment files or customer data. Next.js itself loads supported environment files: run from a clean development/CI checkout with no production files or inherited credentials. Do not run untrusted repository code on a workstation or self-hosted runner containing production access.

## CI execution

Use ephemeral hosted runners, read-only source tokens and no persisted checkout credentials. No secrets, service connections for deployment, protected environment access or production variable groups. Validate ordinary pull requests; do not execute untrusted PR code with elevated `pull_request_target` credentials. Pin GitHub actions to reviewed commit SHAs and tool dependencies to the lockfile. Review dependency lifecycle scripts and dependency updates as executable code.

Source identity and check outcomes must be retained even on failure where the runner reaches validation. Missing artifacts are missing evidence, never a pass. Reports contain synthetic/local data only; retain for 14 days initially. CI provider integration tokens remain platform-managed and must not be forwarded into app/test environments.

## Future application controls

Supabase Auth is not authorization. Use explicit resource/capability checks and least-privilege database access with RLS; service credentials can bypass RLS. Keep privileged clients server-only, avoid user-editable authorization metadata and test cross-user/cross-instructor access denial. Return minimal DTOs. Protect public forms against abuse and define retention/consent before collecting enquiries. Add customer/guardian, communications and audit requirements before implementing those capabilities.

Physical project/environment separation, hosting, backups and secret lifecycle need a separately approved infrastructure plan. No such infrastructure is created by 0A.
