// Styles et caractères d'entraîneurs. Le système de jeu et les consignes viennent d'ici :
// le joueur ne choisit jamais la tactique de son équipe.

import type { AttrKey, CoachStyle, CoachTemperament, Instruction } from '../game/types';
import type { Tactic } from '../match2d/types';

export interface StyleDef {
  label: string;
  description: string;
  tactic: Tactic;
  formation: string;
  values: AttrKey[];
}

export const COACH_STYLES: Record<CoachStyle, StyleDef> = {
  offensif: { label: 'Offensif', description: 'Veut des buts, de la prise de risque et des joueurs qui osent.', tactic: { mentality: 'attacking', pressing: 0.55, width: 0.8 }, formation: '4-3-3', values: ['technique', 'shooting', 'dribbling'] },
  equilibre: { label: 'Équilibré', description: 'Bloc solide, transitions rapides, chacun à sa place.', tactic: { mentality: 'balanced', pressing: 0.5, width: 0.6 }, formation: '4-4-2', values: ['tactics', 'passing', 'stamina'] },
  defensif: { label: 'Défensif', description: 'D’abord ne pas encaisser. Discipline et rigueur avant tout.', tactic: { mentality: 'defensive', pressing: 0.35, width: 0.5 }, formation: '4-4-2', values: ['defending', 'discipline', 'strength'] },
  pressing: { label: 'Pressing intense', description: 'Récupérer le ballon haut, courir plus que l’adversaire.', tactic: { mentality: 'balanced', pressing: 0.85, width: 0.65 }, formation: '4-3-3', values: ['stamina', 'speed', 'mental'] },
  possession: { label: 'Jeu de possession', description: 'Le ballon est à nous : passes courtes, patience, intelligence.', tactic: { mentality: 'balanced', pressing: 0.5, width: 0.85 }, formation: '4-3-3', values: ['passing', 'vision', 'technique'] },
};

export const TEMPERAMENTS: Record<CoachTemperament, { label: string; description: string }> = {
  exigeant: { label: 'Exigeant', description: 'Ne tolère pas qu’on ignore ses consignes. Sort vite un joueur qui déçoit.' },
  paternel: { label: 'Paternel', description: 'Protège ses jeunes, écoute, laisse le temps de progresser.' },
  pragmatique: { label: 'Pragmatique', description: 'Juge sur les résultats et les performances, pas sur les mots.' },
};

export const INSTRUCTIONS: Record<Instruction, { label: string; short: string; description: string }> = {
  press: { label: 'Presse la relance adverse', short: 'Pressing', description: 'Harcèle le porteur dès la perte du ballon.' },
  stay_high: { label: 'Reste haut, sois disponible en profondeur', short: 'Profondeur', description: 'Ne redescends pas : prends l’espace dans le dos.' },
  safe: { label: 'Joue simple, ne perds pas de ballons', short: 'Sécurité', description: 'Passes courtes, pas de dribble risqué.' },
  support: { label: 'Propose-toi, sois toujours une solution', short: 'Soutien', description: 'Reste proche du porteur pour offrir une passe.' },
  freedom: { label: 'Carte blanche : provoque !', short: 'Liberté', description: 'Tente les dribbles et les frappes.' },
  hold_line: { label: 'Tiens ta position défensive', short: 'Placement', description: 'Ne sors pas de ta zone, protège le but.' },
  short_build: { label: 'Relance courte au sol', short: 'Relance courte', description: 'Construis depuis l’arrière, pas de longs ballons.' },
};
