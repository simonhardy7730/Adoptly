import { describe, expect, it } from 'vitest';
import { newGame } from './helpers';
import { joinClub, setupLeagueMatch, updateSquadStatus } from '../career';
import { coachVerdict, matchPlan, meetCoach, styleFit } from '../coach';
import { inflictInjury, injuryRisk, weeklyHeal, setTreatment, updateLoad } from '../injuries';
import { applyTraining } from '../stats';
import { npcByRole } from '../helpers';
import { migrate, SAVE_VERSION } from '../save';
import type { GameState } from '../types';

function clubGame(seed = 3): GameState {
  const s = newGame(seed);
  s.events.pending = [];
  joinClub(s, s.clubs.find((c) => c.tier === 2)!, 'rotation');
  s.t = 48 * 3 + 5;
  return s;
}

describe('Entraîneur', () => {
  it('a un profil, décide du système et donne une consigne adaptée au poste', () => {
    const s = clubGame();
    const c = s.membership!.coach;
    expect(['offensif', 'equilibre', 'defensif', 'pressing', 'possession']).toContain(c.style);
    expect(npcByRole(s, 'coach')!.name).toBe(c.name);
    const m = setupLeagueMatch(s)!;
    const plan = matchPlan(s, m);
    expect(plan.formation).toBe(c.formation);
    expect(plan.instruction).not.toBeNull();
    s.identity.position = 'GK';
    expect(['short_build', 'hold_line']).toContain(matchPlan(s, m).instruction);
  });

  it('un entretien coûte une action, a un délai et produit un effet réel', () => {
    const s = clubGame(4);
    const slots = s.slots.left;
    const r = meetCoach(s, 'advice');
    expect(r.ok).toBe(true);
    expect(s.slots.left).toBe(slots - 1);
    const focus = s.membership!.coach.focus!;
    expect(focus.until).toBe(s.t + 8);
    expect(meetCoach(s, 'advice').ok).toBe(false); // délai
    // l'axe de travail accélère la progression de cet attribut
    const a = structuredClone(s);
    const b = structuredClone(s);
    b.membership!.coach.focus = null;
    const split = { technique: 'technique', dribbling: 'technique', passing: 'technique', shooting: 'finishing', defending: 'defense', speed: 'physical', stamina: 'physical', strength: 'physical', tactics: 'tactical', vision: 'tactical', mental: 'mental', discipline: 'mental', reflexes: 'goalkeeping' } as const;
    const ga = applyTraining(a, split[focus.attr], 1)[focus.attr]!;
    const gb = applyTraining(b, split[focus.attr], 1)[focus.attr]!;
    expect(ga).toBeGreaterThan(gb);
  });

  it('ignorer la consigne d’un coach exigeant fait baisser sa confiance', () => {
    const s = clubGame(5);
    s.membership!.coach.temperament = 'exigeant';
    const m = setupLeagueMatch(s)!;
    m.entersAt = 0;
    m.rating = 6.4;
    m.meta = { ...m.meta, followed: 0, instruction: 'press' };
    const before = npcByRole(s, 'coach')!.relation;
    expect(coachVerdict(s, m)).toMatch(/consignes|ce que je voulais/);
    expect(npcByRole(s, 'coach')!.relation).toBeLessThan(before);
    const s2 = clubGame(5);
    const m2 = setupLeagueMatch(s2)!;
    m2.entersAt = 0; m2.rating = 6.4; m2.meta = { ...m2.meta, followed: 1, instruction: 'press' };
    const b2 = npcByRole(s2, 'coach')!.relation;
    coachVerdict(s2, m2);
    expect(npcByRole(s2, 'coach')!.relation).toBeGreaterThan(b2);
  });

  it('le statut dépend aussi de l’adéquation au style du coach', () => {
    const s = clubGame(6);
    const c = s.membership!.coach;
    const good = structuredClone(s);
    const bad = structuredClone(s);
    for (const k of c.values) { good.player.attrs[k] += 15; bad.player.attrs[k] -= 15; }
    expect(styleFit(good, c)).toBeGreaterThan(styleFit(bad, c));
    updateSquadStatus(good);
    updateSquadStatus(bad);
    const rank = { bench: 0, rotation: 1, starter: 2 };
    expect(rank[good.membership!.status]).toBeGreaterThanOrEqual(rank[bad.membership!.status]);
  });
});

describe('Blessures', () => {
  it('le risque augmente avec la fatigue, la charge et un retour récent', () => {
    const s = newGame(7);
    s.events.pending = [];
    s.player.energy = 90; s.player.load = 30;
    const base = injuryRisk(s, 'match').p;
    s.player.energy = 20; s.player.load = 90; s.player.returnUntil = s.t + 2;
    const r = injuryRisk(s, 'match');
    expect(r.p).toBeGreaterThan(base * 4);
    expect(r.factors.map((f) => f.label)).toEqual(expect.arrayContaining(['Épuisement', 'Surcharge de travail', 'Retour de blessure récent']));
  });

  it('une blessure passe par le repos, la rééducation, puis la guérison avec historique', () => {
    const s = newGame(8);
    s.events.pending = [];
    const inj = inflictInjury(s, 'ankle_sprain', 'test')!;
    expect(inj.phase).toBe('repos');
    expect(s.events.pending.some((e) => e.eventId === 'injury_diagnosis')).toBe(true);
    let phases = new Set<string>();
    for (let i = 0; i < 20 && s.player.injury; i++) { weeklyHeal(s); if (s.player.injury) phases.add(s.player.injury.phase!); s.t++; }
    expect(phases.has('rééducation')).toBe(true);
    expect(s.player.injury).toBeNull();
    expect(s.player.injuryHistory[0].id).toBe('ankle_sprain');
    expect(s.player.returnUntil).toBeGreaterThanOrEqual(s.t - 1);
  });

  it('un retour accéléré guérit plus vite chaque semaine (au prix d’un risque de rechute)', () => {
    const afterOneWeek = (tr: 'standard' | 'rushed' | 'specialist') => {
      const s = newGame(9);
      s.events.pending = [];
      inflictInjury(s, 'hamstring_tear', 'test');
      s.player.injury!.weeksLeft = 6; s.player.injury!.weeksTotal = 6;
      setTreatment(s, tr);
      weeklyHeal(s);
      return s.player.injury!.weeksLeft;
    };
    expect(afterOneWeek('rushed')).toBeLessThan(afterOneWeek('specialist'));
    expect(afterOneWeek('specialist')).toBeLessThan(afterOneWeek('standard'));
  });

  it('la charge de travail suit l’activité de la semaine', () => {
    const s = newGame(10);
    s.player.load = 30;
    updateLoad(s, 5, 90, true);
    expect(s.player.load).toBeGreaterThan(50);
    for (let i = 0; i < 6; i++) updateLoad(s, 0, 0, false);
    expect(s.player.load).toBeLessThan(10);
  });

  it('migration v2 → v3 : profil d’entraîneur et données médicales ajoutés', () => {
    const s: any = structuredClone(clubGame(11));
    s.version = 2;
    delete s.membership.coach;
    delete s.player.injuryHistory; delete s.player.load; delete s.player.returnUntil;
    const m = migrate(s);
    expect(m.version).toBe(SAVE_VERSION);
    expect(m.membership!.coach.name).toBe(s.membership.coachId);
    expect(m.player.injuryHistory).toEqual([]);
    expect(m.player.load).toBe(30);
  });
});
