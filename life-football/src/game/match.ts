// Moteur de match : simulation par tranches de 5 minutes + moments clés décidés par le joueur.
// Les résultats sont calculés (forces des équipes, compétences, forme, moral, hasard), jamais scénarisés.

import type { AttrKey, GameState, SquadStatus } from './types';
import { clamp, nextFloat, pick, sigmoid, uid, type RngHolder } from './rng';
import { overall } from './stats';

export type MatchKind = 'street' | 'league' | 'national' | 'friendly';
export type Approach = 'calm' | 'aggressive' | 'focused';
export type Preparation = 'light' | 'normal' | 'intense';

export interface MatchTeam {
  name: string;
  short: string;
  strength: number;
  colors: [string, string];
}

export interface MomentOption {
  id: string;
  label: string;
  attrs: AttrKey[];
  base: number; // logit de base (difficulté)
  quality: number; // pertinence tactique 0..1 (valorisée par l'entraîneur)
  onSuccess: { goalFor?: number; assist?: boolean; preventGoal?: boolean; rating: number; text: string };
  onFail: { goalAgainst?: number; rating: number; text: string; card?: number };
  chance?: number;
  risk?: 'faible' | 'moyen' | 'élevé';
}

export interface MatchMoment {
  minute: number;
  key: string;
  text: string;
  options: MomentOption[];
  resolved?: { optionId: string; success: boolean; text: string; goal?: 'for' | 'against' | null };
}

export interface TickerItem {
  minute: number;
  text: string;
  kind: 'goal_for' | 'goal_against' | 'info' | 'moment' | 'card' | 'whistle';
}

export interface MatchState {
  id: string;
  kind: MatchKind;
  competition: string;
  importance: number; // 0.5 .. 2
  home: MatchTeam;
  away: MatchTeam;
  playerHome: boolean;
  minute: number;
  score: [number, number]; // [domicile, extérieur]
  ticker: TickerItem[];
  moments: MatchMoment[];
  momentIdx: number;
  status: 'pre' | 'live' | 'moment' | 'done';
  squadStatus: SquadStatus;
  entersAt: number;
  approach: Approach;
  preparation: Preparation;
  ratingDelta: number;
  rating: number | null;
  stats: { goals: number; assists: number; saves: number; momentsWon: number; momentsTotal: number; yellow: number };
  scoutWatching: boolean;
  meta?: Record<string, string | number>;
}

// ———————————————————————————————————————————— Modèles de moments clés

type Ctx = { min: number; my: MatchTeam; opp: MatchTeam; diff: number };
type Template = { key: string; positions: Array<'GK' | 'DEF' | 'MID' | 'ATT'>; text: (c: Ctx) => string; options: MomentOption[] };

