import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateMap } from '../public/js/core/mapgen.js';
import { findPath } from '../public/js/core/pathfind.js';
import { World } from '../public/js/core/world.js';
import { Simulation } from '../public/js/core/sim.js';
import { BotBrain } from '../public/js/core/ai.js';

function makeSim({ size = 64, bots = 1, seed = 42, difficulty = 'normal' } = {}) {
  const players = [{ name: 'Você', color: '#2f7de1' }];
  for (let i = 0; i < bots; i++) {
    players.push({ name: `Bot ${i + 1}`, color: '#e04848', isBot: true, difficulty });
  }
  const map = generateMap({ size, playerCount: players.length, seed });
  const sim = new Simulation({ map, players, humanIndex: 0 });
  const brains = players.map((p, i) => (p.isBot ? new BotBrain(sim, i) : null));
  return { sim, map, brains };
}

function runFor(sim, seconds, brains = [], step = 0.1) {
  for (let t = 0; t < seconds; t += step) {
    for (const b of brains) b?.update(step);
    sim.update(step);
  }
}

function findFreeSite(sim, type, tc) {
  for (let y = tc.y - 6; y < tc.y + 8; y++) {
    for (let x = tc.x - 6; x < tc.x + 8; x++) {
      if (sim.checkPlacement(type, x, y) === null) return { x, y };
    }
  }
  return null;
}

function tcOf(sim, owner) {
  return [...sim.world.entities.values()].find(
    (e) => e.kind === 'building' && e.type === 'towncenter' && e.owner === owner,
  );
}

test('mapa é determinístico para a mesma semente', () => {
  const a = generateMap({ size: 96, playerCount: 3, seed: 7 });
  const b = generateMap({ size: 96, playerCount: 3, seed: 7 });
  assert.deepEqual(a.starts, b.starts);
  assert.deepEqual(a.nodes, b.nodes);
  assert.deepEqual(a.terrain, b.terrain);
});

test('todas as bases alcançam o resto do mapa', () => {
  for (const seed of [1, 2, 3, 99, 12345]) {
    const { sim } = makeSim({ size: 96, bots: 3, seed });
    const tcs = [0, 1, 2, 3].map((o) => tcOf(sim, o));
    for (const tc of tcs) assert.ok(tc, 'cada jogador começa com um centro de vila');
    const world = sim.world;
    // Um aldeão partindo de cada base tem que conseguir chegar até a base do humano.
    for (const tc of tcs.slice(1)) {
      const p = findPath(world, tcs[0].x + 5, tcs[0].y + 5, { type: 'rect', x: tc.x, y: tc.y, w: 4, h: 4 });
      assert.ok(p && p.length > 0, `seed ${seed}: base ${tc.owner} precisa ser alcançável`);
    }
  }
});

test('pathfinding contorna obstáculos e para ao lado de um retângulo', () => {
  const size = 20;
  const terrain = new Uint8Array(size * size);
  const world = new World(size, terrain);
  // Parede vertical em x=10, com uma abertura em y=18.
  for (let y = 0; y < 18; y++) world.blocked[y * size + 10] = 1;

  const p = findPath(world, 2.5, 2.5, { type: 'tile', x: 15, y: 2 });
  assert.ok(p && p.length > 0);
  const last = p[p.length - 1];
  assert.equal(Math.floor(last.x), 15);
  assert.equal(Math.floor(last.y), 2);
  assert.ok(p.some((wp) => Math.floor(wp.y) >= 18), 'o caminho precisa passar pela abertura');

  // Alvo retângulo: chega a um tile encostado nele, nunca dentro.
  const r = findPath(world, 2.5, 2.5, { type: 'rect', x: 5, y: 5, w: 2, h: 2 });
  const end = r[r.length - 1];
  const ex = Math.floor(end.x);
  const ey = Math.floor(end.y);
  assert.ok(!(ex >= 5 && ex < 7 && ey >= 5 && ey < 7), 'não entra no retângulo');
  assert.ok(ex >= 4 && ex <= 7 && ey >= 4 && ey <= 7, 'fica encostado no retângulo');
});

test('destino do outro lado de uma parede: anda até o ponto alcançável mais próximo', () => {
  const size = 10;
  const world = new World(size, new Uint8Array(size * size));
  for (let y = 0; y < size; y++) world.blocked[y * size + 5] = 1;
  const p = findPath(world, 1.5, 1.5, { type: 'tile', x: 8, y: 8 });
  assert.ok(p && p.length > 0, 'precisa haver um caminho até o lado acessível');
  const end = p[p.length - 1];
  assert.ok(Math.floor(end.x) < 5, 'termina do lado da origem, encostado na parede');
});

test('retângulo totalmente cercado não tem caminho', () => {
  const size = 12;
  const world = new World(size, new Uint8Array(size * size));
  // Cerca o retângulo (4,4)-(6,6) com obstáculos em todo o contorno.
  for (let x = 3; x <= 7; x++) { world.blocked[3 * size + x] = 1; world.blocked[7 * size + x] = 1; }
  for (let y = 3; y <= 7; y++) { world.blocked[y * size + 3] = 1; world.blocked[y * size + 7] = 1; }
  for (let y = 4; y < 6; y++) for (let x = 4; x < 6; x++) world.blocked[y * size + x] = 1;
  assert.equal(findPath(world, 0.5, 0.5, { type: 'rect', x: 4, y: 4, w: 2, h: 2 }), null);
});

