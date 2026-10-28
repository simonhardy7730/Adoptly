// Carrière sportive : détections, offres de club, centre de formation, championnat, matchs.

import type { Club, ClubOffer, GameState, LeagueTeam, SeasonStats, SquadStatus, Tryout, TryoutResult } from './types';
import { ageAt, ageCategory, isLeagueWeek, leagueMatchdayIndex, seasonLabel } from './calendar';
import { addMoney, applyRep, changeRelation, journal, notify } from './helpers';
import { ageNorm, headroom, playerOverall } from './stats';
import { chance, clamp, nextFloat, pick, randInt, shuffle, uid } from './rng';
import { createMatch, myScore, oppScore, quickSim, type MatchState } from './match';
import { namePool, clubName, CLUB_COLORS } from '../content/names';
import { npcPortrait, personName } from './world';
import { generateCoach, styleFit } from './coach';
import { COACH_STYLES, TEMPERAMENTS } from '../content/coaches';
import { rollInjury } from './injuries';
import { environment } from '../content/profiles';
import { wearBoots } from './actions';

export const TIER_LABELS: Record<number, string> = {
  1: 'Club amateur local',
  2: 'Club formateur régional',
  3: 'Centre de formation pro',
  4: 'Grand centre de formation',
};

export const TRYOUT_THRESHOLD: Record<number, number> = { 1: 40, 2: 52, 3: 62, 4: 70 };

export function clubById(s: GameState, id: string | null | undefined): Club | undefined {
  return s.clubs.find((c) => c.id === id);
}

export function currentClub(s: GameState): Club | undefined {
  return s.membership ? clubById(s, s.membership.clubId) : undefined;
}

// ———————————————————————————————————————————— Détections

export function transportCost(s: GameState, club: Club, mode: 'parents' | 'bus' | 'train'): { money: number; energy: number; family: number } {
  const d = club.distanceKm;
  if (mode === 'parents') return { money: Math.round(d * 0.08), energy: Math.min(20, Math.round(d / 30)), family: d > 100 ? -4 : -1 };
  if (mode === 'bus') return { money: Math.round(4 + d * 0.06 * environment(s.identity.environment).transportMult), energy: Math.min(28, Math.round(4 + d / 15)), family: 0 };
  return { money: Math.round(8 + d * 0.14), energy: Math.min(15, Math.round(2 + d / 40)), family: 0 };
}

/** Choisit le club le plus ambitieux qui pourrait s'intéresser au joueur. */
export function pickScoutingClub(s: GameState, maxTier = 4): Club | undefined {
  const age = ageAt(s);
  const ovr = playerOverall(s);
  const rep = s.reputation.sport;
  const repNeed: Record<number, number> = { 1: 0, 2: 4, 3: 14, 4: 30 };
  const current = currentClub(s);
  const candidates = s.clubs.filter((c) => {
    if (c.tier > maxTier) return false;
    if (current && c.tier <= current.tier) return false;
    if ((s.events.flags[`rejected_${c.id}`] ?? -99) > s.t - 30) return false;
    if (s.tryouts.some((t) => t.clubId === c.id && (t.status === 'invited' || t.status === 'accepted'))) return false;
    if (c.tier >= 3 && age < 11) return false;
    return ovr >= ageNorm(age, c.tier) - 7 && rep >= repNeed[c.tier];
  });
  if (!candidates.length) return undefined;
  const top = Math.max(...candidates.map((c) => c.tier));
  return pick(s, candidates.filter((c) => c.tier === top));
}

export function inviteTryout(s: GameState, clubId: string, inWeeks = 2, isRetry = false): Tryout {
  const t: Tryout = { id: uid(s, 'try'), clubId, week: s.t + inWeeks, inviteWeek: s.t, status: 'invited', isRetry };
  s.tryouts.push(t);
  const club = clubById(s, clubId)!;
  notify(s, 'invite', isRetry ? 'Deuxième chance' : 'Invitation à une détection', `${club.name} (${TIER_LABELS[club.tier]}) t’invite à une détection dans ${inWeeks} semaine(s).`);
  journal(s, `Invitation à une détection : ${club.name}.`, '📨', true);
  return t;
}

