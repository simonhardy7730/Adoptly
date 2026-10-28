// Sponsors : génération d'offres, négociation, obligations contractuelles, paiements.

import type { GameState, SponsorContract, SponsorOffer, SponsorTerms } from './types';
import { BRANDS, brand, type Brand } from '../content/brands';
import { ageAt } from './calendar';
import { addMoney, applyRep, changeRelation, journal, notify } from './helpers';
import { chance, clamp, nextFloat, pick, uid } from './rng';
import { country } from '../content/countries';
import { currentClub } from './career';

/** Visibilité commerciale : popularité, réputation sportive, crédibilité, médias, forme récente. */
export function visibility(s: GameState): number {
  const r = s.reputation;
  const recent = s.recentRatings.length ? s.recentRatings.reduce((a, b) => a + b, 0) / s.recentRatings.length : 6;
  const mania = country(s.identity.nationality).mania / 100;
  const club = currentClub(s);
  return clamp(r.popularity * 0.4 + r.sport * 0.3 + r.media * 0.1 + (r.sponsorCred - 40) * 0.15 + (recent - 6.3) * 3 + (club ? club.tier * 2 : 0)) * (0.85 + mania * 0.25);
}

export function activeContracts(s: GameState) {
  return s.sponsors.contracts.filter((c) => c.active);
}

/** Une marque concurrente bloque-t-elle la signature (exclusivité) ? */
export function exclusivityConflict(s: GameState, b: Brand): SponsorContract | undefined {
  return activeContracts(s).find((c) => {
    const cb = brand(c.brandId);
    return cb.category === b.category && cb.id !== b.id && (c.terms.exclusive || b.category === 'equipment');
  });
}

export function baseTerms(s: GameState, b: Brand, vis: number): SponsorTerms {
  const age = ageAt(s);
  const minor = age < 18;
  // Montants de base par niveau de marque, modulés par la visibilité ; réduits pour les mineurs.
  const tierBase = [0, 30, 110, 380, 1400][b.tier];
  let monthly = b.local ? 10 + vis * 0.4 : tierBase * Math.pow(0.5 + vis / 100, 2);
  if (minor && !b.local) monthly *= age < 16 ? 0.25 : 0.4;
  monthly = Math.round(monthly / 5) * 5;
  return {
    monthly: Math.max(10, monthly),
    months: b.local ? 6 : b.category === 'equipment' ? 24 : 12,
    bonusPerGoal: b.local ? 5 : Math.round(monthly * 0.08),
    bonusPerCap: b.local ? 0 : Math.round(monthly * 0.3),
    postsPerMonth: age < 13 ? 0 : b.local ? 1 : b.tier >= 3 ? 3 : 2,
    appearancesPerYear: b.local ? 1 : b.tier,
    exclusive: b.category === 'equipment' || b.tier >= 3,
    penalty: Math.round(monthly * (b.tier >= 3 ? 3 : 1.5)),
    renewalMinRep: Math.round(b.minVisibility),
    freeBoots: b.category === 'equipment',
  };
}

/** Génère d'éventuelles offres (appelé en fin de mois). */
export function generateSponsorOffers(s: GameState) {
  const age = ageAt(s);
  const vis = visibility(s);
  const pending = s.sponsors.offers.filter((o) => o.status === 'pending').length;
  if (pending >= 2) return;
  // Nombre de partenariats simultanés limité par la notoriété.
  const maxContracts = 1 + Math.floor(s.reputation.popularity / 25);
  if (activeContracts(s).length >= maxContracts) return;
  const candidates = BRANDS.filter((b) => {
    if (b.minAge > age) return false;
    if (vis < b.minVisibility) return false;
    if (activeContracts(s).some((c) => c.brandId === b.id || brand(c.brandId).category === b.category)) return false;
    // Une marque dont le contrat s'est terminé ne revient que via un renouvellement.
    if (s.sponsors.contracts.some((c) => c.brandId === b.id && !c.active && c.end > s.t - 96)) return false;
    if (s.sponsors.offers.some((o) => o.brandId === b.id && (o.status === 'pending' || (o.week > s.t - 24 && o.status !== 'expired')))) return false;
    // Une polémique récente refroidit les grandes marques.
    if (b.tier >= 3 && s.reputation.sponsorCred < 35) return false;
    return true;
  });
  if (!candidates.length) return;
  if (!chance(s, 0.15 + vis / 250)) return;
  const b = pick(s, candidates.sort((x, y) => y.tier - x.tier).slice(0, 4));
  const terms = baseTerms(s, b, vis);
  const offer: SponsorOffer = { id: uid(s, 'sp'), brandId: b.id, week: s.t, expires: s.t + 4, terms: { ...terms }, original: { ...terms }, roundsLeft: 2, status: 'pending', isRenewal: false };
  s.sponsors.offers.push(offer);
  notify(s, 'sponsor', 'Proposition de partenariat', `${b.name} souhaite s’associer à ton image.`);
  journal(s, `Première approche de ${b.name}.`, '🤝');
}

