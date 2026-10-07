// Configuração dos testes end-to-end (Playwright) do clone de Age of Empires.
// O servidor estático sobe a partir de public/; não há etapa de build.
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
    command: `python3 -m http.server ${PORT} --directory public`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
