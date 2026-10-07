import { test, expect, startQuickGame, gameState } from './helpers.js';

test.describe('Fim de partida', () => {
  test('vitória forçada: overlay com "Vitória!" aparece e "Menu principal" volta ao menu', async ({ page }) => {
    await startQuickGame(page);
    await page.evaluate(() => {
      const g = window.aoe.game;
      g.sim.gameOver = { result: 'victory', time: g.sim.time };
    });
    // O próprio loop do jogo deve detectar o fim e abrir a tela final.
    await expect(page.locator('#overlay-end')).toBeVisible();
    await expect(page.locator('#end-title')).toHaveText('Vitória!');
    await expect(page.locator('#end-title')).toHaveClass(/win/);
    await expect(page.locator('#end-stats')).toContainText('Tempo de partida');
    await expect.poll(async () => (await gameState(page)).ended).toBe(true);
    await expect(page.locator('#hud')).toBeVisible();

    await page.locator('#btn-end-menu').click();
    await expect(page.locator('#screen-main')).toBeVisible();
    await expect(page.locator('#overlay-end')).toBeHidden();
    await expect(page.locator('#hud')).toBeHidden();
    await expect.poll(() => page.evaluate(() => window.aoe.game.running)).toBe(false);
  });

  test('derrota chamando game.endGame(): título "Derrota" e "Jogar de novo" reinicia a partida', async ({ page }) => {
    await startQuickGame(page);
    await page.evaluate(() => {
      const g = window.aoe.game;
      g.sim.gameOver = { result: 'defeat', time: g.sim.time };
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
});
