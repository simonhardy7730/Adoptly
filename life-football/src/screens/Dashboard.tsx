// Tableau de bord : évolue avec l'âge et la situation (club, école, sponsors, réseaux).
import { useEffect } from 'react';
import { useGame } from '../store/gameStore';
import { ageAt, formatShortDate, ageCategory } from '../game/calendar';
import { currentClub, standings, STATUS_LABELS, TIER_LABELS } from '../game/career';
import { playerOverall, potentialEstimate } from '../game/stats';
import { Avatar } from '../ui/Avatar';
import { country } from '../content/countries';
import { archetype, POSITION_LABELS } from '../content/profiles';
import { StatBar, Stars, fmtInt, Crest } from '../ui/kit';
import { agenda } from '../game/agenda';
import { objectives } from '../game/objectives';
import { visibleActions } from '../game/actions';
import { activeContracts } from '../game/sponsors';
import { totalCaps } from '../game/national';

const NOTIF_ICON: Record<string, string> = { invite: '📨', injury: '🚑', offer: '📝', event: '📖', info: 'ℹ️', money: '💶', sponsor: '🤝', national: '🎽', success: '🌟', warning: '⚠️' };

export function Dashboard() {
  const g = useGame((s) => s.game)!;
  const act = useGame((s) => s.act);
  const setTab = useGame((s) => s.setTab);
  const markRead = useGame((s) => s.markRead);
  useEffect(() => {
    const t = setTimeout(markRead, 2500);
    return () => clearTimeout(t);
  }, [markRead, g.t]);

  const age = ageAt(g);
  const club = currentClub(g);
  const ovr = playerOverall(g);
  const pot = potentialEstimate(g);
  const nat = country(g.identity.nationality);
  const p = g.player;
  const items = agenda(g, 6);
  const objs = objectives(g);
  const suggestions = [
    p.energy < 35 ? 'rest' : null,
    p.injury ? 'physio' : null,
    age <= 17 && !p.injury && p.energy >= 25 ? 'street_match' : null,
    p.school.grade < 10 && age < 18 ? 'study' : null,
    g.identity.position === 'GK' ? 'train_goalkeeping' : 'train_technique',
    'train_physical',
    'friends',
    'family_time',
  ].filter(Boolean) as string[];
  const shown = visibleActions(g).filter((a) => suggestions.includes(a.id)).sort((a, b) => suggestions.indexOf(a.id) - suggestions.indexOf(b.id)).slice(0, 4);
  const table = g.membership ? standings(g.membership.league) : [];
  const pos = table.findIndex((t) => t.isPlayerTeam) + 1;
  const caps = totalCaps(g);

  return (
    <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)' }}>
      <div className="col" style={{ gap: 16 }}>
        <div className="card">
          <div className="hero">
            <Avatar a={g.appearance} age={age} size={130} colors={club?.colors ?? ['#1fa860', '#ffffff']} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="row wrap" style={{ gap: 6, marginBottom: 6 }}>
                <span className="pill">{nat.flag} {nat.name}{g.identity.secondNationality ? ` · ${country(g.identity.secondNationality).flag}` : ''}</span>
                <span className="pill green">{POSITION_LABELS[g.identity.position]}</span>
                <span className="pill">{archetype(g.identity.archetype).icon} {archetype(g.identity.archetype).label}</span>
              </div>
              <div className="hero-name">{g.identity.firstName} {g.identity.lastName}</div>
              {g.identity.nickname && <div className="green small">« {g.identity.nickname} »</div>}
              <div className="muted small" style={{ marginTop: 4 }}>
                {age} ans · {club ? `${club.name} · ${ageCategory(age)} · ${STATUS_LABELS[g.membership!.status]}` : 'Sans club — joue au quartier'}
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <span className="small muted">Potentiel estimé par les recruteurs</span>
                <Stars value={pot.stars} />
                <span className="pill gold">{pot.label}</span>
              </div>
            </div>
            <div className="ovr"><b>{Math.round(ovr)}</b><span>NIVEAU</span></div>
          </div>
        </div>

        <div className="card">
          <h3>⚡ Cette semaine <span className="sub">{g.slots.left}/{g.slots.max} action(s) restante(s)</span></h3>
          <div className="grid g2">
            {shown.map((a) => {
              const why = a.unavailable(g);
              return (
                <button key={a.id} className={`action ${why || g.slots.left < a.cost ? 'disabled' : ''}`} onClick={() => !why && act(a.id)} disabled={!!why || g.slots.left < a.cost}>
                  <div className="ico">{a.icon}</div>
                  <div>
                    <div className="t">{a.label}</div>
                    <div className="stakes">{a.stakes(g).slice(0, 3).map((s) => <span key={s}>{s}</span>)}</div>
                    {why && <div className="why">{why}</div>}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="row mt">
            <button className="btn sm" onClick={() => setTab('training')}>Toutes les actions →</button>
            {g.weekLog.length > 0 && <span className="tiny muted">Déjà fait : {g.weekLog.length} action(s)</span>}
          </div>
        </div>

        <div className="grid g2">
          <div className="card">
            <h3>🎯 Objectifs</h3>
            {objs.map((o) => (
              <div key={o.label} style={{ marginBottom: 10 }} title={o.hint}>
                <div className="row between small"><span>{o.done ? '✅' : '◻️'} {o.label}</span><span className="muted">{Math.round(o.progress * 100)}%</span></div>
                <div className={`bar ${o.done ? '' : 'gold'}`} style={{ marginTop: 4 }}><span style={{ width: `${o.progress * 100}%` }} /></div>
                <div className="tiny dim" style={{ marginTop: 2 }}>{o.hint}</div>
              </div>
            ))}
          </div>
          <div className="card">
            <h3>📅 À venir <button className="btn sm ghost right" onClick={() => setTab('calendar')}>Calendrier</button></h3>
            {items.length === 0 && <div className="small muted">Rien de prévu ces prochaines semaines.</div>}
            {items.slice(0, 7).map((it, i) => (
              <div key={i} className="feed-item">
                <div className="ic">{it.icon}</div>
                <div><div className="t">{it.label}</div><div className="b">{it.t === g.t ? 'Cette semaine' : formatShortDate(it.t, g.startYear)}</div></div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>🔔 Notifications</h3>
          {g.notifications.length === 0 && <div className="small muted">Aucune notification.</div>}
          {g.notifications.slice(0, 8).map((n) => (
            <div key={n.id} className="feed-item" style={{ opacity: n.read ? 0.65 : 1 }}>
              <div className="ic">{NOTIF_ICON[n.kind] ?? '•'}</div>
              <div style={{ flex: 1 }}><div className="t">{n.title} {!n.read && <span className="pill green" style={{ padding: '0 6px', fontSize: 10 }}>nouveau</span>}</div><div className="b">{n.body}</div></div>
              <div className="tiny dim">{formatShortDate(n.t, g.startYear)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="col" style={{ gap: 16 }}>
        <div className="card">
          <h3>💪 Condition</h3>
          {p.injury && <div className="pill red mb">🚑 {p.injury.name} · encore ~{Math.max(1, Math.ceil(p.injury.weeksLeft))} sem.</div>}
          <StatBar label="Énergie" value={Math.round(p.energy)} color="auto" hint="Baisse avec les efforts, remonte avec le sommeil, le repos et une bonne alimentation." />
          <StatBar label="Moral" value={Math.round(p.morale)} color="blue" />
          <StatBar label="Forme physique" value={Math.round(p.form)} color="gold" />
          <StatBar label="Nutrition" value={Math.round(p.nutrition)} color="auto" hint="Repas familiaux + garde-manger. Influence récupération et guérison." />
          {age < 18 && <StatBar label="Moyenne scolaire" value={Math.round(p.school.grade * 10) / 10} max={20} color="auto" suffix="/20" />}
          <StatBar label={`Crampons (${p.boots.name})`} value={Math.round(100 - p.boots.wear)} color="auto" suffix="%" hint="Des crampons usés augmentent légèrement le risque de blessure." />
        </div>

        {club && g.membership && (
          <div className="card">
            <h3>🏟️ Mon club</h3>
            <div className="row">
              <Crest name={club.name} colors={club.colors} />
              <div><div style={{ fontWeight: 700 }}>{club.name}</div><div className="tiny muted">{TIER_LABELS[club.tier]}</div></div>
              <div className="right center"><div className="big-number" style={{ fontSize: 28 }}>{pos}<sup style={{ fontSize: 12 }}>e</sup></div><div className="tiny muted">au classement</div></div>
            </div>
            <button className="btn sm block mt" onClick={() => setTab('club')}>Voir le club</button>
          </div>
        )}

        <div className="card">
          <h3>🌟 Réputation</h3>
          <StatBar label="Réputation sportive" value={Math.round(g.reputation.sport)} color="gold" />
          <StatBar label="Popularité" value={Math.round(g.reputation.popularity)} color="blue" />
          <div className="row between small" style={{ marginTop: 6 }}>
            <span className="muted">Abonnés Tribune</span><b>{g.social.unlocked ? fmtInt(g.reputation.followers) : '—'}</b>
          </div>
          <div className="row between small"><span className="muted">Sponsors actifs</span><b>{activeContracts(g).length}</b></div>
          <div className="row between small"><span className="muted">Sélections</span><b>{caps.youth + caps.senior}</b></div>
        </div>

        <div className="card">
          <h3>📖 Dernières lignes de ton histoire</h3>
          {g.journal.slice(0, 6).map((j, i) => (
            <div key={i} className="feed-item"><div className="ic">{j.icon}</div><div><div className="small">{j.text}</div><div className="tiny dim">{formatShortDate(j.t, g.startYear)}</div></div></div>
          ))}
        </div>
      </div>
    </div>
  );
}
