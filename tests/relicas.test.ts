import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateMap } from '../src/core/mapgen.ts';
import { Simulation } from '../src/core/sim.ts';
import { NODES } from '../src/core/config.ts';
import type { PlayerConfig } from '../src/types.ts';

// Relíquias provisórias (SPEC anexo C, adendo 23): nó de ouro coletado por aldeões. Sem mosteiro nem monges ainda.
test('relíquia é um nó de ouro e o mapa de 64 tiles com 2 jogadores tem relíquias', () => {
  assert.equal(NODES.relic.resource, 'gold');
  const map = generateMap({ size: 64, playerCount: 2, seed: 1 });
  assert.ok(map.nodes.some((n) => n.type === 'relic'), 'há pelo menos uma relíquia');
});

test('aldeão coleta relíquia e o ouro entra no jogador que coletou', () => {
  const players: PlayerConfig[] = [
    { name: 'Você', color: '#2f7de1', civ: 'english' },
    { name: 'Bot', color: '#e04848', isBot: true, difficulty: 'normal', civ: 'english' },
  ];
  const map = generateMap({ size: 64, playerCount: 2, seed: 1 });
  const sim = new Simulation({ map, players, humanIndex: 0 });
  const relic = [...sim.world.entities.values()].find((e) => e.kind === 'node' && e.type === 'relic');
  assert.ok(relic, 'há relíquia no mundo');
  const villager = sim.entitiesOf(0).units.find((u) => u.type === 'villager');
  assert.ok(villager, 'há aldeão');
  sim.command(0, [villager.id], { type: 'gather', target: relic.id });
  const before = sim.players[0].res.gold;
  for (let t = 0; t < 120; t += 0.05) sim.update(0.05);
  assert.ok(sim.players[0].res.gold > before, 'o ouro da relíquia entrou');
});