const T: Template[] = [
  {
    key: 'one_on_one', positions: ['ATT', 'MID'],
    text: (c) => `${c.min}e minute. Une passe en profondeur te met seul face au gardien de ${c.opp.name} !`,
    options: [
      { id: 'shoot', label: 'Frappe placée', attrs: ['shooting', 'technique', 'mental'], base: 0.2, quality: 0.9, onSuccess: { goalFor: 1, rating: 1.1, text: 'Petit côté, imparable. BUT !' }, onFail: { rating: -0.3, text: 'Le gardien s’interpose du pied.' } },
      { id: 'dribble', label: 'Dribbler le gardien', attrs: ['dribbling', 'speed', 'mental'], base: -0.3, quality: 0.6, onSuccess: { goalFor: 1, rating: 1.3, text: 'Crochet, but vide. Quelle maîtrise !' }, onFail: { rating: -0.4, text: 'Le gardien plonge dans tes pieds.' } },
      { id: 'pass', label: 'Servir le coéquipier à côté', attrs: ['passing', 'vision'], base: 0.8, quality: 0.7, onSuccess: { goalFor: 0.7, assist: true, rating: 0.6, text: 'Ballon en retrait parfait.' }, onFail: { rating: -0.4, text: 'Passe interceptée par un défenseur revenu.' } },
    ],
  },
  {
    key: 'edge_box', positions: ['ATT', 'MID'],
    text: (c) => `${c.min}e minute. ${c.diff < 0 ? `Ton équipe est menée.` : c.diff > 0 ? 'Vous menez au score.' : 'Le score est serré.'} Tu récupères le ballon à l’entrée de la surface.`,
    options: [
      { id: 'shoot', label: 'Frapper tout de suite', attrs: ['shooting', 'technique'], base: -1.1, quality: 0.5, onSuccess: { goalFor: 1, rating: 1.2, text: 'Frappe enroulée en pleine lucarne !' }, onFail: { rating: -0.2, text: 'Ta frappe passe au-dessus.' } },
      { id: 'dribble', label: 'Éliminer son défenseur', attrs: ['dribbling', 'speed'], base: -0.4, quality: 0.55, onSuccess: { goalFor: 0.45, rating: 0.6, text: 'Tu effaces ton vis-à-vis et frappes : le gardien repousse… ' }, onFail: { goalAgainst: 0.12, rating: -0.3, text: 'Ballon perdu, contre adverse.' } },
      { id: 'pass', label: 'Passe dans l’intervalle', attrs: ['passing', 'vision'], base: 0.1, quality: 0.8, onSuccess: { goalFor: 0.4, assist: true, rating: 0.5, text: 'Passe millimétrée pour ton coéquipier.' }, onFail: { rating: -0.2, text: 'Passe trop appuyée.' } },
      { id: 'hold', label: 'Temporiser et garder le ballon', attrs: ['tactics', 'technique'], base: 1.3, quality: 0.45, onSuccess: { rating: 0.15, text: 'Tu calmes le jeu, l’équipe remonte.' }, onFail: { rating: -0.2, text: 'Pressé de toutes parts, tu concèdes une touche.' } },
    ],
  },
  {
    key: 'counter', positions: ['ATT', 'MID'],
    text: (c) => `${c.min}e minute. Contre-attaque à trois contre deux ! Tu as le ballon plein axe.`,
    options: [
      { id: 'pass', label: 'Décaler sur l’aile', attrs: ['passing', 'vision'], base: 0.6, quality: 0.85, onSuccess: { goalFor: 0.45, assist: true, rating: 0.6, text: 'Décalage parfait, ton ailier conclut ?' }, onFail: { rating: -0.3, text: 'La passe est coupée.' } },
      { id: 'dribble', label: 'Accélérer seul', attrs: ['speed', 'dribbling'], base: -0.2, quality: 0.5, onSuccess: { goalFor: 0.5, rating: 0.7, text: 'Tu files au but…' }, onFail: { goalAgainst: 0.1, rating: -0.3, text: 'Rattrapé et taclé proprement.' } },
      { id: 'shoot', label: 'Frapper de loin', attrs: ['shooting'], base: -1.5, quality: 0.25, onSuccess: { goalFor: 1, rating: 1.2, text: 'Une mine des 30 mètres !' }, onFail: { rating: -0.4, text: 'Frappe précipitée, l’action est gâchée.' } },
    ],
  },
  {
    key: 'cross', positions: ['ATT'],
    text: (c) => `${c.min}e minute. Centre venu de la droite, tu es au point de penalty, marqué de près.`,
    options: [
      { id: 'header', label: 'Tête puissante', attrs: ['strength', 'shooting'], base: -0.4, quality: 0.75, onSuccess: { goalFor: 1, rating: 1.1, text: 'Tête rageuse au fond des filets !' }, onFail: { rating: -0.2, text: 'Le défenseur est plus haut que toi.' } },
      { id: 'volley', label: 'Reprise de volée', attrs: ['technique', 'shooting'], base: -1.0, quality: 0.55, onSuccess: { goalFor: 1, rating: 1.4, text: 'Reprise acrobatique : sublime !' }, onFail: { rating: -0.3, text: 'Ta reprise s’envole.' } },
      { id: 'lay', label: 'Remiser pour le milieu', attrs: ['passing', 'vision'], base: 0.3, quality: 0.6, onSuccess: { goalFor: 0.35, assist: true, rating: 0.4, text: 'Remise intelligente.' }, onFail: { rating: -0.1, text: 'Le ballon est dégagé.' } },
    ],
  },
  {
    key: 'transition', positions: ['MID', 'DEF'],
    text: (c) => `${c.min}e minute. Tu récupères au milieu, l’adversaire est désorganisé.`,
    options: [
      { id: 'long', label: 'Longue passe en profondeur', attrs: ['vision', 'passing'], base: -0.3, quality: 0.8, onSuccess: { goalFor: 0.35, assist: true, rating: 0.6, text: 'Ouverture lumineuse !' }, onFail: { rating: -0.2, text: 'Trop longue, sortie de but.' } },
      { id: 'carry', label: 'Porter le ballon', attrs: ['dribbling', 'speed', 'stamina'], base: 0, quality: 0.55, onSuccess: { goalFor: 0.2, rating: 0.4, text: 'Tu remontes 40 mètres balle au pied.' }, onFail: { goalAgainst: 0.1, rating: -0.3, text: 'Perte de balle dangereuse.' } },
      { id: 'simple', label: 'Passe simple et sûre', attrs: ['passing', 'tactics'], base: 1.4, quality: 0.5, onSuccess: { rating: 0.15, text: 'Possession conservée.' }, onFail: { rating: -0.2, text: 'Passe ratée, pas de conséquence.' } },
      { id: 'shoot', label: 'Tenter sa chance de loin', attrs: ['shooting'], base: -1.8, quality: 0.2, onSuccess: { goalFor: 1, rating: 1.2, text: 'Une frappe de mule qui fait mouche !' }, onFail: { rating: -0.3, text: 'Frappe contrée.' } },
    ],
  },
  {
    key: 'press', positions: ['MID', 'ATT', 'DEF'],
    text: (c) => `${c.min}e minute. ${c.opp.name} relance court devant sa surface. Tu peux presser.`,
    options: [
      { id: 'press', label: 'Presser fort', attrs: ['stamina', 'speed', 'defending'], base: -0.2, quality: 0.7, onSuccess: { goalFor: 0.3, rating: 0.6, text: 'Récupération haute ! Occasion immédiate.' }, onFail: { goalAgainst: 0.06, rating: -0.15, text: 'Éliminé d’une passe, l’adversaire progresse.' } },
      { id: 'cover', label: 'Couper la ligne de passe', attrs: ['tactics', 'vision'], base: 0.5, quality: 0.75, onSuccess: { rating: 0.4, text: 'Bien placé, tu interceptes.' }, onFail: { rating: -0.1, text: 'Ils trouvent une autre solution.' } },
      { id: 'foul', label: 'Faute tactique', attrs: ['discipline', 'tactics'], base: 1.0, quality: 0.3, onSuccess: { rating: 0, text: 'Faute intelligente, l’action est stoppée.' }, onFail: { rating: -0.4, text: 'Carton jaune.', card: 1 } },
    ],
  },
  {
    key: 'free_kick', positions: ['MID', 'ATT'],
    text: (c) => `${c.min}e minute. Coup franc à 25 mètres, légèrement excentré. Le ballon est pour toi.`,
    options: [
      { id: 'direct', label: 'Frappe directe', attrs: ['shooting', 'technique'], base: -1.4, quality: 0.55, onSuccess: { goalFor: 1, rating: 1.3, text: 'Par-dessus le mur, sous la barre !' }, onFail: { rating: -0.1, text: 'Dans le mur.' } },
      { id: 'cross', label: 'Centre au second poteau', attrs: ['passing', 'vision'], base: -0.2, quality: 0.65, onSuccess: { goalFor: 0.4, assist: true, rating: 0.5, text: 'Centre parfait sur la tête d’un coéquipier.' }, onFail: { rating: -0.1, text: 'Dégagé par la défense.' } },
      { id: 'combo', label: 'Combinaison à deux', attrs: ['tactics', 'passing'], base: 0.4, quality: 0.5, onSuccess: { goalFor: 0.2, rating: 0.3, text: 'La combinaison surprend tout le monde.' }, onFail: { rating: -0.2, text: 'Combinaison mal exécutée.' } },
    ],
  },
  {
    key: 'counter_defend', positions: ['DEF', 'MID'],
    text: (c) => `${c.min}e minute. Contre adverse ! Leur attaquant fonce vers ta zone, tu es le dernier défenseur.`,
    options: [
      { id: 'tackle', label: 'Tacler', attrs: ['defending', 'strength'], base: -0.1, quality: 0.6, onSuccess: { preventGoal: true, rating: 0.8, text: 'Tacle parfait, ballon récupéré !' }, onFail: { goalAgainst: 0.55, rating: -0.6, text: 'Tu te jettes… et tu es éliminé.' } },
      { id: 'hold', label: 'Temporiser, attendre le retour', attrs: ['tactics', 'speed'], base: 0.4, quality: 0.85, onSuccess: { preventGoal: true, rating: 0.6, text: 'Tu le pousses à l’extérieur, la défense se replace.' }, onFail: { goalAgainst: 0.4, rating: -0.4, text: 'Il accélère et frappe…' } },
      { id: 'foul', label: 'Faute volontaire', attrs: ['discipline'], base: 1.6, quality: 0.35, onSuccess: { preventGoal: true, rating: -0.1, text: 'Faute, carton jaune, mais le danger est écarté.' }, onFail: { goalAgainst: 0.75, rating: -0.8, text: 'Faute dans la surface : penalty !' , card: 1 } },
    ],
  },
  {
    key: 'aerial', positions: ['DEF'],
    text: (c) => `${c.min}e minute. Corner pour ${c.opp.name}. Tu es au marquage de leur meilleur joueur de tête.`,
    options: [
      { id: 'duel', label: 'Duel aérien', attrs: ['strength', 'defending'], base: 0.1, quality: 0.7, onSuccess: { preventGoal: true, rating: 0.5, text: 'Tu gagnes le duel et dégages loin.' }, onFail: { goalAgainst: 0.35, rating: -0.5, text: 'Il te prend le dessus de la tête…' } },
      { id: 'anticipate', label: 'Anticiper la trajectoire', attrs: ['tactics', 'speed'], base: 0, quality: 0.8, onSuccess: { preventGoal: true, rating: 0.6, text: 'Tu coupes la trajectoire avant tout le monde.' }, onFail: { goalAgainst: 0.3, rating: -0.4, text: 'Mauvaise lecture, il est seul.' } },
    ],
  },
  {
    key: 'build_up', positions: ['DEF', 'GK'],
    text: (c) => `${c.min}e minute. Relance sous pression : deux attaquants de ${c.opp.name} se ruent sur toi.`,
    options: [
      { id: 'short', label: 'Relance courte au sol', attrs: ['passing', 'technique', 'mental'], base: 0.3, quality: 0.7, onSuccess: { rating: 0.4, goalFor: 0.08, text: 'Pressing cassé, ton équipe lance l’attaque.' }, onFail: { goalAgainst: 0.4, rating: -0.7, text: 'Interception devant ton but !' } },
      { id: 'long', label: 'Jouer long', attrs: ['vision', 'passing'], base: 0.4, quality: 0.6, onSuccess: { rating: 0.3, text: 'Ballon long bien trouvé.' }, onFail: { rating: -0.1, text: 'Le ballon revient vite.' } },
      { id: 'clear', label: 'Dégager en touche', attrs: ['discipline'], base: 2.0, quality: 0.45, onSuccess: { rating: 0.05, text: 'Pas de risque.' }, onFail: { rating: -0.2, text: 'Dégagement manqué.' } },
    ],
  },
  {
    key: 'corner_attack', positions: ['DEF'],
    text: (c) => `${c.min}e minute. Corner pour ton équipe, tu montes dans la surface adverse.`,
    options: [
      { id: 'header', label: 'Attaquer le premier poteau', attrs: ['strength', 'shooting'], base: -0.9, quality: 0.6, onSuccess: { goalFor: 1, rating: 1.2, text: 'Coup de tête victorieux du défenseur !' }, onFail: { rating: 0, text: 'Le ballon passe au-dessus.' } },
      { id: 'block', label: 'Faire écran pour un coéquipier', attrs: ['tactics', 'strength'], base: 0.4, quality: 0.6, onSuccess: { goalFor: 0.25, assist: false, rating: 0.3, text: 'Ton bloc libère un partenaire.' }, onFail: { rating: 0, text: 'Corner dégagé.' } },
    ],
  },
  {
    key: 'shot_save', positions: ['GK'],
    text: (c) => `${c.min}e minute. Frappe puissante de ${c.opp.name} à 18 mètres, en direction de ta lucarne !`,
    options: [
      { id: 'dive', label: 'Plonger main ferme', attrs: ['reflexes', 'speed'], base: 0, quality: 0.75, onSuccess: { preventGoal: true, rating: 0.9, text: 'Parade décisive !' }, onFail: { goalAgainst: 0.85, rating: -0.4, text: 'Trop loin, même pour toi.' } },
      { id: 'catch', label: 'Tenter de capter', attrs: ['reflexes', 'technique', 'mental'], base: -0.6, quality: 0.6, onSuccess: { preventGoal: true, rating: 1.0, text: 'Captée en deux temps, sang-froid total.' }, onFail: { goalAgainst: 0.9, rating: -0.5, text: 'Le ballon t’échappe…' } },
      { id: 'punch', label: 'Boxer en corner', attrs: ['reflexes', 'strength'], base: 0.3, quality: 0.65, onSuccess: { preventGoal: true, rating: 0.7, text: 'Claquée en corner.' }, onFail: { goalAgainst: 0.7, rating: -0.4, text: 'Tu touches mais ça rentre.' } },
    ],
  },
  {
    key: 'gk_one_on_one', positions: ['GK'],
    text: (c) => `${c.min}e minute. Un attaquant de ${c.opp.name} file seul vers ton but !`,
    options: [
      { id: 'rush', label: 'Sortir dans ses pieds', attrs: ['speed', 'mental', 'reflexes'], base: -0.1, quality: 0.7, onSuccess: { preventGoal: true, rating: 1.0, text: 'Sortie courageuse, ballon capté !' }, onFail: { goalAgainst: 0.85, rating: -0.4, text: 'Il te contourne…' } },
      { id: 'angle', label: 'Fermer l’angle', attrs: ['tactics', 'reflexes'], base: 0.1, quality: 0.85, onSuccess: { preventGoal: true, rating: 0.9, text: 'Il frappe sur toi. Bien placé !' }, onFail: { goalAgainst: 0.8, rating: -0.3, text: 'Frappe croisée imparable.' } },
      { id: 'line', label: 'Rester sur ta ligne', attrs: ['reflexes'], base: -0.5, quality: 0.4, onSuccess: { preventGoal: true, rating: 0.8, text: 'Réflexe fou sur sa frappe !' }, onFail: { goalAgainst: 0.9, rating: -0.3, text: 'Il ajuste tranquillement.' } },
    ],
  },
  {
    key: 'gk_cross', positions: ['GK'],
    text: (c) => `${c.min}e minute. Centre aérien dans ta surface, plusieurs joueurs au duel.`,
    options: [
      { id: 'claim', label: 'Sortir capter', attrs: ['strength', 'reflexes', 'mental'], base: -0.2, quality: 0.75, onSuccess: { preventGoal: true, rating: 0.6, text: 'Tu captes au-dessus de la mêlée.' }, onFail: { goalAgainst: 0.45, rating: -0.6, text: 'Sortie manquée, ballon dans la surface…' } },
      { id: 'stay', label: 'Rester sur ta ligne', attrs: ['reflexes', 'tactics'], base: 0.3, quality: 0.5, onSuccess: { preventGoal: true, rating: 0.3, text: 'Ta défense dégage.' }, onFail: { goalAgainst: 0.35, rating: -0.3, text: 'Tête à bout portant.' } },
    ],
  },
];

