// Mundo: armazena entidades (unidades, edifícios, recursos) e a grade de bloqueios.
import { BUILDINGS, NODES, UNITS } from './config.js';

export function defOf(e) {
  if (e.kind === 'unit') return UNITS[e.type];
  if (e.kind === 'building') return BUILDINGS[e.type];
  return NODES[e.type];
}

// Retângulo ocupado por um edifício ou recurso (x, y = canto superior esquerdo).
export function rectOf(e) {
  const d = defOf(e);
  return { x: e.x, y: e.y, w: d.w, h: d.h };
}

export function centerOf(e) {
  if (e.kind === 'unit') return { x: e.x, y: e.y };
  const d = defOf(e);
  return { x: e.x + d.w / 2, y: e.y + d.h / 2 };
}

export function distToRect(px, py, r) {
  const dx = Math.max(r.x - px, 0, px - (r.x + r.w));
  const dy = Math.max(r.y - py, 0, py - (r.y + r.h));
  return Math.hypot(dx, dy);
}

export class World {
  constructor(size, terrain) {
    this.size = size;
    this.terrain = terrain;
    // 1 = bloqueado (água, edifícios, recursos). Unidades não bloqueiam.
    this.blocked = new Uint8Array(size * size);
    for (let i = 0; i < terrain.length; i++) if (terrain[i]) this.blocked[i] = 1;
    this.entities = new Map();
    this.nextId = 1;
    this.scratch = null;
    this.comp = null;
    this.compDirty = true;
  }

  // Rotula cada região de tiles caminháveis conectados (-1 = bloqueado).
  // Pathfinding usa isso para recusar destinos inalcançáveis sem explorar o mapa todo.
  components() {
    if (!this.compDirty) return this.comp;
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
        const next = [];
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

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.size && y < this.size;
  }

  walkable(x, y) {
    return this.inBounds(x, y) && this.blocked[y * this.size + x] === 0;
  }

  add(e) {
    e.id = this.nextId++;
    this.entities.set(e.id, e);
    if (e.kind !== 'unit') this.setFootprint(e, 1);
    return e;
  }

  remove(e) {
    if (!this.entities.has(e.id)) return;
    this.entities.delete(e.id);
    if (e.kind !== 'unit') this.setFootprint(e, 0);
    e.dead = true;
  }

  setFootprint(e, value) {
    this.compDirty = true;
    const d = defOf(e);
    for (let y = e.y; y < e.y + d.h; y++) {
      for (let x = e.x; x < e.x + d.w; x++) this.blocked[y * this.size + x] = value;
    }
  }

  get(id) {
    return this.entities.get(id);
  }
}
