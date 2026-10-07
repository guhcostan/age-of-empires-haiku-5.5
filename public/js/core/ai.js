// Bots: pensam a cada poucos segundos (depende da dificuldade) e usam
// exatamente os mesmos comandos que o jogador humano.
import {
  BUILDINGS, UNITS, NODES, DIFFICULTY, MAX_POP, RESOURCES, AGE_UP, TECHS,
} from './config.js';
import { centerOf, rectOf, distToRect } from './world.js';

// Divisão ideal dos aldeões entre recursos.
const SHARE = { food: 0.4, wood: 0.35, gold: 0.15, stone: 0.1 };

export class BotBrain {
  constructor(sim, owner) {
    this.sim = sim;
    this.owner = owner;
    this.cfg = DIFFICULTY[sim.players[owner].difficulty];
    this.timer = 0.5 + owner * 0.37; // dessincroniza os bots
    this.attacking = false;
    this.attackTargetId = null;
  }

  update(dt) {
    if (this.sim.players[this.owner].defeated) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = this.cfg.think;
    this.think();
  }

  think() {
    const sim = this.sim;
    const o = this.owner;
    const player = sim.players[o];
    const { units, buildings } = sim.entitiesOf(o);
    const tc = buildings.find((b) => b.type === 'towncenter' && b.built);
    if (!tc) return;

    const civil = units.filter((u) => UNITS[u.type].civil);
    const army = units.filter((u) => !UNITS[u.type].civil);
    const built = (type) => buildings.filter((b) => b.type === type && b.built);
    const planned = (type) => buildings.filter((b) => b.type === type && !b.built).length;

    // 1. Aldeões até a meta da dificuldade.
    const queuedVillagers = tc.queue.filter((q) => q.type === 'villager').length;
    if (civil.length + queuedVillagers < this.cfg.villagers && tc.queue.length < 2) {
      sim.train(o, tc.id, 'villager');
    }

    // 2. Casas quando a população está quase cheia.
    const freePop = sim.popCap(o) - sim.popUsed(o);
    if (freePop <= 5 && planned('house') === 0 && sim.popCap(o) < MAX_POP) {
      this.build('house', civil, centerOf(tc), 4, 12);
    }

    // 3. Coleta: armazém, serraria e acampamento de mineração perto dos recursos.
    if (civil.length >= 6 && built('storehouse').length + planned('storehouse') === 0) {
      const wood = this.nearestNode(centerOf(tc), 'wood');
      if (wood) this.build('storehouse', civil, centerOf(wood), 2, 5);
    }
    if (civil.length >= 8 && built('lumberCamp').length + planned('lumberCamp') === 0) {
      const wood = this.nearestNode(centerOf(tc), 'wood');
      if (wood) this.build('lumberCamp', civil, centerOf(wood), 3, 6);
    }
    if (civil.length >= 10 && built('miningCamp').length + planned('miningCamp') === 0) {
      const mine = this.nearestNode(centerOf(tc), 'gold');
      if (mine) this.build('miningCamp', civil, centerOf(mine), 3, 6);
    }

    // 4. Fazendas e moinho: uma fazenda para cada ~5 aldeões.
    const farms = built('farm').length + planned('farm');
    const wantFarms = Math.min(6, Math.ceil(civil.length / 5));
    if (civil.length >= 6 && farms < wantFarms && planned('farm') === 0) {
      this.build('farm', civil, centerOf(tc), 4, 10);
    }
    if (built('farm').length >= 2 && built('mill').length + planned('mill') === 0) {
      this.build('mill', civil, centerOf(tc), 4, 10);
    }

    // 5. Quartel, estábulo e ferreiro conforme a idade.
    if (civil.length >= 10 && built('barracks').length + planned('barracks') === 0) {
      this.build('barracks', civil, centerOf(tc), 6, 12);
    }
    if (player.age >= 2 && built('barracks').length > 0 && civil.length >= 14
      && built('stable').length + planned('stable') === 0) {
      this.build('stable', civil, centerOf(tc), 6, 12);
    }
    if (player.age >= 2 && civil.length >= 16 && built('blacksmith').length + planned('blacksmith') === 0) {
      this.build('blacksmith', civil, centerOf(tc), 6, 12);
    }

    // 6. Subir de idade quando a economia está pronta.
    this.tryAgeUp(tc, civil.length, army.length);

    // 7. Pesquisas: a primeira técnica disponível em cada edifício que as oferece.
    for (const b of buildings) {
      if (!b.built || b.research) continue;
      const def = BUILDINGS[b.type];
      if (!def.techs) continue;
      for (const id of def.techs) {
        if (player.techs[id] || TECHS[id].age > player.age) continue;
        if (TECHS[id].req && !player.techs[TECHS[id].req]) continue;
        if (sim.research(o, b.id, id).ok) break;
      }
    }

    // 8. Treino militar: escolhe o melhor tipo desbloqueado para cada prédio.
    const count = (type) => army.filter((u) => u.type === type).length;
    for (const b of built('barracks')) {
      if (b.queue.length >= 2) continue;
      for (const type of this.barracksPriority(count, player.age)) {
        if (sim.train(o, b.id, type).ok) break;
      }
    }
    for (const b of built('stable')) {
      if (b.queue.length >= 2 || army.length < 6) continue;
      const order = player.age >= 3 && count('knight') < count('scout') * 2 + 1 ? ['knight', 'scout'] : ['scout', 'knight'];
      for (const type of order) if (sim.train(o, b.id, type).ok) break;
    }

    this.assignVillagers(civil, buildings);
    this.commandArmy(army, tc);
  }

