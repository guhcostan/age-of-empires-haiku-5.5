// Mundo: armazena entidades (unidades, edifícios, recursos) e a grade de bloqueios.
import { BUILDINGS, NODES, UNITS } from './config.ts';
import type {
  BuildingDef,
  BuildingEntity,
  Entity,
  NodeDef,
  NodeEntity,
  Point,
  Rect,
  UnitDef,
  UnitEntity,
} from '../types.ts';

// Estado reaproveitado pelo A* entre chamadas (evita alocar a cada caminho).
export interface PathScratch {
  stamp: number;
  seen: Uint32Array;
  closed: Uint32Array;
  g: Float64Array;
  parent: Int32Array;
}

// Definição de dados de uma entidade (sobrecargas pelo tipo para o compilador saber os campos).
export function defOf(e: UnitEntity): UnitDef;
export function defOf(e: BuildingEntity): BuildingDef;
export function defOf(e: NodeEntity): NodeDef;
export function defOf(e: BuildingEntity | NodeEntity): BuildingDef | NodeDef;
export function defOf(e: UnitEntity | BuildingEntity): UnitDef | BuildingDef;
export function defOf(e: Entity): UnitDef | BuildingDef | NodeDef;
export function defOf(e: Entity): UnitDef | BuildingDef | NodeDef {
  if (e.kind === 'unit') return UNITS[e.type];
  if (e.kind === 'building') return BUILDINGS[e.type];
  return NODES[e.type];
}

// Retângulo ocupado por um edifício ou recurso (x, y = canto superior esquerdo).
export function rectOf(e: BuildingEntity | NodeEntity): Rect {
  const d = defOf(e);
  return { x: e.x, y: e.y, w: d.w, h: d.h };
}

export function centerOf(e: Entity): Point {
  if (e.kind === 'unit') return { x: e.x, y: e.y };
  const d = defOf(e);
  return { x: e.x + d.w / 2, y: e.y + d.h / 2 };
}

export function distToRect(px: number, py: number, r: Rect): number {
  const dx = Math.max(r.x - px, 0, px - (r.x + r.w));
  const dy = Math.max(r.y - py, 0, py - (r.y + r.h));
  return Math.hypot(dx, dy);
}

export class World {
  readonly size: number;
  readonly terrain: Uint8Array;
  // 1 = bloqueado (água, edifícios, recursos). Unidades não bloqueiam.
  readonly blocked: Uint8Array;
  readonly entities = new Map<number, Entity>();
  nextId = 1;
  scratch: PathScratch | null = null;
  // Região conectada de cada tile (-1 = bloqueado), recalculada só quando o terreno muda.
  comp: Int32Array | null = null;
  compDirty = true;

  constructor(size: number, terrain: Uint8Array) {
    this.size = size;
    this.terrain = terrain;
    this.blocked = new Uint8Array(size * size);
    for (let i = 0; i < terrain.length; i++) if (terrain[i]) this.blocked[i] = 1;
  }

  // Rotula cada região de tiles caminháveis conectados (-1 = bloqueado).
  // Pathfinding usa isso para recusar destinos inalcançáveis sem explorar o mapa todo.
  components(): Int32Array {
    if (!this.compDirty && this.comp) return this.comp;
    const n = this.size;
    const comp = new Int32Array(n * n).fill(-1);
    const stack = new Int32Array(n * n);
    let label = 0;
    for (let s = 0; s < n * n; s++) {
      if (this.blocked[s] || comp[s] !== -1) continue;
      let top = 0;
      comp[s] = label;
      stack[top++] = s;
      while (top > 0) {
        const k = stack[--top];
        const x = k % n;
        const y = (k - x) / n;
        const next: number[] = [];
        if (x > 0) next.push(k - 1);
        if (x < n - 1) next.push(k + 1);
        if (y > 0) next.push(k - n);
        if (y < n - 1) next.push(k + n);
        for (const v of next) {
          if (!this.blocked[v] && comp[v] === -1) {
            comp[v] = label;
            stack[top++] = v;
          }
        }
      }
      label++;
    }
    this.comp = comp;
    this.compDirty = false;
    return comp;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.size && y < this.size;
  }

  walkable(x: number, y: number): boolean {
    return this.inBounds(x, y) && this.blocked[y * this.size + x] === 0;
  }

  // Adiciona uma entidade, atribui o id e (se não for unidade) marca o terreno como ocupado.
  // Devolve o próprio objeto recebido, que passa a ser a entidade guardada no mundo.
  add<E extends Entity>(entity: Omit<E, 'id'>): E {
    // O id é atribuído logo abaixo, antes de qualquer leitura.
    const e = entity as E;
    e.id = this.nextId++;
    this.entities.set(e.id, e);
    if (e.kind !== 'unit') this.setFootprint(e, 1);
    return e;
  }

  remove(e: Entity): void {
    if (!this.entities.has(e.id)) return;
    this.entities.delete(e.id);
    if (e.kind !== 'unit') this.setFootprint(e, 0);
    e.dead = true;
  }

  setFootprint(e: BuildingEntity | NodeEntity, value: 0 | 1): void {
    this.compDirty = true;
    const d = defOf(e);
    for (let y = e.y; y < e.y + d.h; y++) {
      for (let x = e.x; x < e.x + d.w; x++) this.blocked[y * this.size + x] = value;
    }
  }

  // Aceita null/undefined porque campos de alvo podem estar vazios (ex.: target de unidade ociosa).
  get(id: number | null | undefined): Entity | undefined {
    if (id === null || id === undefined) return undefined;
    return this.entities.get(id);
  }
}
