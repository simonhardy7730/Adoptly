// Séance spécifique (mini-jeu d'entraînement).
import { useGame } from '../store/gameStore';
import { MiniGameRunner } from '../minigames/MiniGameRunner';
import { currentClub } from '../game/career';

export function PracticeScreen() {
  const g = useGame((s) => s.game)!;
  const p = useGame((s) => s.practice)!;
  const done = useGame((s) => s.practiceDone);
  const club = currentClub(g);
  const diff = Math.max(1, Math.min(5, (club?.tier ?? 1)));
  return (
    <div className="fullscreen">
      <div className="inner">
        <div className="row between mb">
          <h1 className="display" style={{ fontSize: 28 }}>Séance spécifique</h1>
          <button className="btn ghost sm" onClick={() => done(null)}>Abandonner (action perdue)</button>
        </div>
        <MiniGameRunner game={p.game} difficulty={diff} attrs={g.player.attrs} seed={(g.rng ^ 0x5f3759df) | 0} onDone={(s) => done(s)} context="Entraînement" />
      </div>
    </div>
  );
}
