# OpsWeave standalone verification — 2026-09-28

## V3 — guided action plans, 2026-09-28

Scope: the existing standalone product only. The user authorized the V3 assignment and publication to the existing free Render target. No backend/API contract, dependency, database schema, secret, permission or hosting-plan change. Initial project and publishing checkouts were clean; the public base was c8d426e. Legacy CE milestones below are historical evidence, not this release.

- The RU/EN welcome page explains IT failure instructions using a fictional checkout incident, human responsibility, and the distinction from RelayOps. Forms explain field effects and tasks versus blocking confirmations. Personal accounts, isolated guests, the seven-day guest cookie, registration to retain access, unavailable email password recovery and free-server wake delays are explicit.
- “Как пользоваться” / “How to use” opens an inline guide with real-control focus, Next/Back/Skip/Finish, Escape and focus return. Dismissal survives refresh and the guide can be restarted. It does not cover controls or execute steps. Explicit practice buttons create a private practice copy using the existing API; normal plans are untouched.
- The practice path persists plan/execution references, uses the existing atomic idempotency key, and exercises task + note → required confirmation → five-second timer → completion → history → JSON. Refresh, navigation back/forward, missing guide targets and rejected attempts to bypass confirmation are covered.

### Local checks

- TypeScript, Biome (16 files), Vite production build and 13 PostgreSQL runtime/security/restart tests PASS.
- Chromium: all five product scenarios PASS; the separate axe/touch scenario PASS after correcting its test harness. WebKit: all six scenarios PASS, retries=0 (56.8s). Firefox: all six scenarios PASS, retries=0 (55.8s).
- Responsive assertions cover RU/EN welcome, guidance, editor, incident creation/execution, lists and remaining navigation at 320/360/390/430/539/540/541/768/849/850/851/1024/1149/1150/1151/1280/1440/1920/2560/3840/5120/7680 CSS px; empty/one/two/eight plans, long unbroken names, injected API 503 with preserved draft, reduced motion, touch, keyboard, Escape and focus return. CSS 200% zoom and a 320×240 viewport representing 400% reflow are checked.
- Axe 4.13.0 (already installed, no dependency added): zero WCAG 2 A/AA, 2.1 AA, 2.2 AA tagged violations on welcome + intro guide, authenticated guide and editor, each at 320 and 1440 px, in Chromium, Firefox and WebKit. This is an automated check, not WCAG certification.
- Browser tests use one worker, engines sequentially, separate per-run schemas in the existing expendable opsweave_test Postgres. Independent guest/account contexts confirm cross-owner read/export/write refusal. No user database/storage was cleared. Only the project-owned test container was started; no neighboring project or browser tab was altered.
- Bundle: initial JS 68.98 KB gzip; product 29.57 KB; lazy guide/practice 3.90 KB; editor 4.13 KB; CSS 5.58 KB (rounded; final build output is authoritative). No field INP or real-device claim.

### Failures and fixes retained

The first guide selector included a decorative arrow; an explicit accessible label corrected it. A screenshot matrix initially began before the welcome heading was ready; the test now waits for actual content. Existing globally cached Firefox/WebKit versions did not match this project's Playwright; exact browser builds were installed only in an ignored project directory, with global browser garbage collection disabled. Wrong-cwd export and npm argument-forwarding failures were not counted as verification. One attempted local browser start refused the occupied OpsWeave test port while the preceding owned test was finishing; no process was killed or reused.

WebKit exposed actual horizontal overflow from a long native select option at 320 px. Minimum widths alone did not fix it; measured element/scroll bounds isolated the option. Paint containment on the select fixes its native overflow without masking page overflow. WebKit also exposed missing focus after dismissing a native confirmation; both stop and unsaved-editor handlers explicitly restore focus on cancellation. Regression assertions remain strict. The first axe injection was correctly blocked by production CSP; the test now serves the existing axe file through a test-only same-origin intercepted request. CSP was not relaxed.

### Publication and limits

**V3 is live at https://opsweave.onrender.com.** [PR #2](https://github.com/godaylor/opsweave/pull/2) merged as runtime commit 65b2dcb775a8b813f47edf0b0d0c093526583e8a. [PR CI](https://github.com/godaylor/opsweave/actions/runs/36371906448) and [main CI](https://github.com/godaylor/opsweave/actions/runs/36372119135) both PASS, including PostgreSQL, browser, dependency advisory/closure and Docker build gates. Render Free deploy dep-dastho17lnhs73ap85m0 is Live for that commit; no disk or database/secret changes. Public health returns ready/postgres/ready. All five JS/CSS assets match the tested local build byte-for-byte by SHA-256.

