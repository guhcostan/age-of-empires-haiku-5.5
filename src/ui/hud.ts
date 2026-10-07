// HUD: barra de recursos, idade, painel de seleção, grade de comandos (com atalhos) e mensagens.
import {
  BUILDINGS, UNITS, NODES, TECHS, AGE_UP, AGE_NAMES, BUILD_MENU, RESOURCES, RESOURCE_INFO,
  MAX_QUEUE, UNIT_KEYS, BUILD_KEYS, TECH_KEYS, AGE_KEY,
} from '../core/config.ts';
import { $ } from './dom.ts';
import type { Game } from '../game.ts';
import type { AgeNumber, BuildingEntity, Cost, Entity, MessageLevel, NextAge, ResourceName } from '../types.ts';

const TOAST_MS = 4200;
const MAX_TOASTS = 5;
// 5 colunas x 3 linhas: cabe a lista mais longa (11 edifícios + atacar + parar).
const GRID_SLOTS = 15;

// Um botão da grade de comandos: atalho, custo, condição de uso e ação.
interface HudCommand {
  key?: string;
  label: string;
  icon: string;
  cost?: Cost;
  tip: string;
  enabled: () => boolean;
  reason?: () => string;
  run: () => void;
  done?: boolean;
}

function costText(cost: Cost): string {
  const parts = Object.entries(cost).map(([r, v]) => `${v} ${RESOURCE_INFO[r as ResourceName].name.toLowerCase()}`);
  return parts.length ? parts.join(', ') : 'grátis';
}

// Custo com o ícone do recurso (classes .ri.* do CSS).
function costHtml(cost: Cost): string {
  return Object.entries(cost).map(([r, v]) => `<span class="ri ${r}"></span>${v}`).join(' ');
}

// Preenche uma barra (.bar) com a porcentagem e o rótulo dados.
function setBar(bar: Element, pct: number, text: string): void {
  const fill = bar.querySelector<HTMLElement>('i');
  const label = bar.querySelector('em');
  if (fill) fill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  if (label) label.textContent = text;
}

export class Hud {
  game: Game;
  root: HTMLElement;
  res: Record<ResourceName, HTMLElement>;
  pop: HTMLElement;
  age: HTMLElement;
  hint: HTMLElement;
  toasts: HTMLElement;
  selTitle: HTMLElement;
  selSub: HTMLElement;
  selBody: HTMLElement;
  selQueue: HTMLElement;
  selIcon: HTMLElement;
  grid: HTMLElement;
  commands: HudCommand[] = [];
  buttons: HTMLButtonElement[] = [];
  sigKey = '';

  constructor(game: Game) {
    this.game = game;
    this.root = $('hud');
    this.res = {} as Record<ResourceName, HTMLElement>;
    for (const r of RESOURCES) this.res[r] = $(`res-${r}`);
    this.pop = $('res-pop');
    this.age = $('res-age');
    this.hint = $('hint');
    this.toasts = $('toasts');
    this.selTitle = $('sel-title');
    this.selSub = $('sel-sub');
    this.selBody = $('sel-body');
    this.selQueue = $('sel-queue');
    this.selIcon = $('sel-icon');
    this.grid = $('cmd-grid');
    this.buildGrid();
  }

  show(): void {
    this.root.classList.remove('hidden');
    this.sigKey = '';
  }

  hide(): void {
    this.root.classList.add('hidden');
  }

  setHint(text: string): void {
    this.hint.textContent = text;
  }

  toast(text: string, level: MessageLevel = 'info'): void {
    const el = document.createElement('div');
    el.className = `toast ${level}`;
    el.textContent = text;
    this.toasts.prepend(el);
    while (this.toasts.children.length > MAX_TOASTS) this.toasts.lastElementChild?.remove();
    setTimeout(() => {
      el.classList.add('fade');
      setTimeout(() => el.remove(), 400);
    }, TOAST_MS);
  }

  selectionChanged(): void {
    this.sigKey = '';
  }

