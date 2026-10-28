// Mini-jeu C : prise de décision sur un schéma de match.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Attributes } from '../game/types';
import { decisionTimeLimit, pickScenarios, resolveDecision, type DecisionScenario } from './logic';

function Scheme({ sc }: { sc: DecisionScenario }) {
  return (
    <svg viewBox="0 0 100 70" style={{ width: '100%', borderRadius: 12, background: 'repeating-linear-gradient(0deg,#1b6b3c 0 7px,#1e7543 7px 14px)' }}>
      <g stroke="#ffffff66" strokeWidth="0.5" fill="none">
        <rect x="3" y="3" width="94" height="64" />
        <rect x="30" y="3" width="40" height="13" />
        <rect x="42" y="3" width="16" height="5" />
        <line x1="3" y1="67" x2="97" y2="67" />
      </g>
      <rect x="44" y="1.5" width="12" height="2" fill="#fff" />
      {sc.opps.map((o, i) => <circle key={`o${i}`} cx={o.x} cy={o.y * 0.7} r="2.6" fill="#e53935" stroke="#fff" strokeWidth="0.5" />)}
      {sc.mates.map((m, i) => <circle key={`m${i}`} cx={m.x} cy={m.y * 0.7} r="2.6" fill="#2fd17a" stroke="#fff" strokeWidth="0.5" />)}
      <circle cx={sc.ball.x} cy={sc.ball.y * 0.7} r="3.2" fill="#ffd54f" stroke="#1b1b1b" strokeWidth="0.6" />
      <circle cx={sc.ball.x + 2.4} cy={sc.ball.y * 0.7 + 2.2} r="1.2" fill="#fff" stroke="#1b1b1b" strokeWidth="0.4" />
      <text x={sc.ball.x} y={sc.ball.y * 0.7 - 4.5} fontSize="3.2" fill="#fff" textAnchor="middle" fontWeight="700">TOI</text>
    </svg>
  );
}

export function DecisionGame({ difficulty, attrs, seed, onDone }: { difficulty: number; attrs: Attributes; seed: number; onDone: (score: number) => void }) {
  const scenarios = useMemo(() => pickScenarios({ rng: seed }, 4), [seed]);
  const rng = useRef({ rng: seed + 7 });
  const limit = decisionTimeLimit(difficulty, attrs.tactics);
  const [idx, setIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [feedback, setFeedback] = useState<null | { text: string; score: number; good: boolean }>(null);
  const [scores, setScores] = useState<number[]>([]);
  const start = useRef(performance.now());
  const locked = useRef(false);
  const sc = scenarios[idx];

  useEffect(() => {
    start.current = performance.now();
    locked.current = false;
    setFeedback(null);
    setElapsed(0);
  }, [idx]);

  useEffect(() => {
    if (feedback) return;
    const iv = setInterval(() => {
      const e = performance.now() - start.current;
      setElapsed(e);
      if (e >= limit) answer(null);
    }, 100);
    return () => clearInterval(iv);
  });

  function answer(optionId: string | null) {
    if (locked.current) return;
    locked.current = true;
    const res = resolveDecision(rng.current, sc, optionId, performance.now() - start.current, limit, attrs as unknown as Record<string, number>, difficulty);
    const quality = res.value >= 0.85 ? 'Excellente décision' : res.value >= 0.6 ? 'Décision correcte' : res.value > 0 ? 'Décision discutable' : 'Trop tard !';
    const text = `${quality}${optionId ? ` · exécution ${res.success ? 'réussie' : 'manquée'}` : ''}. Meilleur choix : ${res.best}.`;
    setFeedback({ text, score: res.score, good: res.value >= 0.6 });
    const all = [...scores, res.score];
    setScores(all);
    setTimeout(() => {
      if (idx + 1 < scenarios.length) setIdx(idx + 1);
      else onDone(Math.round(all.reduce((a, b) => a + b, 0) / all.length));
    }, 1900);
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', alignItems: 'start' }}>
      <Scheme sc={sc} />
      <div className="col">
        <div className="row between"><span className="pill">Situation {idx + 1}/{scenarios.length}</span><span className="small muted">{Math.max(0, (limit - elapsed) / 1000).toFixed(1)} s</span></div>
        <div className={`bar ${elapsed / limit > 0.7 ? 'bad' : ''}`}><span style={{ width: `${feedback ? 0 : Math.max(0, 100 - (elapsed / limit) * 100)}%` }} /></div>
        <p style={{ fontSize: 15, margin: '6px 0' }}>{sc.text}</p>
        {sc.options.map((o) => (
          <button key={o.id} className="choice" disabled={!!feedback} onClick={() => answer(o.id)}>
            <div className="t">{o.label}</div>
            <div className="s"><span>{o.attrs.map((a) => ({ passing: 'Passe', vision: 'Vision', dribbling: 'Dribble', shooting: 'Tir', tactics: 'Tactique', defending: 'Défense', speed: 'Vitesse', technique: 'Technique' }[a])).join(' · ')}</span></div>
          </button>
        ))}
        {feedback && <div className={`pill ${feedback.good ? 'green' : 'red'}`} style={{ whiteSpace: 'normal' }}>{feedback.text} ({feedback.score}/100)</div>}
      </div>
    </div>
  );
}
