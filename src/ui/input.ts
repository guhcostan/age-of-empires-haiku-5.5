// Entrada: mouse e teclado viram seleção, comandos, construção e atalhos (no estilo do AoE).
import { BUILDINGS, UNITS, PLAYER_COLORS } from '../core/config.ts';
import { heightAt } from '../render/terrain.ts';
import { $ } from './dom.ts';
import type { Game } from '../game.ts';
import type { BuildingType, Entity, Point, SmartTarget, UnitEntity } from '../types.ts';

const CLICK_PX = 5;
const DOUBLE_MS = 350;
const PICK_PX = 26;
const ARROWS = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'];

interface DragState {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  moved: boolean;
  shift: boolean;
}

// Local de construção em preparação: canto superior esquerdo e o motivo de não poder construir (ou null).
export interface Placement {
  type: BuildingType;
  ox: number;
  oy: number;
  reason: string | null;
}

interface LastPick {
  id: number;
  t: number;
}

export class Input {
  game: Game;
  canvas: HTMLCanvasElement;
  box: HTMLElement;
  placement: Placement | null = null;
  attackMode = false;
  drag: DragState | null = null;
  panning: Point | null = null;
  rightDown: Point | null = null;
  lastPick: LastPick | null = null;
  mouse: Point = { x: 0, y: 0 };

  constructor(game: Game) {
    this.game = game;
    this.canvas = game.canvas;
    this.box = $('sel-box');
    this.reset();
    this.bind();
  }

  reset(): void {
    this.placement = null;
    this.attackMode = false;
    this.drag = null;
    this.panning = null;
    this.rightDown = null;
    this.lastPick = null;
    this.mouse = { x: 0, y: 0 };
    this.hideBox();
    this.game.entities?.hideGhost();
  }

  bind(): void {
    const c = this.canvas;
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('pointerdown', (e) => this.onDown(e));
    window.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', (e) => this.onUp(e));
    c.addEventListener('wheel', (e) => {
      if (!this.active()) return;
      e.preventDefault();
      this.game.rts?.zoom(Math.sign(e.deltaY) * 2.5);
    }, { passive: false });
    document.addEventListener('mouseleave', () => {
      if (this.game.rts) this.game.rts.mouse.inside = false;
    });
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    window.addEventListener('blur', () => this.game.rts?.keys.clear());
  }

  active(): boolean {
    return this.game.running && !this.game.paused && !this.game.ended;
  }

  // ---------- Mouse ----------

  onDown(e: PointerEvent): void {
    if (!this.active()) return;
    if (e.button === 0) {
      this.drag = { x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY, moved: false, shift: e.shiftKey };
    } else if (e.button === 1) {
      e.preventDefault();
      this.panning = { x: e.clientX, y: e.clientY };
    } else if (e.button === 2) {
      this.rightDown = { x: e.clientX, y: e.clientY };
    }
  }

  onMove(e: PointerEvent): void {
    this.mouse = { x: e.clientX, y: e.clientY };
    const rts = this.game.rts;
    if (rts) rts.mouse = { x: e.clientX, y: e.clientY, inside: true };
    if (this.panning && rts) {
      rts.panBy(e.clientX - this.panning.x, e.clientY - this.panning.y);
      this.panning = { x: e.clientX, y: e.clientY };
    }
    if (this.drag) {
      this.drag.x1 = e.clientX;
      this.drag.y1 = e.clientY;
      if (Math.hypot(this.drag.x1 - this.drag.x0, this.drag.y1 - this.drag.y0) > CLICK_PX) this.drag.moved = true;
      if (this.drag.moved) this.showBox(this.drag);
    }
  }

  onUp(e: PointerEvent): void {
    if (e.button === 0 && this.drag) {
      const d = this.drag;
      this.drag = null;
      this.hideBox();
      if (!this.active()) return;
      if (d.moved) this.boxSelect(d);
      else this.click(e.clientX, e.clientY, d.shift);
    } else if (e.button === 1) {
      this.panning = null;
    } else if (e.button === 2 && this.rightDown) {
      const r = this.rightDown;
      this.rightDown = null;
      if (this.active() && Math.hypot(e.clientX - r.x, e.clientY - r.y) <= CLICK_PX) {
        this.rightClick(e.clientX, e.clientY);
      }
    }
  }

  showBox(d: DragState): void {
    const x = Math.min(d.x0, d.x1);
    const y = Math.min(d.y0, d.y1);
    Object.assign(this.box.style, {
      display: 'block',
      left: `${x}px`,
      top: `${y}px`,
      width: `${Math.abs(d.x1 - d.x0)}px`,
      height: `${Math.abs(d.y1 - d.y0)}px`,
    });
  }

  hideBox(): void {
    if (this.box) this.box.style.display = 'none';
  }

