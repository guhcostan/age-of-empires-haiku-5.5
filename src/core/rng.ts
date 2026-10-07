// Gerador pseudoaleatório determinístico (mulberry32): a mesma semente gera o mesmo mapa.
export interface Rng {
  // Número em [0, 1).
  next: () => number;
  // Número em [a, b).
  float: (a: number, b: number) => number;
  // Inteiro em [a, b] (inclusive).
  int: (a: number, b: number) => number;
  pick: <T>(arr: readonly T[]) => T;
}

export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    float: (a, b) => a + (b - a) * next(),
    int: (a, b) => a + Math.floor(next() * (b - a + 1)),
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)],
  };
}

// Transforma um texto (semente digitada pelo jogador) em número de 32 bits.
export function seedFromString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
