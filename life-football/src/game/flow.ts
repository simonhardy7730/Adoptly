// Orchestration des activités (utilisée par le store et par les tests de parcours complets).

import type { GameState } from './types';
import { applyMatchResult, setupLeagueMatch, setupStreetMatch } from './career';
import { applyNationalResult, nationalMatchDue, setupNationalMatch } from './national';
import { advance, kickOff, resolveMoment, type Approach, type MatchState, type Preparation } from './match';
import { sponsorMatchBonus } from './sponsors';
import { performAction } from './actions';
import { notify } from './helpers';

export function createMatchFor(s: GameState, kind: 'league' | 'national' | 'street'): MatchState | null {
  if (kind === 'league') return setupLeagueMatch(s);
  if (kind === 'national') {
    const cu = nationalMatchDue(s);
    return cu ? setupNationalMatch(s, cu) : null;
  }
  return setupStreetMatch(s);
}

/** Lance un match de quartier (consomme l'action). */
export function startStreetMatch(s: GameState): { ok: boolean; message: string; match?: MatchState } {
  const r = performAction(s, 'street_match');
  if (!r.ok) return r;
  return { ok: true, message: '', match: setupStreetMatch(s) };
}

export function beginMatch(s: GameState, m: MatchState, approach: Approach, prep: Preparation) {
  kickOff(s, m, s, approach, prep);
  advance(s, m, s);
}

export function chooseInMatch(s: GameState, m: MatchState, optionId: string) {
  resolveMoment(s, m, s, optionId);
  advance(s, m, s);
}

/** Termine le match : conséquences sur la carrière, les finances (primes) et la sélection. */
export function concludeMatch(s: GameState, m: MatchState): string[] {
  const before = { sport: s.reputation.sport, pop: s.reputation.popularity, morale: s.player.morale, energy: s.player.energy, coach: s.npcs.find((n) => n.role === 'coach')?.relation };
  const lines = applyMatchResult(s, m);
  const d = (a: number, b: number) => `${b - a >= 0 ? '+' : ''}${(b - a).toFixed(1)}`;
  lines.push(`Réputation sportive ${d(before.sport, s.reputation.sport)} · Popularité ${d(before.pop, s.reputation.popularity)}`);
  lines.push(`Moral ${d(before.morale, s.player.morale)} · Énergie ${d(before.energy, s.player.energy)}`);
  const coach = s.npcs.find((n) => n.role === 'coach');
  if (coach && before.coach !== undefined && m.kind === 'league') lines.push(`Relation avec l’entraîneur ${d(before.coach, coach.relation)}`);
  if (m.kind === 'national') applyNationalResult(s, m);
  if (m.entersAt < 90 && m.kind !== 'street') sponsorMatchBonus(s, m.stats.goals, m.kind === 'national');
  if (m.kind !== 'street' && m.rating !== null && m.rating >= 8.5 && s.social.unlocked && !s.social.posts.some((p) => p.t >= s.t - 2)) {
    notify(s, 'info', 'Moment à partager', 'Grosse performance ! C’est le moment idéal pour publier sur Tribune.');
  }
  return lines;
}

/** Joue automatiquement un match en choisissant l'option la plus sûre (tests / simulation rapide). */
export function autoPlay(s: GameState, m: MatchState) {
  beginMatch(s, m, 'focused', 'normal');
  let guard = 0;
  while (m.status !== 'done' && guard++ < 50) {
    if (m.status === 'moment') {
      const mo = m.moments[m.momentIdx];
      const best = [...mo.options].sort((a, b) => (b.chance ?? 0) * (0.5 + b.quality) - (a.chance ?? 0) * (0.5 + a.quality))[0];
      chooseInMatch(s, m, best.id);
    } else advance(s, m, s);
  }
  return concludeMatch(s, m);
}
