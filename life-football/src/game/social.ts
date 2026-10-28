// Réseau social fictif « Tribune » : publications occasionnelles, abonnés, image publique.

import type { GameState, SocialPost } from './types';
import { ageAt } from './calendar';
import { applyRep, journal } from './helpers';
import { activeContracts } from './sponsors';
import { brand } from '../content/brands';
import { chance, clamp, nextFloat, uid } from './rng';

export const SOCIAL_MIN_AGE = 13;
export const MAX_POSTS_PER_WEEK = 2;

export interface PostTemplate {
  kind: SocialPost['kind'];
  label: string;
  icon: string;
  tones: { id: string; label: string; text: string; sentiment: number; risk: number }[];
  available: (s: GameState) => string | null;
}

export const POST_TEMPLATES: PostTemplate[] = [
  {
    kind: 'training', label: 'Séance d’entraînement', icon: '💪',
    tones: [
      { id: 'humble', label: 'Humble', text: 'Le travail paie toujours. On continue. 💪', sentiment: 0.5, risk: 0 },
      { id: 'fun', label: 'Décalé', text: 'Le coach a dit « encore un sprint »… ça fait 12. 😅', sentiment: 0.6, risk: 0.02 },
    ],
    available: () => null,
  },
  {
    kind: 'match', label: 'Après le dernier match', icon: '⚽',
    tones: [
      { id: 'team', label: 'Collectif', text: 'Fier de ce groupe. On avance ensemble. 🙌', sentiment: 0.6, risk: 0 },
      { id: 'confident', label: 'Confiant', text: 'Ce n’est que le début. Retenez bien mon nom. 🔥', sentiment: 0.2, risk: 0.18 },
      { id: 'critical', label: 'Autocritique', text: 'Pas à mon niveau aujourd’hui. Je vais me rattraper.', sentiment: 0.4, risk: 0.02 },
    ],
    available: (s) => (s.recentRatings.length ? null : 'Joue d’abord un match officiel'),
  },
  {
    kind: 'life', label: 'Vie perso', icon: '📸',
    tones: [
      { id: 'family', label: 'En famille', text: 'Rien ne vaut un dimanche en famille. ❤️', sentiment: 0.7, risk: 0 },
      { id: 'night', label: 'Soirée entre amis', text: 'Petite soirée avec la team ce soir 🎉', sentiment: 0.1, risk: 0.2 },
    ],
    available: () => null,
  },
  {
    kind: 'charity', label: 'Action solidaire', icon: '🤲',
    tones: [{ id: 'sincere', label: 'Sincère', text: 'Belle journée avec les enfants de l’association du quartier. Merci à eux !', sentiment: 0.9, risk: 0 }],
    available: (s) => (s.events.flags.charity_done ? null : 'Participe d’abord à une action solidaire (événement)'),
  },
  {
    kind: 'sponsor', label: 'Publication partenaire', icon: '🏷️',
    tones: [
      { id: 'natural', label: 'Naturelle', text: 'Mes nouvelles armes pour la saison. Merci {brand} 🙏', sentiment: 0.3, risk: 0.03 },
      { id: 'ad', label: 'Très promotionnelle', text: '-20% avec mon code chez {brand} !!! 🔥🔥', sentiment: -0.1, risk: 0.08 },
    ],
    available: (s) => (activeContracts(s).some((c) => c.terms.postsPerMonth > 0) ? null : 'Aucun contrat avec obligations de publication'),
  },
];

export function socialLocked(s: GameState): string | null {
  if (ageAt(s) < SOCIAL_MIN_AGE) return `Tes parents t’autorisent les réseaux à partir de ${SOCIAL_MIN_AGE} ans.`;
  return null;
}

export function publish(s: GameState, kind: SocialPost['kind'], toneId: string, brandId?: string): { ok: boolean; message: string } {
  const locked = socialLocked(s);
  if (locked) return { ok: false, message: locked };
  if (s.social.postsThisWeek >= MAX_POSTS_PER_WEEK) return { ok: false, message: 'Tu as déjà publié deux fois cette semaine. Ne lasse pas ta communauté !' };
  const tpl = POST_TEMPLATES.find((p) => p.kind === kind);
  const tone = tpl?.tones.find((t) => t.id === toneId);
  if (!tpl || !tone) return { ok: false, message: 'Publication invalide.' };
  const reason = tpl.available(s);
  if (reason) return { ok: false, message: reason };
  let contract = undefined as ReturnType<typeof activeContracts>[number] | undefined;
  if (kind === 'sponsor') {
    contract = activeContracts(s).find((c) => (brandId ? c.brandId === brandId : c.terms.postsPerMonth > 0));
    if (!contract) return { ok: false, message: 'Aucun partenaire à mettre en avant.' };
  }
  const r = s.reputation;
  const reach = 20 + r.followers * 0.08 + r.popularity * 3;
  const likes = Math.round(reach * (0.6 + nextFloat(s) * 0.8) * (1 + tone.sentiment * 0.4));
  const text = tone.text.replace('{brand}', contract ? brand(contract.brandId).name : '');
  const post: SocialPost = { id: uid(s, 'post'), t: s.t, kind, text, likes, sentiment: tone.sentiment, brandId: contract?.brandId };
  s.social.posts.unshift(post);
  if (s.social.posts.length > 80) s.social.posts.length = 80;
  s.social.postsThisWeek += 1;
  const growth = Math.round((5 + r.popularity * 1.5 + r.followers * 0.01) * (0.7 + tone.sentiment * 0.5) * (0.7 + nextFloat(s) * 0.6));
  applyRep(s, { followers: Math.max(1, growth), popularity: 0.3 + tone.sentiment * 0.4, media: 0.3, fanImage: tone.sentiment * 0.8 });
  if (contract) {
    contract.postsThisMonth += 1;
    applyRep(s, { sponsorCred: 0.8 });
  }
  if (chance(s, tone.risk)) {
    applyRep(s, { fanImage: -4, sponsorCred: -2, media: 3 });
    s.events.pending.push({ eventId: 'controversy', data: { post: text } });
    return { ok: true, message: 'Ta publication fait réagir… et pas seulement positivement.' };
  }
  return { ok: true, message: `Publié ! ${likes} mentions « j’aime », +${Math.max(1, growth)} abonnés.` };
}

/** Évolution passive des abonnés en fonction de la popularité. */
export function weeklySocial(s: GameState) {
  s.social.postsThisWeek = 0;
  if (socialLocked(s)) return;
  if (!s.social.unlocked) {
    s.social.unlocked = true;
    journal(s, 'Tu crées ton compte sur Tribune, le réseau des sportifs.', '📱', true);
    s.reputation.followers = Math.max(s.reputation.followers, Math.round(10 + s.reputation.popularity * 5));
  }
  const r = s.reputation;
  r.followers = Math.max(0, Math.round(r.followers + r.popularity * 0.6 * (0.5 + nextFloat(s))));
  // Sans actualité, la présence médiatique retombe doucement.
  r.media = clamp(r.media - 0.3);
}
