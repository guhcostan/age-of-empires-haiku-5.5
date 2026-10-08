import { test, expect, openGame, startQuickGame, startFromMenu, gameState } from './helpers.js';

// Percorre os fluxos de menu, pausa e fim sem disparar erros de página.
test.describe('Navegação sem erros', () => {
  test('menu -> ajuda -> opções -> setup -> partida -> pausa -> ajuda -> continuar -> sair -> fim', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
    });

    await openGame(page);
    await page.locator('#screen-main [data-go="help"]').click();
    await page.locator('#screen-help [data-go="main"]').click();
    await page.locator('#screen-main [data-go="options"]').click();
    await page.locator('#screen-options [data-go="main"]').click();

    await startQuickGame(page);

    // Pausa, depois "Como jogar" a partir da pausa, Voltar e "Continuar partida".
    await page.keyboard.press('Escape');
    await expect(page.locator('#overlay-pause')).toBeVisible();
    await page.locator('#btn-pause-help').click();
    await expect(page.locator('#screen-help')).toBeVisible();
    await page.locator('#screen-help [data-go="main"]').click();
    await expect(page.locator('#btn-continue')).toBeVisible();
    await page.locator('#btn-continue').click();
    await expect.poll(async () => (await gameState(page)).paused).toBe(false);
    await expect(page.locator('#menus')).toBeHidden();

    // Menu do HUD -> sair para o menu -> nova partida pelo setup.
    await page.locator('#btn-menu-hud').click();
    await page.locator('#btn-pause-quit').click();
    await expect(page.locator('#screen-main')).toBeVisible();
    await startFromMenu(page, { bots: '2', difficulty: 'facil' });
    await expect(page.locator('#hud')).toBeVisible();

    // Fim forçado por derrota e volta ao menu.
    await page.evaluate(() => {
      const g = window.__game.game;
      g.sim.gameOver = { result: 'defeat', reason: 'conquest', time: g.sim.time };
    });
    await expect(page.locator('#overlay-end')).toBeVisible();
    await page.locator('#btn-end-menu').click();
    await expect(page.locator('#screen-main')).toBeVisible();

    expect(errors, 'erros de página/console durante a navegação').toEqual([]);
  });
});
