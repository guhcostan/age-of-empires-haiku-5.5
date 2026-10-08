import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateMap } from '../src/core/mapgen.ts';
import { Simulation, WONDER_COUNTDOWN } from '../src/core/sim.ts';
import { BotBrain } from '../src/core/ai.ts';
import { BUILDINGS } from '../src/core/config.ts';
import type { BuildingEntity, BuildingType, PlayerConfig, UnitEntity } from '../src/types.ts';

// Partidas completas até a vitória, uma por condição (rodam em tempo de simulação, passo fixo de 0,05 s).
// "conquista" é só bots. Nas outras três, o humano começa com o que a condição exige (catedral de pé, exército
// nos locais sagrados, um marco do bot a destruir); o resto da partida segue as regras reais.
const STEP = 0.05;
const MAP_SIZE = 64;

type Kind = 'conquista' | 'maravilha' | 'sagrados' | 'marcos';

function buildMatch(kind: Kind, seed: number) {
  const humanIsBot = kind === 'conquista';
  const players: PlayerConfig[] = [
    humanIsBot
      ? { name: 'Bot A', color: '#2f7de1', isBot: true, difficulty: 'normal', civ: 'english' }
      : { name: 'Você', color: '#2f7de1', civ: 'english' },
    { name: 'Bot B', color: '#e04848', isBot: true, difficulty: 'normal', civ: 'english' },
  ];
  const map = generateMap({ size: MAP_SIZE, playerCount: 2, seed });
  const sim = new Simulation({
    map,
    players,
    humanIndex: 0,
    wonderVictory: kind === 'maravilha',
    sacredVictory: kind === 'sagrados',
    landmarkVictory: kind === 'marcos',
  });
  const brains = players.map((p, i) => (p.isBot ? new BotBrain(sim, i) : null));

  // Primeiro ponto livre em anel ao redor de `near` onde o prédio cabe.
  const place = (type: BuildingType, owner: number, near: { x: number; y: number }): BuildingEntity => {
    for (let r = 4; r < 30; r++) {
      for (let a = 0; a < 48; a++) {
        const x = Math.round(near.x + Math.cos((a / 48) * Math.PI * 2) * r);
        const y = Math.round(near.y + Math.sin((a / 48) * Math.PI * 2) * r);
        if (sim.checkPlacement(type, x, y) === null) return sim.spawnBuilding(type, owner, x, y, true);
      }
    }
    throw new Error(`sem espaço para ${type}`);
  };
  const tc = sim.entitiesOf(0).buildings.find((b) => b.type === 'towncenter');
  assert.ok(tc, 'a base do humano tem Centro da Vila');

  if (kind === 'maravilha') {
    sim.players[0].age = 4;
    place('cathedral', 0, tc);
    for (let i = 0; i < 30; i++) {
      sim.spawnUnit('swordsman', 0, tc.x + 3 + (i % 6) * 0.6, tc.y - 4 + Math.floor(i / 6) * 0.6);
    }
  }
  if (kind === 'sagrados') {
    for (const s of sim.sacredSites) {
      for (let i = 0; i < 3; i++) sim.spawnUnit('swordsman', 0, s.x + i * 0.4, s.y);
    }
  }
  if (kind === 'marcos') {
    const btc = sim.entitiesOf(1).buildings.find((b) => b.type === 'towncenter');
    assert.ok(btc, 'o bot tem Centro da Vila');
    const landmark = place('chamberOfCommerce', 1, btc);
    const ids: number[] = [];
    for (let i = 0; i < 14; i++) {
      ids.push(sim.spawnUnit('swordsman', 0, tc.x + 2 + (i % 4) * 0.5, tc.y + 3 + Math.floor(i / 4) * 0.5).id);
    }
    sim.command(0, ids, { type: 'attackmove', x: landmark.x + 1.5, y: landmark.y + 1.5 });
  }
  return { sim, brains };
}

// Roda a partida até acabar (ou até o limite de tempo de jogo) e devolve o resultado.
function playToEnd(kind: Kind, seed: number, maxSeconds: number) {
  const { sim, brains } = buildMatch(kind, seed);
  for (let t = 0; t < maxSeconds && !sim.gameOver; t += STEP) {
    for (const b of brains) b?.update(STEP);
    sim.update(STEP);
  }
  return { sim, end: sim.gameOver };
}

test('partida completa, conquista: dois bots jogam até um perder todas as construções', () => {
  const { sim, end } = playToEnd('conquista', 1, 3600);
  assert.ok(end, 'a partida termina antes de 60 min de jogo');
  assert.equal(end.reason, 'conquest');
  assert.ok(sim.players.some((p) => p.defeated), 'alguém foi eliminado');
});

test('partida completa, maravilha: catedral de pé pela contagem inteira dá vitória', () => {
  const { end } = playToEnd('maravilha', 1, 3600);
  assert.ok(end, 'a partida termina');
  assert.equal(end.reason, 'wonder');
  assert.equal(end.result, 'victory');
  assert.ok(Math.abs(end.time - WONDER_COUNTDOWN) < 1, `termina na contagem (${end.time.toFixed(1)} s)`);
});

