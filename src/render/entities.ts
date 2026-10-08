// Ponte entre a simulação e a cena: cria/atualiza/remove as representações 3D das entidades,
// além de projéteis, efeitos de impacto e a prévia de construção.
import * as THREE from 'three';
import {
  createUnit, createBuilding, createBerry, createMine, animateUnit,
  treeGeometries, mat, makeGhost, G, type UnitRig,
} from './models.ts';
import { heightAt } from './terrain.ts';
import { centerOf, rectOf } from '../core/world.ts';
import { BUILDINGS } from '../core/config.ts';
import type { Simulation } from '../core/sim.ts';
import type {
  BuildingType, DeathEvent, Entity, GameEvent, GameMap, NodeEntity, Point, UnitEntity, UnitType,
} from '../types.ts';

const SELECT_OWN = 0x4cff6a;
const SELECT_ENEMY = 0xff5050;
const BAR_HEIGHT: Record<UnitType, number> = {
  villager: 1.35, swordsman: 1.4, vanguard: 1.45, archer: 1.4, longbowman: 1.45, spearman: 1.45, hardenedSpearman: 1.45, arbalestrier: 1.4, crossbow: 1.4, scout: 1.95, horseman: 2.2, knight: 2.2, king: 2.2, royalKnight: 2.2, ram: 1.6,
};
const BUILDING_BAR = 3.4;
const TC_BAR = 5.4;
const TOWER_BAR = 6.0;
const MAX_PARTICLES = 300;

const barBg = new THREE.PlaneGeometry(1, 0.12);
const ringGeo = new THREE.RingGeometry(0.85, 1, 28);
const arrowShaft = new THREE.CylinderGeometry(0.025, 0.025, 0.9, 4);
const arrowTip = new THREE.ConeGeometry(0.06, 0.18, 5);
const shardGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);

type BasicMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;

// Barra de vida: raiz (posicionada sobre a entidade) e o preenchimento que encolhe.
interface Bar {
  root: THREE.Group;
  fill: BasicMesh;
}

interface ViewBase {
  group: THREE.Group;
  ring: BasicMesh;
  bar: Bar | null;
  height: number;
  lastX: number;
  lastY: number;
}

interface UnitView extends ViewBase {
  kind: 'unit';
  type: UnitType;
  rig: UnitRig;
  yaw: number;
}

interface BuildingView extends ViewBase {
  kind: 'building';
  type: BuildingType;
}

interface NodeView extends ViewBase {
  kind: 'node';
}

type View = UnitView | BuildingView | NodeView;

interface Ghost {
  type: BuildingType;
  group: THREE.Group;
  foot: BasicMesh;
}

interface Projectile {
  group: THREE.Group;
  from: Point;
  to: Point;
  t: number;
  life: number;
  h0: number;
  h1: number;
}

interface Particle {
  m: THREE.Mesh;
  life: number;
  t: number;
  vx: number;
  vy: number;
  vz: number;
}

export interface EntityRendererOptions {
  scene: THREE.Scene;
  sim: Simulation;
  map: GameMap;
  camera: THREE.Camera;
}

export class EntityRenderer {
  scene: THREE.Scene;
  sim: Simulation;
  map: GameMap;
  camera: THREE.Camera;
  root = new THREE.Group();
  fx = new THREE.Group();
  views = new Map<number, View>();
  selection = new Set<number>();
  projectiles: Projectile[] = [];
  particles: Particle[] = [];
  ghost: Ghost | null = null;
  rally: THREE.Group | null = null;
  treeMeshes: THREE.InstancedMesh[] = [];
  treeVariant = new Map<number, { v: number; slot: number }>();
  treeHidden = new Set<number>();
  sacredMeshes: { mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial }[] = [];

