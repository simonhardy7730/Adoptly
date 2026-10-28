// Prologue narratif joué juste après la création : famille, quartier, premier contact avec le football, rêve.
// Chaque choix modifie la partie (caractéristiques, relations, argent, drapeaux) et peut programmer un événement futur.

import type { GameState } from '../game/types';
import type { Effects } from '../game/helpers';
import { npcByRole } from '../game/helpers';
import { country } from './countries';
import { background, environment } from './profiles';

export interface PrologueChoice {
  id: string;
  label: string;
  hint: string;
  effects: Effects;
  /** Texte de conséquence affiché après le choix. */
  outcome: string;
}

export interface PrologueScene {
  id: string;
  kicker: string;
  title: string;
  icon: string;
  text: (s: GameState) => string;
  choices: (s: GameState) => PrologueChoice[];
}

const first = (s: GameState, role: 'parent' | 'parent2' | 'sibling' | 'friend' | 'mentor') => npcByRole(s, role)?.name.split(' ')[0] ?? '';

function city(s: GameState) {
  return s.identity.growUpCountry === s.identity.birthCountry ? s.identity.birthCity : country(s.identity.growUpCountry).cities[0];
}

const FAMILY_TEXT: Record<string, (s: GameState) => string> = {
  modest_football: (s) => `Chez toi, à ${city(s)}, l’appartement est petit mais la télé est toujours allumée les soirs de match. ${first(s, 'parent')}, ton père, travaille tôt le matin ; ${first(s, 'parent2')}, ta mère, compte chaque euro. Le ballon, lui, ne coûte rien.`,
  stable_studies: (s) => `À ${city(s)}, tes parents ont une règle simple : les devoirs d’abord. ${first(s, 'parent2')} vérifie ton cahier chaque soir, ${first(s, 'parent')} t’emmène au parc le dimanche. Le football est autorisé… tant que le bulletin suit.`,
  wealthy: (s) => `La maison de ${city(s)} est grande, le jardin aussi. ${first(s, 'parent')} parle souvent de réussite, ${first(s, 'parent2')} de discipline. Tu as déjà trois paires de crampons, mais ce qui te manque, c’est des copains pour jouer.`,
  ex_pro_parent: (s) => `Dans le salon de ${city(s)}, un vieux maillot encadré : celui de ${first(s, 'parent')}, ton père, ancien joueur de deuxième division. Il commente chacun de tes gestes. ${first(s, 'parent2')} lui rappelle souvent que tu n’as que ${s.creation.startAge} ans.`,
  nomad: (s) => `Ta famille vient encore de poser ses cartons, cette fois à ${city(s)}. ${first(s, 'parent')} change souvent de poste, ${first(s, 'parent2')} recrée un foyer partout. Toi, ta seule constante, c’est le ballon dans ton sac.`,
  responsibilities: (s) => `À ${city(s)}, ${first(s, 'parent2')}, ta mère, enchaîne les horaires décalés. Après l’école, c’est toi qui t’occupes de ${first(s, 'sibling') || 'ta petite sœur'}. Le foot, c’est l’heure que tu arraches à la journée.`,
};

const PLACE: Record<string, string> = {
  city: 'le city-stade grillagé au pied des immeubles',
  town: 'le terrain stabilisé derrière le gymnase',
  countryside: 'le pré bosselé derrière la ferme des voisins',
};

