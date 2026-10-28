// Calendrier : semaines à venir sur 3 mois, avec matchs, détections, sélections, échéances.
import { useGame } from '../store/gameStore';
import { agenda } from '../game/agenda';
import { dateOf, MONTHS, isHolidays, isLeagueWeek, isInternationalWindow } from '../game/calendar';
import { PageTitle } from '../ui/kit';

export function CalendarScreen() {
  const g = useGame((s) => s.game)!;
  const weeks = 16;
  const items = agenda(g, weeks);
  const months: { key: string; label: string; weeks: number[] }[] = [];
  for (let t = g.t; t < g.t + weeks; t++) {
    const d = dateOf(t, g.startYear);
    const key = `${d.year}-${d.month}`;
    let m = months.find((x) => x.key === key);
    if (!m) months.push((m = { key, label: `${MONTHS[d.month - 1]} ${d.year}`, weeks: [] }));
    m.weeks.push(t);
  }
  return (
    <>
      <PageTitle title="Calendrier" sub="Une semaine = un tour de jeu. Les matchs de championnat ont lieu les semaines 2 et 3 de septembre à mai." />
      <div className="row wrap mb" style={{ gap: 8 }}>
        <span className="pill green">⚽ Match</span><span className="pill blue">🌍 International</span><span className="pill gold">🔍 Détection</span><span className="pill">🏖️ Vacances (+3 actions)</span><span className="pill red">📄 Échéance</span>
      </div>
      <div className="grid g4">
        {months.map((m) => (
          <div key={m.key} className="card">
            <h3 className="display" style={{ fontSize: 18, textTransform: 'capitalize' }}>{m.label}</h3>
            {m.weeks.map((t) => {
              const d = dateOf(t, g.startYear);
              const its = items.filter((i) => i.t === t);
              const now = t === g.t;
              return (
                <div key={t} style={{ padding: '8px 10px', borderRadius: 10, marginBottom: 6, border: `1px solid ${now ? 'var(--green)' : 'var(--line)'}`, background: now ? 'var(--green-soft)' : isHolidays(t, g.startYear) ? 'rgba(244,201,93,0.05)' : 'var(--panel)' }}>
                  <div className="row between tiny">
                    <b>Semaine {d.weekOfMonth}{now ? ' · maintenant' : ''}</b>
                    <span className="dim">{isHolidays(t, g.startYear) ? '🏖️' : ''}{isLeagueWeek(t, g.startYear) ? '⚽' : ''}{isInternationalWindow(t, g.startYear) ? '🌍' : ''}</span>
                  </div>
                  {its.length === 0 ? <div className="tiny dim">—</div> : its.map((i, k) => <div key={k} className="tiny" style={{ marginTop: 3 }}>{i.icon} {i.label}</div>)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}
