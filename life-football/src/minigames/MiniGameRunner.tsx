// Enveloppe commune : règles → jeu → score.
import { useState } from 'react';
import type { Attributes } from '../game/types';
import { MINIGAME_INFO, type MiniGameId } from './logic';
import { PassGame } from './PassGame';
import { DribbleGame } from './DribbleGame';
import { DecisionGame } from './DecisionGame';
import { KeeperGame } from './KeeperGame';

export function MiniGameRunner({ game, difficulty, attrs, seed, onDone, context }: { game: MiniGameId; difficulty: number; attrs: Attributes; seed: number; onDone: (score: number) => void; context: string }) {
  const [phase, setPhase] = useState<'rules' | 'play' | 'done'>('rules');
  const [score, setScore] = useState(0);
  const info = MINIGAME_INFO[game];
  const finish = (s: number) => { setScore(s); setPhase('done'); };
  const Comp = { pass: PassGame, dribble: DribbleGame, decision: DecisionGame, keeper: KeeperGame }[game];
  return (
    <div className="card">
      <div className="row mb">
        <div className="brand-logo" style={{ fontSize: 20 }}>{info.icon}</div>
        <div><div className="card-title" style={{ margin: 0 }}>{context}</div><h2 className="display" style={{ fontSize: 26 }}>{info.title}</h2></div>
        <span className="pill right">Difficulté {'●'.repeat(difficulty)}{'○'.repeat(Math.max(0, 5 - difficulty))}</span>
      </div>
      {phase === 'rules' && (
        <div className="col">
          <p style={{ fontSize: 15 }}>{info.rules}</p>
          <p className="small muted">Compétences utiles : {info.skill}. Elles rendent l’épreuve plus accessible, mais c’est toi qui joues.</p>
          <button className="btn primary lg" onClick={() => setPhase('play')}>Commencer l’épreuve</button>
        </div>
      )}
      {phase === 'play' && <Comp difficulty={difficulty} attrs={attrs} seed={seed} onDone={finish} />}
      {phase === 'done' && (
        <div className="center col" style={{ alignItems: 'center' }}>
          <div className="big-number" style={{ color: score >= 70 ? 'var(--green)' : score >= 45 ? 'var(--gold)' : 'var(--red)' }}>{score}/100</div>
          <div className="muted">{score >= 80 ? 'Exceptionnel !' : score >= 65 ? 'Très bonne épreuve.' : score >= 45 ? 'Correct, sans plus.' : 'Difficile… il faudra progresser.'}</div>
          <button className="btn primary" onClick={() => onDone(score)}>Continuer</button>
        </div>
      )}
    </div>
  );
}