export const PROLOGUE: PrologueScene[] = [
  {
    id: 'family',
    kicker: 'Chapitre 1 · La maison',
    title: 'Ta famille',
    icon: '🏠',
    text: (s) => FAMILY_TEXT[s.identity.background]?.(s) ?? '',
    choices: (s) => {
      const base: PrologueChoice[] = [
        { id: 'help', label: 'Donner un coup de main à la maison chaque soir', hint: 'Famille soudée, discipline', effects: { rel: { parent: 5, parent2: 6 }, attrs: { discipline: 1.5 } }, outcome: 'Tes parents le remarquent. À la maison, on te fait confiance.' },
        { id: 'juggle', label: 'Passer tes soirées à jongler dans la chambre', hint: 'Technique, mais quelques reproches', effects: { attrs: { technique: 1.8, dribbling: 0.6 }, rel: { parent2: -3 } }, outcome: 'Le lustre a survécu de justesse. Ton toucher de balle, lui, progresse.' },
      ];
      const bg = s.identity.background;
      if (bg === 'ex_pro_parent') base.push({ id: 'tapes', label: 'Regarder les vieux matchs de ton père avec lui', hint: 'Tactique, relation père, mais pression', effects: { attrs: { tactics: 2 }, rel: { parent: 7 }, flags: { dadPressure: 1 } }, outcome: '« Regarde comme on se replace ici. » Tu apprends… et il attend beaucoup de toi.' });
      else if (bg === 'responsibilities') base.push({ id: 'promise', label: `Promettre à ${first(s, 'sibling') || 'ta sœur'} de devenir pro`, hint: 'Mental, fratrie ; cette promesse reviendra', effects: { attrs: { mental: 1.5 }, rel: { sibling: 10 }, flags: { promiseSibling: 1 }, schedule: { eventId: 'sibling_promise', inWeeks: 30 } }, outcome: 'Elle te fait jurer, petit doigt levé. Tu ne pourras pas l’oublier.' });
      else if (bg === 'wealthy') base.push({ id: 'camp', label: 'Demander à remplacer le cours de piano par le foot', hint: 'Motivation, parents un peu déçus', effects: { morale: 8, rel: { parent: -4 }, attrs: { mental: 0.8 } }, outcome: 'Après une longue négociation, le piano part au grenier.' });
      else if (bg === 'modest_football') base.push({ id: 'savings', label: 'Économiser ton argent de poche pour des crampons', hint: '+10 € de tirelire, discipline', effects: { money: 10, moneyCat: 'gift', moneyLabel: 'Économies de départ', attrs: { discipline: 1 } }, outcome: 'Pièce après pièce, la tirelire se remplit.' });
      else if (bg === 'nomad') base.push({ id: 'adapt', label: 'Te présenter aux voisins dès le premier jour', hint: 'Amitié, mental', effects: { rel: { friend: 10 }, attrs: { mental: 1 } }, outcome: 'Dès le lendemain, on frappe à ta porte pour un foot.' });
      else base.push({ id: 'books', label: 'Dévorer tous les magazines de foot de la bibliothèque', hint: 'Tactique, notes', effects: { attrs: { tactics: 1.2, vision: 0.6 }, school: 0.6 }, outcome: 'Tu connais les compositions de toutes les équipes du monde.' });
      return base;
    },
  },
  {
    id: 'neighborhood',
    kicker: 'Chapitre 2 · Le quartier',
    title: 'Ton terrain',
    icon: '🏟️',
    text: (s) => `Ton terrain, c’est ${PLACE[s.identity.environment]}. ${environment(s.identity.environment).description} ${first(s, 'friend')}, ton meilleur ami, t’y attend presque tous les jours.`,
    choices: (): PrologueChoice[] => [
      { id: 'elders', label: 'Jouer avec les plus grands, même si ça cogne', hint: 'Mental, force ; fatigue', effects: { attrs: { mental: 1.2, strength: 0.8 }, energy: -10 }, outcome: 'Tu prends des coups, tu te relèves. Les grands commencent à te respecter.' },
      { id: 'organize', label: `Organiser des matchs avec ${'tes copains'}`, hint: 'Amitié, tactique ; un tournoi se prépare', effects: { rel: { friend: 8 }, attrs: { tactics: 0.8 }, flags: { leader: 1 }, schedule: { eventId: 'neighborhood_cup', inWeeks: 7 } }, outcome: 'Tu fais les équipes, tu arbitres, tu motives. Les autres t’écoutent.' },
      { id: 'wall', label: 'T’entraîner seul contre un mur', hint: 'Passe, technique ; moins de temps avec les amis', effects: { attrs: { passing: 1.5, technique: 0.6 }, rel: { friend: -4 } }, outcome: 'Mille contrôles, mille passes. Le mur ne rate jamais.' },
    ],
  },
  {
    id: 'first_contact',
    kicker: 'Chapitre 3 · Le déclic',
    title: 'Ton premier souvenir de foot',
    icon: '✨',
    text: (s) => `Il y a eu un moment où le football est devenu plus qu’un jeu. ${background(s.identity.background).id === 'ex_pro_parent' ? 'Peut-être dans les tribunes, sur les épaules de ton père.' : 'Tu t’en souviens comme si c’était hier.'}`,
    choices: (s) => [
      { id: 'idol', label: 'Une finale à la télé, en famille : tu choisis ton idole', hint: 'Moral, famille ; ton idole fera parler d’elle', effects: { morale: 6, rel: { parent: 3, parent2: 3 }, flags: { idol: 1 }, schedule: { eventId: 'idol_signing', inWeeks: 14 } }, outcome: 'Ce soir-là, tu as imité chaque geste de ton idole devant la télé.' },
      { id: 'ball', label: 'Le ballon en cuir offert pour ton anniversaire', hint: 'Technique, tu y tiens plus que tout', effects: { attrs: { technique: 1.2, shooting: 0.6 }, morale: 4 }, outcome: 'Tu dormais avec. Il est encore dans ta chambre.' },
      { id: 'goal', label: `Ton premier but au ${s.identity.environment === 'countryside' ? 'pré' : 'city-stade'}, devant tout le monde`, hint: 'Confiance, petite réputation locale', effects: { attrs: { mental: 1, shooting: 0.8 }, rep: { sport: 1.5, popularity: 1 } }, outcome: 'Tout le monde a crié ton prénom. Tu veux revivre ça mille fois.' },
    ],
  },
  {
    id: 'dream',
    kicker: 'Chapitre 4 · Le rêve',
    title: 'Ce que tu veux devenir',
    icon: '🌟',
    text: (s) => `Le soir, tu écris quelque chose sur la dernière page de ton cahier. ${first(s, 'parent2')} le trouvera peut-être un jour. Tu as ${s.creation.startAge} ans, et tu sais déjà ce que tu veux.`,
    choices: (): PrologueChoice[] => [
      { id: 'national', label: '« Porter le maillot de mon pays. »', hint: 'Mental ; les sélectionneurs liront ton nom un jour', effects: { attrs: { mental: 1 }, flags: { dream_national: 1 } }, outcome: 'Tu dessines un drapeau à côté de la phrase.' },
      { id: 'family', label: '« Que ma famille ne manque plus jamais de rien. »', hint: 'Discipline, famille ; tu les soutiendras', effects: { attrs: { discipline: 1.2 }, rel: { parent: 4, parent2: 4 }, flags: { dream_family: 1, familySupport: 1 } }, outcome: 'Tu soulignes la phrase deux fois.' },
      { id: 'star', label: '« Devenir le meilleur joueur du monde. »', hint: 'Moral, confiance ; gare à la pression', effects: { morale: 8, attrs: { mental: 0.6 }, flags: { dream_star: 1 } }, outcome: 'Écrit en lettres capitales, au feutre.' },
    ],
  },
];

export const DREAM_LABELS: Record<string, string> = {
  national: 'Porter le maillot de mon pays',
  family: 'Que ma famille ne manque plus jamais de rien',
  star: 'Devenir le meilleur joueur du monde',
};