export function answerTryout(s: GameState, id: string, accept: boolean) {
  const t = s.tryouts.find((x) => x.id === id);
  if (!t || t.status !== 'invited') return;
  t.status = accept ? 'accepted' : 'declined';
  const club = clubById(s, t.clubId)!;
  journal(s, accept ? `Tu acceptes la détection de ${club.name}.` : `Tu déclines l’invitation de ${club.name}.`, accept ? '✅' : '✖️');
  if (accept && s.membership) changeRelation(s, 'coach', -3);
}

export function tryoutDue(s: GameState): Tryout | undefined {
  return s.tryouts.find((t) => t.status === 'accepted' && t.week === s.t);
}

export function expireTryouts(s: GameState) {
  for (const t of s.tryouts) {
    if (t.status === 'invited' && t.week <= s.t) {
      t.status = 'expired';
      notify(s, 'warning', 'Invitation expirée', `Tu n’as pas répondu à la détection de ${clubById(s, t.clubId)?.name}.`);
    }
    if (t.status === 'accepted' && t.week < s.t) t.status = 'expired';
  }
  for (const o of s.clubOffers) if (o.status === 'pending' && o.expires < s.t) o.status = 'expired';
}

/** Difficulté des mini-jeux (1..5) selon le niveau du club. */
export function tryoutDifficulty(club: Club): number {
  return club.tier + (club.reputation > 80 ? 1 : 0);
}

export function evaluateTryout(s: GameState, tryout: Tryout, scores: Record<string, number>): TryoutResult {
  const club = clubById(s, tryout.clubId)!;
  const age = ageAt(s);
  const vals = Object.values(scores);
  const miniAvg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  const ovr = playerOverall(s);
  const norm = ageNorm(age, club.tier);
  const attrScore = clamp(50 + (ovr - norm) * 3.2);
  const p = s.player;
  const conditionScore = clamp(p.energy * 0.6 + p.morale * 0.25 + p.form * 0.15);
  // Les recruteurs perçoivent (imparfaitement) le potentiel.
  const potentialBonus = (p.potential - 65) * 0.12 + (nextFloat(s) - 0.5) * 4;
  const total = Math.round((0.5 * miniAvg + 0.35 * attrScore + 0.15 * conditionScore + potentialBonus) * 10) / 10;
  const threshold = TRYOUT_THRESHOLD[club.tier];
  let outcome: TryoutResult['outcome'] = total >= threshold ? 'offer' : total >= threshold - 8 && !tryout.isRetry ? 'retry' : 'rejected';
  const feedback: string[] = [];
  const names: Record<string, string> = { pass: 'précision de passe', dribble: 'conduite de balle', decision: 'prise de décision', keeper: 'réflexes de gardien' };
  for (const [k, v] of Object.entries(scores)) {
    if (v < 45) feedback.push(`Épreuve de ${names[k] ?? k} décevante (${Math.round(v)}/100).`);
    else if (v >= 75) feedback.push(`Très bonne épreuve de ${names[k] ?? k} (${Math.round(v)}/100).`);
  }
  if (attrScore < 45) feedback.push(`Niveau technique et physique encore en dessous des joueurs du club (${Math.round(ovr)} vs ~${Math.round(norm)}).`);
  else if (attrScore > 65) feedback.push('Ton niveau global a impressionné les éducateurs.');
  if (conditionScore < 55) feedback.push('Tu semblais fatigué : arrive plus reposé la prochaine fois.');
  if (p.potential >= 78 && outcome === 'rejected') {
    outcome = tryout.isRetry ? 'rejected' : 'retry';
    feedback.push('Un recruteur a noté « quelque chose » chez toi malgré tout.');
  }
  return { scores, attrScore: Math.round(attrScore), conditionScore: Math.round(conditionScore), total, threshold, outcome, feedback };
}

