// Efeitos sonoros sintetizados com WebAudio (sem arquivos de áudio).
const VOLUME_KEY = 'aoe.volume';

export type SoundName =
  | 'click' | 'error' | 'build' | 'ready' | 'good' | 'alarm' | 'shot' | 'hit' | 'death' | 'victory' | 'defeat';

// Intervalo mínimo entre dois sons iguais (evita rajadas de tiros e impactos).
const MIN_GAP_MS: Partial<Record<SoundName, number>> = { hit: 90, shot: 90, death: 140 };

interface WebkitWindow {
  webkitAudioContext?: typeof AudioContext;
}

function loadVolume(): number {
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    const v = Number(raw);
    return Number.isFinite(v) && raw !== null ? v : 0.6;
  } catch {
    return 0.6;
  }
}

export class Sound {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  volume: number;
  last: Partial<Record<SoundName, number>> = {};
  noiseBuffer: AudioBuffer | null = null;

  constructor() {
    this.volume = loadVolume();
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    try {
      localStorage.setItem(VOLUME_KEY, String(this.volume));
    } catch {
      // Sem armazenamento: a preferência vale só nesta sessão.
    }
    if (this.master) this.master.gain.value = this.volume;
  }

  ensure(): boolean {
    if (!this.ctx) {
      try {
        const AC: typeof AudioContext | undefined = window.AudioContext || (window as WebkitWindow).webkitAudioContext;
        if (!AC) return false;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.volume;
        this.master.connect(this.ctx.destination);
      } catch {
        return false;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return true;
  }

  tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.2, slide = 0, delay = 0): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise(dur: number, vol: number, freq: number): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    if (!this.noiseBuffer) {
      const len = Math.floor(ctx.sampleRate * 0.5);
      this.noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0008, ctx.currentTime + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
    src.stop(ctx.currentTime + dur);
  }

  play(name: SoundName): void {
    if (this.volume <= 0 || !this.ensure()) return;
    const now = performance.now();
    const gap = MIN_GAP_MS[name] ?? 60;
    const last = this.last[name];
    if (last !== undefined && now - last < gap) return;
    this.last[name] = now;
    switch (name) {
      case 'click': this.tone(880, 0.05, 'square', 0.04); break;
      case 'error': this.tone(180, 0.14, 'square', 0.05); break;
      case 'build':
        this.tone(392, 0.12, 'triangle', 0.16);
        this.tone(523, 0.12, 'triangle', 0.16, 0, 0.1);
        this.tone(659, 0.2, 'triangle', 0.16, 0, 0.2);
        break;
      case 'ready': this.tone(660, 0.14, 'triangle', 0.15); this.tone(990, 0.22, 'triangle', 0.15, 0, 0.12); break;
      case 'good': this.tone(523, 0.18, 'triangle', 0.2); this.tone(784, 0.3, 'triangle', 0.2, 0, 0.16); break;
      case 'alarm': this.tone(440, 0.18, 'square', 0.07); this.tone(330, 0.22, 'square', 0.07, 0, 0.2); break;
      case 'shot': this.noise(0.08, 0.05, 3200); break;
      case 'hit': this.noise(0.07, 0.12, 1400); break;
      case 'death': this.tone(260, 0.35, 'sawtooth', 0.06, -150); break;
      case 'victory':
        [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.18, 0, i * 0.18));
        break;
      case 'defeat':
        [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.45, 'sawtooth', 0.09, 0, i * 0.3));
        break;
      default: break;
    }
  }
}
