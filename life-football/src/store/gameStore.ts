// Store global (Zustand). Chaque action clone l'état, applique une fonction de jeu pure, puis sauvegarde si besoin.

import { create } from 'zustand';
import '../game/index';
import type { GameState, SleepMode, SponsorTerms, SocialPost } from '../game/types';
import { createGame, type CreationInput } from '../game/create';
import { clone, addMoney, changeRelation } from '../game/helpers';
import { readSave, writeSave, deleteSave, listSaves, type SaveSummary } from '../game/save';
import { doAdminTask, performAction, fmtGains } from '../game/actions';
import { blockingActivity, finalizeWeek } from '../game/week';
import { resolveEvent } from '../game/events';
import { choosePrologue, finishPrologue } from '../game/prologue';
import { answerClubOffer, answerTryout, completeTryout, clubById, currentClub, transportCost } from '../game/career';
import { beginMatch, chooseInMatch, concludeMatch, createMatchFor, startStreetMatch } from '../game/flow';
import type { Approach, MatchState, Preparation } from '../game/match';
import { answerCallup } from '../game/national';
import { declineSponsor, negotiateSponsor, signSponsor, type NegotiationResult } from '../game/sponsors';
import { publish } from '../game/social';
import { food, BOOTS } from '../content/foods';
import { ageAt, formatDate } from '../game/calendar';
import { playerOverall, applyTraining, type TrainingFocus } from '../game/stats';
import { clamp } from '../game/rng';
import type { MiniGameId } from '../minigames/logic';

export type TabId =
  | 'dashboard' | 'calendar' | 'training' | 'club' | 'life' | 'finance' | 'relations' | 'profile' | 'national' | 'sponsors' | 'social' | 'history';

export interface Toast {
  id: number;
  kind: 'info' | 'success' | 'warning' | 'error';
  text: string;
}

export interface TryoutFlow {
  id: string;
  step: 'intro' | 'travel' | 'games' | 'result';
  gameIdx: number;
  scores: Record<string, number>;
  games: MiniGameId[];
}

export interface Practice {
  game: MiniGameId;
}

interface Store {
  screen: 'menu' | 'create' | 'game';
  tab: TabId;
  game: GameState | null;
  match: MatchState | null;
  matchLines: string[];
  tryout: TryoutFlow | null;
  practice: Practice | null;
  toasts: Toast[];
  weekReport: { title: string; lines: string[] } | null;
  saves: (SaveSummary | null)[];
  // navigation
  goMenu: () => void;
  goCreate: () => void;
  setTab: (t: TabId) => void;
  refreshSaves: () => void;
  toast: (text: string, kind?: Toast['kind']) => void;
  dismissToast: (id: number) => void;
  closeReport: () => void;
  markRead: () => void;
  // partie
  newGame: (input: CreationInput, slot: number) => void;
  load: (slot: number) => boolean;
  save: (manual?: boolean) => void;
  deleteSlot: (slot: number) => void;
  // actions
  act: (id: string) => void;
  admin: (id: string) => void;
  advance: (force?: boolean) => void;
  chooseEvent: (choiceId: string) => void;
  choosePrologue: (choiceId: string) => string | null;
  finishPrologue: () => void;
  setSleep: (m: SleepMode) => void;
  buy: (cart: Record<string, number>) => void;
  buyBoots: (id: string) => void;
  // club & détections
  answerTryout: (id: string, accept: boolean) => void;
  answerOffer: (id: string, accept: boolean) => void;
  tryoutTravel: (transport: 'parents' | 'bus' | 'train', prep: 'rest' | 'train' | 'visualize') => void;
  tryoutGameDone: (score: number) => void;
  closeTryout: () => void;
  // matchs
  street: () => void;
  kickOff: (a: Approach, p: Preparation) => void;
  choose: (optionId: string) => void;
  endMatch: () => void;
  // entraînement mini-jeux
  startPractice: (g: MiniGameId) => void;
  practiceDone: (score: number | null) => void;
  // sélection, sponsors, social
  callup: (accept: boolean) => void;
  sponsorSign: (id: string) => void;
  sponsorDecline: (id: string) => void;
  sponsorNegotiate: (id: string, ask: SponsorTerms) => NegotiationResult | null;
  post: (kind: SocialPost['kind'], tone: string) => void;
}