  // Entidade sob o cursor: unidades têm prioridade (clique por distância na tela).
  pickAt(x: number, y: number): Entity | null {
    const g = this.game;
    const { sim, map, entities } = g;
    if (!sim || !map || !entities) return null;
    let best: UnitEntity | null = null;
    let bestD = PICK_PX;
    for (const e of sim.world.entities.values()) {
      if (e.kind !== 'unit' || e.dead || !sim.canSee(e)) continue;
      const p = g.worldToScreen(e.x, heightAt(map, e.x, e.y) + 1.0, e.y);
      if (p.z > 1) continue;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestD) {
        best = e;
        bestD = d;
      }
    }
    if (best) return best;
    g.raycaster.setFromCamera(g.ndc(x, y), g.camera);
    const e = entities.pickObjects(g.raycaster);
    return e && sim.canSee(e) ? e : null;
  }

  click(x: number, y: number, shift: boolean): void {
    const g = this.game;
    if (this.placement) {
      this.tryPlace(shift);
      return;
    }
    if (this.attackMode) {
      this.attackMode = false;
      g.hud.setHint('');
      const e = this.pickAt(x, y);
      const ground = g.groundAt(x, y);
      if (e && e.owner !== 0 && e.owner !== -1 && g.sim?.canSee(e)) {
        g.issue({ type: 'attack', target: e.id });
      } else if (ground) {
        g.issue({ type: 'attackmove', x: ground.x, y: ground.y });
      }
      return;
    }
    const e = this.pickAt(x, y);
    const now = performance.now();
    if (e && e.owner === 0 && e.kind === 'unit' && this.lastPick && this.lastPick.id === e.id && now - this.lastPick.t < DOUBLE_MS) {
      g.selectSameType(e.type);
      this.lastPick = null;
      return;
    }
    this.lastPick = e ? { id: e.id, t: now } : null;
    if (!e) {
      if (!shift) g.selectIds([]);
      return;
    }
    if (shift) g.toggleSelect(e.id);
    else g.selectIds([e.id]);
  }

  boxSelect(d: DragState): void {
    const g = this.game;
    const { sim, map } = g;
    if (!sim || !map) return;
    const x0 = Math.min(d.x0, d.x1);
    const x1 = Math.max(d.x0, d.x1);
    const y0 = Math.min(d.y0, d.y1);
    const y1 = Math.max(d.y0, d.y1);
    const units: number[] = [];
    let building: number | null = null;
    for (const e of sim.world.entities.values()) {
      if (e.dead || e.owner !== 0) continue;
      if (e.kind === 'unit') {
        const p = g.worldToScreen(e.x, heightAt(map, e.x, e.y) + 1, e.y);
        if (p.z <= 1 && p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1) units.push(e.id);
      } else if (e.kind === 'building' && building === null) {
        const cx = e.x + BUILDINGS[e.type].w / 2;
        const cy = e.y + BUILDINGS[e.type].h / 2;
        const p = g.worldToScreen(cx, heightAt(map, cx, cy) + 1, cy);
        if (p.z <= 1 && p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1) building = e.id;
      }
    }
    let ids: number[] = units.length ? units : building !== null ? [building] : [];
    if (d.shift) ids = [...new Set([...g.selected, ...ids])];
    g.selectIds(ids);
  }

  rightClick(x: number, y: number): void {
    const g = this.game;
    if (this.cancelMode()) return;
    const ground = g.groundAt(x, y);
    const e = this.pickAt(x, y);
    const units = g.selectedOwnUnits();
    if (units.length) {
      let target: SmartTarget | null = null;
      if (e && e.owner !== 0 && e.owner !== -1) target = { entity: e };
      else if (e && e.owner === 0 && (e.kind === 'node' || (e.kind === 'building' && (BUILDINGS[e.type].gather || !e.built)))) {
        target = { entity: e };
      } else if (ground) target = { x: ground.x, y: ground.y };
      if (target) g.issueSmart(target);
      return;
    }
    const buildings = g.selectedOwnBuildings().filter((b) => b.built && BUILDINGS[b.type].trains);
    if (buildings.length && ground) {
      // Recurso ou edifício de coleta sob o clique: as unidades novas vão coletar nele.
      const gatherEntity = e && (e.kind === 'node' || (e.kind === 'building' && BUILDINGS[e.type].gather)) ? e : null;
      for (const b of buildings) g.sim?.setRally(0, b.id, ground.x, ground.y, gatherEntity ? gatherEntity.id : null);
      g.entities?.setRally(ground.x, ground.y);
      g.hud.toast('Ponto de encontro definido', 'info');
    }
  }

  // ---------- Construção ----------

  startPlacement(type: BuildingType): void {
    if (!BUILDINGS[type]) return;
    this.placement = { type, ox: 0, oy: 0, reason: null };
    this.attackMode = false;
    this.game.hud.setHint(`Construir ${BUILDINGS[type].name}: clique num local livre (Esc cancela)`);
  }

  startAttackMode(): void {
    if (this.game.selectedOwnUnits().length === 0) return;
    this.attackMode = true;
    this.game.hud.setHint('Atacar-mover: clique no terreno ou em um inimigo (Esc cancela)');
  }

  cancelMode(): boolean {
    if (!this.placement && !this.attackMode) return false;
    this.placement = null;
    this.attackMode = false;
    this.game.entities?.hideGhost();
    this.game.hud.setHint('');
    return true;
  }

  updatePlacement(): void {
    const g = this.game;
    const p = this.placement;
    if (!p) return;
    const def = BUILDINGS[p.type];
    const ground = g.groundAt(this.mouse.x, this.mouse.y);
    const sim = g.sim;
    if (!ground || !sim) {
      g.entities?.hideGhost();
      return;
    }
    p.ox = Math.round(ground.x - def.w / 2);
    p.oy = Math.round(ground.y - def.h / 2);
    const blocked = sim.checkPlacement(p.type, p.ox, p.oy);
    const affordable = sim.canAfford(0, def.cost);
    p.reason = blocked ?? (affordable ? null : 'Recursos insuficientes');
    g.entities?.setGhost(p.type, p.ox, p.oy, !p.reason, PLAYER_COLORS[0]);
  }

  // Aldeões que vão construir: os selecionados ou o mais próximo do local.
  builderIds(cx: number, cy: number): number[] {
    const g = this.game;
    const sim = g.sim;
    if (!sim) return [];
    const selected = g.selectedOwnUnits().filter((u) => UNITS[u.type].civil);
    if (selected.length) return selected.slice(0, 6).map((u) => u.id);
    let best: UnitEntity | null = null;
    let bestD = Infinity;
    for (const e of sim.world.entities.values()) {
      if (e.kind !== 'unit' || e.owner !== 0 || e.dead || !UNITS[e.type].civil) continue;
      const d = Math.hypot(e.x - cx, e.y - cy);
      if (d < bestD) {
        best = e;
        bestD = d;
      }
    }
    return best ? [best.id] : [];
  }

  tryPlace(shift: boolean): void {
    const g = this.game;
    const p = this.placement;
    const sim = g.sim;
    if (!p || !sim) return;
    const def = BUILDINGS[p.type];
    if (p.reason) {
      g.hud.toast(p.reason, 'bad');
      g.sound.play('error');
      return;
    }
    const builders = this.builderIds(p.ox + def.w / 2, p.oy + def.h / 2);
    if (builders.length === 0) {
      g.hud.toast('Nenhum aldeão disponível', 'bad');
      g.sound.play('error');
      return;
    }
    const r = sim.placeBuilding(0, p.type, p.ox, p.oy);
    if (!r.ok) {
      g.hud.toast(r.reason, 'bad');
      g.sound.play('error');
      return;
    }
    sim.command(0, builders, { type: 'build', target: r.building.id });
    g.sound.play('click');
    if (!shift) this.cancelMode();
    else this.updatePlacement();
  }

  // ---------- Teclado ----------

  onKeyDown(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const g = this.game;
    if (!g.running || g.ended) return;
    const k = e.key.toLowerCase();

    if (ARROWS.includes(k)) {
      g.rts?.keys.add(k);
      e.preventDefault();
      return;
    }
    if (k === 'escape') {
      e.preventDefault();
      if (!this.cancelMode()) g.togglePause();
      return;
    }
    if (g.paused) return;
    if (k === ' ') {
      e.preventDefault();
      g.focusSelection();
      return;
    }
    if (k === 'home') {
      g.focusTownCenter();
      return;
    }
    if (/^[0-9]$/.test(k)) {
      e.preventDefault();
      g.groupKey(Number(k), e.ctrlKey || e.metaKey);
      return;
    }
    if (k === 'q' || k === 'e') {
      g.rts?.rotate(k === 'q' ? -1 : 1);
      return;
    }
    // Atalhos de seleção da SPEC §7.2 com Ctrl (antes do bloqueio de Ctrl abaixo).
    if ((e.ctrlKey || e.metaKey) && (k === 'a' || k === 'k')) {
      e.preventDefault();
      g.selectOwnUnits(!e.shiftKey);
      return;
    }
    if (k === '.') {
      e.preventDefault();
      g.selectIdleVillagers();
      return;
    }
    if (k === ',') {
      g.selectIdleMilitary();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (k === 'a') {
      this.startAttackMode();
      return;
    }
    if (k === 's') {
      this.cancelMode();
      g.stopSelected();
      return;
    }
    g.hud.runHotkey(k);
  }

  onKeyUp(e: KeyboardEvent): void {
    const k = e.key.toLowerCase();
    if (ARROWS.includes(k)) this.game.rts?.keys.delete(k);
  }

  // Chamado a cada frame: prévia de construção.
  update(): void {
    if (!this.active()) return;
    if (this.placement) this.updatePlacement();
  }
}
