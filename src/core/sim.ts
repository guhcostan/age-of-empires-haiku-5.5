// Simulação do jogo: economia, idades, técnicas, comandos, coleta, construção, treino, combate e névoa.
// Não depende de DOM nem de three.js, então roda em testes no Node.
import { World, defOf, rectOf, centerOf, distToRect } from './world.ts';
import { findPath } from './pathfind.ts';
import {
  UNITS, BUILDINGS, NODES, TECHS, AGE_NAMES, START_RESOURCES, START_VILLAGERS, CIV_BUILDING_COST, CIV_TRAINS, SACRED,
  CARRY_CAPACITY, MAX_POP, MAX_QUEUE, DIFFICULTY,
} from './config.ts';
import type {
  AgeNumber,
  BuildingEntity,
  BuildingType,
  Command,
  Cost,
  Entity,
  GameEvent,
  GameMap,
  GameOver,
  Goal,
  MessageLevel,
  NextAge,
  NodeEntity,
  NodeType,
  Order,
  Player,
  PlayerConfig,
  PlaceOutcome,
  Point,
  Rect,
  ResearchJob,
  Resume,
  ResourceName,
  Outcome,
  SmartTarget,
  TechDef,
  TechId,
  UnitEntity,
  UnitType,
} from '../types.ts';

const FOG_INTERVAL = 0.25;
const SEPARATION_RADIUS = 0.42;
const UNIT_RADIUS = 0.3;
const ATTACK_WARNING_COOLDOWN = 12;

// Resultados de recusa e de sucesso. `reason` só existe na recusa.
const fail = (reason: string) => ({ ok: false as const, reason });
const succeed = () => ({ ok: true as const });

export interface SimulationOptions {
  map: GameMap;
  players: PlayerConfig[];
  humanIndex?: number;
  // Vitória por maravilha ativa (desligada por padrão).
  wonderVictory?: boolean;
  // Vitória por locais sagrados ativa (desligada por padrão).
  sacredVictory?: boolean;
  // Vitória por marcos ativa (desligada por padrão).
  landmarkVictory?: boolean;
}

// Tempo que a maravilha precisa ficar de pé para dar a vitória. Valor provisório: a SPEC marca como incerto (30 min).
export const WONDER_COUNTDOWN = 1800;

// Maravilhas de todas as civilizações (vitória por maravilha).
const WONDERS = new Set<BuildingType>(['cathedral', 'notreDame']);

// Até onde procurar um tile livre para nascer uma unidade, contado em anéis ao redor do edifício.
const FREE_RING_MAX = 8;

// Local sagrado: posição no mapa, dono (-1 = neutro) e progresso da captura em segundos.
export interface SacredSite {
  id: number;
  x: number;
  y: number;
  owner: number;
  capture: number;
}

// Entidades vivas, separadas por tipo. Reconstruídas a cada tick em rebuildLists.
export interface EntityLists {
  units: UnitEntity[];
  buildings: BuildingEntity[];
  nodes: NodeEntity[];
}

// Recurso que um aldeão pode coletar: árvore, mina, fruta ou fazenda.
type Source = NodeEntity | BuildingEntity;
// Entidade que pode levar dano (unidade ou edifício; recursos naturais não têm vida).
type Combatant = UnitEntity | BuildingEntity;
// Modo de movimento: `null` anda até o ponto; `attackmove` ataca o que encontrar no caminho.
type OrderMode = 'attackmove' | null;

export class Simulation {
  readonly map: GameMap;
  readonly size: number;
  readonly world: World;
  readonly humanIndex: number;
  readonly players: Player[];
  // 0 inexplorado, 1 explorado, 2 visível (só para o jogador humano).
  readonly fog: Uint8Array;
  time = 0;
  events: GameEvent[] = [];
  gameOver: GameOver | null = null;
  readonly wonderVictory: boolean;
  // Segundos restantes da contagem de cada jogador com maravilha de pé.
  wonderLeft = new Map<number, number>();
  readonly sacredVictory: boolean;
  readonly landmarkVictory: boolean;
  // Jogadores que já tiveram algum marco (a vitória por marcos só vale para quem chegou a ter um).
  landmarkOwners = new Set<number>();
  // Locais sagrados (neutros no início). Criados a partir de SACRED.fractions.
  sacredSites: SacredSite[] = [];
  // Segundos restantes da contagem de cada jogador com todos os locais sagrados.
  sacredLeft = new Map<number, number>();
  fogTimer = 0;
  lists: EntityLists = { units: [], buildings: [], nodes: [] };
  lastWarn = -Infinity;

