// Profils sportifs (archétypes), milieux familiaux et environnements.
// Chaque origine a des avantages ET des contraintes : aucune n'est systématiquement meilleure.

import type { ArchetypeId, AttrKey, BackgroundId, EnvironmentId, Position } from '../game/types';

export const ATTR_LABELS: Record<AttrKey, string> = {
  technique: 'Technique',
  passing: 'Passe',
  dribbling: 'Dribble',
  shooting: 'Tir',
  vision: 'Vision du jeu',
  defending: 'Défense',
  speed: 'Vitesse',
  stamina: 'Endurance',
  strength: 'Force',
  tactics: 'Intelligence tactique',
  mental: 'Mental',
  discipline: 'Discipline',
  reflexes: 'Réflexes (gardien)',
};

export const ATTR_GROUPS: { label: string; keys: AttrKey[] }[] = [
  { label: 'Technique', keys: ['technique', 'passing', 'dribbling', 'shooting'] },
  { label: 'Jeu', keys: ['vision', 'tactics', 'defending', 'reflexes'] },
  { label: 'Physique', keys: ['speed', 'stamina', 'strength'] },
  { label: 'Caractère', keys: ['mental', 'discipline'] },
];

export const POSITION_LABELS: Record<Position, string> = {
  GK: 'Gardien',
  DEF: 'Défenseur',
  MID: 'Milieu',
  ATT: 'Attaquant',
};

export interface Archetype {
  id: ArchetypeId;
  label: string;
  icon: string;
  description: string;
  bonus: Partial<Record<AttrKey, number>>;
  suggested: Position;
}

export const ARCHETYPES: Archetype[] = [
  { id: 'technician', label: 'Technicien', icon: '🎯', description: 'Toucher de balle soyeux, à l’aise dans les petits espaces.', bonus: { technique: 7, dribbling: 4, passing: 3, strength: -3 }, suggested: 'MID' },
  { id: 'speedster', label: 'Joueur rapide', icon: '⚡', description: 'Des jambes de feu, il fait la différence dans la profondeur.', bonus: { speed: 8, dribbling: 3, stamina: 2, tactics: -2, passing: -2 }, suggested: 'ATT' },
  { id: 'playmaker', label: 'Milieu créatif', icon: '🧠', description: 'Voit la passe avant les autres et oriente le jeu.', bonus: { vision: 7, passing: 5, tactics: 3, strength: -3, speed: -2 }, suggested: 'MID' },
  { id: 'rock', label: 'Défenseur solide', icon: '🛡️', description: 'Impassable dans les duels, lit les trajectoires.', bonus: { defending: 8, strength: 4, tactics: 2, dribbling: -3, shooting: -3 }, suggested: 'DEF' },
  { id: 'striker', label: 'Buteur', icon: '🥅', description: 'Le sens du but, la frappe sèche et l’instinct.', bonus: { shooting: 8, technique: 2, mental: 2, defending: -4, vision: -2 }, suggested: 'ATT' },
  { id: 'keeper', label: 'Gardien', icon: '🧤', description: 'Réflexes, placement et courage dans les airs.', bonus: { reflexes: 12, mental: 3, tactics: 2, dribbling: -4, shooting: -4 }, suggested: 'GK' },
  { id: 'allround', label: 'Profil polyvalent', icon: '🔄', description: 'Bon partout, excellent nulle part… pour l’instant.', bonus: { stamina: 2, tactics: 2, technique: 1, passing: 1, defending: 1, discipline: 2 }, suggested: 'MID' },
];

export interface Background {
  id: BackgroundId;
  label: string;
  icon: string;
  description: string;
  pros: string[];
  cons: string[];
  pocketMoney: number; // € / semaine
  startMoney: number;
  homeNutrition: number; // qualité des repas familiaux 0..100
  bonus: Partial<Record<AttrKey, number>>;
  familyRelation: number;
  slotMod: number;
  schoolStart: number;
  bootsQuality: 1 | 2 | 3;
  jobPay: number; // gain de l'action « aider / petit boulot »
}

