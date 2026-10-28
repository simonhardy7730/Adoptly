// Mini-jeu D : réflexes de gardien (lire l'indice, réagir au bon moment, choisir la zone).
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Attributes } from '../game/types';
import { generateShots, GK_ZONES, GK_ZONE_LABELS, resolveShot, type GkZone } from './logic';

export function KeeperGame({ difficulty, attrs, seed, onDone }: { difficulty: number; attrs: Attributes; seed: number; onDone: (score: number) => void }) {
  const shots = useMemo(() => generateShots({ rng: seed }, difficulty, attrs.reflexes, attrs.tactics), [seed, difficulty, attrs.reflexes, attrs.tactics]);
  const rng = useRef({ rng: seed + 3 });
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<'aim' | 'shot' | 'result'>('aim');
  const [result, setResult] = useState<{ text: string; saved: boolean; target: GkZone; choice: GkZone | null } | null>(null);
  const [points, setPoints] = useState(0);
  const [saves, setSaves] = useState(0);
  const shotAt = useRef(0);
  const resolved = useRef(false);
  const shot = shots[idx];

  useEffect(() => {
    setPhase('aim');
    setResult(null);
    resolved.current = false;
    const t1 = setTimeout(() => { setPhase('shot'); shotAt.current = performance.now(); }, shot.windupMs);
    const t2 = setTimeout(() => answer(null), shot.windupMs + shot.windowMs + 30);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  function answer(z: GkZone | null) {
    if (resolved.current) return;
    if (z && phase === 'aim') {
      // Plonger avant le tir : le tireur ajuste, c'est un but.
      resolved.current = true;
      finish({ saved: false, points: 0, text: 'Parti trop tôt ! Le tireur a ajusté.' }, z);
      return;
    }
    resolved.current = true;
    const reaction = z ? performance.now() - shotAt.current : null;
    finish(resolveShot(rng.current, shot, z, reaction, attrs.reflexes), z);
  }

  function finish(r: { saved: boolean; points: number; text: string }, z: GkZone | null) {
    setPhase('result');
    setResult({ text: r.text, saved: r.saved, target: shot.target, choice: z });
    const np = points + r.points;
    setPoints(np);
    if (r.saved) setSaves((s) => s + 1);
    setTimeout(() => {
      if (idx + 1 < shots.length) setIdx(idx + 1);
      else onDone(Math.min(100, np));
    }, 1300);
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', alignItems: 'start' }}>
      <div>
        <div className="pitch" style={{ padding: '22px 18px 30px' }}>
          <div style={{ position: 'relative', margin: '0 auto', maxWidth: 520, border: '6px solid #f5f5f5', borderBottom: 'none', borderRadius: '6px 6px 0 0', background: 'repeating-linear-gradient(45deg, #ffffff10 0 6px, transparent 6px 12px)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(2, 70px)' }}>
              {GK_ZONES.map((z) => {
                const isTarget = phase === 'result' && result?.target === z;
                const isChoice = phase === 'result' && result?.choice === z;
                const hinted = phase === 'aim' && shot.hint === z;
                return (
                  <button key={z} onClick={() => answer(z)} style={{ border: '1px dashed #ffffff30', background: isTarget ? (result?.saved ? 'rgba(47,209,122,0.45)' : 'rgba(229,57,53,0.45)') : isChoice ? 'rgba(255,255,255,0.2)' : hinted ? 'rgba(244,201,93,0.18)' : 'transparent', cursor: 'pointer', fontSize: 22 }} aria-label={GK_ZONE_LABELS[z]}>
                    {isTarget ? '⚽' : isChoice ? '🧤' : ''}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="center" style={{ marginTop: 18, fontSize: 30 }}>{phase === 'aim' ? '🏃' : phase === 'shot' ? '💥' : result?.saved ? '🧤' : '😩'}</div>
        </div>
      </div>
      <div className="col">
        <div className="row between"><span className="pill">Tir {idx + 1}/{shots.length}</span><span className="pill green">Arrêts : {saves}</span></div>
        {phase === 'aim' && <div className="card flat" style={{ padding: 12 }}><b>Le tireur s’élance…</b><div className="small muted">Son regard et ses appuis semblent viser : <b className="gold">{GK_ZONE_LABELS[shot.hint]}</b>. Indice pas toujours fiable. Attends le tir !</div></div>}
        {phase === 'shot' && <div className="card flat pulse" style={{ padding: 16, borderColor: 'var(--green)' }}><div className="display green" style={{ fontSize: 34, fontWeight: 800 }}>TIR !</div><div className="small muted">Clique une zone, vite !</div></div>}
        {phase === 'result' && result && <div className={`pill ${result.saved ? 'green' : 'red'}`} style={{ whiteSpace: 'normal' }}>{result.text}</div>}
        <div className="tiny dim">Fenêtre de réaction : {shot.windowMs} ms (dépend de tes réflexes et du niveau du club). Plonger avant le tir = but.</div>
      </div>
    </div>
  );
}
