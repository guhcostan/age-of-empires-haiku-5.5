// Medição de desempenho com 200 unidades em movimento. Não é um critério de aprovação: registra quadros por
// segundo e o tempo de JavaScript por quadro para comparar execuções. Sem GPU real o número é de renderização
// por software e não vale como medida de 60 fps (ver docs/PROGRESS.md).
import { test, expect, startQuickGame, waitForRunning } from './helpers.js';

test.describe('Desempenho (medição)', () => {
  test('200 unidades em movimento: quadros por segundo e tempo de JS por quadro', async ({ page }) => {
    test.setTimeout(120_000);
    await startQuickGame(page, { size: 'medio', bots: '1', difficulty: 'facil' });
    await waitForRunning(page);

    await page.evaluate(() => {
      const g = window.__game.game;
      const sim = g.sim;
      const tc0 = sim.entitiesOf(0).buildings.find((b) => b.type === 'towncenter');
      const ids = [];
      for (let i = 0; i < 200; i++) {
        const type = i % 2 ? 'swordsman' : 'archer';
        ids.push(sim.spawnUnit(type, 0, tc0.x + 6 + (i % 14) * 0.6, tc0.y + 6 + Math.floor(i / 14) * 0.6).id);
      }
      sim.command(0, ids, { type: 'attackmove', x: sim.size / 2, y: sim.size / 2 });
      // Mede o tempo de JavaScript de cada quadro sem mudar o comportamento (envolve o método frame).
      window.__frameMs = [];
      // Tempo por etapa (acumulado) para saber onde o quadro gasta.
      window.__stageMs = {};
      const wrap = (obj, name, label) => {
        const fn = obj[name].bind(obj);
        obj[name] = (...args) => {
          const t0 = performance.now();
          const out = fn(...args);
          window.__stageMs[label] = (window.__stageMs[label] || 0) + (performance.now() - t0);
          return out;
        };
      };
      wrap(g.rts, 'update', 'camera');
      wrap(g.entities, 'sync', 'entidades');
      wrap(g.input, 'update', 'entrada');
      wrap(g.hud, 'update', 'hud');
      wrap(g.minimap, 'draw', 'minimapa');
      wrap(g.renderer, 'render', 'render_gl');
      const original = g.frame.bind(g);
      g.frame = (now) => {
        const t0 = performance.now();
        original(now);
        window.__frameMs.push(performance.now() - t0);
      };
    });

    await page.waitForTimeout(5000);
    const result = await page.evaluate(() => {
      const ms = window.__frameMs.slice(1);
      const sorted = [...ms].sort((a, b) => a - b);
      const mean = ms.reduce((s, v) => s + v, 0) / ms.length;
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const units = [...window.__game.game.sim.world.entities.values()].filter((e) => e.kind === 'unit' && !e.dead).length;
      const stages = Object.fromEntries(Object.entries(window.__stageMs).map(([k, v]) => [k, Math.round((v / ms.length) * 10) / 10]));
      const info = window.__game.game.renderer.info.render;
      return { frames: ms.length, meanJsMs: mean, p95JsMs: p95, units, simTime: window.__game.game.sim.time, stagesMsPerFrame: stages, drawCalls: info.calls, triangles: info.triangles };
    });
    console.log(`desempenho: ${JSON.stringify(result)}`);
    expect(result.frames).toBeGreaterThan(0);
    expect(result.units).toBeGreaterThanOrEqual(200);
  });
});
