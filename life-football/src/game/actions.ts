// Actions hebdomadaires : chaque action consomme du temps libre (créneaux) et de l'énergie.
// La disponibilité dépend de l'âge, de la période (école/vacances), des blessures et du budget.

import type { GameState } from './types';
import { ageAt, isHolidays, isSchoolPeriod } from './calendar';
import { addMoney, changeRelation, journal, npcByRole } from './helpers';
import { applyTraining, FOCUS_SPLIT, type TrainingFocus } from './stats';
import { background } from '../content/profiles';
import { food } from '../content/foods';
import { createClubOffer } from './career';
import { chance, clamp, round1 } from './rng';
import { ATTR_LABELS } from '../content/profiles';

export type ActionCategory = 'football' | 'vie' | 'social' | 'école' | 'santé';

export interface ActionDef {
  id: string;
  label: string;
  icon: string;
  category: ActionCategory;
  cost: number; // créneaux
  description: (s: GameState) => string;
  stakes: (s: GameState) => string[]; // ce que le joueur doit savoir avant de cliquer
  unavailable: (s: GameState) => string | null;
  run: (s: GameState) => string;
}

export function weeklySlots(s: GameState): number {
  let n = 5 + background(s.identity.background).slotMod;
  if (isHolidays(s.t, s.startYear)) n += 3;
  const club = s.membership && s.clubs.find((c) => c.id === s.membership!.clubId);
  if (club && club.tier >= 3) n -= 1; // emploi du temps du centre de formation
  return Math.max(2, n);
}

const injured = (s: GameState) => (s.player.injury ? `Blessé (${s.player.injury.name})` : null);
const needEnergy = (s: GameState, e: number) => (s.player.energy < e ? `Trop fatigué (énergie < ${e})` : null);

const TRAIN_INFO: Record<TrainingFocus, { label: string; icon: string; energy: number; gk?: boolean }> = {
  technique: { label: 'Entraînement technique', icon: '🎯', energy: 15 },
  physical: { label: 'Préparation physique', icon: '🏃', energy: 22 },
  tactical: { label: 'Travail tactique (vidéo + terrain)', icon: '🧠', energy: 9 },
  finishing: { label: 'Atelier finition', icon: '🥅', energy: 15 },
  defense: { label: 'Atelier défensif', icon: '🛡️', energy: 16 },
  goalkeeping: { label: 'Entraînement spécifique gardien', icon: '🧤', energy: 16, gk: true },
  mental: { label: 'Préparation mentale', icon: '🧘', energy: 6 },
};

function trainAction(focus: TrainingFocus): ActionDef {
  const info = TRAIN_INFO[focus];
  return {
    id: `train_${focus}`,
    label: info.label,
    icon: info.icon,
    category: 'football',
    cost: 1,
    description: () => `Travaille : ${Object.keys(FOCUS_SPLIT[focus]).map((k) => ATTR_LABELS[k as keyof typeof ATTR_LABELS]).join(', ')}.`,
    stakes: (s) => [`Énergie −${info.energy}`, s.player.energy < 40 ? 'Fatigue : progression réduite et risque de blessure' : 'Progression normale', 'Usure des crampons'],
    unavailable: (s) => injured(s) ?? needEnergy(s, Math.min(info.energy, 12)) ?? (focus === 'mental' && ageAt(s) < 12 ? 'Disponible à partir de 12 ans' : null),
    run: (s) => {
      const gains = applyTraining(s, focus, 1);
      s.player.energy = clamp(s.player.energy - info.energy);
      s.player.form = clamp(s.player.form + (focus === 'physical' ? 3 : 1.2));
      wearBoots(s, focus === 'tactical' || focus === 'mental' ? 0.5 : 2);
      const injuryRisk = s.player.energy < 25 ? 0.06 : s.player.energy < 40 ? 0.02 : 0.004;
      if (focus !== 'tactical' && focus !== 'mental' && chance(s, injuryRisk + (s.player.boots.wear > 85 ? 0.01 : 0))) {
        s.player.injury = { name: 'Élongation à l’entraînement', weeksLeft: 2, severity: 1 };
        journal(s, 'Blessure à l’entraînement : élongation (2 semaines).', '🩹');
        return 'Aïe ! Une douleur à la cuisse en fin de séance : élongation, 2 semaines d’arrêt.';
      }
      return `Séance terminée. ${fmtGains(gains)}`;
    },
  };
}