// ———————————————————————————————————————————— Construction

export interface MatchSetup {
  kind: MatchKind;
  competition: string;
  importance: number;
  my: MatchTeam;
  opp: MatchTeam;
  home: boolean;
  squadStatus: SquadStatus;
  scoutWatching?: boolean;
  meta?: Record<string, string | number>;
}

export function createMatch(h: RngHolder, setup: MatchSetup): MatchState {
  return {
    id: uid(h, 'm'),
    kind: setup.kind,
    competition: setup.competition,
    importance: setup.importance,
    home: setup.home ? setup.my : setup.opp,
    away: setup.home ? setup.opp : setup.my,
    playerHome: setup.home,
    minute: 0,
    score: [0, 0],
    ticker: [],
    moments: [],
    momentIdx: 0,
    status: 'pre',
    squadStatus: setup.squadStatus,
    entersAt: setup.squadStatus === 'starter' ? 0 : setup.squadStatus === 'rotation' ? 60 : 999,
    approach: 'focused',
    preparation: 'normal',
    ratingDelta: 0,
    rating: null,
    stats: { goals: 0, assists: 0, saves: 0, momentsWon: 0, momentsTotal: 0, yellow: 0 },
    scoutWatching: !!setup.scoutWatching,
    meta: setup.meta,
  };
}

