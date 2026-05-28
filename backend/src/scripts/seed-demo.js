#!/usr/bin/env node
/**
 * Adoptly — Script de seed des données démo
 *
 * Crée 8 refuges/associations fictifs répartis en Belgique et Nord de la France,
 * avec 36 animaux couvrant toutes les combinaisons de critères de compatibilité.
 *
 * Usage (depuis le dossier backend/) :
 *   node src/scripts/seed-demo.js          → insère les données (skip si déjà présentes)
 *   node src/scripts/seed-demo.js --reset  → supprime et recrée toutes les données démo
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const RESET        = process.argv.includes('--reset');
const DEMO_PASSWORD = 'adoptly-demo-2024';

// ── Photos Unsplash vérifiées ─────────────────────────────────────────────────
const p = (id, w = 800) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

const PHOTOS = {
  // Chiens
  goldenRetriever:    p('photo-1552053831-71594a27632d'),
  australianShepherd: p('photo-1587300003388-59208cc962cb'),
  jackRussell:        p('photo-1561037404-61cd46aa615b'),
  beagleMix:          p('photo-1477884213360-7e9d7dcc1e48'),
  // Chats
  blackWhiteCat:      p('photo-1514888286974-6c03e2ca1dba'),
  orangeKitten:       p('photo-1573865526739-10659fec78a5'),
  tabbyCat:           p('photo-1495360010541-f48722b34f7d'),
  // Petits animaux
  whiteRabbit:        p('photo-1585110396000-c9ffd4e4b308'),
  hamster:            p('photo-1543466835-00a7907e9de1'),
};

// ── Refuges et associations démo ─────────────────────────────────────────────
// Index : 0 Brussels · 1 Namur · 2 Liège · 3 Gent · 4 Anvers · 5 Charleroi · 6 Mons · 7 Lille

const SHELTERS = [
  {
    email:     'demo-bruxelles@adoptly.fr',
    name:      'Refuge du Parc — Bruxelles',
    phone:     '+32 2 123 45 67',
    address:   '12 Avenue du Parc, 1020 Bruxelles',
    latitude:  50.8503,
    longitude: 4.3517,
  },
  {
    email:     'demo-namur@adoptly.fr',
    name:      'Asile des Animaux de Namur',
    phone:     '+32 81 23 45 67',
    address:   '45 Rue de la Meuse, 5000 Namur',
    latitude:  50.4669,
    longitude: 4.8675,
  },
  {
    email:     'demo-liege@adoptly.fr',
    name:      'SPA Liège-Outremeuse',
    phone:     '+32 4 234 56 78',
    address:   '8 Quai de Rome, 4020 Liège',
    latitude:  50.6326,
    longitude: 5.5797,
  },
  {
    email:     'demo-gent@adoptly.fr',
    name:      'Dierenasiel Gent',
    phone:     '+32 9 345 67 89',
    address:   '27 Dok-Noord, 9000 Gent',
    latitude:  51.0543,
    longitude: 3.7174,
  },
  {
    email:     'demo-anvers@adoptly.fr',
    name:      'Dierenopvang Antwerpen',
    phone:     '+32 3 456 78 90',
    address:   '14 Provinciestraat, 2018 Antwerpen',
    latitude:  51.2194,
    longitude: 4.4025,
  },
  {
    email:     'demo-charleroi@adoptly.fr',
    name:      'Les Amis des Bêtes — Charleroi',
    phone:     '+32 71 56 78 90',
    address:   '31 Rue de Marchienne, 6000 Charleroi',
    latitude:  50.4108,
    longitude: 4.4446,
  },
  {
    email:     'demo-mons@adoptly.fr',
    name:      'La Maison des Animaux — Mons',
    phone:     '+32 65 67 89 01',
    address:   '18 Avenue des Essarts, 7000 Mons',
    latitude:  50.4542,
    longitude: 3.9523,
  },
  {
    email:     'demo-lille@adoptly.fr',
    name:      'SPA Lille-Métropole',
    phone:     '+33 3 20 78 90 12',
    address:   '62 Rue du Faubourg de Roubaix, 59000 Lille',
    latitude:  50.6292,
    longitude: 3.0573,
  },
];

export const DEMO_EMAILS = SHELTERS.map((s) => s.email);

// ── Animaux démo ─────────────────────────────────────────────────────────────
// shelter_key → index dans SHELTERS
// age         → en mois

const ANIMALS = [

  // ═══ 0 · Refuge du Parc — Bruxelles ════════════════════════════════════

  {
    shelter_key: 0, name: 'Max', species: 'dog', breed: 'Golden Retriever',
    age: 36, size: 'large', temperament: 'calm', special_needs: null,
    story: 'Max est un golden retriever affectueux de 3 ans qui adore les balades en forêt. '
         + 'Sociable avec tout le monde, il cherche une famille active avec un jardin.',
    photos: [PHOTOS.goldenRetriever, PHOTOS.australianShepherd],
    requirements: { children_compatible: 'yes', cats_compatible: 'yes', dogs_compatible: 'yes',
                    needs_garden: 'yes', daily_outdoor_time: 'yes', spacious_home: 'yes' },
  },
  {
    shelter_key: 0, name: 'Luna', species: 'dog', breed: 'Chihuahua',
    age: 48, size: 'small', temperament: 'calm', special_needs: null,
    story: 'Luna est une petite chihuahua douce et câline. Idéale en appartement, '
         + 'elle s\'entend bien avec les chats mais préfère être le seul chien. '
         + 'Convient aux enfants de plus de 6 ans.',
    photos: [PHOTOS.jackRussell],
    requirements: { children_compatible: '6+', cats_compatible: 'yes', dogs_compatible: 'no',
                    needs_garden: 'no', daily_outdoor_time: 'no', spacious_home: 'no' },
  },
  {
    shelter_key: 0, name: 'Mia', species: 'dog', breed: 'Cavalier King Charles',
    age: 4, size: 'small', temperament: 'playful', special_needs: null,
    story: 'Mia est une adorable petite chienne de 4 mois, pleine de vie. '
         + 'Elle s\'entend avec les chats, les chiens et les enfants. Parfaite en appartement.',
    photos: [PHOTOS.beagleMix],
    requirements: { children_compatible: 'yes', cats_compatible: 'yes', dogs_compatible: 'yes',
                    needs_garden: 'no', daily_outdoor_time: 'no', spacious_home: 'no' },
  },
  {
    shelter_key: 0, name: 'Minou', species: 'cat', breed: 'Siamois',
    age: 30, size: 'medium', temperament: 'calm', special_needs: null,
    story: 'Minou est un siamois élégant et très affectueux. Il préfère vivre seul '
         + 'sans autres animaux. Parfait pour une personne calme cherchant un compagnon serein.',
    photos: [PHOTOS.blackWhiteCat],
    requirements: { children_compatible: 'yes', cats_compatible: 'no', dogs_compatible: 'no',
                    needs_garden: 'no', daily_outdoor_time: 'no', spacious_home: 'no' },
  },
  {
    shelter_key: 0, name: 'Câlin', species: 'rabbit', breed: 'Bélier Nain',
    age: 18, size: 'small', temperament: 'calm', special_needs: null,
    story: 'Câlin est un lapin bélier doux et curieux. Il adore explorer son espace et les câlins. '
         + 'À protéger des chats et chiens.',
    photos: [PHOTOS.whiteRabbit],
    requirements: { children_compatible: 'yes', cats_compatible: 'no', dogs_compatible: 'no',
                    needs_garden: 'no', daily_outdoor_time: 'no', spacious_home: 'no' },
  },

  // ═══ 1 · Asile des Animaux — Namur ══════════════════════════════════════

  {
    shelter_key: 1, name: 'Bella', species: 'dog', breed: 'Labrador',
    age: 18, size: 'large', temperament: 'playful', special_needs: null,
    story: 'Bella est une labrador joviale de 18 mois. Elle adore nager et courir. '
         + 'Compatible avec enfants, chats et chiens. Besoin d\'un jardin et de sorties régulières.',
    photos: [PHOTOS.goldenRetriever, PHOTOS.beagleMix],
    requirements: { children_compatible: 'yes', cats_compatible: 'yes', dogs_compatible: 'yes',
                    needs_garden: 'yes', daily_outdoor_time: 'yes', spacious_home: 'yes' },
  },
  {
    shelter_key: 1, name: 'Coco', species: 'dog', breed: 'Bichon Frisé',
    age: 96, size: 'small', temperament: 'calm', special_needs: null,
    story: 'Coco est un bichon senior de 8 ans, calme et adorable. Il s\'entend avec tout le monde '
         + 'et n\'a pas besoin de grand espace. Un compagnon idéal pour une vie tranquille.',
    photos: [PHOTOS.jackRussell],
    requirements: { children_compatible: 'yes', cats_compatible: 'yes', dogs_compatible: 'yes',
                    needs_garden: 'no', daily_outdoor_time: 'no', spacious_home: 'no' },
  },
  {
    shelter_key: 1, name: 'Rex', species: 'dog', breed: 'Berger Malinois',
    age: 20, size: 'large', temperament: 'energetic', special_needs: null,
    story: 'Rex est un malinois vif et intelligent. Il a besoin de beaucoup d\'exercice '
         + 'et d\'un espace extérieur. Uniquement avec enfants de plus de 12 ans. Doit être seul animal.',
    photos: [PHOTOS.australianShepherd],
    requirements: { children_compatible: '12+', cats_compatible: 'no', dogs_compatible: 'no',
                    needs_garden: 'yes', daily_outdoor_time: 'yes', spacious_home: 'yes' },
  },
  {
    shelter_key: 1, name: 'Tiger', species: 'cat', breed: 'Européen Tabby',
    age: 16, size: 'medium', temperament: 'playful', special_needs: null,
    story: 'Tiger est un jeune chat tigré plein de vie. Il préfère être le seul chat '
         + 'mais s\'entend avec les chiens. Très joueur et curieux.',
    photos: [PHOTOS.tabbyCat],
    requirements: { children_compatible: 'yes', cats_compatible: 'no', dogs_compatible: 'yes',
                    needs_garden: 'no', daily_outdoor_time: 'no', spacious_home: 'no' },
  },
  {
    shelter_key: 1, name: 'Caramel', species: 'rabbit', breed: 'Rex',
    age: 30, size: 'small', temperament: 'calm', special_needs: null,
    story: 'Caramel est un lapin Rex au pelage soyeux et doux. Calme et affectueux, '
         + 'il aime se promener librement dans son espace. À l\'abri des chats et chiens.',
    photos: [PHOTOS.whiteRabbit],
    requirements: { children_compatible: 'yes', cats_compatible: 'no', dogs_compatible: 'no',
                    needs_garden: 'no', daily_outdoor_time: 'no', spacious_home: 'no' },
  },

  // ═══ 2 · SPA Liège-Outremeuse ════════════════════════════════════════════

  {
    shelter_key: 2, name: 'Rocky', species: 'dog', breed: 'Border Collie',
    age: 14, size: 'large', temperament: 'energetic', special_needs: null,
    story: 'Rocky est un border collie très actif de 14 mois. Il a besoin d\'un jardin '
         + 'et de sorties intensives quotidiennes. Compatible avec tout le monde, mais a besoin de place.',
    photos: [PHOTOS.australianShepherd, PHOTOS.goldenRetriever],
    requirements: { children_compatible: 'yes', cats_compatible: 'yes', dogs_compatible: 'yes',
                    needs_garden: 'yes', daily_outdoor_time: 'yes', spacious_home: 'yes' },
  },
  {
    shelter_key: 2, name: 'Nala', species: 'dog', breed: 'Beagle',
    age: 36, size: 'medium', temperament: 'playful', special_needs: null,
    story: 'Nala est une beagle joyeuse de 3 ans. Elle s\'entend avec tout le monde — '
         + 'enfants, chats, chiens. Un super chien de famille, aussi bien en appartement qu\'en maison.',
    photos: [PHOTOS.beagleMix],
    requirements: { children_compatible: 'yes', cats_compatible: 'yes', dogs_compatible: 'yes',
                    needs_garden: 'no', daily_outdoor_time: 'no', spacious_home: 'no' },
  },
  {
    shelter_key: 2, name: 'Zeus', species: 'dog', breed: 'Rottweiler',
    age: 48, size: 'large', temperament: 'energetic', special_needs: null,
    story: 'Zeus est un rottweiler imposant mais doux avec les personnes qu\'il connaît. '
         + 'Il a besoin d\'espace et d\'exercice quotidien. Pour adultes uniquement, sans autres animaux.',
    photos: [PHOTOS.jackRussell],
    requirements: { children_compatible: 'no', cats_compatible: 'no', dogs_compatible: 'no',
                    needs_garden: 'yes', daily_outdoor_time: 'yes', spacious_home: 'yes' },
  },
  {
    shelter_key: 2, name: 'Oscar', species: 'cat', breed: 'Européen',
    age: 42, size: 'medium', temperament: 'mixed', special_needs: null,
    story: 'Oscar est un chat européen d\'humeur changeante : parfois câlin, parfois indépendant. '
         + 'Il s\'entend avec tous les animaux et les enfants. Un chat authentique pour une vraie vie de famille.',
    photos: [PHOTOS.blackWhiteCat, PHOTOS.orangeKitten],
    requirements: { children_compatible: 'yes', cats_compatible: 'yes', dogs_compatible: 'yes',
                    needs_garden: 'no', daily_outdoor_time: 'no', spacious_home: 'no' },
  },
  {
    shelter_key: 2, name: 'Chipie', species: 'other', breed: 'Hamster Doré',
    age: 8, size: 'small', temperament: 'calm', special_needs: null,
    story: 'Chipie est une hamster dorée pleine de curiosité, active la nuit. '
         + 'Parfaite pour les enfants de plus de 6 ans comme première responsabilité.',
    photos: [PHOTOS.hamster],
    requirements: { children_compatible: '6+', cats_compatible: 'no', dogs_compatible: 'no',
                    needs_garden: 'no', daily_outdoor_time: 'no', spacious_home: 'no' },
  },

  // ═══ 3 · Dierenasiel Gent ═══════════════════════════════════════════════

  {
    shelter_key: 3, name: 'Baas', species: 'dog', breed: 'Labrador Mix',
    age: 24, size: 'large', temperament: 'playful', special_needs: null,
    story: 'Baas est un joyeux labrador mix de 2 ans. Il adore courir et nager. '
         + 'Compatible avec les enfants, les chats et les autres chiens. Besoin d\'un jardin.',
    photos: [PHOTOS.goldenRetriever],
    requirements: { children_compatible: 'yes', cats_compatible: 'yes', dogs_compatible: 'yes',
                    needs_garden: 'yes', daily_outdoor_time: 'yes', spacious_home: 'yes' },
  },
  {
    shelter_key: 3, name: 'Sneeuw', species: 'cat', breed: 'Europees Korthaar',
    age: 36, size: 'medium', temperament: 'calm', special_needs: null,
    story: 'Sneeuw est une chatte blanche de 3 ans, douce et sereine. Elle adore les câlins '
         + 'et les coins ensoleillés. Préfère être la seule chatte à la maison.',
    photos: [PHOTOS.tabbyCat],
    requirements: { children_compatible: 'yes', cats_compatible: 'no', dogs_compatible: 'no',
                    needs_garden: 'no', daily_outdoor_time: 'no', spacious_home: 'no' },
  },
  {
    shelter_key: 3, name: 'Tibo', species: 'dog', breed: 'Jack Russell Terrier',
    age: 12, size: 'small', temperament: 'energetic', special_needs: null,
    story: 'Tibo est un jack russell d\'1 an débordant d\'énergie. Il adore jouer avec les enfants '
         + 'et les autres chiens. Parfait en appartement avec de bonnes balades.',
    photos: [PHOTOS.jackRussell, PHOTOS.beagleMix],
    requirements: { children_compatible: 'yes', cats_compatible: 'no', dogs_compatible: 'yes',
                    needs_garden: 'no', daily_outdoor_time: 'no', spacious_home: 'no' },
  },
  {
    shelter_key: 3, name: 'Pumba', species: 'guinea_pig', breed: 'Cobaye Américain',
    age: 14, size: 'small', temperament: 'calm', special_needs: null,
    story: 'Pumba est un cobaye adorable qui adore s\'asseoir sur les genoux. '
         + 'Idéal comme premier animal pour les enfants. À protéger des chats et chiens.',
    photos: [PHOTOS.hamster],
    requirements: { children_compatible: 'yes', cats_compatible: 'no', dogs_compatible: 'no',
                    needs_garden: 'no', daily_outdoor_time: 'no', spacious_home: 'no' },
  },

  // ═══ 4 · Dierenopvang Antwerpen ═════════════════════════════════════════

  {
    shelter_key: 4, name: 'Tessa', species: 'dog', breed: 'Bouledogue Français',
    age: 30, size: 'small', temperament: 'calm', special_needs: null,
    story: 'Tessa est une bouledogue française de 2 ans et demi, très douce. '
         + 'Parfaite en appartement, elle s\'entend avec les chats et les enfants.',
    photos: [PHOTOS.beagleMix],
    requirements: { children_compatible: 'yes', cats_compatible: 'yes', dogs_compatible: 'no',
                    needs_garden: 'no', daily_outdoor_time: 'no', spacious_home: 'no' },
  },
  {
    shelter_key: 4, name: 'Romeo', species: 'cat', breed: 'Siamois Mix',
    age: 100, size: 'medium', temperament: 'calm', special_needs: null,
    story: 'Roméo est un vieux matou siamois de 8 ans, calme et digne. '
         + 'Il préfère vivre seul sans autres animaux, dans un foyer tranquille sans jeunes enfants.',
    photos: [PHOTOS.blackWhiteCat],
    requirements: { children_compatible: '12+', cats_compatible: 'no', dogs_compatible: 'no',
                    needs_garden: 'no', daily_outdoor_time: 'no', spacious_home: 'no' },
  },
  {
    shelter_key: 4, name: 'Flocon', species: 'rabbit', breed: 'Angora Nain',
    age: 20, size: 'small', temperament: 'calm', special_needs: null,
    story: 'Flocon est un lapin angora nain au pelage duveteux. Doux et tranquille, '
         + 'il aime être câliné doucement. À protéger des chats et chiens.',
    photos: [PHOTOS.whiteRabbit],
    requirements: { children_compatible: 'yes', cats_compatible: 'no', dogs_compatible: 'no',
                    needs_garden: 'no', daily_outdoor_time: 'no', spacious_home: 'no' },
  },
  {
    shelter_key: 4, name: 'Atlas', species: 'dog', breed: 'Husky Sibérien',
    age: 22, size: 'large', temperament: 'energetic', special_needs: null,
    story: 'Atlas est un magnifique husky sibérien de presque 2 ans. Il a besoin '
         + 'de beaucoup d\'exercice et d\'un jardin. Compatible avec les enfants et les chiens, '
         + 'mais pas avec les chats.',
    photos: [PHOTOS.australianShepherd],
    requirements: { children_compatible: 'yes', cats_compatible: 'no', dogs_compatible: 'yes',
                    needs_garden: 'yes', daily_outdoor_time: 'yes', spacious_home: 'yes' },
  },

  // ═══ 5 · Les Amis des Bêtes — Charleroi ════════════════════════════════

  {
    shelter_key: 5, name: 'Gaston', species: 'dog', breed: 'Beagle Mix',
    age: 48, size: 'medium', temperament: 'playful', special_needs: null,
    story: 'Gaston est un beagle mix de 4 ans, joyeux et sociable. Il s\'entend avec '
         + 'tout le monde et s\'adapte aussi bien en appartement qu\'en maison.',
    photos: [PHOTOS.beagleMix, PHOTOS.jackRussell],
    requirements: { children_compatible: 'yes', cats_compatible: 'yes', dogs_compatible: 'yes',
                    needs_garden: 'no', daily_outdoor_time: 'no', spacious_home: 'no' },
  },
  {
    shelter_key: 5, name: 'Isis', species: 'cat', breed: 'Bengal Mix',
    age: 10, size: 'medium', temperament: 'energetic', special_needs: null,
    story: 'Isis est une chatte Bengal de 10 mois, curieuse et joueuse. '
         + 'Elle a besoin de stimulation et préfère vivre seule. Pour enfants de plus de 6 ans.',
    photos: [PHOTOS.orangeKitten],
    requirements: { children_compatible: '6+', cats_compatible: 'no', dogs_compatible: 'no',
                    needs_garden: 'no', daily_outdoor_time: 'no', spacious_home: 'no' },
  },
  {
    shelter_key: 5, name: 'Bruno', species: 'dog', breed: 'Berger Allemand',
    age: 60, size: 'large', temperament: 'energetic', special_needs: null,
    story: 'Bruno est un berger allemand de 5 ans, loyal et protecteur. Besoin d\'espace '
         + 'et de sorties quotidiennes. Compatible avec les chiens et enfants de plus de 6 ans.',
    photos: [PHOTOS.goldenRetriever],
    requirements: { children_compatible: '6+', cats_compatible: 'no', dogs_compatible: 'yes',
                    needs_garden: 'yes', daily_outdoor_time: 'yes', spacious_home: 'yes' },
  },
  {
    shelter_key: 5, name: 'Muffin', species: 'guinea_pig', breed: 'Cobaye Teddy',
    age: 18, size: 'small', temperament: 'calm', special_needs: null,
    story: 'Muffin est un cobaye Teddy tout doux avec un pelage frisé. '
         + 'Il adore les légumes frais et les câlins. Parfait pour les enfants.',
    photos: [PHOTOS.hamster],
    requirements: { children_compatible: 'yes', cats_compatible: 'no', dogs_compatible: 'no',
                    needs_garden: 'no', daily_outdoor_time: 'no', spacious_home: 'no' },
  },

  // ═══ 6 · La Maison des Animaux — Mons ══════════════════════════════════

  {
    shelter_key: 6, name: 'Simba', species: 'cat', breed: 'Maine Coon',
    age: 22, size: 'large', temperament: 'playful', special_needs: null,
    story: 'Simba est un magnifique Maine Coon de presque 2 ans. Il aime l\'espace '
         + 'et la compagnie des chiens. Un félin majestueux pour une grande maison.',
    photos: [PHOTOS.tabbyCat],
    requirements: { children_compatible: 'yes', cats_compatible: 'no', dogs_compatible: 'yes',
                    needs_garden: 'no', daily_outdoor_time: 'no', spacious_home: 'yes' },
  },
  {
    shelter_key: 6, name: 'Nuage', species: 'cat', breed: 'Persan',
    age: 84, size: 'medium', temperament: 'calm', special_needs: null,
    story: 'Nuage est un chat persan senior de 7 ans, très serein. Il préfère la tranquillité, '
         + 'sans autres animaux, dans un foyer calme avec enfants de plus de 12 ans.',
    photos: [PHOTOS.blackWhiteCat],
    requirements: { children_compatible: '12+', cats_compatible: 'no', dogs_compatible: 'no',
                    needs_garden: 'no', daily_outdoor_time: 'no', spacious_home: 'no' },
  },
  {
    shelter_key: 6, name: 'Lilo', species: 'rabbit', breed: 'Lapin Nain',
    age: 12, size: 'small', temperament: 'playful', special_needs: null,
    story: 'Lilo est une lapine naine de 1 an, vive et curieuse. Elle adore explorer '
         + 'son espace et les jouets. À protéger des prédateurs.',
    photos: [PHOTOS.whiteRabbit],
    requirements: { children_compatible: 'yes', cats_compatible: 'no', dogs_compatible: 'no',
                    needs_garden: 'no', daily_outdoor_time: 'no', spacious_home: 'no' },
  },
  {
    shelter_key: 6, name: 'Noisette', species: 'cat', breed: 'Européen',
    age: 3, size: 'small', temperament: 'playful', special_needs: null,
    story: 'Noisette est un chaton de 3 mois débordant d\'énergie. Elle adore jouer '
         + 'et grimper partout. S\'entend avec les autres chats.',
    photos: [PHOTOS.orangeKitten],
    requirements: { children_compatible: 'yes', cats_compatible: 'yes', dogs_compatible: 'no',
                    needs_garden: 'no', daily_outdoor_time: 'no', spacious_home: 'no' },
  },

  // ═══ 7 · SPA Lille-Métropole ════════════════════════════════════════════

  {
    shelter_key: 7, name: 'Django', species: 'dog', breed: 'Labrador Mix',
    age: 42, size: 'large', temperament: 'playful', special_needs: null,
    story: 'Django est un labrador mix de 3 ans et demi, affectueux et joueur. '
         + 'Il s\'entend avec les enfants, les chats et les autres chiens. Besoin d\'un jardin.',
    photos: [PHOTOS.goldenRetriever, PHOTOS.beagleMix],
    requirements: { children_compatible: 'yes', cats_compatible: 'yes', dogs_compatible: 'yes',
                    needs_garden: 'yes', daily_outdoor_time: 'yes', spacious_home: 'yes' },
  },
  {
    shelter_key: 7, name: 'Doucette', species: 'cat', breed: 'Européen',
    age: 50, size: 'medium', temperament: 'mixed', special_needs: null,
    story: 'Doucette est une chatte européenne de 4 ans, à la fois indépendante et câline. '
         + 'Elle s\'entend avec tout le monde. Un compagnon polyvalent.',
    photos: [PHOTOS.tabbyCat, PHOTOS.blackWhiteCat],
    requirements: { children_compatible: 'yes', cats_compatible: 'yes', dogs_compatible: 'yes',
                    needs_garden: 'no', daily_outdoor_time: 'no', spacious_home: 'no' },
  },
  {
    shelter_key: 7, name: 'Twix', species: 'other', breed: 'Hamster Russe',
    age: 6, size: 'small', temperament: 'calm', special_needs: null,
    story: 'Twix est un hamster russe nain très actif la nuit. Facile d\'entretien, '
         + 'il est parfait comme première responsabilité pour les enfants de plus de 6 ans.',
    photos: [PHOTOS.hamster],
    requirements: { children_compatible: '6+', cats_compatible: 'no', dogs_compatible: 'no',
                    needs_garden: 'no', daily_outdoor_time: 'no', spacious_home: 'no' },
  },
  {
    shelter_key: 7, name: 'Perle', species: 'cat', breed: 'Persan',
    age: 90, size: 'medium', temperament: 'calm', special_needs: null,
    story: 'Perle est une chatte persane senior très calme. Elle préfère la tranquillité : '
         + 'pas d\'autres animaux, et enfants de plus de 12 ans seulement.',
    photos: [PHOTOS.blackWhiteCat],
    requirements: { children_compatible: '12+', cats_compatible: 'no', dogs_compatible: 'no',
                    needs_garden: 'no', daily_outdoor_time: 'no', spacious_home: 'no' },
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🐾  Adoptly — Seed des données démo\n');

  // 0. Reset si demandé ────────────────────────────────────────────────────
  if (RESET) {
    console.log('♻️   --reset : suppression des données démo existantes...');

    const { data: existing } = await supabase
      .from('shelters')
      .select('id')
      .in('email', DEMO_EMAILS);

    if (existing?.length) {
      const ids = existing.map((s) => s.id);
      await supabase.from('animals').delete().in('shelter_id', ids);
      await supabase.from('shelters').delete().in('id', ids);
      console.log(`    ✓ ${existing.length} refuge(s) et leurs animaux supprimés\n`);
    } else {
      console.log('    Aucune donnée démo trouvée.\n');
    }
  }

  // 1. Vérifier si déjà seedé ──────────────────────────────────────────────
  const { data: alreadyExist } = await supabase
    .from('shelters')
    .select('id')
    .in('email', DEMO_EMAILS);

  if (alreadyExist?.length) {
    console.log(
      `⚠️   Les données démo existent déjà (${alreadyExist.length} refuge(s) sur ${SHELTERS.length}).\n` +
      '    Relancez avec --reset pour les recréer.\n'
    );
    process.exit(0);
  }

  // 2. Hasher le mot de passe ──────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // 3. Créer les refuges ───────────────────────────────────────────────────
  console.log(`🏠  Création des ${SHELTERS.length} associations/refuges...\n`);
  const shelterIds = [];

  for (const shelter of SHELTERS) {
    const { data, error } = await supabase
      .from('shelters')
      .insert({ ...shelter, password_hash: passwordHash })
      .select('id, name')
      .single();

    if (error) {
      console.error(`    ✗ ${shelter.name} :`, error.message);
      process.exit(1);
    }

    shelterIds.push(data.id);
    const city = shelter.address.split(', ').pop();
    console.log(`    ✓  ${data.name}  —  ${city}`);
  }

  // 4. Créer les animaux ───────────────────────────────────────────────────
  console.log(`\n🐶  Création des ${ANIMALS.length} animaux...\n`);
  let ok = 0;
  const ICON = { dog: '🐕', cat: '🐈', rabbit: '🐇', guinea_pig: '🐹', other: '🐾' };

  for (const tpl of ANIMALS) {
    const { shelter_key, ...fields } = tpl;
    const shelter_id = shelterIds[shelter_key];

    const { data, error } = await supabase
      .from('animals')
      .insert({ ...fields, shelter_id, status: 'active' })
      .select('id, name, species')
      .single();

    if (error) {
      console.error(`    ✗ ${tpl.name} :`, error.message);
    } else {
      ok++;
      const shelterName = SHELTERS[tpl.shelter_key].name.split(' — ').pop() || SHELTERS[tpl.shelter_key].name;
      console.log(`    ✓ ${ICON[data.species] ?? '🐾'}  ${data.name.padEnd(12)} (${data.species})  ← ${shelterName}`);
    }
  }

  // 5. Résumé ──────────────────────────────────────────────────────────────
  const bySpecies = ANIMALS.reduce((acc, a) => {
    acc[a.species] = (acc[a.species] || 0) + 1;
    return acc;
  }, {});

  console.log('\n' + '─'.repeat(55));
  console.log(`✅  Seed terminé — ${ok}/${ANIMALS.length} animaux dans ${SHELTERS.length} associations\n`);
  console.log('📊  Répartition par espèce :');
  Object.entries(bySpecies).forEach(([sp, n]) =>
    console.log(`    ${ICON[sp] ?? '🐾'}  ${sp.padEnd(12)} × ${n}`)
  );

  console.log('\n📋  Connexion aux comptes refuges (mot de passe commun) :');
  console.log(`    Mot de passe : ${DEMO_PASSWORD}\n`);
  SHELTERS.forEach((s) => {
    const city = s.address.split(', ').pop();
    console.log(`    ${s.name.padEnd(38)} ${s.email}`);
    void city;
  });
  console.log('');
}

main().catch((err) => {
  console.error('\n💥 Erreur fatale :', err.message);
  process.exit(1);
});
