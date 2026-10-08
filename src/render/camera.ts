// Câmera estilo RTS: pan (teclado, borda da tela, botão do meio), zoom, rotação e foco.
import * as THREE from 'three';
import type { Point } from '../types.ts';

const MIN_DIST = 10;
const MAX_DIST = 75;
const EDGE = 14; // pixels da borda que disparam o pan

export interface PointerState {
  x: number;
  y: number;
  inside: boolean;
}

export class RtsCamera {
  camera: THREE.PerspectiveCamera;
  mapSize: number;
  target: THREE.Vector3;
  dist = 42;
  targetDist = 42;
  pitch = 0.95;
  yaw = Math.PI * 0.25;
  targetYaw = this.yaw;
  keys = new Set<string>();
  mouse: PointerState = { x: -1, y: -1, inside: false };
  panDrag: Point | null = null;
  enabled = true;

  constructor(camera: THREE.PerspectiveCamera, mapSize: number) {
    this.camera = camera;
    this.mapSize = mapSize;
    this.target = new THREE.Vector3(mapSize / 2, 0, mapSize / 2);
    this.apply();
  }

  focus(x: number, z: number, snap = false): void {
    this.target.x = Math.min(Math.max(x, 0), this.mapSize);
    this.target.z = Math.min(Math.max(z, 0), this.mapSize);
    if (snap) this.apply();
  }

  zoom(delta: number): void {
    this.targetDist = Math.min(MAX_DIST, Math.max(MIN_DIST, this.targetDist + delta));
  }

  rotate(dir: number): void {
    this.targetYaw += dir * (Math.PI / 4);
  }

  update(dt: number, heightAtFn?: (x: number, z: number) => number): void {
    if (!this.enabled) return;
    // Forward e direita no plano do chão (a câmera olha para o alvo).
    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    const rx = -fz;
    const rz = fx;
    let mx = 0;
    let mz = 0;
    // Pan só pelas setas: WASD fica livre para os atalhos (A = atacar, S = parar).
    if (this.keys.has('arrowup')) { mx += fx; mz += fz; }
    if (this.keys.has('arrowdown')) { mx -= fx; mz -= fz; }
    if (this.keys.has('arrowleft')) { mx -= rx; mz -= rz; }
    if (this.keys.has('arrowright')) { mx += rx; mz += rz; }
    if (this.mouse.inside && !this.panDrag) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (this.mouse.x <= EDGE) { mx -= rx; mz -= rz; }
      if (this.mouse.x >= w - EDGE) { mx += rx; mz += rz; }
      if (this.mouse.y <= EDGE) { mx += fx; mz += fz; }
      if (this.mouse.y >= h - EDGE) { mx -= fx; mz -= fz; }
    }
    const len = Math.hypot(mx, mz);
    if (len > 0) {
      const speed = (12 + this.dist * 0.5) * dt;
      this.target.x += (mx / len) * speed;
      this.target.z += (mz / len) * speed;
    }
    this.target.x = Math.min(Math.max(this.target.x, 0), this.mapSize);
    this.target.z = Math.min(Math.max(this.target.z, 0), this.mapSize);

    this.dist += (this.targetDist - this.dist) * Math.min(1, dt * 10);
    this.yaw += (this.targetYaw - this.yaw) * Math.min(1, dt * 10);
    this.target.y = heightAtFn ? heightAtFn(this.target.x, this.target.z) : 0;
    this.apply();
  }

  apply(): void {
    const cp = Math.cos(this.pitch);
    const sp = Math.sin(this.pitch);
    this.camera.position.set(
      this.target.x + Math.sin(this.yaw) * cp * this.dist,
      this.target.y + sp * this.dist,
      this.target.z + Math.cos(this.yaw) * cp * this.dist,
    );
    this.camera.lookAt(this.target);
  }

  // Arrasta a câmera com o botão do meio: cada pixel vira uma fração da distância.
  panBy(dxPx: number, dyPx: number): void {
    const k = this.dist * 0.0022;
    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    const rx = -fz;
    const rz = fx;
    this.target.x += (-dxPx * rx + dyPx * fx) * k;
    this.target.z += (-dxPx * rz + dyPx * fz) * k;
  }

  // Limites visíveis aproximados no chão (para o minimapa).
  viewRect(): { x: number; z: number; half: number } {
    const half = this.dist * 0.62;
    return { x: this.target.x, z: this.target.z, half };
  }
}
