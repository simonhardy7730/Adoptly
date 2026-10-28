// Calendrier : 4 semaines par mois, 48 semaines par an.
// t = 0 correspond à la 1re semaine de septembre de l'année de départ (début de saison).

import type { GameState } from './types';

export const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export interface DateInfo {
  year: number;
  month: number; // 1..12
  weekOfMonth: number; // 1..4
}

export function dateOf(t: number, startYear: number): DateInfo {
  const m0 = 8 + Math.floor(t / 4);
  return { year: startYear + Math.floor(m0 / 12), month: (m0 % 12) + 1, weekOfMonth: (t % 4) + 1 };
}

export function weekOf(s: Pick<GameState, 't' | 'startYear'>, t = s.t): DateInfo {
  return dateOf(t, s.startYear);
}

export function formatDate(t: number, startYear: number): string {
  const d = dateOf(t, startYear);
  return `Semaine ${d.weekOfMonth} · ${MONTHS[d.month - 1]} ${d.year}`;
}

export function formatShortDate(t: number, startYear: number): string {
  const d = dateOf(t, startYear);
  return `S${d.weekOfMonth} ${MONTHS[d.month - 1].slice(0, 4)}. ${d.year}`;
}

export function ageAt(s: Pick<GameState, 't' | 'startYear' | 'identity'>, t = s.t): number {
  const d = dateOf(t, s.startYear);
  return d.year - s.identity.birthYear - (d.month < s.identity.birthMonth ? 1 : 0);
}

export function seasonLabel(t: number, startYear: number): string {
  const d = dateOf(t, startYear);
  const y = d.month >= 9 ? d.year : d.year - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
}

export function isHolidays(t: number, startYear: number): boolean {
  const d = dateOf(t, startYear);
  return d.month === 7 || d.month === 8 || (d.month === 12 && d.weekOfMonth === 4);
}

export function isSchoolPeriod(t: number, startYear: number): boolean {
  return !isHolidays(t, startYear);
}

/** Journées de championnat : semaines 2 et 3 des mois de septembre à mai (18 journées). */
export function isLeagueWeek(t: number, startYear: number): boolean {
  const d = dateOf(t, startYear);
  const inSeason = d.month >= 9 || d.month <= 5;
  return inSeason && (d.weekOfMonth === 2 || d.weekOfMonth === 3);
}

/** Index de la journée de championnat (0..17) pour une semaine donnée, -1 sinon. */
export function leagueMatchdayIndex(t: number, startYear: number): number {
  if (!isLeagueWeek(t, startYear)) return -1;
  const d = dateOf(t, startYear);
  const monthOrder = d.month >= 9 ? d.month - 9 : d.month + 3; // sept=0 … mai=8
  return monthOrder * 2 + (d.weekOfMonth - 2);
}

/** Fenêtres internationales : semaine 3 d'octobre, novembre, mars ; semaine 2 de juin (tournoi). */
export function isInternationalWindow(t: number, startYear: number): boolean {
  const d = dateOf(t, startYear);
  return ((d.month === 10 || d.month === 11 || d.month === 3) && d.weekOfMonth === 3) || (d.month === 6 && d.weekOfMonth === 2);
}

export function isSeasonEnd(t: number, startYear: number): boolean {
  const d = dateOf(t, startYear);
  return d.month === 6 && d.weekOfMonth === 4;
}

export function isMonthEnd(t: number): boolean {
  return t % 4 === 3;
}

/** Catégorie d'âge sur la saison (âge au 1er janvier de la saison, comme dans la plupart des fédérations). */
export function ageCategory(age: number): string {
  if (age >= 19) return 'Réserve';
  return `U${Math.max(9, age + 1)}`;
}