test('partida completa, locais sagrados: exército nos quatro locais por 10 min sem inimigo vence', () => {
  const { end } = playToEnd('sagrados', 1, 5400);
  assert.ok(end, 'a partida termina');
  assert.equal(end.reason, 'sacred');
  assert.equal(end.result, 'victory');
  assert.ok(end.time > 600 && end.time < 700, `contagem de 10 min (${end.time.toFixed(1)} s)`);
});

test('partida completa, marcos: destruir o último marco do bot o elimina e vence', () => {
  const { sim, end } = playToEnd('marcos', 1, 1800);
  assert.ok(end, 'a partida termina');
  assert.equal(end.reason, 'landmarks');
  assert.equal(end.result, 'victory');
  assert.equal(sim.players[1].defeated, true);
});

// ---------- Terreno: unidades não podem ficar presas ----------

// Um tile caminhável e aberto, com os 8 vizinhos caminháveis (espaço para cercar a unidade).
function openTile(sim: Simulation): { x: number; y: number } {
  const comp = sim.world.components();
  const open = sim.openRegion(comp);
  const n = sim.size;
  for (let y = 2; y < n - 2; y++) {
    for (let x = 2; x < n - 2; x++) {
      if (comp[y * n + x] !== open) continue;
      let clear = true;
      for (let dy = -1; dy <= 1 && clear; dy++) {
        for (let dx = -1; dx <= 1 && clear; dx++) {
          if (sim.world.blocked[(y + dy) * n + (x + dx)]) clear = false;
        }
      }
      if (clear) return { x, y };
    }
  }
  throw new Error('sem tile aberto no mapa de teste');
}

test('edifício que fecharia a saída de uma unidade é recusado; o resto segue permitido', () => {
  const { sim } = buildMatch('conquista', 1);
  const { x, y } = openTile(sim);
  const n = sim.size;
  // Cerca a unidade pelos 8 lados, deixando só o tile ao norte como saída.
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (dx === 0 && dy === -1) continue;
      sim.world.blocked[(y + dy) * n + (x + dx)] = 1;
    }
  }
  sim.world.compDirty = true;
  sim.spawnUnit('swordsman', 0, x + 0.5, y + 0.5);
  assert.equal(sim.checkPlacement('stoneWall', x, y - 1), 'Bloquearia a saída de uma unidade');
  // Longe da unidade, o mesmo muro é aceito (o motivo não é a saída bloqueada).
  assert.notEqual(sim.checkPlacement('stoneWall', x + 6, y + 6), 'Bloquearia a saída de uma unidade');
});

test('aldeão nasce do lado de fora quando o centro da vila está cercado', () => {
  const { sim } = buildMatch('conquista', 1);
  const tc = sim.entitiesOf(0).buildings.find((b) => b.type === 'towncenter');
  assert.ok(tc);
  const n = sim.size;
  const { w, h } = BUILDINGS.towncenter;
  const open = sim.openRegion(sim.world.components());
  // Bloqueia o anel imediato do centro da vila (tudo que seria tile de nascimento).
  for (let y = tc.y - 1; y <= tc.y + h; y++) {
    for (let x = tc.x - 1; x <= tc.x + w; x++) {
      const inside = x >= tc.x && x < tc.x + w && y >= tc.y && y < tc.y + h;
      if (!inside && sim.world.inBounds(x, y)) sim.world.blocked[y * n + x] = 1;
    }
  }
  sim.world.compDirty = true;
  const [spot] = sim.freeTilesAround(tc, 1);
  const tx = Math.floor(spot.x);
  const ty = Math.floor(spot.y);
  const outside = tx < tc.x - 1 || tx > tc.x + w || ty < tc.y - 1 || ty > tc.y + h;
  assert.ok(outside, `nasce fora do anel bloqueado (${tx},${ty})`);
  assert.equal(sim.world.components()[ty * n + tx], open, 'nasce na região aberta do mapa');
});

// ---------- Bots: o exército ocioso vai para um local sagrado ----------

test('bot com exército ocioso e vitória por locais sagrados manda as tropas para um local', () => {
  const { sim, brains } = buildMatch('sagrados', 1);
  // Remove os 3 soldados humanos dos locais: o cenário aqui é só o bot.
  for (const u of [...sim.world.entities.values()]) if (u.kind === 'unit' && u.owner === 0) sim.world.remove(u);
  const bot = sim.entitiesOf(1);
  const home = bot.buildings.find((b) => b.type === 'towncenter');
  assert.ok(home);
  for (let i = 0; i < 4; i++) sim.spawnUnit('swordsman', 1, home.x + 2 + i * 0.4, home.y + 3);
  const sites = sim.sacredSites;
  // Os soldados andam entre os locais; basta um deles chegar perto de um local que não é do bot.
  let reached = false;
  for (let t = 0; t < 90 && !reached; t += STEP) {
    for (const b of brains) b?.update(STEP);
    sim.update(STEP);
    const soldiers: UnitEntity[] = sim.entitiesOf(1).units.filter((u) => u.type === 'swordsman');
    reached = soldiers.some((u) => sites.some((s) => s.owner !== 1 && Math.hypot(u.x - s.x, u.y - s.y) < 6));
  }
  assert.ok(reached, 'um soldado do bot chega a um local que não é seu em 90 s');
});
