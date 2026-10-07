// Orquestra uma partida: simulação, bots, renderização, câmera, entrada, HUD e fim de jogo.
import * as THREE from 'three';
import { generateMap } from './core/mapgen.js';
import { Simulation } from './core/sim.js';
import { BotBrain } from './core/ai.js';
import { MAP_SIZES, PLAYER_COLORS, PLAYER_NAMES, UNITS, BUILDINGS } from './core/config.js';
import { seedFromString } from './core/rng.js';
import { buildTerrain, buildFog, updateFog, heightAt } from './render/terrain.js';
import { EntityRenderer } from './render/entities.js';
import { RtsCamera } from './render/camera.js';
import { Input } from './ui/input.js';
import { Hud } from './ui/hud.js';
import { Minimap } from './ui/minimap.js';
import { Sound } from './ui/audio.js';

const SKY = 0xa9cfe9;
const FOG_INTERVAL = 0.2;
const MINIMAP_INTERVAL = 0.2;

// Chão além das bordas do mapa, para não aparecer céu no horizonte.
function buildSurround(mapSize) {
  const geo = new THREE.PlaneGeometry(mapSize * 6, mapSize * 6);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x3f6b30 }));
  mesh.position.set(mapSize / 2, -0.9, mapSize / 2);
  mesh.receiveShadow = true;
  return mesh;
}

