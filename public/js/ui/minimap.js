// Minimapa: terreno, névoa, unidades e a área visível da câmera. Clique centraliza; direito move.
import { PLAYER_COLORS } from '../core/config.js';

const WATER = [31, 95, 158];
const GRASS = [95, 143, 61];
const DIRT = [155, 122, 78];

export class Minimap {
  constructor(game, canvas) {
    this.game = game;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.base = null;
    this.fogCanvas = null;
    this.size = 0;
    this.dragging = false;
    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    window.addEventListener('pointermove', (e) => {
      if (this.dragging) this.focusAt(e);
    });
    window.addEventListener('pointerup', () => { this.dragging = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  setMap(map) {
    this.size = map.size;
    const base = document.createElement('canvas');
    base.width = map.size;
    base.height = map.size;
    const bctx = base.getContext('2d');
    const img = bctx.createImageData(map.size, map.size);
    const centers = map.starts.map((s) => ({ x: s.x + 2, y: s.y + 2 }));
    for (let y = 0; y < map.size; y++) {
      for (let x = 0; x < map.size; x++) {
        const i = y * map.size + x;
        let c;
        if (map.terrain[i]) c = WATER;
        else {
          const t = map.tint[i];
          c = [GRASS[0] + t * 30, GRASS[1] + t * 12, GRASS[2]];
          let near = Infinity;
          for (const b of centers) near = Math.min(near, Math.hypot(x - b.x, y - b.y));
          if (near < 7) {
            const k = (7 - near) / 9;
            c = c.map((v, j) => v + (DIRT[j] - v) * k);
          }
        }
        img.data.set([c[0], c[1], c[2], 255], i * 4);
      }
    }
    bctx.putImageData(img, 0, 0);
    this.base = base;
    this.fogCanvas = document.createElement('canvas');
    this.fogCanvas.width = map.size;
    this.fogCanvas.height = map.size;
    this.fogImg = this.fogCanvas.getContext('2d').createImageData(map.size, map.size);
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(this.canvas.clientWidth * dpr) || 200 * dpr;
    this.canvas.height = this.canvas.width;
  }

  toWorld(e) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * this.size,
      z: ((e.clientY - r.top) / r.height) * this.size,
    };
  }

  onDown(e) {
    if (!this.game.running || this.game.ended) return;
    if (e.button === 0) {
      this.dragging = true;
      this.focusAt(e);
    } else if (e.button === 2) {
      const p = this.toWorld(e);
      this.game.minimapCommand(p.x, p.z);
    }
  }

  focusAt(e) {
    const p = this.toWorld(e);
    this.game.rts.focus(p.x, p.z);
  }

  draw() {
    const g = this.game;
    if (!this.base || !g.sim) return;
    const ctx = this.ctx;
    const W = this.canvas.width;
    const scale = W / this.size;
    ctx.imageSmoothingEnabled = true;
    ctx.clearRect(0, 0, W, W);
    ctx.drawImage(this.base, 0, 0, W, W);

    // Névoa: inexplorado escuro, explorado meio apagado.
    const fog = g.sim.fog;
    const d = this.fogImg.data;
    for (let i = 0; i < fog.length; i++) {
      const a = fog[i] === 0 ? 255 : fog[i] === 1 ? 120 : 0;
      d[i * 4] = 8;
      d[i * 4 + 1] = 10;
      d[i * 4 + 2] = 14;
      d[i * 4 + 3] = a;
    }
    this.fogCanvas.getContext('2d').putImageData(this.fogImg, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.fogCanvas, 0, 0, W, W);

    // Entidades.
    for (const e of g.sim.world.entities.values()) {
      if (e.dead || e.kind === 'node') continue;
      if (!g.sim.canSee(e)) continue;
      const color = e.owner === 0 ? '#5aa9ff' : PLAYER_COLORS[e.owner] || '#ff5555';
      ctx.fillStyle = color;
      const size = e.kind === 'building' ? Math.max(2.5, scale * 2.5) : Math.max(1.5, scale * 0.9);
      const x = (e.kind === 'unit' ? e.x : e.x + 1) * scale;
      const y = (e.kind === 'unit' ? e.y : e.y + 1) * scale;
      ctx.fillRect(x - size / 2, y - size / 2, size, size);
    }

    // Área visível da câmera.
    const v = g.rts.viewRect();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.strokeRect((v.x - v.half) * scale, (v.z - v.half) * scale, v.half * 2 * scale, v.half * 2 * scale);
  }
}
