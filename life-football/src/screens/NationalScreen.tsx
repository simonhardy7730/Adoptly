// Sélections : éligibilité, convocations, sélectionnabilité, statistiques internationales.
import { useGame } from '../store/gameStore';
import { nationEligibility } from '../game/eligibility';
import { ageAt, formatShortDate } from '../game/calendar';
import { categoryFor, selectionScore, totalCaps } from '../game/national';
import { country } from '../content/countries';
import { PageTitle, Empty } from '../ui/kit';

export function NationalScreen() {
  const g = useGame((s) => s.game)!;
  const callup = useGame((s) => s.callup);
  const age = ageAt(g);
  const nations = nationEligibility(g);
  const cu = g.national.pendingCallup;
  const caps = totalCaps(g);
  const cat = categoryFor(age);
  return (
    <>
      <PageTitle title="Sélections nationales" sub={cat ? `Catégorie actuelle : ${cat}. Fenêtres internationales en octobre, novembre, mars et juin.` : 'Les sélections de jeunes commencent à 13 ans (U15).'} />
      <div className="grid g3 mb">
        <div className="card"><div className="card-title">Sélections jeunes</div><div className="big-number">{caps.youth}</div></div>
        <div className="card"><div className="card-title">Sélections A</div><div className="big-number">{caps.senior}</div></div>
        <div className="card"><div className="card-title">Buts internationaux</div><div className="big-number">{caps.goals}</div></div>
      </div>
      <div className="grid g2">
        <div className="col" style={{ gap: 16 }}>
          {cu && (
            <div className="card" style={{ borderColor: 'var(--gold)' }}>
              <h3>🎽 Convocation {country(cu.nation).flag} {country(cu.nation).name} — {cu.category}</h3>
              <p className="small">{cu.competition} · {formatShortDate(cu.week, g.startYear)} · adversaire : {country(cu.opponents[0]).flag} {country(cu.opponents[0]).name}{cu.category === 'A' ? ` · ${cu.official ? 'match officiel (engageant)' : 'match amical (non engageant)'}` : ''}</p>
              <p className="tiny muted">Conséquences : réputation, popularité et visibilité auprès des clubs et sponsors en hausse ; fatigue du voyage ; si un match de championnat tombe la même semaine, tu le manques.</p>
              {cu.status === 'pending' ? (
                <div className="row">
                  <button className="btn primary" onClick={() => callup(true)}>Accepter la convocation</button>
                  <button className="btn ghost" onClick={() => callup(false)}>Décliner</button>
                </div>
              ) : <span className="pill green">✓ Acceptée — rendez-vous la semaine du rassemblement</span>}
            </div>
          )}
          <div className="card">
            <h3>📈 Ta sélectionnabilité</h3>
            {!cat && <Empty>Reviens à 13 ans : les sélectionneurs U15 observent les meilleurs jeunes des centres de formation.</Empty>}
            {cat && nations.filter((n) => n.status !== 'locked').map((n) => {
              const y = selectionScore(g, n.code, false);
              const ratio = Math.max(0, Math.min(1, (y.score - (y.threshold - 15)) / 15));
              return (
                <div key={n.code} style={{ marginBottom: 12 }}>
                  <div className="row between small"><b>{n.flag} {n.name}</b><span className="muted">Concurrence : {n.strength >= 85 ? 'très forte' : n.strength >= 72 ? 'forte' : n.strength >= 60 ? 'moyenne' : 'modérée'}</span></div>
                  <div className={`bar ${ratio >= 1 ? '' : 'gold'}`} style={{ marginTop: 4, height: 9 }}><span style={{ width: `${ratio * 100}%` }} /></div>
                  <div className="tiny dim">{ratio >= 1 ? 'Tu es dans le radar du sélectionneur.' : `Encore ~${Math.ceil(y.threshold - y.score)} points de niveau/réputation pour être appelé.`}</div>
                </div>
              );
            })}
            <div className="tiny dim">Critères : niveau, réputation, niveau du club, forme récente, poste et concurrence du pays.</div>
          </div>
        </div>
        <div className="col" style={{ gap: 16 }}>
          <div className="card">
            <h3>🌍 Éligibilité</h3>
            {nations.map((n) => (
              <div key={n.code} className="row between" style={{ marginBottom: 8 }}>
                <div><b>{n.flag} {n.name}</b><div className="tiny muted">{n.reason}</div></div>
                <span className={`pill ${n.status === 'committed' ? 'gold' : n.status === 'locked' ? 'red' : 'green'}`}>{n.status === 'committed' ? 'Engagé' : n.status === 'locked' ? 'Verrouillé' : 'Éligible'}</span>
              </div>
            ))}
            {nations.length > 1 && !g.national.committedTo && <p className="tiny dim">Double nationalité : tu peux jouer chez les jeunes pour l’une ou l’autre. Le premier match officiel en équipe A tranchera définitivement.</p>}
          </div>
          <div className="card">
            <h3>📜 Historique des convocations</h3>
            {g.national.callupHistory.length === 0 ? <Empty>Aucune convocation pour l’instant.</Empty> : [...g.national.callupHistory].reverse().slice(0, 12).map((c) => (
              <div key={c.id} className="feed-item"><div className="ic">{country(c.nation).flag}</div><div><div className="t">{c.category} · {c.competition}</div><div className="b">{formatShortDate(c.week, g.startYear)} · {c.status === 'played' ? 'Joué' : 'Décliné'}</div></div></div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
