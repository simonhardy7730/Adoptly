// Relations & famille : proches, entourage du club, démarches administratives.
import { useGame } from '../store/gameStore';
import type { Npc } from '../game/types';
import { NpcAvatar } from '../ui/Avatar';
import { PageTitle, StatBar } from '../ui/kit';
import { formatShortDate } from '../game/calendar';

export const ROLE_LABELS: Record<Npc['role'], string> = {
  parent: 'Père', parent2: 'Mère', sibling: 'Sœur', friend: 'Meilleur ami', coach: 'Entraîneur', rival: 'Rival', teammate: 'Coéquipier', crush: 'Relation amoureuse', mentor: 'Mentor',
};

function mood(r: number) {
  return r >= 80 ? 'Fusionnel' : r >= 60 ? 'Très bonne' : r >= 45 ? 'Correcte' : r >= 30 ? 'Tendue' : 'Conflictuelle';
}

export function RelationsScreen() {
  const g = useGame((s) => s.game)!;
  const act = useGame((s) => s.act);
  const admin = useGame((s) => s.admin);
  const family = g.npcs.filter((n) => ['parent', 'parent2', 'sibling'].includes(n.role));
  const others = g.npcs.filter((n) => !['parent', 'parent2', 'sibling'].includes(n.role));
  const pending = g.admin.filter((a) => !a.done);
  const Card = ({ n }: { n: Npc }) => (
    <div className="card flat" style={{ padding: 14 }}>
      <div className="row">
        <NpcAvatar {...n.portrait} size={56} />
        <div style={{ flex: 1 }}>
          <b>{n.name}</b> <span className="pill">{ROLE_LABELS[n.role]}</span>
          <div className="tiny muted">{n.note}</div>
        </div>
      </div>
      <div style={{ marginTop: 8 }}><StatBar label={`Relation · ${mood(n.relation)}`} value={Math.round(n.relation)} color="auto" /></div>
    </div>
  );
  return (
    <>
      <PageTitle title="Relations & famille" sub="Tes proches réagissent à tes choix : ils motivent, soutiennent, s’inquiètent… et comptent sur toi." />
      <div className="grid g2">
        <div className="col" style={{ gap: 16 }}>
          <div className="card">
            <h3>🏠 Famille</h3>
            <div className="col">{family.map((n) => <Card key={n.id} n={n} />)}</div>
            <button className="btn sm mt" onClick={() => act('family_time')} disabled={g.slots.left < 1}>Passer du temps en famille (1 action)</button>
          </div>
          <div className="card">
            <h3>📄 Démarches administratives</h3>
            {pending.length === 0 ? <div className="small muted">Tout est en ordre.</div> : pending.map((a) => (
              <div key={a.id} className="row between" style={{ marginBottom: 8 }}>
                <div><div className="small"><b>{a.label}</b></div><div className="tiny orange">À faire avant : {formatShortDate(a.deadline, g.startYear)}</div></div>
                <button className="btn sm" disabled={g.slots.left < 1} onClick={() => admin(a.id)}>Faire (1 action)</button>
              </div>
            ))}
            <div className="tiny dim">Une démarche oubliée a des conséquences (frais, entraîneur agacé…).</div>
          </div>
        </div>
        <div className="card">
          <h3>🤝 Amis, club & cœur</h3>
          <div className="col">{others.map((n) => <Card key={n.id} n={n} />)}</div>
          <div className="row mt wrap">
            <button className="btn sm" onClick={() => act('friends')} disabled={g.slots.left < 1}>Voir ses amis (1 action)</button>
          </div>
          <p className="tiny dim mt">Vie de couple, emménagement, mariage et enfants : prévus pour la phase « Vie adulte » (pas encore développée). Les premières rencontres amoureuses existent déjà via les événements dès 14 ans.</p>
        </div>
      </div>
    </>
  );
}
