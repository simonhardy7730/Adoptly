// Mini-jeu A : précision de passe (mémoriser l'ordre puis cliquer les coéquipiers).
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Attributes } from '../game/types';
import { generatePassRound, scorePassRound, type PassClick } from './logic';

const ROUNDS = 3;

export function PassGame({ difficulty, attrs, seed, onDone }: { difficulty: number; attrs: Attributes; seed: number; onDone: (score: number) => void }) {
  const rounds = useMemo(() => {
    const h = { rng: seed };
    return Array.from({ length: ROUNDS }, () => generatePassRound(h, difficulty, attrs.vision, attrs.passing));
  }, [seed, difficulty, attrs.vision, attrs.passing]);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<'show' | 'play' | 'feedback'>('show');
  const [clicks, setClicks] = useState<PassClick[]>([]);
  const [scores, setScores] = useState<number[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const start = useRef(0);
  const finished = useRef(false);
  const ref = useRef<HTMLDivElement>(null);
  const r = rounds[idx];

  useEffect(() => {
    setPhase('show');
    setClicks([]);
    finished.current = false;
    const t = setTimeout(() => { setPhase('play'); start.current = performance.now(); }, r.showMs);
    return () => clearTimeout(t);
  }, [idx, r.showMs]);

  useEffect(() => {
    if (phase !== 'play') return;
    const iv = setInterval(() => {
      const e = performance.now() - start.current;
      setElapsed(e);
      if (e >= r.limitMs) finishRound(clicks);
    }, 80);
    return () => clearInterval(iv);
  });

  function finishRound(cl: PassClick[]) {
    if (phase !== 'play' || finished.current) return;
    finished.current = true;
    const res = scorePassRound(r, cl);
    setScores((s) => [...s, res.score]);
    setPhase('feedback');
    setTimeout(() => {
      if (idx + 1 < ROUNDS) setIdx(idx + 1);
      else {
        const all = [...scores, res.score];
        onDone(Math.round(all.reduce((a, b) => a + b, 0) / all.length));
      }
    }, 1300);
  }

  const onClick = (e: React.MouseEvent) => {
    if (phase !== 'play' || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const c = { x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100, t: performance.now() - start.current };
    const next = [...clicks, c];
    setClicks(next);
    if (next.length >= r.order.length) finishRound(next);
  };

  const last = scores[scores.length - 1];
  return (
    <div>
      <div className="row between mb">
        <span className="pill">Manche {idx + 1}/{ROUNDS}</span>
        <span className="small muted">{phase === 'show' ? 'Mémorise l’ordre des passes…' : phase === 'play' ? `Clique les coéquipiers dans l’ordre (${clicks.length}/${r.order.length})` : `Manche : ${last}/100`}</span>
      </div>
      <div className="bar mb"><span style={{ width: `${phase === 'play' ? Math.max(0, 100 - (elapsed / r.limitMs) * 100) : phase === 'show' ? 100 : 0}%` }} /></div>
      <div ref={ref} className="pitch" style={{ aspectRatio: '3 / 2', cursor: phase === 'play' ? 'crosshair' : 'default' }} onClick={onClick}>
        <div className="lines" /><div className="box" /><div className="circle" />
        {r.defenders.map((d, i) => (
          <div key={`d${i}`} style={{ position: 'absolute', left: `${d.x}%`, top: `${d.y}%`, width: 18, height: 18, marginLeft: -9, marginTop: -9, borderRadius: '50%', background: '#e53935', border: '2px solid #fff3', boxShadow: '0 2px 6px #0008' }} />
        ))}
        {r.targets.map((t, i) => {
          const orderPos = r.order.indexOf(i);
          return (
            <div key={i} style={{ position: 'absolute', left: `${t.x}%`, top: `${t.y}%`, width: `${r.radius * 2}%`, aspectRatio: '1', transform: 'translate(-50%, -50%)', borderRadius: '50%', background: 'rgba(47,209,122,0.25)', border: '2px solid #2fd17a', display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#2fd17a', color: '#04140b', fontWeight: 800, display: 'grid', placeItems: 'center', fontSize: 12 }}>
                {phase !== 'play' ? orderPos + 1 : ''}
              </div>
            </div>
          );
        })}
        {clicks.map((c, i) => (
          <div key={`c${i}`} style={{ position: 'absolute', left: `${c.x}%`, top: `${c.y}%`, width: 10, height: 10, marginLeft: -5, marginTop: -5, borderRadius: '50%', background: '#fff', boxShadow: '0 0 8px #fff' }} />
        ))}
        <div style={{ position: 'absolute', left: '50%', bottom: 12, transform: 'translateX(-50%)', width: 24, height: 24, borderRadius: '50%', background: '#fff', border: '3px solid #1b1b1b' }} title="Toi" />
      </div>
    </div>
  );
}