export function completeTryout(s: GameState, tryoutId: string, scores: Record<string, number>): TryoutResult {
  const t = s.tryouts.find((x) => x.id === tryoutId)!;
  const club = clubById(s, t.clubId)!;
  const res = evaluateTryout(s, t, scores);
  t.result = res;
  t.status = 'done';
  s.weekDone[`tryout_${t.id}`] = true;
  s.player.energy = clamp(s.player.energy - 15);
  if (res.outcome === 'offer') {
    createClubOffer(s, club, res.total - res.threshold);
    applyRep(s, { sport: 2 + club.tier });
    s.player.morale = clamp(s.player.morale + 15);
    journal(s, `Détection réussie à ${club.name} (${res.total}/${res.threshold}) !`, '🌟', true);
  } else if (res.outcome === 'retry') {
    inviteTryout(s, club.id, randInt(s, 6, 9), true);
    s.player.morale = clamp(s.player.morale + 2);
    journal(s, `${club.name} veut te revoir lors d’une seconde détection.`, '🔁', true);
  } else {
    s.events.flags[`rejected_${club.id}`] = s.t;
    s.player.morale = clamp(s.player.morale - 10);
    journal(s, `Détection non concluante à ${club.name}. Ce n’est qu’une étape.`, '💢', true);
    s.events.scheduled.push({ eventId: 'after_rejection', at: s.t + 1, data: { club: club.name } });
  }
  return res;
}

export function createClubOffer(s: GameState, club: Club, margin: number): ClubOffer {
  const age = ageAt(s);
  const boarding = club.boarding && age >= 12;
  const fee = club.tier === 1 ? 80 : club.tier === 2 ? 140 : 0;
  const role: SquadStatus = margin >= 10 ? 'starter' : margin >= 3 ? 'rotation' : 'bench';
  const notes: string[] = [];
  if (boarding) notes.push('Internat au centre : tu vivras loin de ta famille la semaine.');
  else if (club.distanceKm > 30) notes.push(`Trajets de ${club.distanceKm} km pour les entraînements.`);
  if (fee) notes.push(`Cotisation annuelle : ${fee} €.`);
  else notes.push('Formation prise en charge par le club.');
  const o: ClubOffer = { id: uid(s, 'off'), clubId: club.id, week: s.t, expires: s.t + 3, status: 'pending', fee, boarding, role, note: notes.join(' ') };
  s.clubOffers.push(o);
  notify(s, 'offer', 'Proposition de club', `${club.name} te propose de rejoindre son équipe ${ageCategory(age)}.`);
  return o;
}

export function answerClubOffer(s: GameState, offerId: string, accept: boolean): string {
  const o = s.clubOffers.find((x) => x.id === offerId);
  if (!o || o.status !== 'pending') return 'Offre indisponible.';
  const club = clubById(s, o.clubId)!;
  if (!accept) {
    o.status = 'declined';
    journal(s, `Tu refuses la proposition de ${club.name}.`, '✖️');
    return 'Offre refusée.';
  }
  if (o.fee > 0 && s.money < o.fee) {
    // Les parents complètent si la relation le permet.
    const parent = s.npcs.find((n) => n.role === 'parent');
    if (parent && parent.relation >= 50) {
      addMoney(s, o.fee - s.money, 'family', 'Tes parents complètent la cotisation');
      changeRelation(s, 'parent', -3);
    } else return `Il te manque ${Math.ceil(o.fee - s.money)} € pour la cotisation.`;
  }
  o.status = 'accepted';
  for (const other of s.clubOffers) if (other.status === 'pending') other.status = 'declined';
  if (o.fee > 0) addMoney(s, -o.fee, 'admin', `Cotisation ${club.name}`);
  joinClub(s, club, o.role);
  return `Bienvenue à ${club.name} !`;
}

// ———————————————————————————————————————————— Club & championnat

function teamStrength(s: GameState, club: Club) {
  return ageNorm(ageAt(s), club.tier) + (club.facilities - 50) / 25;
}