export const myTeam = (m: MatchState) => (m.playerHome ? m.home : m.away);
export const oppTeam = (m: MatchState) => (m.playerHome ? m.away : m.home);
export const myScore = (m: MatchState) => (m.playerHome ? m.score[0] : m.score[1]);
export const oppScore = (m: MatchState) => (m.playerHome ? m.score[1] : m.score[0]);

/** Lancement : applique la préparation et l'approche, génère les moments clés du joueur. */
export function kickOff(h: RngHolder, m: MatchState, s: GameState, approach: Approach, preparation: Preparation) {
  m.approach = approach;
  m.preparation = preparation;
  if (preparation === 'intense') s.player.energy = clamp(s.player.energy - 6);
  if (preparation === 'light') s.player.energy = clamp(s.player.energy + 4);
  const playing = m.entersAt < 90;
  const count = !playing ? 0 : m.squadStatus === 'starter' ? (m.kind === 'street' ? 3 : 4) : 2;
  const start = Math.max(m.entersAt + 3, 4);
  const pos = s.identity.position;
  const pool = T.filter((t) => t.positions.includes(pos));
  const used: string[] = [];
  const minutes: number[] = [];
  for (let i = 0; i < count; i++) {
    const span = (88 - start) / count;
    minutes.push(Math.round(start + span * i + nextFloat(h) * span * 0.8));
  }
  for (const min of minutes) {
    let tpl = pick(h, pool);
    for (let tries = 0; tries < 4 && used.includes(tpl.key); tries++) tpl = pick(h, pool);
    used.push(tpl.key);
    m.moments.push({ minute: Math.min(89, min), key: tpl.key, text: '', options: tpl.options.map((o) => ({ ...o, onSuccess: { ...o.onSuccess }, onFail: { ...o.onFail } })) });
  }
  m.status = 'live';
  m.ticker.push({ minute: 0, text: `Coup d’envoi : ${m.home.name} – ${m.away.name}.`, kind: 'whistle' });
  if (m.entersAt > 0 && m.entersAt < 90) m.ticker.push({ minute: 0, text: `Tu commences sur le banc. Entrée prévue vers la ${m.entersAt}e minute.`, kind: 'info' });
  if (m.entersAt >= 90) m.ticker.push({ minute: 0, text: 'Tu n’es pas retenu pour ce match. Tu regardes depuis le banc.', kind: 'info' });
}

