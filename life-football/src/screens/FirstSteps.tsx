// Guide des premiers pas : disparaît quand le joueur a découvert les bases.
import { useGame } from '../store/gameStore';
import { localClub } from '../game/actions';
import { DREAM_LABELS } from '../content/prologue';

export function FirstSteps() {
  const g = useGame((s) => s.game)!;
  const act = useGame((s) => s.act);
  const setTab = useGame((s) => s.setTab);
  const f = g.events.flags;
  const club = localClub(g);
  const steps = [
    { done: (f.done_train ?? 0) > 0 || g.weekLog.some((x) => x.startsWith('train_')), label: 'Faire ta première séance d’entraînement', cta: 'Entraînement', go: () => setTab('training') },
    { done: (f.done_street_match ?? 0) > 0, label: 'Jouer un match de quartier', cta: 'Jouer', go: () => act('street_match') },
    { done: !!g.membership || f.localVisit !== undefined, label: `Rendre visite au club local${club ? ` (${club.name})` : ''}`, cta: 'Visiter', go: () => act('visit_local_club') },
    { done: g.tryouts.some((t) => t.status === 'done'), label: 'Passer ta première détection', cta: 'Club', go: () => setTab('club') },
  ];
  if (steps.every((s) => s.done) || g.t > 40) return null;
  const n = steps.filter((s) => s.done).length;
  return (
    <div className="card" style={{ borderColor: 'var(--green-2)' }}>
      <h3>👟 Tes premiers pas <span className="sub">{n}/{steps.length}</span></h3>
      {g.prologue.choices.dream && <div className="small muted mb">Ton rêve : <b className="green">« {DREAM_LABELS[g.prologue.choices.dream]} »</b></div>}
      <div className="col" style={{ gap: 6 }}>
        {steps.map((s) => (
          <div key={s.label} className="row between">
            <span className="small" style={{ opacity: s.done ? 0.6 : 1 }}>{s.done ? '✅' : '◻️'} {s.label}</span>
            {!s.done && <button className="btn sm" onClick={s.go} disabled={g.slots.left < 1 && s.cta !== 'Club' && s.cta !== 'Entraînement'}>{s.cta}</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
