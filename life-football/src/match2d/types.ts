// Moteur de match 2D — types partagés par la simulation (sim.ts) et l'affichage (render.ts).
// Unités : mètres et secondes. Repère : x le long du terrain (0 → L), y en largeur (0 → W).

export interface Vec {
  x: number;
  y: number;
}

export type Side = 0 | 1;
export type Role = 'GK' | 'DEF' | 'MID' | 'ATT';

export type Anim =
  | 'idle'
  | 'walk'
  | 'run'
  | 'control'
  | 'dribble'
  | 'pass'
  | 'shoot'
  | 'tackle'
  | 'header'
  | 'celebrate'
  | 'dive'
  | 'catch'
  | 'down';

export interface SimStats {
  speed: number;
  technique: number;
  passing: number;
  shooting: number;
  positioning: number;
  stamina: number;
  defending: number;
  reflexes: number;
}

export interface Look {
  skin: string;
  hair: string; // style
  hairColor: string;
}

export interface PlayerSetup {
  id: string;
  name: string;
  num: number;
  role: Role;
  stats: SimStats;
  isUser?: boolean;
  look?: Look;
  energy?: number; // 0..1 au coup d'envoi
  instruction?: string; // consigne individuelle du coach (voir content/coaches.ts)
}

export interface Tactic {
  mentality: 'defensive' | 'balanced' | 'attacking';
  pressing: number; // 0..1
  width: number; // 0..1
}

export interface TeamSetup {
  name: string;
  short: string;
  colors: [string, string];
  gkColor: string;
  formation: string;
  tactic: Tactic;
  players: PlayerSetup[]; // dans l'ordre des postes de la formation
  bench: PlayerSetup[];
  /** L'entraîneur décide de la tactique, des ajustements et des remplacements. */
  coach?: { name: string; temperament: string; style: string };
}

export interface PitchDims {
  L: number;
  W: number;
  goalW: number;
  goalH: number;
  boxDepth: number;
  boxW: number;
  sixDepth: number;
  sixW: number;
  spot: number;
  circle: number;
}

export interface SimConfig {
  seed: number;
  pitch: PitchDims;
  halfSeconds: number; // durée simulée d'une mi-temps (horloge affichée : 45 minutes)
  teams: [TeamSetup, TeamSetup];
  /** Entrée en jeu du joueur incarné (minute), s'il commence sur le banc. */
  userEntersAt?: number;
}

export interface Tally {
  touches: number;
  passes: number;
  passesOk: number;
  shots: number;
  shotsOn: number;
  goals: number;
  assists: number;
  tackles: number;
  tacklesWon: number;
  interceptions: number;
  saves: number;
  fouls: number;
  distance: number;
  minutes: number;
}

export interface SimPlayer {
  id: string;
  name: string;
  num: number;
  team: Side;
  role: Role;
  slot: Vec; // ancre de formation, coordonnées « d'attaque » normalisées (x : 0 propre but → 1 but adverse)
  stats: SimStats;
  look?: Look;
  isUser: boolean;
  instruction: string | null;
  enteredAt: number;
  onPitch: boolean;
  sentOff: boolean;
  pos: Vec;
  vel: Vec;
  target: Vec;
  facing: number; // angle (radians)
  energy: number; // 0..1
  anim: Anim;
  animT: number; // temps écoulé dans l'animation
  animDur: number; // durée d'une animation ponctuelle (0 = boucle)
  animDir: number; // direction (plongeon, tacle…)
  runPhase: number;
  cooldown: number; // délai avant la prochaine décision balle au pied
  stun: number; // ralenti après un tacle manqué / un dribble subi
  carryTarget: Vec | null;
  yellow: number;
  cardUntil: number;
  injured: boolean;
  tally: Tally;
}

export type FlightKind = 'pass' | 'cross' | 'shot' | 'clear' | 'reset' | 'deflect';
export type ShotOutcome = 'goal' | 'saved' | 'caught' | 'miss' | 'blocked';

export interface Flight {
  kind: FlightKind;
  from: Vec;
  to: Vec;
  t: number;
  dur: number;
  peak: number; // hauteur max (m)
  by: string | null;
  receiver: string | null; // joueur qui doit récupérer le ballon à l'arrivée
  passOk?: boolean;
  shot?: ShotOutcome;
  header?: boolean; // un centre suivi d'une reprise de la tête
  endZ?: number;
}

export interface Ball {
  pos: Vec;
  z: number;
  vel: Vec;
  owner: string | null;
  flight: Flight | null;
  lastTouch: string | null;
  lastTeam: Side | null;
}

export type EventType =
  | 'kickoff'
  | 'goal'
  | 'shot'
  | 'save'
  | 'miss'
  | 'blocked'
  | 'chance'
  | 'tackle'
  | 'interception'
  | 'foul'
  | 'yellow'
  | 'red'
  | 'injury'
  | 'corner'
  | 'freekick'
  | 'penalty'
  | 'goalkick'
  | 'throwin'
  | 'sub'
  | 'halftime'
  | 'fulltime';

export interface SimEvent {
  t: number;
  minute: number;
  type: EventType;
  team: Side | null;
  player: string | null;
  text: string;
  key: boolean; // moment fort (bannière, « passer au prochain moment »)
}

export type RestartKind = 'kickoff' | 'throwin' | 'goalkick' | 'corner' | 'freekick' | 'penalty';

export interface Restart {
  kind: RestartKind;
  team: Side;
  spot: Vec;
  taker: string;
  readyAt: number;
}

export interface TeamStats {
  possession: number; // secondes
  shots: number;
  shotsOn: number;
  passes: number;
  passesOk: number;
  fouls: number;
  corners: number;
  yellows: number;
  reds: number;
}

export interface Banner {
  text: string;
  kind: 'goal' | 'chance' | 'save' | 'card' | 'penalty' | 'info' | 'injury';
  until: number;
  team: Side | null;
}

export type Phase = 'kickoff' | 'play' | 'restart' | 'goal' | 'halftime' | 'fulltime';

export interface SimState {
  cfg: SimConfig;
  rng: { rng: number };
  t: number;
  half: 1 | 2;
  halfStart: number;
  phase: Phase;
  phaseT: number;
  restart: Restart | null;
  kickoffTeam: Side;
  players: SimPlayer[];
  bench: SimPlayer[];
  ball: Ball;
  score: [number, number];
  events: SimEvent[];
  stats: [TeamStats, TeamStats];
  banner: Banner | null;
  focusUntil: number; // effets visuels : zoom (affichage uniquement)
  slowUntil: number; // effets visuels : ralenti (affichage uniquement)
  protect: { id: string; until: number } | null;
  lastPass: { by: string; team: Side; t: number } | null;
  pendingGoal: { team: Side; scorer: string; assist: string | null } | null;
  done: boolean;
  userEntered: boolean;
  /** Caches de calcul (recalculés à chaque pas). */
  cache: { active: SimPlayer[]; avg: number; step: number };
  coachDone: Record<string, boolean>;
  subs: [number, number];
  userOutAt: number | null;
}
