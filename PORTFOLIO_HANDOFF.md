# OpsWeave — portfolio handoff

**Status: implementation verified; public release pending.** Do not label the historical GitHub Pages address as the live app.

## Product

- **Name:** OpsWeave.
- **Short description:** A workspace for running incident-response playbooks with human decisions and durable execution history.
- **User problem:** During an incident, responders need a clear next action, an explicit approval point and a trustworthy record of what happened.
- **Project contribution:** Independent product architecture, original Node/SQLite execution and authentication, transactional idempotency/replay, React interface and RU/EN, incoming integration API, verification, deployment packaging and provenance separation from the earlier Novu-based exploration. Development was AI-assisted; third-party libraries are credited rather than claimed as original work.

## Actual stack

React 19.2.3, TypeScript 5.6.2, React Hook Form 7.71.1, TanStack Query 5.101.2, Vite 6.4.3, original CSS, Node.js 22.23.0 release image, built-in HTTP/crypto/scrypt/SQLite, SQLite WAL, Mocha 10.2.0, Playwright 1.58.2/Chromium, Biome 2.2.0, Docker and GitHub Actions. Local axe 4.13.0 checks reuse the existing development tool. Render Blueprint is prepared but not provisioned.

## Main capabilities

1. Create/edit/publish versioned sequential playbooks.
2. Start real, persisted incidents manually or through an idempotent incoming API.
3. Run conditional steps, log entries and durable timers on the server.
4. Complete responder tasks and approve/reject decisions with an explanation.
5. Review the execution timeline, resolve incidents and export JSON.
6. Create a new correlated replay attempt without changing history.
7. Use an isolated guest workspace or an account; rotate/revoke a scoped API key.
8. View actual response metrics in an adaptive RU/EN interface.

## Architecture

Browser → same-origin Node API → SQLite WAL. A server loop advances the saved run cursor and records effects atomically. Tasks/approvals wait for user decisions; timers resume from saved deadlines. The browser refetches authoritative state every 1.5–2 seconds. One persistent server instance is sufficient. No enterprise notification stack is needed.

This edition has personal workspaces, not shared-team RBAC. External Slack/email/HTTP delivery, email recovery, SSO and parallel DAG execution are not implemented. A task records a person's work; it does not falsely claim to restart an external service.

## Links

- **GitHub:** https://github.com/godaylor/opsweave
- **Implemented source:** https://github.com/godaylor/opsweave/tree/codex/standalone-product
- **Review:** https://github.com/godaylor/opsweave/pull/1
- **Verified CI:** https://github.com/godaylor/opsweave/actions/runs/34547004457
- **Live URL:** **not available — public deployment requires billing and release approval**.
- **Local image preview:** http://127.0.0.1:32323 (not production).

## Best screenshots

All screenshots show actual local application screens, not fabricated production results.

- [Incident and next action](screenshots/03-incident-action.png) — strongest portfolio overview.
- [Playbook editor](screenshots/02-playbook-editor.png).
- [Completed run and history](screenshots/04-run-completed.png).
- [English analytics](screenshots/05-analytics-en.png).
- [First screen](screenshots/01-welcome-desktop.png).
- [Mobile workspace](screenshots/07-workspace-mobile.png).

## Licensing / provenance

Original standalone code is MIT. The export contains no Novu runtime/UI/framework/DAL/providers, Enterprise, Maily or BullMQ. Historical upstream implementation and mandatory licenses remain in the development workspace and are not published by this export. Six browser packages retain exact MIT notices and a generated SPDX inventory. No external media, downloaded fonts or icon packs are used. Full container SBOM/CVE verification remains open after Docker Scout's metadata transfer was rejected by automatic approval review.

## What actually works in production

**No public production behavior has been verified.** The complete create → publish → run → task → approval → timer → resolve → reload/export path passes locally and in GitHub CI against a real backend. The Linux image builds and runs locally. Render reached the payment-information gate; no service or Live URL has been provisioned. Main awaits approval to merge PR #1.

## Readiness assessment

These are engineering estimates for the current state, not measured reliability percentages. All categories have equal weight.

| Category | Ready | Finished and checked | Remaining |
|---|---:|---|---|
| Concept and purpose | 95% | Clear incident-to-outcome workflow and explicit compact scope | Feedback from real responders |
| UX/UI | 90% | RU/EN, mobile, states, execution timeline; browser checks and six axe states | Broader manual accessibility and device validation |
| Core functionality | 85% | Full real scenario, conditions, approvals, replay/export, incoming API | Optional external delivery and shared-team collaboration |
| Testing/security/quality | 85% | 11 server tests, desktop/mobile E2E, green CI, offline app scan, zero npm production advisories | Container CVEs/full image SBOM and production performance |
| Backend/database/auth | 85% | Original durable server, isolated accounts, sessions, scoped keys, restart test | Email recovery and operational production validation |
| Public production deploy | 15% | Reproducible image and prepared persistent-disk Blueprint | Billing, actual deploy and public end-to-end check |
| GitHub/docs/licensing | 90% | Personal repository, review branch/PR, CI, README, notices, screenshots | Authorized merge to main and full image scan |
| Personal Portfolio readiness | 80% | Accurate description, stack, contribution and screenshots | Live URL and production evidence |

**Overall: (95 + 90 + 85 + 85 + 85 + 15 + 90 + 80) / 8 = 78.125%, rounded to 78%.**
