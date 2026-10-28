// L'entraîneur : il choisit le système, la tactique et les consignes ; il sélectionne, juge et fait progresser.
// Le joueur interagit avec lui (entretiens, consignes suivies ou non), mais ne décide jamais de la tactique.

import type { AttrKey, Club, CoachProfile, CoachStyle, CoachTemperament, GameState, Instruction, Position } from './types';
import type { MatchState } from './match';
import type { Tactic } from '../match2d/types';
import { COACH_STYLES, INSTRUCTIONS, TEMPERAMENTS } from '../content/coaches';
import { ageAt } from './calendar';
import { changeRelation, journal, notify, npcByRole } from './helpers';
import { overall, playerOverall } from './stats';
import { clamp, nextFloat, pick, weightedIndex } from './rng';
import { personName } from './world';
import { country } from '../content/countries';

export const COACH_TOPICS = ['playtime', 'advice', 'position', 'fatigue', 'tactics'] as const;
export type CoachTopic = (typeof COACH_TOPICS)[number];

export const TOPIC_LABELS: Record<CoachTopic, { label: string; icon: string; desc: string }> = {
  playtime: { label: 'Demander plus de temps de jeu', icon: '⏱️', desc: 'Il te dira franchement où tu en es.' },
  advice: { label: 'Demander des conseils de progression', icon: '📈', desc: 'Il fixe un axe de travail : progression accrue pendant 8 semaines.' },
  position: { label: 'Proposer de jouer à ton poste secondaire', icon: '🔄', desc: 'C’est lui qui décide si ça sert l’équipe.' },
  fatigue: { label: 'Signaler de la fatigue ou une douleur', icon: '🩺', desc: 'Il peut te ménager pour le prochain match.' },
  tactics: { label: 'Parler du système de jeu', icon: '📋', desc: 'Comprendre ce qu’il attend de toi.' },
};

const TOPIC_COOLDOWN = 4;

export function generateCoach(s: GameState, club: Pick<Club, 'tier' | 'country'>): CoachProfile {
  const styles: CoachStyle[] = ['offensif', 'equilibre', 'defensif', 'pressing', 'possession'];
  const w = club.tier >= 3 ? [1, 1, 0.7, 1.3, 1.4] : [1, 1.5, 1.2, 0.6, 0.6];
  const style = styles[Math.max(0, weightedIndex(s, w))];
  const temperament = pick(s, ['exigeant', 'paternel', 'pragmatique'] as CoachTemperament[]);
  const def = COACH_STYLES[style];
  return { name: personName(s, club.country), style, temperament, formation: def.formation, values: [...def.values], since: s.t, lastTalk: {}, focus: null };
}

export const coachOf = (s: GameState): CoachProfile | undefined => s.membership?.coach;

/** Adéquation entre le joueur et ce que l'entraîneur valorise (−10..+10 environ). */
export function styleFit(s: GameState, coach: CoachProfile): number {
  const a = s.player.attrs;
  const vals = coach.values.reduce((x, k) => x + a[k], 0) / coach.values.length;
  const all = (Object.values(a) as number[]).reduce((x, y) => x + y, 0) / Object.values(a).length;
  return clamp(vals - all, -12, 12);
}

/** Style d'un adversaire ou d'un sélectionneur, stable pour un même nom. */
export function styleFromName(name: string): CoachStyle {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return (['offensif', 'equilibre', 'defensif', 'pressing', 'possession'] as CoachStyle[])[Math.abs(h) % 5];
}

export function tacticOf(style: CoachStyle): Tactic {
  return { ...COACH_STYLES[style].tactic };
}

export interface MatchPlan {
  coachName: string;
  style: CoachStyle;
  temperament: CoachTemperament | null;
  formation: string;
  tactic: Tactic;
  instruction: Instruction | null;
  talk: string;
}

