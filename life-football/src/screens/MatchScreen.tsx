// Match : avant-match (préparation, approche), direct narratif avec moments clés, bilan.
import { useEffect, useMemo, useState } from 'react';
import { useGame } from '../store/gameStore';
import { chanceLabel, myTeam, oppTeam, resultLabel, type Approach, type Preparation } from '../game/match';
import { Crest, StatBar, ratingColor } from '../ui/kit';
import { ATTR_LABELS } from '../content/profiles';
import { STATUS_LABELS } from '../game/career';
import { Match2DView } from '../match2d/Match2DView';
import { matchPlan } from '../game/coach';
import { COACH_STYLES, INSTRUCTIONS, TEMPERAMENTS } from '../content/coaches';

const APPROACHES: { id: Approach; label: string; desc: string }[] = [
  { id: 'focused', label: '🎯 Concentré', desc: 'Bonus lié à ton mental. Équilibré.' },
  { id: 'calm', label: '🧊 Calme & collectif', desc: 'Passes et placement facilités, moins d’éclairs.' },
  { id: 'aggressive', label: '🔥 Agressif', desc: 'Duels, tirs et pressing facilités. Risque de blessure accru.' },
];
const PREPS: { id: Preparation; label: string; desc: string }[] = [
  { id: 'light', label: 'Échauffement léger', desc: 'Énergie +4' },
  { id: 'normal', label: 'Préparation normale', desc: 'Aucun effet particulier' },
  { id: 'intense', label: 'Préparation intense', desc: 'Exécution +, énergie −6' },
];