test('caminho inexistente retorna null', () => {
  const size = 10;
  const world = new World(size, new Uint8Array(size * size));
  for (let y = 0; y < size; y++) world.blocked[y * size + 5] = 1;
  assert.equal(findPath(world, 1.5, 1.5, { type: 'rect', x: 8, y: 8, w: 1, h: 1 }), null);
});

test('aldeão coleta madeira e entrega no centro da vila', () => {
  const { sim } = makeSim({ bots: 0, seed: 5 });
  const tc = tcOf(sim, 0);
  const trees = [...sim.world.entities.values()].filter((e) => e.kind === 'node' && e.type === 'tree');
  assert.ok(trees.length > 0);
  const villager = [...sim.world.entities.values()].find((e) => e.kind === 'unit' && e.type === 'villager');
  const before = sim.players[0].res.wood;
  sim.command(0, [villager.id], { type: 'gather', target: trees[0].id });
  runFor(sim, 60);
  assert.ok(sim.players[0].res.wood > before, 'madeira deve aumentar');
  assert.ok(sim.players[0].stats.gathered.wood > 0);
  assert.ok(tc && !tc.dead);
});

test('centro da vila treina aldeão, cobra o custo e aumenta a população', () => {
  const { sim } = makeSim({ bots: 0, seed: 11 });
  const tc = tcOf(sim, 0);
  const foodBefore = sim.players[0].res.food;
  const villagersBefore = [...sim.world.entities.values()].filter((e) => e.kind === 'unit').length;
  const r = sim.train(0, tc.id, 'villager');
  assert.equal(r.ok, true);
  assert.equal(sim.players[0].res.food, foodBefore - 50);
  runFor(sim, 9);
  const villagersAfter = [...sim.world.entities.values()].filter((e) => e.kind === 'unit').length;
  assert.equal(villagersAfter, villagersBefore + 1);
});

test('população máxima bloqueia treino', () => {
  const { sim } = makeSim({ bots: 0, seed: 11 });
  const tc = tcOf(sim, 0);
  sim.players[0].res.food = 10000;
  // 4 aldeões iniciais + 16 = 20, que é o limite do centro da vila.
  for (let i = 0; i < 16; i++) sim.spawnUnit('villager', 0, tc.x - 1.5, tc.y + 0.5);
  const r = sim.train(0, tc.id, 'villager');
  assert.equal(r.ok, false);
  assert.match(r.reason, /população/i);
});

test('fila de treino tem limite', () => {
  const { sim } = makeSim({ bots: 0, seed: 11 });
  const tc = tcOf(sim, 0);
  sim.players[0].res.food = 10000;
  let last = null;
  for (let i = 0; i < 10; i++) last = sim.train(0, tc.id, 'villager');
  assert.equal(last.ok, false);
  assert.match(last.reason, /Fila/);
});

test('aldeão constrói uma casa e a população máxima sobe', () => {
  const { sim } = makeSim({ bots: 0, seed: 21 });
  const capBefore = sim.popCap(0);
  const villager = [...sim.world.entities.values()].find((e) => e.kind === 'unit' && e.type === 'villager');
  const site = findFreeSite(sim, 'house', tcOf(sim, 0));
  assert.ok(site, 'há espaço para uma casa');
  const r = sim.placeBuilding(0, 'house', site.x, site.y);
  assert.equal(r.ok, true);
  sim.command(0, [villager.id], { type: 'build', target: r.building.id });
  runFor(sim, 60);
  assert.equal(r.building.built, true);
  assert.equal(sim.popCap(0), capBefore + 10);
});

test('recursos insuficientes impedem construção', () => {
  const { sim } = makeSim({ bots: 0, seed: 21 });
  sim.players[0].res.wood = 0;
  const site = findFreeSite(sim, 'house', tcOf(sim, 0));
  const r = sim.placeBuilding(0, 'house', site.x, site.y);
  assert.equal(r.ok, false);
  assert.match(r.reason, /Recursos/);
});

test('soldados inimigos se enfrentam até um morrer', () => {
  const { sim } = makeSim({ bots: 1, seed: 33 });
  const a = sim.spawnUnit('swordsman', 0, 30.5, 30.5);
  const b = sim.spawnUnit('swordsman', 1, 31.5, 30.5);
  sim.command(0, [a.id], { type: 'attack', target: b.id });
  sim.startAttack(b, a, null);
  runFor(sim, 60);
  assert.ok(a.dead || b.dead, 'um dos dois precisa morrer');
  assert.ok(sim.players[0].stats.kills + sim.players[1].stats.kills >= 1);
});

test('partida só com bots avança sem erros e gera economia e tropas', () => {
  const { sim, brains } = makeSim({ size: 64, bots: 2, seed: 77, difficulty: 'normal' });
  runFor(sim, 240, brains, 0.1);
  for (const p of sim.players) {
    for (const v of Object.values(p.res)) assert.ok(Number.isFinite(v), 'recurso válido');
  }
  // Só os bots jogam neste cenário, então só eles precisam ter progredido.
  for (const p of sim.players.slice(1)) {
    assert.ok(p.stats.gathered.food + p.stats.gathered.wood > 0, `${p.name} coletou recursos`);
    assert.ok(p.stats.trained > 0, `${p.name} treinou unidades`);
  }
  for (const e of sim.world.entities.values()) {
    assert.ok(Number.isFinite(e.x) && Number.isFinite(e.y), 'posições finitas');
  }
});