/** Force effective de l'équipe du joueur (sa présence sur le terrain compte). */
function effectiveStrength(m: MatchState, s: GameState, mine: boolean): number {
  const t = mine ? myTeam(m) : oppTeam(m);
  if (!mine) return t.strength;
  const onPitch = m.minute >= m.entersAt;
  const ovr = overall(s.player.attrs, s.identity.position);
  const fatigue = (s.player.energy - 60) / 20; // -3..+2
  return t.strength + (onPitch ? (ovr - t.strength) * 0.12 + fatigue * 0.5 : 0);
}

const FLAVOR_FOR = ['Belle séquence de passes de {my}.', 'Corner pour {my}.', 'Tête au-dessus pour {my}.', '{my} pousse pour marquer.'];
const FLAVOR_AGAINST = ['{opp} met la pression.', 'Frappe de {opp} à côté.', 'Grosse occasion pour {opp} !', 'Carton jaune pour un joueur de {opp}.'];

function tick(h: RngHolder, m: MatchState, s: GameState) {
  m.minute = Math.min(90, m.minute + 5);
  const a = effectiveStrength(m, s, true);
  const b = effectiveStrength(m, s, false);
  const base = m.kind === 'street' ? 0.075 : 0.056;
  const pFor = base * Math.exp((a - b) / 22);
  const pAgainst = base * Math.exp((b - a) / 22);
  const r = nextFloat(h);
  const min = m.minute - Math.floor(nextFloat(h) * 4);
  if (r < pFor) scoreGoal(m, true, min, `⚽ But de ${myTeam(m).name} !`);
  else if (r < pFor + pAgainst) scoreGoal(m, false, min, `But de ${oppTeam(m).name}.`);
  else if (r > 0.9) {
    const mine = nextFloat(h) < 0.5;
    const txt = pick(h, mine ? FLAVOR_FOR : FLAVOR_AGAINST).replace('{my}', myTeam(m).name).replace('{opp}', oppTeam(m).name);
    m.ticker.push({ minute: min, text: txt, kind: 'info' });
  }
  if (m.minute === 45) m.ticker.push({ minute: 45, text: `Mi-temps : ${m.score[0]} – ${m.score[1]}.`, kind: 'whistle' });
  if (m.entersAt > 0 && m.entersAt < 90 && m.minute === m.entersAt) m.ticker.push({ minute: m.minute, text: 'Changement : tu entres en jeu !', kind: 'info' });
}

