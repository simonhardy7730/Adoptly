// Marques fictives. `tier` : 1 marque locale/modeste … 4 marque mondiale.
// `minAge`, `minVisibility` : seuils d'intérêt. `rivals` : concurrents directs (exclusivité).

import type { SponsorCategory } from '../game/types';

export interface Brand {
  id: string;
  name: string;
  category: SponsorCategory;
  tier: 1 | 2 | 3 | 4;
  color: string;
  logo: string; // monogramme
  values: string;
  minAge: number;
  minVisibility: number;
  flex: number; // marge de négociation 0..0.4
  local?: boolean;
}

export const SPONSOR_CATEGORY_LABELS: Record<SponsorCategory, string> = {
  equipment: 'Équipementier',
  clothing: 'Vêtements',
  nutrition: 'Nutrition sportive',
  watch: 'Montres & accessoires',
  auto: 'Automobile',
  commercial: 'Partenaire commercial',
  local: 'Partenaire local',
};

export const BRANDS: Brand[] = [
  // Équipementiers
  { id: 'strydon', name: 'Strydon', category: 'equipment', tier: 4, color: '#e53935', logo: 'S', values: 'Performance pure, image de gagnant.', minAge: 15, minVisibility: 55, flex: 0.12 },
  { id: 'vexa', name: 'Vexa Sport', category: 'equipment', tier: 3, color: '#1e88e5', logo: 'VX', values: 'Innovation et jeunes talents.', minAge: 13, minVisibility: 32, flex: 0.2 },
  { id: 'kalto', name: 'Kalto', category: 'equipment', tier: 2, color: '#43a047', logo: 'K', values: 'Football populaire et authentique.', minAge: 12, minVisibility: 20, flex: 0.25 },
  { id: 'nordway', name: 'Nordway Athletics', category: 'equipment', tier: 3, color: '#5e35b1', logo: 'NW', values: 'Durabilité et éthique.', minAge: 14, minVisibility: 38, flex: 0.15 },
  // Vêtements
  { id: 'ardel', name: 'Maison Ardel', category: 'clothing', tier: 4, color: '#8d6e63', logo: 'MA', values: 'Élégance, luxe discret.', minAge: 17, minVisibility: 65, flex: 0.1 },
  { id: 'urbex', name: 'Urbex Wear', category: 'clothing', tier: 2, color: '#ff7043', logo: 'UX', values: 'Streetwear et culture urbaine.', minAge: 14, minVisibility: 30, flex: 0.22 },
  // Nutrition
  { id: 'nutripulse', name: 'NutriPulse', category: 'nutrition', tier: 2, color: '#26a69a', logo: 'NP', values: 'Récupération et santé.', minAge: 15, minVisibility: 28, flex: 0.2 },
  { id: 'greenfuel', name: 'Greenfuel', category: 'nutrition', tier: 3, color: '#7cb342', logo: 'GF', values: 'Végétal et responsable.', minAge: 16, minVisibility: 40, flex: 0.18 },
  // Montres
  { id: 'horvane', name: 'Horvane', category: 'watch', tier: 4, color: '#b0bec5', logo: 'H', values: 'Prestige et précision.', minAge: 18, minVisibility: 72, flex: 0.08 },
  { id: 'lumen', name: 'Lumen Time', category: 'watch', tier: 3, color: '#ffca28', logo: 'LT', values: 'Accessible et connecté.', minAge: 17, minVisibility: 50, flex: 0.16 },
  // Automobile
  { id: 'veltra', name: 'Veltra Motors', category: 'auto', tier: 4, color: '#455a64', logo: 'VM', values: 'Puissance et réussite.', minAge: 19, minVisibility: 70, flex: 0.1 },
  { id: 'axion', name: 'Axion Auto', category: 'auto', tier: 3, color: '#29b6f6', logo: 'AX', values: 'Mobilité électrique.', minAge: 18, minVisibility: 55, flex: 0.14 },
  // Commercial
  { id: 'bytecall', name: 'Bytecall Télécom', category: 'commercial', tier: 3, color: '#ec407a', logo: 'BC', values: 'Grand public, familial.', minAge: 16, minVisibility: 45, flex: 0.18 },
  { id: 'pixelplay', name: 'PixelPlay Games', category: 'commercial', tier: 2, color: '#ab47bc', logo: 'PP', values: 'Jeux vidéo et e-sport.', minAge: 14, minVisibility: 30, flex: 0.22 },
  // Locaux
  { id: 'local_bakery', name: 'Boulangerie du Stade', category: 'local', tier: 1, color: '#ffb74d', logo: 'BS', values: 'Fierté du quartier.', minAge: 9, minVisibility: 6, flex: 0.3, local: true },
  { id: 'local_garage', name: 'Garage des Quatre-Routes', category: 'local', tier: 1, color: '#90a4ae', logo: 'G4', values: 'Soutien aux jeunes du coin.', minAge: 10, minVisibility: 9, flex: 0.3, local: true },
  { id: 'local_sportshop', name: 'Le Comptoir du Sportif', category: 'local', tier: 1, color: '#66bb6a', logo: 'CS', values: 'Le magasin de sport de la ville.', minAge: 10, minVisibility: 12, flex: 0.28, local: true },
  { id: 'local_pizza', name: 'Pizzeria Bella Rete', category: 'local', tier: 1, color: '#ef5350', logo: 'BR', values: 'Repas d’équipe et convivialité.', minAge: 11, minVisibility: 14, flex: 0.3, local: true },
];

export const brand = (id: string) => BRANDS.find((b) => b.id === id)!;