  constructor({ map, players, humanIndex = 0, wonderVictory = false, sacredVictory = false, landmarkVictory = false }: SimulationOptions) {
    this.wonderVictory = wonderVictory;
    this.landmarkVictory = landmarkVictory;
    this.sacredVictory = sacredVictory;
    this.map = map;
    this.size = map.size;
    this.world = new World(map.size, map.terrain);
    this.humanIndex = humanIndex;
    this.sacredSites = SACRED.fractions.map(([fx, fy], id) => {
      const p = this.findWalkableNear(Math.round(fx * map.size), Math.round(fy * map.size));
      return { id, x: p.x, y: p.y, owner: -1, capture: 0 };
    });
    this.players = players.map((p, index): Player => ({
      index,
      civ: p.civ ?? 'english',
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
    this.fog = new Uint8Array(map.size * map.size);
    this.spawnInitial();
    this.updateFog();
  }

  // ---------- Criação de entidades ----------

  spawnInitial(): void {
    this.map.starts.forEach((s, owner) => {
      const tc = this.spawnBuilding('towncenter', owner, s.x, s.y, true);
      for (const p of this.freeTilesAround(tc, START_VILLAGERS)) {
        this.spawnUnit('villager', owner, p.x, p.y);
      }
    });
    for (const n of this.map.nodes) this.spawnNode(n.type, n.x, n.y);
  }

  spawnUnit(type: UnitType, owner: number, x: number, y: number): UnitEntity {
    const def = UNITS[type];
    return this.world.add<UnitEntity>({
      kind: 'unit', type, owner, x, y,
      hp: def.hp, maxHp: def.hp, lastHitBy: -1,
      order: 'idle', path: null, pi: 0, target: null, dest: null, resume: null,
      cooldown: 0, repath: 0, scanT: 0, gt: 0, phase: null, resKind: null,
      carry: null, inSite: false, moved: false, sx: 0, sy: 0,
      gx: 0, gy: 0, skipId: -1, skipUntil: 0,
    });
  }

  spawnBuilding(type: BuildingType, owner: number, x: number, y: number, built = false): BuildingEntity {
    const def = BUILDINGS[type];
    return this.world.add<BuildingEntity>({
      kind: 'building', type, owner, x, y,
      hp: built ? def.hp : Math.round(def.hp * 0.1), maxHp: def.hp, lastHitBy: -1,
      built, progress: built ? 1 : 0, builders: 0, queue: [], rally: null,
      research: null, cooldown: 0,
    });
  }

  spawnNode(type: NodeType, x: number, y: number): NodeEntity {
    return this.world.add<NodeEntity>({
      kind: 'node', type, owner: -1, x, y, amount: NODES[type].amount, lastHitBy: -1,
    });
  }

  // Tiles caminháveis em anéis crescentes ao redor de um edifício/unidade, sem unidades em cima.
  // Só valem tiles da região aberta do mapa: se os edifícios cercam o centro da vila, o aldeão nasce
  // do lado de fora em vez de ficar preso num bolsão (o bot já ficou sem coletar por isso).
  freeTilesAround(e: Entity, count: number): Point[] {
    const r: Rect = e.kind === 'unit'
      ? { x: Math.floor(e.x), y: Math.floor(e.y), w: 1, h: 1 }
      : rectOf(e);
    const occupied = new Set<string>();
    for (const u of this.world.entities.values()) {
      if (u.kind === 'unit' && !u.dead) occupied.add(`${Math.floor(u.x)},${Math.floor(u.y)}`);
    }
    const comp = this.world.components();
    const open = this.openRegion(comp);
    const n = this.world.size;
    const out: Point[] = [];
    for (let d = 1; d <= FREE_RING_MAX && out.length < count; d++) {
      const x0 = r.x - d;
      const x1 = r.x + r.w - 1 + d;
      const y0 = r.y - d;
      const y1 = r.y + r.h - 1 + d;
      for (let y = y0; y <= y1 && out.length < count; y++) {
        for (let x = x0; x <= x1 && out.length < count; x++) {
          if (x > x0 && x < x1 && y > y0 && y < y1) continue; // interior: o próprio edifício/unidade
          if (!this.world.walkable(x, y) || occupied.has(`${x},${y}`)) continue;
          if (comp[y * n + x] !== open) continue;
          out.push({ x: x + 0.5, y: y + 0.5 });
        }
      }
    }
    if (out.length === 0) {
      const c = centerOf(e);
      out.push({ x: c.x, y: c.y });
    }
    return out;
  }

  // Rótulo da maior região caminhável (-1 se não houver nenhuma).
  openRegion(comp: Int32Array): number {
    const sizes = new Map<number, number>();
    let best = -1;
    let bestSize = 0;
    for (const c of comp) {
      if (c < 0) continue;
      const size = (sizes.get(c) ?? 0) + 1;
      sizes.set(c, size);
      if (size > bestSize) { best = c; bestSize = size; }
    }
    return best;
  }

  // ---------- Consultas ----------

  player(owner: number): Player {
    return this.players[owner];
  }

  canAfford(owner: number, cost: Cost): boolean {
    const res = this.players[owner].res;
    return costEntries(cost).every(([k, v]) => res[k] >= v);
  }

  spend(owner: number, cost: Cost): void {
    const res = this.players[owner].res;
    for (const [k, v] of costEntries(cost)) res[k] -= v;
  }

  // Multiplicador de coleta do dono para um recurso (técnicas somam).
  gatherBonus(owner: number, res: ResourceName): number {
    let bonus = 1;
    for (const id of techIdsOf(this.players[owner])) {
      bonus += TECHS[id].effect.gather?.[res] ?? 0;
    }
    return bonus;
  }

  attackBonus(owner: number): number {
    let bonus = 1;
    for (const id of techIdsOf(this.players[owner])) {
      bonus += TECHS[id].effect.attack ?? 0;
    }
    return bonus;
  }

  popUsed(owner: number): number {
    let n = 0;
    for (const e of this.world.entities.values()) {
      if (e.owner !== owner || e.dead) continue;
      if (e.kind === 'unit') n++;
      else if (e.kind === 'building' && e.built) n += e.queue.length;
    }
    return n;
  }

  popCap(owner: number): number {
    let cap = 0;
    for (const e of this.world.entities.values()) {
      if (e.kind === 'building' && e.owner === owner && e.built) cap += BUILDINGS[e.type].pop || 0;
    }
    return Math.min(MAX_POP, cap);
  }

  gatherersOf(id: number): number {
    let n = 0;
    for (const u of this.lists.units) if (u.order === 'gather' && u.target === id && !u.dead) n++;
    return n;
  }

  // Coleta: encontra o recurso mais próximo de (x, y) que o dono consegue usar.
  // `res` null nunca casa com nada (é o caso de um aldeão que perdeu o tipo de recurso).
  findSource(owner: number, x: number, y: number, res: ResourceName | null): Source | null {
    let best: Source | null = null;
    let bestD = Infinity;
    for (const n of this.lists.nodes) {
      if (n.dead || n.amount <= 0 || NODES[n.type].resource !== res) continue;
      const c = centerOf(n);
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < bestD) { best = n; bestD = d; }
    }
    for (const b of this.lists.buildings) {
      if (b.dead || b.owner !== owner || !b.built || BUILDINGS[b.type].gather !== res) continue;
      // Só fazendas têm limite de coletores; sem limite definido, nunca lota.
      if (this.gatherersOf(b.id) >= (BUILDINGS[b.type].maxGatherers ?? Infinity)) continue;
      const c = centerOf(b);
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < bestD) { best = b; bestD = d; }
    }
    return best;
  }

  nearestDropoff(owner: number, x: number, y: number, res: ResourceName): BuildingEntity | null {
    let best: BuildingEntity | null = null;
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
  checkPlacement(type: BuildingType, x: number, y: number): string | null {
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
    if (this.trapsUnits(type, x, y)) return 'Bloquearia a saída de uma unidade';
    return null;
  }

  // Um edifício não pode fechar a saída de uma unidade que hoje está na região aberta do mapa (regra provisória).
  // Simula o bloqueio do terreno, mede as regiões caminháveis e desfaz.
  trapsUnits(type: BuildingType, x: number, y: number): boolean {
    const def = BUILDINGS[type];
    const n = this.size;
    const units = [...this.world.entities.values()].filter((e): e is UnitEntity => e.kind === 'unit' && !e.dead);
    if (units.length === 0) return false;
    const before = this.world.components();
    const open = this.openRegion(before);
    const tiles = units.map((u) => Math.floor(u.y) * n + Math.floor(u.x)).filter((k) => before[k] === open);
    if (tiles.length === 0) return false;
    const idxs: number[] = [];
    for (let j = y; j < y + def.h; j++) for (let i = x; i < x + def.w; i++) idxs.push(j * n + i);
    const saved = idxs.map((k) => this.world.blocked[k]);
    for (const k of idxs) this.world.blocked[k] = 1;
    this.world.compDirty = true;
    const after = this.world.components();
    const openAfter = this.openRegion(after);
    const trapped = tiles.some((k) => after[k] !== openAfter);
    idxs.forEach((k, i) => { this.world.blocked[k] = saved[i]; });
    this.world.compDirty = true;
    return trapped;
  }

  // ---------- Comandos (usados pelo jogador e pelos bots) ----------

  placeBuilding(owner: number, type: BuildingType, x: number, y: number): PlaceOutcome {
    if (type === 'towncenter' || !BUILDINGS[type]) return fail('Não é possível construir isso');
    if (BUILDINGS[type].age > this.players[owner].age) return fail(`Requer ${AGE_NAMES[BUILDINGS[type].age]}`);
    const to = BUILDINGS[type].landmarkFor;
    if (to !== undefined) {
      if (this.players[owner].age >= to) return fail('Esta idade já foi alcançada');
      if (this.hasLandmark(owner, to)) return fail('Já existe um marco desta idade');
    }
    const reason = this.checkPlacement(type, x, y);
    if (reason) return fail(reason);
    const cost = this.buildingCost(owner, type);
    if (!this.canAfford(owner, cost)) return fail('Recursos insuficientes');
    this.spend(owner, cost);
    return { ok: true, building: this.spawnBuilding(type, owner, x, y, false) };
  }

  train(owner: number, id: number, type: UnitType): Outcome {
    const b = this.buildingById(id);
    if (!b || b.dead || b.owner !== owner || !b.built) return fail('Edifício indisponível');
    if (!this.trainsOf(owner, b.type).includes(type)) return fail('Este edifício não treina isso');
    if (UNITS[type].age > this.players[owner].age) return fail(`Requer ${AGE_NAMES[UNITS[type].age]}`);
    if (b.queue.length >= MAX_QUEUE) return fail('Fila cheia');
    const def = UNITS[type];
    if (!this.canAfford(owner, def.cost)) return fail('Recursos insuficientes');
    if (this.popUsed(owner) >= this.popCap(owner)) return fail('População máxima — construa casas');
    this.spend(owner, def.cost);
    b.queue.push({ type, time: def.time, elapsed: 0 });
    return succeed();
  }

  cancelTraining(owner: number, id: number): Outcome {
    const b = this.buildingById(id);
    if (!b || b.dead || b.owner !== owner || b.queue.length === 0) return fail('Nada para cancelar');
    const item = b.queue.pop();
    // Inalcançável: a fila foi conferida acima.
    if (!item) return fail('Nada para cancelar');
    const res = this.players[owner].res;
    for (const [k, v] of costEntries(UNITS[item.type].cost)) res[k] += v;
    return succeed();
  }

  // Avança para a próxima idade no Centro da Vila.
  // Unidades que um edifício treina para este jogador (muda por civilização; ver CIV_TRAINS).
  trainsOf(owner: number, type: BuildingType): readonly UnitType[] {
    return CIV_TRAINS[this.players[owner].civ]?.[type] ?? BUILDINGS[type].trains ?? [];
  }

  // Custo de construção para este jogador (muda por civilização; ver CIV_BUILDING_COST).
  buildingCost(owner: number, type: BuildingType): Cost {
    return CIV_BUILDING_COST[this.players[owner].civ]?.[type] ?? BUILDINGS[type].cost;
  }

  // Marco de idade já construído (ou em obra) para esta idade?
  hasLandmark(owner: number, to: NextAge): boolean {
    for (const e of this.world.entities.values()) {
      if (e.kind !== 'building' || e.owner !== owner || e.dead) continue;
      if (BUILDINGS[e.type].landmarkFor === to) return true;
    }
    return false;
  }

  // Pesquisa uma técnica num edifício que a oferece (uma por vez em cada edifício).
  research(owner: number, id: number, techId: TechId): Outcome {
    const b = this.buildingById(id);
    const tech: TechDef | undefined = TECHS[techId];
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
    return succeed();
  }

  setRally(owner: number, id: number, x: number, y: number, targetId: number | null = null): Outcome {
    const b = this.world.get(id);
    if (!b || b.dead || b.owner !== owner || b.kind !== 'building') return fail('Não é possível definir');
    b.rally = { x, y, target: targetId };
    return succeed();
  }

  // Ordens para um grupo de unidades do mesmo dono.
  command(owner: number, unitIds: number[], cmd: Command): void {
    const units: UnitEntity[] = [];
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
        // Alvo que não é recurso (unidade) não tem o que coletar.
        const t = this.world.get(cmd.target);
        if (!t || t.dead || t.kind === 'unit') return;
        const res = t.kind === 'node' ? NODES[t.type].resource : BUILDINGS[t.type].gather;
        if (!res) return;
        if (t.kind === 'building' && this.gatherersOf(t.id) >= (BUILDINGS[t.type].maxGatherers ?? Infinity)) {
          this.say('Esta fazenda já está lotada', 'warn');
          return;
        }
        for (const u of units) if (UNITS[u.type].civil) this.orderGather(u, t, res);
        break;
      }
      case 'build': {
        // Só edifícios em construção podem receber aldeões para construir.
        const b = this.world.get(cmd.target);
        if (!b || b.kind !== 'building' || b.dead || b.built || b.owner !== owner) return;
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
  smartCommand(owner: number, unitIds: number[], target: SmartTarget): void {
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
    // Sem ponto (entidade sem ação), não há para onde andar.
    if (target.x === undefined || target.y === undefined) return;
    this.command(owner, unitIds, { type: 'move', x: target.x, y: target.y });
  }

  orderMove(u: UnitEntity, x: number, y: number, mode: OrderMode): void {
    const order: Order = mode === 'attackmove' ? 'attackmove' : 'move';
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

  orderGather(u: UnitEntity, src: Source, res: ResourceName): void {
    u.order = 'gather';
    u.target = src.id;
    u.resKind = res;
    u.path = null;
    u.phase = u.carry && u.carry.amt > 0 ? 'toDrop' : 'toRes';
    u.inSite = false;
  }

  startAttack(u: UnitEntity, t: Entity, resume: Resume | null): void {
    u.order = 'attack';
    u.target = t.id;
    u.path = null;
    u.pi = 0;
    u.resume = resume;
    u.repath = 0;
    u.inSite = false;
  }

  setIdle(u: UnitEntity): void {
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

  update(dt: number): void {
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
    this.updateWonders(dt);
    this.updateSacred(dt);
    this.updateLandmarks();
    this.checkDefeats();
  }

  rebuildLists(): void {
    const units: UnitEntity[] = [];
    const buildings: BuildingEntity[] = [];
    const nodes: NodeEntity[] = [];
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

  updateBuilding(b: BuildingEntity, dt: number): void {
    const def = BUILDINGS[b.type];
    if (!b.built) {
      if (b.builders > 0) {
        b.progress += (dt / def.time) * Math.pow(b.builders, 0.7);
        b.hp = Math.max(b.hp, Math.round(def.hp * (0.1 + 0.9 * Math.min(1, b.progress))));
        if (b.progress >= 1) this.completeBuilding(b);
      }
      return;
    }
    const research = b.research;
    if (research) {
      research.elapsed += dt;
      if (research.elapsed >= research.time) this.finishResearch(b, research);
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
  towerFire(b: BuildingEntity, dt: number): void {
    const def = BUILDINGS[b.type];
    // Só torres atiram (são as únicas com ataque, alcance e recarga definidos).
    if (def.attack === undefined || def.range === undefined || def.cooldown === undefined) return;
    // Jogador eliminado (marcos ou conquista) não tem mais torres ativas.
    if (this.players[b.owner]?.defeated) return;
    b.cooldown = Math.max(0, b.cooldown - dt);
    if (b.cooldown > 0) return;
    const c = centerOf(b);
    let best: UnitEntity | null = null;
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

  completeBuilding(b: BuildingEntity): void {
    b.built = true;
    b.progress = 1;
    b.hp = b.maxHp;
    const def = BUILDINGS[b.type];
    this.players[b.owner].stats.built++;
    this.notify(b.owner, `${def.name} concluído`, 'good');
    // Marco concluído: a civilização avança para a idade que ele libera.
    const to = def.landmarkFor;
    if (to !== undefined && this.players[b.owner].age < to) {
      this.players[b.owner].age = to;
      this.notify(b.owner, `${AGE_NAMES[to]} alcançada!`, 'good');
    }
    for (const u of this.lists.units) {
      if (u.order !== 'build' || u.target !== b.id) continue;
      if (def.gather) this.orderGather(u, b, def.gather);
      else this.setIdle(u);
    }
  }

  finishResearch(b: BuildingEntity, job: ResearchJob): void {
    const p = this.players[b.owner];
    const id = job.id;
    p.techs[id] = true;
    p.stats.researched++;
    b.research = null;
    this.notify(b.owner, `${TECHS[id].name} concluída`, 'good');
  }

  finishTraining(b: BuildingEntity, type: UnitType): void {
    const spot = this.freeTilesAround(b, 1)[0];
    const u = this.spawnUnit(type, b.owner, spot.x, spot.y);
    this.players[b.owner].stats.trained++;
    this.notify(b.owner, `${UNITS[type].name} pronto`, 'info');
    const rally = b.rally;
    if (!rally) return;
    const t = rally.target !== null && rally.target !== undefined ? this.world.get(rally.target) : null;
    // Só aldeões coletam; a fonte precisa ser um recurso natural ou uma fazenda com recurso.
    const src = t && !t.dead && UNITS[type].civil && (t.kind === 'node' || t.kind === 'building') ? t : null;
    const res = src ? gatherResourceOf(src) : undefined;
    if (src && res) {
      this.orderGather(u, src, res);
    } else {
      this.orderMove(u, rally.x, rally.y, UNITS[type].civil ? null : 'attackmove');
    }
  }

  updateUnit(u: UnitEntity, dt: number): void {
    u.cooldown = Math.max(0, u.cooldown - dt);
    u.repath -= dt;
    u.moved = false;
    switch (u.order) {
      case 'idle': this.idleBehaviour(u, dt); break;
      case 'move': this.moveBehaviour(u, dt); break;
      case 'attackmove': this.attackMoveBehaviour(u, dt); break;
      case 'attack': this.attackBehaviour(u, dt); break;
      case 'gather': this.gatherBehaviour(u, dt); break;
      case 'build': this.buildBehaviour(u, dt); break;
      default: break;
    }
  }

  idleBehaviour(u: UnitEntity, dt: number): void {
    u.scanT -= dt;
    if (u.scanT > 0) return;
    u.scanT = 0.5;
    const civil = UNITS[u.type].civil;
    const foe = this.findFoe(u, civil ? 2.5 : UNITS[u.type].sight, false);
    if (foe) this.startAttack(u, foe, null);
  }

  moveBehaviour(u: UnitEntity, dt: number): void {
    if (!u.path) {
      const dest = destOf(u);
      const p = findPath(this.world, u.x, u.y, { type: 'tile', x: Math.floor(dest.x), y: Math.floor(dest.y) });
      if (!p || p.length === 0) {
        this.setIdle(u);
        return;
      }
      u.path = p;
      u.pi = 0;
    }
    if (!this.followPath(u, dt)) this.setIdle(u);
  }

  attackMoveBehaviour(u: UnitEntity, dt: number): void {
    u.scanT -= dt;
    if (u.scanT <= 0) {
      u.scanT = 0.4;
      const foe = this.findFoe(u, UNITS[u.type].sight, true);
      if (foe) {
        const dest = destOf(u);
        this.startAttack(u, foe, { order: 'attackmove', dest: { x: dest.x, y: dest.y } });
        return;
      }
    }
    this.moveBehaviour(u, dt);
  }

  attackBehaviour(u: UnitEntity, dt: number): void {
    const t = this.world.get(u.target);
    const def = UNITS[u.type];
    // Aríete não ataca unidades: se o alvo é unidade, desiste.
    if (!t || t.dead || t.kind === 'node' || t.hp <= 0 || (def.siege && t.kind === 'unit')) {
      this.afterTarget(u);
      return;
    }
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
      const goal: Goal = t.kind === 'unit'
        ? { type: 'tile', x: Math.floor(t.x), y: Math.floor(t.y) }
        : { type: 'rect', ...rectOf(t) };
      const p = findPath(this.world, u.x, u.y, goal);
      if (!p) {
        // Alvo inalcançável: ignora por um tempo em vez de tentar de novo a cada tick.
        u.skipId = t.id;
        u.skipUntil = this.time + 6;
        this.afterTarget(u);
        return;
      }
      u.path = p;
      u.pi = 0;
    }
    if (!this.followPath(u, dt)) u.path = null;
  }

  afterTarget(u: UnitEntity): void {
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

  gapTo(u: UnitEntity, t: Combatant): number {
    if (t.kind === 'unit') return Math.hypot(t.x - u.x, t.y - u.y) - UNIT_RADIUS;
    return distToRect(u.x, u.y, rectOf(t));
  }

  strike(u: UnitEntity, t: Combatant): void {
    const def = UNITS[u.type];
    let dmg = def.attack * this.attackBonus(u.owner);
    if (t.kind === 'unit') dmg *= def.bonus?.[t.type] ?? 1;
    // Redução de 0,5 contra prédios: valor sem fonte na SPEC. Aríete usa dano de cerco inteiro.
    if (t.kind === 'building') dmg *= def.siege ? 1 : 0.5;
    t.hp -= dmg;
    t.lastHitBy = u.owner;
    this.events.push({
      type: def.ranged ? 'shot' : 'hit',
      from: { x: u.x, y: u.y },
      to: centerOf(t),
      owner: u.owner,
    });
    if (t.kind === 'unit' && (t.order === 'idle' || t.order === 'attackmove')) {
      let resume: Resume | null = null;
      if (t.order === 'attackmove') {
        const dest = destOf(t);
        resume = { order: 'attackmove', dest: { x: dest.x, y: dest.y } };
      }
      this.startAttack(t, u, resume);
    }
    if (t.owner === this.humanIndex && this.time - this.lastWarn > ATTACK_WARNING_COOLDOWN) {
      this.lastWarn = this.time;
      this.say('Estamos sendo atacados!', 'bad');
    }
  }

  // Coleta: o aldeão anda até o recurso, coleta, entrega e volta ao recurso.
  gatherBehaviour(u: UnitEntity, dt: number): void {
    if (u.phase === 'toDrop') {
      this.deliverBehaviour(u, dt);
      return;
    }
    const src = this.validSource(u.target, u);
    if (!src) {
      if (u.carry && u.carry.amt > 0) {
        u.phase = 'toDrop';
        u.path = null;
        this.deliverBehaviour(u, dt);
        return;
      }
      this.seekSource(u);
      return;
    }
    const gap = distToRect(u.x, u.y, rectOf(src));
    const reach = u.phase === 'chop' ? 1.1 : 0.85;
    if (gap > reach) {
      u.phase = 'toRes';
      if (!u.path || u.pi >= u.path.length) {
        const p = findPath(this.world, u.x, u.y, { type: 'rect', ...rectOf(src) });
        if (!p) {
          this.setIdle(u);
          return;
        }
        if (p.length === 0) {
          u.phase = 'chop';
          u.gt = 0;
          u.path = null;
          return;
        }
        u.path = p;
        u.pi = 0;
      }
      if (!this.followPath(u, dt)) u.path = null;
      return;
    }

    u.phase = 'chop';
    u.path = null;
    const res = gatherResourceOf(src);
    const per = src.kind === 'node' ? NODES[src.type].gatherTime : BUILDINGS[src.type].gatherTime;
    // Invariante: só nós e fazendas chegam aqui; os dois têm recurso e tempo de coleta.
    if (res === undefined || per === undefined) {
      this.setIdle(u);
      return;
    }
    if (!u.carry || u.carry.res !== res) u.carry = { res, amt: 0 };
    u.gt += dt * this.econMult(u.owner) * this.gatherBonus(u.owner, res);
    while (u.gt >= per) {
      u.gt -= per;
      u.carry.amt++;
      if (src.kind === 'node') src.amount--;
      const depleted = src.kind === 'node' && src.amount <= 0;
      if (depleted) this.world.remove(src);
      if (u.carry.amt >= CARRY_CAPACITY || depleted) {
        u.phase = 'toDrop';
        u.gt = 0;
        return;
      }
    }
  }

  deliverBehaviour(u: UnitEntity, dt: number): void {
    if (!u.carry || u.carry.amt <= 0) {
      u.carry = null;
      this.afterDeliver(u);
      return;
    }
    const drop = this.nearestDropoff(u.owner, u.x, u.y, u.carry.res);
    if (!drop) {
      this.setIdle(u);
      return;
    }
    const rect = rectOf(drop);
    if (distToRect(u.x, u.y, rect) <= 0.9) {
      this.depositCarry(u);
      this.afterDeliver(u);
      return;
    }
    if (!u.path || u.pi >= u.path.length) {
      const p = findPath(this.world, u.x, u.y, { type: 'rect', ...rect });
      if (!p) {
        this.setIdle(u);
        return;
      }
      if (p.length === 0) {
        this.depositCarry(u);
        this.afterDeliver(u);
        return;
      }
      u.path = p;
      u.pi = 0;
    }
    if (!this.followPath(u, dt)) u.path = null;
  }

  depositCarry(u: UnitEntity): void {
    const c = u.carry;
    if (!c) return;
    const p = this.players[u.owner];
    p.res[c.res] += c.amt;
    p.stats.gathered[c.res] += c.amt;
    u.carry = null;
  }

  afterDeliver(u: UnitEntity): void {
    u.path = null;
    if (this.validSource(u.target, u)) {
      u.phase = 'toRes';
      return;
    }
    this.seekSource(u);
  }

  validSource(id: number | null, u: UnitEntity): Source | null {
    const e = this.world.get(id);
    if (!e || e.dead) return null;
    if (e.kind === 'node') return e.amount > 0 ? e : null;
    if (e.kind === 'building') return e.built && e.owner === u.owner ? e : null;
    return null;
  }

  seekSource(u: UnitEntity): void {
    const src = this.findSource(u.owner, u.x, u.y, u.resKind);
    if (!src) {
      this.setIdle(u);
      return;
    }
    u.target = src.id;
    u.phase = 'toRes';
    u.path = null;
    u.pi = 0;
  }

  buildBehaviour(u: UnitEntity, dt: number): void {
    const b = this.buildingById(u.target);
    if (!b || b.dead || b.built) {
      this.setIdle(u);
      return;
    }
    const rect = rectOf(b);
    if (distToRect(u.x, u.y, rect) <= 1.0) {
      u.inSite = true;
      u.path = null;
      return;
    }
    u.inSite = false;
    if (!u.path || u.pi >= u.path.length) {
      const p = findPath(this.world, u.x, u.y, { type: 'rect', ...rect });
      if (!p) {
        this.setIdle(u);
        return;
      }
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
  followPath(u: UnitEntity, dt: number): boolean {
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

  findFoe(u: UnitEntity, radius: number, withBuildings: boolean): UnitEntity | BuildingEntity | null {
    let best: UnitEntity | BuildingEntity | null = null;
    let bestD = radius;
    const skipping = (o: Entity): boolean => o.id === u.skipId && this.time < u.skipUntil;
    // Aríete só procura edifícios.
    for (const o of UNITS[u.type].siege ? [] : this.lists.units) {
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
  separateUnits(): void {
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

  resolveDeaths(): void {
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

  // Ponto caminhável mais próximo de (x0, y0), em espiral; usado para posicionar os locais sagrados.
  findWalkableNear(x0: number, y0: number): Point {
    for (let r = 0; r < 20; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const x = x0 + dx;
          const y = y0 + dy;
          if (this.world.inBounds(x, y) && this.world.walkable(x, y)) return { x: x + 0.5, y: y + 0.5 };
        }
      }
    }
    return { x: x0 + 0.5, y: y0 + 0.5 };
  }

  // Locais sagrados: captura por presença exclusiva; ouro por local; contagem de vitória (ver SACRED).
  updateSacred(dt: number): void {
    if (!this.sacredVictory || this.gameOver) return;
    const r2 = SACRED.radius * SACRED.radius;
    const near = (u: UnitEntity, site: SacredSite): boolean => (u.x - site.x) ** 2 + (u.y - site.y) ** 2 <= r2;
    for (const site of this.sacredSites) {
      const present = new Set<number>();
      for (const u of this.lists.units) {
        if (!u.dead && u.owner >= 0 && near(u, site)) present.add(u.owner);
      }
      const [only] = present;
      if (present.size === 1 && only !== site.owner) {
        site.capture += dt;
        if (site.capture >= SACRED.captureTime) {
          site.owner = only;
          site.capture = 0;
          this.notify(only, 'Local sagrado capturado', 'good');
        }
      } else {
        site.capture = 0;
      }
      if (site.owner >= 0) this.players[site.owner].res.gold += (SACRED.goldPerMinute / 60) * dt;
    }
    // Vitória: um jogador com todos os locais, sem inimigo dentro de nenhum, por toda a contagem.
    const holders = new Set(this.sacredSites.map((x) => x.owner));
    const [holder] = holders;
    if (holders.size !== 1 || holder < 0) {
      this.sacredLeft.clear();
      return;
    }
    const contested = this.sacredSites.some((site) => this.lists.units.some(
      (u) => !u.dead && u.owner >= 0 && u.owner !== holder && near(u, site),
    ));
    if (contested) return;
    const left = (this.sacredLeft.get(holder) ?? SACRED.countdown) - dt;
    if (left <= 0) {
      this.gameOver = { result: holder === this.humanIndex ? 'victory' : 'defeat', reason: 'sacred', time: this.time };
      return;
    }
    this.sacredLeft.set(holder, left);
  }

  // Vitória por marcos (SPEC §8, fonte única; provisório): quem já teve marco e perde todos os marcos é eliminado.
  updateLandmarks(): void {
    if (!this.landmarkVictory || this.gameOver) return;
    const alive = new Map<number, number>();
    for (const b of this.lists.buildings) {
      if (b.dead || BUILDINGS[b.type].landmarkFor === undefined) continue;
      this.landmarkOwners.add(b.owner);
      alive.set(b.owner, (alive.get(b.owner) ?? 0) + 1);
    }
    for (const p of this.players) {
      if (p.defeated || !this.landmarkOwners.has(p.index) || (alive.get(p.index) ?? 0) > 0) continue;
      p.defeated = true;
      for (const e of [...this.world.entities.values()]) {
        if (e.owner === p.index && e.kind === 'unit') this.world.remove(e);
      }
      if (p.index !== this.humanIndex) this.say(`${p.name} perderam os marcos!`, 'good');
    }
    const human = this.players[this.humanIndex];
    const opponents = this.players.filter((p) => p.index !== this.humanIndex);
    if (human.defeated) {
      this.gameOver = { result: 'defeat', reason: 'landmarks', time: this.time };
    } else if (opponents.length > 0 && opponents.every((p) => p.defeated)) {
      this.gameOver = { result: 'victory', reason: 'landmarks', time: this.time };
    }
  }

  // Vitória por maravilha: a maravilha precisa ficar de pé pela contagem inteira; se cair, a contagem zera.
  updateWonders(dt: number): void {
    if (!this.wonderVictory || this.gameOver) return;
    for (const p of this.players) {
      if (p.defeated) continue;
      const standing = this.lists.buildings.some((b) => b.owner === p.index && WONDERS.has(b.type) && b.built && !b.dead);
      if (!standing) {
        this.wonderLeft.delete(p.index);
        continue;
      }
      const left = (this.wonderLeft.get(p.index) ?? WONDER_COUNTDOWN) - dt;
      if (left <= 0) {
        this.gameOver = { result: p.index === this.humanIndex ? 'victory' : 'defeat', reason: 'wonder', time: this.time };
        return;
      }
      this.wonderLeft.set(p.index, left);
    }
  }

  checkDefeats(): void {
    const hasBuilding = new Set<number>();
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
    // Se outra regra (marcos, maravilha, locais) já encerrou a partida neste passo, ela é a causa.
    if (this.gameOver) return;
    if (human.defeated) {
      this.gameOver = { result: 'defeat', reason: 'conquest', time: this.time };
    } else if (opponents.length > 0 && opponents.every((p) => p.defeated)) {
      this.gameOver = { result: 'victory', reason: 'conquest', time: this.time };
    }
  }

  // ---------- Névoa de guerra (só para o jogador humano) ----------

  updateFog(): void {
    const size = this.size;
    const fog = this.fog;
    for (let i = 0; i < fog.length; i++) if (fog[i] === 2) fog[i] = 1;
    for (const e of this.world.entities.values()) {
      // Recursos naturais são neutros (owner -1), então nunca enxergam.
      if (e.owner !== this.humanIndex || e.dead || e.kind === 'node') continue;
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
  canSee(e: Entity): boolean {
    if (e.owner === this.humanIndex) return true;
    if (e.kind === 'unit') {
      return this.fog[Math.floor(e.y) * this.size + Math.floor(e.x)] === 2;
    }
    const c = centerOf(e);
    return this.fog[Math.floor(c.y) * this.size + Math.floor(c.x)] >= 1;
  }

  // ---------- Economia auxiliar, mensagens e eventos ----------

  econMult(owner: number): number {
    const p = this.players[owner];
    return p.isBot ? DIFFICULTY[p.difficulty].gather : 1;
  }

  say(text: string, level: MessageLevel = 'info'): void {
    this.events.push({ type: 'msg', text, level });
  }

  notify(owner: number, text: string, level: MessageLevel = 'info'): void {
    if (owner === this.humanIndex) this.say(text, level);
  }

  drainEvents(): GameEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  // Entidades do jogador para a UI e a IA.
  entitiesOf(owner: number): { units: UnitEntity[]; buildings: BuildingEntity[] } {
    const units: UnitEntity[] = [];
    const buildings: BuildingEntity[] = [];
    for (const e of this.world.entities.values()) {
      if (e.owner !== owner || e.dead) continue;
      if (e.kind === 'unit') units.push(e);
      else if (e.kind === 'building') buildings.push(e);
    }
    return { units, buildings };
  }

  // Edifício vivo pelo id (null se o id for de outro tipo de entidade ou não existir).
  buildingById(id: number | null | undefined): BuildingEntity | undefined {
    const e = this.world.get(id);
    return e?.kind === 'building' ? e : undefined;
  }
}

// ---------- Auxiliares de tipo (sem alterar a lógica) ----------

// Object.entries perde o tipo das chaves; as chaves vêm das tabelas de custo, só com recursos válidos.
function costEntries(cost: Cost): [ResourceName, number][] {
  return Object.entries(cost) as [ResourceName, number][];
}

// As chaves de `techs` só recebem ids de TECHS (ver finishResearch).
function techIdsOf(p: Player): TechId[] {
  return Object.keys(p.techs) as TechId[];
}

// Ordens move/attackmove sempre têm destino: orderMove e afterTarget definem os dois juntos.
function destOf(u: UnitEntity): Point {
  if (!u.dest) throw new Error(`Unidade ${u.id} sem destino na ordem ${u.order}`);
  return u.dest;
}

// Próxima idade a alcançar, ou null na última (Imperial).
export function nextAgeOf(age: AgeNumber): NextAge | null {
  return age === 1 ? 2 : age === 2 ? 3 : age === 3 ? 4 : null;
}

// Recurso coletável de um recurso natural ou de um edifício (fazenda); undefined se não há.
function gatherResourceOf(e: NodeEntity | BuildingEntity): ResourceName | undefined {
  return e.kind === 'node' ? NODES[e.type].resource : BUILDINGS[e.type].gather;
}
