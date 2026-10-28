import { describe, expect, it } from 'vitest';
import { makeInput, newGame, playPrologue } from './helpers';
import { validateStep, firstInvalidStep, harmonizeProfile, isComplete, type CreationDraft } from '../creation';
import { createGame, defaultAppearance, defaultIdentity, initialAttributes } from '../create';
import { ATTR_KEYS, overall } from '../stats';
import { prologueScene, choosePrologue } from '../prologue';
import { PROLOGUE } from '../../content/prologue';
import { MemoryStorage, readSave, writeSave, migrate, SAVE_VERSION } from '../save';
import { performAction } from '../actions';
import { blockingActivity } from '../week';

function draft(over: Partial<CreationDraft> = {}): CreationDraft {
  const i = makeInput();
  return { identity: i.identity, appearance: i.appearance, qualities: i.qualities, startAge: 9, seed: 99, ...over };
}

describe('Créateur : validation par étape', () => {
  it('bloque une identité incomplète et indique les champs fautifs', () => {
    const d = draft({ identity: { ...defaultIdentity() } });
    const e = validateStep(0, d);
    expect(e.firstName).toMatch(/obligatoire/);
    expect(e.lastName).toMatch(/obligatoire/);
    expect(e.nationality).toMatch(/obligatoire/);
    expect(firstInvalidStep(d)).toBe(0);
    expect(isComplete(d)).toBe(false);
  });
  it('refuse les noms invalides et la nationalité secondaire non justifiée', () => {
    const d = draft();
    expect(validateStep(0, { ...d, identity: { ...d.identity, firstName: 'L' } }).firstName).toMatch(/2 lettres/);
    expect(validateStep(0, { ...d, identity: { ...d.identity, lastName: 'X3' } }).lastName).toMatch(/lettres/);
    expect(validateStep(0, { ...d, identity: { ...d.identity, secondNationality: 'BR' } }).secondNationality).toMatch(/justifiée/);
    expect(validateStep(0, { ...d, identity: { ...d.identity, parentOrigin: 'BR', secondNationality: 'BR' } }).secondNationality).toBeUndefined();
  });
  it('vérifie numéro de maillot, qualités et cohérence poste / profil', () => {
    const d = draft();
    expect(validateStep(1, { ...d, appearance: { ...d.appearance, jerseyNumber: 0 } }).jerseyNumber).toBeDefined();
    expect(validateStep(2, { ...d, qualities: ['technique', 'passing'] }).qualities).toMatch(/3/);
    expect(validateStep(2, { ...d, identity: { ...d.identity, archetype: 'keeper' } }).archetype).toBeDefined();
    expect(validateStep(2, { ...d, qualities: ['reflexes', 'passing', 'speed'] }).qualities).toBeDefined();
    const gk = harmonizeProfile({ ...d.identity, position: 'GK', archetype: 'striker', secondaryPosition: 'ATT' });
    expect(gk.archetype).toBe('keeper');
    expect(gk.secondaryPosition).toBeNull();
    expect(isComplete(d)).toBe(true);
  });
});

