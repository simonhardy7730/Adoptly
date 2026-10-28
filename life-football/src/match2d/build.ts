// Construction des équipes du moteur 2D : match de démonstration et matchs de carrière.
// Le joueur incarné est intégré à son équipe avec son poste, son apparence et ses statistiques.

import type { GameState } from '../game/types';
import type { MatchState, Approach } from '../game/match';
import { matchPlan, styleFromName, tacticOf } from '../game/coach';
import { COACH_STYLES } from '../content/coaches';
import { ageAt } from '../game/calendar';
import { namePool } from '../content/names';
import { SKIN_TONES } from '../ui/Avatar';
import { nextFloat, type RngHolder } from '../game/rng';
import { FORMATIONS, pitchFor } from './formations';
import type { PlayerSetup, Role, SimConfig, SimState, SimStats, TeamSetup, Tally } from './types';

const ROLE_BIAS: Record<Role, Partial<SimStats>> = {
  GK: { reflexes: 14, shooting: -15, technique: -6, speed: -4 },
  DEF: { defending: 10, positioning: 4, shooting: -8, technique: -3, reflexes: -25 },
  MID: { passing: 8, technique: 5, stamina: 5, reflexes: -25 },
  ATT: { shooting: 10, speed: 5, technique: 4, defending: -10, reflexes: -25 },
};

const HAIRS = ['short', 'curly', 'buzz', 'afro', 'bald'];
const HAIR_COLORS = ['#1b1b1b', '#3b2416', '#6b4423', '#b07a3c', '#d9b26f'];

export function makeStats(h: RngHolder, level: number, role: Role): SimStats {
  const r = () => (nextFloat(h) - 0.5) * 14;
  const b = ROLE_BIAS[role];
  const c = (k: keyof SimStats) => Math.max(5, Math.min(99, level + (b[k] ?? 0) + r()));
  return { speed: c('speed'), technique: c('technique'), passing: c('passing'), shooting: c('shooting'), positioning: c('positioning'), stamina: c('stamina'), defending: c('defending'), reflexes: c('reflexes') };
}

export function makeTeam(h: RngHolder, opts: { name: string; short: string; colors: [string, string]; gkColor?: string; formation: string; level: number; country: string; prefix: string; tactic?: TeamSetup['tactic']; coach?: TeamSetup['coach'] }): TeamSetup {
  const f = FORMATIONS[opts.formation];
  const pool = namePool(opts.country);
  const used = new Set<number>();
  const names = new Set<string>();
  const players: PlayerSetup[] = f.slots.map((slot, i) => {
    let num = slot.role === 'GK' ? 1 : 2 + Math.floor(nextFloat(h) * 22);
    while (used.has(num)) num = num + 1;
    used.add(num);
    // pas d'homonymes dans une même équipe : on tire un autre nom, puis l'initiale du prénom en dernier recours
    let last = pool.last[Math.floor(nextFloat(h) * pool.last.length)];
    for (let k = 0; k < 12 && names.has(last); k++) last = pool.last[Math.floor(nextFloat(h) * pool.last.length)];
    if (names.has(last)) last = `${pool.first[Math.floor(nextFloat(h) * pool.first.length)][0]}. ${last}`;
    while (names.has(last)) last = `${last}·`;
    names.add(last);
    return {
      id: `${opts.prefix}${i}`,
      name: last,
      num,
      role: slot.role,
      stats: makeStats(h, opts.level, slot.role),
      look: { skin: SKIN_TONES[Math.floor(nextFloat(h) * SKIN_TONES.length)], hair: HAIRS[Math.floor(nextFloat(h) * HAIRS.length)], hairColor: HAIR_COLORS[Math.floor(nextFloat(h) * HAIR_COLORS.length)] },
      energy: 1,
    };
  });
  // Banc : un défenseur, un milieu, un attaquant
  const bench: PlayerSetup[] = (['DEF', 'MID', 'ATT'] as Role[]).map((role, i) => {
    let last = pool.last[Math.floor(nextFloat(h) * pool.last.length)];
    for (let k = 0; k < 12 && names.has(last); k++) last = pool.last[Math.floor(nextFloat(h) * pool.last.length)];
    if (names.has(last)) last = `${pool.first[Math.floor(nextFloat(h) * pool.first.length)][0]}. ${last}`;
    names.add(last);
    let num = 12 + i * 3;
    while (used.has(num)) num++;
    used.add(num);
    return { id: `${opts.prefix}b${i}`, name: last, num, role, stats: makeStats(h, opts.level - 2, role), look: { skin: SKIN_TONES[Math.floor(nextFloat(h) * SKIN_TONES.length)], hair: HAIRS[Math.floor(nextFloat(h) * HAIRS.length)], hairColor: HAIR_COLORS[Math.floor(nextFloat(h) * HAIR_COLORS.length)] }, energy: 1 };
  });
  return { name: opts.name, short: opts.short, colors: opts.colors, gkColor: opts.gkColor ?? '#f4c95d', formation: opts.formation, tactic: opts.tactic ?? { mentality: 'balanced', pressing: 0.5, width: 0.6 }, players, bench, coach: opts.coach };
}

