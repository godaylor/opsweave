import { defineConfig } from '@playwright/test';
import { randomUUID } from 'node:crypto';
const port = Number(process.env.OPSWEAVE_TEST_PORT || 32330);
if (port < 32300 || port > 32399) throw new Error('Use an OpsWeave test port (32300–32399)');
export default defineConfig({
  testDir: './tests', testMatch: '**/*.e2e.mjs', workers: 1, retries: 0,
  timeout: 45000, reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${port}`, screenshot: 'only-on-failure', trace: 'off' },
  webServer: { command: 'node apps/api/standalone/server.mjs', url: `http://127.0.0.1:${port}/api/health`, reuseExistingServer: false, env: { PORT: String(port), HOST: '127.0.0.1', NODE_ENV: 'test', PUBLIC_ORIGIN: `http://127.0.0.1:${port}`, DATABASE_PATH: `.test-data/browser-${randomUUID()}.sqlite` } },
});
