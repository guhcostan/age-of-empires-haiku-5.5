// HUD: barra de recursos, painel de seleção, grade de comandos (com atalhos) e mensagens.
import { BUILDINGS, UNITS, NODES, BUILD_MENU, RESOURCES, RESOURCE_INFO, MAX_QUEUE } from '../core/config.js';

const TRAIN_KEYS = { villager: 'v', swordsman: 'z', archer: 'x', scout: 'c' };
const BUILD_KEYS = { house: 'h', storehouse: 'm', farm: 'f', barracks: 'b', stable: 't' };
const TOAST_MS = 4200;
const MAX_TOASTS = 5;
const GRID_SLOTS = 12;

const $ = (id) => document.getElementById(id);

function costText(cost) {
  const parts = Object.entries(cost).map(([r, v]) => `${v} ${RESOURCE_INFO[r].name.toLowerCase()}`);
  return parts.length ? parts.join(', ') : 'grátis';
}

// Custo com o ícone do recurso (classes .ri.* do CSS).
function costHtml(cost) {
  return Object.entries(cost).map(([r, v]) => `<span class="ri ${r}"></span>${v}`).join(' ');
}

export class Hud {
  constructor(game) {
    this.game = game;
    this.root = $('hud');
    this.res = {};
    for (const r of RESOURCES) this.res[r] = $(`res-${r}`);
    this.pop = $('res-pop');
    this.hint = $('hint');
    this.toasts = $('toasts');
    this.selTitle = $('sel-title');
    this.selSub = $('sel-sub');
    this.selBody = $('sel-body');
    this.selQueue = $('sel-queue');
    this.selIcon = $('sel-icon');
    this.grid = $('cmd-grid');
    this.commands = [];
    this.buttons = [];
    this.sigKey = '';
    this.buildGrid();
  }

  show() {
    this.root.classList.remove('hidden');
    this.sigKey = '';
  }

  hide() {
    this.root.classList.add('hidden');
  }

  setHint(text) {
    this.hint.textContent = text;
  }

  toast(text, level = 'info') {
    const el = document.createElement('div');
    el.className = `toast ${level}`;
    el.textContent = text;
    this.toasts.prepend(el);
    while (this.toasts.children.length > MAX_TOASTS) this.toasts.lastElementChild.remove();
    setTimeout(() => {
      el.classList.add('fade');
      setTimeout(() => el.remove(), 400);
    }, TOAST_MS);
  }

  selectionChanged() {
    this.sigKey = '';
  }

  // Atalho de teclado: executa o comando da grade que tem essa tecla.
  runHotkey(key) {
    const cmd = this.commands.find((c) => c.key === key);
    if (!cmd || !cmd.enabled()) return false;
    cmd.run();
    return true;
  }

  // ---------- Atualização por frame ----------

  update() {
    const g = this.game;
    if (!g.sim) return;
    const player = g.sim.players[0];
    for (const r of RESOURCES) this.res[r].textContent = Math.floor(player.res[r]);
    const used = g.sim.popUsed(0);
    const cap = g.sim.popCap(0);
    this.pop.textContent = `${used} / ${cap}`;
    this.pop.classList.toggle('warn', used >= cap);

    const sel = g.selectedEntities();
    const sig = sel.map((e) => `${e.id}:${e.type}:${e.built ? 1 : 0}:${e.queue ? e.queue.length : 0}:${e.owner}`).join('|');
    if (sig !== this.sigKey) {
      this.sigKey = sig;
      this.renderSelection(sel);
      this.buildCommands(sel);
    }
    this.updateLive(sel);
    this.updateButtons();
  }

  // ---------- Painel de seleção ----------

  renderSelection(sel) {
    const g = this.game;
    if (sel.length === 0) {
      this.selTitle.textContent = 'Nada selecionado';
      this.selSub.textContent = 'Clique em unidades ou edifícios';
      this.selIcon.style.background = '#2b2118';
      this.selIcon.textContent = '';
      this.selBody.innerHTML = '';
      this.selQueue.innerHTML = '';
      g.entities?.setRally(null);
      return;
    }
    if (sel.length === 1) {
      const e = sel[0];
      const owner = g.sim.players[e.owner];
      const name = this.nameOf(e);
      this.selTitle.textContent = name;
      this.selSub.textContent = e.owner >= 0 ? `${owner.name}${owner.isBot ? ' (bot)' : ''}` : 'Recurso natural';
      this.selIcon.style.background = e.owner >= 0 ? owner.color : '#6b5a3c';
      this.selIcon.textContent = name.charAt(0);
      this.selBody.innerHTML = this.detailsOf(e);
      this.renderQueue(e);
      if (e.kind === 'building' && e.owner === 0 && e.rally) g.entities?.setRally(e.rally.x, e.rally.y);
      else g.entities?.setRally(null);
      return;
    }
    const counts = {};
    for (const e of sel) {
      const key = this.nameOf(e);
      counts[key] = (counts[key] || 0) + 1;
    }
    this.selTitle.textContent = `${sel.length} unidades`;
    this.selSub.textContent = Object.entries(counts).map(([k, v]) => `${v}× ${k}`).join(' · ');
    this.selIcon.style.background = '#3d2e1d';
    this.selIcon.textContent = sel.length;
    this.selBody.innerHTML = '';
    this.selQueue.innerHTML = '';
    g.entities?.setRally(null);
  }

  nameOf(e) {
    if (e.kind === 'unit') return UNITS[e.type].name;
    if (e.kind === 'building') return BUILDINGS[e.type].name;
    return NODES[e.type].name;
  }

