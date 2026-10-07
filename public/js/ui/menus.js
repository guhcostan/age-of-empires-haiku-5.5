// Menus: principal, partida rápida (configurações), ajuda, opções, pausa e tela final.
import { DIFFICULTY } from '../core/config.js';

const SETUP_KEY = 'aoe.setup';
const DEFAULTS = { size: 'medio', bots: 1, difficulty: 'normal', seed: '' };
const $ = (id) => document.getElementById(id);

function loadSetup() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETUP_KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSetup(setup) {
  try {
    localStorage.setItem(SETUP_KEY, JSON.stringify(setup));
  } catch {
    // Sem armazenamento disponível: as escolhas valem só nesta sessão.
  }
}

function formatTime(seconds) {
  const s = Math.floor(seconds);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export class Menus {
  constructor(game) {
    this.game = game;
    this.setup = loadSetup();
    this.lastStart = null;
    this.screens = {
      main: $('screen-main'),
      setup: $('screen-setup'),
      help: $('screen-help'),
      options: $('screen-options'),
    };
    this.bind();
    this.syncSetupForm();
    this.showScreen('main');
    this.refreshContinue();
  }

  bind() {
    document.querySelectorAll('[data-go]').forEach((b) => {
      b.addEventListener('click', () => this.showScreen(b.dataset.go));
    });
    $('btn-play').addEventListener('click', () => this.showScreen('setup'));
    $('btn-continue').addEventListener('click', () => this.continueGame());
    $('btn-start').addEventListener('click', () => this.startGame());
    $('volume').addEventListener('input', (e) => this.game.sound.setVolume(Number(e.target.value) / 100));
    $('volume').value = Math.round(this.game.sound.volume * 100);

    $('btn-resume').addEventListener('click', () => this.game.resume());
    $('btn-pause-help').addEventListener('click', () => this.openHelpFromPause());
    $('btn-pause-quit').addEventListener('click', () => this.game.quit());
    $('btn-again').addEventListener('click', () => this.restart());
    $('btn-end-menu').addEventListener('click', () => this.game.quit());
    $('btn-menu-hud').addEventListener('click', () => this.game.togglePause());
  }

  showScreen(name) {
    for (const [key, el] of Object.entries(this.screens)) el.classList.toggle('hidden', key !== name);
    $('menus').classList.remove('hidden');
    $('overlay-pause').classList.add('hidden');
    $('overlay-end').classList.add('hidden');
    this.refreshContinue();
  }

  refreshContinue() {
    const running = this.game.running && !this.game.ended;
    $('btn-continue').classList.toggle('hidden', !running);
  }

  continueGame() {
    $('menus').classList.add('hidden');
    this.game.resume();
  }

  readSetupForm() {
    const pick = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value;
    return {
      size: pick('size') || DEFAULTS.size,
      bots: Number(pick('bots') || DEFAULTS.bots),
      difficulty: pick('difficulty') || DEFAULTS.difficulty,
      seed: $('seed').value.trim(),
    };
  }

  syncSetupForm() {
    const set = (name, value) => {
      const input = document.querySelector(`input[name="${name}"][value="${value}"]`);
      if (input) input.checked = true;
    };
    set('size', this.setup.size);
    set('bots', String(this.setup.bots));
    set('difficulty', this.setup.difficulty);
    $('seed').value = this.setup.seed;
  }

  startGame() {
    const settings = this.readSetupForm();
    if (!settings.seed) settings.seed = String(Math.floor(Math.random() * 1e9));
    this.setup = { ...settings, seed: $('seed').value.trim() };
    saveSetup(this.setup);
    this.lastStart = settings;
    this.launch(settings);
  }

  restart() {
    if (this.lastStart) this.launch(this.lastStart);
  }

  launch(settings) {
    $('menus').classList.add('hidden');
    $('overlay-pause').classList.add('hidden');
    $('overlay-end').classList.add('hidden');
    this.game.start(settings);
  }

  openHelpFromPause() {
    $('overlay-pause').classList.add('hidden');
    $('menus').classList.remove('hidden');
    for (const [key, el] of Object.entries(this.screens)) el.classList.toggle('hidden', key !== 'help');
  }

  // ---------- Hooks do jogo ----------

  onPause(paused) {
    if (paused) {
      $('menus').classList.add('hidden');
      $('overlay-pause').classList.remove('hidden');
    } else {
      $('overlay-pause').classList.add('hidden');
      $('menus').classList.add('hidden');
    }
  }

  onEnd(info) {
    const title = $('end-title');
    title.textContent = info.won ? 'Vitória!' : 'Derrota';
    title.className = info.won ? 'win' : 'lose';
    const s = info.stats;
    const g = s.gathered;
    const rows = [
      ['Tempo de partida', formatTime(info.time)],
      ['Dificuldade', DIFFICULTY[info.difficulty].name],
      ['Inimigos abatidos', s.kills],
      ['Unidades perdidas', s.lost],
      ['Edifícios destruídos', s.destroyed],
      ['Edifícios construídos', s.built],
      ['Unidades treinadas', s.trained],
      ['Comida coletada', g.food],
      ['Madeira coletada', g.wood],
      ['Ouro coletado', g.gold],
      ['Pedra coletada', g.stone],
      ['Semente do mapa', info.seed],
    ];
    $('end-stats').innerHTML = rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
    $('menus').classList.add('hidden');
    $('overlay-pause').classList.add('hidden');
    $('overlay-end').classList.remove('hidden');
  }

  onQuit() {
    $('overlay-pause').classList.add('hidden');
    $('overlay-end').classList.add('hidden');
    this.showScreen('main');
  }
}

