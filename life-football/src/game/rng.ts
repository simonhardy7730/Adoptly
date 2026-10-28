// Générateur pseudo-aléatoire déterministe (mulberry32). L'état est stocké dans la partie
// pour que les simulations soient reproductibles et testables.

export interface RngHolder {
  rng: number;
}

export function nextFloat(h: RngHolder): number {
  h.rng = (h.rng + 0x6d2b79f5) | 0;
  let x = h.rng;
  x = Math.imul(x ^ (x >>> 15), x | 1);
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
}

export const rand = nextFloat;

export function randInt(h: RngHolder, min: number, max: number): number {
  return min + Math.floor(nextFloat(h) * (max - min + 1));
}

export function chance(h: RngHolder, p: number): boolean {
  return nextFloat(h) < p;
}

export function pick<T>(h: RngHolder, arr: readonly T[]): T {
  return arr[Math.floor(nextFloat(h) * arr.length)];
}

export function shuffle<T>(h: RngHolder, arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(nextFloat(h) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Tirage pondéré : retourne l'index choisi. */
export function weightedIndex(h: RngHolder, weights: number[]): number {
  const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (total <= 0) return -1;
  let r = nextFloat(h) * total;
  for (let i = 0; i < weights.length; i++) {
    r -= Math.max(0, weights[i]);
    if (r < 0) return i;
  }
  return weights.length - 1;
}

/** Bruit approximativement gaussien centré (somme de 3 uniformes). */
export function gauss(h: RngHolder, sd = 1): number {
  return ((nextFloat(h) + nextFloat(h) + nextFloat(h)) / 3 - 0.5) * 2 * sd * 1.7;
}

export function uid(h: RngHolder, prefix = 'id'): string {
  return `${prefix}_${Math.floor(nextFloat(h) * 1e9).toString(36)}`;
}

export const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));
export const round1 = (v: number) => Math.round(v * 10) / 10;
export const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