export const BACKGROUNDS: Background[] = [
  {
    id: 'modest_football', label: 'Famille modeste passionnée de foot', icon: '🏘️',
    description: 'Peu de moyens, mais tout le quartier vit au rythme du ballon.',
    pros: ['Détermination (+Mental, +Discipline)', 'Famille très soutenante', 'Matchs de quartier fréquents'],
    cons: ['Argent de poche faible', 'Repas moins équilibrés', 'Déplacements difficiles à financer'],
    pocketMoney: 3, startMoney: 12, homeNutrition: 54, bonus: { mental: 4, discipline: 2, dribbling: 2 }, familyRelation: 78, slotMod: 0, schoolStart: 11, bootsQuality: 1, jobPay: 8,
  },
  {
    id: 'stable_studies', label: 'Famille stable qui mise sur les études', icon: '📚',
    description: 'Un foyer serein où les bulletins comptent autant que les buts.',
    pros: ['Bonnes notes de départ', '+Tactique, +Discipline', 'Repas équilibrés'],
    cons: ['Parents exigeants sur les notes', 'Moins de temps de jeu libre au quartier'],
    pocketMoney: 6, startMoney: 40, homeNutrition: 68, bonus: { tactics: 3, discipline: 3, dribbling: -1 }, familyRelation: 70, slotMod: 0, schoolStart: 14, bootsQuality: 2, jobPay: 6,
  },
  {
    id: 'wealthy', label: 'Famille aisée', icon: '🏡',
    description: 'Le confort matériel est là… les attentes aussi.',
    pros: ['Argent de poche élevé', 'Bon matériel dès le départ', 'Repas de qualité'],
    cons: ['Pression de réussite élevée', 'Moins de rage de vaincre (−Mental)', 'Amis du quartier plus distants'],
    pocketMoney: 15, startMoney: 160, homeNutrition: 74, bonus: { mental: -3, discipline: -1, technique: 2 }, familyRelation: 62, slotMod: 0, schoolStart: 13, bootsQuality: 3, jobPay: 5,
  },
  {
    id: 'ex_pro_parent', label: 'Un parent ancien footballeur', icon: '⚽',
    description: 'Ton père a joué en deuxième division. Il connaît du monde… et compare.',
    pros: ['+Tactique, +Mental', 'Réseau : détections plus rapides', 'Conseils techniques'],
    cons: ['Comparaisons permanentes', 'Pression parentale forte', 'Argent moyen'],
    pocketMoney: 6, startMoney: 50, homeNutrition: 66, bonus: { tactics: 4, mental: 1, passing: 1 }, familyRelation: 66, slotMod: 0, schoolStart: 11, bootsQuality: 2, jobPay: 6,
  },
  {
    id: 'nomad', label: 'Famille qui déménage souvent', icon: '🧳',
    description: 'Nouvelles villes, nouvelles écoles : tu sais t’adapter à tout.',
    pros: ['Grande adaptabilité (+Mental)', 'Vision du jeu ouverte', 'Pas peur de l’inconnu'],
    cons: ['Amitiés fragiles', 'Risque de déménagement en cours de saison', 'Moins de repères'],
    pocketMoney: 6, startMoney: 40, homeNutrition: 62, bonus: { mental: 5, vision: 2, discipline: -2 }, familyRelation: 70, slotMod: 0, schoolStart: 12, bootsQuality: 2, jobPay: 6,
  },
  {
    id: 'responsibilities', label: 'Responsabilités précoces', icon: '🤝',
    description: 'Tu aides tes proches au quotidien. Le foot, c’est ton moment à toi.',
    pros: ['Très discipliné (+Discipline, +Mental)', 'Petits boulots mieux payés', 'Famille soudée'],
    cons: ['Une action de moins par semaine', 'Peu d’argent', 'Imprévus familiaux'],
    pocketMoney: 2, startMoney: 10, homeNutrition: 56, bonus: { discipline: 6, mental: 4, stamina: 1 }, familyRelation: 82, slotMod: -1, schoolStart: 11, bootsQuality: 1, jobPay: 12,
  },
];

export interface Environment {
  id: EnvironmentId;
  label: string;
  icon: string;
  description: string;
  streetBonus: number; // multiplicateur gains matchs de quartier
  transportMult: number;
  bonus: Partial<Record<AttrKey, number>>;
  scouting: number; // multiplicateur chance d'être repéré
}

export const ENVIRONMENTS: Environment[] = [
  { id: 'city', label: 'Grande ville', icon: '🏙️', description: 'City-stades partout, beaucoup de concurrence et de tentations.', streetBonus: 1.25, transportMult: 0.7, bonus: { dribbling: 2, technique: 1, discipline: -1 }, scouting: 1.2 },
  { id: 'town', label: 'Ville moyenne', icon: '🏘️', description: 'Un bon équilibre entre clubs accessibles et vie calme.', streetBonus: 1, transportMult: 1, bonus: { passing: 1, tactics: 1 }, scouting: 1 },
  { id: 'countryside', label: 'Campagne', icon: '🌾', description: 'Grands espaces et air pur, mais les clubs sont loin.', streetBonus: 0.8, transportMult: 1.6, bonus: { stamina: 3, strength: 2, technique: -1 }, scouting: 0.75 },
];

export const archetype = (id: ArchetypeId) => ARCHETYPES.find((a) => a.id === id)!;
export const background = (id: BackgroundId) => BACKGROUNDS.find((b) => b.id === id)!;
export const environment = (id: EnvironmentId) => ENVIRONMENTS.find((e) => e.id === id)!;
