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
