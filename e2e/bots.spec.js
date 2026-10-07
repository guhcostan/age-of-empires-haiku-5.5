import { test, expect, startQuickGame, gameState, ownEntities } from './helpers.js';

test.describe('Bots', () => {
  test('partida com 1 bot roda ~20 s reais sem erros de console e o tempo de jogo avança', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
    });

    await startQuickGame(page, { bots: '1', difficulty: 'facil' });
    const start = await gameState(page);

    // Deixa a partida rodar em tempo real. Duração fixa de propósito (teste de estabilidade).
    await page.waitForTimeout(20_000);

    const end = await gameState(page);
    expect(end.running).toBe(true);
    expect(end.ended).toBe(false);
    expect(end.time).toBeGreaterThan(start.time + 1);

    // O bot (dono 1) precisa ter feito algo: unidades ou prédios além dos iniciais.
    const botEntities = await ownEntities(page, { owner: 1 });
    expect(botEntities.length).toBeGreaterThan(5);

    expect(errors, 'erros de página/console durante a partida com bot').toEqual([]);
  });
});