Public Chromium verification on that runtime: desktop create/publish → task → confirmation → timer → completion/reload/history/JSON/EN PASS (44.1s), mobile 390px flow PASS (8.4s), guided private checkout practice PASS (1.3m). The latter includes mandatory-confirmation bypass rejection, saved task/confirmation notes, history order, reload + back/forward, persistent guide dismissal, export focus and a second isolated guest receiving 404 for the first guest’s export. The large responsive matrix, registered-account fixtures and axe checks remain local-only; their public skips are intentional and are not reported as public passes. Public 320px welcome screenshot/no-overflow also PASS. Representative screenshots were inspected visually and are in screenshots/v3-welcome-320.png, screenshots/v3-confirmation.png and screenshots/v3-history.png.

The first public guide run completed the plan and verified its export but failed the focus assertion: the test requested a guide target before the execution finished loading after refresh. The UI correctly showed the existing unavailable-target fallback. The test now waits for the visible completed-plan heading before checking focus; the strict focus assertion is unchanged. The targeted public rerun passed, retries=0. This earlier failure is retained; it is not claimed as a clean first-run pass. No runtime correction or data reset was needed. No paid resource is authorized or required. Real iPhone Safari, physical TV/8K hardware, assistive-technology user testing, field performance and a usability study with new users have not been performed. WebKit and extreme widths are browser emulation. Existing free-host delays/quotas and historical unfixed OS advisories remain as documented below.

## Public release — 2026-09-18

**Live: https://opsweave.onrender.com**. Frontend and API share HTTPS on Render Free, service `srv-damoq7sri2ms73b8qfr0`, with no persistent disk. Production data is in the existing Neon Free project opsweave, Frankfurt, PostgreSQL 18. DATABASE_URL is a server secret, absent from source and browser assets. The additive six-table private schema was applied on a validation branch first, then production. Existing local SQLite data was left untouched; private historical data was not uploaded.

PR #1 is merged. Runtime source: main `83d4eb02715dc99ab83ed7b66fc98a9c314392d3`; [CI 35389992408](https://github.com/godaylor/opsweave/actions/runs/35389992408) PASS. Render deploy `dep-dampmbjm8hqs73aca7p0` is live. Public health returns ready/postgres/ready.

- **Public Playwright: 2/2 PASS, retries=0, 1.1 minutes.** Desktop 52.8s: create/save/publish scenario → incident → responder task → approval → durable timer → completed/resolved → reload → persisted history/JSON export → English analytics. Mobile 8.7s: guest workspace, scenario editing/saving, no horizontal overflow. No browser page errors during desktop flow.
- Server regression: 13 tests PASS. Types, lint, build, npm production audit, local browser checks and Docker build PASS in GitHub CI.
- Post-redeploy Neon queries confirmed both earlier public test runs remained completed/resolved. No data reset was used to obtain a pass.
- Full offline image SPDX/CVE scan is now executed: [report](release/README.md). All available fixes applied; zero Node package findings, zero findings with an available fixed version. Remaining Debian advisories are retained and explained; this is not a zero-CVE claim.
- Screenshots now come from the successful public browser run. Earlier accessibility/bundle measurements below remain dated local evidence; they are not new public field measurements.

### Failed public attempts and correction

The first desktop run on d7e6921 exceeded the existing 15-second completion assertion, although Neon confirmed eventual completion; mobile passed. Render Oregon to Neon Frankfurt latency amplified repeated transaction setup queries. Commit 320a324 batches transaction setup into one round trip, preserving locks, parameterization and the same 15-second assertion; all 13 regression tests passed. The next public run passed completion and reload but suffered a socket hang-up on export, followed by a mobile navigation timeout. The final run on 83d4eb0 passed both flows with no retries. These earlier failures are retained as failures, not silently counted as passes.

Free services can sleep and have quotas: first requests may take 50 seconds or more, and timers resume from persisted deadlines after wake; exact wall-clock delivery while asleep is not promised. No paid service, artificial keepalive, or other project's resource was created/changed. Automatic review refused an optional stop of the validation-branch compute; it was left unchanged and does not block the release.