/** Match de démonstration : deux équipes fictives de bon niveau. */
export function demoConfig(seed: number): SimConfig {
  const h = { rng: seed };
  const home = makeTeam(h, { name: 'Racing Valmont', short: 'RVA', colors: ['#1fa860', '#ffffff'], formation: '4-3-3', level: 70, country: 'FR', prefix: 'h', tactic: { mentality: 'attacking', pressing: 0.7, width: 0.8 }, coach: { name: 'M. Ferrand', temperament: 'exigeant', style: 'offensif' } });
  const away = makeTeam(h, { name: 'Sporting Portemer', short: 'SPO', colors: ['#c62828', '#212121'], gkColor: '#90caf9', formation: '4-4-2', level: 70, country: 'FR', prefix: 'a', tactic: { mentality: 'attacking', pressing: 0.6, width: 0.7 }, coach: { name: 'R. Lindqvist', temperament: 'pragmatique', style: 'pressing' } });
  return { seed, pitch: pitchFor('4-3-3'), halfSeconds: 180, teams: [home, away] };
}

/** Caractéristiques de carrière → caractéristiques du moteur 2D. */
export function userSimStats(g: GameState, approach: Approach): SimStats {
  const a = g.player.attrs;
  const stats: SimStats = {
    speed: a.speed,
    technique: (a.technique + a.dribbling) / 2,
    passing: (a.passing + a.vision) / 2,
    shooting: a.shooting,
    positioning: (a.tactics + a.vision) / 2,
    stamina: a.stamina,
    defending: a.defending,
    reflexes: a.reflexes,
  };
  // L'approche mentale se traduit concrètement sur le terrain.
  if (approach === 'aggressive') { stats.defending += 4; stats.shooting += 3; stats.passing -= 2; }
  if (approach === 'calm') { stats.passing += 4; stats.positioning += 2; stats.shooting -= 2; }
  if (approach === 'focused') { stats.technique += a.mental / 25; stats.positioning += a.mental / 30; }
  return stats;
}

/** Configuration d'un match de carrière (club, quartier, sélection) à partir de l'état existant. */
export function careerConfig(g: GameState, m: MatchState, approach: Approach): SimConfig {
  const h = { rng: (g.rng ^ 0x2d2d) | 0 };
  const age = ageAt(g);
  const small = m.kind === 'street' || age <= 10;
  // Le coach décide du système, de la tactique et de la consigne du joueur.
  const plan = matchPlan(g, m);
  const followed = Number(m.meta?.followed ?? 1) === 1;
  const formation = small ? '2-3-1' : plan.formation;
  const my = m.playerHome ? m.home : m.away;
  const opp = m.playerHome ? m.away : m.home;
  const oppStyle = styleFromName(opp.name);
  const country = g.identity.growUpCountry;
  const mine = makeTeam(h, { name: my.name, short: my.short, colors: my.colors, formation, level: my.strength, country, prefix: 'm', tactic: plan.tactic, coach: plan.temperament ? { name: plan.coachName, temperament: plan.temperament, style: plan.style } : undefined });
  const them = makeTeam(h, { name: opp.name, short: opp.short, colors: opp.colors, gkColor: '#90caf9', formation: small ? '2-3-1' : COACH_STYLES[oppStyle].formation, level: opp.strength, country, prefix: 'o', tactic: tacticOf(oppStyle), coach: m.kind === 'street' ? undefined : { name: `Le coach de ${opp.name}`, temperament: 'pragmatique', style: oppStyle } });
  const pos = g.identity.position;
  const user: PlayerSetup = {
    id: 'user',
    name: g.identity.nickname || g.identity.lastName,
    num: g.appearance.jerseyNumber,
    role: pos,
    stats: userSimStats(g, approach),
    isUser: true,
    look: { skin: SKIN_TONES[g.appearance.skin] ?? SKIN_TONES[2], hair: g.appearance.hairStyle, hairColor: g.appearance.hairColor },
    energy: g.player.energy / 100,
    instruction: followed && plan.instruction ? plan.instruction : undefined,
  };
  const playing = m.entersAt < 90;
  if (playing && m.entersAt === 0) {
    // remplace le joueur du même poste le plus central
    const f = FORMATIONS[formation];
    const idx = f.slots.map((s, i) => ({ s, i })).filter((x) => x.s.role === pos).sort((a, b) => Math.abs(a.s.y - 0.5) - Math.abs(b.s.y - 0.5))[0]?.i ?? 1;
    mine.players[idx] = { ...user };
  } else if (playing) {
    mine.bench.push(user);
  }
  // Un numéro déjà pris par un coéquipier est décalé.
  for (const p of mine.players) if (!p.isUser && p.num === user.num) p.num = ((p.num + 10) % 98) + 1;
  const teams: [TeamSetup, TeamSetup] = m.playerHome ? [mine, them] : [them, mine];
  return { seed: (g.rng * 7 + 13) | 0, pitch: pitchFor(formation), halfSeconds: small ? 120 : 180, teams, userEntersAt: playing && m.entersAt > 0 ? m.entersAt : undefined };
}