export function MatchScreen() {
  const g = useGame((s) => s.game)!;
  const m = useGame((s) => s.match)!;
  const lines = useGame((s) => s.matchLines);
  const kickOff = useGame((s) => s.kickOff);
  const choose = useGame((s) => s.choose);
  const endMatch = useGame((s) => s.endMatch);
  const [approach, setApproach] = useState<Approach>('focused');
  const [prep, setPrep] = useState<Preparation>('normal');
  const [shown, setShown] = useState(0);
  const [mode, setMode] = useState<'2d' | 'text'>('2d');
  const [follow, setFollow] = useState(true);
  const plan = useMemo(() => matchPlan(g, m), [g, m]);
  const match2d = useGame((s) => s.match2d);
  const kickOff2D = useGame((s) => s.kickOff2D);
  const finish2D = useGame((s) => s.finish2D);
  const is2d = m.meta?.mode === '2d';

  useEffect(() => {
    if (shown < m.ticker.length) {
      const t = setTimeout(() => setShown((x) => x + 1), m.ticker[shown]?.kind === 'whistle' ? 500 : 650);
      return () => clearTimeout(t);
    }
  }, [shown, m.ticker]);

  const revealed = m.ticker.slice(0, is2d ? m.ticker.length : shown);
  const homeIsMine = m.playerHome;
  const goalsFor = revealed.filter((x) => x.kind === 'goal_for').length;
  const goalsAgainst = revealed.filter((x) => x.kind === 'goal_against').length;
  const score = homeIsMine ? [goalsFor, goalsAgainst] : [goalsAgainst, goalsFor];
  const minute = revealed.length ? revealed[revealed.length - 1].minute : 0;
  const caughtUp = is2d || shown >= m.ticker.length;
  const moment = caughtUp && m.status === 'moment' ? m.moments[m.momentIdx] : null;
  const finished = caughtUp && m.status === 'done';

  if (match2d) {
    return (
      <div className="fullscreen">
        <div className="inner">
          <div className="row between mb wrap">
            <div><div className="card-title" style={{ margin: 0 }}>{m.competition}</div><h1 className="display" style={{ fontSize: 26 }}>Match en direct</h1></div>
            {m.scoutWatching && m.kind !== 'street' && <span className="pill gold">🔭 Des recruteurs sont dans les tribunes</span>}
          </div>
          <Match2DView config={match2d} onFinish={finish2D} finishLabel="Voir mon bilan ▶" title={m.competition} />
        </div>
      </div>
    );
  }

  return (
    <div className="fullscreen">
      <div className="inner">
        <div className="row between mb">
          <div><div className="card-title" style={{ margin: 0 }}>{m.competition}</div><h1 className="display" style={{ fontSize: 26 }}>Jour de match</h1></div>
          {m.scoutWatching && m.kind !== 'street' && <span className="pill gold">🔭 Des recruteurs sont dans les tribunes</span>}
        </div>

        <div className="scoreboard mb">
          <div className="team"><Crest name={m.home.name} colors={m.home.colors} />{m.home.name}{homeIsMine && <span className="pill green">Toi</span>}</div>
          <div><div className="score">{m.status === 'pre' ? 'VS' : `${score[0]} – ${score[1]}`}</div><div className="minute">{m.status === 'pre' ? 'AVANT-MATCH' : finished ? 'TERMINÉ' : `${minute}'`}</div></div>
          <div className="team away">{!homeIsMine && <span className="pill green">Toi</span>}{m.away.name}<Crest name={m.away.name} colors={m.away.colors} /></div>
        </div>
        {m.status !== 'pre' && <div className="bar mb"><span style={{ width: `${(minute / 90) * 100}%` }} /></div>}

        {m.status === 'pre' && (
          <div className="card mb" style={{ borderColor: 'var(--green-2)' }}>
            <div className="row wrap between">
              <div>
                <div className="card-title" style={{ margin: 0 }}>📣 Plan de {plan.coachName}</div>
                <div className="small muted">{m.kind === 'street' ? 'Match libre' : `${plan.formation} · ${COACH_STYLES[plan.style].label}${plan.temperament ? ` · ${TEMPERAMENTS[plan.temperament].label.toLowerCase()}` : ''} · plan du jour : ${plan.tactic.mentality === 'attacking' ? 'prendre l’initiative' : plan.tactic.mentality === 'defensive' ? 'rester compact' : 'équilibre'}, pressing ${plan.tactic.pressing >= 0.7 ? 'élevé' : plan.tactic.pressing <= 0.4 ? 'bas' : 'moyen'}`}</div>
              </div>
              {plan.instruction && <span className="pill green">Consigne : {INSTRUCTIONS[plan.instruction].short}</span>}
            </div>
            <p style={{ margin: '8px 0' }}>« {plan.talk} »</p>
            {plan.instruction && (
              <div className="seg">
                <button className={follow ? 'on' : ''} onClick={() => setFollow(true)}>✅ Appliquer la consigne</button>
                <button className={!follow ? 'on' : ''} onClick={() => setFollow(false)}>🎲 Jouer à ma façon</button>
              </div>
            )}
            {plan.instruction && <div className="tiny dim" style={{ marginTop: 6 }}>{follow ? INSTRUCTIONS[plan.instruction].description + ' Le coach appréciera.' : plan.temperament === 'exigeant' ? 'Ton entraîneur est exigeant : il n’aime pas qu’on ignore ses consignes.' : 'Tu joues selon ton instinct. Le coach jugera sur le résultat.'}</div>}
          </div>
        )}
        {m.status === 'pre' ? (
          <div className="grid g3">
            <div className="card">
              <h3>📋 Ton statut</h3>
              <div className="pill green mb">{STATUS_LABELS[m.squadStatus]}</div>
              {m.entersAt > 0 && m.entersAt < 90 && <p className="small muted">Tu devrais entrer vers la {m.entersAt}e minute : moins de moments clés.</p>}
              <StatBar label="Énergie" value={Math.round(g.player.energy)} color="auto" />
              <StatBar label="Moral" value={Math.round(g.player.morale)} color="blue" />
              <StatBar label="Forme" value={Math.round(g.player.form)} color="gold" />
              <div className="small muted">Force estimée : {myTeam(m).name} {Math.round(myTeam(m).strength)} · {oppTeam(m).name} {Math.round(oppTeam(m).strength)}</div>
            </div>
            <div className="card">
              <h3>🔥 Préparation</h3>
              {PREPS.map((p) => <button key={p.id} className={`pick-card ${prep === p.id ? 'on' : ''}`} style={{ marginBottom: 8 }} onClick={() => setPrep(p.id)}><b>{p.label}</b><div className="tiny muted">{p.desc}</div></button>)}
            </div>
            <div className="card">
              <h3>🧠 Approche mentale</h3>
              {APPROACHES.map((a) => <button key={a.id} className={`pick-card ${approach === a.id ? 'on' : ''}`} style={{ marginBottom: 8 }} onClick={() => setApproach(a.id)}><b>{a.label}</b><div className="tiny muted">{a.desc}</div></button>)}
              <div className="card-title" style={{ marginTop: 6 }}>Affichage du match</div>
              <div className="seg mb">
                <button className={mode === '2d' ? 'on' : ''} onClick={() => setMode('2d')}>🎥 Animé 2D</button>
                <button className={mode === 'text' ? 'on' : ''} onClick={() => setMode('text')}>🎙️ Commenté (tes décisions)</button>
              </div>
              <div className="tiny dim mb">{mode === '2d' ? 'Tu regardes le match en spectateur : ton joueur agit selon ses statistiques, ta forme et ton approche.' : 'Le match est raconté et tu choisis ton action dans les moments clés.'}</div>
              <button className="btn primary lg block" onClick={() => { setShown(0); if (mode === '2d') kickOff2D(approach, prep, follow); else kickOff(approach, prep, follow); }}>Coup d’envoi ▶</button>
            </div>
          </div>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', alignItems: 'start' }}>
            <div className="card">
              <h3>🎙️ Le match en direct</h3>
              <div className="ticker">
                {[...revealed].reverse().map((it, i) => (
                  <div key={revealed.length - i} className={`tick ${it.kind}`}><span className="m">{it.minute}'</span><span>{it.text}</span></div>
                ))}
              </div>
              {!caughtUp && <button className="btn sm ghost mt" onClick={() => setShown(m.ticker.length)}>Passer l’animation ⏩</button>}
            </div>
            <div>
              {moment && (
                <div className="card fade-in" style={{ borderColor: 'var(--blue)' }}>
                  <div className="card-title">⏱ Moment clé</div>
                  <p style={{ fontSize: 16, lineHeight: 1.55, marginTop: 0 }}>{moment.text}</p>
                  {moment.options.map((o) => (
                    <button key={o.id} className="choice" onClick={() => choose(o.id)}>
                      <div className="row between"><span className="t">{o.label}</span><span className={`pill ${o.risk === 'élevé' ? 'red' : o.risk === 'moyen' ? 'gold' : 'green'}`}>Risque {o.risk}</span></div>
                      <div className="s">
                        <span>{chanceLabel(o.chance ?? 0.5)}</span>
                        <span>{o.attrs.map((a) => ATTR_LABELS[a]).join(' · ')}</span>
                      </div>
                    </button>
                  ))}
                  <div className="tiny dim">Les chances dépendent de tes compétences, de ta fraîcheur, de ton moral, de ton approche et du niveau adverse. L’entraîneur valorise aussi les bonnes décisions.</div>
                </div>
              )}
              {!moment && !finished && <div className="card"><div className="muted small">Le match se poursuit…</div></div>}
              {finished && !lines.length && (
                <div className="card center fade-in">
                  <div className="display" style={{ fontSize: 34, fontWeight: 800, color: resultLabel(m) === 'V' ? 'var(--green)' : resultLabel(m) === 'D' ? 'var(--red)' : 'var(--gold)' }}>{resultLabel(m) === 'V' ? 'Victoire' : resultLabel(m) === 'D' ? 'Défaite' : 'Match nul'}</div>
                  <button className="btn primary lg mt" onClick={endMatch}>Voir le bilan</button>
                </div>
              )}
              {finished && lines.length > 0 && (
                <div className="card fade-in">
                  <h3>📊 Bilan individuel</h3>
                  <div className="row" style={{ gap: 18 }}>
                    {m.rating !== null ? <div className="rating" style={{ background: ratingColor(m.rating) }}>{m.rating.toFixed(1)}</div> : <span className="pill">Pas de note (non entré en jeu)</span>}
                    <div className="grid g3" style={{ flex: 1 }}>
                      <div><div className="tiny dim">Buts</div><b className="display" style={{ fontSize: 22 }}>{m.stats.goals}</b></div>
                      <div><div className="tiny dim">Passes déc.</div><b className="display" style={{ fontSize: 22 }}>{m.stats.assists}</b></div>
                      <div><div className="tiny dim">{is2d ? 'Passes réussies' : 'Moments réussis'}</div><b className="display" style={{ fontSize: 22 }}>{m.stats.momentsWon}/{m.stats.momentsTotal}</b></div>
                    </div>
                  </div>
                  <div className="sep" />
                  {lines.map((l) => <div key={l} className="feed-item"><div className="ic">•</div><div className="small">{l}</div></div>)}
                  <div className="small muted">Énergie restante : {Math.round(g.player.energy)} · Réputation sportive : {Math.round(g.reputation.sport)}</div>
                  <button className="btn primary block mt" onClick={endMatch}>Continuer</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
