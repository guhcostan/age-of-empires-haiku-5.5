import { test, expect, startQuickGame, gameState, waitForRunning } from './helpers.js';

// Atalhos de seleção da SPEC §7.2 (ponto, vírgula, Ctrl+A e Ctrl+Shift+A).
test.describe('Atalhos de seleção', () => {
  test('"." seleciona os aldeões ociosos e "," seleciona os militares ociosos', async ({ page }) => {
    await startQuickGame(page);
    await waitForRunning(page);
    const ids = await page.evaluate(() => {
      const sim = window.__game.game.sim;
      const tc = sim.entitiesOf(0).buildings.find((b) => b.type === 'towncenter');
      const v = sim.spawnUnit('villager', 0, tc.x + 5.5, tc.y + 5.5);
      const s = sim.spawnUnit('swordsman', 0, tc.x + 6.5, tc.y + 5.5);
      return { v: v.id, s: s.id };
    });
    await page.keyboard.press('.');
    await expect.poll(async () => (await gameState(page)).selected.sort()).toEqual(
      (await page.evaluate(() => window.__game.game.idleVillagers().map((u) => u.id))).sort(),
    );
    expect((await gameState(page)).selected).toContain(ids.v);
    await page.keyboard.press(',');
    await expect.poll(async () => (await gameState(page)).selected).toContain(ids.s);
    expect((await gameState(page)).selected).not.toContain(ids.v);
  });

  test('Ctrl+Shift+A seleciona todas as unidades do jogador; Ctrl+A só as que estão na tela', async ({ page }) => {
    await startQuickGame(page);
    await waitForRunning(page);
    const own = await page.evaluate(() => {
      const sim = window.__game.game.sim;
      return [...sim.world.entities.values()].filter((e) => e.kind === 'unit' && e.owner === 0 && !e.dead).map((e) => e.id);
    });
    await page.keyboard.press('Control+Shift+A');
    await expect.poll(async () => (await gameState(page)).selected.length).toBe(own.length);
    await page.keyboard.press('Control+A');
    const onScreen = (await gameState(page)).selected.length;
    expect(onScreen).toBeGreaterThan(0);
    expect(onScreen).toBeLessThanOrEqual(own.length);
  });

  test('F2 seleciona os edifícios econômicos e Tab passa pelas unidades selecionadas', async ({ page }) => {
    await startQuickGame(page);
    await waitForRunning(page);
    const tc = await page.evaluate(() => window.__game.game.sim.entitiesOf(0).buildings.find((b) => b.type === 'towncenter').id);
    await page.keyboard.press('F2');
    await expect.poll(async () => (await gameState(page)).selected).toContain(tc);
    // Dois aldeões selecionados: Tab fica com um, depois com o outro; Ctrl+Tab volta.
    const [a, b] = await page.evaluate(() => {
      const sim = window.__game.game.sim;
      const tcb = sim.entitiesOf(0).buildings.find((x) => x.type === 'towncenter');
      const x = sim.spawnUnit('villager', 0, tcb.x + 5.5, tcb.y + 5.5).id;
      const y = sim.spawnUnit('villager', 0, tcb.x + 6.5, tcb.y + 5.5).id;
      window.__game.game.selectIds([x, y]);
      return [x, y].sort((p, q) => p - q);
    });
    await page.keyboard.press('Tab');
    await expect.poll(async () => (await gameState(page)).selected).toEqual([a]);
    await page.keyboard.press('Tab');
    await expect.poll(async () => (await gameState(page)).selected).toEqual([b]);
    await page.keyboard.press('Control+Tab');
    await expect.poll(async () => (await gameState(page)).selected).toEqual([a]);
  });
});
