// Catalogue des blessures. `weeks` : durée d'indisponibilité de base [min, max].
// `causes` : contextes dans lesquels la blessure peut survenir.
// `permanent` : séquelle possible pour les blessures graves (perte légère et définitive).

import type { AttrKey, BodyPart } from '../game/types';

export type InjuryCause = 'training' | 'match' | 'contact' | 'fatigue';

export interface InjuryType {
  id: string;
  name: string;
  part: BodyPart;
  severity: 1 | 2 | 3;
  weeks: [number, number];
  causes: InjuryCause[];
  weight: number;
  description: string;
  permanent?: { attr: AttrKey; amount: number; chance: number };
}

export const INJURIES: InjuryType[] = [
  { id: 'ankle_bruise', name: 'Contusion à la cheville', part: 'cheville', severity: 1, weeks: [1, 2], causes: ['contact', 'match'], weight: 5, description: 'Un coup reçu sur la malléole. Douloureux, mais rien de cassé.' },
  { id: 'calf_tight', name: 'Contracture au mollet', part: 'mollet', severity: 1, weeks: [1, 2], causes: ['fatigue', 'training'], weight: 5, description: 'Le muscle s’est durci après un effort de trop.' },
  { id: 'hamstring_strain', name: 'Élongation des ischio-jambiers', part: 'cuisse', severity: 1, weeks: [2, 3], causes: ['fatigue', 'training', 'match'], weight: 5, description: 'Fibres musculaires étirées à l’arrière de la cuisse.' },
  { id: 'back_pain', name: 'Lombalgie', part: 'dos', severity: 1, weeks: [1, 3], causes: ['fatigue', 'training'], weight: 2, description: 'Douleurs au bas du dos liées à la charge de travail.' },
  { id: 'ankle_sprain', name: 'Entorse de la cheville', part: 'cheville', severity: 2, weeks: [3, 5], causes: ['match', 'contact', 'training'], weight: 3, description: 'Ligaments de la cheville distendus après un appui raté.' },
  { id: 'hamstring_tear', name: 'Claquage des ischio-jambiers', part: 'cuisse', severity: 2, weeks: [4, 6], causes: ['fatigue', 'match'], weight: 3, description: 'Déchirure musculaire en pleine accélération.' },
  { id: 'groin', name: 'Pubalgie', part: 'adducteurs', severity: 2, weeks: [4, 8], causes: ['fatigue'], weight: 1.5, description: 'Inflammation chronique liée à une surcharge répétée.' },
  { id: 'knee_sprain', name: 'Entorse du genou', part: 'genou', severity: 2, weeks: [4, 6], causes: ['contact', 'match'], weight: 2, description: 'Ligament latéral touché lors d’un contact.' },
  { id: 'shoulder', name: 'Luxation de l’épaule', part: 'épaule', severity: 2, weeks: [4, 6], causes: ['contact'], weight: 1, description: 'L’épaule est sortie de son logement lors d’une chute.' },
  { id: 'concussion', name: 'Commotion cérébrale', part: 'tête', severity: 2, weeks: [2, 3], causes: ['contact'], weight: 0.8, description: 'Choc à la tête : protocole strict avant toute reprise.' },
  { id: 'metatarsal', name: 'Fracture du métatarse', part: 'pied', severity: 3, weeks: [8, 12], causes: ['contact', 'match'], weight: 0.7, description: 'Un os du pied est fracturé. Plâtre puis longue rééducation.' },
  { id: 'acl', name: 'Rupture des ligaments croisés', part: 'genou', severity: 3, weeks: [26, 36], causes: ['match', 'contact'], weight: 0.35, description: 'La blessure que tous les footballeurs redoutent. Opération obligatoire.', permanent: { attr: 'speed', amount: -2.5, chance: 0.55 } },
];

export const injuryType = (id: string | undefined) => INJURIES.find((i) => i.id === id);

export const PART_LABELS: Record<BodyPart, string> = {
  cheville: 'Cheville', genou: 'Genou', cuisse: 'Cuisse', mollet: 'Mollet', adducteurs: 'Adducteurs', pied: 'Pied', épaule: 'Épaule', dos: 'Dos', tête: 'Tête',
};