export function fmtGains(g: Partial<Record<string, number>>): string {
  const parts = Object.entries(g)
    .filter(([, v]) => (v ?? 0) >= 0.05)
    .map(([k, v]) => `${ATTR_LABELS[k as keyof typeof ATTR_LABELS]} +${round1(v ?? 0)}`);
  return parts.length ? parts.join(' · ') : 'Peu de progrès cette fois (fatigue ou plafond actuel).';
}

export function wearBoots(s: GameState, amount: number) {
  const b = s.player.boots;
  const rate = b.quality === 3 ? 0.55 : b.quality === 2 ? 0.8 : 1.15;
  b.wear = clamp(b.wear + amount * rate);
}

export const ACTIONS: ActionDef[] = [
  trainAction('technique'),
  trainAction('physical'),
  trainAction('tactical'),
  trainAction('finishing'),
  trainAction('defense'),
  trainAction('goalkeeping'),
  trainAction('mental'),
  {
    id: 'private_coach',
    label: 'Séance avec un coach privé',
    icon: '👨‍🏫',
    category: 'football',
    cost: 1,
    description: () => 'Séance individuelle ciblée sur ton poste. Efficace, mais coûteuse.',
    stakes: () => ['Coût : 35 €', 'Énergie −16', 'Progression ×1,8 sur ton poste'],
    unavailable: (s) => injured(s) ?? needEnergy(s, 16) ?? (s.money < 35 ? 'Pas assez d’argent (35 €)' : null),
    run: (s) => {
      addMoney(s, -35, 'leisure', 'Coach privé');
      const focus: TrainingFocus = s.identity.position === 'GK' ? 'goalkeeping' : s.identity.position === 'DEF' ? 'defense' : s.identity.position === 'ATT' ? 'finishing' : 'technique';
      const gains = applyTraining(s, focus, 1.8);
      s.player.energy = clamp(s.player.energy - 16);
      wearBoots(s, 2);
      return `Séance intense et précise. ${fmtGains(gains)}`;
    },
  },
  {
    id: 'street_match',
    label: 'Match de quartier',
    icon: '⚽',
    category: 'football',
    cost: 1,
    description: () => 'Un match au city-stade. Tu prends des décisions dans les moments clés. On ne sait jamais qui regarde…',
    stakes: () => ['Énergie −18', 'Réputation locale', 'Petite chance d’être repéré'],
    unavailable: (s) => injured(s) ?? needEnergy(s, 20) ?? (ageAt(s) > 17 ? 'Tu as passé l’âge des matchs de quartier' : null),
    run: () => 'match', // géré par le store : lance l'écran de match
  },
  {
    id: 'visit_local_club',
    label: 'Visiter le club local',
    icon: '🏟️',
    category: 'football',
    cost: 1,
    description: (s) => {
      const c = localClub(s);
      return c ? `${c.name}, à ${c.distanceKm} km. Les clubs amateurs accueillent les enfants qui veulent jouer : une licence suffit.` : 'Aucun club local.';
    },
    stakes: () => ['Proposition d’inscription possible', 'Cotisation annuelle ~80 €', 'Énergie −8'],
    unavailable: (s) => {
      if (s.membership) return 'Tu as déjà un club';
      const c = localClub(s);
      if (!c) return 'Aucun club local';
      if (s.clubOffers.some((o) => o.clubId === c.id && o.status === 'pending')) return 'Proposition en attente dans l’onglet Club';
      if ((s.events.flags.localVisit ?? -99) > s.t - 12) return 'Déjà visité récemment';
      return null;
    },
    run: (s) => {
      const c = localClub(s)!;
      s.events.flags.localVisit = s.t;
      s.player.energy = clamp(s.player.energy - 8);
      // Un club amateur accueille presque tout le monde ; le rôle dépend du niveau.
      const margin = (s.player.attrs.technique + s.player.attrs.passing) / 2 - 20;
      createClubOffer(s, c, margin);
      changeRelation(s, 'parent', 1);
      return `L’éducateur de ${c.name} te fait faire quelques ateliers et te propose une licence. Réponds dans l’onglet Club.`;
    },
  },
  {
    id: 'study',
    label: 'Réviser / devoirs',
    icon: '📚',
    category: 'école',
    cost: 1,
    description: () => 'Rattraper les cours, préparer les contrôles.',
    stakes: (s) => ['Notes en hausse', 'Énergie −6', s.identity.background === 'stable_studies' ? 'Tes parents apprécient (+relation)' : 'Parents rassurés'],
    unavailable: (s) => (!isSchoolPeriod(s.t, s.startYear) ? 'Vacances scolaires' : ageAt(s) >= 18 ? 'Scolarité terminée' : null),
    run: (s) => {
      const gain = 0.35 + s.player.attrs.discipline / 200 + (s.player.energy > 50 ? 0.15 : 0);
      s.player.school.grade = clamp(s.player.school.grade + gain, 0, 20);
      s.player.school.trend += gain;
      s.player.energy = clamp(s.player.energy - 6);
      changeRelation(s, 'parent2', s.identity.background === 'stable_studies' ? 3 : 1.5);
      return `Tu avances dans tes révisions (moyenne ${round1(s.player.school.grade)}/20).`;
    },
  },
  {
    id: 'rest',
    label: 'Se reposer / dormir plus',
    icon: '😴',
    category: 'santé',
    cost: 1,
    description: () => 'Sieste, étirements, coucher tôt. Indispensable avant un gros rendez-vous.',
    stakes: () => ['Énergie +28', 'Moral +2'],
    unavailable: () => null,
    run: (s) => {
      s.player.energy = clamp(s.player.energy + 28);
      s.player.morale = clamp(s.player.morale + 2);
      if (s.player.injury) s.player.injury.weeksLeft = Math.max(0, s.player.injury.weeksLeft - 0.25);
      return 'Tu recharges les batteries.';
    },
  },
  {
    id: 'physio',
    label: 'Séance de kiné',
    icon: '🩺',
    category: 'santé',
    cost: 1,
    description: () => 'Accélère la guérison d’une blessure.',
    stakes: (s) => [`Coût : ${physioCost(s)} €`, 'Guérison plus rapide'],
    unavailable: (s) => (!s.player.injury ? 'Aucune blessure à soigner' : s.money < physioCost(s) ? `Pas assez d’argent (${physioCost(s)} €)` : null),
    run: (s) => {
      const c = physioCost(s);
      if (c > 0) addMoney(s, -c, 'health', 'Kinésithérapeute');
      s.player.injury!.weeksLeft = Math.max(0, s.player.injury!.weeksLeft - 0.8);
      return c === 0 ? 'Le kiné du club s’occupe de toi gratuitement.' : 'La douleur diminue. Encore un peu de patience.';
    },
  },
  {
    id: 'friends',
    label: 'Voir ses amis',
    icon: '🧑‍🤝‍🧑',
    category: 'social',
    cost: 1,
    description: (s) => (ageAt(s) >= 13 ? 'Sortie au café, ciné ou balade en ville.' : 'Après-midi chez un copain, vélo, rigolades.'),
    stakes: (s) => ['Moral +8', 'Amitié +6', ageAt(s) >= 13 ? 'Coût ~8 € · peut écourter la nuit' : 'Énergie −4'],
    unavailable: (s) => (ageAt(s) >= 13 && s.money < 8 ? 'Pas assez d’argent pour sortir (8 €)' : null),
    run: (s) => {
      s.player.morale = clamp(s.player.morale + 8);
      changeRelation(s, 'friend', 6);
      changeRelation(s, 'teammate', 3);
      if (ageAt(s) >= 13) {
        addMoney(s, -8, 'leisure', 'Sortie entre amis');
        if (chance(s, 0.3)) {
          s.player.energy = clamp(s.player.energy - 10);
          return 'Super soirée… qui a fini un peu tard. (Énergie −10)';
        }
      }
      s.player.energy = clamp(s.player.energy - 4);
      return 'Un bon moment entre amis, ça fait du bien.';
    },
  },
  {
    id: 'restaurant',
    label: 'Restaurant / café en ville',
    icon: '🍽️',
    category: 'social',
    cost: 1,
    description: () => 'Un vrai moment de détente, et l’occasion de rencontrer du monde.',
    stakes: () => ['Coût : 18 €', 'Moral +12', 'Relations +', 'Nutrition variable'],
    unavailable: (s) => (ageAt(s) < 15 ? 'À partir de 15 ans' : s.money < 18 ? 'Pas assez d’argent (18 €)' : null),
    run: (s) => {
      addMoney(s, -18, 'leisure', 'Restaurant');
      s.player.morale = clamp(s.player.morale + 12);
      changeRelation(s, 'friend', 4);
      changeRelation(s, 'crush', 5);
      s.player.nutrition = clamp(s.player.nutrition - 2);
      if (!npcByRole(s, 'crush') && chance(s, 0.25)) s.events.pending.push({ eventId: 'meet_crush' });
      return 'Bonne ambiance, bons plats. Tu repars le sourire aux lèvres.';
    },
  },
  {
    id: 'family_time',
    label: 'Temps en famille',
    icon: '🏠',
    category: 'social',
    cost: 1,
    description: () => 'Repas, sortie, discussion. Ta famille compte sur toi.',
    stakes: () => ['Relations familiales +6', 'Moral +5'],
    unavailable: () => null,
    run: (s) => {
      changeRelation(s, 'parent', 6);
      changeRelation(s, 'parent2', 6);
      changeRelation(s, 'sibling', 6);
      s.player.morale = clamp(s.player.morale + 5);
      s.player.nutrition = clamp(s.player.nutrition + 1);
      const boarding = s.membership && s.clubs.find((c) => c.id === s.membership!.clubId)?.boarding && ageAt(s) >= 13;
      if (boarding) {
        addMoney(s, -12, 'transport', 'Retour à la maison');
        return 'Retour à la maison pour le week-end. Tout le monde était content de te voir.';
      }
      return 'Un moment précieux avec les tiens.';
    },
  },
  {
    id: 'help_family',
    label: 'Aider la famille / petit boulot',
    icon: '🧹',
    category: 'vie',
    cost: 1,
    description: (s) => (ageAt(s) >= 15 ? 'Quelques heures de petit boulot (livraison, marché…).' : 'Courses, ménage, garder ta sœur : un coup de main rémunéré en argent de poche.'),
    stakes: (s) => [`Gain : ${jobPay(s)} €`, 'Énergie −10', 'Famille +3'],
    unavailable: () => null,
    run: (s) => {
      addMoney(s, jobPay(s), 'job', ageAt(s) >= 15 ? 'Petit boulot' : 'Coup de main à la maison');
      s.player.energy = clamp(s.player.energy - 10);
      changeRelation(s, 'parent', 3);
      changeRelation(s, 'parent2', 3);
      if (s.identity.background === 'responsibilities') s.player.attrs.discipline = clamp(s.player.attrs.discipline + 0.15, 1, 99);
      return `Tu as rendu service et gagné ${jobPay(s)} €.`;
    },
  },
  {
    id: 'games',
    label: 'Jeux vidéo / écrans',
    icon: '🎮',
    category: 'vie',
    cost: 1,
    description: () => 'Détente garantie. Attention au coucher tardif.',
    stakes: () => ['Moral +6', 'Énergie +4', 'Risque : sommeil perturbé'],
    unavailable: () => null,
    run: (s) => {
      s.player.morale = clamp(s.player.morale + 6);
      s.player.energy = clamp(s.player.energy + 4);
      if (chance(s, 0.35)) {
        s.events.flags.lateNight = 1;
        return 'Encore une partie… puis une autre. Ta nuit sera plus courte.';
      }
      return 'Tu décompresses devant ta console.';
    },
  },
  {
    id: 'cook',
    label: 'Cuisiner un bon repas',
    icon: '🍳',
    category: 'santé',
    cost: 1,
    description: () => 'Prépare un repas équilibré avec ce que tu as dans le garde-manger (protéines + légumes/féculents).',
    stakes: () => ['Consomme 2 portions saines', 'Nutrition +7', 'Énergie +6'],
    unavailable: (s) => (ageAt(s) < 12 ? 'À partir de 12 ans' : healthyPortions(s) < 2 ? 'Il te faut au moins 2 portions saines (protéines, légumes, féculents)' : null),
    run: (s) => {
      consumeHealthy(s, 2);
      s.player.nutrition = clamp(s.player.nutrition + 7);
      s.player.energy = clamp(s.player.energy + 6);
      return 'Repas maison réussi : ton corps te remercie.';
    },
  },
];

