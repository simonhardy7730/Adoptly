// Logique pure des mini-jeux (génération, résolution, score sur 100). L'interface est dans *.tsx.
// La difficulté (1..5) dépend du club ; les compétences du joueur adoucissent ou durcissent l'épreuve.

import { clamp, nextFloat, sigmoid, type RngHolder } from '../game/rng';

export type MiniGameId = 'pass' | 'dribble' | 'decision' | 'keeper';

export const MINIGAME_INFO: Record<MiniGameId, { title: string; icon: string; skill: string; rules: string }> = {
  pass: { title: 'Précision de passe', icon: '🎯', skill: 'Passe · Vision', rules: 'Mémorise l’ordre des coéquipiers (numéros), puis clique-les dans le bon ordre, le plus au centre possible et le plus vite possible.' },
  dribble: { title: 'Conduite de balle', icon: '⚡', skill: 'Dribble · Vitesse', rules: 'Mène le ballon jusqu’à la ligne d’arrivée. Les plots bloquent ; les zones rouges (défenseurs) sont des raccourcis risqués : tu peux y perdre le ballon.' },
  decision: { title: 'Prise de décision', icon: '🧠', skill: 'Vision · Tactique', rules: 'Lis la situation de jeu et choisis la meilleure action avant la fin du chrono. La pertinence compte autant que l’exécution.' },
  keeper: { title: 'Réflexes de gardien', icon: '🧤', skill: 'Réflexes · Mental', rules: 'Observe l’indice du tireur, puis clique la zone du but dès que « TIR ! » apparaît. Trop tard = but.' },
};

// ———————————————————————————————————————— A. Précision de passe

export interface PassRound {
  targets: { x: number; y: number }[]; // coordonnées en % du terrain
  defenders: { x: number; y: number }[];
  order: number[]; // ordre des index de cibles
  showMs: number;
  limitMs: number;
  radius: number; // rayon de la cible en % de largeur
}

export function generatePassRound(h: RngHolder, difficulty: number, vision: number, passing: number): PassRound {
  const n = Math.min(7, 2 + difficulty + (nextFloat(h) < 0.4 ? 1 : 0));
  const targets: { x: number; y: number }[] = [];
  let guard = 0;
  while (targets.length < n && guard++ < 400) {
    const t = { x: 8 + nextFloat(h) * 84, y: 12 + nextFloat(h) * 70 };
    if (targets.every((o) => Math.hypot(o.x - t.x, o.y - t.y) > 16)) targets.push(t);
  }
  const defenders = targets.slice(0, Math.min(difficulty, targets.length)).map((t) => ({ x: clamp(t.x + (nextFloat(h) - 0.5) * 10, 3, 97), y: clamp(t.y + 7, 3, 97) }));
  const order = targets.map((_, i) => i).sort(() => nextFloat(h) - 0.5);
  return {
    targets,
    defenders,
    order,
    showMs: Math.round(clamp(1500 + vision * 25 - difficulty * 180 + targets.length * 120, 1000, 4500)),
    limitMs: 4500 + targets.length * 700,
    radius: clamp(4 + passing / 30 - difficulty * 0.4, 2.8, 7),
  };
}

export interface PassClick {
  x: number;
  y: number;
  t: number; // ms depuis le début de la phase de clic
}

/** Score d'une manche : bon ordre, précision au centre, rapidité. */
export function scorePassRound(r: PassRound, clicks: PassClick[]): { score: number; correct: number; accuracy: number } {
  let correct = 0;
  let accSum = 0;
  for (let i = 0; i < r.order.length; i++) {
    const c = clicks[i];
    if (!c) break;
    const target = r.targets[r.order[i]];
    // Le terrain est au format 3:2 : on ramène l'axe vertical à l'échelle horizontale.
    const dist = Math.hypot(c.x - target.x, (c.y - target.y) * (2 / 3));
    if (dist > r.radius * 1.6) break; // passe dans le vide : la séquence s'arrête
    correct++;
    accSum += clamp(1 - dist / (r.radius * 1.6), 0, 1);
  }
  const accuracy = correct ? accSum / correct : 0;
  const last = clicks[Math.max(0, correct - 1)]?.t ?? r.limitMs;
  const speed = correct === r.order.length ? clamp(1 - last / r.limitMs, 0, 1) : 0;
  const score = (correct / r.order.length) * 65 + accuracy * 20 * (correct / r.order.length) + speed * 15;
  return { score: Math.round(clamp(score)), correct, accuracy };
}