  // Atalho de teclado: executa o comando da grade que tem essa tecla.
  runHotkey(key: string): boolean {
    const cmd = this.commands.find((c) => c.key === key);
    if (!cmd) return false;
    if (!cmd.enabled()) {
      this.toast(cmd.reason ? cmd.reason() : 'Indisponível', 'bad');
      this.game.sound.play('error');
      return true;
    }
    cmd.run();
    return true;
  }

  // ---------- Atualização por frame ----------

  update(): void {
    const g = this.game;
    const sim = g.sim;
    if (!sim) return;
    const player = sim.players[0];
    for (const r of RESOURCES) this.res[r].textContent = String(Math.floor(player.res[r]));
    const used = sim.popUsed(0);
    const cap = sim.popCap(0);
    this.pop.textContent = `${used} / ${cap}`;
    this.pop.classList.toggle('warn', used >= cap);
    this.age.textContent = AGE_NAMES[player.age];

    const sel = g.selectedEntities();
    const sig = sel.map((e) => {
      const b = e.kind === 'building' ? e : null;
      return [
        e.id, e.type, b?.built ? 1 : 0, b?.queue.length ?? 0, e.owner,
        b?.research?.id ?? '', b?.ageUp ? 1 : 0, player.age, Object.keys(player.techs).length,
      ].join(':');
    }).join('|');
    if (sig !== this.sigKey) {
      this.sigKey = sig;
      this.renderSelection(sel);
      this.buildCommands(sel);
    }
    this.updateLive(sel);
    this.updateButtons();
  }

  // ---------- Painel de seleção ----------

  renderSelection(sel: Entity[]): void {
    const g = this.game;
    const sim = g.sim;
    if (!sim) return;
    if (sel.length === 0) {
      this.selTitle.textContent = 'Nada selecionado';
      this.selSub.textContent = 'Clique em unidades ou edifícios';
      this.selIcon.style.background = '#2b2118';
      this.selIcon.textContent = '';
      this.selBody.innerHTML = '';
      this.selQueue.innerHTML = '';
      g.entities?.clearRally();
      return;
    }
    if (sel.length === 1) {
      const e = sel[0];
      const owner = sim.players[e.owner];
      const name = this.nameOf(e);
      this.selTitle.textContent = name;
      this.selSub.textContent = e.owner >= 0 ? `${owner.name}${owner.isBot ? ' (bot)' : ''}` : 'Recurso natural';
      this.selIcon.style.background = e.owner >= 0 ? owner.color : '#6b5a3c';
      this.selIcon.textContent = name.charAt(0);
      this.selBody.innerHTML = this.detailsOf(e);
      this.renderQueue(e);
      if (e.kind === 'building' && e.owner === 0 && e.rally) g.entities?.setRally(e.rally.x, e.rally.y);
      else g.entities?.clearRally();
      return;
    }
    const counts: Record<string, number> = {};
    for (const e of sel) {
      const key = this.nameOf(e);
      counts[key] = (counts[key] || 0) + 1;
    }
    this.selTitle.textContent = `${sel.length} unidades`;
    this.selSub.textContent = Object.entries(counts).map(([k, v]) => `${v}× ${k}`).join(' · ');
    this.selIcon.style.background = '#3d2e1d';
    this.selIcon.textContent = String(sel.length);
    this.selBody.innerHTML = '';
    this.selQueue.innerHTML = '';
    g.entities?.clearRally();
  }

  nameOf(e: Entity): string {
    if (e.kind === 'unit') return UNITS[e.type].name;
    if (e.kind === 'building') return BUILDINGS[e.type].name;
    return NODES[e.type].name;
  }

