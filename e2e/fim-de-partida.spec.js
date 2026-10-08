import { test, expect, openGame, startQuickGame, gameState, waitForRunning } from './helpers.js';

test.describe('Fim de partida', () => {
  test('vitória forçada: overlay com "Vitória!" aparece e "Menu principal" volta ao menu', async ({ page }) => {
    await startQuickGame(page);
    await page.evaluate(() => {
      const g = window.__game.game;
      g.sim.gameOver = { result: 'victory', reason: 'conquest', time: g.sim.time };
    });
    // O próprio loop do jogo deve detectar o fim e abrir a tela final.
    await expect(page.locator('#overlay-end')).toBeVisible();
    await expect(page.locator('#end-title')).toHaveText('Vitória!');
    await expect(page.locator('#end-title')).toHaveClass(/win/);
    await expect(page.locator('#end-stats')).toContainText('Tempo de partida');
    await expect(page.locator('#end-stats')).toContainText('Fim por');
    await expect(page.locator('#end-stats')).toContainText('Conquista');
    await expect.poll(async () => (await gameState(page)).ended).toBe(true);
    await expect(page.locator('#hud')).toBeVisible();

    await page.locator('#btn-end-menu').click();
    await expect(page.locator('#screen-main')).toBeVisible();
    await expect(page.locator('#overlay-end')).toBeHidden();
    await expect(page.locator('#hud')).toBeHidden();
    await expect.poll(() => page.evaluate(() => window.__game.game.running)).toBe(false);
  });

  test('derrota chamando game.endGame(): título "Derrota" e "Jogar de novo" reinicia a partida', async ({ page }) => {
    await startQuickGame(page);
    await page.evaluate(() => {
      const g = window.__game.game;
      g.sim.gameOver = { result: 'defeat', reason: 'conquest', time: g.sim.time };
      g.endGame();
    });
    await expect(page.locator('#overlay-end')).toBeVisible();
    await expect(page.locator('#end-title')).toHaveText('Derrota');
    await expect(page.locator('#end-title')).toHaveClass(/lose/);

    await page.locator('#btn-again').click();
    await expect(page.locator('#overlay-end')).toBeHidden();
    await expect(page.locator('#hud')).toBeVisible();
    await expect.poll(async () => (await gameState(page)).ended).toBe(false);
    await expect.poll(async () => (await gameState(page)).running).toBe(true);
    await expect(page.locator('#res-food')).toHaveText('200');
  });

  test('tela final mostra o motivo da vitória (locais sagrados) e mantém o título "Vitória!"', async ({ page }) => {
    await openGame(page);
    await page.locator('#btn-play').click();
    await expect(page.locator('#screen-setup')).toBeVisible();
    await page.locator('input[name="size"][value="pequeno"]').check();
    await page.locator('input[name="bots"][value="1"]').check();
    await page.locator('input[name="difficulty"][value="facil"]').check();
    await page.locator('#victory-sacred').check();
    await page.locator('#seed').fill('12345');
    await page.locator('#btn-start').click();
    await expect(page.locator('#hud')).toBeVisible();
    await waitForRunning(page);

    // A regra da vitória tem testes de partida completa em tests/partidas.test.ts; aqui só a tela final.
    await page.evaluate(() => {
      const g = window.__game.game;
      g.sim.gameOver = { result: 'victory', reason: 'sacred', time: g.sim.time };
    });
    await expect(page.locator('#overlay-end')).toBeVisible();
    await expect(page.locator('#end-title')).toHaveText('Vitória!');
    await expect(page.locator('#end-stats')).toContainText('Fim por');
    await expect(page.locator('#end-stats')).toContainText('Locais sagrados');
  });
});
