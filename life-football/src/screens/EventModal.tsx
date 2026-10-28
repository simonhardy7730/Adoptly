// Fenêtre d'événement narratif : texte, personnage, choix avec enjeux visibles.
import { useGame } from '../store/gameStore';
import { choicesOf, choiceStakes, currentEvent, fill } from '../game/events';
import { npcByRole } from '../game/helpers';
import { NpcAvatar } from '../ui/Avatar';
import { Modal } from '../ui/kit';
import { ROLE_LABELS } from './RelationsScreen';

export function EventModal() {
  const g = useGame((s) => s.game)!;
  const choose = useGame((s) => s.chooseEvent);
  const cur = currentEvent(structuredClone(g));
  if (!cur) return null;
  const { event, data } = cur;
  const npc = event.npc ? npcByRole(g, event.npc) : undefined;
  const title = typeof event.title === 'function' ? event.title(g, data) : event.title;
  const choices = choicesOf(g, event, data);
  return (
    <Modal>
      <div className="modal-head">
        <div className="row">
          <span className="pill green">{event.icon} {event.category}</span>
          {g.events.pending.length > 1 && <span className="pill">+{g.events.pending.length - 1} en attente</span>}
        </div>
        <h2 className="display" style={{ fontSize: 30, marginTop: 10 }}>{title}</h2>
      </div>
      <div className="modal-body">
        <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
          {npc && (
            <div className="center" style={{ width: 70, flexShrink: 0 }}>
              <NpcAvatar {...npc.portrait} hair={npc.portrait.hair} size={64} />
              <div className="tiny muted">{npc.name.split(' ')[0]}</div>
              <div className="tiny dim">{ROLE_LABELS[npc.role]}</div>
            </div>
          )}
          <p style={{ fontSize: 15, lineHeight: 1.6, margin: 0 }}>{fill(event.text(g, data), data)}</p>
        </div>
        <div className="sep" />
        {choices.map((c) => {
          const reason = c.unavailable?.(g, data);
          const stakes = choiceStakes(c);
          return (
            <button key={c.id} className="choice" disabled={!!reason} onClick={() => choose(c.id)}>
              <div className="t">{c.label}</div>
              {stakes.length > 0 && <div className="s">{stakes.map((s) => <span key={s}>{s}</span>)}</div>}
              {reason && <div className="tiny orange" style={{ marginTop: 4 }}>{reason}</div>}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
