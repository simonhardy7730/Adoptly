// Fonctions utilitaires partagées par tous les systèmes : notifications, journal, argent, effets.

import type { AttrKey, GameState, Npc, Reputation, TxCategory } from './types';
import { clamp, uid } from './rng';

export function clone<T>(v: T): T {
  return structuredClone(v);
}

export function notify(s: GameState, kind: GameState['notifications'][number]['kind'], title: string, body: string) {
  s.notifications.unshift({ id: uid(s, 'n'), t: s.t, kind, title, body, read: false });
  if (s.notifications.length > 60) s.notifications.length = 60;
}

export function journal(s: GameState, text: string, icon = '•', major = false) {
  s.journal.unshift({ t: s.t, text, icon, major });
  if (s.journal.length > 400) s.journal.length = 400;
}

/** Mouvement d'argent. Les montants sont arrondis au centime ; jamais de NaN. */
export function addMoney(s: GameState, amount: number, category: TxCategory, label: string) {
  if (!Number.isFinite(amount) || amount === 0) return;
  const a = Math.round(amount * 100) / 100;
  s.money = Math.round((s.money + a) * 100) / 100;
  s.ledger.unshift({ t: s.t, amount: a, category, label });
  if (s.ledger.length > 600) s.ledger.length = 600;
}

export function canAfford(s: GameState, amount: number) {
  return s.money >= amount;
}

export function npcByRole(s: GameState, role: Npc['role']): Npc | undefined {
  return s.npcs.find((n) => n.role === role);
}

export function changeRelation(s: GameState, role: Npc['role'] | string, delta: number) {
  const n = s.npcs.find((x) => x.role === role || x.id === role);
  if (n) n.relation = clamp(n.relation + delta);
}

export function flag(s: GameState, key: string): number {
  return s.events.flags[key] ?? 0;
}

export function setFlag(s: GameState, key: string, v = 1) {
  s.events.flags[key] = v;
}

export interface Effects {
  attrs?: Partial<Record<AttrKey, number>>;
  energy?: number;
  morale?: number;
  form?: number;
  nutrition?: number;
  school?: number;
  potential?: number;
  money?: number;
  moneyLabel?: string;
  moneyCat?: TxCategory;
  rel?: Partial<Record<Npc['role'], number>>;
  rep?: Partial<Record<keyof Reputation, number>>;
  flags?: Record<string, number>;
  injury?: { name: string; weeks: number; severity: 1 | 2 | 3 };
  schedule?: { eventId: string; inWeeks: number };
  journal?: string;
}

export function applyEffects(s: GameState, e: Effects) {
  const p = s.player;
  if (e.attrs) for (const [k, v] of Object.entries(e.attrs)) p.attrs[k as AttrKey] = clamp(p.attrs[k as AttrKey] + (v ?? 0), 1, 99);
  if (e.energy) p.energy = clamp(p.energy + e.energy);
  if (e.morale) p.morale = clamp(p.morale + e.morale);
  if (e.form) p.form = clamp(p.form + e.form);
  if (e.nutrition) p.nutrition = clamp(p.nutrition + e.nutrition);
  if (e.school) p.school.grade = clamp(p.school.grade + e.school, 0, 20);
  if (e.potential) p.potential = clamp(p.potential + e.potential, 35, 97);
  if (e.money) addMoney(s, e.money, e.moneyCat ?? (e.money > 0 ? 'gift' : 'leisure'), e.moneyLabel ?? 'Événement');
  if (e.rel) for (const [role, v] of Object.entries(e.rel)) changeRelation(s, role, v ?? 0);
  if (e.rep) applyRep(s, e.rep);
  if (e.flags) for (const [k, v] of Object.entries(e.flags)) s.events.flags[k] = (s.events.flags[k] ?? 0) + v;
  if (e.injury && !p.injury) {
    p.injury = { name: e.injury.name, weeksLeft: e.injury.weeks, severity: e.injury.severity };
    notify(s, 'injury', 'Blessure', `${e.injury.name} — indisponible environ ${e.injury.weeks} semaine(s).`);
  }
  if (e.schedule) s.events.scheduled.push({ eventId: e.schedule.eventId, at: s.t + e.schedule.inWeeks });
  if (e.journal) journal(s, e.journal);
}

export function applyRep(s: GameState, rep: Partial<Record<keyof Reputation, number>>) {
  const r = s.reputation;
  for (const [k, v] of Object.entries(rep) as [keyof Reputation, number][]) {
    if (k === 'followers') r.followers = Math.max(0, Math.round(r.followers + v));
    // Rendements décroissants : plus on est haut, plus il est dur de progresser.
    else r[k] = clamp(r[k] + (v > 0 && k !== 'sponsorCred' ? v * (1 - r[k] / 110) : v));
  }
}

/** Description lisible d'un ensemble d'effets (pour montrer les enjeux / conséquences). */
export function describeEffects(e: Effects, labels: Record<string, string>): string[] {
  const out: string[] = [];
  const sign = (v: number) => (v > 0 ? `+${Math.round(v * 10) / 10}` : `${Math.round(v * 10) / 10}`);
  if (e.attrs) for (const [k, v] of Object.entries(e.attrs)) out.push(`${labels[k] ?? k} ${sign(v ?? 0)}`);
  if (e.energy) out.push(`Énergie ${sign(e.energy)}`);
  if (e.morale) out.push(`Moral ${sign(e.morale)}`);
  if (e.form) out.push(`Forme ${sign(e.form)}`);
  if (e.school) out.push(`Notes ${sign(e.school)}`);
  if (e.money) out.push(`${e.money > 0 ? '+' : ''}${e.money} €`);
  if (e.rel) for (const [k, v] of Object.entries(e.rel)) out.push(`${labels[k] ?? k} ${sign(v ?? 0)}`);
  if (e.rep) for (const [k, v] of Object.entries(e.rep)) out.push(`${labels[k] ?? k} ${sign(v ?? 0)}`);
  return out;
}

export const REL_LABELS: Record<string, string> = {
  parent: 'Relation parent',
  parent2: 'Relation parent',
  sibling: 'Fratrie',
  friend: 'Meilleur ami',
  coach: 'Entraîneur',
  rival: 'Rival',
  teammate: 'Coéquipier',
  crush: 'Relation amoureuse',
  mentor: 'Mentor',
  sport: 'Réputation sportive',
  popularity: 'Popularité',
  fanImage: 'Image supporters',
  sponsorCred: 'Crédibilité marques',
  media: 'Présence médiatique',
  followers: 'Abonnés',
};
