// Sauvegarde locale versionnée (localStorage), avec migrations pour les futures versions.

import type { GameState } from './types';

export const SAVE_VERSION = 1;
export const SLOT_COUNT = 3;
const PREFIX = 'lifefootball.save.';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SaveSummary {
  slot: number;
  name: string;
  age: number;
  club: string;
  date: string;
  savedAt: number;
  version: number;
  overall: number;
}

interface SaveEnvelope {
  version: number;
  savedAt: number;
  summary: SaveSummary;
  state: GameState;
}

/**
 * Migrations : clé = version de départ. Chaque fonction transforme une sauvegarde
 * de la version N vers N+1. Exemple pour une future v2 :
 *   1: (s) => ({ ...s, version: 2, nouveauChamp: valeurParDefaut })
 */
export const MIGRATIONS: Record<number, (s: any) => any> = {};

export function migrate(state: any): GameState {
  let s = state;
  let guard = 0;
  while (s.version < SAVE_VERSION && guard++ < 50) {
    const m = MIGRATIONS[s.version];
    if (!m) throw new Error(`Aucune migration depuis la version ${s.version}`);
    s = m(s);
  }
  if (s.version > SAVE_VERSION) throw new Error('Sauvegarde créée par une version plus récente du jeu.');
  return s as GameState;
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function writeSave(state: GameState, summary: Omit<SaveSummary, 'slot' | 'savedAt' | 'version'>, storage = defaultStorage()): boolean {
  if (!storage) return false;
  const savedAt = Date.now();
  const env: SaveEnvelope = {
    version: SAVE_VERSION,
    savedAt,
    summary: { ...summary, slot: state.slot, savedAt, version: SAVE_VERSION },
    state: { ...state, savedAt },
  };
  try {
    storage.setItem(PREFIX + state.slot, JSON.stringify(env));
    return true;
  } catch {
    return false;
  }
}

export function readSave(slot: number, storage = defaultStorage()): GameState | null {
  if (!storage) return null;
  const raw = storage.getItem(PREFIX + slot);
  if (!raw) return null;
  try {
    const env = JSON.parse(raw) as SaveEnvelope;
    const st = migrate(env.state);
    st.slot = slot;
    return st;
  } catch {
    return null;
  }
}

export function listSaves(storage = defaultStorage()): (SaveSummary | null)[] {
  const out: (SaveSummary | null)[] = [];
  for (let i = 0; i < SLOT_COUNT; i++) {
    const raw = storage?.getItem(PREFIX + i);
    if (!raw) {
      out.push(null);
      continue;
    }
    try {
      out.push((JSON.parse(raw) as SaveEnvelope).summary);
    } catch {
      out.push(null);
    }
  }
  return out;
}

export function deleteSave(slot: number, storage = defaultStorage()) {
  storage?.removeItem(PREFIX + slot);
}

export class MemoryStorage implements StorageLike {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}
