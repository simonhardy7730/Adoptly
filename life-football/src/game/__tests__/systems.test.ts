import { describe, expect, it } from 'vitest';
import { newGame, botWeek, resolveAllEvents } from './helpers';
import { completeTryout, inviteTryout, answerTryout, evaluateTryout, joinClub, standings } from '../career';
import { createMatch, kickOff, advance, resolveMoment, quickSim } from '../match';
import { autoPlay, createMatchFor } from '../flow';
import { baseTerms, negotiateSponsor, signSponsor } from '../sponsors';
import { brand } from '../../content/brands';
import { applyNationalResult, createCallup, answerCallup } from '../national';
import { eligibleNations } from '../eligibility';
import { getEvent, isEligible, resolveEvent, currentEvent } from '../events';
import { publish } from '../social';
import type { GameState } from '../types';

function withClub(seed = 9, tier: 1 | 2 | 3 | 4 = 2): GameState {
  const s = newGame(seed);
  resolveAllEvents(s);
  joinClub(s, s.clubs.find((c) => c.tier === tier)!, 'starter');
  return s;
}

describe('Détections', () => {
  it('les résultats des mini-jeux influencent réellement l’évaluation', () => {
    const s = newGame(21);
    const club = s.clubs.find((c) => c.tier === 2)!;
    const t = inviteTryout(s, club.id, 0);
    answerTryout(s, t.id, true);
    const good = evaluateTryout(structuredClone(s), t, { pass: 95, dribble: 92, decision: 94 });
    const bad = evaluateTryout(structuredClone(s), t, { pass: 10, dribble: 15, decision: 12 });
    expect(good.total).toBeGreaterThan(bad.total + 30);
    expect(good.outcome).toBe('offer');
    expect(bad.outcome).not.toBe('offer');
  });
  it('un échec ne termine pas la partie : seconde chance ou refus, puis la vie continue', () => {
    const s = newGame(22);
    const club = s.clubs.find((c) => c.tier === 4)!;
    const t = inviteTryout(s, club.id, 0);
    answerTryout(s, t.id, true);
    const res = completeTryout(s, t.id, { pass: 5, dribble: 5, decision: 5 });
    expect(res.outcome).not.toBe('offer');
    expect(s.membership).toBeNull();
    for (let i = 0; i < 4; i++) botWeek(s);
    expect(s.t).toBe(4);
  });
  it('une offre acceptée fait rejoindre le club avec un championnat cohérent', () => {
    const s = withClub();
    expect(s.membership).not.toBeNull();
    expect(s.membership!.league.length).toBe(10);
    expect(s.membership!.fixtures.length).toBe(18);
    for (const round of s.membership!.fixtures) expect(new Set(round.flat()).size).toBe(10);
  });
});

describe('Matchs', () => {
  it('produit des scores réalistes et des notes bornées', () => {
    let goals = 0;
    for (let i = 0; i < 400; i++) {
      const [a, b] = quickSim({ rng: i * 7 + 1 }, 40, 40);
      goals += a + b;
    }
    expect(goals / 400).toBeGreaterThan(1.8);
    expect(goals / 400).toBeLessThan(4.2);
    const s = withClub(4);
    for (let i = 0; i < 30; i++) {
      const m = createMatchFor(s, 'street')!;
      autoPlay(s, m);
      expect(m.status).toBe('done');
      expect(m.rating!).toBeGreaterThanOrEqual(3);
      expect(m.rating!).toBeLessThanOrEqual(10);
      s.player.energy = 90;
      s.player.injury = null;
    }
  });
  it('les compétences changent les chances de réussite', () => {
    const s = withClub(5);
    const weak = structuredClone(s);
    const strong = structuredClone(s);
    for (const k of Object.keys(strong.player.attrs) as (keyof typeof s.player.attrs)[]) strong.player.attrs[k] = 70;
    for (const k of Object.keys(weak.player.attrs) as (keyof typeof s.player.attrs)[]) weak.player.attrs[k] = 15;
    const mk = (st: GameState) => {
      const m = createMatch(st, { kind: 'league', competition: 't', importance: 1, my: { name: 'A', short: 'A', strength: 35, colors: ['#000', '#fff'] }, opp: { name: 'B', short: 'B', strength: 35, colors: ['#fff', '#000'] }, home: true, squadStatus: 'starter' });
      kickOff(st, m, st, 'focused', 'normal');
      advance(st, m, st);
      return m;
    };
    const mw = mk(weak);
    const ms = mk(strong);
    expect(ms.moments[0].options[0].chance!).toBeGreaterThan(mw.moments[0].options[0].chance!);
    resolveMoment(strong, ms, strong, ms.moments[0].options[0].id);
    expect(ms.moments[0].resolved).toBeDefined();
  });
  it('le championnat avance avec les journées et reste cohérent', () => {
    const s = withClub(6);
    for (let i = 0; i < 48; i++) botWeek(s);
    const table = standings(s.membership?.league ?? []);
    if (s.membership) for (const t of table) expect(t.w + t.d + t.l).toBe(t.played);
  });
});

