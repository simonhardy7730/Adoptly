import { describe, expect, it } from 'vitest';
import { newGame, makeInput, botWeek } from './helpers';
import { nextFloat } from '../rng';
import { ageAt, dateOf, leagueMatchdayIndex } from '../calendar';
import { performAction, weeklySlots } from '../actions';
import { validateIdentity, nationEligibility } from '../eligibility';
import { readSave, writeSave, MemoryStorage, listSaves, migrate, SAVE_VERSION } from '../save';
import { ATTR_KEYS, playerOverall } from '../stats';
import { createGame } from '../create';

describe('RNG et calendrier', () => {
  it('est déterministe', () => {
    const a = { rng: 7 };
    const b = { rng: 7 };
    expect([nextFloat(a), nextFloat(a)]).toEqual([nextFloat(b), nextFloat(b)]);
  });
  it('calcule dates, âge et journées de championnat', () => {
    expect(dateOf(0, 2026)).toEqual({ year: 2026, month: 9, weekOfMonth: 1 });
    expect(dateOf(16, 2026)).toEqual({ year: 2027, month: 1, weekOfMonth: 1 });
    const s = newGame();
    expect(ageAt(s)).toBe(9);
    const mds = Array.from({ length: 48 }, (_, t) => leagueMatchdayIndex(t, 2026)).filter((x) => x >= 0);
    expect(mds).toEqual(Array.from({ length: 18 }, (_, i) => i));
  });
});

describe('Création du personnage', () => {
  it('refuse une nationalité secondaire non justifiée', () => {
    const id = makeInput({ secondNationality: 'BR' }).identity;
    expect(validateIdentity(id).join(' ')).toMatch(/justifiée/);
  });
  it('accepte une seconde nationalité justifiée par l’origine d’un parent', () => {
    const id = makeInput({ secondNationality: 'SN', parentOrigin: 'SN' }).identity;
    expect(validateIdentity(id)).toEqual([]);
    const s = createGame({ ...makeInput({ secondNationality: 'SN', parentOrigin: 'SN' }) }, 3);
    expect(nationEligibility(s).map((n) => n.code)).toEqual(['FR', 'SN']);
  });
  it('exige une nationalité choisie explicitement', () => {
    expect(validateIdentity(makeInput({ nationality: '' }).identity).length).toBeGreaterThan(0);
  });
  it('produit des statistiques cohérentes et un potentiel distinct', () => {
    for (let seed = 1; seed < 30; seed++) {
      const s = newGame(seed);
      for (const k of ATTR_KEYS) expect(s.player.attrs[k]).toBeGreaterThanOrEqual(3);
      expect(playerOverall(s)).toBeGreaterThan(12);
      expect(playerOverall(s)).toBeLessThan(45);
      expect(s.player.potential).toBeGreaterThanOrEqual(45);
      expect(s.player.potential).toBeLessThanOrEqual(92);
      expect(s.clubs.length).toBe(10);
    }
  });
  it('les origines changent concrètement les ressources', () => {
    const modest = newGame(5, { background: 'modest_football' });
    const rich = newGame(5, { background: 'wealthy' });
    const resp = newGame(5, { background: 'responsibilities' });
    expect(rich.money).toBeGreaterThan(modest.money);
    expect(weeklySlots(resp)).toBe(weeklySlots(modest) - 1);
    expect(resp.player.attrs.discipline).toBeGreaterThan(rich.player.attrs.discipline);
  });
});

describe('Actions et calendrier', () => {
  it('consomme du temps et de l’énergie, et refuse les actions impossibles', () => {
    const s = newGame();
    const before = s.player.attrs.technique;
    const slots = s.slots.left;
    expect(performAction(s, 'train_technique').ok).toBe(true);
    expect(s.slots.left).toBe(slots - 1);
    expect(s.player.attrs.technique).toBeGreaterThan(before);
    s.slots.left = 0;
    expect(performAction(s, 'rest').ok).toBe(false);
  });
  it('un joueur blessé ne peut pas s’entraîner', () => {
    const s = newGame();
    s.player.injury = { name: 'Entorse', weeksLeft: 2, severity: 2 };
    expect(performAction(s, 'train_physical').ok).toBe(false);
    expect(performAction(s, 'physio').ok).toBe(true);
  });
  it('le coach privé exige de l’argent', () => {
    const s = newGame();
    s.money = 10;
    expect(performAction(s, 'private_coach').ok).toBe(false);
  });
});

describe('Sauvegarde', () => {
  it('sauvegarde et recharge à l’identique', () => {
    const st = new MemoryStorage();
    const s = newGame(11);
    botWeek(s);
    expect(writeSave(s, { name: 'x', age: 9, club: '-', date: '-', overall: 20 }, st)).toBe(true);
    const back = readSave(0, st)!;
    expect(back.t).toBe(s.t);
    expect(back.player.attrs).toEqual(s.player.attrs);
    expect(listSaves(st)[0]?.name).toBe('x');
    expect(listSaves(st)[1]).toBeNull();
  });
  it('rejette une sauvegarde d’une version future', () => {
    expect(() => migrate({ version: SAVE_VERSION + 1 })).toThrow();
  });
});
