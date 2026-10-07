// Configuração dos testes end-to-end (Playwright) do clone de Age of Empires.
// Antes de cada execução o projeto é compilado (tsc + vite) e o build é servido pelo vite preview,
// assim os testes sempre rodam o código-fonte atual, não um build antigo.
import { defineConfig } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PORT = 8787;
const BASE_URL = `http://127.0.0.1:${PORT}`;

// Chromium já instalado neste ambiente (o Playwright não baixa o binário aqui).
// PW_CHROMIUM tem prioridade sobre o caminho encontrado.
function findHeadlessShell() {
  const root = '/opt/pw-browsers/chromium_headless_shell-1194';
  try {
    for (const dir of readdirSync(root)) {
      const bin = join(root, dir, 'headless_shell');
      if (existsSync(bin)) return bin;
    }
  } catch {
    // Sem a pasta: cai no Chromium padrão do Playwright.
  }
  return undefined;
}

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    launchOptions: {
      executablePath: process.env.PW_CHROMIUM || findHeadlessShell(),
      args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
    },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npm run build && npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