  // Ordem de preferência de unidades do quartel conforme a idade e a composição do exército.
  barracksPriority(count, age) {
    const swords = count('swordsman');
    const bows = count('archer');
    const spears = count('spearman');
    const crossbows = count('crossbow');
    const order = [];
    if (age >= 3 && crossbows < bows * 0.5) order.push('crossbow');
    if (age >= 2 && spears < swords) order.push('spearman');
    if (bows < swords * 0.6) order.push('archer');
    order.push('swordsman', 'archer', 'spearman', 'crossbow');
    return [...new Set(order)];
  }

  tryAgeUp(tc, civilCount, armyCount) {
    const player = this.sim.players[this.owner];
    if (player.age >= 4 || tc.ageUp) return;
    const next = player.age + 1;
    const needCivil = { 2: 14, 3: 20, 4: 26 }[next];
    if (civilCount < needCivil) return;
    if (next === 3 && armyCount < 4) return;
    if (!this.sim.canAfford(this.owner, AGE_UP[next].cost)) return;
    this.sim.startAgeUp(this.owner, tc.id);
  }

  // Constrói um edifício num local livre perto de uma âncora, com até 2 construtores.
  build(type, civil, anchor, rMin, rMax) {
    const sim = this.sim;
    if (BUILDINGS[type].age > sim.players[this.owner].age) return false;
    if (!sim.canAfford(this.owner, BUILDINGS[type].cost)) return false;
    const spot = this.findSpot(type, anchor.x, anchor.y, rMin, rMax);
    if (!spot) return false;
    const r = sim.placeBuilding(this.owner, type, spot.x, spot.y);
    if (!r.ok) return false;
    // Os mais próximos constroem, estejam ociosos ou coletando; senão a obra nunca avança.
    const builders = civil
      .map((u) => ({ u, d: Math.hypot(u.x - spot.x, u.y - spot.y) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 2)
      .map((e) => e.u.id);
    if (builders.length) sim.command(this.owner, builders, { type: 'build', target: r.building.id });
    return true;
  }

  findSpot(type, cx, cy, rMin, rMax) {
    const def = BUILDINGS[type];
    for (let r = rMin; r <= rMax; r++) {
      const steps = Math.max(8, Math.round(r * 6));
      for (let k = 0; k < steps; k++) {
        const a = (k / steps) * Math.PI * 2;
        const x = Math.round(cx + Math.cos(a) * r - def.w / 2);
        const y = Math.round(cy + Math.sin(a) * r - def.h / 2);
        if (this.sim.checkPlacement(type, x, y) === null) return { x, y };
      }
    }
    return null;
  }

  nearestNode(from, resource) {
    let best = null;
    let bestD = Infinity;
    for (const n of this.sim.lists.nodes) {
      if (n.dead || n.amount <= 0 || NODES[n.type].resource !== resource) continue;
      const c = centerOf(n);
      const d = Math.hypot(c.x - from.x, c.y - from.y);
      if (d < bestD) { best = n; bestD = d; }
    }
    return best;
  }

  assignVillagers(civil, buildings) {
    const sim = this.sim;
    const o = this.owner;

    // Construtores: até 3 aldeões por fundação (pelo menos 1, mesmo que coletem).
    for (const f of buildings) {
      if (f.built) continue;
      const have = civil.filter((u) => u.order === 'build' && u.target === f.id).length;
      if (have >= 3) continue;
      const c = centerOf(f);
      const nearest = civil
        .filter((u) => !(u.order === 'build' && u.target === f.id))
        .map((u) => ({ u, d: Math.hypot(u.x - c.x, u.y - c.y) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, have === 0 ? 2 : 3 - have)
        .map((e) => e.u.id);
      if (nearest.length) sim.command(o, nearest, { type: 'build', target: f.id });
    }

    // Coletores: aldeões ociosos vão para o recurso mais defasado.
    const counts = { food: 0, wood: 0, gold: 0, stone: 0 };
    for (const u of civil) if (u.order === 'gather' && u.resKind) counts[u.resKind]++;
    const gathering = RESOURCES.reduce((n, r) => n + counts[r], 0);
    const deficitOrder = (total) => [...RESOURCES].sort(
      (a, b) => (SHARE[b] * total - counts[b]) - (SHARE[a] * total - counts[a]),
    );
    for (const u of civil) {
      if (u.order !== 'idle') continue;
      for (const res of deficitOrder(gathering + 1)) {
        const src = sim.findSource(o, u.x, u.y, res);
        if (!src) continue;
        sim.command(o, [u.id], { type: 'gather', target: src.id });
        counts[res]++;
        break;
      }
    }

    // Rebalanceamento: um coletor por ciclo sai do recurso em excesso para o defasado.
    // Sem isso, quem começou na comida ficaria lá para sempre (fazendas são infinitas).
    const total = gathering;
    const over = RESOURCES.filter((r) => counts[r] > SHARE[r] * total + 2);
    const under = deficitOrder(total).filter((r) => counts[r] < SHARE[r] * total - 1);
    if (over.length === 0 || under.length === 0) return;
    const fromRes = over.sort((a, b) => counts[b] - counts[a])[0];
    const mover = civil.find((u) => u.order === 'gather' && u.resKind === fromRes);
    if (!mover) return;
    for (const toRes of under) {
      const src = sim.findSource(o, mover.x, mover.y, toRes);
      if (!src) continue;
      sim.command(o, [mover.id], { type: 'gather', target: src.id });
      return;
    }
  }

  commandArmy(army, tc) {
    const sim = this.sim;
    const o = this.owner;
    if (army.length === 0) return;
    const home = centerOf(tc);

    // Defesa: inimigo se aproximando da base tem prioridade.
    const threat = this.nearestEnemyUnit(home, 14);
    if (threat) {
      const ids = army.filter((u) => u.order === 'idle').map((u) => u.id);
      if (ids.length) sim.command(o, ids, { type: 'attackmove', x: threat.x, y: threat.y });
      return;
    }

    // Ataque: junta o exército e ataca o alvo mais próximo.
    if (!this.attacking && army.length >= this.cfg.attackArmy) {
      const target = this.pickTarget(home);
      if (target) {
        this.attacking = true;
        this.attackTargetId = target.id;
      }
    }
    if (this.attacking) {
      if (army.length < Math.max(3, this.cfg.attackArmy * 0.35)) {
        this.attacking = false; // exército muito pequeno: recua
      } else {
        let t = sim.world.get(this.attackTargetId);
        if (!t || t.dead) {
          t = this.pickTarget(centerOf(army[0]));
          this.attackTargetId = t ? t.id : null;
        }
        if (!t) {
          this.attacking = false;
          return;
        }
        const idle = army.filter((u) => u.order === 'idle').map((u) => u.id);
        if (idle.length) {
          const c = centerOf(t);
          sim.command(o, idle, { type: 'attackmove', x: c.x, y: c.y });
        }
        return;
      }
    }

    // Reúne as tropas ociosas perto da base.
    const idle = army.filter((u) => u.order === 'idle');
    if (idle.length && Math.hypot(idle[0].x - home.x, idle[0].y - home.y) > 7) {
      sim.command(o, idle.map((u) => u.id), { type: 'attackmove', x: home.x + 3, y: home.y + 3 });
    }
  }

  nearestEnemyUnit(from, radius) {
    let best = null;
    let bestD = radius;
    for (const u of this.sim.lists.units) {
      if (u.dead || u.owner === this.owner) continue;
      const d = Math.hypot(u.x - from.x, u.y - from.y);
      if (d < bestD) { best = u; bestD = d; }
    }
    return best;
  }

  // Prefere centros de vila inimigos; senão, o edifício inimigo mais próximo.
  pickTarget(from) {
    let best = null;
    let bestScore = Infinity;
    for (const b of this.sim.lists.buildings) {
      if (b.dead || b.owner === this.owner || b.owner === -1) continue;
      if (this.sim.players[b.owner].defeated) continue;
      const d = distToRect(from.x, from.y, rectOf(b));
      const score = d + (b.type === 'towncenter' ? 0 : 6);
      if (score < bestScore) { best = b; bestScore = score; }
    }
    return best;
  }
}
