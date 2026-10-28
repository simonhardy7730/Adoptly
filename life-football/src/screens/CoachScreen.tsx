// L'entraîneur : son profil, son système, ce qu'il attend de toi, et les entretiens possibles.
import { useGame } from '../store/gameStore';
import { COACH_STYLES, INSTRUCTIONS, TEMPERAMENTS } from '../content/coaches';
import { COACH_TOPICS, TOPIC_LABELS, styleFit, teamLevel } from '../game/coach';
import { ATTR_LABELS, POSITION_LABELS } from '../content/profiles';
import { npcByRole } from '../game/helpers';
import { currentClub, STATUS_LABELS } from '../game/career';
import { Empty, PageTitle, StatBar } from '../ui/kit';
import { NpcAvatar } from '../ui/Avatar';
import { playerOverall } from '../game/stats';
import { formatShortDate } from '../game/calendar';

export function CoachScreen() {
  const g = useGame((s) => s.game)!;
  const talk = useGame((s) => s.talkToCoach);
  const club = currentClub(g);
  const c = g.membership?.coach;
  if (!c || !club || !g.membership) {
    return (
      <>
        <PageTitle title="Entraîneur" sub="C’est l’entraîneur qui décide du système, des consignes et de la composition." />
        <Empty>Tu n’as pas encore d’entraîneur. Rejoins un club (visite du club local ou détection) pour en avoir un.</Empty>
      </>
    );
  }
  const npc = npcByRole(g, 'coach');
  const st = COACH_STYLES[c.style];
  const tp = TEMPERAMENTS[c.temperament];
  const fit = styleFit(g, c);
  const gap = playerOverall(g) - teamLevel(g);
  const trust = npc?.relation ?? 50;
  const recent = g.recentRatings.length ? g.recentRatings.reduce((a, b) => a + b, 0) / g.recentRatings.length : null;
  const focusActive = c.focus && c.focus.until >= g.t;
  const tips: string[] = [];
  if (gap < -3) tips.push(`Ton niveau (${Math.round(playerOverall(g))}) est sous celui du groupe (~${Math.round(teamLevel(g))}).`);
  if (fit < -2) tips.push(`Tu ne corresponds pas encore à son style : il valorise ${c.values.map((k) => ATTR_LABELS[k].toLowerCase()).join(', ')}.`);
  if (trust < 45) tips.push('Sa confiance en toi est faible : suis ses consignes et montre ton sérieux.');
  if (recent !== null && recent < 6.2) tips.push(`Tes dernières notes (${recent.toFixed(1)}) ne plaident pas pour toi.`);
  if (!tips.length) tips.push('Tu coches les cases : continue sur cette lancée.');

  return (
    <>
      <PageTitle title="Entraîneur" sub="Il choisit le système, la tactique et tes consignes. Toi, tu peux le convaincre." />
      <div className="grid g2">
        <div className="col" style={{ gap: 16 }}>
          <div className="card">
            <div className="row">
              {npc && <NpcAvatar {...npc.portrait} size={70} />}
              <div style={{ flex: 1 }}>
                <h2 className="display" style={{ fontSize: 26 }}>{c.name}</h2>
                <div className="small muted">Entraîneur de {club.name} depuis {formatShortDate(c.since, g.startYear)}</div>
                <div className="row wrap mt" style={{ gap: 6 }}>
                  <span className="pill green">{st.label}</span>
                  <span className="pill gold">{tp.label}</span>
                  <span className="pill">Système : {c.formation}</span>
                </div>
              </div>
            </div>
            <p className="small" style={{ marginBottom: 4 }}>{st.description}</p>
            <p className="small muted" style={{ marginTop: 0 }}>{tp.description}</p>
            <div className="sep" />
            <StatBar label="Confiance envers toi" value={Math.round(trust)} color="blue" />
            <div className="row between small"><span className="muted">Ton statut</span><b>{STATUS_LABELS[g.membership.status]}</b></div>
            <div className="row between small"><span className="muted">Poste où il t’utilise</span><b>{POSITION_LABELS[g.identity.position]}</b></div>
            {focusActive && <div className="pill green mt" style={{ whiteSpace: 'normal' }}>Axe de travail fixé : {ATTR_LABELS[c.focus!.attr]} (jusqu’au {formatShortDate(c.focus!.until, g.startYear)}) · progression ×1,3</div>}
          </div>

          <div className="card">
            <h3>🎯 Ce qu’il attend de toi</h3>
            {c.values.map((k) => <StatBar key={k} label={ATTR_LABELS[k]} value={Math.round(g.player.attrs[k])} />)}
            <div className="small muted">Adéquation à son style : <b className={fit >= 0 ? 'green' : 'red'}>{fit >= 0 ? '+' : ''}{fit.toFixed(1)}</b></div>
            <div className="sep" />
            <div className="card-title">Son analyse</div>
            {tips.map((t) => <div key={t} className="small" style={{ marginBottom: 4 }}>• {t}</div>)}
          </div>
        </div>

        <div className="col" style={{ gap: 16 }}>
          <div className="card">
            <h3>💬 Demander un entretien <span className="sub">1 action · {g.slots.left} restante(s)</span></h3>
            {COACH_TOPICS.map((topic) => {
              const info = TOPIC_LABELS[topic];
              const last = c.lastTalk[topic] ?? -99;
              const wait = 4 - (g.t - last);
              const why = g.slots.left < 1 ? 'Plus de temps libre cette semaine' : wait > 0 ? `Déjà abordé récemment (encore ${wait} sem.)` : topic === 'position' && !g.identity.secondaryPosition ? 'Tu n’as pas de poste secondaire' : null;
              return (
                <button key={topic} className={`action ${why ? 'disabled' : ''}`} style={{ marginBottom: 8 }} disabled={!!why} onClick={() => talk(topic)}>
                  <div className="ico">{info.icon}</div>
                  <div><div className="t">{info.label}</div><div className="d">{info.desc}</div>{why && <div className="why">{why}</div>}</div>
                </button>
              );
            })}
            <p className="tiny dim">Ses réponses dépendent de ta confiance auprès de lui, de ton niveau, de tes notes et de son caractère. Le système de jeu reste sa décision.</p>
          </div>
          <div className="card">
            <h3>📋 Consignes qu’il peut te donner</h3>
            {Object.entries(INSTRUCTIONS).map(([id, ins]) => <div key={id} className="row between small" style={{ marginBottom: 4 }}><span><b>{ins.short}</b> · {ins.description}</span></div>)}
            <p className="tiny dim">Avant chaque match, il te donne une consigne. La suivre renforce sa confiance ; l’ignorer peut payer… ou te coûter ta place, surtout avec un entraîneur exigeant.</p>
          </div>
        </div>
      </div>
    </>
  );
}
