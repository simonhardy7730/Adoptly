// Mini-jeu B : conduite de balle (choisir un chemin entre plots et défenseurs).
import { useEffect, useMemo, useState } from 'react';
import type { Attributes } from '../game/types';
import { canMove, DIRS, DRIB_COLS, dribbleSuccessChance, generateDribble, moveDribble, scoreDribble, type Dir } from './logic';

export function DribbleGame({ difficulty, attrs, seed, onDone }: { difficulty: number; attrs: Attributes; seed: number; onDone: (score: number) => void }) {
  const initial = useMemo(() => generateDribble({ rng: seed }, difficulty), [seed, difficulty]);
  const [st, setSt] = useState(initial);
  const [rng] = useState(() => ({ rng: seed + 99 }));
  const risk = Math.round((1 - dribbleSuccessChance(attrs.dribbling, attrs.speed, initial.defenderLevel)) * 100);

  const move = (d: Dir) => {
    if (!canMove(st, d)) return;
    const n = moveDribble(rng, st, d, attrs.dribbling, attrs.speed);
    setSt(n);
    if (n.done) setTimeout(() => onDone(scoreDribble(n)), 900);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = { ArrowUp: 'u', ArrowLeft: 'l', ArrowRight: 'r', q: 'ul', a: 'ul', e: 'ur' };
      const d = map[e.key];
      if (d) { e.preventDefault(); move(d); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) 240px', alignItems: 'start' }}>
      <div className="pitch" style={{ padding: 10, maxWidth: 520, width: '100%', justifySelf: 'center' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${DRIB_COLS}, 1fr)`, gap: 6 }}>
          {st.grid.map((row, r) => row.map((cell, c) => {
            const here = st.pos.r === r && st.pos.c === c;
            const finish = r === 0;
            return (
              <div key={`${r}-${c}`} style={{ aspectRatio: '1.4', borderRadius: 8, display: 'grid', placeItems: 'center', fontSize: 22, background: here ? 'rgba(255,255,255,0.25)' : cell === 'cone' ? 'rgba(0,0,0,0.3)' : cell === 'defender' ? 'rgba(229,57,53,0.35)' : finish ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)', border: here ? '2px solid #fff' : '1px solid rgba(255,255,255,0.12)' }} title={cell === 'defender' ? `Défenseur : ~${risk}% de risque de perdre le ballon` : ''}>
                {here ? '⚽' : cell === 'cone' ? <span style={{ color: '#ff9f43', fontSize: 26, textShadow: '0 2px 4px #0008' }}>▲</span> : cell === 'defender' ? '🛡️' : finish ? '🏁' : ''}
              </div>
            );
          }))}
        </div>
      </div>
      <div className="col">
        <div className="card flat" style={{ padding: 12 }}>
          <div className="row between small"><span className="muted">Temps</span><b>{st.time.toFixed(1)} (meilleur possible {st.optimal})</b></div>
          <div className="row between small"><span className="muted">Ballons perdus</span><b className={st.losses ? 'red' : ''}>{st.losses}</b></div>
          <div className="row between small"><span className="muted">Risque face à un défenseur</span><b className="orange">~{risk}%</b></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {(['ul', 'u', 'ur'] as Dir[]).map((d) => <button key={d} className="btn" disabled={!canMove(st, d)} onClick={() => move(d)}>{DIRS[d].label}</button>)}
          <button className="btn" disabled={!canMove(st, 'l')} onClick={() => move('l')}>←</button>
          <div />
          <button className="btn" disabled={!canMove(st, 'r')} onClick={() => move('r')}>→</button>
        </div>
        <div className="tiny dim">Diagonales : plus long (1,4). Clavier : ↑ ← →, Q/E pour les diagonales.</div>
        <div className="card flat" style={{ padding: 10, maxHeight: 140, overflowY: 'auto' }}>
          {st.log.length === 0 ? <div className="tiny dim">Choisis ta première direction.</div> : [...st.log].reverse().map((l, i) => <div key={i} className="tiny">{l}</div>)}
        </div>
        {st.done && <div className="pill green">Score : {scoreDribble(st)}/100</div>}
      </div>
    </div>
  );
}
