// Orquestra uma partida: simulação, bots, renderização, câmera, entrada, HUD e fim de jogo.
import * as THREE from 'three';
import { generateMap } from './core/mapgen.ts';
import { Simulation } from './core/sim.ts';
import { BotBrain } from './core/ai.ts';
import { MAP_SIZES, PLAYER_COLORS, PLAYER_NAMES } from './core/config.ts';
import { seedFromString } from './core/rng.ts';
import { buildTerrain, buildFog, updateFog, heightAt, type FogLayer } from './render/terrain.ts';
import { EntityRenderer } from './render/entities.ts';
import { RtsCamera } from './render/camera.ts';
import { Input } from './ui/input.ts';
import { Hud } from './ui/hud.ts';
import { Minimap } from './ui/minimap.ts';
import { Sound } from './ui/audio.ts';
import type {
  BuildingEntity, Command, DifficultyKey, Entity, GameEvent, GameMap, Point, PlayerConfig, PlayerStats,
  Settings, SmartTarget, UnitEntity, UnitType,
} from './types.ts';

const SKY = 0xa9cfe9;
const FOG_INTERVAL = 0.2;
const MINIMAP_INTERVAL = 0.2;
const SIM_STEP = 1 / 20;
const MAX_FRAME_SIM = 0.5;

// Dados do fim de partida, entregues à tela final.
export interface EndInfo {
  won: boolean;
  time: number;
  stats: PlayerStats;
  seed: number;
  difficulty: DifficultyKey;
}

// Ganchos que a camada de menus escuta (pausa, fim, saída).
export interface GameHooks {
  onPause?: (paused: boolean) => void;
  onEnd?: (info: EndInfo) => void;
  onQuit?: () => void;
}

export interface GameOptions {
  canvas: HTMLCanvasElement;
  hooks: GameHooks;
}

// Chão além das bordas do mapa, para não aparecer céu no horizonte.
function buildSurround(mapSize: number): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(mapSize * 6, mapSize * 6);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x3f6b30 }));
  mesh.position.set(mapSize / 2, -0.9, mapSize / 2);
  mesh.receiveShadow = true;
  return mesh;
}

export class Game {
  canvas: HTMLCanvasElement;
  hooks: GameHooks;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  raycaster = new THREE.Raycaster();
  sound = new Sound();
  hud: Hud;
  minimap: Minimap;
  input: Input;
  running = false;
  paused = false;
  ended = false;
  selected = new Set<number>();
  groups: Record<number, number[]> = {};
  lastGroup: { n: number; t: number } | null = null;
  loopId = 0;
  last = 0;
  // Partida atual (null fora de uma partida).
  map: GameMap | null = null;
  sim: Simulation | null = null;
  bots: (BotBrain | null)[] = [];
  seed = 0;
  difficulty: DifficultyKey = 'normal';
  scene: THREE.Scene | null = null;
  terrain: THREE.Mesh | null = null;
  fog: FogLayer | null = null;
  entities: EntityRenderer | null = null;
  rts: RtsCamera | null = null;
  fogAcc = 0;
  simAcc = 0;
  minimapAcc = 0;
  onResize = (): void => this.resize();

