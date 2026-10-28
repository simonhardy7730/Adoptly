// Boucle hebdomadaire : activités bloquantes (détection, match), puis traitement de fin de semaine
// (club, alimentation, sommeil, école, argent, sponsors, sélections, événements, saisons).

import type { GameState } from './types';
import { ageAt, dateOf, isHolidays, isLeagueWeek, isMonthEnd, isSchoolPeriod, isSeasonEnd, leagueMatchdayIndex } from './calendar';
import { addMoney, changeRelation, journal, notify, npcByRole } from './helpers';
import { currentClub, ensureSeason, expireTryouts, newSeason, seasonEnd, simulateMatchday, tryoutDue, updateSquadStatus, standings } from './career';
import { applyTraining, naturalGrowth, type TrainingFocus } from './stats';
import { food, WEEKLY_PORTIONS } from '../content/foods';
import { background } from '../content/profiles';
import { clamp, nextFloat } from './rng';
import { weeklySlots } from './actions';
import { generateSponsorOffers, monthlySponsorCycle, activeContracts } from './sponsors';
import { checkCallup, nationalMatchDue } from './national';
import { weeklySocial } from './social';
import { rollEvents } from './events';

export type Blocking =
  | { type: 'event' }
  | { type: 'tryout'; id: string }
  | { type: 'national' }
  | { type: 'league' };

/** Prochaine activité obligatoire avant de pouvoir terminer la semaine. */
export function blockingActivity(s: GameState): Blocking | null {
  if (s.events.pending.length) return { type: 'event' };
  const tr = tryoutDue(s);
  if (tr && !s.weekDone[`tryout_${tr.id}`]) return { type: 'tryout', id: tr.id };
  if (nationalMatchDue(s)) return { type: 'national' };
  if (leaguePlayable(s)) return { type: 'league' };
  return null;
}

/** Le joueur participe-t-il au match de championnat cette semaine ? */
export function leaguePlayable(s: GameState): boolean {
  if (!s.membership || !isLeagueWeek(s.t, s.startYear) || s.weekDone.league) return false;
  if (s.player.injury) return false;
  if (s.membership.status === 'bench') return false;
  const cu = s.national.callupHistory.find((c) => c.week === s.t && c.status === 'played');
  if (cu || (s.national.pendingCallup?.week === s.t && s.national.pendingCallup.status === 'accepted')) return false;
  const md = leagueMatchdayIndex(s.t, s.startYear);
  return md >= 0 && md < s.membership.fixtures.length && s.membership.matchday <= md;
}

export function startWeek(s: GameState) {
  const max = weeklySlots(s);
  s.slots = { left: max, max };
  s.weekLog = [];
  s.weekDone = {};
}

const POSITION_FOCUS: Record<string, TrainingFocus[]> = {
  GK: ['goalkeeping', 'tactical', 'physical'],
  DEF: ['defense', 'tactical', 'physical'],
  MID: ['technique', 'tactical', 'physical'],
  ATT: ['finishing', 'technique', 'physical'],
};

export interface WeekReport {
  lines: string[];
}