// ———————————————————————————————————————— B. Conduite de balle

export const DRIB_COLS = 5;
export const DRIB_ROWS = 7;

export type Cell = 'free' | 'cone' | 'defender';

export interface DribbleState {
  grid: Cell[][]; // [ligne][colonne], ligne 0 = arrivée
  pos: { r: number; c: number };
  time: number; // unités de temps
  losses: number;
  moves: number;
  done: boolean;
  log: string[];
  defenderLevel: number;
  optimal: number;
}

export function generateDribble(h: RngHolder, difficulty: number): DribbleState {
  for (let attempt = 0; attempt < 50; attempt++) {
    const grid: Cell[][] = [];
    for (let r = 0; r < DRIB_ROWS; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < DRIB_COLS; c++) {
        if (r === 0 || r === DRIB_ROWS - 1) row.push('free');
        else {
          const x = nextFloat(h);
          row.push(x < 0.18 + difficulty * 0.03 ? 'cone' : x < 0.3 + difficulty * 0.05 ? 'defender' : 'free');
        }
      }
      grid.push(row);
    }
    const safe = shortestPath(grid, { r: DRIB_ROWS - 1, c: 2 }, true);
    const any = shortestPath(grid, { r: DRIB_ROWS - 1, c: 2 }, false);
    if (safe !== null && any !== null && safe > any) {
      return { grid, pos: { r: DRIB_ROWS - 1, c: 2 }, time: 0, losses: 0, moves: 0, done: false, log: [], defenderLevel: 20 + difficulty * 9, optimal: any };
    }
  }
  // Repli : parcours simple garanti
  const grid: Cell[][] = Array.from({ length: DRIB_ROWS }, (_, r) => Array.from({ length: DRIB_COLS }, (_, c) => (r > 0 && r < DRIB_ROWS - 1 && c === 2 && r % 2 ? 'defender' : 'free')));
  return { grid, pos: { r: DRIB_ROWS - 1, c: 2 }, time: 0, losses: 0, moves: 0, done: false, log: [], defenderLevel: 20 + difficulty * 9, optimal: 6 };
}

export const DIRS = {
  ul: { dr: -1, dc: -1, cost: 1.4, label: '↖' },
  u: { dr: -1, dc: 0, cost: 1, label: '↑' },
  ur: { dr: -1, dc: 1, cost: 1.4, label: '↗' },
  l: { dr: 0, dc: -1, cost: 1, label: '←' },
  r: { dr: 0, dc: 1, cost: 1, label: '→' },
} as const;
export type Dir = keyof typeof DIRS;

/** Plus court chemin (en coût) ; `safeOnly` interdit les cases défenseur. */
export function shortestPath(grid: Cell[][], start: { r: number; c: number }, safeOnly: boolean): number | null {
  const dist = new Map<string, number>();
  const queue: { r: number; c: number; d: number }[] = [{ ...start, d: 0 }];
  dist.set(`${start.r},${start.c}`, 0);
  while (queue.length) {
    queue.sort((a, b) => a.d - b.d);
    const cur = queue.shift()!;
    if (cur.r === 0) return Math.round(cur.d * 10) / 10;
    for (const k of Object.keys(DIRS) as Dir[]) {
      const m = DIRS[k];
      const r = cur.r + m.dr;
      const c = cur.c + m.dc;
      if (r < 0 || c < 0 || c >= DRIB_COLS) continue;
      const cell = grid[r][c];
      if (cell === 'cone' || (safeOnly && cell === 'defender')) continue;
      const nd = cur.d + m.cost;
      const key = `${r},${c}`;
      if ((dist.get(key) ?? Infinity) > nd) {
        dist.set(key, nd);
        queue.push({ r, c, d: nd });
      }
    }
  }
  return null;
}

