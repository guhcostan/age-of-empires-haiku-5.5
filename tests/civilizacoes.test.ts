import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateMap } from '../src/core/mapgen.ts';
import { Simulation } from '../src/core/sim.ts';
import type { Civ, PlayerConfig } from '../src/types.ts';

// Custos que mudam por civilização (SPEC anexo C, adendo 6 e economia): só o jogador humano muda de civilização.
function simFor(civ: Civ): Simulation {
  const players: PlayerConfig[] = [
    { name: 'Você', color: '#2f7de1', civ },
    { name: 'Bot', color: '#e04848', isBot: true, difficulty: 'normal', civ: 'english' },
  ];
  const map = generateMap({ size: 64, playerCount: 2, seed: 7 });
  return new Simulation({ map, players, humanIndex: 0 });
}

test('fazenda: inglesa custa 37 de madeira (50% menos); francesa, 75', () => {
  assert.deepEqual(simFor('english').buildingCost(0, 'farm'), { wood: 37 });
  assert.deepEqual(simFor('french').buildingCost(0, 'farm'), { wood: 75 });
});

test('keep: francês custa 810 de pedra (duas fontes); inglês segue 900', () => {
  assert.deepEqual(simFor('french').buildingCost(0, 'keep'), { stone: 810 });
  assert.deepEqual(simFor('english').buildingCost(0, 'keep'), { stone: 900 });
});

test('moinho, serraria e acampamento de mineração: francês paga 25 de madeira; inglês, 50', () => {
  for (const type of ['mill', 'lumberCamp', 'miningCamp'] as const) {
    assert.deepEqual(simFor('french').buildingCost(0, type), { wood: 25 }, type);
    assert.deepEqual(simFor('english').buildingCost(0, type), { wood: 50 }, type);
  }
});

// Arqueiro Longo: só o inglês, no campo de tiro, a partir da Feudal (SPEC anexo C, adendo 18).
test('arqueiro longo: inglês treina no campo de tiro a partir da Feudal; francês não treina', () => {
  const english = simFor('english');
  assert.ok(english.trainsOf(0, 'archeryRange').includes('longbowman'));
  assert.ok(!simFor('french').trainsOf(0, 'archeryRange').includes('longbowman'));
  const range = english.spawnBuilding('archeryRange', 0, 20, 20, true);
  assert.equal(english.train(0, range.id, 'longbowman').ok, false, 'na Idade das Trevas não treina');
  english.players[0].age = 2;
  assert.equal(english.train(0, range.id, 'longbowman').ok, true, 'na Feudal treina');
});

// Homem de Armas Vanguarda: bônus inglês, disponível já na Idade das Trevas, no quartel (SPEC §6.1, três fontes).
test('homem de armas vanguarda: inglês treina no quartel na Idade das Trevas; francês não', () => {
  const english = simFor('english');
  assert.ok(english.trainsOf(0, 'barracks').includes('vanguard'));
  assert.ok(!simFor('french').trainsOf(0, 'barracks').includes('vanguard'));
  const barracks = english.spawnBuilding('barracks', 0, 24, 24, true);
  assert.equal(english.train(0, barracks.id, 'vanguard').ok, true);
});

// Rei, cavalaria leve e lanceiro endurecido: inglês, em edifício próprio ou no estábulo e no quartel (SPEC §3, adendo 19).
test('rei sai da Abadia dos Reis (inglês) a partir da Feudal', () => {
  const english = simFor('english');
  assert.ok(english.trainsOf(0, 'abbeyOfKings').includes('king'));
  const abbey = english.spawnBuilding('abbeyOfKings', 0, 30, 30, true);
  assert.equal(english.train(0, abbey.id, 'king').ok, false, 'na Idade das Trevas não treina');
  english.players[0].age = 2;
  assert.equal(english.train(0, abbey.id, 'king').ok, true, 'na Feudal treina');
});

test('cavalaria leve e lanceiro endurecido: só o inglês treina', () => {
  assert.ok(simFor('english').trainsOf(0, 'stable').includes('horseman'));
  assert.ok(!simFor('french').trainsOf(0, 'stable').includes('horseman'));
  assert.ok(simFor('english').trainsOf(0, 'barracks').includes('hardenedSpearman'));
  assert.ok(!simFor('french').trainsOf(0, 'barracks').includes('hardenedSpearman'));
});

// Arbalétrier: unidade francesa única, no campo de tiro a partir da Feudal (provisório; SPEC §3 marca incerto).
test('arbalétrier: francês treina no campo de tiro a partir da Feudal; inglês não', () => {
  assert.ok(simFor('french').trainsOf(0, 'archeryRange').includes('arbalestrier'));
  assert.ok(!simFor('english').trainsOf(0, 'archeryRange').includes('arbalestrier'));
  const french = simFor('french');
  const range = french.spawnBuilding('archeryRange', 0, 22, 22, true);
  assert.equal(french.train(0, range.id, 'arbalestrier').ok, false, 'na Idade das Trevas não treina');
  french.players[0].age = 2;
  assert.equal(french.train(0, range.id, 'arbalestrier').ok, true, 'na Feudal treina');
});
