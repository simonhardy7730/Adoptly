// Magasin : aliments (prix par lot, nombre de portions, valeur nutritionnelle) et équipement.

export interface Food {
  id: string;
  name: string;
  icon: string;
  price: number;
  portions: number;
  nutrition: number; // qualité 0..100
  recovery: number; // bonus récupération par portion (énergie)
  morale: number; // plaisir
  tag: 'protéines' | 'féculents' | 'fruits & légumes' | 'snack' | 'boisson' | 'plat';
  minAge?: number;
}

export const FOODS: Food[] = [
  { id: 'banana', name: 'Bananes', icon: '🍌', price: 2, portions: 5, nutrition: 70, recovery: 2, morale: 0, tag: 'fruits & légumes' },
  { id: 'apple', name: 'Pommes', icon: '🍎', price: 3, portions: 6, nutrition: 72, recovery: 1, morale: 0, tag: 'fruits & légumes' },
  { id: 'veggies', name: 'Légumes de saison', icon: '🥦', price: 4, portions: 4, nutrition: 85, recovery: 2, morale: -1, tag: 'fruits & légumes' },
  { id: 'pasta', name: 'Pâtes complètes', icon: '🍝', price: 2, portions: 5, nutrition: 68, recovery: 4, morale: 1, tag: 'féculents' },
  { id: 'rice', name: 'Riz', icon: '🍚', price: 2, portions: 6, nutrition: 64, recovery: 3, morale: 0, tag: 'féculents' },
  { id: 'eggs', name: 'Œufs (x6)', icon: '🥚', price: 3, portions: 3, nutrition: 78, recovery: 3, morale: 0, tag: 'protéines' },
  { id: 'chicken', name: 'Blanc de poulet', icon: '🍗', price: 7, portions: 3, nutrition: 82, recovery: 4, morale: 1, tag: 'protéines' },
  { id: 'fish', name: 'Poisson frais', icon: '🐟', price: 9, portions: 2, nutrition: 90, recovery: 4, morale: 0, tag: 'protéines' },
  { id: 'yogurt', name: 'Yaourts nature', icon: '🥛', price: 3, portions: 4, nutrition: 70, recovery: 2, morale: 0, tag: 'protéines' },
  { id: 'cereal_bar', name: 'Barres de céréales', icon: '🍫', price: 3, portions: 6, nutrition: 45, recovery: 2, morale: 2, tag: 'snack' },
  { id: 'chips', name: 'Chips', icon: '🥔', price: 2, portions: 3, nutrition: 15, recovery: 0, morale: 3, tag: 'snack' },
  { id: 'soda', name: 'Sodas', icon: '🥤', price: 3, portions: 4, nutrition: 8, recovery: 0, morale: 3, tag: 'boisson' },
  { id: 'kebab', name: 'Sandwich du snack', icon: '🥙', price: 6, portions: 1, nutrition: 30, recovery: 2, morale: 5, tag: 'plat' },
  { id: 'pizza', name: 'Pizza surgelée', icon: '🍕', price: 4, portions: 2, nutrition: 25, recovery: 1, morale: 4, tag: 'plat' },
  { id: 'smoothie', name: 'Smoothie maison (kit)', icon: '🥤', price: 5, portions: 3, nutrition: 80, recovery: 3, morale: 2, tag: 'boisson' },
  { id: 'isotonic', name: 'Boisson de récupération', icon: '🧃', price: 6, portions: 4, nutrition: 55, recovery: 5, morale: 0, tag: 'boisson', minAge: 12 },
];

export const food = (id: string) => FOODS.find((f) => f.id === id);

export interface BootsModel {
  id: string;
  name: string;
  quality: 1 | 2 | 3;
  price: number;
  description: string;
}

export const BOOTS: BootsModel[] = [
  { id: 'b1', name: 'Crampons d’entrée de gamme', quality: 1, price: 25, description: 'Font le travail, mais s’usent vite.' },
  { id: 'b2', name: 'Crampons confort', quality: 2, price: 60, description: 'Bon maintien, usure modérée.' },
  { id: 'b3', name: 'Crampons haut de gamme', quality: 3, price: 130, description: 'Légers et durables. Le confort, pas la magie.' },
];

/** Nombre de portions consommées automatiquement chaque semaine en complément des repas familiaux. */
export const WEEKLY_PORTIONS = 7;
