import { test, expect, startQuickGame, gameState, CONFIG, ownEntities, clickEntity, commandButton, findPlacementPoint } from './helpers.js';

// Seleção, treino e construção feitos pelo mouse, como o jogador faria.
test.describe('Comandos', () => {
  test('clicar num aldeão seleciona e mostra os botões de construção', async ({ page }) => {
    const cfg = CONFIG;
    await startQuickGame(page);

    const [villager] = await ownEntities(page, { kind: 'unit', type: 'villager' });
    await clickEntity(page, villager.id);

    await expect(page.locator('#sel-title')).toHaveText(cfg.villagerName);
    await expect.poll(() => page.evaluate(() => window.__game.game.selected.size)).toBe(1);
    expect(await page.evaluate(() => [...window.__game.game.selected][0])).toBe(villager.id);

    // Grade de comandos: todos os edifícios do menu de construção, mais "Parar".
    const labels = await page.locator('#cmd-grid button.cmd:not(.empty) .label').allTextContents();
    for (const name of cfg.buildMenuNames) expect(labels).toContain(name);
    expect(labels).toContain('Parar');
  });

  test('treinar aldeão no Centro da Vila desconta comida e entra na fila', async ({ page }) => {
    const cfg = CONFIG;
    await startQuickGame(page);

    const [tc] = await ownEntities(page, { kind: 'building', type: 'towncenter' });
    await clickEntity(page, tc.id);
    await expect(page.locator('#sel-title')).toHaveText('Centro da Vila');

    const before = (await gameState(page)).res.food;
    const popBefore = (await gameState(page)).popUsed;
    await commandButton(page, 'Aldeão').click();

    const cost = cfg.villagerCost.food;
    await expect.poll(async () => (await gameState(page)).res.food).toBe(before - cost);
    await expect(page.locator('#res-food')).toHaveText(String(before - cost));

    // A fila aparece na simulação e no painel de seleção.
    const queue = await page.evaluate((id) => window.__game.game.sim.world.get(id).queue.map((q) => q.type), tc.id);
    expect(queue).toEqual(['villager']);
    await expect(page.locator('#sel-queue .queue-item')).toHaveCount(1);
    await expect(page.locator('#sel-queue .queue-item')).toContainText('Aldeão');

    // O treino termina e o aldeão novo aparece (população usada sobe em 1).
    await expect.poll(async () => (await gameState(page)).popUsed, { timeout: 60_000 }).toBe(popBefore + 1);
    await expect.poll(async () => (await ownEntities(page, { kind: 'unit', type: 'villager' })).length, { timeout: 60_000 })
      .toBe(cfg.START_VILLAGERS + 1);
  });

  test('construir uma casa: prédio em construção, madeira descontada e aldeão atribuído', async ({ page }) => {
    const cfg = CONFIG;
    await startQuickGame(page);

    const [villager] = await ownEntities(page, { kind: 'unit', type: 'villager' });
    await clickEntity(page, villager.id);
    await expect(page.locator('#sel-title')).toHaveText('Aldeão');

    const woodBefore = (await gameState(page)).res.wood;
    await commandButton(page, cfg.houseName).click();
    await expect(page.locator('#hint')).toContainText(`Construir ${cfg.houseName}`);

    // Prévia do prédio: o ponto precisa estar livre no terreno.
    const spot = await findPlacementPoint(page, 'house');
    expect(spot, 'ponto livre no terreno para a casa').not.toBeNull();
    await page.mouse.move(spot.x, spot.y);
    await expect.poll(() => page.evaluate(() => {
      const p = window.__game.game.input.placement;
      return p ? p.reason : 'sem-prévia';
    })).toBeNull();

    await page.mouse.click(spot.x, spot.y);

    // A casa existe na simulação, é do jogador e ainda está em construção.
    await expect.poll(async () => (await ownEntities(page, { kind: 'building', type: 'house' })).length).toBe(1);
    const [house] = await ownEntities(page, { kind: 'building', type: 'house' });
    expect(house.owner).toBe(0);
    expect(house.built).toBe(false);

    // Madeira descontada uma vez, pelo custo do jogo.
    const woodAfter = cfg.START_RESOURCES.wood - cfg.houseCost.wood;
    expect(woodBefore).toBe(cfg.START_RESOURCES.wood);
    await expect.poll(async () => (await gameState(page)).res.wood).toBe(woodAfter);
    await expect(page.locator('#res-wood')).toHaveText(String(woodAfter));

    // O aldeão selecionado foi mandado construir a casa; o modo de colocação foi encerrado.
    const order = await page.evaluate((id) => {
      const u = window.__game.game.sim.world.get(id);
      return { order: u.order, target: u.target };
    }, villager.id);
    expect(order).toEqual({ order: 'build', target: house.id });
    expect(await page.evaluate(() => window.__game.game.input.placement)).toBeNull();
  });
});
