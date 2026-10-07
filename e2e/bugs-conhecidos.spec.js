import { test, expect, startQuickGame, startFromMenu } from './helpers.js';

// Mede quantos render() ocorrem por tick de requestAnimationFrame: 1 = uma única cadeia de frames.
const rendersPerTick = (page) => page.evaluate(() => new Promise((resolve) => {
  const g = window.aoe.game;
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

// Bugs confirmados no jogo, registrados como test.fail: o teste passa enquanto o bug existir.
// Quando o bug for corrigido, o teste passa "inesperadamente" e o test.fail deve ser removido.
test.describe('Bugs conhecidos (esperados a falhar)', () => {
  test.fail('iniciar partida enquanto outra roda não duplica o loop de renderização', async ({ page }) => {
    // Bug: Game.start() chama stop() e depois define running = true enquanto ainda há um
    // requestAnimationFrame pendente de Game.frame(); esse frame antigo continua a cadeia,
    // e a nova partida inicia outra. Ver public/js/game.js (start, linha ~101-105; frame, linha ~159-161).
    await startQuickGame(page);
    expect(await rendersPerTick(page)).toBeCloseTo(1, 1);

    await page.keyboard.press('Escape');
    await page.locator('#btn-pause-help').click();
    await page.locator('#screen-help [data-go="main"]').click();
    await startFromMenu(page, {});

    expect(await rendersPerTick(page)).toBeCloseTo(1, 1);
  });
});