  detailsOf(e) {
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
        ? (d.trains ? 'Pronto para treinar' : d.gather ? 'Pronto para coleta' : 'Pronto')
        : `Em construção ${Math.floor(e.progress * 100)}%`;
      const extra = d.pop ? `<div class="stat-row"><span>População</span><b>+${d.pop}</b></div>` : '';
      const drop = d.dropoff ? `<div class="stat-row"><span>Entrega</span><b>${d.dropoff.map((r) => RESOURCE_INFO[r].name).join(', ')}</b></div>` : '';
      return `
        <div class="stat-row"><span>Vida</span>${this.bar(e.hp, e.maxHp, 'hp')}</div>
        <div class="role">${status}</div>${extra}${drop}`;
    }
    const d = NODES[e.type];
    const left = Math.max(0, Math.floor(e.amount));
    return `
      <div class="stat-row"><span>Restante</span><b>${left}</b></div>
      <div class="role">Recurso: ${RESOURCE_INFO[d.resource].name}</div>`;
  }

  bar(value, max, cls) {
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    return `<div class="bar ${cls}"><i style="width:${pct}%"></i><em>${Math.ceil(value)}/${max}</em></div>`;
  }

  renderQueue(e) {
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
  updateLive(sel) {
    if (sel.length === 1) {
      const e = sel[0];
      const hp = this.selBody.querySelector('.bar.hp');
      if (hp && e.maxHp) {
        const pct = Math.max(0, Math.min(100, (e.hp / e.maxHp) * 100));
        hp.querySelector('i').style.width = `${pct}%`;
        hp.querySelector('em').textContent = `${Math.ceil(e.hp)}/${e.maxHp}`;
      }
      if (e.kind === 'building' && !e.built) {
        const role = this.selBody.querySelector('.role');
        if (role) role.textContent = `Em construção ${Math.floor(e.progress * 100)}%`;
      }
      if (e.kind === 'building' && e.built && e.queue.length) {
        const first = this.selQueue.querySelector('i[data-q="0"]');
        const def = UNITS[e.queue[0].type];
        if (first) first.style.width = `${Math.min(100, (e.queue[0].elapsed / def.time) * 100)}%`;
      }
    }
  }

  // ---------- Grade de comandos ----------

  buildGrid() {
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

  clickSlot(i) {
    const cmd = this.commands[i];
    if (!cmd || !cmd.enabled()) {
      if (cmd && cmd.reason) this.toast(cmd.reason(), 'bad');
      this.game.sound.play('error');
      return;
    }
    this.game.sound.play('click');
    cmd.run();
  }

  buildCommands(sel) {
    const g = this.game;
    const own = sel.filter((e) => e.owner === 0);
    const units = own.filter((e) => e.kind === 'unit');
    const civil = units.filter((u) => UNITS[u.type].civil);
    const military = units.filter((u) => !UNITS[u.type].civil);
    const buildings = own.filter((e) => e.kind === 'building');
    const cmds = [];

    if (units.length > 0 && units.length === own.length) {
      if (civil.length) {
        for (const t of BUILD_MENU) {
          const def = BUILDINGS[t];
          cmds.push({
            key: BUILD_KEYS[t],
            label: def.name,
            icon: t,
            cost: def.cost,
            tip: `${def.name} — ${costText(def.cost)}`,
            enabled: () => g.sim.canAfford(0, def.cost),
            reason: () => 'Recursos insuficientes',
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
            key: TRAIN_KEYS[t],
            label: u.name,
            icon: t,
            cost: u.cost,
            tip: `${u.name} — ${costText(u.cost)} · ${u.time}s`,
            enabled: () => g.sim.canAfford(0, u.cost) && b.queue.length < MAX_QUEUE && g.sim.popUsed(0) < g.sim.popCap(0),
            reason: () => {
              if (b.queue.length >= MAX_QUEUE) return 'Fila cheia';
              if (g.sim.popUsed(0) >= g.sim.popCap(0)) return 'População máxima — construa casas';
              return 'Recursos insuficientes';
            },
            run: () => {
              const r = g.sim.train(0, b.id, t);
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
          run: () => g.sim.cancelTraining(0, b.id),
        });
      }
    }

    this.commands = cmds;
    this.buttons.forEach((btn, i) => {
      const cmd = cmds[i];
      btn.className = cmd ? 'cmd' : 'cmd empty';
      btn.disabled = !cmd;
      btn.innerHTML = cmd ? `
        <span class="icon ${cmd.icon}">${iconGlyph(cmd.icon)}</span>
        <span class="label">${cmd.label}</span>
        ${cmd.key ? `<kbd>${cmd.key === 'delete' ? 'Del' : cmd.key.toUpperCase()}</kbd>` : ''}
        ${cmd.cost ? `<span class="cost">${costHtml(cmd.cost)}</span>` : ''}` : '';
      btn.title = cmd ? cmd.tip : '';
    });
  }

  updateButtons() {
    this.commands.forEach((cmd, i) => {
      const btn = this.buttons[i];
      if (btn) btn.classList.toggle('unavailable', !cmd.enabled());
    });
  }

}

function iconGlyph(icon) {
  const glyphs = {
    house: '⌂', storehouse: '▦', farm: '✿', barracks: '⚔', stable: '♞',
    villager: '☺', swordsman: '🗡', archer: '➹', scout: '➤',
    attack: '⚔', stop: '■', cancel: '✕',
  };
  return glyphs[icon] || '•';
}