export function finalizeWeek(s: GameState): WeekReport {
  const lines: string[] = [];
  const p = s.player;
  const age = ageAt(s);
  const club = currentClub(s);
  const bg = background(s.identity.background);
  const holidays = isHolidays(s.t, s.startYear);
  const d = dateOf(s.t, s.startYear);

  // 1. Championnat sans le joueur (blessé, non retenu, en sélection).
  if (s.membership && isLeagueWeek(s.t, s.startYear) && !s.weekDone.league) {
    const md = leagueMatchdayIndex(s.t, s.startYear);
    if (md >= 0 && s.membership.matchday <= md && md < s.membership.fixtures.length) {
      simulateMatchday(s, md);
      const me = s.membership.league.find((t) => t.isPlayerTeam)!;
      const pos = standings(s.membership.league).findIndex((t) => t.isPlayerTeam) + 1;
      lines.push(`Match de championnat sans toi (${p.injury ? 'blessé' : s.membership.status === 'bench' ? 'non retenu' : 'absent'}). ${club?.name} : ${me.w}V ${me.d}N ${me.l}D, ${pos}e.`);
      if (!p.injury) p.morale = clamp(p.morale - 3);
    }
  }

  // 2. Entraînements collectifs du club.
  if (club && !holidays && !(d.month === 6 && d.weekOfMonth >= 3)) {
    if (!p.injury) {
      const foci = POSITION_FOCUS[s.identity.position];
      const quality = 0.45 + club.facilities / 160 + club.tier * 0.06;
      for (const f of foci) applyTraining(s, f, quality * 0.55);
      p.energy = clamp(p.energy - (8 + club.tier * 3));
      p.form = clamp(p.form + 2);
      lines.push(`Entraînements collectifs à ${club.name}.`);
    } else lines.push('Soins avec le staff médical du club.');
  } else if (!s.weekLog.some((a) => a.startsWith('train') || a === 'street_match')) {
    p.form = clamp(p.form - 2.5);
  }

  // 3. Alimentation : repas familiaux + garde-manger.
  const boarding = !!club?.boarding && age >= 12;
  const home = boarding ? 74 : bg.homeNutrition;
  let eaten = 0;
  let nutSum = 0;
  let rec = 0;
  let fun = 0;
  const pantry = Object.entries(s.pantry).sort((a, b) => (food(b[0])?.nutrition ?? 0) - (food(a[0])?.nutrition ?? 0));
  for (const [id, q] of pantry) {
    const f = food(id);
    if (!f) continue;
    const take = Math.min(q, WEEKLY_PORTIONS - eaten);
    if (take <= 0) break;
    eaten += take;
    nutSum += f.nutrition * take;
    rec += f.recovery * take;
    fun += f.morale * take;
    s.pantry[id] = q - take;
    if (s.pantry[id] <= 0) delete s.pantry[id];
  }
  const supplement = eaten ? nutSum / eaten : home * 0.85;
  const weekNut = home * 0.6 + (supplement * eaten + home * 0.85 * (WEEKLY_PORTIONS - eaten)) / WEEKLY_PORTIONS * 0.4;
  p.nutrition = clamp(p.nutrition * 0.65 + weekNut * 0.35);
  p.morale = clamp(p.morale + Math.min(6, fun * 0.4));
  if (eaten) lines.push(`Garde-manger : ${eaten} portion(s) consommée(s) (qualité ${Math.round(supplement)}).`);

  // 4. Sommeil & récupération.
  const sleepBonus = p.sleepMode === 'early' ? 8 : p.sleepMode === 'late' ? -10 : 0;
  const late = s.events.flags.lateNight ? -10 : 0;
  s.events.flags.lateNight = 0;
  const recovery = 32 + sleepBonus + late + (p.nutrition - 55) / 3.5 + Math.min(10, rec * 0.4);
  p.energy = clamp(p.energy + recovery);
  if (p.sleepMode === 'late') p.morale = clamp(p.morale + 2);
  if (p.sleepMode === 'early') p.morale = clamp(p.morale - 0.5);
  if (p.injury) {
    p.injury.weeksLeft -= 0.8 + p.nutrition / 300 + (p.sleepMode === 'early' ? 0.1 : 0);
    if (p.injury.weeksLeft <= 0) {
      notify(s, 'success', 'Rétabli', `Tu es guéri : ${p.injury.name} n’est plus qu’un mauvais souvenir.`);
      journal(s, `Retour de blessure (${p.injury.name}).`, '💪');
      p.injury = null;
    }
  }
  // Le moral revient doucement vers l'équilibre.
  p.morale = clamp(p.morale + (62 - p.morale) * 0.06);

  // 5. École.
  if (isSchoolPeriod(s.t, s.startYear) && age < 18) {
    const studied = s.weekLog.includes('study');
    const drift = studied ? 0 : -0.12 - (p.energy < 30 ? 0.1 : 0) + (p.attrs.discipline - 40) / 600;
    p.school.grade = clamp(p.school.grade + drift + (nextFloat(s) - 0.5) * 0.2, 0, 20);
  }

  // 6. Argent.
  if (age < 18) {
    const parent = npcByRole(s, 'parent');
    const mult = (parent?.relation ?? 60) < 30 ? 0.5 : 1;
    addMoney(s, Math.round(bg.pocketMoney * mult * 100) / 100, 'pocket', 'Argent de poche');
  }
  if (club && !boarding && club.distanceKm > 25 && !holidays) {
    const cost = Math.round(club.distanceKm * 0.04);
    addMoney(s, -cost, 'transport', 'Trajets vers le club (part non couverte par tes parents)');
  }

  // 7. Démarches administratives en retard.
  for (const a of s.admin) {
    if (!a.done && a.deadline < s.t + 1) {
      a.done = true;
      if (a.failEffect === 'medical') {
        addMoney(s, -25, 'admin', 'Certificat médical en urgence');
        changeRelation(s, 'parent2', -3);
        notify(s, 'warning', 'Démarche oubliée', 'Le certificat médical n’a pas été fait à temps : rendez-vous en urgence, plus cher.');
      } else if (a.failEffect === 'licence') {
        changeRelation(s, 'coach', -6);
        notify(s, 'warning', 'Licence en retard', 'Ta licence n’était pas à jour : l’entraîneur est agacé.');
      } else if (a.failEffect === 'passport') {
        notify(s, 'warning', 'Passeport', 'Ton passeport n’est pas prêt : la fédération a dû faire une démarche d’urgence.');
      }
    }
  }

  // 8. Réseau social & réputation (érosion lente sans résultats).
  weeklySocial(s);
  s.reputation.sport = clamp(s.reputation.sport * 0.996 - 0.02);
  s.reputation.popularity = clamp(s.reputation.popularity * 0.994 - 0.02);

  // 9. Fin de mois : sponsors, croissance naturelle, statut au club.
  if (isMonthEnd(s.t)) {
    naturalGrowth(s);
    monthlySponsorCycle(s);
    generateSponsorOffers(s);
    if (s.membership) updateSquadStatus(s);
    if (club && club.tier >= 3 && age >= 16) addMoney(s, club.tier === 4 ? 420 : 300, 'salary', `Indemnité de formation ${club.name}`);
    if (activeContracts(s).length && age >= 16) {
      const tax = Math.round(s.ledger.filter((x) => x.t > s.t - 4 && (x.category === 'sponsor' || x.category === 'sponsor_bonus' || x.category === 'salary')).reduce((a, x) => a + x.amount, 0) * 0.15);
      if (tax > 0) addMoney(s, -tax, 'tax', 'Impôts et charges (simplifiés, 15 %)');
    }
  }

  // 10. Sélections nationales (convocation pour la semaine suivante).
  checkCallup(s);

  // 11. Fin de saison.
  if (isSeasonEnd(s.t, s.startYear)) seasonEnd(s);

  // ———————————— Passage à la semaine suivante
  s.t += 1;
  const nd = dateOf(s.t, s.startYear);
  if (s.t % 48 === 0) {
    newSeason(s);
    journal(s, `Début de la saison ${ensureSeason(s).season}.`, '📅', true);
  }
  if (nd.month === s.identity.birthMonth && nd.weekOfMonth === 1) s.events.pending.push({ eventId: 'birthday' });
  if (ageAt(s) >= 13 && !s.events.flags.passport && s.identity.nationality) {
    s.events.flags.passport = 1;
    s.admin.push({ id: `adm_passport_${s.t}`, label: 'Faire établir ton passeport (déplacements internationaux)', deadline: s.t + 10, done: false, failEffect: 'passport' });
  }
  expireTryouts(s);
  startWeek(s);
  rollEvents(s, 0.55);
  return { lines };
}
