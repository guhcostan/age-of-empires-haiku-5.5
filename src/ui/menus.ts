// Menus: principal, partida rápida (configurações), ajuda, opções, pausa e tela final.
import { DIFFICULTY } from '../core/config.ts';
import { $ } from './dom.ts';
import type { Game, EndInfo } from '../game.ts';
import type { DifficultyKey, MapSizeKey, Settings } from '../types.ts';

const SETUP_KEY = 'aoe.setup';
const DEFAULTS: Settings = { size: 'medio', bots: 1, difficulty: 'normal', seed: '', wonderVictory: false };

type ScreenName = 'main' | 'setup' | 'help' | 'options';
const SCREEN_NAMES: ScreenName[] = ['main', 'setup', 'help', 'options'];

function loadSetup(): Settings {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(SETUP_KEY) || '{}') as Partial<Settings>) };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSetup(setup: Settings): void {
  try {
    localStorage.setItem(SETUP_KEY, JSON.stringify(setup));
  } catch {
    // Sem armazenamento disponível: as escolhas valem só nesta sessão.
  }
}

function formatTime(seconds: number): string {
  const s = Math.floor(seconds);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// Valor marcado num grupo de rádio do formulário de partida.
function checkedValue(name: string): string | undefined {
  return document.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value;
}

export class Menus {
  game: Game;
  setup: Settings;
  lastStart: Settings | null = null;
  screens: Record<ScreenName, HTMLElement>;

  constructor(game: Game) {
    this.game = game;
    this.setup = loadSetup();
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

  bind(): void {
    document.querySelectorAll<HTMLElement>('[data-go]').forEach((b) => {
      b.addEventListener('click', () => {
        const target = b.dataset.go as ScreenName | undefined;
        if (target) this.showScreen(target);
      });
    });
    $('btn-play').addEventListener('click', () => this.showScreen('setup'));
    $('btn-continue').addEventListener('click', () => this.continueGame());
    $('btn-start').addEventListener('click', () => this.startGame());
    const volume = $<HTMLInputElement>('volume');
    volume.addEventListener('input', () => this.game.sound.setVolume(Number(volume.value) / 100));
    volume.value = String(Math.round(this.game.sound.volume * 100));

    $('btn-resume').addEventListener('click', () => this.game.resume());
    $('btn-pause-help').addEventListener('click', () => this.openHelpFromPause());
    $('btn-pause-quit').addEventListener('click', () => this.game.quit());
    $('btn-again').addEventListener('click', () => this.restart());
    $('btn-end-menu').addEventListener('click', () => this.game.quit());
    $('btn-menu-hud').addEventListener('click', () => this.game.togglePause());
  }

  showScreen(name: ScreenName): void {
    for (const key of SCREEN_NAMES) this.screens[key].classList.toggle('hidden', key !== name);
    $('menus').classList.remove('hidden');
    $('overlay-pause').classList.add('hidden');
    $('overlay-end').classList.add('hidden');
    this.refreshContinue();
  }

  refreshContinue(): void {
    const running = this.game.running && !this.game.ended;
    $('btn-continue').classList.toggle('hidden', !running);
  }

  continueGame(): void {
    $('menus').classList.add('hidden');
    this.game.resume();
  }

  readSetupForm(): Settings {
    return {
      size: (checkedValue('size') as MapSizeKey | undefined) || DEFAULTS.size,
      bots: Number(checkedValue('bots') || DEFAULTS.bots),
      difficulty: (checkedValue('difficulty') as DifficultyKey | undefined) || DEFAULTS.difficulty,
      seed: $<HTMLInputElement>('seed').value.trim(),
      wonderVictory: $<HTMLInputElement>('victory-wonder').checked,
    };
  }

  syncSetupForm(): void {
    const set = (name: string, value: string): void => {
      const input = document.querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"]`);
      if (input) input.checked = true;
    };
    set('size', this.setup.size);
    set('bots', String(this.setup.bots));
    set('difficulty', this.setup.difficulty);
    $<HTMLInputElement>('seed').value = String(this.setup.seed);
    $<HTMLInputElement>('victory-wonder').checked = Boolean(this.setup.wonderVictory);
  }

  startGame(): void {
    const settings = this.readSetupForm();
    if (!settings.seed) settings.seed = String(Math.floor(Math.random() * 1e9));
    this.setup = { ...settings, seed: $<HTMLInputElement>('seed').value.trim() };
    saveSetup(this.setup);
    this.lastStart = settings;
    this.launch(settings);
  }

  restart(): void {
    if (this.lastStart) this.launch(this.lastStart);
  }

  launch(settings: Settings): void {
    $('menus').classList.add('hidden');
    $('overlay-pause').classList.add('hidden');
    $('overlay-end').classList.add('hidden');
    this.game.start(settings);
  }

  openHelpFromPause(): void {
    $('overlay-pause').classList.add('hidden');
    $('menus').classList.remove('hidden');
    for (const key of SCREEN_NAMES) this.screens[key].classList.toggle('hidden', key !== 'help');
  }

  // ---------- Hooks do jogo ----------

  onPause(paused: boolean): void {
    if (paused) {
      $('menus').classList.add('hidden');
      $('overlay-pause').classList.remove('hidden');
    } else {
      $('overlay-pause').classList.add('hidden');
      $('menus').classList.add('hidden');
    }
  }

  onEnd(info: EndInfo): void {
    const title = $('end-title');
    title.textContent = info.won ? 'Vitória!' : 'Derrota';
    title.className = info.won ? 'win' : 'lose';
    const s = info.stats;
    const g = s.gathered;
    const rows: [string, string | number][] = [
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

  onQuit(): void {
    $('overlay-pause').classList.add('hidden');
    $('overlay-end').classList.add('hidden');
    this.showScreen('main');
  }
}