describe('Sponsors', () => {
  function sponsorGame() {
    const s = withClub(12, 3);
    s.t = 48 * 6; // ~15 ans
    s.reputation.popularity = 50;
    s.reputation.sport = 50;
    return s;
  }
  it('négociation : demande raisonnable acceptée, demande excessive rejetée', () => {
    const s = sponsorGame();
    const b = brand('vexa');
    const terms = baseTerms(s, b, 50);
    s.sponsors.offers.push({ id: 'o1', brandId: b.id, week: s.t, expires: s.t + 4, terms: { ...terms }, original: { ...terms }, roundsLeft: 2, status: 'pending', isRenewal: false });
    const ok = negotiateSponsor(s, 'o1', { ...terms, monthly: Math.round(terms.monthly * 1.05) });
    expect(ok.outcome).toBe('accepted');
    s.sponsors.offers.push({ id: 'o2', brandId: b.id, week: s.t, expires: s.t + 4, terms: { ...terms }, original: { ...terms }, roundsLeft: 2, status: 'pending', isRenewal: false });
    const ko = negotiateSponsor(s, 'o2', { ...terms, monthly: terms.monthly * 5 });
    expect(ko.outcome).toBe('withdrawn');
  });
  it('exclusivité : signer un équipementier concurrent coûte une pénalité', () => {
    const s = sponsorGame();
    const a = brand('vexa');
    const b = brand('kalto');
    const ta = baseTerms(s, a, 50);
    const tb = baseTerms(s, b, 50);
    s.sponsors.offers.push({ id: 'a', brandId: a.id, week: s.t, expires: s.t + 4, terms: ta, original: ta, roundsLeft: 2, status: 'pending', isRenewal: false });
    signSponsor(s, 'a');
    expect(s.player.boots.sponsored).toBe(true);
    const money = s.money;
    s.sponsors.offers.push({ id: 'b', brandId: b.id, week: s.t, expires: s.t + 4, terms: tb, original: tb, roundsLeft: 2, status: 'pending', isRenewal: false });
    signSponsor(s, 'b');
    expect(s.money).toBe(money - ta.penalty);
    expect(s.sponsors.contracts.filter((c) => c.active).length).toBe(1);
  });
  it('les montants d’un jeune joueur restent modestes', () => {
    const s = newGame(1);
    const t = baseTerms(s, brand('local_bakery'), 10);
    expect(t.monthly).toBeLessThan(40);
  });
});

describe('Sélections et éligibilité', () => {
  it('verrouille le choix après un match officiel senior', () => {
    const s = withClub(13, 4);
    s.identity.secondNationality = 'SN';
    s.identity.parentOrigin = 'SN';
    s.t = 48 * 9;
    expect(eligibleNations(s)).toEqual(['FR', 'SN']);
    const cu = createCallup(s, 'SN', true);
    cu.official = true;
    answerCallup(s, true);
    s.t = cu.week;
    const m = createMatchFor(s, 'national')!;
    m.squadStatus = 'starter';
    m.entersAt = 0;
    autoPlay(s, m);
    expect(s.national.committedTo).toBe('SN');
    expect(eligibleNations(s)).toEqual(['SN']);
  });
  it('les matchs de jeunes ne verrouillent pas', () => {
    const s = withClub(14, 4);
    s.identity.secondNationality = 'SN';
    s.identity.parentOrigin = 'SN';
    s.t = 48 * 5;
    const cu = createCallup(s, 'FR', false);
    answerCallup(s, true);
    s.t = cu.week;
    const m = createMatchFor(s, 'national')!;
    m.entersAt = 0;
    autoPlay(s, m);
    expect(s.national.committedTo).toBeNull();
    applyNationalResult(s, m);
  });
});

describe('Événements', () => {
  it('respectent leurs conditions', () => {
    const s = newGame(30);
    expect(isEligible(s, getEvent('first_crush')!)).toBe(false); // trop jeune
    s.t = 48 * 6;
    expect(isEligible(s, getEvent('first_crush')!)).toBe(true);
    s.events.history.unshift({ id: 'first_crush', t: s.t });
    expect(isEligible(s, getEvent('first_crush')!)).toBe(false); // unique
    expect(isEligible(s, getEvent('coach_extra')!)).toBe(false); // sans club
  });
  it('un choix applique ses effets', () => {
    const s = newGame(31);
    expect(currentEvent(s)?.event.id).toBe('intro_street');
    const before = s.player.school.grade;
    resolveEvent(s, 'home');
    expect(s.player.school.grade).toBeGreaterThan(before);
    expect(s.events.pending.length).toBe(0);
  });
});

describe('Réseau social', () => {
  it('est verrouillé avant 13 ans puis limité à deux publications par semaine', () => {
    const s = newGame(40);
    expect(publish(s, 'training', 'humble').ok).toBe(false);
    s.t = 48 * 5;
    s.social.unlocked = true;
    expect(publish(s, 'training', 'humble').ok).toBe(true);
    expect(publish(s, 'life', 'family').ok).toBe(true);
    expect(publish(s, 'training', 'fun').ok).toBe(false);
    expect(s.reputation.followers).toBeGreaterThan(0);
  });
});

describe('Progression', () => {
  it('un attribut sur-entraîné reste plafonné par l’âge et le potentiel', async () => {
    const { applyTraining, potentialCap } = await import('../stats');
    const s = newGame(77);
    for (let i = 0; i < 300; i++) { s.player.energy = 90; applyTraining(s, 'technique', 1); }
    expect(s.player.attrs.technique).toBeLessThan(potentialCap(s.player.potential, 9) + 18);
  });
});
