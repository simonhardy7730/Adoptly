import { describe, expect, it } from 'vitest';
import { newGame, botWeek } from './helpers';
import { ATTR_KEYS, playerOverall } from '../stats';
import { ageAt } from '../calendar';
import { currentClub } from '../career';
import type { GameState } from '../types';

function invariants(s: GameState) {
  expect(Number.isFinite(s.money)).toBe(true);
  for (const k of ATTR_KEYS) {
    expect(Number.isFinite(s.player.attrs[k])).toBe(true);
    expect(s.player.attrs[k]).toBeGreaterThanOrEqual(1);
    expect(s.player.attrs[k]).toBeLessThanOrEqual(99);
  }
  for (const v of [s.player.energy, s.player.morale, s.player.form, s.player.nutrition]) {
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(100);
  }
  expect(s.player.school.grade).toBeGreaterThanOrEqual(0);
  expect(s.player.school.grade).toBeLessThanOrEqual(20);
  for (const n of s.npcs) expect(n.relation).toBeGreaterThanOrEqual(0);
  expect(s.slots.left).toBeGreaterThanOrEqual(0);
}

describe('Parcours complets (bot)', () => {
  it('simule 9 saisons sur plusieurs graines sans incohérence', () => {
    const summary: string[] = [];
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const bgs = ['modest_football', 'stable_studies', 'wealthy', 'ex_pro_parent', 'nomad', 'responsibilities'] as const;
      const s = newGame(seed * 97, { background: bgs[seed - 1], position: (['ATT', 'MID', 'DEF', 'GK', 'MID', 'ATT'] as const)[seed - 1] });
      let ledgerSum = s.ledger.reduce((a, x) => a + x.amount, 0);
      for (let w = 0; w < 48 * 9; w++) {
        botWeek(s);
        if (w === 40) {
          ledgerSum = s.ledger.reduce((a, x) => a + x.amount, 0);
          expect(Math.abs(ledgerSum - s.money)).toBeLessThan(0.05);
        }
        if (w % 12 === 0) invariants(s);
      }
      invariants(s);
      const club = currentClub(s);
      const caps = Object.values(s.national.caps).reduce((a, c) => a + c.youth + c.senior, 0);
      summary.push(`${s.identity.background}/${s.identity.position} âge ${ageAt(s)} ovr ${playerOverall(s).toFixed(1)} pot ${s.player.potential} club ${club ? `T${club.tier}` : '—'} rep ${s.reputation.sport.toFixed(0)} pop ${s.reputation.popularity.toFixed(0)} €${Math.round(s.money)} sélections ${caps} sponsors ${s.sponsors.contracts.length} abonnés ${s.reputation.followers}`);
    }
    console.log(summary.join('\n'));
  }, 60000);
});