/** Valeur d'un contrat pour la marque (montants + contreparties obtenues). */
export function contractValue(t: SponsorTerms): number {
  return t.monthly * t.months + t.bonusPerGoal * 6 + t.bonusPerCap * 2 - t.postsPerMonth * t.monthly * 0.12 * t.months - t.appearancesPerYear * t.monthly * 0.25 - (t.exclusive ? 0 : t.monthly * 1.5);
}

export interface NegotiationResult {
  outcome: 'accepted' | 'counter' | 'refused' | 'withdrawn';
  message: string;
}

/**
 * Le joueur fait une contre-proposition. La marque accepte si la demande reste dans sa marge,
 * fait une contre-offre si l'écart est raisonnable, ou se retire si la demande est excessive.
 */
export function negotiateSponsor(s: GameState, offerId: string, ask: SponsorTerms): NegotiationResult {
  const o = s.sponsors.offers.find((x) => x.id === offerId);
  if (!o || o.status !== 'pending') return { outcome: 'refused', message: 'Offre indisponible.' };
  const b = brand(o.brandId);
  const competing = s.sponsors.offers.some((x) => x.id !== o.id && x.status === 'pending' && brand(x.brandId).category === b.category);
  const flex = b.flex + (competing ? 0.08 : 0) + (s.reputation.sponsorCred - 50) / 500;
  // Côté marque : ce qu'elle paie moins les contreparties reçues.
  const cost = (t: SponsorTerms) => t.monthly * t.months * (1 - t.postsPerMonth * 0.07 - t.appearancesPerYear * 0.03) * (t.exclusive ? 1 : 1.15) + t.bonusPerGoal * 8;
  const ratio = cost(ask) / Math.max(1, cost(o.original));
  // Durée : une marque n'aime pas les contrats trop courts.
  const durationPenalty = ask.months < o.original.months ? (o.original.months - ask.months) / o.original.months * 0.15 : 0;
  const demand = ratio + durationPenalty;
  if (demand <= 1 + flex) {
    o.terms = { ...ask };
    return { outcome: 'accepted', message: `${b.name} accepte tes conditions. Il ne reste plus qu’à signer.` };
  }
  o.roundsLeft -= 1;
  if (demand > 1 + flex * 3 || o.roundsLeft < 0) {
    o.status = 'withdrawn';
    applyRep(s, { sponsorCred: -2 });
    journal(s, `${b.name} met fin aux discussions : demandes jugées excessives.`, '🚫');
    return { outcome: 'withdrawn', message: `${b.name} trouve tes exigences excessives et se retire.` };
  }
  if (nextFloat(s) < 0.15 && o.roundsLeft === 0) {
    o.lastResponse = 'Dernière offre';
    return { outcome: 'refused', message: `${b.name} maintient son offre actuelle : c’est à prendre ou à laisser.` };
  }
  // Contre-proposition : la marque fait la moitié du chemin, dans la limite de sa marge.
  const cap = 1 + flex;
  const mix = (a: number, c: number) => Math.round((a + (c - a) * 0.5) / 5) * 5;
  const counter: SponsorTerms = {
    ...o.terms,
    monthly: Math.min(mix(o.terms.monthly, ask.monthly), Math.round(o.original.monthly * cap / 5) * 5),
    months: Math.round((o.terms.months + ask.months) / 2),
    postsPerMonth: Math.max(ask.postsPerMonth, Math.round((o.terms.postsPerMonth + ask.postsPerMonth) / 2)),
    appearancesPerYear: Math.max(ask.appearancesPerYear, Math.round((o.terms.appearancesPerYear + ask.appearancesPerYear) / 2)),
    bonusPerGoal: Math.round((o.terms.bonusPerGoal + ask.bonusPerGoal) / 2),
  };
  o.terms = counter;
  o.lastResponse = 'Contre-proposition';
  return { outcome: 'counter', message: `${b.name} fait une contre-proposition : ${counter.monthly} €/mois sur ${counter.months} mois, ${counter.postsPerMonth} publication(s)/mois.` };
}

export function signSponsor(s: GameState, offerId: string): string {
  const o = s.sponsors.offers.find((x) => x.id === offerId);
  if (!o || o.status !== 'pending') return 'Offre indisponible.';
  const b = brand(o.brandId);
  const conflict = exclusivityConflict(s, b);
  if (conflict) {
    // Rupture : pénalité contractuelle et perte de crédibilité.
    const old = brand(conflict.brandId);
    addMoney(s, -conflict.terms.penalty, 'penalty', `Rupture du contrat ${old.name}`);
    conflict.active = false;
    conflict.end = s.t;
    applyRep(s, { sponsorCred: -8, media: 2 });
    journal(s, `Rupture du contrat ${old.name} (pénalité ${conflict.terms.penalty} €) pour signer chez ${b.name}.`, '⚠️', true);
  }
  o.status = 'accepted';
  const c: SponsorContract = { id: uid(s, 'ctr'), brandId: b.id, start: s.t, end: s.t + o.terms.months * 4, terms: { ...o.terms }, postsThisMonth: 0, appearancesThisYear: 0, warnings: 0, active: true, earned: 0 };
  s.sponsors.contracts.push(c);
  if (c.terms.freeBoots) {
    s.player.boots = { name: `${b.name} — modèle joueur`, brandId: b.id, quality: b.tier >= 3 ? 3 : 2, wear: 0, sponsored: true };
  }
  applyRep(s, { popularity: b.tier, media: b.tier, sponsorCred: 2 });
  if (ageAt(s) < 18) changeRelation(s, 'parent', 2);
  journal(s, `Contrat signé avec ${b.name} : ${c.terms.monthly} €/mois pendant ${c.terms.months} mois.`, '✍️', true);
  notify(s, 'sponsor', 'Contrat signé', `${b.name} est désormais ton partenaire.${ageAt(s) < 18 ? ' (Contrat cosigné par tes parents.)' : ''}`);
  if (c.terms.postsPerMonth > 0) s.events.scheduled.push({ eventId: 'sponsor_shoot', at: s.t + 3, data: { brand: b.id } });
  return `Contrat signé avec ${b.name} !`;
}

