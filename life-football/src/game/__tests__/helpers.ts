// Outils de test : création d'une partie type et bot de simulation.
import '../index';
import { createGame, type CreationInput } from '../create';
import { defaultAppearance, defaultIdentity } from '../create';
import type { GameState } from '../types';
import { blockingActivity, finalizeWeek } from '../week';
import { currentEvent, choicesOf, resolveEvent } from '../events';
import { performAction } from '../actions';
import { answerClubOffer, answerTryout, completeTryout } from '../career';
import { autoPlay, createMatchFor } from '../flow';
import { answerCallup } from '../national';
import { signSponsor } from '../sponsors';

export function makeInput(over: Partial<CreationInput['identity']> = {}): CreationInput {
  const identity = { ...defaultIdentity(), firstName: 'Léo', lastName: 'Testeur', nationality: 'FR', ...over };
  return { identity, appearance: defaultAppearance(), qualities: ['technique', 'passing', 'vision'], startAge: 9 };
}

export function newGame(seed = 42, over: Partial<CreationInput['identity']> = {}): GameState {
  return createGame(makeInput(over), seed);
}

export function resolveAllEvents(s: GameState) {
  let guard = 0;
  while (s.events.pending.length && guard++ < 20) {
    const cur = currentEvent(s);
    if (!cur) continue;
    const choice = choicesOf(s, cur.event, cur.data).find((c) => !c.unavailable?.(s, cur.data));
    if (!choice) { s.events.pending.shift(); continue; }
    resolveEvent(s, choice.id);
  }
}

/** Joue une semaine avec une stratégie raisonnable. Retourne false si bloqué. */
export function botWeek(s: GameState, scores = { pass: 70, dribble: 68, decision: 72, keeper: 65 }): void {
  resolveAllEvents(s);
  for (const t of s.tryouts) if (t.status === 'invited') answerTryout(s, t.id, true);
  for (const o of s.clubOffers) if (o.status === 'pending') answerClubOffer(s, o.id, true);
  if (s.national.pendingCallup?.status === 'pending') answerCallup(s, true);
  for (const o of s.sponsors.offers) if (o.status === 'pending') signSponsor(s, o.id);
  let guard = 0;
  while (s.slots.left > 0 && guard++ < 10) {
    const p = s.player;
    const id = p.injury ? 'rest' : p.energy < 40 ? 'rest' : p.school.grade < 10 && guard % 2 ? 'study' : s.identity.position === 'GK' ? 'train_goalkeeping' : guard % 3 === 0 ? 'train_physical' : 'train_technique';
    const r = performAction(s, id);
    if (!r.ok) performAction(s, 'rest');
  }
  guard = 0;
  for (;;) {
    if (guard++ > 20) throw new Error('Semaine bloquée');
    const b = blockingActivity(s);
    if (!b) break;
    if (b.type === 'event') resolveAllEvents(s);
    else if (b.type === 'tryout') {
      const t = s.tryouts.find((x) => x.id === b.id)!;
      const sc: Record<string, number> = s.identity.position === 'GK' ? { keeper: scores.keeper, pass: scores.pass, decision: scores.decision } : { pass: scores.pass, dribble: scores.dribble, decision: scores.decision };
      completeTryout(s, t.id, sc);
      for (const o of s.clubOffers) if (o.status === 'pending') answerClubOffer(s, o.id, true);
    } else {
      const m = createMatchFor(s, b.type);
      if (!m) throw new Error('Match introuvable');
      autoPlay(s, m);
    }
  }
  finalizeWeek(s);
}