function scoreGoal(m: MatchState, mine: boolean, minute: number, text: string) {
  const idx = mine === m.playerHome ? 0 : 1;
  m.score[idx] += 1;
  m.ticker.push({ minute, text, kind: mine ? 'goal_for' : 'goal_against' });
}

/** Avance jusqu'au prochain moment clé ou à la fin du match. */
export function advance(h: RngHolder, m: MatchState, s: GameState) {
  if (m.status === 'done' || m.status === 'pre') return;
  const next = m.moments[m.momentIdx];
  while (m.minute < 90) {
    if (next && m.minute + 5 > next.minute) {
      prepareMoment(m, s, next);
      m.status = 'moment';
      return;
    }
    tick(h, m, s);
  }
  if (next && !next.resolved) {
    prepareMoment(m, s, next);
    m.status = 'moment';
    return;
  }
  finishMatch(h, m, s);
}

/** Probabilité de réussite d'une option, selon compétences, énergie, moral, approche et adversaire. */
export function optionChance(s: GameState, m: MatchState, o: MomentOption): number {
  const p = s.player;
  const skill = o.attrs.reduce((sum, k) => sum + p.attrs[k], 0) / o.attrs.length;
  const opp = oppTeam(m).strength;
  let x = (skill - opp) / 11 + o.base;
  x += (p.energy - 60) / 60; // fatigue
  x += (p.morale - 60) / 120;
  x += (p.form - 50) / 150;
  if (p.boots.wear > 85) x -= 0.12;
  if (m.approach === 'aggressive' && ['tackle', 'press', 'shoot', 'dribble', 'header', 'rush', 'duel'].includes(o.id)) x += 0.3;
  if (m.approach === 'aggressive' && ['hold', 'cover', 'simple', 'angle', 'stay'].includes(o.id)) x -= 0.15;
  if (m.approach === 'calm' && ['hold', 'pass', 'simple', 'cover', 'short', 'angle'].includes(o.id)) x += 0.25;
  if (m.approach === 'focused') x += (p.attrs.mental - 40) / 200;
  if (m.preparation === 'intense') x += 0.12;
  return clamp(sigmoid(x), 0.05, 0.95);
}

