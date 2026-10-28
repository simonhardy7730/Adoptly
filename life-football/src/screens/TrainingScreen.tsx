// Entraînement & actions de la semaine + séances spécifiques (mini-jeux) + routine de sommeil.
import { useGame } from '../store/gameStore';
import { visibleActions, type ActionCategory } from '../game/actions';
import { MINIGAME_INFO, type MiniGameId } from '../minigames/logic';
import { PageTitle } from '../ui/kit';
import type { SleepMode } from '../game/types';

const CATS: { id: ActionCategory; label: string }[] = [
  { id: 'football', label: '⚽ Football' },
  { id: 'santé', label: '🩺 Santé & récupération' },
  { id: 'école', label: '📚 École' },
  { id: 'social', label: '🧑‍🤝‍🧑 Vie sociale' },
  { id: 'vie', label: '🏠 Vie quotidienne' },
];

const SLEEP: { id: SleepMode; label: string; desc: string }[] = [
  { id: 'early', label: '🌙 Couche-tôt', desc: 'Récupération +8/sem., moral légèrement en baisse.' },
  { id: 'normal', label: '🛏️ Normal', desc: 'Équilibre classique.' },
  { id: 'late', label: '📱 Couche-tard', desc: 'Moral +2, récupération −10/sem.' },
];

export function TrainingScreen() {
  const g = useGame((s) => s.game)!;
  const act = useGame((s) => s.act);
  const setSleep = useGame((s) => s.setSleep);
  const startPractice = useGame((s) => s.startPractice);
  const actions = visibleActions(g);
  const games: MiniGameId[] = g.identity.position === 'GK' || g.identity.secondaryPosition === 'GK' ? ['keeper', 'pass', 'decision', 'dribble'] : ['pass', 'dribble', 'decision', 'keeper'];

  return (
    <>
      <PageTitle title="Entraînement & actions" sub={`Temps libre : ${g.slots.left}/${g.slots.max} créneau(x). Chaque action a des effets visibles avant de cliquer.`} />
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)' }}>
        <div className="col" style={{ gap: 16 }}>
          {CATS.map((c) => {
            const list = actions.filter((a) => a.category === c.id);
            if (!list.length) return null;
            return (
              <div key={c.id} className="card">
                <h3>{c.label}</h3>
                <div className="grid g2">
                  {list.map((a) => {
                    const why = a.unavailable(g) ?? (g.slots.left < a.cost ? 'Plus de temps libre cette semaine' : null);
                    return (
                      <button key={a.id} className={`action ${why ? 'disabled' : ''}`} disabled={!!why} onClick={() => act(a.id)}>
                        <div className="ico">{a.icon}</div>
                        <div>
                          <div className="t">{a.label}</div>
                          <div className="d">{a.description(g)}</div>
                          <div className="stakes">{a.stakes(g).map((s) => <span key={s}>{s}</span>)}</div>
                          {why && <div className="why">{why}</div>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div className="col" style={{ gap: 16 }}>
          <div className="card">
            <h3>🎮 Séances spécifiques</h3>
            <p className="small muted" style={{ marginTop: -4 }}>Mini-jeux d’entraînement : plus ton score est élevé, plus tu progresses. Coût : 1 action, énergie −10.</p>
            <div className="col">
              {games.map((id) => {
                const info = MINIGAME_INFO[id];
                const why = g.player.injury ? 'Blessé' : g.slots.left < 1 ? 'Plus de temps libre' : g.player.energy < 12 ? 'Trop fatigué' : null;
                return (
                  <button key={id} className={`action ${why ? 'disabled' : ''}`} disabled={!!why} onClick={() => startPractice(id)}>
                    <div className="ico">{info.icon}</div>
                    <div><div className="t">{info.title}</div><div className="d">{info.skill}</div>{why && <div className="why">{why}</div>}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="card">
            <h3>😴 Routine de sommeil</h3>
            {SLEEP.map((sl) => (
              <button key={sl.id} className={`pick-card ${g.player.sleepMode === sl.id ? 'on' : ''}`} style={{ marginBottom: 8 }} onClick={() => setSleep(sl.id)}>
                <b>{sl.label}</b><div className="tiny muted">{sl.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
