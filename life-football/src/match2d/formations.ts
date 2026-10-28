// Formations et terrains. Ancres en coordonnées « d'attaque » normalisées :
// x = 0 près de son propre but, 1 près du but adverse ; y = 0..1 en largeur.
// Ajouter une formation = ajouter une entrée ici (le moteur s'adapte au nombre de joueurs).

import type { PitchDims, Role } from './types';

export interface FormationSlot {
  role: Role;
  x: number;
  y: number;
}

export interface Formation {
  id: string;
  label: string;
  players: number;
  slots: FormationSlot[];
}

const gk: FormationSlot = { role: 'GK', x: 0.02, y: 0.5 };

export const FORMATIONS: Record<string, Formation> = {
  '4-4-2': {
    id: '4-4-2', label: '4-4-2', players: 11,
    slots: [gk,
      { role: 'DEF', x: 0.2, y: 0.14 }, { role: 'DEF', x: 0.17, y: 0.38 }, { role: 'DEF', x: 0.17, y: 0.62 }, { role: 'DEF', x: 0.2, y: 0.86 },
      { role: 'MID', x: 0.44, y: 0.14 }, { role: 'MID', x: 0.4, y: 0.4 }, { role: 'MID', x: 0.4, y: 0.6 }, { role: 'MID', x: 0.44, y: 0.86 },
      { role: 'ATT', x: 0.66, y: 0.4 }, { role: 'ATT', x: 0.66, y: 0.6 }],
  },
  '4-3-3': {
    id: '4-3-3', label: '4-3-3', players: 11,
    slots: [gk,
      { role: 'DEF', x: 0.2, y: 0.14 }, { role: 'DEF', x: 0.17, y: 0.38 }, { role: 'DEF', x: 0.17, y: 0.62 }, { role: 'DEF', x: 0.2, y: 0.86 },
      { role: 'MID', x: 0.42, y: 0.3 }, { role: 'MID', x: 0.36, y: 0.5 }, { role: 'MID', x: 0.42, y: 0.7 },
      { role: 'ATT', x: 0.66, y: 0.18 }, { role: 'ATT', x: 0.7, y: 0.5 }, { role: 'ATT', x: 0.66, y: 0.82 }],
  },
  '2-3-1': {
    id: '2-3-1', label: '2-3-1 (foot à 7)', players: 7,
    slots: [gk,
      { role: 'DEF', x: 0.22, y: 0.3 }, { role: 'DEF', x: 0.22, y: 0.7 },
      { role: 'MID', x: 0.45, y: 0.18 }, { role: 'MID', x: 0.42, y: 0.5 }, { role: 'MID', x: 0.45, y: 0.82 },
      { role: 'ATT', x: 0.68, y: 0.5 }],
  },
};

export const PITCH_11: PitchDims = { L: 105, W: 68, goalW: 7.32, goalH: 2.44, boxDepth: 16.5, boxW: 40.3, sixDepth: 5.5, sixW: 18.3, spot: 11, circle: 9.15 };
export const PITCH_7: PitchDims = { L: 60, W: 40, goalW: 6, goalH: 2, boxDepth: 13, boxW: 26, sixDepth: 4, sixW: 12, spot: 9, circle: 6 };

export function pitchFor(formation: string): PitchDims {
  return FORMATIONS[formation]?.players === 7 ? PITCH_7 : PITCH_11;
}
