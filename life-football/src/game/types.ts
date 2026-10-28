// Types centraux du jeu. Toutes les données de partie sont sérialisables (sauvegarde JSON).

export type Position = 'GK' | 'DEF' | 'MID' | 'ATT';
export type Foot = 'right' | 'left' | 'both';

export type AttrKey =
  | 'technique'
  | 'passing'
  | 'dribbling'
  | 'shooting'
  | 'vision'
  | 'defending'
  | 'speed'
  | 'stamina'
  | 'strength'
  | 'tactics'
  | 'mental'
  | 'discipline'
  | 'reflexes';

export type Attributes = Record<AttrKey, number>;

export type ArchetypeId = 'technician' | 'speedster' | 'playmaker' | 'rock' | 'striker' | 'keeper' | 'allround';

export type BackgroundId = 'modest_football' | 'stable_studies' | 'wealthy' | 'ex_pro_parent' | 'nomad' | 'responsibilities';

export type EnvironmentId = 'city' | 'town' | 'countryside';

export type SleepMode = 'early' | 'normal' | 'late';

export interface Identity {
  firstName: string;
  lastName: string;
  nickname: string;
  birthYear: number;
  birthMonth: number; // 1..12
  nationality: string; // code pays
  secondNationality: string | null;
  birthCountry: string;
  birthCity: string;
  growUpCountry: string;
  parentOrigin: string | null;
  language: string;
  foot: Foot;
  position: Position;
  secondaryPosition: Position | null;
  archetype: ArchetypeId;
  background: BackgroundId;
  environment: EnvironmentId;
}

export interface Appearance {
  skin: number; // index palette
  hairStyle: string;
  hairColor: string;
  eyeColor: string;
  beard: string;
  faceShape: 'oval' | 'round' | 'square';
  heightClass: 'small' | 'medium' | 'tall';
  build: 'slim' | 'normal' | 'strong';
  jerseyNumber: number;
}

export interface Injury {
  name: string;
  weeksLeft: number;
  severity: 1 | 2 | 3;
}

export interface Boots {
  name: string;
  brandId: string | null;
  quality: 1 | 2 | 3;
  wear: number; // 0..100
  sponsored: boolean;
}

export interface PlayerState {
  attrs: Attributes;
  potential: number; // caché, 40..95
  energy: number; // 0..100
  form: number; // condition physique 0..100
  morale: number; // 0..100
  nutrition: number; // 0..100 (moyenne glissante)
  sleepMode: SleepMode;
  injury: Injury | null;
  school: { grade: number; trend: number };
  boots: Boots;
}

export type TxCategory =
  | 'pocket'
  | 'family'
  | 'job'
  | 'salary'
  | 'bonus'
  | 'sponsor'
  | 'sponsor_bonus'
  | 'food'
  | 'transport'
  | 'equipment'
  | 'leisure'
  | 'health'
  | 'admin'
  | 'tax'
  | 'penalty'
  | 'gift';

export interface Transaction {
  t: number; // semaine absolue
  amount: number; // + revenu / - dépense
  category: TxCategory;
  label: string;
}

export interface Npc {
  id: string;
  name: string;
  role: 'parent' | 'parent2' | 'sibling' | 'friend' | 'coach' | 'rival' | 'teammate' | 'crush' | 'mentor';
  relation: number; // 0..100
  portrait: { skin: number; hair: string; hairColor: string; age: 'child' | 'teen' | 'adult' | 'senior' };
  met: number; // semaine absolue
  note?: string;
}

export interface Club {
  id: string;
  name: string;
  short: string;
  country: string;
  city: string;
  tier: 1 | 2 | 3 | 4; // 1 amateur local, 2 régional formateur, 3 centre pro, 4 grand centre
  reputation: number;
  facilities: number;
  colors: [string, string];
  distanceKm: number;
  boarding: boolean; // internat / centre
}

export interface LeagueTeam {
  id: string;
  name: string;
  strength: number;
  played: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  isPlayerTeam: boolean;
}

export interface SeasonStats {
  season: string; // "2026-27"
  clubId: string | null;
  team: string;
  apps: number;
  starts: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  ratingSum: number;
  ratedApps: number;
  natApps: number;
  natGoals: number;
}

export type SquadStatus = 'starter' | 'rotation' | 'bench';

export interface ClubMembership {
  clubId: string;
  joined: number;
  status: SquadStatus;
  coachId: string;
  league: LeagueTeam[];
  fixtures: Array<[string, string]>[]; // journées
  matchday: number;
  lastMatchWeek: number;
  feePaid: boolean;
}

export type TryoutStatus = 'invited' | 'accepted' | 'declined' | 'done' | 'expired';

export interface TryoutResult {
  scores: Record<string, number>;
  attrScore: number;
  conditionScore: number;
  total: number;
  threshold: number;
  outcome: 'offer' | 'retry' | 'rejected';
  feedback: string[];
}

