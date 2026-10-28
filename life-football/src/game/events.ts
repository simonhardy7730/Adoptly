// Moteur d'événements narratifs réutilisable.
// Un événement = titre, texte, personnage, conditions de déclenchement, choix avec effets
// (immédiats ou différés). Le catalogue vit dans content/events.ts.

import type { GameState, Npc } from './types';
import { ageAt } from './calendar';
import { applyEffects, describeEffects, REL_LABELS, type Effects } from './helpers';
import { chance, weightedIndex } from './rng';
import { ATTR_LABELS } from '../content/profiles';

export type EventData = Record<string, string | number>;

export interface EventChoice {
  id: string;
  label: string;
  hint?: string; // enjeux annoncés au joueur
  effects?: Effects;
  unavailable?: (s: GameState, d: EventData) => string | null;
  run?: (s: GameState, d: EventData) => string | void;
  result: string | ((s: GameState, d: EventData) => string);
}

export interface GameEvent {
  id: string;
  title: string | ((s: GameState, d: EventData) => string);
  icon: string;
  category: 'enfance' | 'école' | 'famille' | 'club' | 'social' | 'santé' | 'média' | 'sponsor' | 'sélection' | 'amour' | 'carrière';
  npc?: Npc['role'];
  text: (s: GameState, d: EventData) => string;
  /** Événement tiré au hasard chaque semaine si les conditions sont remplies. */
  random?: boolean;
  minAge?: number;
  maxAge?: number;
  when?: (s: GameState) => boolean;
  weight?: number | ((s: GameState) => number);
  once?: boolean;
  cooldown?: number; // semaines minimum entre deux occurrences
  choices: EventChoice[] | ((s: GameState, d: EventData) => EventChoice[]);
}

let CATALOG: GameEvent[] = [];

export function registerEvents(events: GameEvent[]) {
  CATALOG = events;
}

export function getEvent(id: string): GameEvent | undefined {
  return CATALOG.find((e) => e.id === id);
}

export function allEvents() {
  return CATALOG;
}

export function lastOccurrence(s: GameState, id: string): number {
  const h = s.events.history.find((x) => x.id === id);
  return h ? h.t : -9999;
}

export function isEligible(s: GameState, e: GameEvent): boolean {
  const age = ageAt(s);
  if (e.minAge !== undefined && age < e.minAge) return false;
  if (e.maxAge !== undefined && age > e.maxAge) return false;
  if (e.once && s.events.history.some((h) => h.id === e.id)) return false;
  if (e.cooldown && s.t - lastOccurrence(s, e.id) < e.cooldown) return false;
  if (s.events.pending.some((p) => p.eventId === e.id)) return false;
  if (e.when && !e.when(s)) return false;
  return true;
}

/** Ajoute les événements programmés arrivés à échéance + un éventuel événement aléatoire. */
export function rollEvents(s: GameState, randomChance = 0.5) {
  const due = s.events.scheduled.filter((x) => x.at <= s.t);
  s.events.scheduled = s.events.scheduled.filter((x) => x.at > s.t);
  for (const d of due) {
    const e = getEvent(d.eventId);
    if (e && (!e.when || e.when(s))) s.events.pending.push({ eventId: d.eventId, data: d.data });
  }
  if (s.events.pending.length >= 2) return;
  if (!chance(s, randomChance)) return;
  const pool = CATALOG.filter((e) => e.random && isEligible(s, e));
  if (!pool.length) return;
  // Pénalise les catégories vues récemment pour varier les situations.
  const recentCats = s.events.history.slice(0, 4).map((h) => getEvent(h.id)?.category);
  const weights = pool.map((e) => {
    const w = typeof e.weight === 'function' ? e.weight(s) : e.weight ?? 1;
    return recentCats.includes(e.category) ? w * 0.4 : w;
  });
  const idx = weightedIndex(s, weights);
  if (idx >= 0) s.events.pending.push({ eventId: pool[idx].id });
}

export function currentEvent(s: GameState) {
  const p = s.events.pending[0];
  if (!p) return null;
  const e = getEvent(p.eventId);
  if (!e) {
    s.events.pending.shift();
    return null;
  }
  return { event: e, data: p.data ?? {} };
}

export function choicesOf(s: GameState, e: GameEvent, d: EventData): EventChoice[] {
  return typeof e.choices === 'function' ? e.choices(s, d) : e.choices;
}

export function choiceStakes(c: EventChoice): string[] {
  const labels: Record<string, string> = { ...ATTR_LABELS, ...REL_LABELS };
  const list = c.effects ? describeEffects(c.effects, labels) : [];
  return c.hint ? [c.hint, ...list] : list;
}

/** Résout l'événement en tête de file avec le choix donné. */
export function resolveEvent(s: GameState, choiceId: string): { ok: boolean; message: string } {
  const cur = currentEvent(s);
  if (!cur) return { ok: false, message: 'Aucun événement.' };
  const choice = choicesOf(s, cur.event, cur.data).find((c) => c.id === choiceId);
  if (!choice) return { ok: false, message: 'Choix invalide.' };
  const reason = choice.unavailable?.(s, cur.data);
  if (reason) return { ok: false, message: reason };
  s.events.pending.shift();
  s.events.history.unshift({ id: cur.event.id, t: s.t });
  if (s.events.history.length > 200) s.events.history.length = 200;
  if (choice.effects) applyEffects(s, choice.effects);
  const custom = choice.run?.(s, cur.data);
  const base = typeof choice.result === 'function' ? choice.result(s, cur.data) : choice.result;
  return { ok: true, message: custom ? `${base} ${custom}` : base };
}

export function fill(text: string, d: EventData) {
  return text.replace(/\{(\w+)\}/g, (_, k) => String(d[k] ?? ''));
}