export function canMove(st: DribbleState, dir: Dir): boolean {
  const m = DIRS[dir];
  const r = st.pos.r + m.dr;
  const c = st.pos.c + m.dc;
  return !st.done && r >= 0 && c >= 0 && c < DRIB_COLS && st.grid[r][c] !== 'cone';
}

export function dribbleSuccessChance(dribbling: number, speed: number, defenderLevel: number): number {
  return clamp(sigmoid(((dribbling * 0.7 + speed * 0.3) - defenderLevel) / 9 + 0.6), 0.15, 0.95);
}

export function moveDribble(h: RngHolder, st: DribbleState, dir: Dir, dribbling: number, speed: number): DribbleState {
  if (!canMove(st, dir)) return st;
  const m = DIRS[dir];
  const n: DribbleState = { ...st, pos: { r: st.pos.r + m.dr, c: st.pos.c + m.dc }, log: [...st.log] };
  n.moves += 1;
  n.time += m.cost * (1.15 - speed / 250);
  if (st.grid[n.pos.r][n.pos.c] === 'defender') {
    const p = dribbleSuccessChance(dribbling, speed, st.defenderLevel);
    if (nextFloat(h) < p) n.log.push(`${m.label} Défenseur éliminé !`);
    else {
      n.losses += 1;
      n.time += 3;
      n.log.push(`${m.label} Ballon perdu face au défenseur… tu le récupères en retard.`);
      n.pos = { r: Math.min(DRIB_ROWS - 1, n.pos.r + 1), c: st.pos.c };
    }
  } else n.log.push(`${m.label}`);
  if (n.pos.r === 0 || n.moves >= 18) n.done = true;
  return n;
}

export function scoreDribble(st: DribbleState): number {
  if (st.pos.r !== 0) return Math.round(clamp(25 - st.pos.r * 3));
  const extra = Math.max(0, st.time - st.optimal);
  return Math.round(clamp(100 - extra * 7 - st.losses * 15));
}

// ———————————————————————————————————————— C. Prise de décision

export interface DecisionOption {
  id: 'pass' | 'dribble' | 'shoot' | 'hold' | 'defend';
  label: string;
  value: number; // pertinence 0..1
  attrs: ('passing' | 'vision' | 'dribbling' | 'shooting' | 'tactics' | 'defending' | 'speed' | 'technique')[];
  base: number;
}

export interface DecisionScenario {
  id: string;
  text: string;
  ball: { x: number; y: number };
  mates: { x: number; y: number }[];
  opps: { x: number; y: number }[];
  options: DecisionOption[];
}

const O = (id: DecisionOption['id'], value: number, base = 0): DecisionOption => {
  const map: Record<DecisionOption['id'], { label: string; attrs: DecisionOption['attrs'] }> = {
    pass: { label: 'Passer', attrs: ['passing', 'vision'] },
    dribble: { label: 'Dribbler', attrs: ['dribbling', 'speed'] },
    shoot: { label: 'Tirer', attrs: ['shooting', 'technique'] },
    hold: { label: 'Temporiser', attrs: ['tactics', 'technique'] },
    defend: { label: 'Défendre / se replacer', attrs: ['defending', 'tactics'] },
  };
  return { id, label: map[id].label, attrs: map[id].attrs, value, base };
};

