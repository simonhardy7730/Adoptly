// Règles du créateur de joueur : validation par étape, cohérence poste / profil, aperçu fidèle.
// Logique pure (sans React) : l'écran de création et les tests l'utilisent.

import type { Appearance, AttrKey, ArchetypeId, Identity, Position } from './types';
import { secondaryJustification } from './eligibility';
import { COUNTRIES, LANGUAGES } from '../content/countries';
import { ARCHETYPES, BACKGROUNDS, ENVIRONMENTS } from '../content/profiles';

export interface CreationDraft {
  identity: Identity;
  appearance: Appearance;
  qualities: AttrKey[];
  startAge: number;
  seed: number; // graine de la variation aléatoire, identique entre l'aperçu et la partie créée
}

export const CREATION_STEPS = ['Identité', 'Apparence', 'Profil sportif', 'Origines', 'Récapitulatif'] as const;

export type FieldErrors = Record<string, string>;

const NAME_RE = /^[\p{L}][\p{L}' -]*[\p{L}]$/u;

/** Profils compatibles avec chaque poste. */
export function archetypesFor(pos: Position): ArchetypeId[] {
  return pos === 'GK' ? ['keeper', 'allround'] : ARCHETYPES.filter((a) => a.id !== 'keeper').map((a) => a.id);
}

/** Corrige automatiquement les choix devenus incohérents après un changement de poste. */
export function harmonizeProfile(id: Identity): Identity {
  const n = { ...id };
  if (n.secondaryPosition === n.position) n.secondaryPosition = null;
  if (n.position === 'GK' && n.secondaryPosition && n.secondaryPosition !== 'DEF') n.secondaryPosition = null;
  if (!archetypesFor(n.position).includes(n.archetype)) n.archetype = n.position === 'GK' ? 'keeper' : ARCHETYPES.find((a) => a.suggested === n.position)?.id ?? 'allround';
  return n;
}

function checkName(v: string, label: string, required: boolean): string | null {
  const t = v.trim();
  if (!t) return required ? `${label} : champ obligatoire.` : null;
  if (t.length < 2) return `${label} : au moins 2 lettres.`;
  if (t.length > 24) return `${label} : 24 caractères maximum.`;
  if (!NAME_RE.test(t)) return `${label} : lettres, espaces, tirets et apostrophes uniquement.`;
  return null;
}

export function validateStep(step: number, d: CreationDraft): FieldErrors {
  const e: FieldErrors = {};
  const id = d.identity;
  const ap = d.appearance;
  const set = (k: string, msg: string | null) => {
    if (msg) e[k] = msg;
  };
  if (step === 0) {
    set('firstName', checkName(id.firstName, 'Prénom', true));
    set('lastName', checkName(id.lastName, 'Nom', true));
    if (id.nickname.trim()) set('nickname', id.nickname.trim().length > 20 ? 'Surnom : 20 caractères maximum.' : /[<>{}]/.test(id.nickname) ? 'Surnom : caractères non autorisés.' : null);
    if (![8, 9, 10].includes(d.startAge)) e.startAge = 'Âge de départ : entre 8 et 10 ans.';
    if (!(id.birthMonth >= 1 && id.birthMonth <= 12)) e.birthMonth = 'Choisis un mois de naissance.';
    if (!id.nationality) e.nationality = 'La nationalité principale est obligatoire.';
    else if (!COUNTRIES.some((c) => c.code === id.nationality)) e.nationality = 'Nationalité inconnue.';
    if (!id.birthCountry) e.birthCountry = 'Choisis un pays de naissance.';
    const bc = COUNTRIES.find((c) => c.code === id.birthCountry);
    if (bc && !bc.cities.includes(id.birthCity)) e.birthCity = 'Choisis une ville de naissance dans la liste.';
    if (!id.growUpCountry) e.growUpCountry = 'Choisis le pays où il grandit.';
    if (!LANGUAGES.includes(id.language)) e.language = 'Choisis une langue principale.';
    if (id.secondNationality) {
      if (id.secondNationality === id.nationality) e.secondNationality = 'La nationalité secondaire doit être différente de la principale.';
      else if (!secondaryJustification(id, id.secondNationality))
        e.secondNationality = 'Nationalité secondaire non justifiée : elle doit correspondre au pays de naissance, à l’origine d’un parent ou au pays où il grandit.';
    }
  }
  if (step === 1) {
    if (!Number.isInteger(ap.jerseyNumber) || ap.jerseyNumber < 1 || ap.jerseyNumber > 99) e.jerseyNumber = 'Numéro de maillot : un entier entre 1 et 99.';
    if (!ap.hairStyle) e.hairStyle = 'Choisis une coiffure.';
    if (ap.kitColor === ap.kitColor2 && ap.kitPattern !== 'plain') e.kitPattern = 'Un motif nécessite deux couleurs différentes.';
  }
  if (step === 2) {
    if (!id.position) e.position = 'Choisis un poste principal.';
    if (id.secondaryPosition && id.secondaryPosition === id.position) e.secondaryPosition = 'Le poste secondaire doit être différent du poste principal.';
    if (!archetypesFor(id.position).includes(id.archetype)) e.archetype = id.position === 'GK' ? 'Un gardien doit choisir le profil « Gardien » ou « Polyvalent ».' : 'Le profil « Gardien » est réservé au poste de gardien.';
    const uniq = new Set(d.qualities);
    if (uniq.size !== 3 || d.qualities.length !== 3) e.qualities = `Choisis exactement 3 qualités (${uniq.size}/3).`;
    if (id.position !== 'GK' && d.qualities.includes('reflexes')) e.qualities = 'La qualité « Réflexes (gardien) » est réservée aux gardiens.';
  }
  if (step === 3) {
    if (!BACKGROUNDS.some((b) => b.id === id.background)) e.background = 'Choisis un milieu familial.';
    if (!ENVIRONMENTS.some((x) => x.id === id.environment)) e.environment = 'Choisis un environnement.';
  }
  if (step === 4) {
    for (let i = 0; i < 4; i++) Object.assign(e, validateStep(i, d));
  }
  return e;
}

/** Première étape incomplète (ou la dernière si tout est valide). */
export function firstInvalidStep(d: CreationDraft): number {
  for (let i = 0; i < 4; i++) if (Object.keys(validateStep(i, d)).length) return i;
  return 4;
}

export function isComplete(d: CreationDraft) {
  return Object.keys(validateStep(4, d)).length === 0;
}