  detailsOf(e: Entity): string {
    if (e.kind === 'unit') {
      const d = UNITS[e.type];
      const role = d.ranged ? 'Arqueiro · ataque à distância' : d.civil ? 'Civil · coleta e constrói' : 'Militar · combate corpo a corpo';
      return `
        <div class="stat-row"><span>Vida</span>${this.bar(e.hp, e.maxHp, 'hp')}</div>
        <div class="stat-row"><span>Ataque</span><b>${d.attack}</b><span class="dim">alcance ${d.range}</span></div>
        <div class="stat-row"><span>Velocidade</span><b>${d.speed.toFixed(1)}</b></div>
        ${e.carry && e.carry.amt > 0 ? `<div class="stat-row"><span>Carregando</span><b>${e.carry.amt} ${RESOURCE_INFO[e.carry.res].name.toLowerCase()}</b></div>` : ''}
        <div class="role">${role}</div>`;
    }
    if (e.kind === 'building') {
      const d = BUILDINGS[e.type];
      const status = e.built
        ? (d.trains ? 'Pronto para treinar' : d.techs ? 'Pronto para pesquisar' : d.gather ? 'Pronto para coleta' : 'Pronto')
        : `Em construção ${Math.floor(e.progress * 100)}%`;
      const extra = d.pop ? `<div class="stat-row"><span>População</span><b>+${d.pop}</b></div>` : '';
      const drop = d.dropoff ? `<div class="stat-row"><span>Entrega</span><b>${d.dropoff.map((r) => RESOURCE_INFO[r].name).join(', ')}</b></div>` : '';
      const atk = d.attack ? `<div class="stat-row"><span>Ataque</span><b>${d.attack}</b><span class="dim">alcance ${d.range}</span></div>` : '';
      return `
        <div class="stat-row"><span>Vida</span>${this.bar(e.hp, e.maxHp, 'hp')}</div>
        <div class="role">${status}</div>${extra}${drop}${atk}
        ${e.ageUp ? `<div class="stat-row"><span>Idade</span>${this.bar(e.ageUp.elapsed, e.ageUp.time, 'prog')}</div>` : ''}
        ${e.research ? `<div class="stat-row"><span>${TECHS[e.research.id].name}</span>${this.bar(e.research.elapsed, e.research.time, 'prog')}</div>` : ''}`;
    }
    const d = NODES[e.type];
    const left = Math.max(0, Math.floor(e.amount));
    return `
      <div class="stat-row"><span>Restante</span><b>${left}</b></div>
      <div class="role">Recurso: ${RESOURCE_INFO[d.resource].name}</div>`;
  }

  bar(value: number, max: number, cls: string): string {
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    return `<div class="bar ${cls}"><i style="width:${pct}%"></i><em>${Math.ceil(value)}/${max}</em></div>`;
  }

  renderQueue(e: Entity): void {
    if (e.kind !== 'building' || e.owner !== 0 || !e.built || e.queue.length === 0) {
      this.selQueue.innerHTML = '';
      return;
    }
    this.selQueue.innerHTML = e.queue.map((q, i) => `
      <div class="queue-item">
        <span>${UNITS[q.type].name}</span>
        <div class="bar small"><i data-q="${i}" style="width:0%"></i></div>
      </div>`).join('');
  }

  // Atualiza valores que mudam a cada frame (vida, progresso).
  updateLive(sel: Entity[]): void {
    if (sel.length !== 1) return;
    const e = sel[0];
    if (e.kind !== 'node') {
      const hp = this.selBody.querySelector('.bar.hp');
      if (hp && e.maxHp) setBar(hp, (e.hp / e.maxHp) * 100, `${Math.ceil(e.hp)}/${e.maxHp}`);
    }
    if (e.kind === 'building' && !e.built) {
      const role = this.selBody.querySelector('.role');
      if (role) role.textContent = `Em construção ${Math.floor(e.progress * 100)}%`;
    }
    if (e.kind === 'building') {
      this.selBody.querySelectorAll('.bar.prog').forEach((bar) => {
        const source = e.ageUp ?? e.research;
        if (!source) return;
        setBar(bar, (source.elapsed / source.time) * 100, `${Math.floor(source.elapsed)}/${source.time}`);
      });
    }
    if (e.kind === 'building' && e.built && e.queue.length) {
      const first = this.selQueue.querySelector<HTMLElement>('i[data-q="0"]');
      const def = UNITS[e.queue[0].type];
      if (first) first.style.width = `${Math.min(100, (e.queue[0].elapsed / def.time) * 100)}%`;
    }
  }

