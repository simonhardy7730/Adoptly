// Agenda : liste des échéances à venir (matchs, détections, sélections, démarches, contrats…).
import type { GameState } from './types';
import { dateOf, isHolidays, isInternationalWindow, isSeasonEnd, leagueMatchdayIndex } from './calendar';
import { clubById, currentClub } from './career';
import { brand } from '../content/brands';
import { country } from '../content/countries';

export interface AgendaItem {
  t: number;
  icon: string;
  label: string;
  kind: 'match' | 'tryout' | 'national' | 'admin' | 'life' | 'season' | 'sponsor';
}

export function agenda(s: GameState, weeks = 8): AgendaItem[] {
  const out: AgendaItem[] = [];
  const club = currentClub(s);
  for (let t = s.t; t < s.t + weeks; t++) {
    const md = leagueMatchdayIndex(t, s.startYear);
    if (s.membership && club && md >= 0 && md < s.membership.fixtures.length) {
      const pair = s.membership.fixtures[md].find(([h, a]) => h === club.id || a === club.id);
      if (pair) {
        const oppId = pair[0] === club.id ? pair[1] : pair[0];
        const opp = s.membership.league.find((x) => x.id === oppId);
        out.push({ t, icon: '⚽', label: `J${md + 1} · ${pair[0] === club.id ? 'vs' : '@'} ${opp?.name ?? '?'}`, kind: 'match' });
      }
    }
    for (const tr of s.tryouts) {
      if (tr.week === t && (tr.status === 'accepted' || tr.status === 'invited')) {
        out.push({ t, icon: '🔍', label: `Détection ${clubById(s, tr.clubId)?.name}${tr.status === 'invited' ? ' (à confirmer)' : ''}`, kind: 'tryout' });
      }
    }
    const cu = s.national.pendingCallup;
    if (cu && cu.week === t) out.push({ t, icon: '🎽', label: `${country(cu.nation).flag} ${cu.category} – ${cu.competition}${cu.status === 'pending' ? ' (réponse attendue)' : ''}`, kind: 'national' });
    else if (isInternationalWindow(t, s.startYear)) out.push({ t, icon: '🌍', label: 'Fenêtre internationale', kind: 'national' });
    for (const a of s.admin) if (!a.done && a.deadline === t) out.push({ t, icon: '📄', label: `Échéance : ${a.label}`, kind: 'admin' });
    for (const c of s.sponsors.contracts) if (c.active && c.end === t) out.push({ t, icon: '🤝', label: `Fin du contrat ${brand(c.brandId).name}`, kind: 'sponsor' });
    if (isSeasonEnd(t, s.startYear)) out.push({ t, icon: '🏁', label: 'Fin de saison', kind: 'season' });
    const d = dateOf(t, s.startYear);
    if (d.month === s.identity.birthMonth && d.weekOfMonth === 1 && t !== s.t) out.push({ t, icon: '🎂', label: 'Ton anniversaire', kind: 'life' });
    if (isHolidays(t, s.startYear) && !isHolidays(t - 1, s.startYear)) out.push({ t, icon: '🏖️', label: 'Début des vacances', kind: 'life' });
    if (d.month === 9 && d.weekOfMonth === 1 && t !== s.t) out.push({ t, icon: '📅', label: 'Rentrée & nouvelle saison', kind: 'season' });
  }
  return out;
}