export interface Tryout {
  id: string;
  clubId: string;
  week: number; // semaine absolue de la détection
  inviteWeek: number;
  status: TryoutStatus;
  isRetry: boolean;
  result?: TryoutResult;
  transport?: 'parents' | 'bus' | 'train';
  prep?: 'rest' | 'train' | 'visualize';
}

export interface ClubOffer {
  id: string;
  clubId: string;
  week: number;
  expires: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  fee: number; // licence / frais annuels
  boarding: boolean;
  role: SquadStatus;
  note: string;
}

export interface Reputation {
  sport: number; // réputation sportive 0..100
  popularity: number; // 0..100
  fanImage: number; // image supporters 0..100
  sponsorCred: number; // crédibilité auprès des marques 0..100
  media: number; // présence médiatique 0..100
  followers: number;
}

export interface NationalCareer {
  committedTo: string | null; // nation pour laquelle le joueur est verrouillé
  chosenYouth: string | null; // nation choisie actuellement chez les jeunes
  caps: Record<string, { youth: number; senior: number; goals: number }>;
  pendingCallup: Callup | null;
  callupHistory: Callup[];
  lastWindow: number;
}

export interface Callup {
  id: string;
  nation: string;
  category: 'U15' | 'U17' | 'U19' | 'U21' | 'A';
  week: number;
  competition: string;
  opponents: string[];
  status: 'pending' | 'accepted' | 'declined' | 'played';
  official: boolean;
}

export type SponsorCategory = 'equipment' | 'clothing' | 'nutrition' | 'watch' | 'auto' | 'commercial' | 'local';

export interface SponsorTerms {
  monthly: number; // montant garanti mensuel
  months: number;
  bonusPerGoal: number;
  bonusPerCap: number;
  postsPerMonth: number;
  appearancesPerYear: number;
  exclusive: boolean;
  penalty: number;
  renewalMinRep: number;
  freeBoots: boolean;
}

export interface SponsorOffer {
  id: string;
  brandId: string;
  week: number;
  expires: number;
  terms: SponsorTerms;
  original: SponsorTerms;
  roundsLeft: number;
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'expired';
  lastResponse?: string;
  isRenewal: boolean;
}

export interface SponsorContract {
  id: string;
  brandId: string;
  start: number;
  end: number;
  terms: SponsorTerms;
  postsThisMonth: number;
  appearancesThisYear: number;
  warnings: number;
  active: boolean;
  earned: number;
}

export interface SocialPost {
  id: string;
  t: number;
  kind: 'match' | 'life' | 'training' | 'sponsor' | 'charity' | 'callup' | 'signing' | 'reply';
  text: string;
  likes: number;
  sentiment: number; // -1..1
  brandId?: string;
}

export interface Notification {
  id: string;
  t: number;
  kind: 'invite' | 'injury' | 'offer' | 'event' | 'info' | 'money' | 'sponsor' | 'national' | 'success' | 'warning';
  title: string;
  body: string;
  read: boolean;
}

export interface JournalEntry {
  t: number;
  text: string;
  icon: string;
  major: boolean;
}

export interface AdminTask {
  id: string;
  label: string;
  deadline: number;
  done: boolean;
  failEffect: string;
}

export interface ScheduledEvent {
  eventId: string;
  at: number;
  data?: Record<string, string | number>;
}

export interface PendingEvent {
  eventId: string;
  data?: Record<string, string | number>;
}

export interface GameState {
  version: number;
  id: string;
  createdAt: number;
  savedAt: number;
  slot: number;
  rng: number;
  t: number; // semaine absolue (0 = 1re semaine de septembre de l'année de départ)
  startYear: number;
  identity: Identity;
  appearance: Appearance;
  player: PlayerState;
  slots: { left: number; max: number };
  weekLog: string[]; // actions effectuées cette semaine
  money: number;
  ledger: Transaction[];
  pantry: Record<string, number>;
  npcs: Npc[];
  reputation: Reputation;
  clubs: Club[];
  membership: ClubMembership | null;
  tryouts: Tryout[];
  clubOffers: ClubOffer[];
  seasons: SeasonStats[];
  national: NationalCareer;
  sponsors: { offers: SponsorOffer[]; contracts: SponsorContract[] };
  social: { posts: SocialPost[]; postsThisWeek: number; unlocked: boolean };
  events: {
    pending: PendingEvent[];
    history: Array<{ id: string; t: number }>;
    scheduled: ScheduledEvent[];
    flags: Record<string, number>;
  };
  admin: AdminTask[];
  notifications: Notification[];
  journal: JournalEntry[];
  weekDone: Record<string, boolean>; // activités bloquantes déjà jouées cette semaine
  recentRatings: number[];
}
