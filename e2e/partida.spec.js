import { test, expect, startQuickGame, gameState, waitForRunning, CONFIG } from './helpers.js';

test.describe('Partida: início e pausa', () => {
  test('iniciar partida mostra o HUD com recursos e população iniciais', async ({ page }) => {
    const cfg = CONFIG;
    await startQuickGame(page);

    await expect(page.locator('#hud')).toBeVisible();
    await expect(page.locator('#menus')).toBeHidden();
    await expect(page.locator('#overlay-pause')).toBeHidden();
    await expect(page.locator('#overlay-end')).toBeHidden();

    // Recursos iniciais: 200 / 200 / 100 / 0 (valores de START_RESOURCES).
    const { food, wood, gold, stone } = cfg.START_RESOURCES;
    await expect(page.locator('#res-food')).toHaveText(String(food));
    await expect(page.locator('#res-wood')).toHaveText(String(wood));
    await expect(page.locator('#res-gold')).toHaveText(String(gold));
    await expect(page.locator('#res-stone')).toHaveText(String(stone));
    const st = await gameState(page);
    expect(st.res).toEqual(cfg.START_RESOURCES);

    // População: usada = aldeões iniciais; máxima = a do Centro da Vila (calculada pelo jogo).
    expect(st.popUsed).toBe(cfg.START_VILLAGERS);
    expect(st.popCap).toBe(cfg.townCenterPop);
    await expect(page.locator('#res-pop')).toHaveText(`${st.popUsed} / ${st.popCap}`);

    // Os aldeões e o Centro da Vila do jogador existem na simulação.
    const villagers = await page.evaluate(() => [...window.__game.game.sim.world.entities.values()]
      .filter((e) => e.owner === 0 && e.kind === 'unit' && e.type === 'villager').length);
    expect(villagers).toBe(cfg.START_VILLAGERS);
    expect(await page.evaluate(() => Boolean(window.__game.game.ownTownCenter()))).toBe(true);
  });

  test('Escape abre a pausa, Continuar fecha e game.paused volta a false', async ({ page }) => {
    await startQuickGame(page);
    await expect.poll(async () => (await gameState(page)).time).toBeGreaterThan(0);
    expect((await gameState(page)).paused).toBe(false);

    await page.keyboard.press('Escape');
    await expect(page.locator('#overlay-pause')).toBeVisible();
    await expect(page.locator('#menus')).toBeHidden();
    await expect.poll(async () => (await gameState(page)).paused).toBe(true);

    const pausedTime = (await gameState(page)).time;
    await expect(page.locator('#btn-resume')).toBeVisible();
    await page.locator('#btn-resume').click();

    await expect(page.locator('#overlay-pause')).toBeHidden();
    await expect(page.locator('#menus')).toBeHidden();
    await expect.poll(async () => (await gameState(page)).paused).toBe(false);

    // Com o jogo despausado, o tempo de simulação volta a avançar.
    await expect.poll(async () => (await gameState(page)).time).toBeGreaterThan(pausedTime);
  });

  test('Escape também despausa; o botão Menu do HUD abre a pausa', async ({ page }) => {
    await startQuickGame(page);
    await page.locator('#btn-menu-hud').click();
    await expect(page.locator('#overlay-pause')).toBeVisible();
    await expect.poll(async () => (await gameState(page)).paused).toBe(true);

    await page.keyboard.press('Escape');
    await expect(page.locator('#overlay-pause')).toBeHidden();
    await expect.poll(async () => (await gameState(page)).paused).toBe(false);
    await waitForRunning(page);
  });

  test('Sair para o menu encerra a partida e mostra o menu principal', async ({ page }) => {
    await startQuickGame(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('#overlay-pause')).toBeVisible();

    await page.locator('#btn-pause-quit').click();
    await expect(page.locator('#screen-main')).toBeVisible();
    await expect(page.locator('#overlay-pause')).toBeHidden();
    await expect(page.locator('#hud')).toBeHidden();
    await expect.poll(() => page.evaluate(() => window.__game.game.running)).toBe(false);
    // Com o jogo encerrado, "Continuar partida" some do menu.
    await expect(page.locator('#btn-continue')).toBeHidden();
  });

  test('botão Ociosos seleciona os aldeões parados', async ({ page }) => {
    await startQuickGame(page);
    const btn = page.locator('#btn-idle');
    await expect(btn).toBeVisible();
    // Um aldeão recém-criado, sem tarefa, conta como ocioso.
    await page.evaluate(() => {
      const g = window.__game.game;
      const tc = g.sim.entitiesOf(0).buildings.find((b) => b.type === 'towncenter');
      g.sim.spawnUnit('villager', 0, tc.x + 5.5, tc.y + 5.5);
    });
    await expect(btn).toBeEnabled();
    const expected = await page.evaluate(() => window.__game.game.idleVillagers().length);
    await expect(page.locator('#idle-count')).toHaveText(String(expected));
    await btn.click();
    await expect.poll(async () => (await gameState(page)).selected.length).toBe(expected);
  });

  test('HUD mostra relógio, placar, objetivo e aldeões por recurso', async ({ page }) => {
    await startQuickGame(page);
    await expect(page.locator('#res-time')).toHaveText(/^\d{2}:\d{2}$/);
    await expect(page.locator('#res-score')).toHaveText('0 / 0');
    await expect(page.locator('#objective')).toContainText('Objetivo: marco da');
    // Manda os aldeões para a comida mais próxima e confere a contagem na barra de cima.
    const ordered = await page.evaluate(() => {
      const sim = window.__game.game.sim;
      let n = 0;
      for (const u of sim.entitiesOf(0).units) {
        if (u.type !== 'villager') continue;
        const src = sim.findSource(0, u.x, u.y, 'food');
        if (!src) continue;
        sim.command(0, [u.id], { type: 'gather', target: src.id });
        n++;
      }
      return n;
    });
    expect(ordered).toBeGreaterThan(0);
    await expect(page.locator('#gat-food')).toHaveText(String(ordered));
  });
});
