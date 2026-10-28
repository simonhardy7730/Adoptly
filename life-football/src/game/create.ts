// Création d'une nouvelle partie à partir des choix du créateur de joueur.

import type { Appearance, AttrKey, Attributes, GameState, Identity, Position } from './types';
import { archetype, background, environment } from '../content/profiles';
import { ATTR_KEYS } from './stats';
import { clamp, gauss, nextFloat, type RngHolder } from './rng';
import { generateClubs, generateFamily } from './world';
import { journal, notify } from './helpers';
import { country } from '../content/countries';
import { SAVE_VERSION } from './save';
import { startWeek } from './week';

export interface CreationInput {
  identity: Identity;
  appearance: Appearance;
  qualities: AttrKey[]; // 3 qualités de départ
  startAge: number; // 8..10
  seed?: number; // graine de la variation des caractéristiques (aperçu = partie)
}

/** Habitudes de jeu selon le poste occupé depuis tout petit. */
export const POSITION_MODS: Record<Position, Partial<Record<AttrKey, number>>> = {
  GK: { reflexes: 10, tactics: 1, shooting: -4, dribbling: -3 },
  DEF: { defending: 4, strength: 2, tactics: 1, shooting: -2, dribbling: -1, reflexes: -8 },
  MID: { passing: 2, vision: 2, stamina: 1, defending: 0.5, reflexes: -8 },
  ATT: { shooting: 3, speed: 1, dribbling: 1, defending: -3, reflexes: -8 },
};

/** Le pied fort oriente légèrement le jeu, sans avantage décisif. */
export const FOOT_MODS: Record<Identity['foot'], Partial<Record<AttrKey, number>>> = {
  right: { passing: 0.5, shooting: 0.5 },
  left: { dribbling: 1, vision: 0.5, passing: -0.5 },
  both: { technique: 1.2, shooting: 0.8, discipline: -1 },
};

export const START_YEAR = 2026;

export function defaultIdentity(): Identity {
  return {
    firstName: '',
    lastName: '',
    nickname: '',
    birthYear: START_YEAR - 9,
    birthMonth: 4,
    nationality: '',
    secondNationality: null,
    birthCountry: 'FR',
    birthCity: 'Lyon',
    growUpCountry: 'FR',
    parentOrigin: null,
    language: 'Français',
    foot: 'right',
    position: 'MID',
    secondaryPosition: null,
    archetype: 'allround',
    background: 'stable_studies',
    environment: 'town',
  };
}

export function defaultAppearance(): Appearance {
  return { skin: 2, hairStyle: 'short', hairColor: '#3b2416', eyeColor: '#5d4037', beard: 'none', faceShape: 'oval', heightClass: 'medium', build: 'normal', jerseyNumber: 10, kitColor: '#1fa860', kitColor2: '#ffffff', kitPattern: 'plain', bootsColor: '#1b1b1b', accessory: 'none' };
}

export function birthYearFor(startAge: number, birthMonth: number): number {
  // Âge exact au début de la saison (septembre) = startAge.
  return START_YEAR - startAge - (birthMonth > 9 ? 1 : 0);
}

export function initialAttributes(h: RngHolder, input: CreationInput): Attributes {
  const id = input.identity;
  const base = 17 + (input.startAge - 8) * 3.5;
  const a = {} as Attributes;
  // Variation aléatoire équilibrée : somme nulle, donc aucun tirage n'est globalement meilleur.
  const noise = ATTR_KEYS.map(() => gauss(h, 2.2));
  const mean = noise.reduce((x, y) => x + y, 0) / noise.length;
  ATTR_KEYS.forEach((k, i) => { a[k] = base + noise[i] - mean; });
  const add = (b: Partial<Record<AttrKey, number>>) => {
    for (const [k, v] of Object.entries(b)) a[k as AttrKey] += v ?? 0;
  };
  add(POSITION_MODS[id.position]);
  add(FOOT_MODS[id.foot]);
  add(archetype(id.archetype).bonus);
  add(background(id.background).bonus);
  add(environment(id.environment).bonus);
  for (const q of input.qualities.slice(0, 3)) a[q] += 4;
  // Physique : taille & corpulence
  const app = input.appearance;
  if (app.heightClass === 'tall') { a.strength += 2; a.speed -= 1; a.reflexes += id.position === 'GK' ? 2 : 0; }
  if (app.heightClass === 'small') { a.speed += 2; a.strength -= 2; a.dribbling += 1; }
  if (app.build === 'strong') { a.strength += 3; a.speed -= 1; }
  if (app.build === 'slim') { a.speed += 1; a.strength -= 2; a.stamina += 1; }
  for (const k of ATTR_KEYS) a[k] = clamp(Math.round(a[k] * 10) / 10, 3, 60);
  return a;
}

