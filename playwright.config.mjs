import { defineConfig } from '@playwright/test';
import { randomUUID } from 'node:crypto';
const port = Number(process.env.OPSWEAVE_TEST_PORT || 32330);
const external = process.env.OPSWEAVE_E2E_URL;
if (!external && (!process.env.TEST_DATABASE_URL || new URL(process.env.TEST_DATABASE_URL).pathname !== '/opsweave_test' || !['localhost','127.0.0.1'].includes(new URL(process.env.TEST_DATABASE_URL).hostname))) throw new Error('Browser tests require isolated local opsweave_test Postgres');
if (port < 32300 || port > 32399) throw new Error('Use an OpsWeave test port (32300–32399)');
export default defineConfig({
  testDir: './tests', testMatch: '**/*.e2e.mjs', workers: 1, retries: 0,
  timeout: external ? 180000 : 45000, expect: { timeout: external ? 60000 : 5000 }, reporter: [['list']],
  use: { baseURL: external || `http://127.0.0.1:${port}`, screenshot: 'only-on-failure', trace: 'off' },
  webServer: external ? undefined : { command: 'node apps/api/standalone/server.mjs', url: `http://127.0.0.1:${port}/api/health`, reuseExistingServer: false, env: { PORT: String(port), HOST: '127.0.0.1', NODE_ENV: 'test', PUBLIC_ORIGIN: `http://127.0.0.1:${port}`, DATABASE_URL: process.env.TEST_DATABASE_URL, DATABASE_SCHEMA: `opsweave_browser_${randomUUID().replaceAll('-','')}` } },
});
