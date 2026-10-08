// Geração procedural de mapas: terreno, lagos, florestas e recursos iniciais.
import { createRng } from './rng.ts';
import type { Rng } from './rng.ts';
import { createNoise } from './noise.ts';
import { NODES, BUILDINGS } from './config.ts';
import type { GameMap, MapNodeSpawn, NodeType, Point } from '../types.ts';

export const GRASS = 0;
export const WATER = 1;

const MAX_ATTEMPTS = 30;
const TC = BUILDINGS.towncenter;

export interface MapOptions {
  size: number;
  playerCount: number;
  seed: number;
}

export function generateMap({ size, playerCount, seed }: MapOptions): GameMap {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const map = buildCandidate(size, playerCount, (seed + attempt * 7919) >>> 0);
    if (map) return map;
  }
  throw new Error('Não foi possível gerar um mapa jogável com esta semente.');
}

// Uma tentativa de mapa. Devolve null se alguma base ficou isolada do resto do mapa.
function buildCandidate(size: number, playerCount: number, seed: number): GameMap | null {
  const rng = createRng(seed);
  const terrainNoise = createNoise(rng);
  const forestNoise = createNoise(rng);
  const heightNoise = createNoise(rng);
  const tintNoise = createNoise(rng);

  const starts = pickStarts(size, playerCount, rng);
  const centers = starts.map((s) => ({ x: s.x + TC.w / 2, y: s.y + TC.h / 2 }));
  const distToBase = (x: number, y: number): number => {
    let best = Infinity;
    for (const c of centers) best = Math.min(best, Math.hypot(x - c.x, y - c.y));
    return best;
  };

  const terrain = new Uint8Array(size * size);
  const tint = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      tint[i] = tintNoise.fbm(x * 0.25, y * 0.25, 3);
      if (distToBase(x + 0.5, y + 0.5) > 13 && terrainNoise.fbm(x * 0.07, y * 0.07, 4) > 0.64) {
        terrain[i] = WATER;
      }
    }
  }

  // Altura dos vértices (size+1)². Perto das bases o terreno fica plano.
  const vs = size + 1;
  const heights = new Float32Array(vs * vs);
  for (let vy = 0; vy < vs; vy++) {
    for (let vx = 0; vx < vs; vx++) {
      const flat = Math.min(1, Math.max(0, (distToBase(vx, vy) - 7) / 6));
      let h = (heightNoise.fbm(vx * 0.05, vy * 0.05, 4) - 0.5) * 3.2 * flat;
      let water = 0;
      for (const [tx, ty] of [[vx - 1, vy - 1], [vx, vy - 1], [vx - 1, vy], [vx, vy]]) {
        if (tx >= 0 && ty >= 0 && tx < size && ty < size && terrain[ty * size + tx] === WATER) water++;
      }
      if (water === 4) h = -0.8;
      else if (water > 0) h = Math.min(h, -0.25);
      heights[vy * vs + vx] = h;
    }
  }

  // Ocupação de recursos e zonas reservadas (bases ficam livres para construir).
  const occupied = new Uint8Array(size * size);
  const reserved = new Uint8Array(size * size);
  for (const s of starts) markRect(reserved, size, s.x - 2, s.y - 2, TC.w + 4, TC.h + 4);

  const nodes: MapNodeSpawn[] = [];
  const canPlace = (x: number, y: number, w: number, h: number): boolean => {
    for (let j = y; j < y + h; j++) {
      for (let i = x; i < x + w; i++) {
        if (i < 0 || j < 0 || i >= size || j >= size) return false;
        const k = j * size + i;
        if (terrain[k] !== GRASS || occupied[k] || reserved[k]) return false;
      }
    }
    return true;
  };
  const place = (type: NodeType, x: number, y: number): boolean => {
    const def = NODES[type];
    if (!canPlace(x, y, def.w, def.h)) return false;
    markRect(occupied, size, x, y, def.w, def.h);
    nodes.push({ type, x, y });
    return true;
  };
  // Tenta posicionar um recurso em um ângulo/distância perto de um ponto.
  const placeAround = (
    type: NodeType,
    cx: number,
    cy: number,
    angle: number,
    rMin: number,
    rMax: number,
    tries: number,
  ): boolean => {
    for (let t = 0; t < tries; t++) {
      const a = angle + rng.float(-0.6, 0.6);
      const r = rng.float(rMin, rMax);
      if (place(type, Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r))) return true;
    }
    return false;
  };

  for (const s of starts) {
    const cx = s.x + TC.w / 2;
    const cy = s.y + TC.h / 2;
    const toCenter = Math.atan2(size / 2 - cy, size / 2 - cx);
    const woodAngle = toCenter + (rng.next() < 0.5 ? 1 : -1) * rng.float(0.9, 1.4);

    // Bosque de início ao lado da base.
    const wx = cx + Math.cos(woodAngle) * 8;
    const wy = cy + Math.sin(woodAngle) * 8;
    for (let k = 0; k < 24; k++) {
      place('tree', Math.round(wx + rng.float(-3, 3)), Math.round(wy + rng.float(-3, 3)));
    }
    // Frutas silvestres e minas perto da base.
    for (let k = 0; k < 5; k++) placeAround('berry', cx, cy, toCenter, 5, 6.5, 6);
    placeAround('gold', cx, cy, toCenter - 1.5, 9, 11, 12);
    placeAround('stone', cx, cy, toCenter + 1.5, 9, 11, 12);
  }

  // Minas neutras espalhadas pelo mapa.
  for (let k = 0; k < 2 + playerCount; k++) {
    const type: NodeType = k % 2 === 0 ? 'gold' : 'stone';
    for (let t = 0; t < 40; t++) {
      const x = rng.int(4, size - 6);
      const y = rng.int(4, size - 6);
      if (distToBase(x, y) > 14 && place(type, x, y)) break;
    }
  }

  // Relíquias (provisórias): posições fixas como frações do mapa, sem usar o gerador aleatório, para não mudar o mapa
  // das sementes já existentes. Pulam posições perto das bases ou bloqueadas.
  for (const [fx, fy] of [[0.25, 0.25], [0.75, 0.75], [0.25, 0.75], [0.75, 0.25]]) {
    const x = Math.round(size * fx);
    const y = Math.round(size * fy);
    if (distToBase(x, y) > 14) place('relic', x, y);
  }

  // Florestas: clusters de árvores vindos de ruído.
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const k = y * size + x;
      if (terrain[k] !== GRASS || occupied[k] || reserved[k]) continue;
      const f = forestNoise.fbm(x * 0.08, y * 0.08, 3);
      let p = f > 0.6 ? 0.7 : f > 0.5 ? 0.12 : 0.01;
      if (distToBase(x + 0.5, y + 0.5) < 10) p *= 0.3;
      if (rng.next() < p) place('tree', x, y);
    }
  }

  // Conectividade: todas as bases precisam alcançar o resto do mapa.
  const walk = new Uint8Array(size * size);
  const footprintBlocked = new Uint8Array(size * size);
  for (const s of starts) markRect(footprintBlocked, size, s.x, s.y, TC.w, TC.h);
  for (let k = 0; k < walk.length; k++) {
    walk[k] = terrain[k] === GRASS && !occupied[k] && !footprintBlocked[k] ? 1 : 0;
  }
  const reached = floodFrom(size, walk, ringTiles(starts[0].x, starts[0].y, TC.w, TC.h, size));
  for (const s of starts) {
    const ring = ringTiles(s.x, s.y, TC.w, TC.h, size);
    if (!ring.some((k) => reached[k])) return null;
  }

  // Remove recursos que ficaram isolados (não há como alcançá-los).
  const keptNodes = nodes.filter((n) => {
    const def = NODES[n.type];
    return ringTiles(n.x, n.y, def.w, def.h, size).some((k) => reached[k]);
  });

  return { size, seed, terrain, tint, heights, nodes: keptNodes, starts };
}

