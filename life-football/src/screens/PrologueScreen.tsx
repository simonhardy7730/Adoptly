// Prologue narratif : la famille, le quartier, le déclic, le rêve, puis les premiers pas.
import { useState } from 'react';
import { useGame } from '../store/gameStore';
import { PROLOGUE, DREAM_LABELS } from '../content/prologue';
import { describeEffects, REL_LABELS } from '../game/helpers';
import { ATTR_LABELS, background, environment } from '../content/profiles';
import { ageAt } from '../game/calendar';
import { PlayerFigure, NpcAvatar } from '../ui/Avatar';
import { ROLE_LABELS } from './RelationsScreen';
import { country } from '../content/countries';
import { ATTR_KEYS, playerOverall } from '../game/stats';
import { localClub } from '../game/actions';

export function PrologueScreen() {
  const g = useGame((s) => s.game)!;
  const choose = useGame((s) => s.choosePrologue);
  const finish = useGame((s) => s.finishPrologue);
  const setTab = useGame((s) => s.setTab);
  const [outcome, setOutcome] = useState<string | null>(null);
  const step = g.prologue.step;
  const scene = PROLOGUE[step];
  const shownStep = outcome ? step - 1 : step;
  const shownScene = PROLOGUE[shownStep];
  const age = ageAt(g);
  const labels = { ...ATTR_LABELS, ...REL_LABELS };
  const family = g.npcs.filter((n) => ['parent', 'parent2', 'sibling', 'friend', 'mentor'].includes(n.role));
  const done = step >= PROLOGUE.length && !outcome;

  return (
    <div className="fullscreen">
      <div className="inner">
        <div className="row between mb wrap">
          <div className="row">
            <div className="brand-logo">LF</div>
            <div>
              <div className="card-title" style={{ margin: 0 }}>Prologue</div>
              <div className="display" style={{ fontSize: 22, fontWeight: 800 }}>{g.identity.firstName} {g.identity.lastName}, {age} ans</div>
            </div>
          </div>
          <div className="row wrap" style={{ gap: 6 }}>
            {PROLOGUE.map((p, i) => <span key={p.id} className={`pill ${i < step ? 'green' : i === shownStep && !done ? 'gold' : ''}`}>{p.icon} {p.title}</span>)}
            <span className={`pill ${done ? 'gold' : ''}`}>👟 Premiers pas</span>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '260px minmax(0, 1fr)', alignItems: 'start' }}>
          <div className="card center">
            <PlayerFigure a={g.appearance} age={age} height={260} position={g.identity.position} />
            <div className="small muted">{country(g.identity.growUpCountry).flag} {g.identity.birthCity} · {background(g.identity.background).label}</div>
            <div className="sep" />
            <div className="card-title" style={{ textAlign: 'left' }}>Ton entourage</div>
            <div className="col" style={{ gap: 6 }}>
              {family.map((n) => (
                <div key={n.id} className="row" style={{ textAlign: 'left' }}>
                  <NpcAvatar {...n.portrait} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}><div className="small"><b>{n.name.split(' ')[0]}</b> <span className="dim">· {ROLE_LABELS[n.role]}</span></div><div className="bar" style={{ marginTop: 3 }}><span style={{ width: `${n.relation}%` }} /></div></div>
                </div>
              ))}
            </div>
          </div>

          {!done && shownScene && (
            <div className="card fade-in" key={`${shownStep}-${!!outcome}`}>
              <div className="card-title">{shownScene.kicker}</div>
              <h1 className="display" style={{ fontSize: 34 }}>{shownScene.icon} {shownScene.title}</h1>
              <p style={{ fontSize: 16, lineHeight: 1.65, maxWidth: 680 }}>{shownScene.text(g)}</p>
              <div className="sep" />
              {outcome ? (
                <div className="col">
                  <div className="pill green" style={{ whiteSpace: 'normal', fontSize: 13, padding: '10px 12px' }}>{outcome}</div>
                  <button className="btn primary lg" onClick={() => setOutcome(null)}>{step >= PROLOGUE.length ? 'Voir tes premiers pas ▶' : 'Continuer ▶'}</button>
                </div>
              ) : scene.choices(g).map((c) => (
                <button key={c.id} className="choice" onClick={() => setOutcome(choose(c.id))}>
                  <div className="t">{c.label}</div>
                  <div className="s"><span>{c.hint}</span>{describeEffects(c.effects, labels).map((x) => <span key={x}>{x}</span>)}</div>
                </button>
              ))}
            </div>
          )}

          {done && (
            <div className="card fade-in">
              <div className="card-title">Ton histoire commence</div>
              <h1 className="display" style={{ fontSize: 34 }}>👟 Tes premiers pas</h1>
              {g.prologue.choices.dream && <p className="muted">Ton rêve : <b className="green">« {DREAM_LABELS[g.prologue.choices.dream]} »</b></p>}
              <div className="grid g2">
                <div>
                  <div className="card-title">Ce que ton enfance a changé</div>
                  {ATTR_KEYS.filter((k) => Math.abs(g.player.attrs[k] - g.creation.initialAttrs[k]) >= 0.1).map((k) => {
                    const d = g.player.attrs[k] - g.creation.initialAttrs[k];
                    return <div key={k} className="row between small"><span>{ATTR_LABELS[k]}</span><b className={d > 0 ? 'green' : 'red'}>{d > 0 ? '+' : ''}{d.toFixed(1)}</b></div>;
                  })}
                  <div className="row between small mt"><span className="muted">Niveau de départ</span><b>{Math.round(playerOverall(g))}</b></div>
                  <div className="row between small"><span className="muted">Environnement</span><b>{environment(g.identity.environment).label}</b></div>
                </div>
                <div className="col">
                  <div className="card-title">Ce qui t’attend</div>
                  <div className="feed-item"><div className="ic">🎯</div><div><div className="t">Tes premières séances</div><div className="b">Onglet Entraînement : séances, mini-jeux, repos. Chaque semaine compte {g.slots.max} actions.</div></div></div>
                  <div className="feed-item"><div className="ic">🏟️</div><div><div className="t">{localClub(g)?.name ?? 'Le club local'}</div><div className="b">Rends-lui visite (action « Visiter le club local ») pour obtenir une licence.</div></div></div>
                  <div className="feed-item"><div className="ic">🔍</div><div><div className="t">Les détections</div><div className="b">Brille en match : les recruteurs des clubs formateurs t’inviteront.</div></div></div>
                </div>
              </div>
              <div className="row mt wrap">
                <button className="btn primary lg" onClick={() => finish()}>Commencer ma première semaine ▶</button>
                <button className="btn" onClick={() => { finish(); setTab('training'); }}>Aller directement à l’entraînement</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
