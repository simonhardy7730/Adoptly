// Simulation du match 2D, indépendante de l'affichage.
// Principe : à chaque action (passe, tir, tacle, dribble), la simulation tire le résultat à partir
// des statistiques, de la position, de la pression, de l'endurance et d'une part de hasard
// contrôlée (graine). Le ballon suit ensuite une trajectoire continue jusqu'à ce résultat :
// il ne se téléporte jamais. Pas de temps fixe → résultat identique quelle que soit la vitesse d'affichage.

import { nextFloat, type RngHolder } from '../game/rng';
import { FORMATIONS } from './formations';
import type {
  Anim, Banner, EventType, Flight, Phase, PlayerSetup, RestartKind, Role, ShotOutcome, Side, SimConfig, SimEvent, SimPlayer, SimState, Tally, TeamStats, Vec,
} from './types';

export const DT = 1 / 30;
const CONTROL_R = 1.1;

// ———————————————————————————————————————— vecteurs
const v = (x: number, y: number): Vec => ({ x, y });
const sub = (a: Vec, b: Vec) => v(a.x - b.x, a.y - b.y);
const add = (a: Vec, b: Vec) => v(a.x + b.x, a.y + b.y);
const mul = (a: Vec, k: number) => v(a.x * k, a.y * k);
const len = (a: Vec) => Math.hypot(a.x, a.y);
const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
const norm = (a: Vec) => {
  const l = len(a);
  return l > 1e-6 ? v(a.x / l, a.y / l) : v(0, 0);
};
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
function segDist(p: Vec, a: Vec, b: Vec): { d: number; t: number } {
  const ab = sub(b, a);
  const l2 = ab.x * ab.x + ab.y * ab.y || 1;
  const t = clamp(((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / l2, 0, 1);
  return { d: dist(p, add(a, mul(ab, t))), t };
}
const rnd = (s: SimState) => nextFloat(s.rng as RngHolder);

// ———————————————————————————————————————— repères
export function attackDir(s: SimState, team: Side): 1 | -1 {
  return (team === 0) === (s.half === 1) ? 1 : -1;
}
/** Position en coordonnées d'attaque (x : 0 = propre but). */
function toA(s: SimState, team: Side, p: Vec): Vec {
  const { L, W } = s.cfg.pitch;
  return attackDir(s, team) > 0 ? v(p.x, p.y) : v(L - p.x, W - p.y);
}
function fromA(s: SimState, team: Side, a: Vec): Vec {
  return toA(s, team, a); // involution
}
function goalOf(s: SimState, team: Side): Vec {
  // but attaqué par l'équipe
  return attackDir(s, team) > 0 ? v(s.cfg.pitch.L, s.cfg.pitch.W / 2) : v(0, s.cfg.pitch.W / 2);
}
function ownGoal(s: SimState, team: Side): Vec {
  return attackDir(s, team) > 0 ? v(0, s.cfg.pitch.W / 2) : v(s.cfg.pitch.L, s.cfg.pitch.W / 2);
}
export function minute(s: SimState): number {
  return (s.half - 1) * 45 + Math.min(45, ((s.t - s.halfStart) / s.cfg.halfSeconds) * 45);
}

// ———————————————————————————————————————— création
const emptyTally = (): Tally => ({ touches: 0, passes: 0, passesOk: 0, shots: 0, shotsOn: 0, goals: 0, assists: 0, tackles: 0, tacklesWon: 0, interceptions: 0, saves: 0, fouls: 0, distance: 0, minutes: 0 });
const emptyStats = (): TeamStats => ({ possession: 0, shots: 0, shotsOn: 0, passes: 0, passesOk: 0, fouls: 0, corners: 0, yellows: 0, reds: 0 });

function makePlayer(ps: PlayerSetup, team: Side, slot: { role: Role; x: number; y: number }, onPitch: boolean): SimPlayer {
  return {
    id: ps.id, name: ps.name, num: ps.num, team, role: slot.role, slot: v(slot.x, slot.y), stats: ps.stats, look: ps.look, isUser: !!ps.isUser, instruction: ps.instruction ?? null, enteredAt: onPitch ? 0 : -1,
    onPitch, sentOff: false, pos: v(0, 0), vel: v(0, 0), target: v(0, 0), facing: 0, energy: clamp(ps.energy ?? 1, 0.3, 1),
    anim: 'idle', animT: 0, animDur: 0, animDir: 0, runPhase: ps.num * 0.7, cooldown: 0, stun: 0, carryTarget: null,
    yellow: 0, cardUntil: 0, injured: false, tally: emptyTally(),
  };
}

export function createSim(cfg: SimConfig): SimState {
  const { L, W } = cfg.pitch;
  const players: SimPlayer[] = [];
  const bench: SimPlayer[] = [];
  cfg.teams.forEach((t, ti) => {
    const f = FORMATIONS[t.formation];
    t.players.forEach((ps, i) => players.push(makePlayer(ps, ti as Side, f.slots[i] ?? f.slots[f.slots.length - 1], true)));
    t.bench.forEach((ps) => bench.push(makePlayer(ps, ti as Side, { role: ps.role, x: 0.4, y: 0.5 }, false)));
  });
  const s: SimState = {
    cfg, rng: { rng: cfg.seed | 0 }, t: 0, half: 1, halfStart: 0, phase: 'kickoff', phaseT: 0, restart: null, kickoffTeam: 0,
    players, bench, ball: { pos: v(L / 2, W / 2), z: 0, vel: v(0, 0), owner: null, flight: null, lastTouch: null, lastTeam: null },
    score: [0, 0], events: [], stats: [emptyStats(), emptyStats()], banner: null, focusUntil: 0, slowUntil: 0, protect: null, lastPass: null,
    pendingGoal: null, done: false, userEntered: cfg.userEntersAt === undefined, cache: { active: [], avg: 50, step: -1 },
    coachDone: {}, subs: [0, 0], userOutAt: null,
  };
  refreshCache(s);
  // Les joueurs démarrent à leur position de coup d'envoi.
  for (const p of players) {
    p.pos = kickoffTarget(s, p);
    p.target = { ...p.pos };
    p.facing = attackDir(s, p.team) > 0 ? 0 : Math.PI;
  }
  return s;
}

// ———————————————————————————————————————— utilitaires de jeu
function refreshCache(s: SimState) {
  const a = s.players.filter((p) => p.onPitch && !p.sentOff);
  s.cache.active = a;
  s.cache.avg = a.reduce((x, p) => x + (p.stats.technique + p.stats.passing + p.stats.defending + p.stats.speed) / 4, 0) / Math.max(1, a.length);
}
const active = (s: SimState) => s.cache.active;
const byId = (s: SimState, id: string | null) => (id ? s.players.find((p) => p.id === id) : undefined);
const teammates = (s: SimState, p: SimPlayer) => active(s).filter((q) => q.team === p.team && q.id !== p.id);
const opponents = (s: SimState, team: Side) => active(s).filter((q) => q.team !== team);
const keeper = (s: SimState, team: Side) => active(s).find((q) => q.team === team && q.role === 'GK');
const avgLevel = (s: SimState) => s.cache.avg;
/** Niveau relatif à la moyenne du match : les écarts comptent, pas l'âge des joueurs. */
const rel = (s: SimState, x: number) => x - avgLevel(s);
function maxSpeed(p: SimPlayer) {
  // rythme légèrement accéléré pour que 90 minutes tiennent en quelques minutes d'affichage
  const base = (5.6 + p.stats.speed / 100 * 2.4) * 1.15;
  return base * (0.72 + 0.28 * p.energy) * (p.injured ? 0.8 : 1);
}

function event(s: SimState, type: EventType, team: Side | null, player: string | null, text: string, key = false, banner?: Banner['kind'], bannerText?: string) {
  const e: SimEvent = { t: s.t, minute: Math.max(1, Math.ceil(minute(s))), type, team, player, text, key };
  s.events.push(e);
  if (banner) s.banner = { text: bannerText ?? text, kind: banner, until: s.t + 2.4, team };
}

function setAnim(p: SimPlayer, a: Anim, dur = 0, dir = 0) {
  p.anim = a;
  p.animT = 0;
  p.animDur = dur;
  p.animDir = dir;
}

function giveBall(s: SimState, p: SimPlayer, quiet = false) {
  const b = s.ball;
  const prevTeam = b.lastTeam;
  b.owner = p.id;
  b.flight = null;
  b.vel = v(0, 0);
  b.z = 0;
  b.lastTouch = p.id;
  b.lastTeam = p.team;
  p.tally.touches += 1;
  p.carryTarget = null;
  p.cooldown = 0.15 + (1 - p.stats.technique / 100) * 0.3 + nextFloat(s.rng) * 0.2;
  if (!quiet) setAnim(p, p.role === 'GK' && dist(p.pos, ownGoal(s, p.team)) < s.cfg.pitch.boxDepth + 2 ? 'catch' : 'control', 0.35);
  if (prevTeam !== null && prevTeam !== p.team && s.phase === 'play') s.lastPass = null;
}

function startFlight(s: SimState, f: Omit<Flight, 't'>) {
  const b = s.ball;
  b.owner = null;
  b.flight = { ...f, t: 0 };
  b.vel = v(0, 0);
}

/** Ramène le ballon à un point (arrêt de jeu) en le faisant rouler / voler : jamais de téléportation. */
function resetBall(s: SimState, to: Vec) {
  const d = dist(s.ball.pos, to);
  if (d < 0.2 && !s.ball.flight) {
    s.ball.owner = null;
    return;
  }
  startFlight(s, { kind: 'reset', from: { ...s.ball.pos }, to, dur: clamp(d / 14, 0.4, 3), peak: Math.min(6, d / 6), by: null, receiver: null });
}

// ———————————————————————————————————————— positions cibles (IA collective)
function anchor(s: SimState, p: SimPlayer, inPoss: boolean, ballA: Vec): Vec {
  const { L, W } = s.cfg.pitch;
  const tac = s.cfg.teams[p.team].tactic;
  const ment = tac.mentality === 'attacking' ? 0.04 : tac.mentality === 'defensive' ? -0.05 : 0;
  const depth = inPoss ? 0.14 + p.slot.x * 0.74 + ment : 0.06 + p.slot.x * 0.5 + ment;
  let ax = L * depth + (ballA.x - L * 0.5) * (inPoss ? 0.35 : 0.32);
  const width = (inPoss ? 0.82 + tac.width * 0.15 : 0.62) ;
  let ay = W * (0.5 + (p.slot.y - 0.5) * width) + (ballA.y - W / 2) * (inPoss ? 0.12 : 0.3);
  if (!inPoss && p.role !== 'GK') {
    // défenseurs et milieux restent entre le ballon et leur but ; les attaquants restent disponibles pour la contre-attaque
    if (p.role !== 'ATT') ax = Math.min(ax, Math.max(ballA.x - 2.5, L * 0.06));
    const floor = p.role === 'DEF' ? L * 0.07 : p.role === 'MID' ? L * 0.17 : L * 0.36;
    ax = Math.max(ax, Math.min(floor, ballA.x + (p.role === 'ATT' ? 25 : 0)));
  }
  if (inPoss && p.role === 'ATT') {
    // appels en profondeur, sans trop dépasser la ligne défensive adverse
    const line = defensiveLine(s, p.team === 0 ? 1 : 0, p.team);
    ax = clamp(Math.max(ax, ballA.x + 6), 0, line - 0.5);
  }
  // consignes individuelles du coach
  if (p.instruction === 'stay_high') ax += inPoss ? L * 0.06 : L * 0.12;
  if (p.instruction === 'hold_line' && !inPoss) ax -= L * 0.03;
  ax = clamp(ax, L * 0.04, L * 0.96);
  ay = clamp(ay, 1.5, W - 1.5);
  return fromA(s, p.team, v(ax, ay));
}

/** Ligne de l'avant-dernier défenseur de `defTeam`, exprimée dans le repère d'attaque de `attTeam`. */
function defensiveLine(s: SimState, defTeam: Side, attTeam: Side): number {
  const xs = opponents(s, attTeam).filter((q) => q.team === defTeam).map((q) => toA(s, attTeam, q.pos).x).sort((a, b) => b - a);
  return xs[1] ?? s.cfg.pitch.L * 0.8;
}

function keeperTarget(s: SimState, gk: SimPlayer): Vec {
  const g = ownGoal(s, gk.team);
  const toBall = sub(s.ball.pos, g);
  const d = len(toBall);
  const out = clamp(d * 0.1, 0.8, 5.5);
  const t = add(g, mul(norm(toBall), out));
  const half = s.cfg.pitch.goalW / 2 + 0.6;
  t.y = clamp(t.y, s.cfg.pitch.W / 2 - half, s.cfg.pitch.W / 2 + half);
  return t;
}

function kickoffTarget(s: SimState, p: SimPlayer): Vec {
  const { L, W } = s.cfg.pitch;
  if (p.role === 'GK') return fromA(s, p.team, v(1.2, W / 2));
  const kick = s.kickoffTeam === p.team;
  let ax = clamp(L * (0.06 + p.slot.x * 0.42), 3, L / 2 - 1.2);
  let ay = W * (0.5 + (p.slot.y - 0.5) * 0.8);
  const fromCenter = Math.hypot(ax - L / 2, ay - W / 2);
  if (!kick && fromCenter < s.cfg.pitch.circle + 1) ax = L / 2 - s.cfg.pitch.circle - 1.5;
  if (kick && p.id === kickoffTaker(s, p.team)?.id) { ax = L / 2 - 0.4; ay = W / 2; }
  return fromA(s, p.team, v(ax, ay));
}

function kickoffTaker(s: SimState, team: Side) {
  const atts = active(s).filter((q) => q.team === team && q.role === 'ATT');
  return atts[0] ?? active(s).find((q) => q.team === team && q.role === 'MID');
}

/** Calcule la cible de chaque joueur en phase de jeu. */
function assignPlayTargets(s: SimState) {
  const b = s.ball;
  const owner = byId(s, b.owner);
  const possTeam: Side | null = owner ? owner.team : b.flight && (b.flight.kind === 'pass' || b.flight.kind === 'cross') && b.flight.passOk ? (byId(s, b.flight.by)?.team ?? null) : b.lastTeam;
  const ballPos = b.flight ? b.flight.to : b.pos;
  const rest = predictRest(s);
  for (const team of [0, 1] as Side[]) {
    const inPoss = possTeam === team;
    const mates = active(s).filter((q) => q.team === team);
    // Presseurs : le plus proche du ballon (et un second si le pressing est élevé)
    const pressers = !inPoss ? [...mates].filter((q) => q.role !== 'GK' && q.instruction !== 'hold_line').sort((a, c) => dist(a.pos, ballPos) - dist(c.pos, ballPos)).slice(0, s.cfg.teams[team].tactic.pressing > 0.6 ? 2 : 1) : [];
    // Ballon libre : le plus proche de chaque équipe va le chercher
    const loose = !b.owner && (!b.flight || b.flight.kind === 'clear' || b.flight.kind === 'deflect');
    const chaser = loose ? [...mates].filter((q) => q.role !== 'GK' || dist(q.pos, ownGoal(s, team)) < s.cfg.pitch.boxDepth).sort((a, c) => dist(a.pos, rest) - dist(c.pos, rest))[0] : undefined;
    // Soutiens du porteur : deux coéquipiers proposent des solutions
    const supporters = inPoss && owner ? [...mates].filter((q) => q.id !== owner.id && q.role !== 'GK').sort((a, c) => dist(a.pos, owner.pos) - dist(c.pos, owner.pos)).slice(0, 2) : [];
    for (const p of mates) {
      if (owner && p.id === owner.id) continue;
      if (p.stun > 0) { p.target = { ...p.pos }; continue; }
      const f = b.flight;
      if (f && f.receiver === p.id) { p.target = { ...f.to }; continue; }
      if (p.role === 'GK') {
        const inBox = dist(rest, ownGoal(s, team)) < s.cfg.pitch.boxDepth * 0.75;
        p.target = loose && chaser?.id === p.id && inBox ? rest : keeperTarget(s, p);
        continue;
      }
      if (chaser && chaser.id === p.id) { p.target = rest; continue; }
      const instructedPress = p.instruction === 'press' && owner && !inPoss && dist(p.pos, owner.pos) < 22;
      if ((pressers.some((q) => q.id === p.id) || instructedPress) && owner) {
        // presser en restant côté but
        const g = ownGoal(s, team);
        p.target = add(owner.pos, mul(norm(sub(g, owner.pos)), pressers[0].id === p.id ? 0.6 : 4));
        continue;
      }
      let t = anchor(s, p, inPoss, ballPos);
      let si = supporters.findIndex((q) => q.id === p.id);
      if (si < 0 && p.instruction === 'support' && owner && inPoss) si = 0;
      if (si >= 0 && owner) {
        const dir = attackDir(s, team);
        const side = si === 0 ? (owner.pos.y < s.cfg.pitch.W / 2 ? 1 : -1) : (owner.pos.y < s.cfg.pitch.W / 2 ? -1 : 1);
        const sup = v(owner.pos.x + dir * (si === 0 ? 7 : -4), owner.pos.y + side * 11);
        t = v((t.x + sup.x * 2) / 3, (t.y + sup.y * 2) / 3);
      }
      if (!inPoss) {
        // marquage de zone : se rapprocher de l'adversaire le plus proche de sa zone, côté but
        const opp = opponents(s, team).filter((o) => o.role !== 'GK').sort((a, c) => dist(a.pos, t) - dist(c.pos, t))[0];
        if (opp && dist(opp.pos, t) < 12) {
          const g = ownGoal(s, team);
          const mark = add(opp.pos, mul(norm(sub(g, opp.pos)), 2));
          t = v(t.x * 0.72 + mark.x * 0.28, t.y * 0.72 + mark.y * 0.28);
        }
      }
      p.target = t;
    }
  }
}

/** Point où le ballon libre va s'arrêter (ou destination du vol). */
function predictRest(s: SimState): Vec {
  const b = s.ball;
  if (b.flight) return b.flight.to;
  const sp = len(b.vel);
  if (sp < 0.3) return { ...b.pos };
  const d = (sp * sp) / (2 * 4.5);
  const r = add(b.pos, mul(norm(b.vel), d));
  return v(clamp(r.x, 0, s.cfg.pitch.L), clamp(r.y, 0, s.cfg.pitch.W));
}

// ———————————————————————————————————————— décisions du porteur
interface Option {
  kind: 'pass' | 'shoot' | 'carry' | 'takeon' | 'clear' | 'hold';
  score: number;
  target?: SimPlayer;
}

function pressure(s: SimState, p: SimPlayer) {
  const d = Math.min(...opponents(s, p.team).map((o) => dist(o.pos, p.pos)), 99);
  return { d, level: clamp((4 - d) / 4, 0, 1) };
}

function shotQuality(s: SimState, p: SimPlayer, from = p.pos) {
  const g = goalOf(s, p.team);
  const d = dist(from, g);
  const half = s.cfg.pitch.goalW / 2;
  const a1 = Math.atan2(g.y - half - from.y, Math.abs(g.x - from.x));
  const a2 = Math.atan2(g.y + half - from.y, Math.abs(g.x - from.x));
  const angle = Math.abs(a2 - a1); // ouverture du but
  const scale = s.cfg.pitch.L / 105;
  const dq = clamp(1 - (d / scale - 5) / 28, 0.03, 1);
  return clamp(dq * clamp(angle / 0.55, 0.15, 1.1), 0, 1);
}

function decide(s: SimState, p: SimPlayer) {
  const { L } = s.cfg.pitch;
  const pr = pressure(s, p);
  const myA = toA(s, p.team, p.pos);
  const opts: Option[] = [];
  const mentality = s.cfg.teams[p.team].tactic.mentality;
  const noise = () => (rnd(s) - 0.5) * 0.3;
  if (p.role === 'GK') {
    // relance : courte vers un défenseur libre ou longue
    const mates = teammates(s, p).filter((q) => q.role !== 'GK');
    let best: Option | null = null;
    for (const t of mates) {
      const sc = passScore(s, p, t) + (t.role === 'DEF' ? 0.2 : 0) + noise();
      if (!best || sc > best.score) best = { kind: 'pass', score: sc, target: t };
    }
    return execute(s, p, best ?? { kind: 'clear', score: 0 });
  }
  const q = shotQuality(s, p);
  if (q > 0.08) {
    const late = minute(s) > 80 ? 0.1 : 0;
    const inBox = isInBox(s, p.pos, p.team === 0 ? 1 : 0);
    opts.push({ kind: 'shoot', score: q * 2.5 + (inBox ? 0.25 : 0) + (p.role === 'ATT' ? 0.12 : p.role === 'DEF' ? -0.2 : 0) + rel(s, p.stats.shooting) / 250 + late + (mentality === 'attacking' ? 0.06 : 0) - 0.12 + noise() });
  }
  for (const t of teammates(s, p)) {
    if (t.role === 'GK' && myA.x > L * 0.3) continue;
    const sc = passScore(s, p, t);
    if (sc > -5) opts.push({ kind: 'pass', score: sc + noise(), target: t });
  }
  const ahead = forwardSpace(s, p);
  opts.push({ kind: 'carry', score: (ahead > 9 ? 0.62 : ahead > 5 ? 0.3 : -0.2) + rel(s, p.stats.technique) / 300 + (p.role === 'DEF' ? -0.18 : 0) + (myA.x > L * 0.6 ? 0.12 : 0) + noise() });
  if (pr.d < 2.4) opts.push({ kind: 'takeon', score: 0.05 + rel(s, (p.stats.technique + p.stats.speed) / 2) / 160 + (p.role === 'ATT' ? 0.12 : 0) + noise() });
  if (myA.x < L * 0.28 && pr.level > 0.4) opts.push({ kind: 'clear', score: 0.25 + pr.level * 0.4 - rel(s, p.stats.passing) / 200 + noise() });
  opts.push({ kind: 'hold', score: -0.1 + noise() });
  // consignes : jouer simple ou provoquer
  if (p.instruction === 'safe') for (const o of opts) if (o.kind === 'takeon' || o.kind === 'carry' || o.kind === 'shoot') o.score -= 0.25;
  if (p.instruction === 'freedom') for (const o of opts) if (o.kind === 'takeon' || o.kind === 'carry') o.score += 0.22; else if (o.kind === 'shoot') o.score += 0.1;
  opts.sort((a, b) => b.score - a.score);
  execute(s, p, opts[0]);
}

function forwardSpace(s: SimState, p: SimPlayer) {
  const dir = attackDir(s, p.team);
  let m = 99;
  for (const o of opponents(s, p.team)) {
    const dx = (o.pos.x - p.pos.x) * dir;
    if (dx > -1 && dx < 14 && Math.abs(o.pos.y - p.pos.y) < 6 + dx * 0.4) m = Math.min(m, dist(o.pos, p.pos));
  }
  return m;
}

function interceptRisk(s: SimState, from: Vec, to: Vec, team: Side) {
  let risk = 0;
  let best: { o: SimPlayer; d: number; t: number } | null = null;
  for (const o of opponents(s, team)) {
    const { d, t } = segDist(o.pos, from, to);
    if (t < 0.08) continue;
    const r = d < 3 ? ((3 - d) / 3) * 0.5 : 0;
    risk += r;
    if (!best || d < best.d) best = { o, d, t };
  }
  return { risk: Math.min(1, risk), best };
}

function passScore(s: SimState, p: SimPlayer, t: SimPlayer) {
  const d = dist(p.pos, t.pos);
  if (d < 4 || d > 48) return -9;
  const { L } = s.cfg.pitch;
  const tA = toA(s, p.team, t.pos).x;
  const raw = (tA - toA(s, p.team, p.pos).x) / L;
  const progress = raw < 0 ? raw * 2.2 : raw;
  const tOpen = Math.min(...opponents(s, p.team).map((o) => dist(o.pos, t.pos)), 20);
  const { risk } = interceptRisk(s, p.pos, t.pos, p.team);
  const shortBias = p.instruction === 'short_build' ? (d < 20 ? 0.2 : -0.25) : 0;
  return shortBias + 0.32 + progress * 1.9 + Math.min(tOpen, 8) / 8 * 0.45 - d / 80 - risk * 0.8 + (tA > L * 0.68 ? 0.22 : 0) + rel(s, p.stats.passing) / 400 + (t.isUser ? 0.04 : 0);
}

function execute(s: SimState, p: SimPlayer, o: Option) {
  switch (o.kind) {
    case 'pass': return doPass(s, p, o.target!);
    case 'shoot': return doShot(s, p, 'open');
    case 'carry': {
      const dir = attackDir(s, p.team);
      const near = opponents(s, p.team).sort((a, b) => dist(a.pos, p.pos) - dist(b.pos, p.pos))[0];
      let lateral = 0;
      if (near && dist(near.pos, p.pos) < 7) lateral = near.pos.y > p.pos.y ? -3 : 3;
      const goal = goalOf(s, p.team);
      const towardGoal = toA(s, p.team, p.pos).x > s.cfg.pitch.L * 0.65 ? (goal.y - p.pos.y) * 0.25 : 0;
      p.carryTarget = v(clamp(p.pos.x + dir * 8, 1, s.cfg.pitch.L - 1), clamp(p.pos.y + lateral + towardGoal, 1.5, s.cfg.pitch.W - 1.5));
      p.cooldown = 0.4 + rnd(s) * 0.35;
      setAnim(p, 'dribble');
      return;
    }
    case 'takeon': return doTakeOn(s, p);
    case 'clear': return doClear(s, p);
    default:
      p.carryTarget = null;
      p.cooldown = 0.35 + rnd(s) * 0.3;
      setAnim(p, 'control', 0.35);
  }
}

// ———————————————————————————————————————— actions résolues
function doPass(s: SimState, p: SimPlayer, t: SimPlayer, forceOk = false) {
  const from = { ...s.ball.pos };
  const d = dist(p.pos, t.pos);
  const speed = clamp(14 + d * 0.4, 14, 28);
  const lead = mul(t.vel, clamp(d / speed, 0.2, 1.4) * 0.8);
  let to = add(t.pos, lead);
  to = v(clamp(to.x, 0.5, s.cfg.pitch.L - 0.5), clamp(to.y, 0.5, s.cfg.pitch.W - 0.5));
  const { risk, best } = interceptRisk(s, from, to, p.team);
  const pr = pressure(s, p);
  let ok = forceOk;
  if (!forceOk) {
    const prob = clamp(0.93 - (d / 50) * 0.3 - risk * 0.55 + rel(s, p.stats.passing) / 160 - pr.level * 0.1 + (p.energy - 0.75) * 0.15, 0.2, 0.97);
    ok = rnd(s) < prob;
  }
  p.tally.passes += 1;
  s.stats[p.team].passes += 1;
  setAnim(p, 'pass', 0.4, Math.atan2(to.y - p.pos.y, to.x - p.pos.x));
  p.facing = Math.atan2(to.y - p.pos.y, to.x - p.pos.x);
  p.cooldown = 0.6;
  s.lastPass = { by: p.id, team: p.team, t: s.t };
  const lofted = d > 26;
  if (ok) {
    p.tally.passesOk += 1;
    s.stats[p.team].passesOk += 1;
    startFlight(s, { kind: 'pass', from, to, dur: dist(from, to) / speed, peak: lofted ? Math.min(8, d / 5) : 0, by: p.id, receiver: t.id, passOk: true });
    s.protect = { id: t.id, until: s.t + dist(from, to) / speed + 0.5 };
  } else if (best && best.d < 4) {
    // interception : le ballon va au point de coupe, l'adversaire y court
    const cut = add(from, mul(sub(to, from), best.t));
    startFlight(s, { kind: 'pass', from, to: cut, dur: Math.max(0.25, dist(from, cut) / speed), peak: lofted ? Math.min(6, d / 6) : 0, by: p.id, receiver: best.o.id, passOk: false });
    s.protect = { id: best.o.id, until: s.t + dist(from, cut) / speed + 0.6 };
  } else {
    // passe imprécise : le ballon file à côté, ballon libre
    const off = v((rnd(s) - 0.5) * 12, (rnd(s) - 0.5) * 12);
    const miss = add(to, off);
    startFlight(s, { kind: 'pass', from, to: v(clamp(miss.x, -1, s.cfg.pitch.L + 1), clamp(miss.y, -1, s.cfg.pitch.W + 1)), dur: dist(from, miss) / speed, peak: lofted ? Math.min(7, d / 5) : 0, by: p.id, receiver: null, passOk: false });
    s.protect = null;
  }
}

function doClear(s: SimState, p: SimPlayer) {
  const dir = attackDir(s, p.team);
  const L = s.cfg.pitch.L;
  const to = v(clamp(p.pos.x + dir * (L * 0.3 + rnd(s) * L * 0.15), 2, L - 2), clamp(p.pos.y + (rnd(s) - 0.5) * 30, 2, s.cfg.pitch.W - 2));
  setAnim(p, 'shoot', 0.45, Math.atan2(to.y - p.pos.y, to.x - p.pos.x));
  startFlight(s, { kind: 'clear', from: { ...s.ball.pos }, to, dur: dist(p.pos, to) / 20, peak: 9, by: p.id, receiver: null });
  s.ball.lastTouch = p.id;
  s.ball.lastTeam = p.team;
  p.cooldown = 0.6;
  s.protect = null;
}

function doTakeOn(s: SimState, p: SimPlayer) {
  const def = opponents(s, p.team).sort((a, b) => dist(a.pos, p.pos) - dist(b.pos, p.pos))[0];
  if (!def) return;
  const prob = clamp(0.5 + (rel(s, (p.stats.technique + p.stats.speed) / 2) - rel(s, def.stats.defending)) / 110 + (p.energy - def.energy) * 0.2, 0.15, 0.82);
  def.tally.tackles += 1;
  if (rnd(s) < prob) {
    setAnim(def, 'tackle', 0.6, Math.atan2(p.pos.y - def.pos.y, p.pos.x - def.pos.x));
    def.stun = 0.9;
    const dir = attackDir(s, p.team);
    p.carryTarget = v(clamp(p.pos.x + dir * 7, 1, s.cfg.pitch.L - 1), clamp(p.pos.y + (def.pos.y > p.pos.y ? -2.5 : 2.5), 1.5, s.cfg.pitch.W - 1.5));
    p.cooldown = 0.6;
    setAnim(p, 'dribble');
  } else {
    winTackle(s, def, p);
  }
}

function winTackle(s: SimState, def: SimPlayer, victim: SimPlayer) {
  def.tally.tacklesWon += 1;
  setAnim(def, 'tackle', 0.5, Math.atan2(victim.pos.y - def.pos.y, victim.pos.x - def.pos.x));
  victim.stun = 0.5;
  // le ballon est poussé vers le défenseur (trajectoire courte), puis récupéré
  const to = add(def.pos, mul(norm(sub(def.pos, victim.pos)), 1.2));
  startFlight(s, { kind: 'deflect', from: { ...s.ball.pos }, to, dur: 0.25, peak: 0, by: def.id, receiver: def.id });
  s.ball.lastTouch = def.id;
  s.ball.lastTeam = def.team;
  s.protect = { id: def.id, until: s.t + 0.5 };
  event(s, 'tackle', def.team, def.id, `${def.name} récupère le ballon.`);
}

/** Tentative de tacle d'un défenseur au contact du porteur. */
function tryTackle(s: SimState, def: SimPlayer, carrier: SimPlayer) {
  def.cooldown = 1.1 + rnd(s) * 0.6;
  def.tally.tackles += 1;
  const tac = s.cfg.teams[def.team].tactic;
  const prob = clamp(0.36 + (rel(s, def.stats.defending) - rel(s, carrier.stats.technique)) / 130 + tac.pressing * 0.05 + (def.energy - 0.7) * 0.2, 0.1, 0.72);
  if (rnd(s) < prob) {
    winTackle(s, def, carrier);
    return;
  }
  setAnim(def, 'tackle', 0.6, Math.atan2(carrier.pos.y - def.pos.y, carrier.pos.x - def.pos.x));
  def.stun = 0.7;
  if (rnd(s) < 0.2) foul(s, def, carrier);
}

function foul(s: SimState, def: SimPlayer, victim: SimPlayer) {
  def.tally.fouls += 1;
  s.stats[def.team].fouls += 1;
  setAnim(victim, 'down', 1.4);
  victim.stun = 1.4;
  const inBox = isInBox(s, victim.pos, def.team);
  event(s, 'foul', def.team, def.id, `Faute de ${def.name} sur ${victim.name}.`);
  // carton ?
  const r = rnd(s);
  if (r < (inBox ? 0.3 : 0.16)) {
    def.yellow += 1;
    def.cardUntil = s.t + 2.5;
    if (def.yellow >= 2) {
      def.sentOff = true;
      refreshCache(s);
      s.stats[def.team].reds += 1;
      event(s, 'red', def.team, def.id, `Deuxième jaune : ${def.name} est expulsé !`, true, 'card', '🟥 Carton rouge !');
    } else {
      s.stats[def.team].yellows += 1;
      event(s, 'yellow', def.team, def.id, `Carton jaune pour ${def.name}.`, true, 'card', '🟨 Carton jaune');
    }
  }
  if (rnd(s) < 0.05) {
    victim.injured = true;
    victim.stun = 3;
    setAnim(victim, 'down', 3);
    event(s, 'injury', victim.team, victim.id, `${victim.name} reste au sol, touché.`, true, 'injury', 'Blessure');
  }
  const spot = { ...victim.pos };
  if (inBox) {
    const g = ownGoal(s, def.team);
    const pen = v(g.x + (g.x === 0 ? s.cfg.pitch.spot : -s.cfg.pitch.spot), g.y);
    setRestart(s, 'penalty', victim.team, pen, bestShooter(s, victim.team).id, 3.2);
    event(s, 'penalty', victim.team, victim.id, `Penalty pour ${s.cfg.teams[victim.team].name} !`, true, 'penalty', 'PENALTY !');
  } else {
    const dangerous = dist(spot, goalOf(s, victim.team)) < 30 * (s.cfg.pitch.L / 105);
    setRestart(s, 'freekick', victim.team, spot, dangerous ? bestShooter(s, victim.team).id : victim.id, 2.4);
    event(s, 'freekick', victim.team, victim.id, dangerous ? `Coup franc dangereux pour ${s.cfg.teams[victim.team].name}.` : `Coup franc pour ${s.cfg.teams[victim.team].name}.`, dangerous, dangerous ? 'info' : undefined, 'Coup franc dangereux');
  }
}

function isInBox(s: SimState, p: Vec, defTeam: Side) {
  const g = ownGoal(s, defTeam);
  return Math.abs(p.x - g.x) < s.cfg.pitch.boxDepth && Math.abs(p.y - g.y) < s.cfg.pitch.boxW / 2;
}

function bestShooter(s: SimState, team: Side) {
  return active(s).filter((q) => q.team === team && q.role !== 'GK').sort((a, b) => b.stats.shooting - a.stats.shooting)[0];
}

type ShotKind = 'open' | 'penalty' | 'freekick' | 'header';

/** Résout un tir puis lance la trajectoire correspondante. */
function doShot(s: SimState, p: SimPlayer, kind: ShotKind) {
  const g = goalOf(s, p.team);
  const gk = keeper(s, p.team === 0 ? 1 : 0);
  const pr = pressure(s, p);
  const q = kind === 'penalty' ? 0.75 : shotQuality(s, p);
  const ref = gk ? gk.stats.reflexes : 30;
  let outcome: ShotOutcome;
  if (kind === 'penalty') {
    outcome = rnd(s) < 0.9 ? (rnd(s) < clamp(0.74 + (p.stats.shooting - ref) / 250, 0.55, 0.9) ? 'goal' : 'saved') : 'miss';
  } else {
    // contre : un défenseur sur la trajectoire
    const block = opponents(s, p.team).find((o) => o.role !== 'GK' && segDist(o.pos, p.pos, g).d < 1.1 && dist(o.pos, p.pos) < 7);
    const onP = clamp(0.3 + q * 0.38 + rel(s, p.stats.shooting) / 170 + (p.energy - 0.75) * 0.15 - pr.level * 0.12 + (kind === 'header' ? -0.08 : 0), 0.12, 0.86);
    if (block && rnd(s) < 0.5) outcome = 'blocked';
    else if (rnd(s) < onP) {
      const goalP = clamp(0.36 + q * 0.5 + (p.stats.shooting - ref) / 160 + (kind === 'freekick' ? -0.06 : 0), 0.06, 0.82);
      outcome = rnd(s) < goalP ? 'goal' : rnd(s) < 0.45 ? 'caught' : 'saved';
    } else outcome = 'miss';
    if (block && outcome === 'blocked') {
      p.tally.shots += 1;
      s.stats[p.team].shots += 1;
      setAnim(p, kind === 'header' ? 'header' : 'shoot', 0.5, Math.atan2(g.y - p.pos.y, g.x - p.pos.x));
      startFlight(s, { kind: 'shot', from: { ...s.ball.pos }, to: { ...block.pos }, dur: Math.max(0.15, dist(p.pos, block.pos) / 26), peak: 0.5, by: p.id, receiver: null, shot: 'blocked' });
      setAnim(block, 'tackle', 0.5, Math.atan2(p.pos.y - block.pos.y, p.pos.x - block.pos.x));
      event(s, 'blocked', block.team, block.id, `Tir de ${p.name} contré par ${block.name}.`);
      s.ball.lastTouch = p.id;
      s.ball.lastTeam = p.team;
      return;
    }
  }
  p.tally.shots += 1;
  s.stats[p.team].shots += 1;
  const half = s.cfg.pitch.goalW / 2;
  const goalLineDir = g.x > 0 ? 1 : -1;
  let to: Vec;
  let endZ = 0.6 + rnd(s) * 1.4;
  if (outcome === 'goal') {
    const gy = gk ? gk.pos.y : g.y;
    const side = gy > g.y ? -1 : 1;
    to = v(g.x + goalLineDir * 1.2, g.y + side * (half * (0.45 + rnd(s) * 0.45)));
  } else if (outcome === 'saved' || outcome === 'caught') {
    const ty = g.y + (rnd(s) - 0.5) * half * 1.4;
    to = v(g.x - goalLineDir * 0.4, ty);
    endZ = outcome === 'caught' ? 1.0 : 0.5 + rnd(s) * 1.5;
  } else {
    // à côté ou au-dessus
    const wide = rnd(s) < 0.6;
    to = wide ? v(g.x + goalLineDir * 2, g.y + (rnd(s) < 0.5 ? -1 : 1) * (half + 1 + rnd(s) * 4)) : v(g.x + goalLineDir * 2, g.y + (rnd(s) - 0.5) * half * 1.6);
    endZ = wide ? 0.8 : s.cfg.pitch.goalH + 0.8 + rnd(s) * 2;
  }
  if (outcome !== 'miss') {
    p.tally.shotsOn += 1;
    s.stats[p.team].shotsOn += 1;
  }
  const speed = kind === 'header' ? 15 : 24 + p.stats.shooting / 25;
  setAnim(p, kind === 'header' ? 'header' : 'shoot', 0.55, Math.atan2(to.y - p.pos.y, to.x - p.pos.x));
  p.facing = Math.atan2(to.y - p.pos.y, to.x - p.pos.x);
  startFlight(s, { kind: 'shot', from: { ...s.ball.pos }, to, dur: Math.max(0.25, dist(s.ball.pos, to) / speed), peak: kind === 'header' ? 0.5 : outcome === 'miss' && endZ > 2.5 ? endZ : 0.7, by: p.id, receiver: outcome === 'caught' ? gk?.id ?? null : null, shot: outcome, endZ, header: kind === 'header' });
  s.ball.lastTouch = p.id;
  s.ball.lastTeam = p.team;
  s.protect = null;
  // Le gardien plonge vers le point d'arrivée
  if (gk && outcome !== 'miss') {
    const dy = to.y - gk.pos.y;
    setAnim(gk, Math.abs(dy) > 1.2 ? 'dive' : 'catch', 0.9, Math.atan2(dy, 0.0001));
    gk.target = v(gk.pos.x, outcome === 'goal' ? gk.pos.y + dy * 0.55 : to.y);
  }
  const label = kind === 'penalty' ? 'Penalty' : kind === 'freekick' ? 'Coup franc direct' : kind === 'header' ? 'Tête' : 'Frappe';
  const chance = q > 0.42 || kind !== 'open';
  event(s, 'shot', p.team, p.id, `${label} de ${p.name}.`, chance, chance && kind === 'open' ? 'chance' : undefined, 'Occasion dangereuse !');
  if (chance) {
    s.slowUntil = s.t + 1.1;
    s.focusUntil = s.t + 1.6;
  }
}

// ———————————————————————————————————————— arrêts de jeu
function setRestart(s: SimState, kind: RestartKind, team: Side, spot: Vec, taker: string, delay: number) {
  s.phase = 'restart';
  s.phaseT = 0;
  s.restart = { kind, team, spot, taker, readyAt: delay };
  s.protect = null;
  const b = s.ball;
  b.owner = null;
  resetBall(s, spot);
  for (const p of active(s)) p.carryTarget = null;
}

function restartTargets(s: SimState) {
  const r = s.restart!;
  for (const p of active(s)) {
    if (p.id === r.taker) {
      const g = goalOf(s, p.team);
      const back = norm(sub(r.spot, g));
      p.target = r.kind === 'throwin' ? { ...r.spot } : add(r.spot, mul(back, 0.6));
      continue;
    }
    if (p.role === 'GK') { p.target = keeperTarget(s, p); continue; }
    const att = p.team === r.team;
    let t = anchor(s, p, att, r.spot);
    if (r.kind === 'corner' || (r.kind === 'freekick' && dist(r.spot, goalOf(s, r.team)) < 32)) {
      const defTeam: Side = r.team === 0 ? 1 : 0;
      const g = ownGoal(s, defTeam);
      const dirIn = g.x === 0 ? 1 : -1;
      if (att && (p.role === 'ATT' || p.role === 'MID' || (p.role === 'DEF' && p.slot.y > 0.3 && p.slot.y < 0.7))) {
        const k = (p.slot.y - 0.5) * 2;
        t = v(g.x + dirIn * (6 + Math.abs(k) * 6), g.y + k * 8);
      } else if (!att) {
        const k = (p.slot.y - 0.5) * 2;
        t = v(g.x + dirIn * (4 + (p.role === 'DEF' ? 2 : 9)), g.y + k * 9);
      }
    }
    if (r.kind === 'penalty') {
      const defTeam: Side = r.team === 0 ? 1 : 0;
      const g = ownGoal(s, defTeam);
      const dirIn = g.x === 0 ? 1 : -1;
      const minX = s.cfg.pitch.boxDepth + 1.5;
      const off = Math.abs(t.x - g.x);
      if (off < minX) t = v(g.x + dirIn * (minX + (p.slot.y * 3)), t.y);
    }
    if (r.kind === 'freekick' && !att && dist(t, r.spot) < 9) t = add(r.spot, mul(norm(sub(t, r.spot)), 9.2));
    p.target = t;
  }
}

function executeRestart(s: SimState) {
  const r = s.restart!;
  const taker = byId(s, r.taker);
  s.phase = 'play';
  s.phaseT = 0;
  s.restart = null;
  if (!taker || taker.sentOff) return;
  giveBall(s, taker, true);
  if (r.kind === 'penalty') return doShot(s, taker, 'penalty');
  if (r.kind === 'freekick' && dist(r.spot, goalOf(s, r.team)) < 28 * (s.cfg.pitch.L / 105) && shotQuality(s, taker) > 0.2) return doShot(s, taker, 'freekick');
  if (r.kind === 'corner') return doCross(s, taker);
  const mates = teammates(s, taker).filter((q) => q.role !== 'GK');
  const target = mates.sort((a, b) => passScore(s, taker, b) - passScore(s, taker, a))[0];
  if (target) doPass(s, taker, target, r.kind === 'throwin' || r.kind === 'goalkick' ? rnd(s) < 0.85 : false);
}

/** Centre (corner) : duel aérien résolu au départ, reprise de la tête à l'arrivée si l'attaquant gagne. */
function doCross(s: SimState, taker: SimPlayer) {
  const defTeam: Side = taker.team === 0 ? 1 : 0;
  const g = ownGoal(s, defTeam);
  const dirIn = g.x === 0 ? 1 : -1;
  const spot = v(g.x + dirIn * (6 + rnd(s) * 6), g.y + (rnd(s) - 0.5) * 12);
  const atts = active(s).filter((q) => q.team === taker.team && q.id !== taker.id && q.role !== 'GK').sort((a, b) => dist(a.pos, spot) - dist(b.pos, spot));
  const defs = active(s).filter((q) => q.team === defTeam && q.role !== 'GK').sort((a, b) => dist(a.pos, spot) - dist(b.pos, spot));
  const a = atts[0];
  const d = defs[0];
  const attWins = a && (!d || rnd(s) < clamp(0.42 + (rel(s, a.stats.positioning) - rel(s, d.stats.defending)) / 120, 0.15, 0.7));
  const winner = attWins ? a : d ?? a;
  setAnim(taker, 'pass', 0.45, Math.atan2(spot.y - taker.pos.y, spot.x - taker.pos.x));
  taker.tally.passes += 1;
  s.stats[taker.team].passes += 1;
  startFlight(s, { kind: 'cross', from: { ...s.ball.pos }, to: spot, dur: dist(taker.pos, spot) / 18, peak: 7, by: taker.id, receiver: winner?.id ?? null, passOk: !!attWins, header: true });
  s.protect = winner ? { id: winner.id, until: s.t + 3 } : null;
  s.lastPass = { by: taker.id, team: taker.team, t: s.t };
}

function checkOut(s: SimState) {
  const b = s.ball;
  const { L, W } = s.cfg.pitch;
  if (b.owner || s.phase !== 'play') return;
  if (b.flight && b.flight.kind === 'shot') return; // géré à l'arrivée du tir
  const out = b.pos.x < -0.3 || b.pos.x > L + 0.3 || b.pos.y < -0.3 || b.pos.y > W + 0.3;
  if (!out) return;
  const last = b.lastTeam ?? 0;
  const other: Side = last === 0 ? 1 : 0;
  if (b.pos.y < -0.3 || b.pos.y > W + 0.3) {
    const spot = v(clamp(b.pos.x, 1, L - 1), b.pos.y < 0 ? 0 : W);
    const taker = active(s).filter((q) => q.team === other && q.role !== 'GK').sort((a, c) => dist(a.pos, spot) - dist(c.pos, spot))[0];
    if (taker) { setRestart(s, 'throwin', other, spot, taker.id, 1.2); event(s, 'throwin', other, taker.id, `Touche pour ${s.cfg.teams[other].name}.`); }
    return;
  }
  // ligne de but
  const goalX = b.pos.x < 0 ? 0 : L;
  const defTeam: Side = goalX === ownGoal(s, 0).x ? 0 : 1;
  if (last === defTeam) {
    const att: Side = defTeam === 0 ? 1 : 0;
    const spot = v(goalX === 0 ? 0.5 : L - 0.5, b.pos.y < W / 2 ? 0.5 : W - 0.5);
    const taker = active(s).filter((q) => q.team === att && q.role !== 'GK').sort((a, c) => c.stats.passing - a.stats.passing)[0];
    s.stats[att].corners += 1;
    setRestart(s, 'corner', att, spot, taker.id, 2.6);
    event(s, 'corner', att, taker.id, `Corner pour ${s.cfg.teams[att].name}.`);
  } else {
    const gk = keeper(s, defTeam);
    const spot = v(goalX === 0 ? s.cfg.pitch.sixDepth : L - s.cfg.pitch.sixDepth, W / 2 + (b.pos.y < W / 2 ? -4 : 4));
    if (gk) { setRestart(s, 'goalkick', defTeam, spot, gk.id, 1.6); event(s, 'goalkick', defTeam, gk.id, `Six mètres pour ${s.cfg.teams[defTeam].name}.`); }
  }
}

// ———————————————————————————————————————— ballon
function updateBall(s: SimState) {
  const b = s.ball;
  const owner = byId(s, b.owner);
  if (owner) {
    // conduite de balle : le ballon reste devant les pieds
    const ahead = owner.anim === 'dribble' || len(owner.vel) > 1 ? 0.75 : 0.45;
    const want = add(owner.pos, v(Math.cos(owner.facing) * ahead, Math.sin(owner.facing) * ahead));
    b.pos = add(b.pos, mul(sub(want, b.pos), 0.5));
    b.z = 0;
    return;
  }
  const f = b.flight;
  if (f) {
    f.t += DT;
    const k = clamp(f.t / f.dur, 0, 1);
    const prev = { ...b.pos };
    b.pos = add(f.from, mul(sub(f.to, f.from), f.kind === 'reset' ? k : k));
    const endZ = f.endZ ?? 0;
    b.z = f.peak > 0 ? 4 * f.peak * k * (1 - k) + endZ * k : endZ * k;
    b.vel = mul(sub(b.pos, prev), 1 / DT);
    if (f.kind === 'shot') checkShotLine(s, f);
    if (k >= 1) arrive(s, f);
    return;
  }
  // ballon libre : roulement avec frottement
  const sp = len(b.vel);
  if (sp > 0) {
    const ns = Math.max(0, sp - 4.5 * DT);
    b.vel = mul(norm(b.vel), ns);
    b.pos = add(b.pos, mul(b.vel, DT));
  }
  b.z = Math.max(0, b.z - 6 * DT);
}

/** Le but est validé au moment où le ballon franchit la ligne (et seulement si la simulation l'a décidé). */
function checkShotLine(s: SimState, f: Flight) {
  const { L } = s.cfg.pitch;
  const b = s.ball;
  if (f.shot === 'goal' && !s.pendingGoal && (b.pos.x <= 0 || b.pos.x >= L)) {
    const shooter = byId(s, f.by)!;
    const assist = s.lastPass && s.lastPass.team === shooter.team && s.lastPass.by !== shooter.id && s.t - s.lastPass.t < 8 ? s.lastPass.by : null;
    s.pendingGoal = { team: shooter.team, scorer: shooter.id, assist };
    scoreGoal(s);
  }
}

function scoreGoal(s: SimState) {
  const g = s.pendingGoal!;
  s.score[g.team] += 1;
  const scorer = byId(s, g.scorer)!;
  scorer.tally.goals += 1;
  const assist = byId(s, g.assist);
  if (assist) assist.tally.assists += 1;
  event(s, 'goal', g.team, scorer.id, `BUT de ${scorer.name} pour ${s.cfg.teams[g.team].name}${assist ? ` (passe de ${assist.name})` : ''} ! ${s.score[0]}–${s.score[1]}`, true, 'goal', 'BUT !');
  s.focusUntil = s.t + 3;
  s.phase = 'goal';
  s.phaseT = 0;
  s.protect = null;
  for (const p of active(s)) p.carryTarget = null;
  setAnim(scorer, 'celebrate', 4);
}

function arrive(s: SimState, f: Flight) {
  const b = s.ball;
  b.flight = null;
  const dir = norm(sub(f.to, f.from));
  if (f.kind === 'reset') {
    b.vel = v(0, 0);
    b.z = 0;
    return;
  }
  if (f.kind === 'shot') {
    const shooter = byId(s, f.by);
    const gk = shooter ? keeper(s, shooter.team === 0 ? 1 : 0) : undefined;
    if (f.shot === 'goal') {
      b.vel = mul(dir, 1.5); // dans les filets
      b.z = 0.3;
      return;
    }
    if (f.shot === 'caught' && gk) {
      gk.tally.saves += 1;
      event(s, 'save', gk.team, gk.id, `${gk.name} capte le ballon.`, true, 'save', 'Bien capté !');
      giveBall(s, gk);
      setAnim(gk, 'catch', 0.7);
      gk.cooldown = 1.4;
      return;
    }
    if (f.shot === 'saved' && gk) {
      gk.tally.saves += 1;
      event(s, 'save', gk.team, gk.id, `Arrêt de ${gk.name} !`, true, 'save', 'Quel arrêt !');
      // repoussé vers le côté (souvent en corner)
      const side = b.pos.y < s.cfg.pitch.W / 2 ? -1 : 1;
      b.vel = v(-dir.x * 3 + (rnd(s) < 0.5 ? dir.x * 4 : 0), side * (6 + rnd(s) * 6));
      b.lastTouch = gk.id;
      b.lastTeam = gk.team;
      b.z = 0.5;
      return;
    }
    if (f.shot === 'blocked') {
      b.vel = v(-dir.x * (3 + rnd(s) * 5), (rnd(s) - 0.5) * 10);
      return;
    }
    // manqué : le ballon continue et sort
    event(s, 'miss', shooter?.team ?? null, shooter?.id ?? null, `${shooter?.name ?? 'Le tir'} manque le cadre.`);
    b.vel = mul(dir, 6);
    return;
  }
  // passe, centre, dégagement, déviation
  const rec = byId(s, f.receiver);
  if (f.kind === 'cross' && f.header && rec && dist(rec.pos, f.to) < 3) {
    const atk = byId(s, f.by);
    if (atk && rec.team === atk.team) {
      giveBall(s, rec, true);
      doShot(s, rec, 'header');
      return;
    }
    // le défenseur dégage de la tête
    setAnim(rec, 'header', 0.5);
    giveBall(s, rec, true);
    rec.tally.interceptions += 1;
    doClear(s, rec);
    return;
  }
  if (rec && dist(rec.pos, b.pos) < 2.2) {
    if (f.passOk === false && f.kind === 'pass') {
      rec.tally.interceptions += 1;
      event(s, 'interception', rec.team, rec.id, `Interception de ${rec.name}.`);
    }
    giveBall(s, rec);
    return;
  }
  // personne au point d'arrivée : le ballon continue de rouler
  b.vel = mul(dir, f.kind === 'clear' ? 5 : 3.5);
}

// ———————————————————————————————————————— récupération du ballon libre
function checkPossession(s: SimState) {
  const b = s.ball;
  if (b.owner || b.z > 1.3) return;
  if (b.flight && b.flight.kind !== 'deflect' && b.flight.kind !== 'clear') return;
  if (s.phase !== 'play') return;
  const cand = active(s)
    .filter((p) => p.stun <= 0 && dist(p.pos, b.pos) < (p.role === 'GK' && isInBox(s, b.pos, p.team) ? 1.8 : CONTROL_R))
    .filter((p) => !s.protect || s.t > s.protect.until || p.id === s.protect.id)
    .sort((a, c) => dist(a.pos, b.pos) - dist(c.pos, b.pos));
  if (!cand.length) return;
  let winner = cand[0];
  const rival = cand.find((p) => p.team !== winner.team);
  if (rival && dist(rival.pos, b.pos) < CONTROL_R) {
    // duel pour un ballon libre
    const pa = 0.5 + (rel(s, winner.stats.technique + winner.stats.speed) - rel(s, rival.stats.defending + rival.stats.speed)) / 400;
    if (rnd(s) > pa) winner = rival;
  }
  if (b.lastTeam !== null && b.lastTeam !== winner.team && s.lastPass && s.lastPass.team !== winner.team) {
    winner.tally.interceptions += 1;
  }
  if (b.flight) b.flight = null;
  giveBall(s, winner);
}

// ———————————————————————————————————————— joueurs
function movePlayers(s: SimState) {
  const ps = active(s);
  for (const p of ps) {
    p.animT += DT;
    if (p.animDur > 0 && p.animT >= p.animDur) { p.anim = 'idle'; p.animDur = 0; }
    p.stun = Math.max(0, p.stun - DT);
    p.cooldown -= DT;
    let target = p.target;
    const owner = s.ball.owner === p.id;
    if (owner && p.carryTarget) target = p.carryTarget;
    const to = sub(target, p.pos);
    const d = len(to);
    let speed = maxSpeed(p);
    if (owner) speed *= 0.82 + p.stats.technique / 600;
    const urgent = s.ball.flight?.receiver === p.id || (!s.ball.owner && dist(p.pos, s.ball.pos) < 15);
    let desired = d < 0.25 ? 0 : d > 8 || urgent ? speed : d > 2 ? speed * 0.7 : speed * 0.4;
    if (s.phase !== 'play' && !urgent) desired = Math.min(desired, speed * 0.75);
    if (p.stun > 0 || (p.animDur > 0 && (p.anim === 'down' || p.anim === 'celebrate' && s.phase !== 'goal'))) desired *= p.anim === 'down' ? 0 : 0.3;
    let want = mul(norm(to), desired);
    // séparation : éviter que les joueurs se superposent
    for (const q of ps) {
      if (q === p) continue;
      const dd = dist(p.pos, q.pos);
      const R = q.team === p.team ? 2.6 : 1.4;
      if (dd < R && dd > 1e-3) want = add(want, mul(norm(sub(p.pos, q.pos)), (R - dd) * 2.4));
    }
    const dv = sub(want, p.vel);
    const maxA = 9 * DT;
    const dl = len(dv);
    p.vel = dl > maxA ? add(p.vel, mul(dv, maxA / dl)) : want;
    const step = mul(p.vel, DT);
    p.pos = add(p.pos, step);
    const moved = len(step);
    p.tally.distance += moved;
    p.runPhase += moved * 2.2;
    const sp = len(p.vel);
    if (sp > 0.3) p.facing = Math.atan2(p.vel.y, p.vel.x);
    if (owner && s.ball.flight === null && p.carryTarget && d < 0.6) p.carryTarget = null;
    // endurance
    const effort = (sp / 8) ** 2;
    p.energy = clamp(p.energy - effort * DT * 0.0035 * (1.6 - p.stats.stamina / 100) + (sp < 2 ? DT * 0.0008 : 0), 0.25, 1);
    // animation de déplacement
    if (p.animDur === 0 && p.anim !== 'celebrate') {
      p.anim = owner && sp > 1 ? 'dribble' : sp > 4.2 ? 'run' : sp > 0.6 ? 'walk' : 'idle';
    }
    // garder les joueurs près du terrain
    p.pos.x = clamp(p.pos.x, -3, s.cfg.pitch.L + 3);
    p.pos.y = clamp(p.pos.y, -3, s.cfg.pitch.W + 3);
  }
}

function playUpdate(s: SimState) {
  assignPlayTargets(s);
  const owner = byId(s, s.ball.owner);
  if (owner) {
    s.stats[owner.team].possession += DT;
    if (owner.cooldown <= 0 && owner.stun <= 0) decide(s, owner);
    // pressing : tacle si au contact
    for (const o of opponents(s, owner.team)) {
      if (o.role === 'GK' || o.stun > 0 || o.cooldown > 0) continue;
      if (dist(o.pos, owner.pos) < 1.5 && s.ball.owner === owner.id) {
        tryTackle(s, o, owner);
        break;
      }
    }
  } else if (s.ball.lastTeam !== null) {
    s.stats[s.ball.lastTeam].possession += DT;
  }
}

// ———————————————————————————————————————— boucle principale
export function step(s: SimState) {
  if (s.done) return;
  s.t += DT;
  s.phaseT += DT;
  refreshCache(s);
  const cfg = s.cfg;
  if (s.phase !== 'halftime') for (const p of active(s)) p.tally.minutes += (45 / cfg.halfSeconds) * DT;
  // entrée en jeu du joueur incarné
  if (!s.userEntered && cfg.userEntersAt !== undefined && minute(s) >= cfg.userEntersAt && s.phase === 'play') substituteUser(s);
  const halfT = s.t - s.halfStart;
  if ((s.phase === 'play' || s.phase === 'restart') && halfT >= cfg.halfSeconds && !(s.ball.flight && s.ball.flight.kind === 'shot')) {
    if (s.half === 1) {
      s.phase = 'halftime';
      s.phaseT = 0;
      s.ball.owner = null;
      event(s, 'halftime', null, null, `Mi-temps : ${cfg.teams[0].name} ${s.score[0]}–${s.score[1]} ${cfg.teams[1].name}.`, true, 'info', 'Mi-temps');
    } else {
      s.phase = 'fulltime';
      s.done = true;
      for (const p of active(s)) if (p.anim !== 'down') setAnim(p, 'idle');
      event(s, 'fulltime', null, null, `Fin du match : ${cfg.teams[0].name} ${s.score[0]}–${s.score[1]} ${cfg.teams[1].name}.`, true, 'info', 'Fin du match');
      return;
    }
  }
  if (s.phase === 'play') {
    const mn = minute(s);
    for (const team of [0, 1] as Side[]) {
      for (const stage of [60, 75]) if (mn >= stage && !s.coachDone[`${team}-${stage}`]) { s.coachDone[`${team}-${stage}`] = true; coachReview(s, team, stage); }
      if (active(s).some((p) => p.team === team && p.injured && p.anim !== 'down') && !s.coachDone[`${team}-inj-${Math.floor(mn / 5)}`]) {
        s.coachDone[`${team}-inj-${Math.floor(mn / 5)}`] = true;
        coachReview(s, team, 0);
      }
    }
  }
  switch (s.phase as Phase) {
    case 'kickoff': kickoffUpdate(s); break;
    case 'restart': {
      restartTargets(s);
      const r = s.restart!;
      const taker = byId(s, r.taker);
      const ballAt = !s.ball.flight && dist(s.ball.pos, r.spot) < 0.6;
      if (taker && ballAt && dist(taker.pos, r.spot) < 1.4 && s.phaseT >= r.readyAt) executeRestart(s);
      else if (s.phaseT > r.readyAt + 6 && taker) executeRestart(s); // sécurité
      break;
    }
    case 'goal': goalUpdate(s); break;
    case 'halftime':
      for (const p of active(s)) p.target = kickoffTarget(s, p);
      if (s.phaseT > 2.5) {
        coachReview(s, 0, 46);
        coachReview(s, 1, 46);
        s.half = 2;
        s.halfStart = s.t;
        s.kickoffTeam = s.kickoffTeam === 0 ? 1 : 0;
        s.phase = 'kickoff';
        s.phaseT = 0;
      }
      break;
    case 'play': playUpdate(s); break;
  }
  movePlayers(s);
  updateBall(s);
  checkPossession(s);
  checkOut(s);
  if (s.pendingGoal && s.phase !== 'goal') s.pendingGoal = null;
}

function kickoffUpdate(s: SimState) {
  const { L, W } = s.cfg.pitch;
  const center = v(L / 2, W / 2);
  for (const p of active(s)) p.target = kickoffTarget(s, p);
  if (dist(s.ball.pos, center) > 0.3 && !s.ball.flight) resetBall(s, center);
  const taker = kickoffTaker(s, s.kickoffTeam);
  if (!taker) return;
  const ready = s.phaseT > 1.6 && !s.ball.flight && dist(s.ball.pos, center) < 0.5 && dist(taker.pos, center) < 1.2 && active(s).every((p) => dist(p.pos, p.target) < 3);
  if (ready || (s.phaseT > 8 && !s.ball.flight)) {
    s.phase = 'play';
    s.phaseT = 0;
    giveBall(s, taker, true);
    const mid = teammates(s, taker).filter((q) => q.role === 'MID').sort((a, b) => dist(a.pos, taker.pos) - dist(b.pos, taker.pos))[0];
    event(s, 'kickoff', s.kickoffTeam, taker.id, s.half === 1 && s.t < 10 ? 'Coup d’envoi !' : 'Engagement.');
    if (mid) doPass(s, taker, mid, true);
  }
}

function goalUpdate(s: SimState) {
  const g = s.pendingGoal!;
  const scorer = byId(s, g.scorer);
  const { L, W } = s.cfg.pitch;
  for (const p of active(s)) {
    if (scorer && p.id === scorer.id) {
      p.target = v(clamp(p.pos.x + (p.pos.x > L / 2 ? 4 : -4), 2, L - 2), p.pos.y < W / 2 ? 2 : W - 2);
      if (p.anim !== 'celebrate') setAnim(p, 'celebrate', 3.5);
    } else if (scorer && p.team === scorer.team && p.role !== 'GK') {
      p.target = add(scorer.pos, v((p.slot.y - 0.5) * 3, (p.slot.x - 0.4) * 3));
      if (s.phaseT > 1.5 && p.anim !== 'celebrate' && dist(p.pos, scorer.pos) < 4) setAnim(p, 'celebrate', 2.5);
    } else p.target = kickoffTarget(s, p);
  }
  if (s.phaseT > 1.4 && !s.ball.flight && dist(s.ball.pos, v(L / 2, W / 2)) > 0.5) resetBall(s, v(L / 2, W / 2));
  if (s.phaseT > 4.5) {
    s.kickoffTeam = g.team === 0 ? 1 : 0;
    s.phase = 'kickoff';
    s.phaseT = 0;
    s.pendingGoal = null;
  }
}

/** Entrée du joueur incarné : il remplace un joueur du même poste (architecture des remplacements). */
/** Décisions de l'entraîneur pendant le match : ajustements tactiques et remplacements. */
function coachReview(s: SimState, team: Side, stage: number) {
  const t = s.cfg.teams[team];
  const name = t.coach?.name ?? `Le coach de ${t.name}`;
  const temper = t.coach?.temperament ?? 'pragmatique';
  const diff = s.score[team] - s.score[team === 0 ? 1 : 0];
  if (stage >= 46) {
    if (diff < 0 && t.tactic.mentality !== 'attacking') {
      t.tactic = { ...t.tactic, mentality: 'attacking', pressing: Math.min(1, t.tactic.pressing + 0.15) };
      event(s, 'sub', team, null, `${name} demande à ${t.name} d’attaquer.`);
    } else if (diff > 0 && stage >= 75 && t.tactic.mentality !== 'defensive') {
      t.tactic = { ...t.tactic, mentality: 'defensive', pressing: Math.max(0.2, t.tactic.pressing - 0.15) };
      event(s, 'sub', team, null, `${name} demande à ${t.name} de défendre son avance.`);
    }
  }
  // Remplacements : joueurs blessés, épuisés, ou décevants (selon le caractère du coach).
  const maxSubs = 3;
  const onPitch = active(s).filter((p) => p.team === team && p.role !== 'GK' && p.id !== s.ball.owner);
  const live = (p: SimPlayer) => 6 + p.tally.goals + p.tally.assists * 0.6 + p.tally.tacklesWon * 0.15 + (p.tally.passes > 4 ? (p.tally.passesOk / p.tally.passes - 0.75) * 2 : 0) - p.tally.fouls * 0.15;
  const candidates = onPitch
    .filter((p) => !(p.isUser && p.enteredAt > 0) && s.t - p.enteredAt > 30)
    .map((p) => {
      let need = 0;
      if (p.injured) need = 3;
      else if (stage >= 60 && p.energy < (p.isUser && temper === 'paternel' ? 0.42 : 0.6)) need = 1 + (0.6 - p.energy) * 4;
      if (stage >= 60 && temper === 'exigeant' && live(p) < 5.6) need += 1.2;
      if (stage >= 60 && temper === 'pragmatique' && live(p) < 5.3) need += 0.8;
      return { p, need };
    })
    .filter((c) => c.need > 0.9)
    .sort((a, b) => b.need - a.need);
  for (const c of candidates) {
    if (s.subs[team] >= maxSubs) break;
    const benchMate = s.bench.filter((b) => b.team === team && !b.isUser).sort((a, b) => Number(b.role === c.p.role) - Number(a.role === c.p.role))[0];
    if (!benchMate) break;
    if (substitute(s, benchMate.id, c.p.id)) {
      s.subs[team] += 1;
      if (c.p.isUser) {
        s.userOutAt = Math.round(minute(s));
        event(s, 'sub', team, c.p.id, `${name} te fait sortir (${c.p.injured ? 'blessure' : c.p.energy < 0.6 ? 'fatigue' : 'performance insuffisante'}).`, true, 'info', 'Tu sors du terrain');
      }
    }
  }
}

export function substitute(s: SimState, inId: string, outId: string) {
  const inP = s.bench.find((b) => b.id === inId);
  const outP = s.players.find((p) => p.id === outId);
  if (!inP || !outP || !outP.onPitch) return false;
  inP.slot = { ...outP.slot };
  inP.role = outP.role;
  inP.team = outP.team;
  inP.onPitch = true;
  inP.enteredAt = s.t;
  inP.pos = v(s.cfg.pitch.L / 2, -1.5); // entre depuis la ligne de touche
  inP.target = { ...outP.pos };
  outP.onPitch = false;
  if (s.ball.owner === outP.id) { s.ball.owner = null; s.ball.vel = v(0, 0); }
  s.bench = s.bench.filter((b) => b.id !== inId);
  s.players.push(inP);
  refreshCache(s);
  event(s, 'sub', inP.team, inP.id, `Changement : ${inP.name} remplace ${outP.name}.`, inP.isUser, inP.isUser ? 'info' : undefined, `${inP.name} entre en jeu`);
  return true;
}

function substituteUser(s: SimState) {
  s.userEntered = true;
  const u = s.bench.find((b) => b.isUser);
  if (!u) return;
  const out = active(s).filter((p) => p.team === u.team && p.role === u.role && p.id !== s.ball.owner).sort((a, b) => a.energy - b.energy)[0] ?? active(s).find((p) => p.team === u.team && p.role !== 'GK' && p.id !== s.ball.owner);
  if (out) substitute(s, u.id, out.id);
}

/** Avance la simulation jusqu'à un instant donné (utilisé pour l'avance rapide). */
export function runUntil(s: SimState, t: number) {
  while (!s.done && s.t < t) step(s);
}

/** Avance jusqu'au prochain moment fort (ou la fin). Retourne l'événement trouvé. */
export function skipToNextKey(s: SimState, maxSeconds = 400): SimEvent | null {
  const n0 = s.events.length;
  const tEnd = s.t + maxSeconds;
  while (!s.done && s.t < tEnd) {
    step(s);
    for (let i = n0; i < s.events.length; i++) if (s.events[i].key && s.events[i].type !== 'halftime') return s.events[i];
  }
  return null;
}

export function runToEnd(s: SimState) {
  let guard = 0;
  while (!s.done && guard++ < 200000) step(s);
}