let toastId = 1;

function summaryOf(g: GameState) {
  const club = currentClub(g);
  return {
    name: `${g.identity.firstName} ${g.identity.lastName}`,
    age: ageAt(g),
    club: club?.name ?? 'Sans club',
    date: formatDate(g.t, g.startYear),
    overall: Math.round(playerOverall(g)),
  };
}

export const useGame = create<Store>((set, get) => {
  /** Applique une mutation sur une copie de la partie. */
  const mutate = <R>(fn: (g: GameState) => R, autosave = false): R | undefined => {
    const g0 = get().game;
    if (!g0) return undefined;
    const g = clone(g0);
    const r = fn(g);
    set({ game: g });
    if (autosave) writeSave(g, summaryOf(g));
    return r;
  };
  const toast = (text: string, kind: Toast['kind'] = 'info') => {
    const id = toastId++;
    set((st) => ({ toasts: [...st.toasts.slice(-3), { id, kind, text }] }));
    setTimeout(() => get().dismissToast(id), 4200);
  };

  return {
    screen: 'menu',
    tab: 'dashboard',
    game: null,
    match: null,
    matchLines: [],
    tryout: null,
    practice: null,
    toasts: [],
    weekReport: null,
    saves: listSaves(),

    goMenu: () => {
      const g = get().game;
      if (g) writeSave(g, summaryOf(g));
      set({ screen: 'menu', game: null, match: null, tryout: null, practice: null, saves: listSaves() });
    },
    goCreate: () => set({ screen: 'create' }),
    setTab: (tab) => set({ tab }),
    refreshSaves: () => set({ saves: listSaves() }),
    toast,
    dismissToast: (id) => set((st) => ({ toasts: st.toasts.filter((t) => t.id !== id) })),
    closeReport: () => set({ weekReport: null }),
    markRead: () => {
      const g = get().game;
      if (!g || g.notifications.every((n) => n.read)) return;
      mutate((gg) => gg.notifications.forEach((n) => { n.read = true; }));
    },

    newGame: (input, slot) => {
      const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) | 0;
      const g = createGame(input, seed, slot);
      writeSave(g, summaryOf(g));
      set({ game: g, screen: 'game', tab: 'dashboard', saves: listSaves() });
    },
    load: (slot) => {
      const g = readSave(slot);
      if (!g) {
        toast('Sauvegarde illisible ou incompatible.', 'error');
        return false;
      }
      set({ game: g, screen: 'game', tab: 'dashboard', match: null, tryout: null, practice: null });
      return true;
    },
    save: (manual) => {
      const g = get().game;
      if (!g) return;
      const ok = writeSave(g, summaryOf(g));
      if (manual) toast(ok ? 'Partie sauvegardée.' : 'Échec de la sauvegarde (stockage indisponible).', ok ? 'success' : 'error');
      set({ saves: listSaves() });
    },
    deleteSlot: (slot) => {
      deleteSave(slot);
      set({ saves: listSaves() });
    },

    act: (id) => {
      if (id === 'street_match') return get().street();
      const r = mutate((g) => performAction(g, id), true);
      if (r) toast(r.message, r.ok ? 'success' : 'warning');
    },
    admin: (id) => {
      const r = mutate((g) => doAdminTask(g, id), true);
      if (r) toast(r.message, r.ok ? 'success' : 'warning');
    },
    advance: (force) => {
      const g = get().game;
      if (!g) return;
      if (!g.prologue.done) return toast('Termine d’abord le prologue.', 'warning');
      const b = blockingActivity(g);
      if (b?.type === 'event') return toast('Une décision t’attend avant de continuer.', 'warning');
      if (b?.type === 'tryout') {
        const club = clubById(g, g.tryouts.find((t) => t.id === b.id)!.clubId)!;
        const games: MiniGameId[] = g.identity.position === 'GK' ? ['keeper', 'pass', 'decision'] : ['pass', 'dribble', 'decision'];
        set({ tryout: { id: b.id, step: 'intro', gameIdx: 0, scores: {}, games } });
        toast(`Jour de détection à ${club.name} !`, 'info');
        return;
      }
      if (b?.type === 'league' || b?.type === 'national') {
        const m = mutate((gg) => createMatchFor(gg, b.type as 'league' | 'national'));
        if (m) set({ match: m, matchLines: [] });
        return;
      }
      if (!force && g.slots.left > 0) {
        set({ weekReport: { title: '__confirm__', lines: [`Il te reste ${g.slots.left} action(s) cette semaine.`] } });
        return;
      }
      const report = mutate((gg) => finalizeWeek(gg), true);
      const ng = get().game!;
      set({ weekReport: { title: formatDate(ng.t, ng.startYear), lines: report?.lines ?? [] }, saves: listSaves() });
    },
    choosePrologue: (choiceId) => {
      const r = mutate((g) => choosePrologue(g, choiceId), true);
      return r?.ok ? r.outcome : null;
    },
    finishPrologue: () => {
      mutate((g) => finishPrologue(g), true);
      set({ tab: 'dashboard' });
    },
    chooseEvent: (choiceId) => {
      const r = mutate((g) => resolveEvent(g, choiceId), true);
      if (r) toast(r.message, r.ok ? 'info' : 'warning');
    },
    setSleep: (m) => mutate((g) => { g.player.sleepMode = m; }, true),
    buy: (cart) => {
      const r = mutate((g) => {
        let total = 0;
        for (const [id, q] of Object.entries(cart)) total += (food(id)?.price ?? 0) * q;
        if (total <= 0) return { ok: false, msg: 'Panier vide.' };
        if (total > g.money) return { ok: false, msg: `Il te manque ${(total - g.money).toFixed(2)} €.` };
        for (const [id, q] of Object.entries(cart)) {
          const f = food(id);
          if (!f || q <= 0) continue;
          g.pantry[id] = (g.pantry[id] ?? 0) + f.portions * q;
        }
        addMoney(g, -total, 'food', 'Courses');
        return { ok: true, msg: `Courses payées : ${total.toFixed(2)} €.` };
      }, true);
      if (r) toast(r.msg, r.ok ? 'success' : 'warning');
    },
    buyBoots: (id) => {
      const r = mutate((g) => {
        const b = BOOTS.find((x) => x.id === id)!;
        if (g.money < b.price) return { ok: false, msg: 'Pas assez d’argent.' };
        if (g.player.boots.sponsored) return { ok: false, msg: 'Ton équipementier te fournit déjà tes crampons.' };
        addMoney(g, -b.price, 'equipment', b.name);
        g.player.boots = { name: b.name, brandId: null, quality: b.quality, wear: 0, sponsored: false };
        return { ok: true, msg: `${b.name} achetés !` };
      }, true);
      if (r) toast(r.msg, r.ok ? 'success' : 'warning');
    },

    answerTryout: (id, accept) => mutate((g) => answerTryout(g, id, accept), true),
    answerOffer: (id, accept) => {
      const r = mutate((g) => answerClubOffer(g, id, accept), true);
      if (r) toast(r, 'info');
    },
    tryoutTravel: (transport, prep) => {
      const tr = get().tryout;
      if (!tr) return;
      const ok = mutate((g) => {
        const t = g.tryouts.find((x) => x.id === tr.id)!;
        const club = clubById(g, t.clubId)!;
        const cost = transportCost(g, club, transport);
        if (cost.money > g.money) return false;
        if (cost.money) addMoney(g, -cost.money, 'transport', `Trajet détection ${club.name}`);
        g.player.energy = clamp(g.player.energy - cost.energy);
        if (cost.family) changeRelation(g, 'parent', cost.family);
        if (transport === 'parents') changeRelation(g, 'parent2', 1);
        if (prep === 'rest') g.player.energy = clamp(g.player.energy + 12);
        if (prep === 'train') { g.player.energy = clamp(g.player.energy - 8); g.player.morale = clamp(g.player.morale + 4); }
        if (prep === 'visualize') g.player.morale = clamp(g.player.morale + 9);
        t.transport = transport;
        t.prep = prep;
        return true;
      });
      if (!ok) return toast('Pas assez d’argent pour ce trajet.', 'warning');
      set({ tryout: { ...tr, step: 'games' } });
    },
    tryoutGameDone: (score) => {
      const tr = get().tryout;
      if (!tr) return;
      const scores = { ...tr.scores, [tr.games[tr.gameIdx]]: score };
      if (tr.gameIdx + 1 < tr.games.length) return set({ tryout: { ...tr, scores, gameIdx: tr.gameIdx + 1 } });
      mutate((g) => completeTryout(g, tr.id, scores), true);
      set({ tryout: { ...tr, scores, step: 'result' } });
    },
    closeTryout: () => set({ tryout: null }),

    street: () => {
      const r = mutate((g) => startStreetMatch(g));
      if (!r) return;
      if (!r.ok || !r.match) return toast(r.message, 'warning');
      set({ match: r.match, matchLines: [] });
    },
    kickOff: (a, p) => {
      const m0 = get().match;
      if (!m0) return;
      const m = clone(m0);
      mutate((g) => beginMatch(g, m, a, p));
      set({ match: m });
    },
    choose: (optionId) => {
      const m0 = get().match;
      if (!m0) return;
      const m = clone(m0);
      mutate((g) => chooseInMatch(g, m, optionId));
      set({ match: m });
    },
    endMatch: () => {
      const m = get().match;
      if (!m) return;
      if (m.status === 'done' && !get().matchLines.length) {
        const lines = mutate((g) => concludeMatch(g, m), true) ?? [];
        set({ matchLines: lines.length ? lines : ['Match terminé.'] });
        return;
      }
      set({ match: null, matchLines: [] });
    },

    startPractice: (game) => {
      const r = mutate((g) => {
        if (g.slots.left < 1) return 'Plus de temps libre cette semaine.';
        if (g.player.injury) return 'Impossible : tu es blessé.';
        if (g.player.energy < 12) return 'Trop fatigué.';
        g.slots.left -= 1;
        g.weekLog.push(`train_${game}`);
        g.player.energy = clamp(g.player.energy - 10);
        return null;
      });
      if (r) return toast(r, 'warning');
      set({ practice: { game } });
    },
    practiceDone: (score) => {
      const p = get().practice;
      if (!p) return;
      if (score !== null) {
        const focus: Record<MiniGameId, TrainingFocus> = { pass: 'tactical', dribble: 'technique', decision: 'tactical', keeper: 'goalkeeping' };
        const gains = mutate((g) => applyTraining(g, focus[p.game], 0.5 + score / 100), true);
        if (gains) toast(`Séance terminée (${score}/100). ${fmtGains(gains)}`, 'success');
      }
      set({ practice: null });
    },

    callup: (accept) => {
      const r = mutate((g) => answerCallup(g, accept), true);
      if (r) toast(r, 'info');
    },
    sponsorSign: (id) => {
      const r = mutate((g) => signSponsor(g, id), true);
      if (r) toast(r, 'success');
    },
    sponsorDecline: (id) => mutate((g) => declineSponsor(g, id), true),
    sponsorNegotiate: (id, ask) => mutate((g) => negotiateSponsor(g, id, ask), true) ?? null,
    post: (kind, tone) => {
      const r = mutate((g) => publish(g, kind, tone), true);
      if (r) toast(r.message, r.ok ? 'success' : 'warning');
    },
  };
});

