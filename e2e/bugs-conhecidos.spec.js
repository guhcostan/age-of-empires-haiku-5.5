import { test, expect, startQuickGame, startFromMenu } from './helpers.js';

// Mede quantos render() ocorrem por tick de requestAnimationFrame: 1 = uma única cadeia de frames.
const rendersPerTick = (page) => page.evaluate(() => new Promise((resolve) => {
  const g = window.__game.game;
  let renders = 0;
  let ticks = 0;
  const orig = g.renderer.render.bind(g.renderer);
  g.renderer.render = (s, c) => { renders++; return orig(s, c); };
  const t0 = performance.now();
  const tick = () => {
    ticks++;
    if (performance.now() - t0 < 2000) {
      requestAnimationFrame(tick);
    } else {
      g.renderer.render = orig;
      resolve(renders / ticks);
    }
  };
  requestAnimationFrame(tick);
}));

// Regressões: bugs confirmados antes e corrigidos (loop de quadros duplicado ao reiniciar a partida).
test.describe('Regressões de bugs já corrigidos', () => {
  test('iniciar partida enquanto outra roda não duplica o loop de renderização', async ({ page }) => {
    // Bug: Game.start() chama stop() e depois define running = true enquanto ainda há um
    // requestAnimationFrame pendente de Game.frame(); esse frame antigo continua a cadeia,
    // e a nova partida inicia outra. Ver src/game.ts (start, startLoop, frame).
    await startQuickGame(page);
    expect(await rendersPerTick(page)).toBeCloseTo(1, 1);

    await page.keyboard.press('Escape');
    await page.locator('#btn-pause-help').click();
    await page.locator('#screen-help [data-go="main"]').click();
    await startFromMenu(page, {});

    expect(await rendersPerTick(page)).toBeCloseTo(1, 1);
  });

  test('evento de morte (que só tem x e y, sem "to") não lança erro na interface', async ({ page }) => {
    // Bug: o game.js antigo lia ev.to.x também para o evento 'death', que não tem o campo `to`,
    // então cada morte lançava TypeError no quadro. Ver src/game.ts (handleEvents).
    await startQuickGame(page);
    const handled = await page.evaluate(() => {
      const g = window.__game.game;
      g.handleEvents([{ type: 'death', kind: 'unit', x: 5, y: 5, owner: 1 }]);
      return true;
    });
    expect(handled).toBe(true);
  });
});