## Historical managed PostgreSQL preparation — 2026-09-13

GitHub CI on implementation commit `d374f0a`: **PASS**, all steps including PostgreSQL tests, desktop/mobile E2E and Docker. [Run 34771650697](https://github.com/godaylor/opsweave/actions/runs/34771650697). Local PostgreSQL preview: http://127.0.0.1:32325 (not public production). Render has accepted the updated free Blueprint and requests only DATABASE_URL; the previous paid-disk billing step is absent.

The existing standalone product is preserved. Persistence is now managed-Postgres-compatible through approved, pinned pg 8.23.0; no runtime SQLite fallback or Render disk remains. Tables are in a private schema with public privileges revoked and RLS enabled. The server role owns the tables; API ownership predicates enforce personal-workspace isolation. SSL verification is mandatory for remote databases. Schema selection is transaction-local for pooler compatibility. Short app-scoped advisory locks serialize acceptance, revisions and execution across replicas.

Verified locally against a new disposable PostgreSQL 17 container, separate from every existing project's data:

- 13 server tests pass, including the full flow, restart recovery, cross-owner paths, concurrent idempotency, two-connection execution, and copy-only SQLite import with refusal to overwrite a populated target.
- Desktop/mobile Playwright flows pass against a real Postgres backend. A restricted Windows invocation completed both scenarios but hung during runner cleanup; it was interrupted. A run with process cleanup permitted completed normally, 2/2, without retries. This environment issue is recorded rather than silently counted as a clean first run.
- Typecheck, Biome lint and Vite build pass. The browser implementation/bundle remains unchanged: initial JS 68.98 KB gzip, product 26.86 KB, editor 3.28 KB.
- npm production audit reports zero known advisories. Docker builds on Node 22.23.0, includes exact notices for 20 production packages and a 21-entry npm SPDX inventory including the app. It does not contain the dev toolchain or excluded upstream packages.
- The production image runs with read-only filesystem and UID 1000; health reports ready/postgres/ready. No local disk is mounted into the app.

Failed intermediate builds were corrected: license files for pg-types and pgpass live in READMEs; their exact MIT texts are now included. npm SBOM required generation before dev dependencies were pruned; the final inventory was checked to exclude those dev packages.

Only new task-owned containers `opsweave-pg-test-20260913` and `opsweave-pg-image-20260913` were created. Database host port is 32324. Previous SQLite volumes and all other projects remain untouched. Local test schemas are retained for inspection; no shared database was dropped.

Public deployment is NOT VERIFIED: Supabase reports the account's two-free-project limit exhausted. No project was paused/deleted/upgraded. Neon Free login reached a GitHub OAuth prompt requesting read-only email access; authorization is pending. Render configuration is now `plan: free` with no disk and private `DATABASE_URL`. No paid service was provisioned. Free hosting can sleep; persisted deadlines resume after wake, with no always-on scheduling guarantee. During idle execution, database polling backs off to 30 seconds; ordinary API activity wakes it sooner.

The prior full-image CVE/SBOM external-scan gate remains separate and unexecuted. The npm inventory above does not claim to scan OS packages. Current Postgres GitHub CI results are reported separately from the historical SQLite run below.

## Historical SQLite verification — 2026-09-11

This report concerns the new independent Node/SQLite product only. Historical CE milestone evidence is preserved and is not reused as proof for this implementation.

## Completed implementation

Original server authentication, tenant-scoped persistence, revisioned playbook publishing, immutable run snapshots, transactional acceptance/idempotency, ordered execution, conditional skips, human tasks/approvals, durable timers, resolution, audit history, replay, incoming API credentials and JSON export. React UI implements the whole flow in RU/EN, with real loading/empty/error/success states and server refetch.

The product is deliberately a **personal workspace**, not a multi-team RBAC system. No native DAG, outward provider delivery, SSO or email password recovery is claimed. No Novu, Maily, BullMQ or Enterprise implementation is in this distribution.

## Evidence

| Check | Result |
|---|---|
| Clean install in personal checkout | PASS — npm ci, 108 installed packages, clean standalone lockfile |
| TypeScript | PASS |
| Biome | PASS — 12 files, zero diagnostics |
| Server integration/security/restart | PASS — 11 Mocha tests |
| Desktop browser | PASS — create/publish/run/task/approve/timer/resolve/reload/export/EN, actual API |
| Mobile browser | PASS — first run/editor and horizontal-overflow assertions at 390×844 |
| Browser JavaScript errors | None during checked desktop flow |
| axe 4.13.0 | PASS — zero violations across welcome, workspace, editor desktop/mobile, execution desktop/mobile for WCAG 2 A/AA, 2.1 AA, 2.2 AA rule tags |
| Production bundle | PASS — initial JS 68.98 KB gzip; product 26.86 KB; lazy editor 3.28 KB; CSS 5.21 KB |
| Linux Docker build | PASS — Node 22.23.0; official slim base; npm ci; isolated input allowlist |
| Runtime image filesystem check | PASS — /app has 13 files, 7 executable JS files, zero prohibited package/key markers; UID 1000; no /app/node_modules |
| Browser dependency licenses | PASS — six included packages; exact MIT texts and SPDX 2.3 inventory emitted by build |
| npm production dependency advisory check | PASS — zero known advisories at execution time |
| Public GitHub CI | PASS — [run 34547004457](https://github.com/godaylor/opsweave/actions/runs/34547004457), includes Linux types/lint/tests/browser/build/audit/Docker build |
| Public application deployment | NOT EXECUTED — Render requires payment information |
| Docker Scout image CVEs / full image SBOM | NOT EXECUTED — automatic approval review rejected external metadata transmission |

Axe is an automated rule check, not full WCAG certification. Bundle measurements are not field INP p75. This is not a claim of production reliability at high load.

## Failed checks retained as failures

- Original node_modules junctions referenced the former project directory. They were not repaired globally; an isolated installation was used.
- First npm install failed with ECONNRESET; a later isolated retry succeeded. The initial prefix-based install introduced a local root link in its lockfile. Linux npm ci caught that invalid closure. A fresh lockfile was generated from the standalone manifest in its own cwd: 167 entries, no local links or inherited packages. Docker npm ci then passed.
- Initial TypeScript/ARIA lint failures were fixed in source.
- The initial browser invocation lacked Chromium. After installing the existing Playwright browser, desktop passed and mobile exposed a real overflow defect. Grid minimum sizing was corrected; both tests then passed with retries=0.
- Initial axe checks found two contrast failures (4.24:1 and 4.41:1). Colors were corrected and six states rechecked with zero violations.
- The notice generator initially attempted to open Rollup virtual wrappers as physical paths. Virtual wrappers are now distinguished from the corresponding physical modules; exact package licenses remain mandatory.
- An npm wrapper dropped the `--grep` argument on a screenshot-only rerun; direct Playwright invocation passed. This was not counted as a product-test pass.
- Direct main publication and Docker Scout were rejected by automatic approval review. Main remains unchanged; [draft PR #1](https://github.com/godaylor/opsweave/pull/1) is the reviewable alternative. No scan was relabeled as passing.

## Deployment and local resources

The built image is `opsweave:standalone-20260911`, image ID `sha256:2cae5f12abe3f109fd3d0c21aeb5ea2532691551695760ef30906d472eae159e`. The Node base digest is `sha256:d9f850096136edbc402debdd8729579a288aac64574ada0ff4db26b6ae58b0b2`.

New, task-owned resources only:

- Container/network: `opsweave-standalone-20260911`.
- Volume: `opsweave-standalone-data-20260911`.
- Local URL: `http://127.0.0.1:32323` (HTTP test configuration of the production image).
- Isolated Node preview: port 32322; browser test ports 32330–32334; API test ports 32340–32359.

No other PetProjects process/container/network/volume was stopped, removed, pruned or modified. No original OpsWeave data volume was changed. No root all-project build or Enterprise read/build was performed.

The Render blueprint was opened using the published feature branch. The service/disk configuration reached **Payment Information Required**; no paid service was created, and no payment information was entered. The public production URL does not yet exist.

## Completion boundary

Approve merge of PR #1 into `godaylor/opsweave:main`, provide Render billing/hosting authorization, and separately allow Docker Scout metadata transmission or choose an approved offline container CVE scanner. Then finish image security disposition, provision the service, and verify the main flow at its public HTTPS URL. Existing main still contains the historical static predecessor.
