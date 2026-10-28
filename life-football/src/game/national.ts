// Carrière internationale : convocations, matchs de sélection, verrouillage selon les règles d'éligibilité.

import type { Callup, GameState } from './types';
import { ageAt, isInternationalWindow, isLeagueWeek, dateOf } from './calendar';
import { eligibleNations, ELIGIBILITY_RULES } from './eligibility';
import { ageNorm, playerOverall } from './stats';
import { COUNTRIES, country } from '../content/countries';
import { applyRep, journal, notify, changeRelation } from './helpers';
import { chance, clamp, nextFloat, pick, uid } from './rng';
import { createMatch, type MatchState } from './match';
import { currentClub } from './career';

export function categoryFor(age: number): Callup['category'] | null {
  if (age < 13) return null;
  if (age <= 14) return 'U15';
  if (age <= 16) return 'U17';
  if (age <= 18) return 'U19';
  if (age <= 20) return 'U21';
  return 'A';
}

export const COMPETITIONS: Record<Callup['category'], string> = {
  U15: 'Tournoi international U15',
  U17: 'Championnat continental U17',
  U19: 'Championnat continental U19',
  U21: 'Éliminatoires Espoirs',
  A: 'Ligue des Nations (fictive)',
};

/** Score de sélection d'un joueur pour une nation donnée. */
export function selectionScore(s: GameState, nation: string, senior: boolean): { score: number; threshold: number } {
  const age = ageAt(s);
  const strength = country(nation).strength;
  const club = currentClub(s);
  const recent = s.recentRatings.length ? s.recentRatings.reduce((a, b) => a + b, 0) / s.recentRatings.length : 6;
  const score = playerOverall(s) + s.reputation.sport * 0.06 + (club ? [0, -3, 0, 1.5, 3][club.tier] : -5) + (recent - 6.5) * 2;
  const threshold = senior ? 66 + (strength - 70) * 0.45 : ageNorm(age, 4) - 2 + (strength - 75) * 0.25;
  return { score, threshold };
}

/** Évaluation avant une fenêtre internationale. */
export function checkCallup(s: GameState) {
  if (s.national.pendingCallup) return;
  const next = s.t + 1;
  if (!isInternationalWindow(next, s.startYear) || s.national.lastWindow === next) return;
  s.national.lastWindow = next;
  const age = ageAt(s, next);
  const cat = categoryFor(age);
  if (!cat) return;
  if (s.player.injury && s.player.injury.weeksLeft > 1) return;
  const nations = eligibleNations(s);
  const seniorPossible = age >= 17;
  const calling: { nation: string; senior: boolean }[] = [];
  for (const n of nations) {
    if (seniorPossible) {
      const sr = selectionScore(s, n, true);
      if (sr.score + (nextFloat(s) - 0.5) * 4 >= sr.threshold) {
        calling.push({ nation: n, senior: true });
        continue;
      }
    }
    if (cat !== 'A') {
      const yr = selectionScore(s, n, false);
      if (yr.score + (nextFloat(s) - 0.5) * 4 >= yr.threshold) calling.push({ nation: n, senior: false });
    }
  }
  if (!calling.length) return;
  if (calling.length > 1 && !s.national.committedTo) {
    s.events.pending.push({ eventId: 'dual_callup', data: { a: calling[0].nation, b: calling[1].nation, senior: calling[0].senior || calling[1].senior ? 1 : 0 } });
    return;
  }
  // Préférence pour la nation déjà choisie chez les jeunes.
  const pickN = calling.find((c) => c.nation === s.national.chosenYouth) ?? calling[0];
  createCallup(s, pickN.nation, pickN.senior);
}

export function createCallup(s: GameState, nation: string, senior: boolean): Callup {
  const next = s.t + 1;
  const age = ageAt(s, next);
  const cat = senior ? 'A' : categoryFor(age) ?? 'U15';
  const d = dateOf(next, s.startYear);
  const official = cat === 'A' ? d.month === 6 || chance(s, 0.6) : true;
  const opponents = [pick(s, COUNTRIES.filter((c) => c.code !== nation && c.continent === country(nation).continent).concat(COUNTRIES.filter((c) => c.code !== nation)).slice(0, 12)).code];
  const callup: Callup = {
    id: uid(s, 'cu'),
    nation,
    category: cat,
    week: next,
    competition: cat === 'A' && !official ? 'Match amical international' : COMPETITIONS[cat],
    opponents,
    status: 'pending',
    official,
  };
  s.national.pendingCallup = callup;
  const c = country(nation);
  notify(s, 'national', `Convocation ${c.flag} ${cat === 'A' ? 'équipe A' : cat}`, `Le sélectionneur de ${c.name} t’appelle pour : ${callup.competition}.`);
  return callup;
}

