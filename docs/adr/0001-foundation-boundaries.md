# ADR 0001: Initial application and engineering boundaries

Date: 2026-10-24 (Australia/Brisbane)

Status: accepted for Iteration 0A repository preparation by owner instruction to proceed. External activation is not approved.

## Context

The repository is a Next.js starter for one driving instruction business that will grow from one instructor to several. It needs controlled parallel engineering and evidence before business functionality.

## Decision

Keep a modular monolith, with thin Next.js adapters and shared server-only authorization/data boundaries. Separate business membership from instructor assignment. Defer independent-business tenancy and all database implementation.

Use OpenAPI 3.1 for business HTTP contracts and a structured requirement/test catalogue. Start with an empty business contract and meaningful foundation checks. GitHub remains authoritative; Azure validates the same immutable GitHub commit using the same command sequence and independent build.

Define reusable Planner, Developer, Tester and Critic roles, with actual permission isolation established at parent-session/filesystem level. Assign one writer per file and review integrated candidates.

## Alternatives and consequences

Microservices, full SaaS tenancy and generic repository frameworks add operational or implementation cost before requirements justify them; defer them. Using undocumented framework mutation paths would fragment contract coverage; require an explicit decision before adoption. An Azure source mirror would introduce competing authority; connect Azure directly to GitHub instead.

The initial Error schema and scaffold tests establish tooling, not business correctness. Pipeline definitions do not prove external runs. Future decisions can supersede this ADR with evidence rather than rewriting history.