export function localClub(s: GameState) {
  return [...s.clubs].filter((c) => c.tier === 1).sort((a, b) => a.distanceKm - b.distanceKm)[0];
}

export function physioCost(s: GameState) {
  const club = s.membership && s.clubs.find((c) => c.id === s.membership!.clubId);
  return club && club.tier >= 2 ? 0 : 20;
}

export function jobPay(s: GameState) {
  const base = background(s.identity.background).jobPay;
  return ageAt(s) >= 15 ? base * 2.5 : base;
}

function healthyPortions(s: GameState) {
  return Object.entries(s.pantry).reduce((n, [id, q]) => {
    const f = food(id);
    return f && f.nutrition >= 60 && f.tag !== 'boisson' ? n + q : n;
  }, 0);
}

function consumeHealthy(s: GameState, n: number) {
  for (const [id, q] of Object.entries(s.pantry).sort((a, b) => (food(b[0])?.nutrition ?? 0) - (food(a[0])?.nutrition ?? 0))) {
    const f = food(id);
    if (!f || f.nutrition < 60 || f.tag === 'boisson') continue;
    const take = Math.min(q, n);
    s.pantry[id] = q - take;
    if (s.pantry[id] <= 0) delete s.pantry[id];
    n -= take;
    if (n <= 0) break;
  }
}