export const SCENARIOS: DecisionScenario[] = [
  { id: 's1', text: '2 contre 1 sur l’aile. Ton coéquipier est démarqué au centre, le défenseur se jette sur toi.', ball: { x: 70, y: 30 }, mates: [{ x: 50, y: 20 }], opps: [{ x: 66, y: 25 }, { x: 50, y: 8 }], options: [O('pass', 1, 0.6), O('dribble', 0.45), O('shoot', 0.15, -1.2), O('hold', 0.35, 0.8)] },
  { id: 's2', text: 'Tu es à 11 mètres, face au but, aucun défenseur entre toi et le gardien.', ball: { x: 50, y: 18 }, mates: [{ x: 70, y: 30 }], opps: [{ x: 50, y: 5 }, { x: 35, y: 30 }], options: [O('shoot', 1, 0.5), O('pass', 0.35, 0.4), O('dribble', 0.4, -0.2), O('hold', 0.1, 0.8)] },
  { id: 's3', text: 'Vous menez 1-0 à la 88e. Tu as le ballon au milieu, trois adversaires pressent.', ball: { x: 50, y: 55 }, mates: [{ x: 30, y: 65 }, { x: 70, y: 60 }], opps: [{ x: 45, y: 48 }, { x: 56, y: 50 }, { x: 50, y: 42 }], options: [O('hold', 1, 0.7), O('pass', 0.75, 0.6), O('dribble', 0.25, -0.5), O('shoot', 0.05, -2)] },
  { id: 's4', text: 'Contre adverse : un attaquant fonce, ton défenseur central est hors de position.', ball: { x: 45, y: 60 }, mates: [{ x: 65, y: 40 }], opps: [{ x: 45, y: 62 }, { x: 60, y: 55 }], options: [O('defend', 1, 0.4), O('dribble', 0.05, -1), O('pass', 0.1, -1), O('hold', 0.35, 0)] },
  { id: 's5', text: 'Tu reçois dos au but, un défenseur colle à ton dos. Ton milieu arrive lancé.', ball: { x: 50, y: 32 }, mates: [{ x: 45, y: 45 }], opps: [{ x: 50, y: 28 }, { x: 62, y: 20 }], options: [O('pass', 0.95, 0.7), O('dribble', 0.4, -0.4), O('shoot', 0.1, -1.6), O('hold', 0.6, 0.3)] },
  { id: 's6', text: 'Ballon à 25 mètres, la défense recule. Un espace s’ouvre devant toi.', ball: { x: 48, y: 38 }, mates: [{ x: 25, y: 25 }, { x: 75, y: 30 }], opps: [{ x: 45, y: 22 }, { x: 58, y: 24 }], options: [O('dribble', 0.85, 0.2), O('shoot', 0.55, -0.9), O('pass', 0.6, 0.4), O('hold', 0.2, 0.8)] },
  { id: 's7', text: 'Corner adverse dégagé : tu récupères à l’entrée de ta surface, tout ton bloc est remonté.', ball: { x: 50, y: 78 }, mates: [{ x: 30, y: 60 }, { x: 72, y: 55 }], opps: [{ x: 55, y: 74 }], options: [O('pass', 0.9, 0.5), O('dribble', 0.5, 0), O('hold', 0.45, 0.4), O('defend', 0.3, 0.6)] },
  { id: 's8', text: 'Seul face au gardien, mais légèrement excentré. Un coéquipier suit au second poteau.', ball: { x: 66, y: 16 }, mates: [{ x: 40, y: 12 }], opps: [{ x: 55, y: 6 }, { x: 60, y: 24 }], options: [O('shoot', 0.7, 0.1), O('pass', 0.85, 0.3), O('dribble', 0.5, -0.4), O('hold', 0.05, 0.5)] },
];

export function pickScenarios(h: RngHolder, n = 4): DecisionScenario[] {
  return [...SCENARIOS].sort(() => nextFloat(h) - 0.5).slice(0, n);
}

export function decisionTimeLimit(difficulty: number, tactics: number) {
  return Math.round(clamp(11000 - difficulty * 1100 + tactics * 30, 5000, 13000));
}

