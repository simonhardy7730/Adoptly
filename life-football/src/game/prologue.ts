// Moteur du prologue : applique les choix et lance la première semaine.

import type { GameState } from './types';
import { PROLOGUE, type PrologueScene } from '../content/prologue';
import { applyEffects, journal, notify } from './helpers';

export function prologueScene(s: GameState): PrologueScene | null {
  if (s.prologue.done) return null;
  return PROLOGUE[s.prologue.step] ?? null;
}

export function choosePrologue(s: GameState, choiceId: string): { ok: boolean; outcome: string } {
  const scene = prologueScene(s);
  if (!scene) return { ok: false, outcome: 'Prologue terminé.' };
  const choice = scene.choices(s).find((c) => c.id === choiceId);
  if (!choice) return { ok: false, outcome: 'Choix invalide.' };
  applyEffects(s, choice.effects);
  s.prologue.choices[scene.id] = choice.id;
  journal(s, `${scene.title} : ${choice.label.replace(/[«»]/g, '').trim()}`, scene.icon, scene.id === 'dream');
  s.prologue.step += 1;
  return { ok: true, outcome: choice.outcome };
}

/** Clôt le prologue : le défi du city-stade ouvre la première semaine. */
export function finishPrologue(s: GameState) {
  if (s.prologue.done) return;
  s.prologue.done = true;
  s.events.pending.push({ eventId: 'intro_street' });
  notify(s, 'info', 'Tes premiers pas', 'Entraîne-toi, rends visite au club local et fais-toi remarquer : les détections suivront.');
}
