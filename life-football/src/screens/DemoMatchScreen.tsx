// Match de démonstration du moteur 2D (aucun effet sur une carrière).
import { useState } from 'react';
import { useGame } from '../store/gameStore';
import { Match2DView } from '../match2d/Match2DView';
import { demoConfig } from '../match2d/build';

export function DemoMatchScreen() {
  const goMenu = useGame((s) => s.goMenu);
  const [seed, setSeed] = useState(() => (Date.now() % 100000) + 1);
  return (
    <div className="fullscreen">
      <div className="inner">
        <div className="row between mb wrap">
          <div>
            <div className="card-title" style={{ margin: 0 }}>Moteur de match 2D</div>
            <h1 className="display" style={{ fontSize: 28 }}>Match de démonstration</h1>
          </div>
          <div className="row">
            <button className="btn sm" onClick={() => setSeed((x) => x + 7919)}>🔄 Nouveau match</button>
            <button className="btn ghost sm" onClick={goMenu}>✕ Menu principal</button>
          </div>
        </div>
        <Match2DView key={seed} config={demoConfig(seed)} onFinish={() => setSeed((x) => x + 7919)} finishLabel="Rejouer un match" title="Racing Valmont – Sporting Portemer" />
      </div>
    </div>
  );
}
