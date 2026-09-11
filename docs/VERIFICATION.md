# OpsWeave standalone verification — 2026-09-11

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
