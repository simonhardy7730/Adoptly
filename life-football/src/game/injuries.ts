// Système médical : risque de blessure, blessures du catalogue, traitement, guérison par phases,
// reprise (risque de rechute), séquelles possibles, alertes musculaires.

import type { GameState, Injury, Treatment } from './types';
import { INJURIES, injuryType, type InjuryCause, type InjuryType } from '../content/injuries';
import { ageAt } from './calendar';
import { journal, notify } from './helpers';
import { chance, clamp, nextFloat, randInt, weightedIndex } from './rng';

export interface RiskFactor {
  label: string;
  mult: number;
}

const BASE: Record<InjuryCause, number> = { training: 0.004, match: 0.012, contact: 0.02, fatigue: 0.01 };

/** Risque de blessure pour une activité donnée, avec le détail des facteurs (affiché au joueur). */
export function injuryRisk(s: GameState, cause: InjuryCause, extra: RiskFactor[] = []): { p: number; factors: RiskFactor[] } {
  const p = s.player;
  const f: RiskFactor[] = [];
  if (p.energy < 25) f.push({ label: 'Épuisement', mult: 3 });
  else if (p.energy < 45) f.push({ label: 'Fatigue', mult: 1.6 });
  if (p.load > 80) f.push({ label: 'Surcharge de travail', mult: 1.9 });
  else if (p.load > 65) f.push({ label: 'Charge élevée', mult: 1.35 });
  if (p.boots.wear > 85) f.push({ label: 'Crampons usés', mult: 1.3 });
  if (p.returnUntil >= s.t) f.push({ label: 'Retour de blessure récent', mult: 1.7 });
  if ((s.events.flags.niggleHidden ?? 0) > 0) f.push({ label: 'Douleur cachée au staff', mult: 3 });
  const recent = p.injuryHistory.filter((h) => h.t > s.t - 30).length;
  if (recent >= 2) f.push({ label: 'Blessures à répétition', mult: 1.4 });
  const age = ageAt(s);
  if (age >= 31) f.push({ label: 'Âge', mult: 1.3 });
  if (p.nutrition < 45) f.push({ label: 'Alimentation déséquilibrée', mult: 1.2 });
  f.push(...extra);
  const robust = 1.15 - p.attrs.strength / 400 - p.attrs.stamina / 500; // un corps solide résiste mieux
  const mult = f.reduce((m, x) => m * x.mult, 1) * robust;
  return { p: clamp(BASE[cause] * mult, 0, 0.35), factors: f };
}

/** Choisit une blessure du catalogue selon la cause ; une zone déjà touchée récemment est plus fragile. */
export function pickInjury(s: GameState, cause: InjuryCause): InjuryType {
  const list = INJURIES.filter((i) => i.causes.includes(cause));
  const weights = list.map((i) => {
    const prior = s.player.injuryHistory.some((h) => h.part === i.part && h.t > s.t - 40);
    return i.weight * (prior ? 2 : 1) * (s.identity.position === 'GK' && i.part === 'épaule' ? 3 : 1);
  });
  const idx = weightedIndex(s, weights);
  return list[Math.max(0, idx)];
}

/** Applique une blessure au joueur. Retourne la blessure créée. */
export function inflictInjury(s: GameState, type: InjuryType | string, cause: string): Injury | null {
  const t = typeof type === 'string' ? injuryType(type) : type;
  if (!t || s.player.injury) return null;
  const club = s.membership ? s.clubs.find((c) => c.id === s.membership!.clubId) : undefined;
  const weeks = randInt(s, t.weeks[0], t.weeks[1]);
  const inj: Injury = { id: t.id, name: t.name, part: t.part, severity: t.severity, weeksLeft: weeks, weeksTotal: weeks, phase: 'repos', treatment: 'standard', cause, since: s.t };
  s.player.injury = inj;
  s.events.flags.niggleHidden = 0;
  s.player.morale = clamp(s.player.morale - t.severity * 6);
  notify(s, 'injury', t.severity >= 3 ? 'Blessure grave' : 'Blessure', `${t.name} (${cause}) : environ ${weeks} semaine(s) d’indisponibilité.`);
  journal(s, `Blessure : ${t.name} (${cause}), ${weeks} semaine(s).`, t.severity >= 3 ? '🚑' : '🩹', t.severity >= 2);
  // Diagnostic et choix du traitement pour les blessures sérieuses.
  if (t.severity >= 2) s.events.pending.push({ eventId: 'injury_diagnosis', data: { name: t.name, weeks, staff: club ? club.name : '' } });
  return inj;
}

/** Tire au sort une éventuelle blessure pour une activité. */
export function rollInjury(s: GameState, cause: InjuryCause, label: string, extra: RiskFactor[] = []): Injury | null {
  if (s.player.injury) return null;
  const { p } = injuryRisk(s, cause, extra);
  if (!chance(s, p)) return null;
  return inflictInjury(s, pickInjury(s, cause), label);
}