  constructor({ scene, sim, map, camera }: EntityRendererOptions) {
    this.scene = scene;
    this.sim = sim;
    this.map = map;
    this.camera = camera;
    scene.add(this.root);
    scene.add(this.fx);
    this.setupTrees();
    // Locais sagrados: um pilar por local, na cor do dono (cinza = neutro).
    for (const site of sim.sacredSites) {
      const mat = new THREE.MeshLambertMaterial({ color: 0x9e9e9e });
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 2.4, 8), mat);
      mesh.position.set(site.x, heightAt(map, site.x, site.y) + 1.2, site.y);
      scene.add(mesh);
      this.sacredMeshes.push({ mesh, mat });
    }
  }

  // ---------- Árvores em instancing (muitas no mapa) ----------

  setupTrees(): void {
    const [pineGeo, roundGeo] = treeGeometries();
    const trees = [...this.sim.world.entities.values()].filter(
      (e): e is NodeEntity => e.kind === 'node' && e.type === 'tree',
    );
    const counts = [0, 0];
    for (const t of trees) {
      const v = (t.id * 2654435761 >>> 0) % 3 === 0 ? 1 : 0;
      this.treeVariant.set(t.id, { v, slot: counts[v]++ });
    }
    this.treeMeshes = [];
    [pineGeo, roundGeo].forEach((geo, v) => {
      const m = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }), Math.max(1, counts[v]));
      m.castShadow = true;
      m.receiveShadow = true;
      m.count = counts[v];
      m.frustumCulled = false;
      this.root.add(m);
      this.treeMeshes.push(m);
    });
    const dummy = new THREE.Object3D();
    for (const t of trees) {
      const info = this.treeVariant.get(t.id);
      if (!info) continue;
      const c = centerOf(t);
      const s = 0.85 + ((t.id * 97) % 35) / 100;
      dummy.position.set(c.x, heightAt(this.map, c.x, c.y), c.y);
      dummy.rotation.set(0, ((t.id * 61) % 628) / 100, 0);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      this.treeMeshes[info.v].setMatrixAt(info.slot, dummy.matrix);
    }
    this.treeMeshes.forEach((m) => { m.instanceMatrix.needsUpdate = true; });
  }

  // Árvore cortada some: a instância vira uma escala zero.
  hideRemovedTrees(): void {
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (const [id, { v, slot }] of this.treeVariant) {
      if (this.treeHidden.has(id)) continue;
      const e = this.sim.world.get(id);
      if (e && !e.dead) continue;
      this.treeMeshes[v].setMatrixAt(slot, zero);
      this.treeMeshes[v].instanceMatrix.needsUpdate = true;
      this.treeHidden.add(id);
    }
  }

  // Ray → entidade (para clique). Árvores vêm como instanceId.
  pickObjects(raycaster: THREE.Raycaster): Entity | null {
    const hits = raycaster.intersectObjects([this.root], true);
    for (const hit of hits) {
      if (hit.instanceId !== undefined && hit.object instanceof THREE.InstancedMesh) {
        const id = this.treeIdFor(hit.object, hit.instanceId);
        if (id !== null) return this.sim.world.get(id) ?? null;
      }
      let o: THREE.Object3D | null = hit.object;
      while (o && o.userData.entityId === undefined) o = o.parent;
      if (o) {
        const e = this.sim.world.get(o.userData.entityId as number);
        if (e) return e;
      }
    }
    return null;
  }

  treeIdFor(mesh: THREE.InstancedMesh, instanceId: number): number | null {
    const v = this.treeMeshes.indexOf(mesh);
    for (const [id, info] of this.treeVariant) {
      if (info.v === v && info.slot === instanceId) return id;
    }
    return null;
  }

  // ---------- Sincronização por frame ----------

  sync(dt: number, time: number): void {
    const world = this.sim.world;
    this.sim.sacredSites.forEach((site, i) => {
      const color = site.owner >= 0 ? this.sim.players[site.owner].color : '#9e9e9e';
      this.sacredMeshes[i].mat.color.set(color);
    });
    for (const e of world.entities.values()) {
      if (e.kind === 'node' && e.type === 'tree') continue;
      let view = this.views.get(e.id);
      if (!view) {
        view = this.createView(e);
        this.views.set(e.id, view);
      }
      this.updateView(view, e, dt, time);
    }
    for (const [id, view] of this.views) {
      if (!world.get(id)) {
        this.root.remove(view.group);
        this.views.delete(id);
      }
    }
    this.hideRemovedTrees();
    this.updateProjectiles(dt);
    this.updateParticles(dt);
  }

  createView(e: Entity): View {
    const color = e.owner >= 0 ? this.sim.players[e.owner].color : '#888888';
    const ring = this.makeRing(e);
    ring.visible = false;
    const base = { ring, bar: null, lastX: e.x, lastY: e.y };
    let view: View;
    if (e.kind === 'unit') {
      const u = createUnit(e.type, color);
      view = { ...base, kind: 'unit', group: u.root, rig: u.rig, type: e.type, yaw: 0, height: BAR_HEIGHT[e.type] };
    } else if (e.kind === 'building') {
      const height = e.type === 'towncenter' ? TC_BAR : e.type === 'tower' ? TOWER_BAR : BUILDING_BAR;
      view = { ...base, kind: 'building', group: createBuilding(e.type, color), type: e.type, height };
    } else if (e.type === 'berry') {
      view = { ...base, kind: 'node', group: createBerry(), height: 1.1 };
    } else {
      view = { ...base, kind: 'node', group: createMine(e.type), height: 1.6 };
    }
    view.group.userData.entityId = e.id;
    view.group.traverse((o) => { o.userData.entityId = e.id; });
    this.root.add(view.group);
    ring.position.y = 0.06;
    view.group.add(ring);
    return view;
  }

  makeRing(e: Entity): BasicMesh {
    const size = e.kind === 'unit' ? 0.55 : Math.max(rectOf(e).w, rectOf(e).h) / 2 + 0.25;
    const m = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({ color: SELECT_OWN, transparent: true, opacity: 0.9, depthWrite: false }),
    );
    m.rotation.x = -Math.PI / 2;
    m.scale.setScalar(size);
    m.renderOrder = 3;
    return m;
  }

  updateView(view: View, e: Entity, dt: number, time: number): void {
    const human = this.sim.humanIndex;
    const visible = e.owner === human || this.sim.canSee(e);
    view.group.visible = visible;
    if (view.kind === 'unit' && e.kind === 'unit') {
      this.placeUnit(view, e, dt, time);
    } else if (view.kind === 'building' && e.kind === 'building') {
      const c = centerOf(e);
      view.group.position.set(c.x, heightAt(this.map, c.x, c.y), c.y);
      const k = e.built ? 1 : Math.max(0.15, e.progress);
      view.group.scale.set(e.built ? 1 : 0.9 + 0.1 * k, k, e.built ? 1 : 0.9 + 0.1 * k);
    } else if (e.kind === 'node') {
      const c = centerOf(e);
      view.group.position.set(c.x, heightAt(this.map, c.x, c.y), c.y);
    }

    // Anel de seleção.
    const selected = this.selection.has(e.id);
    view.ring.visible = selected && visible;
    if (selected) {
      view.ring.material.color.set(e.owner === human ? SELECT_OWN : SELECT_ENEMY);
    }

    // Barra de vida: aparece se está ferida ou selecionada (árvores e minas não têm vida).
    if (e.kind !== 'node') {
      const damaged = e.hp < e.maxHp;
      const wantBar = visible && (selected || damaged);
      if (wantBar && !view.bar) view.bar = this.makeBar();
      if (view.bar) {
        const bar = view.bar;
        bar.root.visible = wantBar;
        if (wantBar) {
          const ratio = Math.max(0, Math.min(1, e.hp / e.maxHp));
          bar.fill.scale.x = Math.max(0.001, ratio);
          bar.fill.position.x = -(1 - ratio) * 0.45;
          bar.fill.material.color.set(ratio > 0.5 ? 0x4cd964 : ratio > 0.25 ? 0xf5c542 : 0xe0484b);
          bar.root.position.set(0, view.height, 0);
          bar.root.quaternion.copy(this.camera.quaternion);
          if (!bar.root.parent) view.group.add(bar.root);
        }
        // Barra dentro do grupo: compensa a escala y dos edifícios em construção.
        if (view.kind === 'building') {
          const invY = 1 / Math.max(0.15, view.group.scale.y);
          bar.root.scale.set(1, invY, 1);
        }
      }
    }
  }

  placeUnit(view: UnitView, e: UnitEntity, dt: number, time: number): void {
    const dx = e.x - view.lastX;
    const dy = e.y - view.lastY;
    if (dx * dx + dy * dy > 1e-6) {
      const target = Math.atan2(dx, dy);
      view.yaw = lerpAngle(view.yaw, target, Math.min(1, dt * 12));
    }
    view.lastX = e.x;
    view.lastY = e.y;
    const h = heightAt(this.map, e.x, e.y);
    view.group.position.set(e.x, h, e.y);
    view.group.rotation.y = view.yaw;
    const gathering = e.order === 'gather' && e.phase === 'chop';
    const attacking = e.order === 'attack' && !e.moved;
    animateUnit(view.rig, view.type, time + (e.id % 7) * 0.13, e.moved, gathering || attacking);
  }

  makeBar(): Bar {
    const root = new THREE.Group();
    const bg = new THREE.Mesh(barBg, new THREE.MeshBasicMaterial({ color: 0x1a1a1a, depthWrite: false }));
    bg.scale.set(0.9, 1, 1);
    const fill: BasicMesh = new THREE.Mesh(barBg, new THREE.MeshBasicMaterial({ color: 0x4cd964, depthWrite: false }));
    fill.scale.set(0.9, 1, 1);
    fill.position.z = 0.001;
    root.add(bg, fill);
    root.renderOrder = 5;
    bg.material.depthTest = false;
    fill.material.depthTest = false;
    return { root, fill };
  }

  setSelection(ids: Iterable<number>): void {
    this.selection = new Set(ids);
  }

  setRally(x: number, y: number): void {
    if (!this.rally) {
      const rally = new THREE.Group();
      const pole = new THREE.Mesh(G.cyl(0.03, 0.03, 1.2, 5), mat(0x3a2a1a));
      pole.position.y = 0.6;
      const flag = new THREE.Mesh(G.box(0.4, 0.25, 0.03), mat(0xf2c94c));
      flag.position.set(0.2, 1.05, 0);
      rally.add(pole, flag);
      this.fx.add(rally);
      this.rally = rally;
    }
    this.rally.position.set(x, heightAt(this.map, x, y), y);
  }

  clearRally(): void {
    if (this.rally) this.fx.remove(this.rally);
    this.rally = null;
  }

  // ---------- Prévia de construção ----------

  setGhost(type: BuildingType, x: number, y: number, valid: boolean, color: string): void {
    const def = BUILDINGS[type];
    if (!this.ghost || this.ghost.type !== type) {
      if (this.ghost) this.fx.remove(this.ghost.group);
      const group = new THREE.Group();
      const body = makeGhost(createBuilding(type, color), 0.55);
      const foot: BasicMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(def.w, def.h),
        new THREE.MeshBasicMaterial({ color: 0x2ecc71, transparent: true, opacity: 0.45, depthWrite: false }),
      );
      foot.rotation.x = -Math.PI / 2;
      foot.position.y = 0.05;
      group.add(body, foot);
      this.fx.add(group);
      this.ghost = { type, group, foot };
    }
    const ghost = this.ghost;
    const cx = x + def.w / 2;
    const cy = y + def.h / 2;
    ghost.group.position.set(cx, heightAt(this.map, cx, cy), cy);
    ghost.group.visible = true;
    ghost.foot.material.color.set(valid ? 0x2ecc71 : 0xe74c3c);
  }

  hideGhost(): void {
    if (this.ghost) this.ghost.group.visible = false;
  }

  // ---------- Eventos: projéteis, impactos, mortes ----------

  handleEvents(events: GameEvent[]): void {
    for (const ev of events) {
      if (ev.type === 'shot') this.spawnArrow(ev.from, ev.to);
      else if (ev.type === 'hit') this.spawnSparks(ev.to);
      else if (ev.type === 'death') this.spawnDeath(ev);
    }
  }

  spawnArrow(from: Point, to: Point): void {
    const group = new THREE.Group();
    const shaft = new THREE.Mesh(arrowShaft, mat(0x6b4f2a));
    shaft.rotation.x = Math.PI / 2;
    const tip = new THREE.Mesh(arrowTip, mat(0xb9c2cc));
    tip.rotation.x = Math.PI / 2;
    tip.position.z = 0.5;
    group.add(shaft, tip);
    this.fx.add(group);
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    this.projectiles.push({
      group, from, to, t: 0, life: Math.max(0.15, dist / 22),
      h0: heightAt(this.map, from.x, from.y) + 1.1,
      h1: heightAt(this.map, to.x, to.y) + 0.8,
    });
  }

  updateProjectiles(dt: number): void {
    this.projectiles = this.projectiles.filter((p) => {
      p.t += dt;
      const k = Math.min(1, p.t / p.life);
      const x = p.from.x + (p.to.x - p.from.x) * k;
      const z = p.from.y + (p.to.y - p.from.y) * k;
      const y = p.h0 + (p.h1 - p.h0) * k + Math.sin(k * Math.PI) * 0.6;
      p.group.position.set(x, y, z);
      p.group.lookAt(p.to.x, p.h1, p.to.y);
      if (k >= 1) {
        this.fx.remove(p.group);
        return false;
      }
      return true;
    });
  }

  spawnSparks(at: Point): void {
    this.burst(at, 0xffd166, 4, 2.2, 0.35);
  }

  spawnDeath(ev: DeathEvent): void {
    if (ev.kind === 'building') this.burst({ x: ev.x, y: ev.y }, 0x8a7258, 14, 3.2, 0.9);
    else this.burst({ x: ev.x, y: ev.y }, 0xb08a5a, 6, 1.8, 0.6);
  }

  burst(at: Point, color: number, count: number, speed: number, life: number): void {
    const h = heightAt(this.map, at.x, at.y);
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      const m = new THREE.Mesh(shardGeo, mat(color));
      m.position.set(at.x, h + 0.5, at.y);
      this.fx.add(m);
      const a = Math.random() * Math.PI * 2;
      this.particles.push({
        m, life, t: 0,
        vx: Math.cos(a) * speed * (0.4 + Math.random() * 0.6),
        vz: Math.sin(a) * speed * (0.4 + Math.random() * 0.6),
        vy: 1.5 + Math.random() * 2,
      });
    }
  }

  updateParticles(dt: number): void {
    this.particles = this.particles.filter((p) => {
      p.t += dt;
      p.vy -= 6 * dt;
      p.m.position.x += p.vx * dt;
      p.m.position.z += p.vz * dt;
      p.m.position.y = Math.max(0, p.m.position.y + p.vy * dt);
      const k = 1 - p.t / p.life;
      p.m.scale.setScalar(Math.max(0.01, k));
      if (p.t >= p.life) {
        this.fx.remove(p.m);
        return false;
      }
      return true;
    });
  }

  // Limpa tudo que é desta partida (ao sair para o menu).
  dispose(): void {
    this.scene.remove(this.root);
    this.scene.remove(this.fx);
  }
}

function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