// ———————————————————————————————————————— résultat

export interface SimResult {
  score: [number, number];
  userTally: Tally | null;
  userRating: number | null;
  userInjured: boolean;
  userSubbedOff: number | null;
  ratings: { id: string; name: string; team: 0 | 1; role: Role; rating: number; tally: Tally; isUser: boolean }[];
}

export function playerRating(s: SimState, p: { team: 0 | 1; role: Role; tally: Tally }): number {
  const t = p.tally;
  if (t.minutes < 1) return 0;
  const conceded = s.score[p.team === 0 ? 1 : 0];
  const diff = s.score[p.team] - conceded;
  const acc = t.passes ? t.passesOk / t.passes : 0.75;
  let r = 6;
  r += t.goals * 1.0 + t.assists * 0.6 + t.shotsOn * 0.15 - (t.shots - t.shotsOn) * 0.05;
  r += (acc - 0.75) * 2 * Math.min(1, t.passes / 8);
  r += t.tacklesWon * 0.18 + t.interceptions * 0.12 - t.fouls * 0.1;
  r += Math.min(0.4, t.touches * 0.012);
  if (p.role === 'GK') r += t.saves * 0.35 + (conceded === 0 ? 0.6 : -0.25 * conceded);
  if (p.role === 'DEF') r += conceded === 0 ? 0.4 : -0.12 * conceded;
  r += diff > 0 ? 0.3 : diff < 0 ? -0.3 : 0;
  if (t.minutes < 30) r = 6 + (r - 6) * 0.7;
  return Math.round(Math.max(3, Math.min(10, r)) * 10) / 10;
}

export function resultOf(s: SimState): SimResult {
  const all = [...s.players, ...s.bench].filter((p) => p.tally.minutes > 0);
  const ratings = all.map((p) => ({ id: p.id, name: p.name, team: p.team, role: p.role, rating: playerRating(s, p), tally: p.tally, isUser: p.isUser }));
  const u = all.find((p) => p.isUser);
  return {
    score: [...s.score] as [number, number],
    userTally: u ? u.tally : null,
    userRating: u ? playerRating(s, u) : null,
    userInjured: !!u?.injured,
    userSubbedOff: s.userOutAt,
    ratings: ratings.sort((a, b) => b.rating - a.rating),
  };
}

/** Reporte le résultat du moteur 2D dans le match de carrière (même format que le mode commenté). */
export function applySimToMatch(m: MatchState, s: SimState, r: SimResult) {
  const mySide: 0 | 1 = m.playerHome ? 0 : 1;
  m.score = [s.score[0], s.score[1]];
  m.minute = 90;
  m.status = 'done';
  m.ticker = s.events
    .filter((e) => e.key || e.type === 'shot' || e.type === 'kickoff')
    .map((e) => ({
      minute: e.minute,
      text: e.text,
      kind: e.type === 'goal' ? (e.team === mySide ? 'goal_for' : 'goal_against') : e.type === 'halftime' || e.type === 'fulltime' || e.type === 'kickoff' ? 'whistle' : e.type === 'yellow' || e.type === 'red' ? 'card' : 'info',
    }));
  const t = r.userTally;
  m.stats = {
    goals: t?.goals ?? 0,
    assists: t?.assists ?? 0,
    saves: t?.saves ?? 0,
    momentsWon: t?.passesOk ?? 0,
    momentsTotal: t?.passes ?? 0,
    yellow: 0,
  };
  m.rating = t && t.minutes > 0 ? r.userRating : null;
  if (!t || t.minutes <= 0) m.entersAt = 999;
  m.meta = { ...(m.meta ?? {}), mode: '2d' };
}
