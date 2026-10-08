import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateMap } from '../src/core/mapgen.ts';
import { findPath } from '../src/core/pathfind.ts';
import { World } from '../src/core/world.ts';
import { Simulation } from '../src/core/sim.ts';
import { BotBrain } from '../src/core/ai.ts';
import { AGE_UP, BUILDINGS, UNITS } from '../src/core/config.ts';
import type { BuildingType, DifficultyKey, Entity, Outcome, PlayerConfig } from '../src/types.ts';

function makeSim({ size = 64, bots = 1, seed = 42, difficulty = 'normal' as DifficultyKey } = {}) {
  const players: PlayerConfig[] = [{ name: 'Você', color: '#2f7de1' }];
  for (let i = 0; i < bots; i++) {
    players.push({ name: `Bot ${i + 1}`, color: '#e04848', isBot: true, difficulty });
  }
  const map = generateMap({ size, playerCount: players.length, seed });
  const sim = new Simulation({ map, players, humanIndex: 0 });
  const brains = players.map((p, i) => (p.isBot ? new BotBrain(sim, i) : null));
  return { sim, map, brains };
}

function runFor(sim: Simulation, seconds: number, brains: (BotBrain | null)[] = [], step = 0.1) {
  for (let t = 0; t < seconds; t += step) {
    for (const b of brains) b?.update(step);
    sim.update(step);
  }
}

function findFreeSite(sim: Simulation, type: BuildingType, tc: Entity) {
  for (let y = tc.y - 6; y < tc.y + 8; y++) {
    for (let x = tc.x - 6; x < tc.x + 8; x++) {
      if (sim.checkPlacement(type, x, y) === null) return { x, y };
    }
  }
  return null;
}

function tcOf(sim: Simulation, owner: number): Entity {
  return [...sim.world.entities.values()].find(
    (e) => e.kind === 'building' && e.type === 'towncenter' && e.owner === owner,
  )!;
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
  const r = findPath(world, 2.5, 2.5, { type: 'rect', x: 5, y: 5, w: 2, h: 2 })!;
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
  const villager = [...sim.world.entities.values()].find((e) => e.kind === 'unit' && e.type === 'villager')!;
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
  // Tempo de treino confirmado (SPEC: 20 s na Inglaterra); a espera acompanha o valor de config.
  runFor(sim, UNITS.villager.time + 1);
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
  let last = null as Outcome | null;
  for (let i = 0; i < 10; i++) last = sim.train(0, tc.id, 'villager');
  assert.equal(last!.ok, false);
  assert.match(last!.reason!, /Fila/);
});