function instructionFor(style: CoachStyle, pos: Position, oppStronger: boolean, technique: number): Instruction {
  if (pos === 'GK') return style === 'possession' ? 'short_build' : 'hold_line';
  if (pos === 'DEF') return style === 'possession' ? 'short_build' : style === 'pressing' ? 'press' : style === 'offensif' ? 'support' : 'hold_line';
  if (pos === 'MID') {
    if (style === 'pressing') return 'press';
    if (style === 'possession') return 'support';
    if (style === 'offensif') return technique >= 45 ? 'freedom' : 'support';
    if (style === 'defensif') return 'safe';
    return oppStronger ? 'safe' : 'support';
  }
  if (style === 'pressing') return 'press';
  if (style === 'offensif') return 'freedom';
  if (style === 'possession') return 'support';
  return 'stay_high';
}

/** Plan du coach pour un match : système, tactique et consigne individuelle. */
export function matchPlan(s: GameState, m: MatchState): MatchPlan {
  const my = m.playerHome ? m.home : m.away;
  const opp = m.playerHome ? m.away : m.home;
  const oppStronger = opp.strength > my.strength + 2;
  const pos = s.identity.position;
  const small = m.kind === 'street' || ageAt(s) <= 10;
  if (m.kind === 'street') {
    return { coachName: 'Personne', style: 'offensif', temperament: null, formation: '2-3-1', tactic: tacticOf('offensif'), instruction: null, talk: 'Pas d’entraîneur au city-stade : chacun joue comme il le sent.' };
  }
  let style: CoachStyle;
  let name: string;
  let temperament: CoachTemperament | null = null;
  if (m.kind === 'national') {
    style = styleFromName(String(m.meta?.callup ?? my.name));
    name = `Le sélectionneur (${country(s.national.pendingCallup?.nation ?? s.identity.nationality).name})`;
  } else {
    const c = coachOf(s)!;
    style = c.style;
    name = c.name;
    temperament = c.temperament;
  }
  const tactic = tacticOf(style);
  // Le coach adapte son plan à l'adversaire, sans changer sa philosophie.
  if (oppStronger && style !== 'offensif') tactic.mentality = 'defensive';
  if (!oppStronger && opp.strength < my.strength - 4 && style !== 'defensif') tactic.mentality = 'attacking';
  const formation = small ? '2-3-1' : m.kind === 'national' ? COACH_STYLES[style].formation : coachOf(s)?.formation ?? COACH_STYLES[style].formation;
  const instruction = instructionFor(style, pos, oppStronger, s.player.attrs.technique);
  const talk = `${oppStronger ? 'Ils sont plus forts sur le papier : on reste compacts.' : opp.strength < my.strength - 4 ? 'On doit gagner ce match, on prend l’initiative.' : 'Match équilibré, les détails feront la différence.'} Toi : « ${INSTRUCTIONS[instruction].label} ».`;
  return { coachName: name, style, temperament, formation, tactic, instruction, talk };
}

/** Jugement du coach après le match : consigne suivie ou non, performance. */
export function coachVerdict(s: GameState, m: MatchState): string | null {
  if (m.kind === 'street' || m.entersAt >= 90 || m.rating === null) return null;
  const followed = Number(m.meta?.followed ?? 1) === 1;
  const c = m.kind === 'league' ? coachOf(s) : undefined;
  const temp: CoachTemperament = c?.temperament ?? 'pragmatique';
  const r = m.rating;
  let delta = (r - 6.3) * 2;
  let quote: string;
  if (followed) {
    delta += temp === 'exigeant' ? 2 : 1;
    quote = r >= 7 ? 'Exactement ce que je t’avais demandé. Continue.' : 'Tu as respecté le plan, c’est bien. Maintenant, il faut être plus décisif.';
  } else {
    delta += temp === 'exigeant' ? -6 : temp === 'paternel' ? -1.5 : r >= 7.5 ? 1 : -3;
    quote = r >= 7.5
      ? temp === 'exigeant' ? 'Tu as brillé, mais tu n’as pas fait ce que je voulais. La prochaine fois, c’est le banc.' : 'Tu as fait à ta façon et ça a marché. Pour cette fois.'
      : temp === 'paternel' ? 'Je t’avais donné une consigne pour t’aider. Fais-moi confiance.' : 'Tu n’as pas respecté les consignes et ça s’est vu.';
  }
  if (m.kind === 'league') changeRelation(s, 'coach', delta);
  const who = m.kind === 'national' ? 'Le sélectionneur' : 'Le coach';
  return `${who} : « ${quote} »`;
}

