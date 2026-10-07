// Efeitos sonoros sintetizados com WebAudio (sem arquivos de áudio).
const VOLUME_KEY = 'aoe.volume';

function loadVolume() {
  try {
    const v = Number(localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(v) && localStorage.getItem(VOLUME_KEY) !== null ? v : 0.6;
  } catch {
    return 0.6;
  }
}

export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.volume = loadVolume();
    this.last = {};
    this.noiseBuffer = null;
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    try {
      localStorage.setItem(VOLUME_KEY, String(this.volume));
    } catch {
      // Sem armazenamento: a preferência vale só nesta sessão.
    }
    if (this.master) this.master.gain.value = this.volume;
  }

  ensure() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.volume;
        this.master.connect(this.ctx.destination);
      } catch {
        return false;
      }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  tone(freq, dur, type = 'sine', vol = 0.2, slide = 0, delay = 0) {
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise(dur, vol, freq) {
    if (!this.noiseBuffer) {
      const len = Math.floor(this.ctx.sampleRate * 0.5);
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0008, this.ctx.currentTime + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start();
    src.stop(this.ctx.currentTime + dur);
  }

  play(name) {
    if (this.volume <= 0 || !this.ensure()) return;
    const now = performance.now();
    const gap = { hit: 90, shot: 90, death: 140 }[name] ?? 60;
    if (this.last[name] && now - this.last[name] < gap) return;
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
