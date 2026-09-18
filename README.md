# OpsWeave

[![OpsWeave checks](https://github.com/godaylor/opsweave/actions/workflows/ci.yml/badge.svg)](https://github.com/godaylor/opsweave/actions/workflows/ci.yml)

**От инцидента к понятному следующему действию.** OpsWeave позволяет создать сценарий реагирования, запустить его для инцидента, выполнить задачи, согласовать решения и получить сохранённую историю результата.

Это рабочее приложение с сервером и базой данных. Гостевой вход создаёт отдельное личное пространство, без общих демонстрационных данных. Аккаунт сохраняет доступ между устройствами. RU включён по умолчанию; EN переключается в интерфейсе.

**Live app: [opsweave.onrender.com](https://opsweave.onrender.com)** — Render Free without a disk + Neon Free PostgreSQL (Frankfurt). Full public desktop/mobile workflow verified on 2026-09-18. The first request after inactivity can take 50 seconds or more.

![Incident response with a real action](screenshots/03-incident-action.png)

## Основной сценарий

1. Откройте личное пространство или зарегистрируйтесь.
2. Создайте сценарий с нуля или используйте редактируемый шаблон восстановления.
3. Сохраните и опубликуйте его. Публикация фиксирует версию.
4. Создайте инцидент: название, сервис, приоритет, сценарий.
5. Сервер выполняет шаги. Подтвердите результат задачи и согласуйте действие с комментарием.
6. Дождитесь таймера и завершения, повторно откройте результат, выгрузите JSON-историю.

## Возможности

- Редактор последовательных сценариев: запись в журнал, задача исполнителю, согласование, таймер, устранение инцидента.
- Условия по приоритету: неподходящие шаги явно отмечаются как пропущенные.
- Отдельные черновики и опубликованные версии; проверка ревизии защищает от перезаписи изменений другого окна.
- Серверное выполнение, долговечные таймеры и восстановление после перезапуска.
- История решений, корреляция событий, экспорт и отдельные повторные попытки.
- Входящий HTTP API с ключом только на создание инцидентов, сроком действия, ротацией и идемпотентностью.
- Метрики фактических инцидентов: время принятия, время устранения, приоритеты и результаты сценариев.
- Изолированные пространства, гостевой доступ с возможностью регистрации, RU/EN, адаптивный интерфейс.

Шаг «задача» требует выполнения человеком; он не притворяется автоматическим перезапуском сервиса. Исходящие Slack/email/HTTP actions, совместные организации/роли, SSO, password recovery и native DAG/fork/join не реализованы в этой компактной версии. Автообновление интерфейса использует polling, не WebSocket. Изменения редактора сохраняются явной кнопкой, не autosave.

## Architecture / stack

```mermaid
flowchart LR
  UI[React + TypeScript] --> API[Node HTTP API]
  Monitoring[Monitoring webhook] --> API
  API --> DB[(PostgreSQL stores accounts, hashed sessions, versioned playbooks, runs, idempotency records and history in a private `opsweave` schema.
  Executor[In-process execution loop] --> DB
  UI -->|refetch every 2s| API
```

| Layer | Actual technology |
|---|---|
| UI | React 19, TypeScript, React Hook Form, TanStack Query, original CSS |
| Build | Vite 6, lazy editor chunk |
| Server | Node.js 22, built-in HTTP, crypto/scrypt, pg 8.23.0 |
| Persistence | PostgreSQL: accounts, hashed sessions, playbooks, runs, idempotency and history in private `opsweave` schema |
| Execution | Ordered server loop, durable cursor and timer deadline, transactional events |
| Verification | Mocha, Playwright/Chromium, TypeScript, Biome |
| Distribution | One Node process; optional Docker image and Render blueprint |

Server runtime dependency: pinned pg 8.23.0 and its recorded dependency closure. React libraries are bundled into static assets. No Redis, MongoDB, ClickHouse, provider framework or upstream runtime is needed.

## Local development

Use Node **22.23.0** for the reproducible release target (22.15+ supports the APIs used).

```sh
npm ci --ignore-scripts
npm run build
# Supply a private DATABASE_URL for a dedicated Postgres database.
npm start
```

Open `http://127.0.0.1:32320`. `DATABASE_URL` is required; local files are never used as fallback. Use a dedicated local Postgres database or a free managed instance. If the port is busy, choose another free **32300–32399** port and set both `PORT` and `PUBLIC_ORIGIN`; never stop another project's process.

SQLite is used only by the optional read-only import/backup tools. Existing SQLite data and volumes are preserved.

| Variable | Default / purpose |
|---|---|
| `PORT` | `32320` |
| `HOST` | `127.0.0.1`; use `0.0.0.0` behind a production HTTPS proxy |
| `PUBLIC_ORIGIN` | `http://127.0.0.1:32320`; exact public origin, required HTTPS in production |
| `DATABASE_URL` | Required private Postgres URL; never sent to the browser |
| `DATABASE_SCHEMA` | `opsweave`; private app schema, separate from public |
| `DATABASE_CA_FILE` | Optional provider CA file; remote TLS certificate validation is always enabled |
| `TEST_DATABASE_URL` | Isolated local database named `opsweave_test` |
| `PUBLIC_DIR` | `dist/opsweave-public` |
| `NODE_ENV` | Set `production` for the HTTPS configuration guard |
| `OPSWEAVE_TEST_PORT` | `32330`; isolated browser test server, existing servers are refused |

Sessions are random, stored hashed, HttpOnly, SameSite=Strict and Secure on HTTPS. Passwords use scrypt. Never commit a database, backup, cookie, API key or `.env` file. Unregistered guest access expires after seven days; register before that to retain access. There is no email recovery yet.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Tests require `TEST_DATABASE_URL` pointing to a local disposable database named `opsweave_test`; each case uses a unique schema. They refuse remote/seeded databases and choose only OpsWeave test ports. Browser tests drive actual API execution, including human decisions and a timer. Screenshots are generated in `screenshots/`.

The build generates exact third-party license texts and an SPDX browser dependency inventory. Docker base-image licensing and vulnerability scanning are separate checks, not implied by the browser inventory.

## Deployment

Deploy **one Render Free web service, without any persistent disk**, plus a dedicated **Neon Free Postgres** database. Supabase Free also works with a session-pooler URL, but the current account has exhausted its free-project limit; do not pause or alter other projects to free capacity. Never select a paid tier.

[Open the Render blueprint](https://dashboard.render.com/blueprint/new?repo=https://github.com/godaylor/opsweave). Select `main`; PR #1 has been merged. The blueprint sets `plan: free`, derives the HTTPS origin, and prompts for `DATABASE_URL` as a server secret. Frontend and backend share one origin. No disk or billing upgrade is required by this configuration. Do not paste the database URL into Git, screenshots, a public build variable or documentation.

Remote connections require verified TLS. Use the pooler endpoint supplied by Neon or Supabase rather than guessing its host. All queries use transaction-scoped schema selection, compatible with transaction pooling. The private schema has RLS enabled and no public grants; browser clients never receive database credentials. The server's database role owns the app tables; user isolation is enforced by the API's owner predicates, not Supabase Auth policies.

Free hosting sleeps and has usage limits. Render can suspend the process after inactivity and Neon can suspend compute; a first request may be slow. Timer deadlines and accepted work survive in Postgres and resume after wake/restart. This is not an always-on scheduler or an SLA for exact-time incident paging. Never add artificial keepalive traffic to bypass free limits. If a free quota is exhausted, stop provisioning rather than upgrade.

After provisioning, verify `/api/health` reports `persistence: postgres` and run the full scenario at the public URL. Local and CI passes are not public verification. `OPSWEAVE_E2E_URL=https://your-host npm run test:e2e` runs the same real browser flows against a deployed app and creates only new isolated guest workspaces.

### Existing SQLite data and rollback

The source SQLite volume is never deleted or changed. Obtain a consistent private backup using the historical `backup.mjs` tool, then run:

```sh
DATABASE_URL='<private-target>' node apps/api/standalone/import-sqlite.mjs /private/source.sqlite
```

The import opens the source read-only, checks all six target tables are empty, copies them in one transaction, preserves record/event order, and rolls back on failure. Repeating it against a populated target is refused. Credentials and session hashes are copied only if an existing workspace migration is explicitly requested; public deployment can start with an empty database. Do not overwrite production data to retry an import.

Use provider Postgres backup/export facilities and verify a restore into a separate database. Retain the previous SQLite image/volume for rollback, but do not switch back after new Postgres writes without reconciling those writes. There is no automatic two-way replication.

## Provenance and contribution

OpsWeave began as an exploration on Novu Community Edition. The September 2026 standalone product replaces that runtime with original authentication, persistence, execution and interface code. This repository exports only that implementation and ordinary documented dependencies; it does not publish the old monorepo or claim authorship of Novu.

The project contribution is the product contract, incident/step state machine, transactional execution and replay, tenant boundary, UI and localization, integration API, focused verification, and deployable distribution. See [THIRD-PARTY.md](THIRD-PARTY.md). Original project code is [MIT](LICENSE).

## English

OpsWeave is a personal incident-response workspace. Build and publish a sequential playbook, start an incident, complete responder tasks and approve decisions, then review durable execution results. A compact Node/Postgres backend keeps the main workflow functional without an enterprise notification stack. This edition is a single-user workspace product, not an on-call paging service or a multi-team incident-management platform.

See [PORTFOLIO_HANDOFF.md](PORTFOLIO_HANDOFF.md) for the precise release status and portfolio material.