describe('Créateur : caractéristiques initiales', () => {
  it('l’aperçu correspond exactement au joueur créé', () => {
    const i = makeInput();
    const preview = initialAttributes({ rng: 1234 }, { ...i, startAge: 9 });
    const s = createGame({ ...i, seed: 1234 }, 777);
    for (const k of ATTR_KEYS) expect(s.player.attrs[k]).toBeCloseTo(preview[k], 5);
    expect(s.creation.initialAttrs).toEqual(s.player.attrs);
  });
  it('dépendent du poste, du pied et de l’âge', () => {
    const base = makeInput();
    const att = initialAttributes({ rng: 5 }, { ...base, identity: { ...base.identity, position: 'ATT', archetype: 'allround' } });
    const def = initialAttributes({ rng: 5 }, { ...base, identity: { ...base.identity, position: 'DEF', archetype: 'allround' } });
    expect(att.shooting).toBeGreaterThan(def.shooting);
    expect(def.defending).toBeGreaterThan(att.defending);
    const left = initialAttributes({ rng: 5 }, { ...base, identity: { ...base.identity, foot: 'left' } });
    const right = initialAttributes({ rng: 5 }, { ...base, identity: { ...base.identity, foot: 'right' } });
    expect(left.dribbling).toBeGreaterThan(right.dribbling);
    const older = initialAttributes({ rng: 5 }, { ...base, startAge: 10 });
    const younger = initialAttributes({ rng: 5 }, { ...base, startAge: 8 });
    expect(overall(older, 'MID')).toBeGreaterThan(overall(younger, 'MID') + 4);
  });
  it('la variation aléatoire est équilibrée (même total pour toutes les graines)', () => {
    const base = makeInput();
    const sum = (seed: number) => {
      const a = initialAttributes({ rng: seed }, { ...base, identity: { ...base.identity, position: 'MID', archetype: 'allround' }, appearance: defaultAppearance() });
      return ATTR_KEYS.reduce((x, k) => x + a[k], 0);
    };
    const sums = [1, 2, 3, 4, 5, 6, 7, 8].map(sum);
    expect(Math.max(...sums) - Math.min(...sums)).toBeLessThan(3); // seuls les arrondis/bornes diffèrent
  });
});

describe('Prologue', () => {
  it('bloque les actions tant qu’il n’est pas terminé, puis lance la première semaine', () => {
    const s = createGame(makeInput(), 3);
    expect(s.prologue.done).toBe(false);
    expect(performAction(s, 'rest').ok).toBe(false);
    const before = { ...s.player.attrs };
    playPrologue(s);
    expect(s.prologue.done).toBe(true);
    expect(Object.keys(s.prologue.choices)).toHaveLength(PROLOGUE.length);
    expect(ATTR_KEYS.some((k) => s.player.attrs[k] !== before[k])).toBe(true);
    expect(blockingActivity(s)?.type).toBe('event'); // le défi du city-stade
  });
  it('un choix programme une conséquence différée', () => {
    const s = createGame(makeInput(), 4);
    choosePrologue(s, prologueScene(s)!.choices(s)[0].id);
    choosePrologue(s, 'organize');
    expect(s.events.flags.leader).toBe(1);
    expect(s.events.scheduled.some((e) => e.eventId === 'neighborhood_cup')).toBe(true);
  });
});

describe('Club local et sauvegarde', () => {
  it('la visite du club local débouche sur une proposition de licence', () => {
    const s = newGame(8);
    s.events.pending = [];
    const r = performAction(s, 'visit_local_club');
    expect(r.ok).toBe(true);
    expect(s.clubOffers.filter((o) => o.status === 'pending')).toHaveLength(1);
    expect(performAction(s, 'visit_local_club').ok).toBe(false);
  });
  it('conserve identité complète, création, prologue et progression', () => {
    const st = new MemoryStorage();
    const s = newGame(12, { nickname: 'Le Mur', secondNationality: 'SN', parentOrigin: 'SN' });
    s.appearance.kitPattern = 'stripes';
    writeSave(s, { name: 'x', age: 9, club: '-', date: '-', overall: 20 }, st);
    const b = readSave(0, st)!;
    expect(b.identity).toEqual(s.identity);
    expect(b.appearance).toEqual(s.appearance);
    expect(b.creation).toEqual(s.creation);
    expect(b.prologue).toEqual(s.prologue);
    expect(b.events.flags).toEqual(s.events.flags);
  });
  it('migre une sauvegarde v1 vers la version actuelle', () => {
    const s: any = structuredClone(newGame(13));
    s.version = 1;
    delete s.creation;
    delete s.prologue;
    for (const k of ['kitColor', 'kitColor2', 'kitPattern', 'bootsColor', 'accessory']) delete s.appearance[k];
    const m = migrate(s);
    expect(m.version).toBe(SAVE_VERSION);
    expect(m.prologue.done).toBe(true);
    expect(m.appearance.kitPattern).toBe('plain');
    expect(m.creation.initialAttrs.technique).toBe(s.player.attrs.technique);
  });
});
