# OpsWeave — portfolio handoff

**Status: public standalone release verified on 2026-09-18. Live: https://opsweave.onrender.com.**

## Product

- **Name:** OpsWeave.
- **Short description:** A workspace for running incident-response playbooks with human decisions and durable execution history.
- **User problem:** During an incident, responders need a clear next action, an explicit approval point and a trustworthy record of what happened.
- **Project contribution:** Independent product architecture, original Node/Postgres execution and authentication, transactional idempotency/replay, React interface and RU/EN, incoming integration API, verification, deployment packaging and provenance separation from the earlier Novu-based exploration. Development was AI-assisted; third-party libraries are credited rather than claimed as original work.

## Actual stack

React 19.2.3, TypeScript 5.6.2, React Hook Form 7.71.1, TanStack Query 5.101.2, Vite 6.4.3, original CSS, Node.js 22.23.0 release image, built-in HTTP/crypto/scrypt, PostgreSQL with pg 8.23.0, Mocha 10.2.0, Playwright 1.58.2/Chromium, Biome 2.2.0, Docker and GitHub Actions. Local axe 4.13.0 checks reuse the existing development tool. Render Free without disk and Neon Free PostgreSQL 18 (Frankfurt) are deployed.

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

Browser → same-origin Node API → private PostgreSQL schema. A server loop advances the saved run cursor and records effects atomically; schema-scoped transaction locks protect transitions across replicas. Tasks/approvals wait for user decisions; timers resume from saved deadlines after a free-host sleep or restart. The browser refetches authoritative state every 1.5–2 seconds. A paid local disk is no longer required.

This edition has personal workspaces, not shared-team RBAC. External Slack/email/HTTP delivery, email recovery, SSO and parallel DAG execution are not implemented. A task records a person's work; it does not falsely claim to restart an external service.

## Links

- **GitHub:** https://github.com/godaylor/opsweave
- **Implemented source:** https://github.com/godaylor/opsweave/tree/main
- **Review:** https://github.com/godaylor/opsweave/pull/1
- **Verified PostgreSQL CI:** https://github.com/godaylor/opsweave/actions/runs/35389992408
- **Live URL:** https://opsweave.onrender.com
- **Local PostgreSQL preview:** http://127.0.0.1:32325 (not production).

## Best screenshots

Screenshots show the successful public browser verification on 2026-09-18.

- [Incident and next action](screenshots/03-incident-action.png) — strongest portfolio overview.
- [Playbook editor](screenshots/02-playbook-editor.png).
- [Completed run and history](screenshots/04-run-completed.png).
- [English analytics](screenshots/05-analytics-en.png).
- [First screen](screenshots/01-welcome-desktop.png).
- [Mobile workspace](screenshots/07-workspace-mobile.png).

## Licensing / provenance

Original standalone code is MIT. The export contains no Novu runtime/UI/framework/DAL/providers, Enterprise, Maily or BullMQ. Historical upstream implementation and mandatory licenses remain in the development workspace and are not published by this export. Six browser packages retain exact MIT notices and a generated SPDX inventory. No external media, downloaded fonts or icon packs are used. Full container SPDX/CVE scanning was performed offline with Trivy; see docs/VERIFICATION.md and docs/release/README.md. Available fixes were applied; remaining unfixed Debian advisories are disclosed.

## What actually works in production

The complete scenario → incident → task → approval → timer → completion → reload/history/export workflow passes against the public HTTPS app. Desktop and mobile Playwright: 2/2, retries=0. Neon retained completed runs across Render redeploys. PR #1 is merged into main; CI is green. Frontend and backend run together on Render Free, with DATABASE_URL stored privately and no persistent disk. Free-host sleep can delay first requests and timer execution; this is a public personal-workspace product, not an always-on paging SLA.

## Readiness assessment

These are engineering estimates for the current state, not measured reliability percentages. All categories have equal weight.

| Category | Ready | Finished and checked | Remaining |
|---|---:|---|---|
| Concept and purpose | 95% | Clear incident-to-outcome workflow | Real responder feedback |
| UX/UI | 90% | RU/EN, public desktop/mobile, local axe checks | Broader manual accessibility validation |
| Core functionality | 90% | Full public workflow, history/export, local replay and conditions | Optional external delivery/team collaboration |
| Testing/security/quality | 85% | 13 server tests, public E2E, CI, full offline image scan | Unfixed OS advisories and production load evidence |
| Backend/database/auth | 90% | Neon, isolated accounts, sessions, scoped keys, restart persistence | Email recovery and long-term operations |
| Public production deploy | 95% | Render Free + Neon Free, HTTPS, full public test | Free-tier sleep and quota limitations |
| GitHub/docs/licensing | 95% | Merged main, green CI, notices, SBOM, release evidence | Future dependency/security maintenance |
| Personal Portfolio readiness | 95% | Working Live URL, verified screenshots and accurate scope | Real-world feedback |

**Overall: (95 + 90 + 90 + 85 + 90 + 95 + 95 + 95) / 8 = 91.875%, rounded to 92%.**
