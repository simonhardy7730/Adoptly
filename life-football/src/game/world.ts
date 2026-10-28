// Génération du monde : clubs fictifs et personnages autour du joueur.

import type { Club, GameState, Npc } from './types';
import { CLUB_COLORS, clubName, namePool } from '../content/names';
import { country } from '../content/countries';
import { environment } from '../content/profiles';
import { pick, randInt, shuffle, uid, type RngHolder } from './rng';

const TIER_SPEC: Record<1 | 2 | 3 | 4, { count: number; rep: [number, number]; fac: [number, number]; dist: [number, number] }> = {
  1: { count: 2, rep: [8, 22], fac: [15, 35], dist: [2, 10] },
  2: { count: 3, rep: [25, 42], fac: [35, 55], dist: [12, 55] },
  3: { count: 3, rep: [45, 68], fac: [55, 75], dist: [60, 380] },
  4: { count: 2, rep: [72, 90], fac: [78, 95], dist: [90, 600] },
};

export function generateClubs(h: RngHolder, countryCode: string, city: string, env: GameState['identity']['environment']): Club[] {
  const clubs: Club[] = [];
  const pool = namePool(countryCode);
  const places = shuffle(h, pool.places.map((_, i) => i));
  const prefixes = shuffle(h, pool.clubPrefix.map((_, i) => i));
  const colors = shuffle(h, CLUB_COLORS);
  const distMul = environment(env).transportMult;
  let n = 0;
  for (const tier of [1, 2, 3, 4] as const) {
    const spec = TIER_SPEC[tier];
    for (let i = 0; i < spec.count; i++) {
      const name = clubName(countryCode, prefixes[n % prefixes.length] + i, places[n % places.length]);
      const short = name.split(' ').map((w) => w[0]).join('').slice(0, 3).toUpperCase();
      clubs.push({
        id: uid(h, 'club'),
        name,
        short,
        country: countryCode,
        city: tier <= 1 ? city : name.split(' ').slice(-1)[0],
        tier,
        reputation: randInt(h, spec.rep[0], spec.rep[1]),
        facilities: randInt(h, spec.fac[0], spec.fac[1]),
        colors: colors[n % colors.length],
        distanceKm: Math.round(randInt(h, spec.dist[0], spec.dist[1]) * (tier <= 2 ? distMul : 1)),
        boarding: tier >= 3,
      });
      n++;
    }
  }
  return clubs;
}

const SKINS = [0, 1, 2, 3, 4, 5];
const HAIRS = ['short', 'curly', 'buzz', 'long', 'bun', 'afro'];
const HAIR_COLORS = ['#1b1b1b', '#3b2416', '#6b4423', '#b07a3c', '#d9b26f', '#8a8a8a'];

export function npcPortrait(h: RngHolder, age: Npc['portrait']['age'], skinHint?: number): Npc['portrait'] {
  return {
    skin: skinHint ?? pick(h, SKINS),
    hair: pick(h, HAIRS),
    hairColor: age === 'senior' ? '#9e9e9e' : pick(h, HAIR_COLORS),
    age,
  };
}

export function personName(h: RngHolder, countryCode: string, female = false, lastName?: string): string {
  const p = namePool(countryCode);
  return `${pick(h, female ? p.firstF : p.first)} ${lastName ?? pick(h, p.last)}`;
}

export function generateFamily(s: GameState, familyRelation: number): Npc[] {
  const id = s.identity;
  const famCountry = id.parentOrigin ?? id.nationality;
  const npcs: Npc[] = [];
  const isExPro = id.background === 'ex_pro_parent';
  npcs.push({
    id: 'npc_parent', name: `${pick(s, namePool(famCountry).first)} ${id.lastName}`, role: 'parent', relation: familyRelation,
    portrait: npcPortrait(s, 'adult', s.appearance.skin), met: 0,
    note: isExPro ? 'Ancien milieu de terrain en 2e division. Exigeant, mais connaît le milieu.' : 'Ton père. Il ne rate jamais un de tes matchs quand il peut.',
  });
  npcs.push({
    id: 'npc_parent2', name: `${pick(s, namePool(id.nationality).firstF)} ${id.lastName}`, role: 'parent2', relation: familyRelation + 4,
    portrait: npcPortrait(s, 'adult', s.appearance.skin), met: 0,
    note: id.background === 'stable_studies' ? 'Ta mère, professeure. Le bulletin passe avant tout.' : 'Ta mère. Elle veille sur ton équilibre.',
  });
  if (id.background === 'responsibilities' || id.background === 'modest_football' || s.rng % 2 === 0) {
    npcs.push({
      id: 'npc_sibling', name: `${pick(s, namePool(id.nationality).firstF)} ${id.lastName}`, role: 'sibling', relation: 70,
      portrait: npcPortrait(s, 'child', s.appearance.skin), met: 0,
      note: id.background === 'responsibilities' ? 'Ta petite sœur. Tu t’en occupes souvent après l’école.' : 'Ta petite sœur, ta première supportrice.',
    });
  }
  npcs.push({
    id: 'npc_friend', name: personName(s, id.growUpCountry), role: 'friend', relation: id.background === 'nomad' ? 45 : 65,
    portrait: npcPortrait(s, 'child'), met: 0, note: 'Ton meilleur ami du quartier. Toujours partant pour un foot.',
  });
  if (isExPro) {
    npcs.push({
      id: 'npc_mentor', name: personName(s, id.nationality), role: 'mentor', relation: 55,
      portrait: npcPortrait(s, 'adult'), met: 0, note: 'Ancien coéquipier de ton père, aujourd’hui éducateur.',
    });
  }
  return npcs;
}

export function countryName(code: string) {
  return country(code).name;
}
