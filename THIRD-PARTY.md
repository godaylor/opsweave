# Provenance and third-party software

This distribution contains the original OpsWeave implementation written in September 2026:

- Node HTTP API, SQLite persistence, authentication and execution engine in `apps/api/standalone`.
- React UI, forms, execution timeline, incident views and styles in `apps/dashboard/src/components/opsweave-standalone`.
- Build, tests, deployment and documentation.

The product was previously explored as a Novu Community Edition transformation. That implementation is retained in the private development workspace. This standalone distribution does **not** export the Novu runtime, shared packages, DAL, framework, provider code, authentication, UI implementation, Maily, Enterprise code, private submodules, BullMQ or WebSocket server. It implements a smaller product contract independently. It does not claim feature parity with that historical implementation or derive redistribution permission from renaming it. The retained development tree still requires its original licenses and notices; they have not been deleted.

The browser bundle uses ordinary third-party libraries: React and React DOM (MIT, Meta Platforms), Scheduler (MIT, Meta Platforms), TanStack Query and Query Core (MIT, Tanner Linsley), React Hook Form (MIT, Beier/Bill). Exact installed license texts and version inventory are generated into `dist/opsweave-public/THIRD-PARTY-NOTICES.txt` and `SBOM.spdx.json` by the release notice command. Build and test dependencies remain listed in the lockfile and retain their own notices; they are not installed in the runtime container.

No external photographs, stock graphics, web fonts, logo assets or icon packs are used. Typography uses fonts available on the user's device; symbols use text glyphs. Layout and CSS were authored for this product. The OpsWeave wordmark is text.

The Node base image contains Node.js, SQLite and Debian components with their own licenses. Browser SBOM/notice generation does not replace a container SBOM and vulnerability scan. An image release needs both.
