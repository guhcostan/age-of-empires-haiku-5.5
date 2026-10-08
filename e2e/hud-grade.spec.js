import { test, expect, startQuickGame, waitForRunning } from './helpers.js';

// A grade de comandos precisa caber na janela. Em 1280x720 ela já estourou (8 de 18 botões fora da tela).
test.use({ viewport: { width: 1280, height: 720 } });

test.describe('HUD: grade de comandos', () => {
  test('com um aldeão selecionado, os 20 botões da grade ficam dentro da janela em 1280x720', async ({ page }) => {
    await startQuickGame(page, { size: 'pequeno', bots: '1', difficulty: 'facil' });
    await waitForRunning(page);
    await page.evaluate(() => {
      const g = window.__game.game;
      const v = g.sim.entitiesOf(0).units.find((u) => u.type === 'villager');
      g.selectIds([v.id]);
    });
    await expect(page.locator('#cmd-grid button.cmd').first()).toBeVisible();
    const box = await page.evaluate(() => {
      const vw = innerWidth;
      const vh = innerHeight;
      const btns = [...document.querySelectorAll('#cmd-grid button.cmd')].map((b) => b.getBoundingClientRect());
      return {
        buttons: btns.length,
        outside: btns.filter((r) => r.bottom > vh || r.right > vw || r.top < 0 || r.left < 0).length,
      };
    });
    expect(box.buttons).toBe(20);
    expect(box.outside).toBe(0);
  });
});