export class Game {
  constructor({ canvas, hooks }) {
    this.canvas = canvas;
    this.hooks = hooks;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.5, 600);
    this.raycaster = new THREE.Raycaster();
    this.sound = new Sound();
    this.hud = new Hud(this);
    this.minimap = new Minimap(this, document.getElementById('minimap'));
    this.input = new Input(this);
    this.running = false;
    this.paused = false;
    this.ended = false;
    this.selected = new Set();
    this.groups = {};
    this.frameBound = (now) => this.frame(now);
    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);
    this.resize();
  }

  // ---------- Ciclo de vida ----------

  start({ size, bots, difficulty, seed }) {
    this.stop();
    const mapSize = MAP_SIZES[size].size;
    const playerCount = 1 + bots;
    const numericSeed = typeof seed === 'number' ? seed : seedFromString(String(seed));
    const map = generateMap({ size: mapSize, playerCount, seed: numericSeed });
    const players = [{ name: PLAYER_NAMES[0], color: PLAYER_COLORS[0], isBot: false }];
    for (let i = 1; i < playerCount; i++) {
      players.push({ name: PLAYER_NAMES[i], color: PLAYER_COLORS[i], isBot: true, difficulty });
    }
    this.map = map;
    this.seed = numericSeed;
    this.difficulty = difficulty;
    this.sim = new Simulation({ map, players, humanIndex: 0 });
    this.bots = players.map((p, i) => (p.isBot ? new BotBrain(this.sim, i) : null));

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(SKY);
    this.scene.fog = new THREE.Fog(SKY, mapSize * 1.3, mapSize * 2.6);
    this.buildLights(mapSize);

    const baseCenters = map.starts.map((s) => ({ x: s.x + 2, y: s.y + 2 }));
    this.terrain = buildTerrain(map, baseCenters);
    this.scene.add(this.terrain);
    this.scene.add(buildSurround(mapSize));
    this.fog = buildFog(map);
    this.scene.add(this.fog.mesh);
    this.fogAcc = FOG_INTERVAL;
    this.minimapAcc = MINIMAP_INTERVAL;

    this.entities = new EntityRenderer({ scene: this.scene, sim: this.sim, map, camera: this.camera });
    this.rts = new RtsCamera(this.camera, mapSize);
    const tc = this.ownTownCenter();
    if (tc) this.rts.focus(tc.x + 2, tc.y + 2, true);

    this.selected = new Set();
    this.groups = {};
    this.input.reset();
    this.minimap.setMap(map);
    this.paused = false;
    this.ended = false;
    this.running = true;
    this.hud.show();
    this.resize();
    this.last = performance.now();
    requestAnimationFrame(this.frameBound);
  }

  buildLights(mapSize) {
    const hemi = new THREE.HemisphereLight(0xeef6ff, 0x4d5f2c, 1.0);
    const sun = new THREE.DirectionalLight(0xfff4dc, 1.7);
    const c = mapSize / 2;
    sun.position.set(c + 40, 70, c - 30);
    sun.target.position.set(c, 0, c);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const s = mapSize * 0.62;
    Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 10, far: 220 });
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.bias = -0.0008;
    this.scene.add(hemi, sun, sun.target);
  }

  stop() {
    if (!this.running && !this.scene) return;
    this.running = false;
    if (this.entities) this.entities.dispose();
    this.scene = null;
    this.sim = null;
  }

  quit() {
    this.stop();
    this.hud.hide();
    this.hooks.onQuit?.();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  togglePause() {
    if (!this.running || this.ended) return;
    this.paused = !this.paused;
    this.hooks.onPause?.(this.paused);
  }

  resume() {
    if (!this.running || this.ended) return;
    this.paused = false;
    this.hooks.onPause?.(false);
  }

  // ---------- Loop ----------

  frame(now) {
    if (!this.running) return;
    requestAnimationFrame(this.frameBound);
    const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000));
    this.last = now;

    if (!this.paused && !this.sim.gameOver) {
      for (const b of this.bots) b?.update(dt);
      this.sim.update(dt);
    }
    this.handleEvents(this.sim.drainEvents());
    this.rts.update(dt, (x, z) => heightAt(this.map, x, z));
    this.entities.sync(dt, now / 1000);

    this.fogAcc += dt;
    if (this.fogAcc >= FOG_INTERVAL) {
      this.fogAcc = 0;
      updateFog(this.fog, this.sim.fog);
    }
    this.minimapAcc += dt;
    if (this.minimapAcc >= MINIMAP_INTERVAL) {
      this.minimapAcc = 0;
      this.minimap.draw();
    }
    this.input.update(dt);
    this.hud.update(dt);
    this.renderer.render(this.scene, this.camera);

    if (this.sim.gameOver && !this.ended) this.endGame();
  }

  handleEvents(events) {
    for (const ev of events) {
      if (ev.type === 'msg') {
        this.hud.toast(ev.text, ev.level);
        if (ev.level === 'bad') this.sound.play('alarm');
        else if (ev.level === 'good') this.sound.play('good');
        else if (ev.level === 'info' && ev.text.endsWith('pronto')) this.sound.play('ready');
        else if (ev.level === 'info' && ev.text.endsWith('concluído')) this.sound.play('build');
      } else if (ev.type === 'shot' || ev.type === 'hit' || ev.type === 'death') {
        if (this.inFog(ev.to.x, ev.to.y)) continue;
        this.sound.play(ev.type === 'death' ? 'death' : ev.type === 'shot' ? 'shot' : 'hit');
      }
    }
    this.entities.handleEvents(events);
  }

  inFog(x, y) {
    const i = Math.floor(y) * this.map.size + Math.floor(x);
    return this.sim.fog[i] === 0;
  }

  endGame() {
    this.ended = true;
    this.paused = true;
    const human = this.sim.players[0];
    const won = this.sim.gameOver.result === 'victory';
    this.sound.play(won ? 'victory' : 'defeat');
    this.hooks.onEnd?.({
      won,
      time: this.sim.gameOver.time,
      stats: human.stats,
      gathered: human.stats.gathered,
      seed: this.seed,
      difficulty: this.difficulty,
    });
  }

  // ---------- Consultas ----------

  get human() {
    return this.sim.players[0];
  }

  ownTownCenter() {
    if (!this.sim) return null;
    for (const e of this.sim.world.entities.values()) {
      if (e.kind === 'building' && e.owner === 0 && e.type === 'towncenter' && !e.dead) return e;
    }
    return null;
  }

  ndc(x, y) {
    return new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  }

  groundAt(x, y) {
    if (!this.terrain) return null;
    this.raycaster.setFromCamera(this.ndc(x, y), this.camera);
    const hit = this.raycaster.intersectObject(this.terrain, false)[0];
    return hit ? { x: hit.point.x, y: hit.point.z } : null;
  }

  worldToScreen(x, h, z) {
    const v = new THREE.Vector3(x, h, z).project(this.camera);
    return {
      x: ((v.x + 1) / 2) * window.innerWidth,
      y: ((1 - v.y) / 2) * window.innerHeight,
      z: v.z,
    };
  }

  // Unidades próprias selecionadas.
  selectedEntities() {
    if (!this.sim) return [];
    const out = [];
    for (const id of this.selected) {
      const e = this.sim.world.get(id);
      if (e && !e.dead) out.push(e);
    }
    return out;
  }

  selectedOwnUnits() {
    return this.selectedEntities().filter((e) => e.kind === 'unit' && e.owner === 0);
  }

  selectedOwnBuildings() {
    return this.selectedEntities().filter((e) => e.kind === 'building' && e.owner === 0);
  }

  // ---------- Seleção e comandos ----------

  selectIds(ids) {
    this.selected = new Set(ids);
    this.entities.setSelection(this.selected);
    this.hud.selectionChanged();
  }

  toggleSelect(id) {
    const next = new Set(this.selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectIds([...next]);
  }

  selectSameType(type) {
    const ids = [];
    for (const e of this.sim.world.entities.values()) {
      if (e.kind !== 'unit' || e.owner !== 0 || e.dead || e.type !== type) continue;
      const p = this.worldToScreen(e.x, heightAt(this.map, e.x, e.y) + 0.8, e.y);
      if (p.z < 1 && p.x >= 0 && p.y >= 0 && p.x <= window.innerWidth && p.y <= window.innerHeight) ids.push(e.id);
    }
    if (ids.length) this.selectIds(ids);
  }

  issue(cmd) {
    const ids = this.selectedOwnUnits().map((u) => u.id);
    if (ids.length) this.sim.command(0, ids, cmd);
    return ids.length > 0;
  }

  issueSmart(target) {
    const ids = this.selectedOwnUnits().map((u) => u.id);
    if (ids.length) this.sim.smartCommand(0, ids, target);
    return ids.length > 0;
  }

  stopSelected() {
    this.issue({ type: 'stop' });
  }

  focusTownCenter() {
    const tc = this.ownTownCenter();
    if (tc) this.rts.focus(tc.x + 2, tc.y + 2);
  }

  focusSelection() {
    const list = this.selectedEntities();
    if (!list.length) return this.focusTownCenter();
    let x = 0;
    let z = 0;
    for (const e of list) {
      x += e.x;
      z += e.y;
    }
    this.rts.focus(x / list.length, z / list.length);
    return undefined;
  }

  groupKey(n, ctrl) {
    if (ctrl) {
      this.groups[n] = this.selectedEntities().map((e) => e.id);
      this.hud.toast(`Grupo ${n} definido`, 'info');
      return;
    }
    const ids = (this.groups[n] || []).filter((id) => {
      const e = this.sim.world.get(id);
      return e && !e.dead && e.owner === 0;
    });
    if (!ids.length) return;
    this.selectIds(ids);
    const now = performance.now();
    if (this.lastGroup && this.lastGroup.n === n && now - this.lastGroup.t < 400) this.focusSelection();
    this.lastGroup = { n, t: now };
  }

  // Minimapa: clique esquerdo centraliza; direito move as unidades selecionadas.
  minimapCommand(x, z) {
    this.issueSmart({ x, y: z });
  }

  // ---------- Estatísticas para a tela final ----------

  summary() {
    return this.sim ? this.sim.players[0].stats : null;
  }

  static unitName(type) {
    return UNITS[type]?.name ?? type;
  }

  static buildingName(type) {
    return BUILDINGS[type]?.name ?? type;
  }
}