export function declineSponsor(s: GameState, offerId: string) {
  const o = s.sponsors.offers.find((x) => x.id === offerId);
  if (!o || o.status !== 'pending') return;
  o.status = 'declined';
  journal(s, `Offre de ${brand(o.brandId).name} déclinée.`, '✖️');
}

/** Fin de mois : paiements, contrôle des obligations, fins de contrat, renouvellements. */
export function monthlySponsorCycle(s: GameState) {
  for (const c of activeContracts(s)) {
    const b = brand(c.brandId);
    addMoney(s, c.terms.monthly, 'sponsor', `Partenariat ${b.name}`);
    c.earned += c.terms.monthly;
    if (c.terms.postsPerMonth > 0 && c.postsThisMonth < c.terms.postsPerMonth) {
      c.warnings += 1;
      if (c.warnings >= 2) {
        const pen = Math.round(c.terms.penalty / 3);
        addMoney(s, -pen, 'penalty', `Pénalité ${b.name} (publications manquantes)`);
        applyRep(s, { sponsorCred: -4 });
        notify(s, 'warning', 'Pénalité contractuelle', `${b.name} applique une pénalité de ${pen} € : obligations de publication non respectées.`);
      } else {
        applyRep(s, { sponsorCred: -1.5 });
        notify(s, 'warning', 'Rappel de ton sponsor', `${b.name} attendait ${c.terms.postsPerMonth} publication(s) ce mois-ci (${c.postsThisMonth} faite(s)).`);
      }
    } else if (c.terms.postsPerMonth > 0) {
      c.warnings = Math.max(0, c.warnings - 1);
      applyRep(s, { sponsorCred: 0.6 });
    }
    c.postsThisMonth = 0;
    if (c.terms.freeBoots && s.player.boots.wear > 70) {
      s.player.boots = { name: `${b.name} — modèle joueur`, brandId: b.id, quality: b.tier >= 3 ? 3 : 2, wear: 0, sponsored: true };
      notify(s, 'sponsor', 'Nouvelle paire reçue', `${b.name} t’envoie une paire neuve à ton numéro.`);
    }
    if (s.t >= c.end) {
      c.active = false;
      journal(s, `Fin du contrat avec ${b.name} (${Math.round(c.earned)} € perçus).`, '📁', true);
      if (visibility(s) >= c.terms.renewalMinRep && c.warnings === 0 && s.reputation.sponsorCred >= 40) {
        const terms = baseTerms(s, b, visibility(s));
        terms.monthly = Math.max(terms.monthly, Math.round(c.terms.monthly * 1.1 / 5) * 5);
        s.sponsors.offers.push({ id: uid(s, 'sp'), brandId: b.id, week: s.t, expires: s.t + 4, terms: { ...terms }, original: { ...terms }, roundsLeft: 2, status: 'pending', isRenewal: true });
        notify(s, 'sponsor', 'Proposition de renouvellement', `${b.name} souhaite prolonger votre collaboration.`);
      } else {
        notify(s, 'info', 'Contrat non renouvelé', `${b.name} ne prolonge pas le partenariat.`);
      }
    }
  }
  for (const o of s.sponsors.offers) if (o.status === 'pending' && o.expires < s.t) o.status = 'expired';
}

/** Primes de performance des sponsors après un match. */
export function sponsorMatchBonus(s: GameState, goals: number, isCap: boolean) {
  for (const c of activeContracts(s)) {
    const b = brand(c.brandId);
    const amount = goals * c.terms.bonusPerGoal + (isCap ? c.terms.bonusPerCap : 0);
    if (amount > 0) {
      addMoney(s, amount, 'sponsor_bonus', `Prime ${b.name}${isCap ? ' (sélection)' : ''}`);
      c.earned += amount;
    }
  }
}

export function commercialIncome(s: GameState, sinceT = 0) {
  return s.ledger.filter((x) => x.t >= sinceT && (x.category === 'sponsor' || x.category === 'sponsor_bonus')).reduce((a, x) => a + x.amount, 0);
}

export function sportIncome(s: GameState, sinceT = 0) {
  return s.ledger.filter((x) => x.t >= sinceT && (x.category === 'salary' || x.category === 'bonus')).reduce((a, x) => a + x.amount, 0);
}