export function createGame(input: CreationInput, seed: number, slot = 0): GameState {
  const h = { rng: seed | 0 };
  const id: Identity = { ...input.identity, birthYear: birthYearFor(input.startAge, input.identity.birthMonth) };
  const bg = background(id.background);
  const attrSeed = input.seed ?? seed;
  const attrs = initialAttributes({ rng: attrSeed | 0 }, { ...input, identity: id });
  // Potentiel caché, indépendant du profil choisi.
  const potential = Math.round(clamp(44 + (nextFloat(h) + nextFloat(h)) * 23, 45, 92));
  const city = id.growUpCountry === id.birthCountry ? id.birthCity : country(id.growUpCountry).cities[0];

  const s: GameState = {
    version: SAVE_VERSION,
    id: `game_${seed.toString(36)}`,
    createdAt: Date.now(),
    savedAt: Date.now(),
    slot,
    rng: h.rng,
    t: 0,
    startYear: START_YEAR,
    identity: id,
    appearance: { ...input.appearance },
    creation: { qualities: [...input.qualities], startAge: input.startAge, seed: attrSeed, initialAttrs: { ...attrs } },
    prologue: { done: false, step: 0, choices: {} },
    player: {
      attrs,
      potential,
      energy: 85,
      form: 55,
      morale: 70,
      nutrition: bg.homeNutrition,
      sleepMode: 'normal',
      injury: null,
      injuryHistory: [],
      load: 30,
      returnUntil: -1,
      school: { grade: bg.schoolStart, trend: 0 },
      boots: { name: bg.bootsQuality === 3 ? 'Crampons haut de gamme' : bg.bootsQuality === 2 ? 'Crampons confort' : 'Vieux crampons', brandId: null, quality: bg.bootsQuality, wear: bg.bootsQuality === 1 ? 55 : 20, sponsored: false },
    },
    slots: { left: 0, max: 0 },
    weekLog: [],
    money: bg.startMoney,
    ledger: [],
    pantry: { banana: 2, cereal_bar: 2 },
    npcs: [],
    reputation: { sport: 2, popularity: 1, fanImage: 50, sponsorCred: 40, media: 0, followers: 0 },
    clubs: [],
    membership: null,
    tryouts: [],
    clubOffers: [],
    seasons: [],
    national: { committedTo: null, chosenYouth: null, caps: {}, pendingCallup: null, callupHistory: [], lastWindow: -1 },
    sponsors: { offers: [], contracts: [] },
    social: { posts: [], postsThisWeek: 0, unlocked: false },
    events: { pending: [], history: [], scheduled: [], flags: {} },
    admin: [],
    notifications: [],
    journal: [],
    weekDone: {},
    recentRatings: [],
  };
  s.clubs = generateClubs(s, id.growUpCountry, city, id.environment);
  s.npcs = generateFamily(s, bg.familyRelation);
  s.ledger.push({ t: 0, amount: bg.startMoney, category: 'gift', label: 'Tirelire de départ' });

  // L'histoire commence par le prologue narratif (content/prologue.ts), joué avant la première semaine.
  // Le réseau d'un parent ancien pro accélère la première détection.
  s.events.scheduled.push({ eventId: id.background === 'ex_pro_parent' ? 'first_tryout_network' : 'first_tryout_spotted', at: id.background === 'ex_pro_parent' ? 1 : 3 });
  s.admin.push({ id: 'adm_medical', label: 'Certificat médical pour la pratique du football', deadline: 6, done: false, failEffect: 'medical' });

  const name = id.nickname ? `${id.firstName} « ${id.nickname} » ${id.lastName}` : `${id.firstName} ${id.lastName}`;
  journal(s, `${name} commence son histoire à ${city} (${country(id.growUpCountry).name}). Un rêve : devenir professionnel.`, '🌱', true);
  startWeek(s);
  notify(s, 'info', 'Bienvenue', 'Chaque semaine, utilise tes actions puis passe à la semaine suivante. Les décisions comptent.');
  return s;
}