export function buildLeague(s: GameState, club: Club): { league: LeagueTeam[]; fixtures: Array<[string, string]>[] } {
  const base = teamStrength(s, club);
  const pool = namePool(club.country);
  const places = shuffle(s, pool.places.map((_, i) => i));
  const league: LeagueTeam[] = [{ id: club.id, name: club.name, strength: base, played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, isPlayerTeam: true }];
  for (let i = 0; i < 9; i++) {
    const name = clubName(club.country, i + 3, places[i] + 5);
    if (name === club.name) continue;
    league.push({ id: `lt_${i}`, name, strength: base + (nextFloat(s) - 0.5) * 12, played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, isPlayerTeam: false });
  }
  while (league.length < 10) league.push({ id: `lt_x${league.length}`, name: `${pick(s, pool.clubPrefix)} ${pool.places[(league.length * 3) % pool.places.length]} B`, strength: base - 3, played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, isPlayerTeam: false });
  // Aller-retour par la méthode du cercle.
  const ids = league.map((t) => t.id);
  const rounds: Array<[string, string]>[] = [];
  const arr = [...ids];
  for (let r = 0; r < arr.length - 1; r++) {
    const round: Array<[string, string]> = [];
    for (let i = 0; i < arr.length / 2; i++) {
      const a = arr[i];
      const b = arr[arr.length - 1 - i];
      round.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(round);
    arr.splice(1, 0, arr.pop()!);
  }
  const back = rounds.map((r) => r.map(([a, b]) => [b, a] as [string, string]));
  return { league, fixtures: [...rounds, ...back] };
}

function recordResult(league: LeagueTeam[], homeId: string, awayId: string, gh: number, ga: number) {
  const h = league.find((t) => t.id === homeId);
  const a = league.find((t) => t.id === awayId);
  if (!h || !a) return;
  h.played++; a.played++;
  h.gf += gh; h.ga += ga; a.gf += ga; a.ga += gh;
  if (gh > ga) { h.w++; a.l++; } else if (gh < ga) { a.w++; h.l++; } else { h.d++; a.d++; }
}

export function standings(league: LeagueTeam[]): LeagueTeam[] {
  return [...league].sort((x, y) => (y.w * 3 + y.d) - (x.w * 3 + x.d) || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf);
}

/** Simule les autres matchs d'une journée (et le match du club si le joueur n'y participe pas). */
export function simulateMatchday(s: GameState, md: number, playerResult?: [number, number]) {
  const ms = s.membership!;
  const round = ms.fixtures[md];
  if (!round) return;
  for (const [h, a] of round) {
    const th = ms.league.find((t) => t.id === h)!;
    const ta = ms.league.find((t) => t.id === a)!;
    if ((th.isPlayerTeam || ta.isPlayerTeam) && playerResult) {
      recordResult(ms.league, h, a, playerResult[0], playerResult[1]);
    } else {
      const [gh, ga] = quickSim(s, th.strength + 1.5, ta.strength);
      recordResult(ms.league, h, a, gh, ga);
    }
  }
  ms.matchday = md + 1;
}

export function joinClub(s: GameState, club: Club, role: SquadStatus) {
  const age = ageAt(s);
  const { league, fixtures } = buildLeague(s, club);
  const coach = generateCoach(s, club);
  const coachName = coach.name;
  s.npcs = s.npcs.filter((n) => n.role !== 'coach' && n.role !== 'rival' && n.role !== 'teammate');
  s.npcs.push({ id: uid(s, 'npc'), name: coachName, role: 'coach', relation: 50, portrait: npcPortrait(s, 'adult'), met: s.t, note: `Éducateur ${ageCategory(age)} à ${club.name} · style ${COACH_STYLES[coach.style].label.toLowerCase()}, ${TEMPERAMENTS[coach.temperament].label.toLowerCase()}.` });
  s.npcs.push({ id: uid(s, 'npc'), name: personName(s, club.country), role: 'rival', relation: 40, portrait: npcPortrait(s, age >= 13 ? 'teen' : 'child'), met: s.t, note: 'Il joue à ton poste. La concurrence est rude.' });
  s.npcs.push({ id: uid(s, 'npc'), name: personName(s, club.country), role: 'teammate', relation: 55, portrait: npcPortrait(s, age >= 13 ? 'teen' : 'child'), met: s.t, note: 'Le premier à t’avoir accueilli dans le vestiaire.' });
  s.membership = { clubId: club.id, joined: s.t, status: role, coachId: coachName, coach, league, fixtures, matchday: 0, lastMatchWeek: -1, feePaid: true };
  // Rattrape les journées déjà jouées (sans le joueur) pour un classement cohérent.
  let md = leagueMatchdayIndex(s.t, s.startYear);
  if (md < 0) {
    for (let k = 1; k < 30 && md < 0; k++) md = leagueMatchdayIndex(s.t + k, s.startYear);
  }
  for (let i = 0; i < md; i++) simulateMatchday(s, i);
  if (club.boarding && age >= 12) {
    s.events.scheduled.push({ eventId: 'homesick', at: s.t + 4 });
  }
  s.admin.push({ id: `adm_licence_${s.t}`, label: `Licence fédérale au nom de ${club.name}`, deadline: s.t + 3, done: false, failEffect: 'licence' });
  applyRep(s, { sport: club.tier * 2, popularity: club.tier });
  journal(s, `Signature à ${club.name} (${TIER_LABELS[club.tier]}).`, '✍️', true);
  notify(s, 'success', 'Nouveau club', `Tu rejoins ${club.name}. Statut prévu : ${STATUS_LABELS[role]}.`);
  ensureSeason(s);
}

export const STATUS_LABELS: Record<SquadStatus, string> = { starter: 'Titulaire', rotation: 'Remplaçant (entre en jeu)', bench: 'Hors du groupe / banc' };

export function leaveClub(s: GameState, reason: string) {
  const club = currentClub(s);
  if (!club) return;
  journal(s, `Départ de ${club.name} : ${reason}`, '🚪', true);
  s.membership = null;
  s.npcs = s.npcs.filter((n) => n.role !== 'coach');
}

export function ensureSeason(s: GameState): SeasonStats {
  const label = seasonLabel(s.t, s.startYear);
  const club = currentClub(s);
  let cur = s.seasons.find((x) => x.season === label && x.clubId === (club?.id ?? null));
  if (!cur) {
    cur = { season: label, clubId: club?.id ?? null, team: club ? `${club.name} ${ageCategory(ageAt(s))}` : 'Sans club (quartier)', apps: 0, starts: 0, goals: 0, assists: 0, cleanSheets: 0, ratingSum: 0, ratedApps: 0, natApps: 0, natGoals: 0 };
    s.seasons.push(cur);
  }
  return cur;
}

/** Statut dans l'effectif : niveau relatif, relation avec l'entraîneur et forme récente. */
export function updateSquadStatus(s: GameState) {
  const ms = s.membership;
  const club = currentClub(s);
  if (!ms || !club) return;
  const coach = s.npcs.find((n) => n.role === 'coach');
  const avg = s.recentRatings.length ? s.recentRatings.reduce((a, b) => a + b, 0) / s.recentRatings.length : 6.3;
  // Le coach décide : niveau, confiance, forme récente, discipline et adéquation à son style de jeu.
  const fit = styleFit(s, ms.coach) / 3;
  const youthCare = ms.coach.temperament === 'paternel' && ageAt(s) < 17 ? 1 : 0;
  const score = playerOverall(s) - teamStrength(s, club) + ((coach?.relation ?? 50) - 50) / 8 + (avg - 6.4) * 3 + (s.player.attrs.discipline - 40) / 20 + fit + youthCare;
  const prev = ms.status;
  ms.status = score >= -1.5 ? 'starter' : score >= -7 ? 'rotation' : 'bench';
  if (prev !== ms.status) {
    const up = (['bench', 'rotation', 'starter'] as SquadStatus[]).indexOf(ms.status) > (['bench', 'rotation', 'starter'] as SquadStatus[]).indexOf(prev);
    notify(s, up ? 'success' : 'warning', up ? 'Statut en hausse' : 'Statut en baisse', `L’entraîneur te considère maintenant comme : ${STATUS_LABELS[ms.status]}.`);
    journal(s, `Nouveau statut au club : ${STATUS_LABELS[ms.status]}.`, up ? '⬆️' : '⬇️', true);
    s.player.morale = clamp(s.player.morale + (up ? 8 : -8));
  }
}

export function leagueMatchDue(s: GameState): boolean {
  return !!s.membership && isLeagueWeek(s.t, s.startYear) && !s.weekDone.league;
}

export function setupLeagueMatch(s: GameState): MatchState | null {
  const ms = s.membership!;
  const club = currentClub(s)!;
  const md = leagueMatchdayIndex(s.t, s.startYear);
  const round = ms.fixtures[md];
  if (!round) return null;
  const pair = round.find(([h, a]) => h === club.id || a === club.id)!;
  const home = pair[0] === club.id;
  const oppT = ms.league.find((t) => t.id === (home ? pair[1] : pair[0]))!;
  const me = ms.league.find((t) => t.isPlayerTeam)!;
  const oppColors = CLUB_COLORS[(oppT.name.length * 7) % CLUB_COLORS.length];
  const scout = chance(s, 0.12 + club.tier * 0.03);
  return createMatch(s, {
    kind: 'league',
    competition: `Championnat ${ageCategory(ageAt(s))} · J${md + 1}`,
    importance: 1,
    my: { name: club.name, short: club.short, strength: me.strength, colors: club.colors },
    opp: { name: oppT.name, short: oppT.name.slice(0, 3).toUpperCase(), strength: oppT.strength, colors: oppColors[0] === club.colors[0] ? ['#eeeeee', '#222222'] : oppColors },
    home,
    squadStatus: s.player.injury ? 'bench' : ms.status,
    scoutWatching: scout,
    meta: { matchday: md },
  });
}

export function setupStreetMatch(s: GameState): MatchState {
  const age = ageAt(s);
  const base = ageNorm(age, 1) - 2;
  const pool = namePool(s.identity.growUpCountry);
  return createMatch(s, {
    kind: 'street',
    competition: 'Match de quartier',
    importance: 0.5,
    my: { name: 'Les potes du quartier', short: 'POT', strength: base, colors: ['#2e7d32', '#ffffff'] },
    opp: { name: `City-stade de ${pick(s, pool.places)}`, short: 'CIT', strength: base + (nextFloat(s) - 0.4) * 8, colors: ['#c62828', '#ffffff'] },
    home: true,
    squadStatus: 'starter',
    scoutWatching: false,
  });
}

/** Applique les conséquences d'un match terminé sur tous les systèmes. */
export function applyMatchResult(s: GameState, m: MatchState): string[] {
  const out: string[] = [];
  const p = s.player;
  const played = m.entersAt < 90;
  const res = myScore(m) - oppScore(m);
  const season = ensureSeason(s);
  if (m.kind === 'league' && s.membership) {
    const md = Number(m.meta?.matchday ?? s.membership.matchday);
    simulateMatchday(s, md, [m.score[0], m.score[1]]);
    s.membership.lastMatchWeek = s.t;
    s.weekDone.league = true;
  }
  if (m.kind === 'national') s.weekDone.national = true;
  if (played) {
    const minutesShare = m.entersAt === 0 ? 1 : (90 - m.entersAt) / 90;
    const staminaF = 1.25 - p.attrs.stamina / 200;
    p.energy = clamp(p.energy - (m.kind === 'street' ? 16 : 26) * minutesShare * staminaF);
    p.form = clamp(p.form + 3 * minutesShare);
    wearBoots(s, 4 * minutesShare);
    if (m.kind !== 'street') {
      season.apps += 1;
      if (m.entersAt === 0) season.starts += 1;
      if (m.kind === 'national') {
        season.natApps += 1;
        season.natGoals += m.stats.goals;
      } else {
        season.goals += m.stats.goals;
        season.assists += m.stats.assists;
      }
      if (oppScore(m) === 0 && (s.identity.position === 'GK' || s.identity.position === 'DEF') && m.entersAt === 0) season.cleanSheets += 1;
      if (m.rating !== null) {
        season.ratingSum += m.rating;
        season.ratedApps += 1;
      }
    }
    if (m.rating !== null) {
      s.recentRatings.push(m.rating);
      if (s.recentRatings.length > 6) s.recentRatings.shift();
      const r = m.rating;
      const repGain = (r - 6.4) * 0.6 * m.importance * (m.kind === 'street' ? 0.4 : 1);
      applyRep(s, { sport: repGain, popularity: (m.stats.goals * 0.4 + (r >= 8 ? 0.4 : 0)) * m.importance * (m.kind === 'street' ? 0.3 : 1), fanImage: (r - 6.3) * 0.8 });
      if (m.kind === 'league') changeRelation(s, 'coach', (r - 6.3) * 2.5);
      p.morale = clamp(p.morale + (r - 6.3) * 4 + res * 1.5);
      out.push(`Note : ${r.toFixed(1)}/10`);
      // Petit plus de progression : on apprend en jouant.
      const learn = (m.kind === 'street' ? environment(s.identity.environment).streetBonus : 1) * Math.min(1, headroom(s));
      p.attrs.mental = clamp(p.attrs.mental + 0.12 * learn, 1, 99);
      p.attrs.tactics = clamp(p.attrs.tactics + 0.12, 1, 99);
      if (m.kind === 'street') {
        p.attrs.dribbling = clamp(p.attrs.dribbling + 0.15 * learn, 1, 99);
        p.attrs.technique = clamp(p.attrs.technique + 0.1 * learn, 1, 99);
      }
    }
    // Risque de blessure : fatigue, charge, antécédents, intensité du match.
    const extra = [...(m.approach === 'aggressive' ? [{ label: 'Engagement agressif', mult: 1.35 }] : []), ...(m.kind === 'street' ? [{ label: 'Terrain de quartier', mult: 0.7 }] : [])];
    const inj = m.meta?.mode === '2d' ? null : rollInjury(s, 'match', 'en match', extra);
    if (inj) out.push(`Blessure : ${inj.name}`);
  } else if (m.kind === 'league') {
    p.morale = clamp(p.morale - 3);
    changeRelation(s, 'coach', -0.5);
  }
  if (m.stats.goals > 0) journal(s, `${m.stats.goals > 1 ? `${m.stats.goals} buts` : 'But'} contre ${m.playerHome ? m.away.name : m.home.name} (${m.competition}).`, '⚽');
  // Repérage : un recruteur présent ou un éducateur du quartier peut se manifester.
  if (played && m.rating !== null) {
    const env = environment(s.identity.environment).scouting;
    const base = m.kind === 'street' ? 0.12 : m.scoutWatching ? 0.45 : 0.06;
    if (m.rating >= 7.3 && chance(s, base * env)) {
      const club = pickScoutingClub(s, m.kind === 'street' ? 2 : 4);
      if (club) {
        inviteTryout(s, club.id, 2);
        out.push(`Un recruteur de ${club.name} t’a remarqué !`);
      }
    }
  }
  return out;
}

export function seasonEnd(s: GameState) {
  const club = currentClub(s);
  const season = ensureSeason(s);
  const avg = season.ratedApps ? season.ratingSum / season.ratedApps : 0;
  if (club && s.membership) {
    const table = standings(s.membership.league);
    const pos = table.findIndex((t) => t.isPlayerTeam) + 1;
    journal(s, `Fin de saison ${season.season} : ${club.name} termine ${pos}e. ${season.apps} matchs, ${season.goals} buts, note moyenne ${avg ? avg.toFixed(2) : '–'}.`, '🏁', true);
    if (pos === 1) {
      applyRep(s, { sport: 4, popularity: 2 });
      journal(s, `Champion ! ${club.name} remporte le championnat.`, '🏆', true);
      notify(s, 'success', 'Champion !', `Ton équipe termine première du championnat.`);
    }
    const coach = s.npcs.find((n) => n.role === 'coach');
    const gap = playerOverall(s) - ageNorm(ageAt(s), club.tier);
    if (gap < -8 && (coach?.relation ?? 50) < 55 && club.tier >= 2) {
      s.events.pending.push({ eventId: 'released', data: { club: club.name } });
    } else {
      s.events.pending.push({ eventId: 'season_review', data: { club: club.name, avg: Math.round(avg * 10) / 10, pos } });
    }
  } else {
    journal(s, `Fin de saison ${season.season} sans club. Le rêve continue.`, '🏁', true);
  }
}

/** Nouvelle saison : nouveau championnat dans la catégorie d'âge supérieure. */
export function newSeason(s: GameState) {
  const club = currentClub(s);
  if (club && s.membership) {
    const { league, fixtures } = buildLeague(s, club);
    s.membership.league = league;
    s.membership.fixtures = fixtures;
    s.membership.matchday = 0;
    updateSquadStatus(s);
  }
  ensureSeason(s);
  // Les clubs voisins font évoluer leur réputation.
  for (const c of s.clubs) c.reputation = clamp(c.reputation + (nextFloat(s) - 0.5) * 4);
}
