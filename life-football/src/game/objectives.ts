// Objectifs dynamiques : ils évoluent avec l'âge et la situation du joueur.
import type { GameState } from './types';
import { ageAt } from './calendar';
import { currentClub } from './career';
import { totalCaps } from './national';
import { activeContracts } from './sponsors';

export interface Objective { label: string; progress: number; done: boolean; hint: string }

export function objectives(s: GameState): Objective[] {
  const out: Objective[] = [];
  const club = currentClub(s);
  const age = ageAt(s);
  const caps = totalCaps(s);
  if (!club) {
    out.push({ label: 'Décrocher une place dans un club', progress: s.tryouts.some((t) => t.status === 'accepted') ? 0.5 : s.tryouts.length ? 0.25 : 0, done: false, hint: 'Brille en match de quartier pour être repéré, puis réussis une détection.' });
  } else {
    out.push({ label: 'Devenir titulaire', progress: s.membership!.status === 'starter' ? 1 : s.membership!.status === 'rotation' ? 0.5 : 0.15, done: s.membership!.status === 'starter', hint: 'Niveau, relation avec l’entraîneur et notes en match comptent.' });
    if (club.tier < 3) out.push({ label: 'Intégrer un centre de formation pro', progress: club.tier / 3, done: false, hint: 'Les recruteurs viennent voir les meilleurs joueurs des clubs formateurs.' });
    else if (club.tier < 4) out.push({ label: 'Rejoindre un grand centre de formation', progress: 0.75, done: false, hint: 'Réputation sportive et grosses performances attirent les meilleurs clubs.' });
  }
  if (age >= 12) out.push({ label: 'Première sélection nationale', progress: caps.youth + caps.senior > 0 ? 1 : Math.min(0.9, s.reputation.sport / 60), done: caps.youth + caps.senior > 0, hint: 'Les sélectionneurs regardent le niveau, la réputation et le club.' });
  if (age < 18) out.push({ label: 'Garder la moyenne à l’école (≥ 10)', progress: Math.min(1, s.player.school.grade / 10), done: s.player.school.grade >= 10, hint: 'Les parents et les centres de formation y tiennent.' });
  if (age >= 10) out.push({ label: 'Signer un premier sponsor', progress: s.sponsors.contracts.length ? 1 : Math.min(0.9, (s.reputation.popularity + s.reputation.sport) / 40), done: s.sponsors.contracts.length > 0, hint: 'Popularité et performances attirent les marques, d’abord locales.' });
  if (activeContracts(s).length) out.push({ label: 'Respecter tes obligations de sponsor', progress: s.reputation.sponsorCred / 100, done: s.reputation.sponsorCred >= 60, hint: 'Publications et présences prévues au contrat.' });
  return out.slice(0, 5);
}
