// Simulação do jogo: economia, idades, técnicas, comandos, coleta, construção, treino, combate e névoa.
// Não depende de DOM nem de three.js, então roda em testes no Node.
import { World, defOf, rectOf, centerOf, distToRect } from './world.js';
import { findPath } from './pathfind.js';
import {
  UNITS, BUILDINGS, NODES, TECHS, AGE_UP, AGE_NAMES, START_RESOURCES, START_VILLAGERS,
  CARRY_CAPACITY, MAX_POP, MAX_QUEUE, DIFFICULTY,
} from './config.js';

const FOG_INTERVAL = 0.25;
const SEPARATION_RADIUS = 0.42;
const UNIT_RADIUS = 0.3;
const ATTACK_WARNING_COOLDOWN = 12;

const fail = (reason) => ({ ok: false, reason });
const ok = (extra = {}) => ({ ok: true, ...extra });

export class Simulation {
  constructor({ map, players, humanIndex = 0 }) {
    this.map = map;
    this.size = map.size;
    this.world = new World(map.size, map.terrain);
    this.humanIndex = humanIndex;
    this.players = players.map((p, index) => ({
      index,
      name: p.name,
      color: p.color,
      isBot: !!p.isBot,
      difficulty: p.difficulty ?? 'normal',
      res: { ...START_RESOURCES },
      defeated: false,
      age: 1,
      techs: {},
      stats: {
        kills: 0,
        lost: 0,
        destroyed: 0,
        built: 0,
        trained: 0,
        researched: 0,
        gathered: { food: 0, wood: 0, gold: 0, stone: 0 },
      },
    }));
    this.time = 0;
    this.events = [];
    this.gameOver = null;
    this.fog = new Uint8Array(map.size * map.size); // 0 inexplorado, 1 explorado, 2 visível
    this.fogTimer = 0;
    this.lists = { units: [], buildings: [], nodes: [] };
    this.lastWarn = -Infinity;
    this.spawnInitial();
    this.updateFog();
  }

  // ---------- Criação de entidades ----------

  spawnInitial() {
    this.map.starts.forEach((s, owner) => {
      const tc = this.spawnBuilding('towncenter', owner, s.x, s.y, true);
      for (const p of this.freeTilesAround(tc, START_VILLAGERS)) {
        this.spawnUnit('villager', owner, p.x, p.y);
      }
    });
    for (const n of this.map.nodes) this.spawnNode(n.type, n.x, n.y);
  }

  spawnUnit(type, owner, x, y) {
    const def = UNITS[type];
    return this.world.add({
      kind: 'unit', type, owner, x, y,
      hp: def.hp, maxHp: def.hp, lastHitBy: -1,
      order: 'idle', path: null, pi: 0, target: null, dest: null, resume: null,
      cooldown: 0, repath: 0, scanT: 0, gt: 0, phase: null, resKind: null,
      carry: null, inSite: false, moved: false, sx: 0, sy: 0,
      gx: 0, gy: 0, skipId: -1, skipUntil: 0,
    });
  }

  spawnBuilding(type, owner, x, y, built = false) {
    const def = BUILDINGS[type];
    return this.world.add({
      kind: 'building', type, owner, x, y,
      hp: built ? def.hp : Math.round(def.hp * 0.1), maxHp: def.hp, lastHitBy: -1,
      built, progress: built ? 1 : 0, builders: 0, queue: [], rally: null,
      research: null, ageUp: null, cooldown: 0,
    });
  }

  spawnNode(type, x, y) {
    return this.world.add({
      kind: 'node', type, owner: -1, x, y, amount: NODES[type].amount, lastHitBy: -1,
    });
  }