  // ---------- Grade de comandos ----------

  buildGrid(): void {
    this.grid.innerHTML = '';
    this.buttons = [];
    for (let i = 0; i < GRID_SLOTS; i++) {
      const b = document.createElement('button');
      b.className = 'cmd empty';
      b.type = 'button';
      b.disabled = true;
      b.addEventListener('click', () => this.clickSlot(i));
      b.addEventListener('mouseenter', () => this.setHint(this.commands[i]?.tip || ''));
      b.addEventListener('mouseleave', () => this.setHint(''));
      this.grid.appendChild(b);
      this.buttons.push(b);
    }
  }

  clickSlot(i: number): void {
    const cmd = this.commands[i];
    if (!cmd || !cmd.enabled()) {
      if (cmd && cmd.reason) this.toast(cmd.reason(), 'bad');
      this.game.sound.play('error');
      return;
    }
    this.game.sound.play('click');
    cmd.run();
  }

  // Requisito de idade de um item: texto do motivo quando não está liberado.
  ageReason(age: AgeNumber): string | null {
    const player = this.game.sim?.players[0];
    if (!player) return null;
    return age > player.age ? `Requer ${AGE_NAMES[age]}` : null;
  }

  buildCommands(sel: Entity[]): void {
    const g = this.game;
    const sim = g.sim;
    if (!sim) return;
    const player = sim.players[0];
    const own = sel.filter((e) => e.owner === 0);
    const units = own.filter((e) => e.kind === 'unit');
    const civil = units.filter((u) => UNITS[u.type].civil);
    const military = units.filter((u) => !UNITS[u.type].civil);
    const buildings = own.filter((e): e is BuildingEntity => e.kind === 'building');
    const cmds: HudCommand[] = [];

    if (units.length > 0 && units.length === own.length) {
      if (civil.length) {
        for (const t of BUILD_MENU) {
          const def = BUILDINGS[t];
          cmds.push({
            key: BUILD_KEYS[t],
            label: def.name,
            icon: t,
            cost: def.cost,
            tip: `${def.name} — ${costText(def.cost)} · ${AGE_NAMES[def.age]}`,
            enabled: () => !this.ageReason(def.age) && sim.canAfford(0, def.cost),
            reason: () => this.ageReason(def.age) || 'Recursos insuficientes',
            run: () => g.input.startPlacement(t),
          });
        }
      }
      if (military.length) {
        cmds.push({
          key: 'a', label: 'Atacar-mover', icon: 'attack', tip: 'Atacar-mover (A)',
          enabled: () => true, run: () => g.input.startAttackMode(),
        });
      }
      cmds.push({
        key: 's', label: 'Parar', icon: 'stop', tip: 'Parar (S)',
        enabled: () => true, run: () => { g.input.cancelMode(); g.stopSelected(); },
      });
    } else if (buildings.length === 1 && units.length === 0) {
      const b = buildings[0];
      const def = BUILDINGS[b.type];
      if (b.built && def.trains) {
        for (const t of def.trains) {
          const u = UNITS[t];
          cmds.push({
            key: UNIT_KEYS[t],
            label: u.name,
            icon: t,
            cost: u.cost,
            tip: `${u.name} — ${costText(u.cost)} · ${u.time}s · ${AGE_NAMES[u.age]}`,
            enabled: () => !this.ageReason(u.age) && sim.canAfford(0, u.cost) && b.queue.length < MAX_QUEUE && sim.popUsed(0) < sim.popCap(0),
            reason: () => {
              if (this.ageReason(u.age)) return this.ageReason(u.age) ?? '';
              if (b.queue.length >= MAX_QUEUE) return 'Fila cheia';
              if (sim.popUsed(0) >= sim.popCap(0)) return 'População máxima — construa casas';
              return 'Recursos insuficientes';
            },
            run: () => {
              const r = sim.train(0, b.id, t);
              if (!r.ok) {
                this.toast(r.reason, 'bad');
                g.sound.play('error');
              }
            },
          });
        }
        cmds.push({
          key: 'delete', label: 'Cancelar', icon: 'cancel', tip: 'Cancelar último treino (Delete)',
          enabled: () => b.queue.length > 0, reason: () => 'Nada na fila',
          run: () => sim.cancelTraining(0, b.id),
        });
      }
      if (b.type === 'towncenter' && b.built) {
        const next = player.age + 1;
        const nextUp = AGE_UP[next as NextAge] as (typeof AGE_UP)[NextAge] | undefined;
        const cost = nextUp?.cost;
        cmds.push({
          key: AGE_KEY,
          label: next <= 4 ? 'Avançar idade' : 'Idade máxima',
          icon: 'age',
          cost,
          tip: nextUp && cost ? `${AGE_NAMES[next as AgeNumber]} — ${costText(cost)} · ${nextUp.time}s` : 'Idade máxima atingida',
          enabled: () => next <= 4 && !b.ageUp && sim.canAfford(0, cost ?? {}),
          reason: () => (!cost ? 'Idade máxima atingida' : b.ageUp ? 'Já avançando' : 'Recursos insuficientes'),
          run: () => {
            const r = sim.startAgeUp(0, b.id);
            if (!r.ok) this.toast(r.reason, 'bad');
          },
        });
      }
      if (b.built && def.techs) {
        def.techs.forEach((id, i) => {
          const tech = TECHS[id];
          const done = !!player.techs[id];
          const blocked = done || (tech.req !== undefined && !player.techs[tech.req]);
          cmds.push({
            key: TECH_KEYS[i],
            label: tech.name,
            icon: 'tech',
            cost: tech.cost,
            tip: `${tech.name} — ${costText(tech.cost)} · ${tech.time}s · ${AGE_NAMES[tech.age]}`,
            enabled: () => !done && !blocked && !b.research && !this.ageReason(tech.age) && sim.canAfford(0, tech.cost),
            reason: () => {
              if (done) return 'Técnica já pesquisada';
              if (this.ageReason(tech.age)) return this.ageReason(tech.age) ?? '';
              if (tech.req !== undefined && !player.techs[tech.req]) return `Pesquise ${TECHS[tech.req].name} antes`;
              if (b.research) return 'Já pesquisando';
              return 'Recursos insuficientes';
            },
            run: () => {
              const r = sim.research(0, b.id, id);
              if (!r.ok) this.toast(r.reason, 'bad');
            },
            done,
          });
        });
      }
    }

    this.commands = cmds;
    this.buttons.forEach((btn, i) => {
      const cmd = cmds[i];
      btn.className = cmd ? `cmd${cmd.done ? ' done' : ''}` : 'cmd empty';
      btn.disabled = !cmd;
      btn.innerHTML = cmd ? `
        <span class="icon ${cmd.icon}">${iconGlyph(cmd.icon)}</span>
        <span class="label">${cmd.label}</span>
        ${cmd.key ? `<kbd>${cmd.key === 'delete' ? 'Del' : cmd.key.toUpperCase()}</kbd>` : ''}
        ${cmd.cost && !cmd.done ? `<span class="cost">${costHtml(cmd.cost)}</span>` : ''}` : '';
      btn.title = cmd ? cmd.tip : '';
    });
  }

  updateButtons(): void {
    this.commands.forEach((cmd, i) => {
      const btn = this.buttons[i];
      if (btn) btn.classList.toggle('unavailable', !cmd.done && !cmd.enabled());
    });
  }
}

function iconGlyph(icon: string): string {
  const glyphs: Record<string, string> = {
    house: '⌂', storehouse: '▦', farm: '✿', mill: '◍', lumberCamp: '▤', miningCamp: '◆',
    barracks: '⚔', archeryRange: '◎', stable: '♞', blacksmith: '⚒', tower: '♜',
    villager: '☺', swordsman: '🗡', archer: '➹', spearman: '↑', crossbow: '✜', scout: '➤', knight: '♘',
    attack: '⚔', stop: '■', cancel: '✕', age: '★', tech: '✦',
  };
  return glyphs[icon] || '•';
}
