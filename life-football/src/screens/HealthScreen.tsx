// Santé : blessure en cours (phases, traitement), risque de blessure détaillé, charge, historique.
import { useGame } from '../store/gameStore';
import { injuryRisk, injuryStatusText, TREATMENTS } from '../game/injuries';
import { injuryType, PART_LABELS } from '../content/injuries';
import { currentClub } from '../game/career';
import { formatShortDate } from '../game/calendar';
import { Empty, PageTitle, StatBar, fmtMoney } from '../ui/kit';
import type { Treatment } from '../game/types';

function riskLabel(p: number) {
  return p >= 0.05 ? { t: 'Élevé', c: 'red' } : p >= 0.02 ? { t: 'Modéré', c: 'gold' } : { t: 'Faible', c: 'green' };
}

export function HealthScreen() {
  const g = useGame((s) => s.game)!;
  const treat = useGame((s) => s.treat);
  const act = useGame((s) => s.act);
  const setTab = useGame((s) => s.setTab);
  const p = g.player;
  const inj = p.injury;
  const club = currentClub(g);
  const match = injuryRisk(g, 'match');
  const training = injuryRisk(g, 'training');
  const total = inj?.weeksTotal ?? inj?.weeksLeft ?? 1;
  const progress = inj ? Math.max(0, Math.min(100, (1 - inj.weeksLeft / total) * 100)) : 0;
  const medical = club ? Math.round(club.facilities) : null;
  return (
    <>
      <PageTitle title="Santé & blessures" sub="Ton corps est ton outil de travail : fatigue, charge et antécédents augmentent le risque." />
      <div className="grid g2">
        <div className="col" style={{ gap: 16 }}>
          <div className="card" style={inj ? { borderColor: 'var(--red)' } : undefined}>
            <h3>{inj ? '🚑 Blessure en cours' : '✅ Aucune blessure'}</h3>
            {inj ? (
              <>
                <div className="row between"><b style={{ fontSize: 17 }}>{inj.name}</b>{inj.part && <span className="pill red">{PART_LABELS[inj.part]}</span>}</div>
                <div className="small muted">{injuryType(inj.id)?.description}</div>
                <div className="small mt">{injuryStatusText(inj)}{inj.cause ? ` · ${inj.cause}` : ''}</div>
                <div className="bar mt" style={{ height: 10 }}><span style={{ width: `${progress}%` }} /></div>
                <div className="row between tiny dim" style={{ marginTop: 4 }}><span>Repos</span><span>Rééducation</span><span>Reprise</span></div>
                <div className="sep" />
                <div className="card-title">Traitement</div>
                {(Object.keys(TREATMENTS) as Treatment[]).map((tr) => {
                  const t = TREATMENTS[tr];
                  const on = (inj.treatment ?? 'standard') === tr;
                  const why = tr === 'specialist' && !on && g.money < t.cost ? `Pas assez d’argent (${fmtMoney(t.cost)})` : null;
                  return (
                    <button key={tr} className={`pick-card ${on ? 'on' : ''}`} style={{ marginBottom: 8, opacity: why ? 0.5 : 1 }} disabled={on || !!why} onClick={() => treat(tr)}>
                      <b>{t.label}{t.cost ? ` · ${fmtMoney(t.cost)}` : ''}</b>
                      <div className="tiny muted">{t.desc}</div>
                      {why && <div className="tiny orange">{why}</div>}
                    </button>
                  );
                })}
                <div className="row wrap">
                  <button className="btn sm" disabled={g.slots.left < 1} onClick={() => act('physio')}>🩺 Séance de kiné</button>
                  <button className="btn sm" disabled={g.slots.left < 1} onClick={() => act('rest')}>😴 Repos</button>
                </div>
                <p className="tiny dim">Le sommeil, l’alimentation et la qualité du staff médical{medical !== null ? ` (${medical}/100 à ${club!.name})` : ''} accélèrent la guérison.</p>
              </>
            ) : (
              <p className="small muted">{p.returnUntil >= g.t ? `Tu reviens de blessure : prudence jusqu’au ${formatShortDate(p.returnUntil, g.startYear)} (risque de rechute accru).` : 'Tu es apte à jouer et à t’entraîner.'}</p>
            )}
          </div>
          <div className="card">
            <h3>📋 Historique médical</h3>
            {p.injuryHistory.length === 0 ? <Empty>Aucune blessure jusqu’ici.</Empty> : (
              <table>
                <thead><tr><th>Date</th><th>Blessure</th><th className="num">Durée</th></tr></thead>
                <tbody>{p.injuryHistory.map((h, i) => <tr key={i}><td className="tiny muted">{formatShortDate(h.t, g.startYear)}</td><td className="small">{h.name} <span className="dim">· {PART_LABELS[h.part]}</span></td><td className="num">{Math.round(h.weeks)} sem.</td></tr>)}</tbody>
              </table>
            )}
          </div>
        </div>
        <div className="col" style={{ gap: 16 }}>
          <div className="card">
            <h3>⚠️ Risque de blessure</h3>
            {[['En match', match.p], ['À l’entraînement', training.p]].map(([l, v]) => {
              const r = riskLabel(v as number);
              return <div key={l as string} className="row between" style={{ marginBottom: 6 }}><span>{l}</span><span className={`pill ${r.c}`}>{r.t} · {((v as number) * 100).toFixed(1)} %</span></div>;
            })}
            <div className="card-title mt">Facteurs actuels</div>
            {match.factors.length === 0 ? <div className="small green">Aucun facteur aggravant.</div> : match.factors.map((f) => <div key={f.label} className="row between small"><span>{f.label}</span><b className="red">×{f.mult.toFixed(1)}</b></div>)}
            <div className="sep" />
            <StatBar label="Charge de travail" value={Math.round(p.load)} color="auto" hint="Entraînements, matchs et séances du club. Au-delà de 65, le risque augmente." />
            <StatBar label="Énergie" value={Math.round(p.energy)} color="auto" />
            <StatBar label="Nutrition" value={Math.round(p.nutrition)} color="auto" />
            <StatBar label="Usure des crampons" value={Math.round(p.boots.wear)} color="gold" suffix="%" />
            <div className="row wrap mt">
              <button className="btn sm" onClick={() => setTab('training')}>Gérer ma semaine</button>
              <button className="btn sm" onClick={() => setTab('life')}>Alimentation & crampons</button>
              {g.membership && <button className="btn sm" onClick={() => setTab('coach')}>Parler au coach</button>}
            </div>
            <p className="tiny dim">Une douleur cachée au staff triple le risque. Signaler sa fatigue au coach permet d’être ménagé.</p>
          </div>
        </div>
      </div>
    </>
  );
}