export function visibleActions(s: GameState): ActionDef[] {
  return ACTIONS.filter((a) => {
    if (a.id === 'train_goalkeeping') return s.identity.position === 'GK' || s.identity.secondaryPosition === 'GK';
    if (a.id === 'private_coach') return s.identity.background === 'wealthy' || s.money >= 35;
    if (a.id === 'physio') return !!s.player.injury;
    if (a.id === 'restaurant') return ageAt(s) >= 15;
    if (a.id === 'cook') return ageAt(s) >= 12;
    return true;
  });
}

/** Exécute une action si elle est autorisée. Retourne le message de résultat ou une erreur. */
export function performAction(s: GameState, id: string): { ok: boolean; message: string } {
  const a = ACTIONS.find((x) => x.id === id);
  if (!a) return { ok: false, message: 'Action inconnue' };
  if (!s.prologue.done) return { ok: false, message: 'Termine d’abord le prologue.' };
  if (s.slots.left < a.cost) return { ok: false, message: 'Plus de temps libre cette semaine.' };
  const reason = a.unavailable(s);
  if (reason) return { ok: false, message: reason };
  s.slots.left -= a.cost;
  s.weekLog.push(a.id);
  s.events.flags[`done_${a.id}`] = (s.events.flags[`done_${a.id}`] ?? 0) + 1;
  if (a.id.startsWith('train_') || a.id === 'private_coach') s.events.flags.done_train = (s.events.flags.done_train ?? 0) + 1;
  const message = a.run(s);
  return { ok: true, message };
}

export function doAdminTask(s: GameState, taskId: string): { ok: boolean; message: string } {
  const task = s.admin.find((a) => a.id === taskId && !a.done);
  if (!task) return { ok: false, message: 'Démarche introuvable' };
  if (s.slots.left < 1) return { ok: false, message: 'Plus de temps libre cette semaine.' };
  s.slots.left -= 1;
  task.done = true;
  if (task.id.startsWith('adm_licence')) addMoney(s, -25, 'admin', 'Licence fédérale');
  if (task.id.startsWith('adm_passport')) addMoney(s, -30, 'admin', 'Passeport');
  journal(s, `Démarche effectuée : ${task.label}.`, '📄');
  return { ok: true, message: `C’est réglé : ${task.label}.` };
}

export { TRAIN_INFO, isHolidays };