  // Tiles caminháveis encostados num edifício/unidade, sem unidades em cima.
  freeTilesAround(e, count) {
    const r = e.kind === 'unit'
      ? { x: Math.floor(e.x), y: Math.floor(e.y), w: 1, h: 1 }
      : rectOf(e);
    const occupied = new Set();
    for (const u of this.world.entities.values()) {
      if (u.kind === 'unit' && !u.dead) occupied.add(`${Math.floor(u.x)},${Math.floor(u.y)}`);
    }
    const out = [];
    for (let y = r.y - 1; y <= r.y + r.h && out.length < count; y++) {
      for (let x = r.x - 1; x <= r.x + r.w && out.length < count; x++) {
        if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) continue;
        if (!this.world.walkable(x, y) || occupied.has(`${x},${y}`)) continue;
        out.push({ x: x + 0.5, y: y + 0.5 });
      }
    }
    if (out.length === 0) {
      const c = centerOf(e);
      out.push({ x: c.x, y: c.y });
    }
    return out;
  }

  // ---------- Consultas ----------

  player(owner) {
    return this.players[owner];
  }

  canAfford(owner, cost) {
    const res = this.players[owner].res;
    return Object.entries(cost).every(([k, v]) => res[k] >= v);
  }

  spend(owner, cost) {
    const res = this.players[owner].res;
    for (const [k, v] of Object.entries(cost)) res[k] -= v;
  }

  // Multiplicador de coleta do dono para um recurso (técnicas somam).
  gatherBonus(owner, res) {
    let bonus = 1;
    for (const id of Object.keys(this.players[owner].techs)) {
      bonus += TECHS[id].effect.gather?.[res] ?? 0;
    }
    return bonus;
  }

  attackBonus(owner) {
    let bonus = 1;
    for (const id of Object.keys(this.players[owner].techs)) {
      bonus += TECHS[id].effect.attack ?? 0;
    }
    return bonus;
  }

  popUsed(owner) {
    let n = 0;
    for (const e of this.world.entities.values()) {
      if (e.owner !== owner || e.dead) continue;
      if (e.kind === 'unit') n++;
      else if (e.kind === 'building' && e.built) n += e.queue.length;
    }
    return n;
  }

  popCap(owner) {
    let cap = 0;
    for (const e of this.world.entities.values()) {
      if (e.kind === 'building' && e.owner === owner && e.built) cap += BUILDINGS[e.type].pop || 0;
    }
    return Math.min(MAX_POP, cap);
  }

  gatherersOf(id) {
    let n = 0;
    for (const u of this.lists.units) if (u.order === 'gather' && u.target === id && !u.dead) n++;
    return n;
  }

  // Coleta: encontra o recurso mais próximo de (x, y) que o dono consegue usar.
  findSource(owner, x, y, res) {
    let best = null;
    let bestD = Infinity;
    for (const n of this.lists.nodes) {
      if (n.dead || n.amount <= 0 || NODES[n.type].resource !== res) continue;
      const c = centerOf(n);
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < bestD) { best = n; bestD = d; }
    }
    for (const b of this.lists.buildings) {
      if (b.dead || b.owner !== owner || !b.built || BUILDINGS[b.type].gather !== res) continue;
      if (this.gatherersOf(b.id) >= BUILDINGS[b.type].maxGatherers) continue;
      const c = centerOf(b);
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < bestD) { best = b; bestD = d; }
    }
    return best;
  }

  nearestDropoff(owner, x, y, res) {
    let best = null;
    let bestD = Infinity;
    for (const b of this.lists.buildings) {
      if (b.dead || b.owner !== owner || !b.built) continue;
      if (!BUILDINGS[b.type].dropoff?.includes(res)) continue;
      const d = distToRect(x, y, rectOf(b));
      if (d < bestD) { best = b; bestD = d; }
    }
    return best;
  }

  // Checa se um edifício pode ser colocado. Retorna null se OK, ou o motivo.
  checkPlacement(type, x, y) {
    const def = BUILDINGS[type];
    if (!def) return 'Construção desconhecida';
    for (let j = y; j < y + def.h; j++) {
      for (let i = x; i < x + def.w; i++) {
        if (!this.world.inBounds(i, j)) return 'Fora do mapa';
        if (this.world.blocked[j * this.size + i]) return 'Terreno ocupado';
      }
    }
    for (const e of this.world.entities.values()) {
      if (e.kind !== 'unit' || e.dead) continue;
      if (e.x >= x && e.x < x + def.w && e.y >= y && e.y < y + def.h) return 'Há unidades no local';
    }
    return null;
  }

  // ---------- Comandos (usados pelo jogador e pelos bots) ----------

  placeBuilding(owner, type, x, y) {
    if (type === 'towncenter' || !BUILDINGS[type]) return fail('Não é possível construir isso');
    if (BUILDINGS[type].age > this.players[owner].age) return fail(`Requer ${AGE_NAMES[BUILDINGS[type].age]}`);
    const reason = this.checkPlacement(type, x, y);
    if (reason) return fail(reason);
    const cost = BUILDINGS[type].cost;
    if (!this.canAfford(owner, cost)) return fail('Recursos insuficientes');
    this.spend(owner, cost);
    return ok({ building: this.spawnBuilding(type, owner, x, y, false) });
  }

  train(owner, id, type) {
    const b = this.world.get(id);
    if (!b || b.dead || b.owner !== owner || !b.built) return fail('Edifício indisponível');
    if (!BUILDINGS[b.type].trains?.includes(type)) return fail('Este edifício não treina isso');
    if (UNITS[type].age > this.players[owner].age) return fail(`Requer ${AGE_NAMES[UNITS[type].age]}`);
    if (b.queue.length >= MAX_QUEUE) return fail('Fila cheia');
    const def = UNITS[type];
    if (!this.canAfford(owner, def.cost)) return fail('Recursos insuficientes');
    if (this.popUsed(owner) >= this.popCap(owner)) return fail('População máxima — construa casas');
    this.spend(owner, def.cost);
    b.queue.push({ type, time: def.time, elapsed: 0 });
    return ok();
  }

  cancelTraining(owner, id) {
    const b = this.world.get(id);
    if (!b || b.dead || b.owner !== owner || b.queue.length === 0) return fail('Nada para cancelar');
    const item = b.queue.pop();
    const refund = UNITS[item.type].cost;
    const res = this.players[owner].res;
    for (const [k, v] of Object.entries(refund)) res[k] += v;
    return ok();
  }

  // Avança para a próxima idade no Centro da Vila.
  startAgeUp(owner, id) {
    const b = this.world.get(id);
    if (!b || b.dead || b.owner !== owner || !b.built || b.type !== 'towncenter') return fail('Use o Centro da Vila');
    const p = this.players[owner];
    if (p.age >= 4) return fail('Já está na última idade');
    if (b.ageUp) return fail('Já avançando de idade');
    const next = AGE_UP[p.age + 1];
    if (!this.canAfford(owner, next.cost)) return fail('Recursos insuficientes');
    this.spend(owner, next.cost);
    b.ageUp = { elapsed: 0, time: next.time, to: p.age + 1 };
    this.notify(owner, `Avançando para ${AGE_NAMES[p.age + 1]}`, 'info');
    return ok();
  }

  // Pesquisa uma técnica num edifício que a oferece (uma por vez em cada edifício).
  research(owner, id, techId) {
    const b = this.world.get(id);
    const tech = TECHS[techId];
    if (!b || b.dead || b.owner !== owner || !b.built) return fail('Edifício indisponível');
    if (!tech || tech.building !== b.type) return fail('Esta técnica não é deste edifício');
    const p = this.players[owner];
    if (p.techs[techId]) return fail('Técnica já pesquisada');
    if (tech.age > p.age) return fail(`Requer ${AGE_NAMES[tech.age]}`);
    if (tech.req && !p.techs[tech.req]) return fail(`Pesquise ${TECHS[tech.req].name} antes`);
    if (b.research) return fail('Já pesquisando neste edifício');
    if (!this.canAfford(owner, tech.cost)) return fail('Recursos insuficientes');
    this.spend(owner, tech.cost);
    b.research = { id: techId, elapsed: 0, time: tech.time };
    this.notify(owner, `${tech.name} em pesquisa`, 'info');
    return ok();
  }

  setRally(owner, id, x, y, targetId = null) {
    const b = this.world.get(id);
    if (!b || b.dead || b.owner !== owner || b.kind !== 'building') return fail('Não é possível definir');
    b.rally = { x, y, target: targetId };
    return ok();
  }

  // Ordens para um grupo de unidades do mesmo dono.
  command(owner, unitIds, cmd) {
    const units = [];
    for (const id of unitIds) {
      const u = this.world.get(id);
      if (u && u.kind === 'unit' && !u.dead && u.owner === owner) units.push(u);
    }
    if (units.length === 0) return;
    switch (cmd.type) {
      case 'move':
        for (const u of units) this.orderMove(u, cmd.x, cmd.y, null);
        break;
      case 'attackmove':
        for (const u of units) this.orderMove(u, cmd.x, cmd.y, 'attackmove');
        break;
      case 'stop':
        for (const u of units) this.setIdle(u);
        break;
      case 'attack': {
        const t = this.world.get(cmd.target);
        if (!t || t.dead || t.owner === owner || t.owner === -1) return;
        for (const u of units) this.startAttack(u, t, null);
        break;
      }
      case 'gather': {
        const t = this.world.get(cmd.target);
        if (!t || t.dead) return;
        const res = t.kind === 'node' ? NODES[t.type].resource : BUILDINGS[t.type].gather;
        if (!res) return;
        if (t.kind === 'building' && this.gatherersOf(t.id) >= BUILDINGS[t.type].maxGatherers) {
          this.say('Esta fazenda já está lotada', 'warn');
          return;
        }
        for (const u of units) if (UNITS[u.type].civil) this.orderGather(u, t, res);
        break;
      }
      case 'build': {
        const b = this.world.get(cmd.target);
        if (!b || b.dead || b.built || b.owner !== owner) return;
        for (const u of units) {
          if (!UNITS[u.type].civil) continue;
          this.setIdle(u);
          u.order = 'build';
          u.target = b.id;
        }
        break;
      }
      default:
        break;
    }
  }

  // Clique direito: decide a ação conforme o alvo.
  smartCommand(owner, unitIds, target) {
    if (target.entity) {
      const e = target.entity;
      if (e.owner !== owner && e.owner !== -1) {
        this.command(owner, unitIds, { type: 'attack', target: e.id });
        return;
      }
      if (e.kind === 'node' || (e.kind === 'building' && BUILDINGS[e.type].gather)) {
        this.command(owner, unitIds, { type: 'gather', target: e.id });
        return;
      }
      if (e.kind === 'building' && !e.built && e.owner === owner) {
        this.command(owner, unitIds, { type: 'build', target: e.id });
        return;
      }
    }
    this.command(owner, unitIds, { type: 'move', x: target.x, y: target.y });
  }

  orderMove(u, x, y, mode) {
    const order = mode === 'attackmove' ? 'attackmove' : 'move';
    // Já está indo para lá: não refaz o caminho à toa (bots repetem ordens a cada ciclo).
    if (u.order === order && u.dest && Math.hypot(u.dest.x - x, u.dest.y - y) < 0.5) return;
    u.order = order;
    u.dest = { x, y };
    u.path = null;
    u.pi = 0;
    u.target = null;
    u.resume = null;
    u.inSite = false;
  }

  orderGather(u, src, res) {
    u.order = 'gather';
    u.target = src.id;
    u.resKind = res;
    u.path = null;
    u.phase = u.carry && u.carry.amt > 0 ? 'toDrop' : 'toRes';
    u.inSite = false;
  }

  startAttack(u, t, resume) {
    u.order = 'attack';
    u.target = t.id;
    u.path = null;
    u.pi = 0;
    u.resume = resume;
    u.repath = 0;
    u.inSite = false;
  }

  setIdle(u) {
    u.order = 'idle';
    u.target = null;
    u.path = null;
    u.pi = 0;
    u.phase = null;
    u.resume = null;
    u.inSite = false;
    u.dest = null;
    u.scanT = 0;
  }

  // ---------- Atualização ----------

  update(dt) {
    if (this.gameOver) return;
    this.time += dt;
    this.rebuildLists();
    for (const b of this.lists.buildings) if (!b.dead) this.updateBuilding(b, dt);
    for (const u of this.lists.units) if (!u.dead) this.updateUnit(u, dt);
    this.separateUnits();
    this.resolveDeaths();
    this.fogTimer -= dt;
    if (this.fogTimer <= 0) {
      this.fogTimer = FOG_INTERVAL;
      this.updateFog();
    }
    this.checkDefeats();
  }

  rebuildLists() {
    const units = [];
    const buildings = [];
    const nodes = [];
    for (const e of this.world.entities.values()) {
      if (e.kind === 'unit') units.push(e);
      else if (e.kind === 'building') {
        e.builders = 0;
        buildings.push(e);
      } else nodes.push(e);
    }
    for (const u of units) {
      if (u.order === 'build' && u.inSite) {
        const b = this.world.get(u.target);
        if (b && b.kind === 'building') b.builders++;
      }
    }
    this.lists = { units, buildings, nodes };
  }

  updateBuilding(b, dt) {
    const def = BUILDINGS[b.type];
    if (!b.built) {
      if (b.builders > 0) {
        b.progress += (dt / def.time) * Math.pow(b.builders, 0.7);
        b.hp = Math.max(b.hp, Math.round(def.hp * (0.1 + 0.9 * Math.min(1, b.progress))));
        if (b.progress >= 1) this.completeBuilding(b);
      }
      return;
    }
    if (b.ageUp) {
      b.ageUp.elapsed += dt;
      if (b.ageUp.elapsed >= b.ageUp.time) this.finishAgeUp(b);
    }
    if (b.research) {
      b.research.elapsed += dt;
      if (b.research.elapsed >= b.research.time) this.finishResearch(b);
    }
    const q = b.queue[0];
    if (q) {
      q.elapsed += dt;
      if (q.elapsed >= q.time) {
        b.queue.shift();
        this.finishTraining(b, q.type);
      }
    }
    if (def.attack) this.towerFire(b, dt);
  }

  // Torre: atira no inimigo mais próximo dentro do alcance.
  towerFire(b, dt) {
    const def = BUILDINGS[b.type];
    b.cooldown = Math.max(0, b.cooldown - dt);
    if (b.cooldown > 0) return;
    const c = centerOf(b);
    let best = null;
    let bestD = def.range;
    for (const u of this.lists.units) {
      if (u.dead || u.owner === b.owner || u.owner === -1) continue;
      const d = Math.hypot(u.x - c.x, u.y - c.y);
      if (d < bestD) { best = u; bestD = d; }
    }
    if (!best) return;
    b.cooldown = def.cooldown;
    best.hp -= def.attack * this.attackBonus(b.owner);
    best.lastHitBy = b.owner;
    this.events.push({ type: 'shot', from: { x: c.x, y: c.y }, to: { x: best.x, y: best.y }, owner: b.owner });
    if (best.owner === this.humanIndex && this.time - this.lastWarn > ATTACK_WARNING_COOLDOWN) {
      this.lastWarn = this.time;
      this.say('Estamos sendo atacados!', 'bad');
    }
  }

  completeBuilding(b) {
    b.built = true;
    b.progress = 1;
    b.hp = b.maxHp;
    const def = BUILDINGS[b.type];
    this.players[b.owner].stats.built++;
    this.notify(b.owner, `${def.name} concluído`, 'good');
    for (const u of this.lists.units) {
      if (u.order !== 'build' || u.target !== b.id) continue;
      if (def.gather) this.orderGather(u, b, def.gather);
      else this.setIdle(u);
    }
  }

  finishAgeUp(b) {
    const p = this.players[b.owner];
    p.age = b.ageUp.to;
    b.ageUp = null;
    this.notify(b.owner, `${AGE_NAMES[p.age]} alcançada!`, 'good');
  }

  finishResearch(b) {
    const p = this.players[b.owner];
    const id = b.research.id;
    p.techs[id] = true;
    p.stats.researched++;
    b.research = null;
    this.notify(b.owner, `${TECHS[id].name} concluída`, 'good');
  }

  finishTraining(b, type) {
    const spot = this.freeTilesAround(b, 1)[0];
    const u = this.spawnUnit(type, b.owner, spot.x, spot.y);
    this.players[b.owner].stats.trained++;
    this.notify(b.owner, `${UNITS[type].name} pronto`, 'info');
    const rally = b.rally;
    if (!rally) return;
    const t = rally.target !== null && rally.target !== undefined ? this.world.get(rally.target) : null;
    if (t && !t.dead && t.kind === 'node' && UNITS[type].civil) {
      this.orderGather(u, t, NODES[t.type].resource);
    } else if (t && !t.dead && t.kind === 'building' && BUILDINGS[t.type].gather && UNITS[type].civil) {
      this.orderGather(u, t, BUILDINGS[t.type].gather);
    } else {
      this.orderMove(u, rally.x, rally.y, UNITS[type].civil ? null : 'attackmove');
    }
  }

  updateUnit(u, dt) {
    u.cooldown = Math.max(0, u.cooldown - dt);
    u.repath -= dt;
    u.moved = false;
    switch (u.order) {
      case 'idle': return this.idleBehaviour(u, dt);
      case 'move': return this.moveBehaviour(u, dt);
      case 'attackmove': return this.attackMoveBehaviour(u, dt);
      case 'attack': return this.attackBehaviour(u, dt);
      case 'gather': return this.gatherBehaviour(u, dt);
      case 'build': return this.buildBehaviour(u, dt);
      default: return undefined;
    }
  }

  idleBehaviour(u, dt) {
    u.scanT -= dt;
    if (u.scanT > 0) return;
    u.scanT = 0.5;
    const civil = UNITS[u.type].civil;
    const foe = this.findFoe(u, civil ? 2.5 : UNITS[u.type].sight, false);
    if (foe) this.startAttack(u, foe, null);
  }

  moveBehaviour(u, dt) {
    if (!u.path) {
      const p = findPath(this.world, u.x, u.y, { type: 'tile', x: Math.floor(u.dest.x), y: Math.floor(u.dest.y) });
      if (!p || p.length === 0) return this.setIdle(u);
      u.path = p;
      u.pi = 0;
    }
    if (!this.followPath(u, dt)) this.setIdle(u);
  }

  attackMoveBehaviour(u, dt) {
    u.scanT -= dt;
    if (u.scanT <= 0) {
      u.scanT = 0.4;
      const foe = this.findFoe(u, UNITS[u.type].sight, true);
      if (foe) {
        this.startAttack(u, foe, { order: 'attackmove', dest: { x: u.dest.x, y: u.dest.y } });
        return;
      }
    }
    this.moveBehaviour(u, dt);
  }

  attackBehaviour(u, dt) {
    const t = this.world.get(u.target);
    if (!t || t.dead || t.hp <= 0 || t.kind === 'node') return this.afterTarget(u);
    const def = UNITS[u.type];
    const gap = this.gapTo(u, t);
    if (gap <= def.range + 0.05) {
      u.path = null;
      if (u.cooldown <= 0) {
        this.strike(u, t);
        u.cooldown = def.cooldown;
      }
      return;
    }
    // Recalcula o caminho só se o alvo se mexeu (prédios não se movem).
    const moved = t.kind === 'unit' && Math.hypot(t.x - u.gx, t.y - u.gy) > 1.5;
    if (!u.path || u.pi >= u.path.length || (moved && u.repath <= 0)) {
      u.repath = 0.6;
      u.gx = t.x;
      u.gy = t.y;
      const goal = t.kind === 'unit'
        ? { type: 'tile', x: Math.floor(t.x), y: Math.floor(t.y) }
        : { type: 'rect', ...rectOf(t) };
      const p = findPath(this.world, u.x, u.y, goal);
      if (!p) {
        // Alvo inalcançável: ignora por um tempo em vez de tentar de novo a cada tick.
        u.skipId = t.id;
        u.skipUntil = this.time + 6;
        return this.afterTarget(u);
      }
      u.path = p;
      u.pi = 0;
    }
    if (!this.followPath(u, dt)) u.path = null;
  }

  afterTarget(u) {
    const resume = u.resume;
    if (resume && resume.order === 'attackmove') {
      u.order = 'attackmove';
      u.target = null;
      u.path = null;
      u.pi = 0;
      u.resume = null;
      u.dest = resume.dest;
      return;
    }
    this.setIdle(u);
  }

  gapTo(u, t) {
    if (t.kind === 'unit') return Math.hypot(t.x - u.x, t.y - u.y) - UNIT_RADIUS;
    return distToRect(u.x, u.y, rectOf(t));
  }

  strike(u, t) {
    const def = UNITS[u.type];
    let dmg = def.attack * this.attackBonus(u.owner);
    if (t.kind === 'unit') dmg *= def.bonus?.[t.type] ?? 1;
    if (t.kind === 'building') dmg *= 0.5;
    t.hp -= dmg;
    t.lastHitBy = u.owner;
    this.events.push({
      type: def.ranged ? 'shot' : 'hit',
      from: { x: u.x, y: u.y },
      to: centerOf(t),
      owner: u.owner,
    });
    if (t.kind === 'unit' && (t.order === 'idle' || t.order === 'attackmove')) {
      const resume = t.order === 'attackmove' ? { order: 'attackmove', dest: { x: t.dest.x, y: t.dest.y } } : null;
      this.startAttack(t, u, resume);
    }
    if (t.owner === this.humanIndex && this.time - this.lastWarn > ATTACK_WARNING_COOLDOWN) {
      this.lastWarn = this.time;
      this.say('Estamos sendo atacados!', 'bad');
    }
  }

  // Coleta: o aldeão anda até o recurso, coleta, entrega e volta ao recurso.
  gatherBehaviour(u, dt) {
    if (u.phase === 'toDrop') return this.deliverBehaviour(u, dt);
    const src = this.validSource(u.target, u);
    if (!src) {
      if (u.carry && u.carry.amt > 0) {
        u.phase = 'toDrop';
        u.path = null;
        return this.deliverBehaviour(u, dt);
      }
      return this.seekSource(u);
    }
    const gap = distToRect(u.x, u.y, rectOf(src));
    const reach = u.phase === 'chop' ? 1.1 : 0.85;
    if (gap > reach) {
      u.phase = 'toRes';
      if (!u.path || u.pi >= u.path.length) {
        const p = findPath(this.world, u.x, u.y, { type: 'rect', ...rectOf(src) });
        if (!p) return this.setIdle(u);
        if (p.length === 0) {
          u.phase = 'chop';
          u.gt = 0;
          u.path = null;
          return undefined;
        }
        u.path = p;
        u.pi = 0;
      }
      if (!this.followPath(u, dt)) u.path = null;
      return undefined;
    }

    u.phase = 'chop';
    u.path = null;
    const isNode = src.kind === 'node';
    const res = isNode ? NODES[src.type].resource : BUILDINGS[src.type].gather;
    const per = isNode ? NODES[src.type].gatherTime : BUILDINGS[src.type].gatherTime;
    if (!u.carry || u.carry.res !== res) u.carry = { res, amt: 0 };
    u.gt += dt * this.econMult(u.owner) * this.gatherBonus(u.owner, res);
    while (u.gt >= per) {
      u.gt -= per;
      u.carry.amt++;
      if (isNode) src.amount--;
      const depleted = isNode && src.amount <= 0;
      if (depleted) this.world.remove(src);
      if (u.carry.amt >= CARRY_CAPACITY || depleted) {
        u.phase = 'toDrop';
        u.gt = 0;
        return undefined;
      }
    }
    return undefined;
  }

  deliverBehaviour(u, dt) {
    if (!u.carry || u.carry.amt <= 0) {
      u.carry = null;
      return this.afterDeliver(u);
    }
    const drop = this.nearestDropoff(u.owner, u.x, u.y, u.carry.res);
    if (!drop) return this.setIdle(u);
    const rect = rectOf(drop);
    if (distToRect(u.x, u.y, rect) <= 0.9) {
      this.depositCarry(u);
      return this.afterDeliver(u);
    }
    if (!u.path || u.pi >= u.path.length) {
      const p = findPath(this.world, u.x, u.y, { type: 'rect', ...rect });
      if (!p) return this.setIdle(u);
      if (p.length === 0) {
        this.depositCarry(u);
        return this.afterDeliver(u);
      }
      u.path = p;
      u.pi = 0;
    }
    if (!this.followPath(u, dt)) u.path = null;
    return undefined;
  }

  depositCarry(u) {
    const c = u.carry;
    if (!c) return;
    const p = this.players[u.owner];
    p.res[c.res] += c.amt;
    p.stats.gathered[c.res] += c.amt;
    u.carry = null;
  }

  afterDeliver(u) {
    u.path = null;
    if (this.validSource(u.target, u)) {
      u.phase = 'toRes';
      return undefined;
    }
    return this.seekSource(u);
  }

  validSource(id, u) {
    const e = this.world.get(id);
    if (!e || e.dead) return null;
    if (e.kind === 'node') return e.amount > 0 ? e : null;
    if (e.kind === 'building') return e.built && e.owner === u.owner ? e : null;
    return null;
  }

  seekSource(u) {
    const src = this.findSource(u.owner, u.x, u.y, u.resKind);
    if (!src) return this.setIdle(u);
    u.target = src.id;
    u.phase = 'toRes';
    u.path = null;
    u.pi = 0;
    return undefined;
  }

  buildBehaviour(u, dt) {
    const b = this.world.get(u.target);
    if (!b || b.dead || b.built) return this.setIdle(u);
    const rect = rectOf(b);
    if (distToRect(u.x, u.y, rect) <= 1.0) {
      u.inSite = true;
      u.path = null;
      return;
    }
    u.inSite = false;
    if (!u.path || u.pi >= u.path.length) {
      const p = findPath(this.world, u.x, u.y, { type: 'rect', ...rect });
      if (!p) return this.setIdle(u);
      if (p.length === 0) {
        u.inSite = true;
        return;
      }
      u.path = p;
      u.pi = 0;
    }
    if (!this.followPath(u, dt)) u.path = null;
  }

  // Anda pelo caminho armazenado. Retorna false quando o caminho termina.
  followPath(u, dt) {
    const speed = UNITS[u.type].speed;
    let budget = speed * dt;
    const sx = u.x;
    const sy = u.y;
    while (budget > 1e-6 && u.path && u.pi < u.path.length) {
      const wp = u.path[u.pi];
      const dx = wp.x - u.x;
      const dy = wp.y - u.y;
      const d = Math.hypot(dx, dy);
      if (d <= budget) {
        u.x = wp.x;
        u.y = wp.y;
        budget -= d;
        u.pi++;
      } else {
        u.x += (dx / d) * budget;
        u.y += (dy / d) * budget;
        budget = 0;
      }
    }
    u.moved = (u.x - sx) ** 2 + (u.y - sy) ** 2 > 1e-8;
    return !!u.path && u.pi < u.path.length;
  }

  findFoe(u, radius, withBuildings) {
    let best = null;
    let bestD = radius;
    const skipping = (o) => o.id === u.skipId && this.time < u.skipUntil;
    for (const o of this.lists.units) {
      if (o.dead || o.owner === u.owner || skipping(o)) continue;
      const d = Math.hypot(o.x - u.x, o.y - u.y);
      if (d < bestD) { best = o; bestD = d; }
    }
    if (best || !withBuildings) return best;
    for (const b of this.lists.buildings) {
      if (b.dead || b.owner === u.owner || skipping(b)) continue;
      const g = distToRect(u.x, u.y, rectOf(b));
      if (g < 4 && g < bestD) { best = b; bestD = g; }
    }
    return best;
  }

  // Afasta unidades paradas que estão sobrepostas. Unidades em movimento
  // atravessam umas às outras: separar quem anda causaria impasses em corredores.
  separateUnits() {
    const us = this.lists.units.filter((u) => !u.dead);
    for (const u of us) { u.sx = 0; u.sy = 0; }
    const R = SEPARATION_RADIUS;
    for (let i = 0; i < us.length; i++) {
      const a = us[i];
      for (let j = i + 1; j < us.length; j++) {
        const b = us[j];
        if (a.moved || b.moved) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        if (dx > R || dx < -R || dy > R || dy < -R) continue;
        const d2 = dx * dx + dy * dy;
        if (d2 >= R * R) continue;
        const d = Math.sqrt(d2) || 0.0001;
        const push = (R - d) * 0.5;
        const nx = (dx / d) * push;
        const ny = (dy / d) * push;
        a.sx -= nx;
        a.sy -= ny;
        b.sx += nx;
        b.sy += ny;
      }
    }
    for (const u of us) {
      if (u.sx === 0 && u.sy === 0) continue;
      const nx = u.x + u.sx;
      const ny = u.y + u.sy;
      if (this.world.walkable(Math.floor(nx), Math.floor(ny))) {
        u.x = nx;
        u.y = ny;
      }
    }
  }

  // ---------- Morte, derrota e vitória ----------

  resolveDeaths() {
    for (const e of [...this.world.entities.values()]) {
      if (e.dead || e.kind === 'node' || e.hp > 0) continue;
      const c = centerOf(e);
      this.events.push({ type: 'death', kind: e.kind, x: c.x, y: c.y, owner: e.owner });
      if (e.lastHitBy >= 0) {
        const killer = this.players[e.lastHitBy].stats;
        if (e.kind === 'unit') killer.kills++;
        else killer.destroyed++;
      }
      if (e.kind === 'unit') this.players[e.owner].stats.lost++;
      if (e.kind === 'building' && e.owner === this.humanIndex) {
        this.notify(e.owner, `${BUILDINGS[e.type].name} destruído!`, 'bad');
      }
      this.world.remove(e);
    }
  }

  checkDefeats() {
    const hasBuilding = new Set();
    for (const e of this.world.entities.values()) {
      if (e.kind === 'building') hasBuilding.add(e.owner);
    }
    for (const p of this.players) {
      if (p.defeated || hasBuilding.has(p.index)) continue;
      p.defeated = true;
      for (const e of [...this.world.entities.values()]) {
        if (e.owner === p.index && e.kind === 'unit') this.world.remove(e);
      }
      if (p.index !== this.humanIndex) this.say(`${p.name} foram derrotados!`, 'good');
    }
    const human = this.players[this.humanIndex];
    const opponents = this.players.filter((p) => p.index !== this.humanIndex);
    if (human.defeated) {
      this.gameOver = { result: 'defeat', time: this.time };
    } else if (opponents.length > 0 && opponents.every((p) => p.defeated)) {
      this.gameOver = { result: 'victory', time: this.time };
    }
  }

  // ---------- Névoa de guerra (só para o jogador humano) ----------

  updateFog() {
    const size = this.size;
    const fog = this.fog;
    for (let i = 0; i < fog.length; i++) if (fog[i] === 2) fog[i] = 1;
    for (const e of this.world.entities.values()) {
      if (e.owner !== this.humanIndex || e.dead) continue;
      const r = defOf(e).sight;
      const c = centerOf(e);
      const x0 = Math.max(0, Math.floor(c.x - r));
      const x1 = Math.min(size - 1, Math.ceil(c.x + r));
      const y0 = Math.max(0, Math.floor(c.y - r));
      const y1 = Math.min(size - 1, Math.ceil(c.y + r));
      const r2 = r * r;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = x + 0.5 - c.x;
          const dy = y + 0.5 - c.y;
          if (dx * dx + dy * dy <= r2) fog[y * size + x] = 2;
        }
      }
    }
  }

  // Pode o jogador humano ver esta entidade?
  canSee(e) {
    if (e.owner === this.humanIndex) return true;
    if (e.kind === 'unit') {
      return this.fog[Math.floor(e.y) * this.size + Math.floor(e.x)] === 2;
    }
    const c = centerOf(e);
    return this.fog[Math.floor(c.y) * this.size + Math.floor(c.x)] >= 1;
  }

  // ---------- Economia auxiliar, mensagens e eventos ----------

  econMult(owner) {
    const p = this.players[owner];
    return p.isBot ? DIFFICULTY[p.difficulty].gather : 1;
  }

  say(text, level = 'info') {
    this.events.push({ type: 'msg', text, level });
  }

  notify(owner, text, level = 'info') {
    if (owner === this.humanIndex) this.say(text, level);
  }

  drainEvents() {
    const out = this.events;
    this.events = [];
    return out;
  }

  // Entidades do jogador para a UI e a IA.
  entitiesOf(owner) {
    const units = [];
    const buildings = [];
    for (const e of this.world.entities.values()) {
      if (e.owner !== owner || e.dead) continue;
      if (e.kind === 'unit') units.push(e);
      else if (e.kind === 'building') buildings.push(e);
    }
    return { units, buildings };
  }
}
