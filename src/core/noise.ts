// Ruído de valor 2D com fBm. Usado para terreno, lagos e florestas.
import type { Rng } from './rng.ts';

export interface Noise {
  noise: (x: number, y: number) => number;
  fbm: (x: number, y: number, octaves?: number) => number;
}

export function createNoise(rng: Rng): Noise {
  const SIZE = 256;
  const table = new Float32Array(SIZE * SIZE);
  for (let i = 0; i < table.length; i++) table[i] = rng.next();

  const smooth = (t: number): number => t * t * (3 - 2 * t);

  function noise(x: number, y: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const tx = smooth(x - xi);
    const ty = smooth(y - yi);
    const x0 = xi & 255;
    const y0 = yi & 255;
    const x1 = (x0 + 1) & 255;
    const y1 = (y0 + 1) & 255;
    const a = table[y0 * SIZE + x0];
    const b = table[y0 * SIZE + x1];
    const c = table[y1 * SIZE + x0];
    const d = table[y1 * SIZE + x1];
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  }

  // Soma de oitavas, normalizada para ficar em [0, 1].
  function fbm(x: number, y: number, octaves = 4): number {
    let sum = 0;
    let amp = 0.5;
    let freq = 1;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amp * noise(x * freq, y * freq);
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return sum / norm;
  }

  return { noise, fbm };
}