function pickStarts(size: number, count: number, rng: Rng): Point[] {
  const c = size / 2;
  const r = size * 0.32;
  const a0 = rng.next() * Math.PI * 2;
  const out: Point[] = [];
  for (let k = 0; k < count; k++) {
    const a = a0 + (k * Math.PI * 2) / count;
    const x = Math.round(c + Math.cos(a) * r - TC.w / 2);
    const y = Math.round(c + Math.sin(a) * r - TC.h / 2);
    out.push({
      x: Math.min(Math.max(x, 4), size - TC.w - 4),
      y: Math.min(Math.max(y, 4), size - TC.h - 4),
    });
  }
  return out;
}

function markRect(arr: Uint8Array, size: number, x: number, y: number, w: number, h: number): void {
  for (let j = Math.max(0, y); j < Math.min(size, y + h); j++) {
    for (let i = Math.max(0, x); i < Math.min(size, x + w); i++) arr[j * size + i] = 1;
  }
}

// Tiles encostados (8 direções, sem o interior) de um retângulo.
function ringTiles(x: number, y: number, w: number, h: number, size: number): number[] {
  const out: number[] = [];
  for (let j = y - 1; j <= y + h; j++) {
    for (let i = x - 1; i <= x + w; i++) {
      if (i < 0 || j < 0 || i >= size || j >= size) continue;
      if (i >= x && i < x + w && j >= y && j < y + h) continue;
      out.push(j * size + i);
    }
  }
  return out;
}

// Flood fill em 4 direções a partir dos tiles de início que são caminháveis.
function floodFrom(size: number, walk: Uint8Array, seeds: number[]): Uint8Array {
  const reached = new Uint8Array(size * size);
  const queue: number[] = [];
  for (const k of seeds) {
    if (walk[k] && !reached[k]) {
      reached[k] = 1;
      queue.push(k);
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const k = queue[head];
    const x = k % size;
    const y = (k - x) / size;
    const neighbours: number[] = [];
    if (x > 0) neighbours.push(k - 1);
    if (x < size - 1) neighbours.push(k + 1);
    if (y > 0) neighbours.push(k - size);
    if (y < size - 1) neighbours.push(k + size);
    for (const n of neighbours) {
      if (walk[n] && !reached[n]) {
        reached[n] = 1;
        queue.push(n);
      }
    }
  }
  return reached;
}
