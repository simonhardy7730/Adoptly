// Statistiques : note globale par poste, normes par âge, progression et plafonds de potentiel.

import type { AttrKey, Attributes, GameState, Position } from './types';
import { ageAt } from './calendar';
import { clamp } from './rng';

export const ATTR_KEYS: AttrKey[] = [
  'technique', 'passing', 'dribbling', 'shooting', 'vision', 'defending', 'speed', 'stamina', 'strength', 'tactics', 'mental', 'discipline', 'reflexes',
];

export const POSITION_WEIGHTS: Record<Position, Partial<Record<AttrKey, number>>> = {
  GK: { reflexes: 0.46, tactics: 0.12, mental: 0.12, passing: 0.07, strength: 0.08, speed: 0.05, discipline: 0.05, technique: 0.05 },
  DEF: { defending: 0.3, strength: 0.14, speed: 0.12, tactics: 0.14, passing: 0.08, stamina: 0.08, mental: 0.07, technique: 0.07 },
  MID: { passing: 0.2, vision: 0.16, technique: 0.14, tactics: 0.12, stamina: 0.1, dribbling: 0.08, defending: 0.08, mental: 0.06, shooting: 0.06 },
  ATT: { shooting: 0.26, speed: 0.16, dribbling: 0.14, technique: 0.14, mental: 0.08, vision: 0.06, strength: 0.06, passing: 0.05, tactics: 0.05 },
};

export function overall(attrs: Attributes, pos: Position): number {
  const w = POSITION_WEIGHTS[pos];
  let sum = 0;
  let tw = 0;
  for (const k of Object.keys(w) as AttrKey[]) {
    sum += attrs[k] * (w[k] ?? 0);
    tw += w[k] ?? 0;
  }
  return sum / tw;
}

export function playerOverall(s: GameState): number {
  return overall(s.player.attrs, s.identity.position);
}

/** Niveau moyen attendu d'un joueur de cet âge dans un club de ce niveau. */
export function ageNorm(age: number, tier: number): number {
  const base = age <= 18 ? 18 + (age - 8) * 4.6 : Math.min(72, 64 + (age - 18) * 1.4);
  const offset = [0, -4, 0, 5, 9][tier] ?? 0;
  return base + offset;
}

/** Courbe de maturation : part du potentiel accessible à un âge donné. */
export function ageCurve(age: number): number {
  return clamp(0.36 + (age - 8) * 0.064, 0.3, 1);
}

export function potentialCap(potential: number, age: number): number {
  return potential * ageCurve(age);
}

/** Facteur de marge de progression : plus on est loin de son plafond actuel, plus on progresse vite. */
export function headroom(s: GameState): number {
  const cap = potentialCap(s.player.potential, ageAt(s));
  return clamp(0.35 + (cap - playerOverall(s)) / 12, 0.03, 1.5);
}

export type TrainingFocus = 'technique' | 'physical' | 'tactical' | 'finishing' | 'defense' | 'goalkeeping' | 'mental';

export const FOCUS_SPLIT: Record<TrainingFocus, Partial<Record<AttrKey, number>>> = {
  technique: { technique: 0.4, dribbling: 0.35, passing: 0.25 },
  physical: { speed: 0.3, stamina: 0.4, strength: 0.3 },
  tactical: { tactics: 0.45, vision: 0.35, passing: 0.2 },
  finishing: { shooting: 0.6, technique: 0.25, mental: 0.15 },
  defense: { defending: 0.6, strength: 0.2, tactics: 0.2 },
  goalkeeping: { reflexes: 0.7, mental: 0.15, passing: 0.15 },
  mental: { mental: 0.5, discipline: 0.3, tactics: 0.2 },
};

/**
 * Applique un gain d'entraînement. `amount` ~ 1 pour une séance normale.
 * Retourne les gains réellement appliqués (pour l'affichage).
 */