function prepareMoment(m: MatchState, s: GameState, mo: MatchMoment) {
  const tpl = T.find((t) => t.key === mo.key)!;
  const diff = myScore(m) - oppScore(m);
  mo.text = tpl.text({ min: mo.minute, my: myTeam(m), opp: oppTeam(m), diff });
  for (const o of mo.options) {
    o.chance = optionChance(s, m, o);
    const failCost = o.onFail.goalAgainst ?? 0;
    o.risk = failCost >= 0.4 || (o.chance < 0.35 && failCost > 0) ? 'élevé' : failCost > 0.05 || o.chance < 0.45 ? 'moyen' : 'faible';
  }
  m.minute = Math.max(m.minute, mo.minute);
}

export function chanceLabel(c: number): string {
  if (c >= 0.75) return 'Très bonnes chances';
  if (c >= 0.58) return 'Bonnes chances';
  if (c >= 0.42) return 'Chances moyennes';
  if (c >= 0.25) return 'Chances faibles';
  return 'Pari risqué';
}

export function resolveMoment(h: RngHolder, m: MatchState, s: GameState, optionId: string) {
  const mo = m.moments[m.momentIdx];
  if (!mo || m.status !== 'moment') return;
  const o = mo.options.find((x) => x.id === optionId) ?? mo.options[0];
  const success = nextFloat(h) < (o.chance ?? 0.5);
  let goal: 'for' | 'against' | null = null;
  let text: string;
  m.stats.momentsTotal += 1;
  // Bonne décision = valorisée même si l'exécution échoue.
  m.ratingDelta += (o.quality - 0.55) * 0.5;
  if (success) {
    m.stats.momentsWon += 1;
    m.ratingDelta += o.onSuccess.rating;
    text = o.onSuccess.text;
    if (o.onSuccess.preventGoal && s.identity.position === 'GK') m.stats.saves += 1;
    if (o.onSuccess.goalFor && nextFloat(h) < o.onSuccess.goalFor) {
      goal = 'for';
      if (o.onSuccess.assist) {
        m.stats.assists += 1;
        m.ratingDelta += 0.35;
        text += ' But de ton coéquipier, passe décisive pour toi !';
        scoreGoal(m, true, mo.minute, `⚽ But de ${myTeam(m).name} sur ta passe décisive !`);
      } else {
        m.stats.goals += 1;
        scoreGoal(m, true, mo.minute, `⚽ BUT ! Tu marques pour ${myTeam(m).name} !`);
      }
    } else if (o.onSuccess.goalFor && o.onSuccess.goalFor < 1) {
      text += ' Mais l’occasion n’est pas convertie.';
    }
  } else {
    m.ratingDelta += o.onFail.rating;
    text = o.onFail.text;
    if (o.onFail.card) {
      m.stats.yellow += 1;
      text += ' 🟨';
    }
    if (o.onFail.goalAgainst && nextFloat(h) < o.onFail.goalAgainst) {
      goal = 'against';
      m.ratingDelta -= 0.2;
      text += ` ${oppTeam(m).name} marque.`;
      scoreGoal(m, false, mo.minute, `But de ${oppTeam(m).name}.`);
    }
  }
  mo.resolved = { optionId: o.id, success, text, goal };
  m.ticker.push({ minute: mo.minute, text: `${success ? '✅' : '❌'} ${o.label} — ${text}`, kind: 'moment' });
  m.momentIdx += 1;
  m.status = 'live';
}

