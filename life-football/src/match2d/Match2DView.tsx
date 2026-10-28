// Vue du match 2D : canvas + contrôles du spectateur + fil des moments + statistiques.
// La simulation avance par pas fixes (DT) ; la vitesse d'affichage ne change que le nombre de pas
// exécutés par image, jamais le résultat.

import { useEffect, useRef, useState } from 'react';
import type { SimConfig, SimState } from './types';
import { createSim, DT, minute, runToEnd, skipToNextKey, step } from './sim';
import { drawFrame, type Camera, type ViewOpts } from './render';
import { resultOf, type SimResult } from './build';

const SPEEDS = [1, 2, 4, 8];

function clock(s: SimState) {
  const m = minute(s);
  const mm = Math.floor(m);
  const ss = Math.floor((m - mm) * 60);
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export function Match2DView({ config, onFinish, finishLabel = 'Terminer', title }: { config: SimConfig; onFinish: (r: SimResult, s: SimState) => void; finishLabel?: string; title?: string }) {
  const simRef = useRef<SimState>(createSim(config));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const camRef = useRef<Camera>({ zoom: 1, fx: config.pitch.L / 2, fy: config.pitch.W / 2 });
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [opts, setOpts] = useState<ViewOpts>({ names: false, tactics: false, effects: true });
  const [, setTick] = useState(0);
  const runRef = useRef({ running, speed, opts });
  runRef.current = { running, speed, opts };

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let uiAcc = 0;
    const loop = (now: number) => {
      const s = simRef.current;
      const real = Math.min(0.1, (now - last) / 1000);
      last = now;
      const { running: on, speed: sp, opts: o } = runRef.current;
      if (on && !s.done) {
        const slow = o.effects && sp <= 2 && s.t < s.slowUntil ? 0.4 : 1;
        acc += real * sp * slow;
        let n = 0;
        while (acc >= DT && n < 400) { step(s); acc -= DT; n++; }
      }
      const c = canvasRef.current;
      const wrap = wrapRef.current;
      if (c && wrap) {
        const w = wrap.clientWidth;
        const h = Math.round(w * (config.pitch.W + 10) / (config.pitch.L + 10));
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
          c.width = Math.round(w * dpr);
          c.height = Math.round(h * dpr);
          c.style.height = `${h}px`;
        }
        const ctx = c.getContext('2d');
        if (ctx) drawFrame(ctx, s, w, h, dpr, o, camRef.current);
      }
      uiAcc += real;
      if (uiAcc > 0.1) { uiAcc = 0; setTick((x) => x + 1); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [config.pitch.L, config.pitch.W]);

  const s = simRef.current;
  const [t0, t1] = s.cfg.teams;
  const banner = opts.effects && s.banner && s.t < s.banner.until ? s.banner : null;
  const keyEvents = s.events.filter((e) => e.key || e.type === 'shot').slice(-14).reverse();
  const poss = s.stats[0].possession + s.stats[1].possession || 1;
  const user = s.players.find((p) => p.isUser && p.onPitch);
  const skip = () => {
    const e = skipToNextKey(s);
    if (e) { s.slowUntil = s.t + 1; s.focusUntil = Math.max(s.focusUntil, s.t + 1.5); }
    setTick((x) => x + 1);
  };
  const toggle = (k: keyof ViewOpts) => setOpts((o) => ({ ...o, [k]: !o[k] }));

  return (
    <div className="m2d">
      <div className="scoreboard m2d-score">
        <div className="team"><span className="crest" style={{ background: t0.colors[0], color: t0.colors[1] }}>{t0.short}</span>{t0.name}</div>
        <div>
          <div className="score">{s.score[0]} – {s.score[1]}</div>
          <div className="minute">{s.done ? 'TERMINÉ' : s.phase === 'halftime' ? 'MI-TEMPS' : `${clock(s)} · ${s.half === 1 ? '1re' : '2e'} MT`}</div>
        </div>
        <div className="team away">{t1.name}<span className="crest" style={{ background: t1.colors[0], color: t1.colors[1] }}>{t1.short}</span></div>
      </div>

      <div className="m2d-stage" ref={wrapRef} style={{ maxWidth: `max(320px, calc((100vh - 240px) * ${((config.pitch.L + 10) / (config.pitch.W + 10)).toFixed(3)}))`, margin: '0 auto' }}>
        <canvas ref={canvasRef} className="m2d-canvas" aria-label={`Match ${t0.name} contre ${t1.name}`} />
        {banner && <div className={`m2d-banner ${banner.kind}`} key={`${banner.text}${banner.until}`}>{banner.text}</div>}
        {!started && (
          <div className="m2d-overlay">
            {title && <div className="card-title" style={{ color: 'var(--text)' }}>{title}</div>}
            <button className="btn primary lg" onClick={() => { setStarted(true); setRunning(true); }}>▶ Coup d’envoi</button>
            {user === undefined && config.userEntersAt !== undefined && <div className="small">Tu commences sur le banc : entrée prévue vers la {config.userEntersAt}e minute.</div>}
          </div>
        )}
        {s.done && (
          <div className="m2d-overlay end">
            <Summary s={s} onFinish={() => onFinish(resultOf(s), s)} finishLabel={finishLabel} />
          </div>
        )}
      </div>

      <div className="m2d-controls">
        <button className="btn primary sm" disabled={!started || s.done} onClick={() => setRunning(!running)}>{running ? '⏸ Pause' : '▶ Reprendre'}</button>
        <div className="seg">
          {SPEEDS.map((x) => <button key={x} className={speed === x ? 'on' : ''} onClick={() => setSpeed(x)}>×{x}</button>)}
        </div>
        <button className="btn sm" disabled={!started || s.done} onClick={skip} title="Avance jusqu’au prochain moment fort">⏭ Moment fort</button>
        <button className="btn sm ghost" disabled={!started || s.done} onClick={() => { runToEnd(s); setTick((x) => x + 1); }}>⏩ Fin du match</button>
        <div className="seg right">
          <button className={opts.names ? 'on' : ''} onClick={() => toggle('names')}>Noms</button>
          <button className={opts.tactics ? 'on' : ''} onClick={() => toggle('tactics')}>Tactique</button>
          <button className={opts.effects ? 'on' : ''} onClick={() => toggle('effects')} title="Bannières, zoom et ralenti">Effets</button>
        </div>
      </div>

      <div className="grid g2 mt">
        <div className="card flat">
          <h3>🎙️ Moments du match</h3>
          {keyEvents.length === 0 ? <div className="small muted">Le match n’a pas encore commencé.</div> : keyEvents.map((e, i) => (
            <div key={`${e.t}-${i}`} className={`tick ${e.type === 'goal' ? (e.team === 0 ? 'goal_for' : 'goal_against') : e.type === 'save' ? 'moment' : ''}`}><span className="m">{e.minute}'</span><span>{e.text}</span></div>
          ))}
        </div>
        <div className="card flat">
          <h3>📊 Statistiques en direct</h3>
          <StatLine label="Possession" a={`${Math.round((s.stats[0].possession / poss) * 100)} %`} b={`${Math.round((s.stats[1].possession / poss) * 100)} %`} pa={s.stats[0].possession / poss} />
          <StatLine label="Tirs (cadrés)" a={`${s.stats[0].shots} (${s.stats[0].shotsOn})`} b={`${s.stats[1].shots} (${s.stats[1].shotsOn})`} pa={(s.stats[0].shots + 0.5) / (s.stats[0].shots + s.stats[1].shots + 1)} />
          <StatLine label="Passes réussies" a={`${s.stats[0].passesOk}/${s.stats[0].passes}`} b={`${s.stats[1].passesOk}/${s.stats[1].passes}`} pa={(s.stats[0].passesOk + 1) / (s.stats[0].passesOk + s.stats[1].passesOk + 2)} />
          <StatLine label="Fautes · cartons" a={`${s.stats[0].fouls} · ${s.stats[0].yellows + s.stats[0].reds}`} b={`${s.stats[1].fouls} · ${s.stats[1].yellows + s.stats[1].reds}`} pa={0.5} />
          <StatLine label="Corners" a={`${s.stats[0].corners}`} b={`${s.stats[1].corners}`} pa={(s.stats[0].corners + 0.5) / (s.stats[0].corners + s.stats[1].corners + 1)} />
          {user && (
            <div className="small mt">
              <b className="green">Toi ({user.name})</b> · {user.tally.touches} ballons touchés · passes {user.tally.passesOk}/{user.tally.passes} · tirs {user.tally.shots} · buts {user.tally.goals} · énergie {Math.round(user.energy * 100)} %
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatLine({ label, a, b, pa }: { label: string; a: string; b: string; pa: number }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div className="row between small"><b>{a}</b><span className="muted">{label}</span><b>{b}</b></div>
      <div className="bar" style={{ height: 6 }}><span style={{ width: `${Math.round(pa * 100)}%` }} /></div>
    </div>
  );
}

function Summary({ s, onFinish, finishLabel }: { s: SimState; onFinish: () => void; finishLabel: string }) {
  const r = resultOf(s);
  const [t0, t1] = s.cfg.teams;
  const u = r.ratings.find((x) => x.isUser);
  const goals = s.events.filter((e) => e.type === 'goal');
  return (
    <div className="card m2d-summary">
      <div className="card-title">Fin du match</div>
      <h2 className="display" style={{ fontSize: 28 }}>{t0.name} {s.score[0]} – {s.score[1]} {t1.name}</h2>
      <div className="small muted mb">{goals.length ? goals.map((g) => `⚽ ${g.minute}' ${s.players.find((p) => p.id === g.player)?.name ?? ''}`).join(' · ') : 'Aucun but.'}</div>
      <div className="grid g2">
        <table>
          <thead><tr><th>Statistique</th><th className="num">{t0.short}</th><th className="num">{t1.short}</th></tr></thead>
          <tbody>
            <tr><td>Tirs (cadrés)</td><td className="num">{s.stats[0].shots} ({s.stats[0].shotsOn})</td><td className="num">{s.stats[1].shots} ({s.stats[1].shotsOn})</td></tr>
            <tr><td>Passes réussies</td><td className="num">{s.stats[0].passesOk}</td><td className="num">{s.stats[1].passesOk}</td></tr>
            <tr><td>Possession</td><td className="num">{Math.round(s.stats[0].possession / (s.stats[0].possession + s.stats[1].possession || 1) * 100)} %</td><td className="num">{Math.round(s.stats[1].possession / (s.stats[0].possession + s.stats[1].possession || 1) * 100)} %</td></tr>
            <tr><td>Fautes</td><td className="num">{s.stats[0].fouls}</td><td className="num">{s.stats[1].fouls}</td></tr>
            <tr><td>Cartons</td><td className="num">{s.stats[0].yellows}🟨 {s.stats[0].reds}🟥</td><td className="num">{s.stats[1].yellows}🟨 {s.stats[1].reds}🟥</td></tr>
          </tbody>
        </table>
        <div>
          <div className="card-title">Meilleures notes</div>
          {r.ratings.slice(0, 5).map((p) => <div key={p.id} className="row between small"><span>{p.isUser ? '⭐ ' : ''}{p.name} <span className="dim">({s.cfg.teams[p.team].short})</span></span><b>{p.rating.toFixed(1)}</b></div>)}
          {u && <div className="row between small mt" style={{ color: 'var(--green)' }}><b>Ta note</b><b>{u.rating.toFixed(1)}</b></div>}
          {u && <div className="tiny muted">{u.tally.goals} but(s) · {u.tally.assists} passe(s) déc. · {u.tally.passesOk}/{u.tally.passes} passes · {u.tally.tacklesWon} tacles gagnés · {Math.round(u.tally.minutes)} min</div>}
        </div>
      </div>
      <button className="btn primary block mt" onClick={onFinish}>{finishLabel}</button>
    </div>
  );
}
