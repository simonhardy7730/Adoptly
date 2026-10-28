// Règles d'éligibilité internationale — modèle simplifié et configurable.
// Il ne reproduit pas l'intégralité des règlements réels : il en donne l'esprit
// (justifier une nationalité, verrouillage après un match officiel senior).

import type { GameState, Identity } from './types';
import { country } from '../content/countries';

export const ELIGIBILITY_RULES = {
  /** Liens familiaux / territoriaux qui justifient une seconde nationalité. */
  secondaryJustifications: ['birthCountry', 'parentOrigin', 'growUpCountry'] as const,
  /** Les matchs de jeunes n'engagent pas définitivement. */
  youthMatchesLock: false,
  /** Un match amical senior n'engage pas. */
  seniorFriendlyLocks: false,
  /** Un match officiel senior (qualifications, phase finale) engage définitivement. */
  seniorOfficialLocks: true,
};

const JUSTIF_LABEL: Record<(typeof ELIGIBILITY_RULES.secondaryJustifications)[number], string> = {
  birthCountry: 'pays de naissance',
  parentOrigin: 'origine d’un parent',
  growUpCountry: 'pays où il a grandi',
};

export function secondaryJustification(id: Identity, code: string): string | null {
  for (const key of ELIGIBILITY_RULES.secondaryJustifications) {
    if (id[key] === code) return JUSTIF_LABEL[key];
  }
  return null;
}

/** Nations pour lesquelles une seconde nationalité est justifiable avec l'histoire choisie. */
export function possibleSecondNationalities(id: Identity): string[] {
  const set = new Set<string>();
  for (const key of ELIGIBILITY_RULES.secondaryJustifications) {
    const v = id[key];
    if (v && v !== id.nationality) set.add(v);
  }
  return [...set];
}

export interface NationEligibility {
  code: string;
  name: string;
  flag: string;
  reason: string;
  status: 'eligible' | 'committed' | 'locked';
  strength: number;
}

export function nationEligibility(s: Pick<GameState, 'identity' | 'national'>): NationEligibility[] {
  const id = s.identity;
  const out: NationEligibility[] = [];
  const add = (code: string, reason: string) => {
    const c = country(code);
    const committed = s.national.committedTo;
    out.push({
      code,
      name: c.name,
      flag: c.flag,
      reason,
      strength: c.strength,
      status: committed ? (committed === code ? 'committed' : 'locked') : 'eligible',
    });
  };
  add(id.nationality, 'Nationalité principale');
  if (id.secondNationality && id.secondNationality !== id.nationality) {
    add(id.secondNationality, `Nationalité secondaire (${secondaryJustification(id, id.secondNationality) ?? 'lien familial'})`);
  }
  return out;
}

export function eligibleNations(s: Pick<GameState, 'identity' | 'national'>): string[] {
  return nationEligibility(s).filter((n) => n.status !== 'locked').map((n) => n.code);
}

export function validateIdentity(id: Identity): string[] {
  const errors: string[] = [];
  if (!id.firstName.trim()) errors.push('Choisis un prénom.');
  if (!id.lastName.trim()) errors.push('Choisis un nom de famille.');
  if (id.firstName.length > 24 || id.lastName.length > 24) errors.push('Prénom et nom : 24 caractères maximum.');
  if (id.nickname.length > 20) errors.push('Surnom : 20 caractères maximum.');
  if (!id.nationality) errors.push('Choisis explicitement une nationalité principale.');
  if (id.secondNationality) {
    if (id.secondNationality === id.nationality) errors.push('La nationalité secondaire doit être différente de la principale.');
    else if (!secondaryJustification(id, id.secondNationality))
      errors.push('La nationalité secondaire doit être justifiée : pays de naissance, origine d’un parent ou pays où tu as grandi.');
  }
  if (id.secondaryPosition && id.secondaryPosition === id.position) errors.push('Le poste secondaire doit être différent du poste principal.');
  return errors;
}
