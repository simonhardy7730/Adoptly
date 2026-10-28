import { describe, expect, it } from 'vitest';
import { createSim, DT, runToEnd, skipToNextKey, step } from '../sim';
import { careerConfig, demoConfig, resultOf, applySimToMatch, makeTeam } from '../build';
import { newGame } from '../../game/__tests__/helpers';
import { joinClub, setupLeagueMatch, setupStreetMatch } from '../../game/career';
import { concludeMatch } from '../../game/flow';
import type { SimState } from '../types';

function finalState(s: SimState) {
  return JSON.stringify({ score: s.score, ev: s.events.map((e) => [e.type, e.minute, e.player]), ball: s.ball.pos });
}

describe('Moteur 2D : simulation', () => {
  it('donne exactement le même match quelle que soit la façon de l’afficher', () => {
    const a = createSim(demoConfig(77));
    runToEnd(a);
    const b = createSim(demoConfig(77));
    // affichage « par à-coups » : moments forts puis avance rapide
    while (!b.done) { if (!skipToNextKey(b, 20)) for (let i = 0; i < 37 && !b.done; i++) step(b); }
    expect(finalState(b)).toBe(finalState(a));
  });

  it('le ballon ne se téléporte jamais et les joueurs restent près du terrain', () => {
    const s = createSim(demoConfig(5));
    let prev = { ...s.ball.pos };
    let maxJump = 0;
    while (!s.done) {
      step(s);
      maxJump = Math.max(maxJump, Math.hypot(s.ball.pos.x - prev.x, s.ball.pos.y - prev.y));
      prev = { ...s.ball.pos };
      for (const p of s.players.filter((q) => q.onPitch)) {
        expect(Number.isFinite(p.pos.x) && Number.isFinite(p.pos.y)).toBe(true);
        expect(p.pos.x).toBeGreaterThanOrEqual(-3);
        expect(p.pos.x).toBeLessThanOrEqual(s.cfg.pitch.L + 3);
      }
      if (s.ball.owner) expect(s.players.some((p) => p.id === s.ball.owner && p.onPitch && !p.sentOff)).toBe(true);
    }
    expect(maxJump).toBeLessThan(45 * DT * 1.6); // < ~45 m/s
  });

  it('chaque but est précédé d’un tir du buteur ; les statistiques sont cohérentes', () => {
    let goals = 0;
    for (let i = 1; i <= 10; i++) {
      const s = createSim(demoConfig(i * 131));
      runToEnd(s);
      const evs = s.events;
      evs.forEach((e, k) => {
        if (e.type !== 'goal') return;
        goals++;
        const shot = [...evs.slice(0, k)].reverse().find((x) => x.type === 'shot');
        expect(shot?.player).toBe(e.player);
      });
      for (const t of [0, 1] as const) {
        expect(s.stats[t].shotsOn).toBeLessThanOrEqual(s.stats[t].shots);
        expect(s.stats[t].passesOk).toBeLessThanOrEqual(s.stats[t].passes);
        expect(s.score[t]).toBeLessThanOrEqual(s.stats[t].shotsOn);
      }
      expect(evs[evs.length - 1].type).toBe('fulltime');
      expect(s.half).toBe(2);
    }
    expect(goals / 10).toBeGreaterThan(0.8);
    expect(goals / 10).toBeLessThan(5);
  }, 30000);

  it('équité : à niveau égal, aucune équipe n’est avantagée par son côté', () => {
    const sh = [0, 0];
    for (let i = 1; i <= 8; i++) {
      const c = demoConfig(i * 17);
      const h = { rng: i };
      const tac = { mentality: 'balanced' as const, pressing: 0.5, width: 0.6 };
      c.teams = [makeTeam(h, { name: 'A', short: 'A', colors: ['#fff', '#000'], formation: '4-3-3', level: 60, country: 'FR', prefix: 'h', tactic: tac }), makeTeam(h, { name: 'B', short: 'B', colors: ['#000', '#fff'], formation: '4-3-3', level: 60, country: 'FR', prefix: 'a', tactic: tac })];
      const s = createSim(c);
      runToEnd(s);
      sh[0] += s.stats[0].shots; sh[1] += s.stats[1].shots;
    }
    expect(Math.abs(sh[0] - sh[1])).toBeLessThan((sh[0] + sh[1]) * 0.35);
  }, 30000);
});

describe('Moteur 2D : décisions des entraîneurs', () => {
  it('les coachs font des remplacements et adaptent leur tactique au score', () => {
    let subs = 0, tacticChanges = 0;
    for (let i = 1; i <= 6; i++) {
      const s = createSim(demoConfig(i * 59));
      runToEnd(s);
      subs += s.subs[0] + s.subs[1];
      tacticChanges += s.events.filter((e) => e.type === 'sub' && e.player === null).length;
      expect(s.subs[0]).toBeLessThanOrEqual(3);
      expect(s.players.filter((p) => p.onPitch && !p.sentOff && p.team === 0).length).toBeLessThanOrEqual(11);
    }
    expect(subs).toBeGreaterThan(0);
    expect(tacticChanges).toBeGreaterThan(0);
  }, 30000);
});

describe('Moteur 2D : lien avec la carrière', () => {
  it('intègre le joueur créé (poste, stats, apparence) et reporte sa performance', () => {
    const g = newGame(21, { position: 'ATT' });
    g.events.pending = [];
    joinClub(g, g.clubs.find((c) => c.tier === 2)!, 'starter');
    g.t = 48 * 3 + 5; // 12 ans → football à 11
    const m = setupLeagueMatch(g) ?? setupStreetMatch(g);
    m.entersAt = 0;
    m.squadStatus = 'starter';
    const cfg = careerConfig(g, m, 'focused');
    const mySide = m.playerHome ? 0 : 1;
    const user = cfg.teams[mySide].players.find((p) => p.isUser)!;
    expect(user.role).toBe('ATT');
    expect(user.stats.shooting).toBeCloseTo(g.player.attrs.shooting, 5);
    expect(user.num).toBe(g.appearance.jerseyNumber);
    const s = createSim(cfg);
    runToEnd(s);
    const r = resultOf(s);
    // titulaire : il joue tout le match, sauf si le coach le fait sortir
    if (r.userSubbedOff === null) expect(r.userTally!.minutes).toBeGreaterThan(80);
    else expect(r.userSubbedOff).toBeGreaterThanOrEqual(45);
    applySimToMatch(m, s, r);
    const repBefore = g.reputation.sport;
    const lines = concludeMatch(g, m);
    expect(m.rating).toBe(r.userRating);
    expect(lines.some((l) => l.includes('Note'))).toBe(true);
    expect(g.reputation.sport).not.toBe(repBefore);
  });

  it('un remplaçant entre en jeu en cours de match', () => {
    const g = newGame(22);
    g.events.pending = [];
    const m = setupStreetMatch(g);
    m.entersAt = 60;
    m.squadStatus = 'rotation';
    const s = createSim(careerConfig(g, m, 'calm'));
    runToEnd(s);
    const u = s.players.find((p) => p.isUser);
    expect(u?.onPitch).toBe(true);
    expect(u!.tally.minutes).toBeGreaterThan(15);
    expect(u!.tally.minutes).toBeLessThan(40);
    expect(s.events.some((e) => e.type === 'sub' && e.player === 'user')).toBe(true);
  });
});