function finishMatch(h: RngHolder, m: MatchState, s: GameState) {
  m.minute = 90;
  m.status = 'done';
  m.ticker.push({ minute: 90, text: `Coup de sifflet final : ${m.home.name} ${m.score[0]} – ${m.score[1]} ${m.away.name}.`, kind: 'whistle' });
  if (m.entersAt >= 90) {
    m.rating = null;
    return;
  }
  const diff = myScore(m) - oppScore(m);
  const ovr = overall(s.player.attrs, s.identity.position);
  let r = 6 + m.ratingDelta;
  r += diff > 0 ? 0.3 : diff < 0 ? -0.3 : 0;
  r += clamp((ovr - oppTeam(m).strength) / 25, -0.6, 0.6);
  r += (nextFloat(h) - 0.5) * 0.8;
  r += (s.player.energy - 55) / 150;
  if (s.identity.position === 'GK' || s.identity.position === 'DEF') r += oppScore(m) === 0 ? 0.5 : -0.15 * oppScore(m);
  m.rating = Math.round(clamp(r, 3, 10) * 10) / 10;
}

export function resultLabel(m: MatchState): 'V' | 'N' | 'D' {
  const d = myScore(m) - oppScore(m);
  return d > 0 ? 'V' : d < 0 ? 'D' : 'N';
}

/** Simulation rapide (sans moments) : utilisée pour les autres matchs du championnat. */
export function quickSim(h: RngHolder, a: number, b: number): [number, number] {
  let ga = 0;
  let gb = 0;
  for (let i = 0; i < 18; i++) {
    const pa = 0.056 * Math.exp((a - b) / 22);
    const pb = 0.056 * Math.exp((b - a) / 22);
    const r = nextFloat(h);
    if (r < pa) ga++;
    else if (r < pa + pb) gb++;
  }
  return [ga, gb];
}
