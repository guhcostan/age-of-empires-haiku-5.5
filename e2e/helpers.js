// Utilitários compartilhados pelos testes end-to-end.
import { test as base, expect } from '@playwright/test';
import { BUILDINGS, BUILD_MENU, START_RESOURCES, START_VILLAGERS, UNITS } from '../src/core/config.ts';

export const SEED = '12345';

// Fixture automática: todo teste falha se a página lançar erro ou se o console mostrar "error".
export const test = base.extend({
  pageErrors: [async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
    });
    await use(errors);
    if (errors.length) throw new Error(`Erros de página durante o teste:\n${errors.join('\n')}`);
  }, { auto: true }],
});

export { expect };

// Abre a página e espera o módulo principal expor window.__game.
export async function openGame(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__game?.menus));
}

// Abre a página e inicia uma partida rápida.
export async function startQuickGame(page, opts = {}) {
  await openGame(page);
  await startFromMenu(page, opts);
}

// A partir do menu já aberto: Partida rápida -> preenche o setup -> Iniciar (sem recarregar a página).
export async function startFromMenu(page, opts = {}) {
  const { size = 'pequeno', bots = '1', difficulty = 'facil', seed = SEED } = opts;
  await page.locator('#btn-play').click();
  await expect(page.locator('#screen-setup')).toBeVisible();
  await page.locator(`input[name="size"][value="${size}"]`).check();
  await page.locator(`input[name="bots"][value="${bots}"]`).check();
  await page.locator(`input[name="difficulty"][value="${difficulty}"]`).check();
  await page.locator('#seed').fill(seed);
  await page.locator('#btn-start').click();
  await expect(page.locator('#hud')).toBeVisible();
  await waitForRunning(page);
}

export async function waitForRunning(page) {
  await expect.poll(() => page.evaluate(() => Boolean(window.__game?.game?.running && window.__game.game.sim))).toBe(true);
}

// Lê um resumo do estado da partida (apenas leitura).
export function gameState(page) {
  return page.evaluate(() => {
    const g = window.__game.game;
    const sim = g.sim;
    return {
      running: g.running,
      paused: g.paused,
      ended: g.ended,
      time: sim ? sim.time : 0,
      res: sim ? { ...sim.players[0].res } : null,
      popUsed: sim ? sim.popUsed(0) : null,
      popCap: sim ? sim.popCap(0) : null,
      selected: [...g.selected],
    };
  });
}

// Entidades próprias de um tipo (ex.: 'villager', 'towncenter') em window.__game.game.sim.
export function ownEntities(page, { kind, type, owner = 0 }) {
  return page.evaluate(({ kind, type, owner }) => {
    const out = [];
    for (const e of window.__game.game.sim.world.entities.values()) {
      if (e.dead || e.owner !== owner) continue;
      if (kind && e.kind !== kind) continue;
      if (type && e.type !== type) continue;
      out.push({ id: e.id, kind: e.kind, type: e.type, owner: e.owner, x: e.x, y: e.y, built: e.built, queue: e.queue ? e.queue.length : 0 });
    }
    return out;
  }, { kind, type, owner });
}

// Acha um ponto da tela (dentro do canvas) cujo clique selecionaria a entidade `id`,
// usando o mesmo critério de seleção do jogo (Input.pickAt). Não clica.
export function findClickPoint(page, id) {
  return page.evaluate((id) => {
    const g = window.__game.game;
    const view = g.entities.views.get(id);
    if (!view) return null;
    const p = view.group.position;
    const anchor = g.worldToScreen(p.x, p.y + 1.0, p.z);
    const offsets = [[0, 0]];
    for (let r = 6; r <= 60; r += 6) {
      for (let a = 0; a < 16; a++) {
        const t = (a / 16) * Math.PI * 2;
        offsets.push([Math.round(Math.cos(t) * r), Math.round(Math.sin(t) * r)]);
      }
    }
    for (const [dx, dy] of offsets) {
      const x = anchor.x + dx;
      const y = anchor.y + dy;
      if (x < 2 || y < 2 || x > innerWidth - 2 || y > innerHeight - 2) continue;
      if (document.elementFromPoint(x, y)?.id !== 'game-canvas') continue;
      const hit = g.input.pickAt(x, y);
      if (hit && hit.id === id) return { x, y };
    }
    return null;
  }, id);
}

// Clica numa entidade pelo próprio mouse (pointer events reais no canvas).
export async function clickEntity(page, id) {
  await expect.poll(() => findClickPoint(page, id), { message: `ponto clicável da entidade ${id}` }).not.toBeNull();
  const pt = await findClickPoint(page, id);
  await page.mouse.click(pt.x, pt.y);
}

// Botão da grade de comandos com este rótulo (ex.: 'Aldeão', 'Casa').
export function commandButton(page, label) {
  return page.locator('#cmd-grid button.cmd:not(.empty)').filter({
    has: page.locator('.label', { hasText: new RegExp(`^${label}$`) }),
  });
}

// Valores de balanceamento lidos do próprio módulo do jogo (src/core/config.ts, só leitura).
// Assim os testes acompanham mudanças de custo ou população sem ficarem desatualizados.
export const CONFIG = {
  START_RESOURCES,
  START_VILLAGERS,
  villager: UNITS.villager,
  villagerName: UNITS.villager.name,
  villagerCost: UNITS.villager.cost,
  houseDef: BUILDINGS.house,
  houseName: BUILDINGS.house.name,
  houseCost: BUILDINGS.house.cost,
  townCenterPop: BUILDINGS.towncenter.pop,
  buildMenuNames: BUILD_MENU.map((t) => BUILDINGS[t].name),
};

// Ponto da tela (dentro do canvas) onde um prédio pode ser colocado, usando a mesma
// conversão do jogo (groundAt + arredondamento de Input.updatePlacement). Não clica.
export function findPlacementPoint(page, type, near = null) {
  const def = BUILDINGS[type];
  return page.evaluate(({ type, near, w, h }) => {
    const g = window.__game.game;
    const cx = near ? near.x : innerWidth / 2;
    const cy = near ? near.y : innerHeight / 2;
    for (let r = 0; r <= 400; r += 12) {
      const steps = r === 0 ? 1 : Math.max(8, Math.round((2 * Math.PI * r) / 12));
      for (let a = 0; a < steps; a++) {
        const t = (a / steps) * Math.PI * 2;
        const x = Math.round(cx + Math.cos(t) * r);
        const y = Math.round(cy + Math.sin(t) * r);
        if (x < 2 || y < 2 || x > innerWidth - 2 || y > innerHeight - 2) continue;
        if (document.elementFromPoint(x, y)?.id !== 'game-canvas') continue;
        const ground = g.groundAt(x, y);
        if (!ground) continue;
        const ox = Math.round(ground.x - w / 2);
        const oy = Math.round(ground.y - h / 2);
        if (g.sim.checkPlacement(type, ox, oy) === null) return { x, y };
      }
    }
    return null;
  }, { type, near, w: def.w, h: def.h });
}