test('aldeão constrói uma casa e a população máxima sobe', () => {
  const { sim } = makeSim({ bots: 0, seed: 21 });
  const capBefore = sim.popCap(0);
  const villager = [...sim.world.entities.values()].find((e) => e.kind === 'unit' && e.type === 'villager')!;
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
  const site = findFreeSite(sim, 'house', tcOf(sim, 0))!;
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

test('avançar de idade exige centro da vila, recursos e libera edifícios', () => {
  const { sim } = makeSim({ bots: 0, seed: 21 });
  const tc = tcOf(sim, 0);
  const site = findFreeSite(sim, 'stable', tc)!;
  assert.equal(sim.placeBuilding(0, 'stable', site.x, site.y).ok, false, 'estábulo exige Idade Feudal');
  sim.players[0].res = { food: 900, wood: 900, gold: 900, stone: 0 };
  assert.equal(sim.startAgeUp(0, tc.id).ok, true);
  assert.equal(sim.startAgeUp(0, tc.id).ok, false, 'não avança duas vezes ao mesmo tempo');
  runFor(sim, 61);
  assert.equal(sim.players[0].age, 2);
  assert.equal(sim.placeBuilding(0, 'stable', site.x, site.y).ok, true);
});

test('técnica só pesquisa no edifício certo e com a idade correta', () => {
  const { sim } = makeSim({ bots: 0, seed: 21 });
  sim.players[0].res = { food: 900, wood: 900, gold: 900, stone: 0 };
  const tc = tcOf(sim, 0);
  const site = findFreeSite(sim, 'mill', tc)!;
  const mill = sim.placeBuilding(0, 'mill', site.x, site.y).building!;
  const villager = [...sim.world.entities.values()].find((e) => e.kind === 'unit' && e.type === 'villager')!;
  sim.command(0, [villager.id], { type: 'build', target: mill.id });
  runFor(sim, 40);
  assert.equal(mill.built, true);
  assert.equal(sim.research(0, mill.id, 'lumber').ok, false, 'serraria não é moinho');
  assert.equal(sim.research(0, mill.id, 'horticulture').ok, false, 'horticultura exige Idade Feudal');
  sim.players[0].age = 2;
  assert.equal(sim.research(0, mill.id, 'fertilization').ok, false, 'fertilização exige horticultura');
  assert.equal(sim.research(0, mill.id, 'horticulture').ok, true);
  assert.equal(sim.gatherBonus(0, 'food'), 1, 'bônus só vale depois de concluir');
  runFor(sim, 46);
  assert.ok(sim.players[0].techs.horticulture);
  assert.ok(Math.abs(sim.gatherBonus(0, 'food') - 1.1) < 1e-9, 'horticultura dá +10% de comida');
});

test('lanceiro causa mais dano contra cavalaria', () => {
  const { sim } = makeSim({ bots: 1, seed: 33 });
  const spear = sim.spawnUnit('spearman', 0, 30.5, 30.5);
  const scout = sim.spawnUnit('scout', 1, 31.2, 30.5);
  const infantry = sim.spawnUnit('swordsman', 1, 31.2, 31.5);
  const hpScout = scout.hp;
  const hpInf = infantry.hp;
  sim.strike(spear, scout);
  sim.strike(spear, infantry);
  assert.ok(hpScout - scout.hp > hpInf - infantry.hp, 'dano contra cavalaria é maior');
});

test('torre atira no inimigo mais próximo dentro do alcance', () => {
  const { sim } = makeSim({ bots: 1, seed: 45 });
  sim.players[0].age = 2;
  sim.players[0].res = { food: 0, wood: 900, gold: 0, stone: 900 };
  const tc = tcOf(sim, 0);
  const site = findFreeSite(sim, 'tower', tc)!;
  const tower = sim.placeBuilding(0, 'tower', site.x, site.y).building!;
  const villager = [...sim.world.entities.values()].find((e) => e.kind === 'unit' && e.type === 'villager')!;
  sim.command(0, [villager.id], { type: 'build', target: tower.id });
  // Tempo de construção confirmado (SPEC: 90 s para a torre de pedra); espera o tempo de config mais folga.
  runFor(sim, BUILDINGS.tower.time + 5);
  assert.equal(tower.built, true);
  const enemy = sim.spawnUnit('swordsman', 1, tower.x + 3.5, tower.y + 1);
  const before = enemy.hp;
  runFor(sim, 3);
  assert.ok(enemy.hp < before, 'a torre deveria ter atingido o inimigo');
});

test('bots avançam de idade e pesquisam técnicas numa partida', () => {
  const { sim, brains } = makeSim({ size: 96, bots: 2, seed: 9, difficulty: 'normal' });
  runFor(sim, 900, brains, 0.1);
  const advanced = sim.players.slice(1).filter((p) => p.age >= 2);
  assert.ok(advanced.length > 0, 'algum bot chegou à Idade Feudal');
  assert.ok(sim.players.slice(1).some((p) => Object.keys(p.techs).length > 0), 'algum bot pesquisou técnica');
});

// SPEC §4 (linha 200, duas fontes): Idade Feudal custa 400 comida + 200 ouro.
test('custo da Idade Feudal segue a SPEC (400 comida + 200 ouro)', () => {
  assert.deepEqual(AGE_UP[2].cost, { food: 400, gold: 200 });
});

// SPEC §2.1 (linha 73): arqueiros são treinados no campo de tiro, não no quartel.
test('arqueiros saem do campo de tiro e não do quartel (SPEC §2.1)', () => {
  const { sim } = makeSim();
  const barracks = sim.spawnBuilding('barracks', 0, 20, 20, true);
  const range = sim.spawnBuilding('archeryRange', 0, 26, 20, true);
  sim.players[0].res.food = 500;
  sim.players[0].res.wood = 500;
  assert.equal(sim.train(0, barracks.id, 'archer').ok, false, 'o quartel não treina arqueiros');
  assert.equal(sim.train(0, range.id, 'archer').ok, true, 'o campo de tiro treina arqueiros');
});

// Fonte única da SPEC (linhas 73 e 377): custo, vida e tempo do campo de tiro.
test('campo de tiro custa 150 madeira, tem 1500 de vida e leva 30 s (fonte única da SPEC)', () => {
  assert.deepEqual(BUILDINGS.archeryRange.cost, { wood: 150 });
  assert.equal(BUILDINGS.archeryRange.hp, 1500);
  assert.equal(BUILDINGS.archeryRange.time, 30);
});

test('bots constroem campo de tiro e treinam arqueiros numa partida', () => {
  const { sim, brains } = makeSim({ size: 96, bots: 2, seed: 9, difficulty: 'normal' });
  runFor(sim, 900, brains, 0.1);
  const ranges = [...sim.world.entities.values()].filter(
    (e) => e.kind === 'building' && e.type === 'archeryRange' && e.owner > 0,
  );
  assert.ok(ranges.length > 0, 'algum bot construiu campo de tiro');
  const archers = [...sim.world.entities.values()].filter(
    (e) => e.kind === 'unit' && e.type === 'archer' && e.owner > 0,
  );
  assert.ok(archers.length > 0, 'algum bot treinou arqueiros no campo de tiro');
});

// Confirmados em duas fontes na rodada de 2026-10-08 (aoe4.club e aoe4world/data; ver docs/SPEC.md, anexo C).
test('quartel custa 150 madeira, tem 1500 de vida e leva 30 s (confirmado)', () => {
  assert.deepEqual(BUILDINGS.barracks.cost, { wood: 150 });
  assert.equal(BUILDINGS.barracks.hp, 1500);
  assert.equal(BUILDINGS.barracks.time, 30);
});

test('aldeão tem 50 de vida e treino de 20 s, como na Inglaterra (confirmado)', () => {
  assert.equal(UNITS.villager.hp, 50);
  assert.equal(UNITS.villager.time, 20);
});

test('torre de pedra: 250 pedra, 3000 de vida, ataque 60, alcance 9 (confirmado)', () => {
  assert.deepEqual(BUILDINGS.tower.cost, { stone: 250 });
  assert.equal(BUILDINGS.tower.hp, 3000);
  assert.equal(BUILDINGS.tower.time, 90);
  assert.equal(BUILDINGS.tower.attack, 60);
  assert.equal(BUILDINGS.tower.range, 9);
});

// Keep (SPEC §2.1): 900 pedra, 180 s, 5000 de vida (aoe4.club e aoe4world). Idade 3 só no aoe4world.
test('keep custa 900 pedra, tem 5000 de vida e leva 180 s (confirmado)', () => {
  assert.deepEqual(BUILDINGS.keep.cost, { stone: 900 });
  assert.equal(BUILDINGS.keep.hp, 5000);
  assert.equal(BUILDINGS.keep.time, 180);
});

test('keep treina todas as unidades militares (SPEC §2.1) e exige a idade castelo', () => {
  for (const t of ['swordsman', 'archer', 'spearman', 'crossbow', 'scout', 'knight'] as const) {
    assert.ok(BUILDINGS.keep.trains?.includes(t), `keep deveria treinar ${t}`);
  }
  assert.equal(BUILDINGS.keep.age, 3);
});

// Oficina de cerco (aoe4.club e aoe4world concordam em custo, vida e tempo). Idade 3 só no aoe4world.
test('oficina de cerco custa 250 madeira, tem 2100 de vida e leva 45 s (confirmado)', () => {
  assert.deepEqual(BUILDINGS.siegeWorkshop.cost, { wood: 250 });
  assert.equal(BUILDINGS.siegeWorkshop.hp, 2100);
  assert.equal(BUILDINGS.siegeWorkshop.time, 45);
  assert.equal(BUILDINGS.siegeWorkshop.age, 3);
});

// Aríete: custo, vida e dano de cerco em aoe4.club e aoe4world; recarga de 4 s só no aoe4world.
test('aríete custa 200 madeira, tem 370 de vida e dano de cerco 200 (confirmado)', () => {
  assert.deepEqual(UNITS.ram.cost, { wood: 200 });
  assert.equal(UNITS.ram.hp, 370);
  assert.equal(UNITS.ram.time, 35);
  assert.equal(UNITS.ram.attack, 200);
  assert.equal(UNITS.ram.siege, true);
});

test('keep também treina aríete (aoe4world: produzido no keep)', () => {
  assert.ok(BUILDINGS.keep.trains?.includes('ram'));
});

test('aríete causa 200 de dano a edifício, sem a redução de 0,5', () => {
  const { sim } = makeSim({ bots: 1, seed: 5 });
  const house = sim.spawnBuilding('house', 1, 40, 40, true);
  const ram = sim.spawnUnit('ram', 0, 41, 42);
  const before = house.hp;
  sim.strike(ram, house);
  assert.equal(before - house.hp, 200);
});

test('aríete não procura unidades inimigas, só edifícios', () => {
  const { sim } = makeSim({ bots: 1, seed: 5 });
  const ram = sim.spawnUnit('ram', 0, 30, 30);
  sim.spawnUnit('swordsman', 1, 31, 30);
  assert.equal(sim.findFoe(ram, 10, false), null);
});

