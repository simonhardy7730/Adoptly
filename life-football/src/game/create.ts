// Création d'une nouvelle partie à partir des choix du créateur de joueur.

import type { Appearance, AttrKey, Attributes, GameState, Identity } from './types';
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
}

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
  return { skin: 2, hairStyle: 'short', hairColor: '#3b2416', eyeColor: '#5d4037', beard: 'none', faceShape: 'oval', heightClass: 'medium', build: 'normal', jerseyNumber: 10 };
}

export function birthYearFor(startAge: number, birthMonth: number): number {
  // Âge exact au début de la saison (septembre) = startAge.
  return START_YEAR - startAge - (birthMonth > 9 ? 1 : 0);
}

export function initialAttributes(h: RngHolder, input: CreationInput): Attributes {
  const id = input.identity;
  const base = 17 + (input.startAge - 8) * 3.5;
  const a = {} as Attributes;
  for (const k of ATTR_KEYS) a[k] = base + gauss(h, 2.5);
  // Un joueur de champ n'a pas l'habitude des réflexes de gardien, et inversement.
  if (id.position === 'GK') {
    a.reflexes += 6;
    a.shooting -= 4;
    a.dribbling -= 3;
  } else {
    a.reflexes -= 8;
  }
  const add = (b: Partial<Record<AttrKey, number>>) => {
    for (const [k, v] of Object.entries(b)) a[k as AttrKey] += v ?? 0;
  };
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
  if (id.foot === 'both') { a.technique += 1.5; a.shooting += 1; }
  for (const k of ATTR_KEYS) a[k] = clamp(Math.round(a[k] * 10) / 10, 3, 60);
  return a;
}

export function createGame(input: CreationInput, seed: number, slot = 0): GameState {
  const h = { rng: seed | 0 };
  const id: Identity = { ...input.identity, birthYear: birthYearFor(input.startAge, input.identity.birthMonth) };
  const bg = background(id.background);
  const attrs = initialAttributes(h, { ...input, identity: id });
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
    player: {
      attrs,
      potential,
      energy: 85,
      form: 55,
      morale: 70,
      nutrition: bg.homeNutrition,
      sleepMode: 'normal',
      injury: null,
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

  // Premier événement narratif : le match de quartier qui lance l'histoire.
  s.events.pending.push({ eventId: 'intro_street' });
  // Le réseau d'un parent ancien pro accélère la première détection.
  s.events.scheduled.push({ eventId: id.background === 'ex_pro_parent' ? 'first_tryout_network' : 'first_tryout_spotted', at: id.background === 'ex_pro_parent' ? 1 : 3 });
  s.admin.push({ id: 'adm_medical', label: 'Certificat médical pour la pratique du football', deadline: 6, done: false, failEffect: 'medical' });

  const name = id.nickname ? `${id.firstName} « ${id.nickname} » ${id.lastName}` : `${id.firstName} ${id.lastName}`;
  journal(s, `${name} commence son histoire à ${city} (${country(id.growUpCountry).name}). Un rêve : devenir professionnel.`, '🌱', true);
  startWeek(s);
  notify(s, 'info', 'Bienvenue', 'Chaque semaine, utilise tes actions puis passe à la semaine suivante. Les décisions comptent.');
  return s;
}