export function resolveDecision(h: RngHolder, sc: DecisionScenario, optionId: string | null, elapsedMs: number, limitMs: number, attrs: Record<string, number>, difficulty: number): { score: number; success: boolean; best: string; value: number } {
  const best = [...sc.options].sort((a, b) => b.value - a.value)[0];
  if (!optionId) return { score: 0, success: false, best: best.label, value: 0 };
  const o = sc.options.find((x) => x.id === optionId)!;
  const skill = o.attrs.reduce((s, k) => s + (attrs[k] ?? 30), 0) / o.attrs.length;
  const p = sigmoid((skill - (18 + difficulty * 9)) / 10 + o.base);
  const success = nextFloat(h) < p;
  const speed = clamp(1 - elapsedMs / limitMs, 0, 1);
  const score = o.value * 62 + (success ? 25 : 0) + speed * 13;
  return { score: Math.round(clamp(score)), success, best: best.label, value: o.value };
}

// ———————————————————————————————————————— D. Réflexes de gardien

export const GK_ZONES = ['tl', 'tc', 'tr', 'bl', 'bc', 'br'] as const;
export type GkZone = (typeof GK_ZONES)[number];
export const GK_ZONE_LABELS: Record<GkZone, string> = { tl: 'Haut gauche', tc: 'Haut centre', tr: 'Haut droite', bl: 'Bas gauche', bc: 'Bas centre', br: 'Bas droite' };

export interface GkShot {
  target: GkZone;
  hint: GkZone; // indice donné par l'attitude du tireur (parfois trompeur)
  windupMs: number; // délai avant le tir
  windowMs: number; // fenêtre de réaction après « TIR ! »
}

export function generateShots(h: RngHolder, difficulty: number, reflexes: number, tactics: number, n = 5): GkShot[] {
  const shots: GkShot[] = [];
  const reliability = clamp(0.78 - difficulty * 0.06 + tactics / 400, 0.4, 0.9);
  for (let i = 0; i < n; i++) {
    const target = GK_ZONES[Math.floor(nextFloat(h) * 6)];
    const hint = nextFloat(h) < reliability ? target : GK_ZONES[Math.floor(nextFloat(h) * 6)];
    shots.push({
      target,
      hint,
      windupMs: 900 + Math.floor(nextFloat(h) * 1400),
      windowMs: Math.round(clamp(520 + reflexes * 7 - difficulty * 55, 380, 1200)),
    });
  }
  return shots;
}

export function adjacent(a: GkZone, b: GkZone): boolean {
  const pos = (z: GkZone) => ({ row: z[0] === 't' ? 0 : 1, col: z[1] === 'l' ? 0 : z[1] === 'c' ? 1 : 2 });
  const pa = pos(a);
  const pb = pos(b);
  return Math.abs(pa.row - pb.row) + Math.abs(pa.col - pb.col) === 1;
}

/** Résout un tir : bonne zone dans les temps = arrêt ; zone voisine = arrêt possible selon les réflexes. */
export function resolveShot(h: RngHolder, shot: GkShot, choice: GkZone | null, reactionMs: number | null, reflexes: number): { saved: boolean; points: number; text: string } {
  if (!choice || reactionMs === null || reactionMs > shot.windowMs) return { saved: false, points: 0, text: 'Trop tard ! Le ballon est au fond.' };
  const speed = clamp(1 - reactionMs / shot.windowMs, 0, 1);
  if (choice === shot.target) return { saved: true, points: Math.round(16 + speed * 4), text: 'Arrêt ! Bonne lecture du tireur.' };
  if (adjacent(choice, shot.target) && nextFloat(h) < clamp(reflexes / 140 + speed * 0.2, 0.05, 0.75)) {
    return { saved: true, points: Math.round(11 + speed * 3), text: 'Parade réflexe du bout des gants !' };
  }
  return { saved: false, points: 2, text: 'Mauvais côté… but.' };
}