export function applyTraining(s: GameState, focus: TrainingFocus, amount: number): Partial<Record<AttrKey, number>> {
  const p = s.player;
  const age = ageAt(s);
  const energyF = clamp(p.energy / 80, 0.35, 1.1);
  const moraleF = 0.8 + p.morale / 400;
  const disciplineF = 0.85 + p.attrs.discipline / 350;
  const formF = 0.85 + p.form / 600;
  const isPhysical = focus === 'physical';
  // Les plus jeunes apprennent vite la technique, le physique se développe à l'adolescence.
  const ageF = isPhysical ? (age < 12 ? 0.55 : age <= 18 ? 1.1 : age <= 28 ? 0.8 : 0.5) : age < 13 ? 1.2 : age <= 18 ? 1 : age <= 28 ? 0.7 : 0.45;
  const h = headroom(s);
  const total = 1.15 * amount * energyF * moraleF * disciplineF * formF * ageF * h;
  const gains: Partial<Record<AttrKey, number>> = {};
  const split = FOCUS_SPLIT[focus];
  // Plafond par attribut : on ne devient pas un génie technique à 12 ans en ne faisant que ça.
  const attrCap = potentialCap(p.potential, age) + 14;
  for (const k of Object.keys(split) as AttrKey[]) {
    const cur = p.attrs[k];
    const diminishing = (cur > 85 ? 0.35 : cur > 75 ? 0.65 : 1) * (cur > attrCap ? 0.04 : cur > attrCap - 6 ? 0.4 : 1);
    const coachFocus = s.membership?.coach?.focus && s.membership.coach.focus.until >= s.t && s.membership.coach.focus.attr === k ? 1.3 : 1;
    const g = total * (split[k] ?? 0) * diminishing * coachFocus;
    p.attrs[k] = clamp(cur + g, 1, 99);
    gains[k] = g;
  }
  return gains;
}

/** Croissance naturelle mensuelle liée à l'âge (puberté, puis déclin après 30 ans). */
export function naturalGrowth(s: GameState) {
  const age = ageAt(s);
  const p = s.player;
  const hMul = s.appearance.heightClass === 'tall' ? 1.15 : s.appearance.heightClass === 'small' ? 0.85 : 1;
  const bMul = s.appearance.build === 'strong' ? 1.15 : s.appearance.build === 'slim' ? 0.88 : 1;
  const cap = potentialCap(p.potential, age) + 2;
  const ovr = overall(p.attrs, s.identity.position);
  const grow = (k: AttrKey, v: number) => {
    if (v > 0 && (p.attrs[k] > cap + 8 || ovr > cap)) return;
    p.attrs[k] = clamp(p.attrs[k] + v, 1, 99);
  };
  if (age >= 12 && age <= 18) {
    grow('strength', 0.32 * hMul * bMul);
    grow('speed', 0.18 * (s.appearance.build === 'slim' ? 1.1 : 1));
    grow('stamina', 0.2);
    grow('mental', 0.08);
    grow('tactics', 0.06);
  } else if (age < 12) {
    grow('speed', 0.08);
    grow('stamina', 0.08);
    grow('tactics', 0.05);
  } else if (age >= 30) {
    const d = age >= 33 ? 0.45 : 0.22;
    grow('speed', -d);
    grow('stamina', -d * 0.8);
    grow('strength', -d * 0.4);
    grow('tactics', 0.05);
    grow('mental', 0.05);
  }
}

/** Estimation du potentiel par les recruteurs : plus précise avec l'âge. */
export function potentialEstimate(s: GameState): { stars: number; low: number; high: number; label: string } {
  const age = ageAt(s);
  const spread = Math.max(4, 18 - age);
  // Décalage stable dans le temps (dépend de l'identité, pas du hasard courant).
  const seed = (s.identity.firstName.length * 7 + s.identity.lastName.length * 3) % 7 - 3;
  const center = s.player.potential + seed * (spread / 9);
  const low = Math.round(clamp(center - spread / 2, 30, 99));
  const high = Math.round(clamp(center + spread / 2, 30, 99));
  const stars = Math.round(((low + high) / 2 - 35) / 12 * 2) / 2;
  const label = high >= 88 ? 'Pépite rare' : high >= 80 ? 'Très prometteur' : high >= 70 ? 'Prometteur' : high >= 60 ? 'Intéressant' : 'À confirmer';
  return { stars: clamp(stars, 0.5, 5), low, high, label };
}

export function attrDelta(before: Attributes, after: Attributes): Partial<Record<AttrKey, number>> {
  const d: Partial<Record<AttrKey, number>> = {};
  for (const k of ATTR_KEYS) {
    const v = after[k] - before[k];
    if (Math.abs(v) >= 0.05) d[k] = v;
  }
  return d;
}