export const TREATMENTS: Record<Treatment, { label: string; speed: number; relapse: number; cost: number; desc: string }> = {
  standard: { label: 'Protocole du club', speed: 1, relapse: 1, cost: 0, desc: 'Le staff médical suit le protocole habituel.' },
  rushed: { label: 'Retour accéléré', speed: 1.35, relapse: 2.2, cost: 0, desc: 'Plus rapide, mais le risque de rechute double.' },
  specialist: { label: 'Spécialiste', speed: 1.2, relapse: 0.7, cost: 150, desc: 'Un spécialiste réduit la durée et le risque de rechute.' },
};

/** Guérison hebdomadaire : repos puis rééducation ; à la reprise, période de vulnérabilité. */
export function weeklyHeal(s: GameState): string | null {
  const p = s.player;
  const inj = p.injury;
  if (!inj) return null;
  const club = s.membership ? s.clubs.find((c) => c.id === s.membership!.clubId) : undefined;
  const medical = club ? 0.85 + club.facilities / 300 : 0.8; // qualité du staff médical
  const tr = TREATMENTS[inj.treatment ?? 'standard'];
  const rate = (0.7 + p.nutrition / 300 + (p.sleepMode === 'early' ? 0.1 : 0)) * medical * tr.speed;
  inj.weeksLeft = Math.round((inj.weeksLeft - rate) * 100) / 100;
  const total = inj.weeksTotal ?? Math.max(1, inj.weeksLeft);
  if (inj.phase === 'repos' && inj.weeksLeft <= total * 0.5) {
    inj.phase = 'rééducation';
    notify(s, 'info', 'Rééducation', `Tu passes en phase de rééducation (${inj.name}).`);
  }
  // Rechute pendant la rééducation pour un traitement accéléré.
  if (inj.phase === 'rééducation' && inj.treatment === 'rushed' && chance(s, 0.06)) {
    inj.weeksLeft += Math.ceil(total * 0.4);
    inj.treatment = 'standard';
    notify(s, 'injury', 'Rechute', `La douleur revient : ${inj.weeksLeft.toFixed(0)} semaine(s) supplémentaires.`);
    journal(s, `Rechute pendant la rééducation (${inj.name}).`, '😣', true);
    return 'Rechute pendant la rééducation.';
  }
  if (inj.weeksLeft > 0) return null;
  // Guérison
  const t = injuryType(inj.id);
  p.injuryHistory.unshift({ id: inj.id ?? 'other', name: inj.name, part: inj.part ?? 'cuisse', severity: inj.severity, weeks: total, t: s.t, cause: inj.cause ?? '' });
  if (p.injuryHistory.length > 30) p.injuryHistory.length = 30;
  p.returnUntil = s.t + (inj.severity >= 3 ? 6 : inj.severity === 2 ? 3 : 1) * TREATMENTS[inj.treatment ?? 'standard'].relapse;
  p.form = clamp(p.form - inj.severity * 8 - total);
  let msg = `Tu es rétabli : ${inj.name}. Reprise progressive conseillée.`;
  if (t?.permanent && nextFloat(s) < t.permanent.chance) {
    p.attrs[t.permanent.attr] = clamp(p.attrs[t.permanent.attr] + t.permanent.amount, 1, 99);
    msg += ' Une légère séquelle demeure.';
    journal(s, `Séquelle de ${inj.name} : légère baisse de ${t.permanent.attr === 'speed' ? 'vitesse' : t.permanent.attr}.`, '🦵', true);
  }
  notify(s, 'success', 'Rétabli', msg);
  journal(s, `Retour de blessure (${inj.name}).`, '💪', inj.severity >= 2);
  p.injury = null;
  return msg;
}

export function setTreatment(s: GameState, tr: Treatment): string {
  const inj = s.player.injury;
  if (!inj) return 'Aucune blessure.';
  const t = TREATMENTS[tr];
  inj.treatment = tr;
  return `${t.label} : ${t.desc}`;
}

/** Charge de travail hebdomadaire (entraînements, matchs) : moyenne glissante. */
export function updateLoad(s: GameState, sessions: number, matchMinutes: number, clubTraining: boolean) {
  const week = sessions * 13 + (matchMinutes / 90) * 32 + (clubTraining ? 18 : 0);
  s.player.load = clamp(s.player.load * 0.55 + week * 0.45 * 1.25);
}

/** Alerte musculaire : une petite douleur à signaler (ou à cacher) avant qu'elle ne devienne une blessure. */
export function maybeNiggle(s: GameState) {
  const p = s.player;
  if (p.injury || s.events.pending.some((e) => e.eventId === 'niggle')) return;
  const stress = (p.load > 70 ? 0.12 : 0) + (p.energy < 35 ? 0.08 : 0) + (p.returnUntil >= s.t ? 0.05 : 0);
  if (stress > 0 && chance(s, stress)) {
    const parts = ['la cuisse', 'le mollet', 'les adducteurs', 'le dos'];
    s.events.pending.push({ eventId: 'niggle', data: { part: parts[Math.floor(nextFloat(s) * parts.length)] } });
  }
}

export function injuryStatusText(inj: Injury): string {
  const total = inj.weeksTotal ?? inj.weeksLeft;
  const pct = total ? Math.round((1 - inj.weeksLeft / total) * 100) : 0;
  return `${inj.phase === 'rééducation' ? 'Rééducation' : 'Repos'} · ${pct} % · encore ~${Math.max(1, Math.ceil(inj.weeksLeft))} sem.`;
}