  constructor({ canvas, hooks }: GameOptions) {
    this.canvas = canvas;
    this.hooks = hooks;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.5, 600);
    this.hud = new Hud(this);
    this.minimap = new Minimap(this, document.getElementById('minimap') as HTMLCanvasElement);
    this.input = new Input(this);
    window.addEventListener('resize', this.onResize);
    this.resize();
  }

  // ---------- Ciclo de vida ----------

  start(settings: Settings): void {
    const { size, bots, difficulty, seed } = settings;
    this.stop();
    const mapSize = MAP_SIZES[size].size;
    const playerCount = 1 + bots;
    const numericSeed = typeof seed === 'number' ? seed : seedFromString(String(seed));
    const map = generateMap({ size: mapSize, playerCount, seed: numericSeed });
    const players: PlayerConfig[] = [{ name: PLAYER_NAMES[0], color: PLAYER_COLORS[0], isBot: false, civ: settings.civ ?? 'english' }];
    for (let i = 1; i < playerCount; i++) {
      players.push({ name: PLAYER_NAMES[i], color: PLAYER_COLORS[i], isBot: true, difficulty });
    }
    const sim = new Simulation({
      map, players, humanIndex: 0,
      wonderVictory: settings.wonderVictory ?? false,
      sacredVictory: settings.sacredVictory ?? false,
    });
    this.map = map;
    this.seed = numericSeed;
    this.difficulty = difficulty;
    this.sim = sim;
    this.bots = players.map((p, i) => (p.isBot ? new BotBrain(sim, i) : null));

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(SKY);
    scene.fog = new THREE.Fog(SKY, mapSize * 1.3, mapSize * 2.6);
    this.scene = scene;
    this.buildLights(scene, mapSize);

    const baseCenters = map.starts.map((s) => ({ x: s.x + 2, y: s.y + 2 }));
    this.terrain = buildTerrain(map, baseCenters);
    scene.add(this.terrain);
    scene.add(buildSurround(mapSize));
    this.fog = buildFog(map);
    scene.add(this.fog.mesh);
    this.fogAcc = FOG_INTERVAL;
    this.simAcc = 0;
    this.minimapAcc = MINIMAP_INTERVAL;

    this.entities = new EntityRenderer({ scene, sim, map, camera: this.camera });
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
    this.startLoop();
  }

  buildLights(scene: THREE.Scene, mapSize: number): void {
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
    scene.add(hemi, sun, sun.target);
  }

  stop(): void {
    this.loopId++;
    if (!this.running && !this.scene) return;
    this.running = false;
    this.entities?.dispose();
    this.entities = null;
    this.scene = null;
    this.sim = null;
  }

  quit(): void {
    this.stop();
    this.hud.hide();
    this.hooks.onQuit?.();
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  togglePause(): void {
    if (!this.running || this.ended) return;
    this.paused = !this.paused;
    this.hooks.onPause?.(this.paused);
  }

  resume(): void {
    if (!this.running || this.ended) return;
    this.paused = false;
    this.hooks.onPause?.(false);
  }

  // ---------- Loop ----------

  // Cada partida tem um id de loop: quadros pendentes de uma partida anterior morrem sozinhos.
  startLoop(): void {
    const id = ++this.loopId;
    const step = (now: number): void => {
      if (id !== this.loopId || !this.running) return;
      requestAnimationFrame(step);
      this.frame(now);
    };
    requestAnimationFrame(step);
  }

  frame(now: number): void {
    const { sim, map, rts, entities, fog, scene } = this;
    if (!this.running || !sim || !map || !rts || !entities || !fog || !scene) return;
    const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000));
    this.last = now;

    // Passos fixos de simulação: o tempo de jogo acompanha o relógio mesmo com quadros lentos.
    if (!this.paused && !sim.gameOver) {
      this.simAcc += Math.min(dt, MAX_FRAME_SIM);
      while (this.simAcc >= SIM_STEP && !sim.gameOver) {
        for (const b of this.bots) b?.update(SIM_STEP);
        sim.update(SIM_STEP);
        this.simAcc -= SIM_STEP;
      }
    }
    this.handleEvents(sim.drainEvents());
    rts.update(dt, (x, z) => heightAt(map, x, z));
    entities.sync(dt, now / 1000);

    this.fogAcc += dt;
    if (this.fogAcc >= FOG_INTERVAL) {
      this.fogAcc = 0;
      updateFog(fog, sim.fog);
    }
    this.minimapAcc += dt;
    if (this.minimapAcc >= MINIMAP_INTERVAL) {
      this.minimapAcc = 0;
      this.minimap.draw();
    }
    this.input.update();
    this.hud.update();
    this.renderer.render(scene, this.camera);

    if (sim.gameOver && !this.ended) this.endGame();
  }

  handleEvents(events: GameEvent[]): void {
    for (const ev of events) {
      if (ev.type === 'msg') {
        this.hud.toast(ev.text, ev.level);
        if (ev.level === 'bad') this.sound.play('alarm');
        else if (ev.level === 'good') this.sound.play('good');
        else if (ev.level === 'info' && ev.text.endsWith('pronto')) this.sound.play('ready');
        else if (ev.level === 'info' && ev.text.endsWith('concluído')) this.sound.play('build');
        continue;
      }
      // Tiros e impactos têm posição em `to`; mortes têm x/y. Só toca o som se o ponto estiver visível.
      const at: Point = ev.type === 'death' ? { x: ev.x, y: ev.y } : ev.to;
      if (this.inFog(at.x, at.y)) continue;
      this.sound.play(ev.type === 'death' ? 'death' : ev.type === 'shot' ? 'shot' : 'hit');
    }
    this.entities?.handleEvents(events);
  }

  inFog(x: number, y: number): boolean {
    const sim = this.sim;
    const map = this.map;
    if (!sim || !map) return false;
    const i = Math.floor(y) * map.size + Math.floor(x);
    return sim.fog[i] === 0;
  }

  endGame(): void {
    const sim = this.sim;
    if (!sim || !sim.gameOver) return;
    this.ended = true;
    this.paused = true;
    const human = sim.players[0];
    const won = sim.gameOver.result === 'victory';
    this.sound.play(won ? 'victory' : 'defeat');
    this.hooks.onEnd?.({
      won,
      time: sim.gameOver.time,
      stats: human.stats,
      seed: this.seed,
      difficulty: this.difficulty,
    });
  }

  // ---------- Consultas ----------

  get human() {
    return this.sim?.players[0] ?? null;
  }

  ownTownCenter(): BuildingEntity | null {
    if (!this.sim) return null;
    for (const e of this.sim.world.entities.values()) {
      if (e.kind === 'building' && e.owner === 0 && e.type === 'towncenter' && !e.dead) return e;
    }
    return null;
  }

  ndc(x: number, y: number): THREE.Vector2 {
    return new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  }

  groundAt(x: number, y: number): Point | null {
    if (!this.terrain) return null;
    this.raycaster.setFromCamera(this.ndc(x, y), this.camera);
    const hit = this.raycaster.intersectObject(this.terrain, false)[0];
    return hit ? { x: hit.point.x, y: hit.point.z } : null;
  }

  worldToScreen(x: number, h: number, z: number): { x: number; y: number; z: number } {
    const v = new THREE.Vector3(x, h, z).project(this.camera);
    return {
      x: ((v.x + 1) / 2) * window.innerWidth,
      y: ((1 - v.y) / 2) * window.innerHeight,
      z: v.z,
    };
  }

  // Entidades selecionadas que ainda existem.
  selectedEntities(): Entity[] {
    if (!this.sim) return [];
    const out: Entity[] = [];
    for (const id of this.selected) {
      const e = this.sim.world.get(id);
      if (e && !e.dead) out.push(e);
    }
    return out;
  }

  selectedOwnUnits(): UnitEntity[] {
    return this.selectedEntities().filter((e): e is UnitEntity => e.kind === 'unit' && e.owner === 0);
  }

  selectedOwnBuildings(): BuildingEntity[] {
    return this.selectedEntities().filter((e): e is BuildingEntity => e.kind === 'building' && e.owner === 0);
  }

  // ---------- Seleção e comandos ----------

  selectIds(ids: number[]): void {
    this.selected = new Set(ids);
    this.entities?.setSelection(this.selected);
    this.hud.selectionChanged();
  }

  toggleSelect(id: number): void {
    const next = new Set(this.selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectIds([...next]);
  }

  // Duplo clique: seleciona as unidades do mesmo tipo que estão visíveis na tela.
  selectSameType(type: UnitType): void {
    const sim = this.sim;
    const map = this.map;
    if (!sim || !map) return;
    const ids: number[] = [];
    for (const e of sim.world.entities.values()) {
      if (e.kind !== 'unit' || e.owner !== 0 || e.dead || e.type !== type) continue;
      const p = this.worldToScreen(e.x, heightAt(map, e.x, e.y) + 0.8, e.y);
      if (p.z < 1 && p.x >= 0 && p.y >= 0 && p.x <= window.innerWidth && p.y <= window.innerHeight) ids.push(e.id);
    }
    if (ids.length) this.selectIds(ids);
  }

  issue(cmd: Command): boolean {
    const ids = this.selectedOwnUnits().map((u) => u.id);
    if (ids.length) this.sim?.command(0, ids, cmd);
    return ids.length > 0;
  }

  issueSmart(target: SmartTarget): boolean {
    const ids = this.selectedOwnUnits().map((u) => u.id);
    if (ids.length) this.sim?.smartCommand(0, ids, target);
    return ids.length > 0;
  }

  stopSelected(): void {
    this.issue({ type: 'stop' });
  }

  focusTownCenter(): void {
    const tc = this.ownTownCenter();
    if (tc) this.rts?.focus(tc.x + 2, tc.y + 2);
  }

  focusSelection(): void {
    const list = this.selectedEntities();
    if (!list.length) return this.focusTownCenter();
    let x = 0;
    let z = 0;
    for (const e of list) {
      x += e.x;
      z += e.y;
    }
    this.rts?.focus(x / list.length, z / list.length);
  }

  groupKey(n: number, ctrl: boolean): void {
    if (ctrl) {
      this.groups[n] = this.selectedEntities().map((e) => e.id);
      this.hud.toast(`Grupo ${n} definido`, 'info');
      return;
    }
    const ids = (this.groups[n] || []).filter((id) => {
      const e = this.sim?.world.get(id);
      return e && !e.dead && e.owner === 0;
    });
    if (!ids.length) return;
    this.selectIds(ids);
    const now = performance.now();
    if (this.lastGroup && this.lastGroup.n === n && now - this.lastGroup.t < 400) this.focusSelection();
    this.lastGroup = { n, t: now };
  }

  // Minimapa: clique esquerdo centraliza; direito move as unidades selecionadas.
  minimapCommand(x: number, z: number): void {
    this.issueSmart({ x, y: z });
  }

  // ---------- Estatísticas para a tela final ----------

  summary(): PlayerStats | null {
    return this.sim ? this.sim.players[0].stats : null;
  }
}