/** Entretien individuel avec l'entraîneur (1 action). */
export function meetCoach(s: GameState, topic: CoachTopic): { ok: boolean; message: string } {
  const c = coachOf(s);
  const club = s.membership && s.clubs.find((x) => x.id === s.membership!.clubId);
  if (!c || !club || !s.membership) return { ok: false, message: 'Tu n’as pas d’entraîneur pour l’instant.' };
  if (!s.prologue.done) return { ok: false, message: 'Termine d’abord le prologue.' };
  if (s.slots.left < 1) return { ok: false, message: 'Plus de temps libre cette semaine.' };
  const last = c.lastTalk[topic] ?? -99;
  if (s.t - last < TOPIC_COOLDOWN) return { ok: false, message: `Tu lui en as déjà parlé récemment (encore ${TOPIC_COOLDOWN - (s.t - last)} sem.).` };
  s.slots.left -= 1;
  s.weekLog.push(`coach_${topic}`);
  c.lastTalk[topic] = s.t;
  const npc = npcByRole(s, 'coach');
  const trust = npc?.relation ?? 50;
  const fit = styleFit(s, c);
  const gap = playerOverall(s) - teamLevel(s);
  const avg = s.recentRatings.length ? s.recentRatings.reduce((a, b) => a + b, 0) / s.recentRatings.length : 6.2;
  const T = c.temperament;
  let msg = '';
  switch (topic) {
    case 'playtime': {
      const score = gap + (trust - 50) / 6 + fit / 3 + (avg - 6.3) * 3 + (T === 'paternel' ? 2 : 0);
      if (s.membership.status === 'starter') {
        msg = '« Tu joues déjà, non ? Concentre-toi sur tes performances. »';
        changeRelation(s, 'coach', T === 'exigeant' ? -2 : 0);
      } else if (score > 1) {
        s.membership.status = s.membership.status === 'bench' ? 'rotation' : 'starter';
        changeRelation(s, 'coach', 2);
        msg = `« D’accord, tu as mérité ta chance. » Nouveau statut : ${s.membership.status === 'starter' ? 'titulaire' : 'remplaçant qui entre en jeu'}.`;
        journal(s, `${c.name} t’accorde plus de temps de jeu après un entretien.`, '⏱️', true);
      } else {
        const weak = c.values.slice().sort((a, b) => s.player.attrs[a] - s.player.attrs[b])[0];
        changeRelation(s, 'coach', T === 'exigeant' ? -3 : T === 'paternel' ? 1 : -1);
        msg = `« Pas encore. Travaille ${attrLabel(weak)} et sois régulier, ta place viendra. »`;
      }
      break;
    }
    case 'advice': {
      const target = c.values.slice().sort((a, b) => s.player.attrs[a] - s.player.attrs[b])[0];
      c.focus = { attr: target, until: s.t + 8 };
      changeRelation(s, 'coach', T === 'paternel' ? 4 : 2);
      msg = `« Ton axe de travail : ${attrLabel(target)}. » Tes séances qui travaillent ${attrLabel(target)} progressent 30 % plus vite pendant 8 semaines.`;
      break;
    }
    case 'position': {
      const sec = s.identity.secondaryPosition;
      if (!sec) { msg = '« Tu n’as pas d’autre poste. Deviens indispensable au tien. »'; break; }
      const here = overall(s.player.attrs, s.identity.position);
      const there = overall(s.player.attrs, sec);
      if (there >= here - 2 && (trust >= 50 || T === 'pragmatique')) {
        const old = s.identity.position;
        s.identity.position = sec;
        s.identity.secondaryPosition = old;
        changeRelation(s, 'coach', 1);
        msg = `« Essayons. » Le coach te repositionne : ${posLabel(sec)} (ancien poste : ${posLabel(old)}).`;
        journal(s, `${c.name} te fait changer de poste : ${posLabel(sec)}.`, '🔄', true);
      } else {
        changeRelation(s, 'coach', T === 'exigeant' ? -2 : 0);
        msg = `« Non. Au poste de ${posLabel(sec)}, tu serais moins utile (${Math.round(there)} contre ${Math.round(here)}). »`;
      }
      break;
    }
    case 'fatigue': {
      const tired = s.player.load > 60 || s.player.energy < 45 || (s.events.flags.niggleHidden ?? 0) > 0;
      if (tired) {
        s.events.flags.coachRest = s.t + 1;
        s.events.flags.niggleHidden = 0;
        s.player.energy = clamp(s.player.energy + 12);
        changeRelation(s, 'coach', T === 'exigeant' ? -1 : T === 'paternel' ? 3 : 1);
        msg = '« Merci de me le dire. Tu seras ménagé pour le prochain match. »';
      } else {
        changeRelation(s, 'coach', T === 'exigeant' ? -3 : -1);
        msg = '« Tu m’as l’air en pleine forme. Je n’aime pas qu’on cherche des excuses. »';
      }
      break;
    }
    case 'tactics': {
      const st = COACH_STYLES[c.style];
      s.player.attrs.tactics = clamp(s.player.attrs.tactics + 0.6, 1, 99);
      changeRelation(s, 'coach', 2);
      msg = `« On joue en ${c.formation}, style ${st.label.toLowerCase()} : ${st.description} J’attends surtout ${c.values.map(attrLabel).join(', ')}. »`;
      break;
    }
  }
  return { ok: true, message: `${c.name} (${TEMPERAMENTS[T].label.toLowerCase()}) — ${msg}` };
}

