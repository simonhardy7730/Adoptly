// Historique & statistiques : résumé de carrière, saisons, journal.
import { useState } from 'react';
import { useGame } from '../store/gameStore';
import { formatShortDate } from '../game/calendar';
import { clubById } from '../game/career';
import { totalCaps } from '../game/national';
import { commercialIncome } from '../game/sponsors';
import { Empty, PageTitle, fmtMoney } from '../ui/kit';

export function HistoryScreen() {
  const g = useGame((s) => s.game)!;
  const [majorOnly, setMajorOnly] = useState(true);
  const seasons = g.seasons.filter((s) => s.apps > 0 || s.clubId);
  const tot = seasons.reduce((a, s) => ({ apps: a.apps + s.apps, goals: a.goals + s.goals, assists: a.assists + s.assists, rs: a.rs + s.ratingSum, rn: a.rn + s.ratedApps }), { apps: 0, goals: 0, assists: 0, rs: 0, rn: 0 });
  const caps = totalCaps(g);
  const clubs = new Set(g.seasons.map((s) => s.clubId).filter(Boolean));
  const journal = g.journal.filter((j) => !majorOnly || j.major);
  return (
    <>
      <PageTitle title="Historique & statistiques" sub="Le résumé de ta carrière, saison après saison." />
      <div className="grid g4 mb">
        <div className="card"><div className="card-title">Matchs officiels</div><div className="big-number">{tot.apps}</div></div>
        <div className="card"><div className="card-title">Buts · Passes déc.</div><div className="big-number">{tot.goals} · {tot.assists}</div></div>
        <div className="card"><div className="card-title">Note moyenne</div><div className="big-number">{tot.rn ? (tot.rs / tot.rn).toFixed(2) : '–'}</div></div>
        <div className="card"><div className="card-title">Clubs · Sélections</div><div className="big-number">{clubs.size} · {caps.youth + caps.senior}</div></div>
      </div>
      <div className="grid g2">
        <div className="col" style={{ gap: 16 }}>
          <div className="card">
            <h3>📊 Saisons</h3>
            {seasons.length === 0 ? <Empty>Aucune saison en club pour l’instant.</Empty> : (
              <table>
                <thead><tr><th>Saison</th><th>Équipe</th><th className="num">MJ</th><th className="num">Tit.</th><th className="num">B</th><th className="num">PD</th><th className="num">Note</th><th className="num">Sél.</th></tr></thead>
                <tbody>
                  {seasons.map((s, i) => (
                    <tr key={i}><td>{s.season}</td><td className="small">{s.team}</td><td className="num">{s.apps}</td><td className="num">{s.starts}</td><td className="num">{s.goals}</td><td className="num">{s.assists}</td><td className="num">{s.ratedApps ? (s.ratingSum / s.ratedApps).toFixed(1) : '–'}</td><td className="num">{s.natApps}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="card">
            <h3>🧾 Résumé</h3>
            <div className="row between small"><span className="muted">Clubs fréquentés</span><span>{[...clubs].map((c) => clubById(g, c)?.name).join(', ') || '—'}</span></div>
            <div className="row between small"><span className="muted">Détections passées</span><span>{g.tryouts.filter((t) => t.status === 'done').length} ({g.tryouts.filter((t) => t.result?.outcome === 'offer').length} réussie(s))</span></div>
            <div className="row between small"><span className="muted">Buts internationaux</span><span>{caps.goals}</span></div>
            <div className="row between small"><span className="muted">Sponsors signés</span><span>{g.sponsors.contracts.length}</span></div>
            <div className="row between small"><span className="muted">Revenus commerciaux cumulés</span><span>{fmtMoney(commercialIncome(g))}</span></div>
            <div className="row between small"><span className="muted">Événements vécus</span><span>{g.events.history.length}</span></div>
          </div>
        </div>
        <div className="card">
          <h3>📖 Journal <label className="right small muted row" style={{ gap: 6 }}><input type="checkbox" checked={majorOnly} onChange={(e) => setMajorOnly(e.target.checked)} /> Moments marquants</label></h3>
          {journal.length === 0 ? <Empty>Rien à afficher.</Empty> : journal.slice(0, 80).map((j, i) => (
            <div key={i} className="feed-item"><div className="ic">{j.icon}</div><div><div className="small">{j.text}</div><div className="tiny dim">{formatShortDate(j.t, g.startYear)}</div></div></div>
          ))}
        </div>
      </div>
    </>
  );
}
