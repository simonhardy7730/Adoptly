// Journée de détection : accueil → déplacement & préparation → épreuves → évaluation des recruteurs.
import { useState } from 'react';
import { useGame } from '../store/gameStore';
import { clubById, TIER_LABELS, transportCost, tryoutDifficulty } from '../game/career';
import { Crest, fmtMoney, StatBar } from '../ui/kit';
import { MiniGameRunner } from '../minigames/MiniGameRunner';
import { MINIGAME_INFO } from '../minigames/logic';
import { npcByRole } from '../game/helpers';

export function TryoutScreen() {
  const g = useGame((s) => s.game)!;
  const flow = useGame((s) => s.tryout)!;
  const travel = useGame((s) => s.tryoutTravel);
  const gameDone = useGame((s) => s.tryoutGameDone);
  const close = useGame((s) => s.closeTryout);
  const setTab = useGame((s) => s.setTab);
  const [transport, setTransport] = useState<'parents' | 'bus' | 'train'>('parents');
  const [prep, setPrep] = useState<'rest' | 'train' | 'visualize'>('rest');
  const t = g.tryouts.find((x) => x.id === flow.id)!;
  const club = clubById(g, t.clubId)!;
  const diff = tryoutDifficulty(club);
  const parent = npcByRole(g, 'parent');
  const parentsOk = (parent?.relation ?? 0) >= 40;

  return (
    <div className="fullscreen">
      <div className="inner">
        <div className="row mb">
          <Crest name={club.name} colors={club.colors} size={54} />
          <div>
            <div className="card-title" style={{ margin: 0 }}>Journée de détection</div>
            <h1 className="display" style={{ fontSize: 32 }}>{club.name}</h1>
            <div className="small muted">{TIER_LABELS[club.tier]} · {club.distanceKm} km · {t.isRetry ? 'Seconde chance' : 'Première détection'}</div>
          </div>
          <div className="right row">{flow.games.map((gm, i) => <span key={gm} className={`pill ${i < flow.gameIdx || flow.step === 'result' ? 'green' : i === flow.gameIdx && flow.step === 'games' ? 'gold' : ''}`}>{MINIGAME_INFO[gm].icon} {MINIGAME_INFO[gm].title}</span>)}</div>
        </div>

        {flow.step === 'intro' || flow.step === 'travel' ? (
          <div className="grid g2">
            <div className="card">
              <h3>🚌 Se déplacer</h3>
              {(['parents', 'bus', 'train'] as const).map((m) => {
                const c = transportCost(g, club, m);
                const disabled = (m === 'parents' && !parentsOk) || c.money > g.money;
                return (
                  <button key={m} className={`pick-card ${transport === m ? 'on' : ''}`} style={{ marginBottom: 8, opacity: disabled ? 0.5 : 1 }} disabled={disabled} onClick={() => setTransport(m)}>
                    <b>{m === 'parents' ? '🚗 Tes parents t’emmènent' : m === 'bus' ? '🚌 Bus / car' : '🚆 Train'}</b>
                    <div className="tiny muted">Coût {fmtMoney(c.money)} · fatigue −{c.energy}{c.family ? ` · relation parent ${c.family}` : ''}</div>
                    {m === 'parents' && !parentsOk && <div className="tiny orange">Relation trop tendue avec ton père pour lui demander.</div>}
                    {c.money > g.money && <div className="tiny orange">Pas assez d’argent.</div>}
                  </button>
                );
              })}
            </div>
            <div className="card">
              <h3>🧘 La veille</h3>
              {([['rest', '😴 Se coucher tôt', 'Énergie +12'], ['train', '⚽ Dernier petit entraînement', 'Confiance +4, énergie −8'], ['visualize', '🧠 Visualiser les épreuves', 'Moral +9']] as const).map(([id, label, d]) => (
                <button key={id} className={`pick-card ${prep === id ? 'on' : ''}`} style={{ marginBottom: 8 }} onClick={() => setPrep(id)}>
                  <b>{label}</b><div className="tiny muted">{d}</div>
                </button>
              ))}
              <div className="sep" />
              <StatBar label="Énergie actuelle" value={Math.round(g.player.energy)} color="auto" />
              <StatBar label="Moral" value={Math.round(g.player.morale)} color="blue" />
              <p className="tiny dim">Les recruteurs notent les épreuves (50 %), ton niveau global par rapport aux joueurs du club (35 %) et ta condition du jour (15 %).</p>
              <button className="btn primary lg block" onClick={() => travel(transport, prep)}>Partir à la détection ▶</button>
            </div>
          </div>
        ) : flow.step === 'games' ? (
          <MiniGameRunner key={flow.gameIdx} game={flow.games[flow.gameIdx]} difficulty={diff} attrs={g.player.attrs} seed={(g.rng ^ (flow.gameIdx * 7919)) | 0} onDone={gameDone} context={`Épreuve ${flow.gameIdx + 1}/${flow.games.length}`} />
        ) : (
          <Result onClose={() => { close(); setTab('club'); }} />
        )}
      </div>
    </div>
  );
}

function Result({ onClose }: { onClose: () => void }) {
  const g = useGame((s) => s.game)!;
  const flow = useGame((s) => s.tryout)!;
  const t = g.tryouts.find((x) => x.id === flow.id)!;
  const r = t.result;
  if (!r) return null;
  const club = clubById(g, t.clubId)!;
  const title = r.outcome === 'offer' ? 'Retenu !' : r.outcome === 'retry' ? 'On veut te revoir' : 'Pas retenu cette fois';
  return (
    <div className="grid g2">
      <div className="card">
        <div className="card-title">Verdict des recruteurs</div>
        <h2 className="display" style={{ fontSize: 40, color: r.outcome === 'offer' ? 'var(--green)' : r.outcome === 'retry' ? 'var(--gold)' : 'var(--red)' }}>{title}</h2>
        <div className="row" style={{ alignItems: 'baseline' }}><span className="big-number">{r.total}</span><span className="muted">/ {r.threshold} requis</span></div>
        <div className="sep" />
        {Object.entries(r.scores).map(([k, v]) => <StatBar key={k} label={`${MINIGAME_INFO[k as keyof typeof MINIGAME_INFO].icon} ${MINIGAME_INFO[k as keyof typeof MINIGAME_INFO].title}`} value={Math.round(v)} color="auto" />)}
        <StatBar label="Niveau global vs club" value={r.attrScore} color="gold" />
        <StatBar label="Condition du jour" value={r.conditionScore} color="blue" />
      </div>
      <div className="card">
        <h3>🗒️ Retours des éducateurs</h3>
        {r.feedback.length === 0 && <div className="small muted">Prestation homogène, sans point saillant.</div>}
        {r.feedback.map((f) => <div key={f} className="feed-item"><div className="ic">•</div><div className="small">{f}</div></div>)}
        <div className="sep" />
        <p className="small muted">
          {r.outcome === 'offer' && `${club.name} t’adresse une proposition : retrouve-la dans l’onglet Club pour la signer ou la refuser.`}
          {r.outcome === 'retry' && `${club.name} t’invite à une seconde détection dans quelques semaines. Travaille tes points faibles d’ici là.`}
          {r.outcome === 'rejected' && 'Ce n’est pas la fin : continue à progresser, joue des matchs, d’autres clubs viendront te voir.'}
        </p>
        <button className="btn primary block" onClick={onClose}>Retour</button>
      </div>
    </div>
  );
}