export function answerCallup(s: GameState, accept: boolean): string {
  const cu = s.national.pendingCallup;
  if (!cu || cu.status !== 'pending') return 'Aucune convocation en attente.';
  const c = country(cu.nation);
  if (!accept) {
    cu.status = 'declined';
    s.national.callupHistory.push(cu);
    s.national.pendingCallup = null;
    applyRep(s, { fanImage: -2, media: 1 });
    journal(s, `Tu déclines la convocation de ${c.name} (${cu.category}).`, '✖️');
    return 'Convocation déclinée. Le sélectionneur en prend note.';
  }
  cu.status = 'accepted';
  s.national.chosenYouth = cu.nation;
  if (isLeagueWeek(cu.week, s.startYear) && s.membership) {
    notify(s, 'warning', 'Conflit de calendrier', 'La fenêtre internationale tombe un week-end de championnat : tu manqueras le match de ton club.');
  }
  journal(s, `Première convocation acceptée : ${c.flag} ${c.name} ${cu.category}.`, '🎽', !Object.keys(s.national.caps).length);
  if (cu.category === 'A' || !s.identity.nationality) changeRelation(s, 'parent', 4);
  return `Tu rejoindras la sélection ${c.name} ${cu.category} la semaine prochaine.`;
}

export function nationalMatchDue(s: GameState): Callup | null {
  const cu = s.national.pendingCallup;
  if (cu && cu.status === 'accepted' && cu.week === s.t && !s.weekDone.national) return cu;
  return null;
}

export function setupNationalMatch(s: GameState, cu: Callup): MatchState {
  const nat = country(cu.nation);
  const opp = country(cu.opponents[0]);
  const age = ageAt(s);
  const base = cu.category === 'A' ? 62 + (nat.strength - 70) * 0.4 : ageNorm(age, 4) + (nat.strength - 75) * 0.2;
  const oppBase = cu.category === 'A' ? 62 + (opp.strength - 70) * 0.4 : ageNorm(age, 4) + (opp.strength - 75) * 0.2;
  const sel = selectionScore(s, cu.nation, cu.category === 'A');
  const status = sel.score >= sel.threshold + 3 ? 'starter' : 'rotation';
  return createMatch(s, {
    kind: 'national',
    competition: `${nat.flag} ${cu.competition}`,
    importance: cu.category === 'A' ? 2 : 1.4,
    my: { name: `${nat.name} ${cu.category === 'A' ? '' : cu.category}`.trim(), short: nat.code, strength: base, colors: ['#1a237e', '#ffffff'] },
    opp: { name: `${opp.name} ${cu.category === 'A' ? '' : cu.category}`.trim(), short: opp.code, strength: oppBase, colors: ['#b71c1c', '#ffffff'] },
    home: chance(s, 0.5),
    squadStatus: status,
    scoutWatching: true,
    meta: { callup: cu.id },
  });
}

export function applyNationalResult(s: GameState, m: MatchState) {
  const cu = s.national.pendingCallup;
  if (!cu) return;
  cu.status = 'played';
  s.national.callupHistory.push(cu);
  s.national.pendingCallup = null;
  s.weekDone.national = true;
  const played = m.entersAt < 90;
  const caps = (s.national.caps[cu.nation] ??= { youth: 0, senior: 0, goals: 0 });
  if (played) {
    if (cu.category === 'A') caps.senior += 1;
    else caps.youth += 1;
    caps.goals += m.stats.goals;
    const lockNow = cu.category === 'A' && (cu.official ? ELIGIBILITY_RULES.seniorOfficialLocks : ELIGIBILITY_RULES.seniorFriendlyLocks);
    const lockYouth = cu.category !== 'A' && ELIGIBILITY_RULES.youthMatchesLock;
    if ((lockNow || lockYouth) && !s.national.committedTo) {
      s.national.committedTo = cu.nation;
      journal(s, `Match officiel avec ${country(cu.nation).name} : ton choix international est désormais définitif.`, '🔒', true);
      notify(s, 'national', 'Choix international définitif', `Tu ne pourras plus jouer pour une autre sélection.`);
    }
  }
  s.player.energy = clamp(s.player.energy - 8); // voyage
  applyRep(s, { sport: cu.category === 'A' ? 5 : 2.5, popularity: cu.category === 'A' ? 5 : 2, media: cu.category === 'A' ? 6 : 2.5, sponsorCred: 1.5 });
  // Absence du club si conflit
  if (s.membership && isLeagueWeek(s.t, s.startYear) && !s.weekDone.league) {
    changeRelation(s, 'coach', -1);
  }
  journal(s, `${country(cu.nation).flag} ${cu.category} : ${m.home.name} ${m.score[0]}–${m.score[1]} ${m.away.name}${m.stats.goals ? ` (${m.stats.goals} but${m.stats.goals > 1 ? 's' : ''} pour toi)` : ''}.`, '🎽', true);
}

export function totalCaps(s: GameState) {
  return Object.values(s.national.caps).reduce((a, c) => ({ youth: a.youth + c.youth, senior: a.senior + c.senior, goals: a.goals + c.goals }), { youth: 0, senior: 0, goals: 0 });
}