export function teamLevel(s: GameState): number {
  const club = s.membership && s.clubs.find((x) => x.id === s.membership!.clubId);
  if (!club) return playerOverall(s);
  const age = ageAt(s);
  const base = age <= 18 ? 18 + (age - 8) * 4.6 : Math.min(72, 64 + (age - 18) * 1.4);
  return base + ([0, -4, 0, 5, 9][club.tier] ?? 0) + (club.facilities - 50) / 25;
}

/** Changement d'entraîneur (licenciement après de mauvais résultats). */
export function replaceCoach(s: GameState, reason: string) {
  const club = s.membership && s.clubs.find((x) => x.id === s.membership!.clubId);
  if (!club || !s.membership) return;
  const old = s.membership.coach.name;
  const c = generateCoach(s, club);
  s.membership.coach = c;
  s.membership.coachId = c.name;
  const npc = npcByRole(s, 'coach');
  if (npc) {
    npc.name = c.name;
    npc.relation = 45 + nextFloat(s) * 10;
    npc.note = `Nouvel entraîneur (${COACH_STYLES[c.style].label.toLowerCase()}, ${TEMPERAMENTS[c.temperament].label.toLowerCase()}).`;
    npc.met = s.t;
  }
  notify(s, 'info', 'Nouvel entraîneur', `${old} quitte le club (${reason}). ${c.name} arrive avec un style ${COACH_STYLES[c.style].label.toLowerCase()}.`);
  journal(s, `Changement d’entraîneur : ${c.name} remplace ${old}.`, '🔁', true);
}

const ATTR_FR: Record<AttrKey, string> = {
  technique: 'ta technique', passing: 'ta passe', dribbling: 'ton dribble', shooting: 'ta frappe', vision: 'ta vision du jeu', defending: 'ta défense', speed: 'ta vitesse',
  stamina: 'ton endurance', strength: 'ta force', tactics: 'ton intelligence tactique', mental: 'ton mental', discipline: 'ta discipline', reflexes: 'tes réflexes',
};
export const attrLabel = (k: AttrKey) => ATTR_FR[k];
const posLabel = (p: Position) => ({ GK: 'gardien', DEF: 'défenseur', MID: 'milieu', ATT: 'attaquant' })[p];
