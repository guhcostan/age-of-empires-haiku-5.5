// A* em grade com 8 direções. Alvos podem ser um tile ou um retângulo
// (prédio/recurso), caso em que qualquer tile livre encostado nele serve.
const SQRT2 = Math.SQRT2;
const DIRS = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, SQRT2], [1, -1, SQRT2], [-1, 1, SQRT2], [-1, -1, SQRT2],
];

class MinHeap {
  constructor() {
    this.k = [];
    this.v = [];
  }

  get size() {
    return this.k.length;
  }

  push(key, val) {
    const k = this.k;
    const v = this.v;
    let i = k.length;
    k.push(key);
    v.push(val);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= key) break;
      k[i] = k[p];
      v[i] = v[p];
      i = p;
    }
    k[i] = key;
    v[i] = val;
  }

  pop() {
    const k = this.k;
    const v = this.v;
    const top = v[0];
    const lastK = k.pop();
    const lastV = v.pop();
    const n = k.length;
    if (n > 0) {
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= n) break;
        if (c + 1 < n && k[c + 1] < k[c]) c++;
        if (k[c] >= lastK) break;
        k[i] = k[c];
        v[i] = v[c];
        i = c;
      }
      k[i] = lastK;
      v[i] = lastV;
    }
    return top;
  }
}

function scratchFor(world) {
  const n = world.size * world.size;
  if (!world.scratch) {
    world.scratch = {
      stamp: 0,
      seen: new Uint32Array(n),
      closed: new Uint32Array(n),
      g: new Float64Array(n),
      parent: new Int32Array(n),
    };
  }
  return world.scratch;
}

function octile(dx, dy) {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  return Math.max(ax, ay) + (SQRT2 - 1) * Math.min(ax, ay);
}

function isGoal(target, x, y) {
  if (target.type === 'tile') return x === target.x && y === target.y;
  const r = target;
  const inside = x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
  return !inside && x >= r.x - 1 && x <= r.x + r.w && y >= r.y - 1 && y <= r.y + r.h;
}

function heuristic(target, x, y) {
  if (target.type === 'tile') return octile(target.x - x, target.y - y);
  const px = Math.min(Math.max(x, target.x), target.x + target.w - 1);
  const py = Math.min(Math.max(y, target.y), target.y + target.h - 1);
  return octile(px - x, py - y);
}

// Tile caminhável mais próximo de (x, y) dentro da região `label` (ou qualquer região se label < 0).
function nearestWalkable(world, x, y, radius, label = -1) {
  const comp = world.components();
  const n = world.size;
  for (let r = 0; r <= radius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const tx = x + dx;
        const ty = y + dy;
        if (!world.walkable(tx, ty)) continue;
        if (label >= 0 && comp[ty * n + tx] !== label) continue;
        return { x: tx, y: ty };
      }
    }
  }
  return null;
}

// Algum tile encostado no retângulo está na região `label`?
function rectReachable(world, label, r) {
  const comp = world.components();
  const n = world.size;
  for (let y = r.y - 1; y <= r.y + r.h; y++) {
    for (let x = r.x - 1; x <= r.x + r.w; x++) {
      const inside = x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
      if (inside || !world.inBounds(x, y)) continue;
      if (world.walkable(x, y) && comp[y * n + x] === label) return true;
    }
  }
  return false;
}

// Retorna a lista de waypoints (centros de tiles) ou null se não há caminho.
// Retorna [] quando a origem já satisfaz o objetivo.
export function findPath(world, sx, sy, goal, maxNodes = 15000) {
  const size = world.size;
  const comp = world.components();
  let startX = Math.min(Math.max(Math.floor(sx), 0), size - 1);
  let startY = Math.min(Math.max(Math.floor(sy), 0), size - 1);
  if (!world.walkable(startX, startY)) {
    // Origem sobre um bloqueio (ex.: prédio recém-construído): sai para o tile livre mais perto.
    const t = nearestWalkable(world, startX, startY, 3);
    if (!t) return null;
    startX = t.x;
    startY = t.y;
  }
  const label = comp[startY * size + startX];

  let target = goal;
  if (goal.type === 'tile') {
    const t = nearestWalkable(world, Math.floor(goal.x), Math.floor(goal.y), 5, label);
    if (!t) return null;
    target = { type: 'tile', x: t.x, y: t.y };
  } else if (!rectReachable(world, label, goal)) {
    return null;
  }

  if (isGoal(target, startX, startY)) return [];

  const S = scratchFor(world);
  const stamp = ++S.stamp;
  const startIdx = startY * size + startX;
  const open = new MinHeap();
  S.seen[startIdx] = stamp;
  S.g[startIdx] = 0;
  S.parent[startIdx] = -1;
  open.push(heuristic(target, startX, startY), startIdx);

  let expanded = 0;
  while (open.size > 0) {
    const idx = open.pop();
    if (S.closed[idx] === stamp) continue;
    S.closed[idx] = stamp;
    const x = idx % size;
    const y = (idx - x) / size;
    if (isGoal(target, x, y)) return reconstruct(size, S, idx, startIdx);
    if (++expanded > maxNodes) return null;

    const gCur = S.g[idx];
    for (const [dx, dy, cost] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (!world.walkable(nx, ny)) continue;
      // Nada de atravessar quinas de obstáculos na diagonal.
      if (dx !== 0 && dy !== 0 && (!world.walkable(x + dx, y) || !world.walkable(x, y + dy))) continue;
      const ni = ny * size + nx;
      if (S.closed[ni] === stamp) continue;
      const ng = gCur + cost;
      if (S.seen[ni] !== stamp || ng < S.g[ni]) {
        S.seen[ni] = stamp;
        S.g[ni] = ng;
        S.parent[ni] = idx;
        open.push(ng + heuristic(target, nx, ny), ni);
      }
    }
  }
  return null;
}

function reconstruct(size, S, goalIdx, startIdx) {
  const out = [];
  let cur = goalIdx;
  while (cur !== startIdx && cur !== -1) {
    out.push({ x: (cur % size) + 0.5, y: Math.floor(cur / size) + 0.5 });
    cur = S.parent[cur];
  }
  return out.reverse();
}
