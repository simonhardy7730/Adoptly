// Image publique & réseau social fictif « Tribune ».
import { useState } from 'react';
import { useGame } from '../store/gameStore';
import { MAX_POSTS_PER_WEEK, POST_TEMPLATES, socialLocked } from '../game/social';
import { formatShortDate } from '../game/calendar';
import { brand } from '../content/brands';
import { Avatar } from '../ui/Avatar';
import { ageAt } from '../game/calendar';
import { Empty, PageTitle, StatBar, fmtInt } from '../ui/kit';

export function SocialScreen() {
  const g = useGame((s) => s.game)!;
  const post = useGame((s) => s.post);
  const [kind, setKind] = useState(POST_TEMPLATES[0].kind);
  const locked = socialLocked(g);
  const r = g.reputation;
  const tpl = POST_TEMPLATES.find((p) => p.kind === kind)!;
  const reason = tpl.available(g);
  return (
    <>
      <PageTitle title="Image & réseaux" sub="Popularité et réputation sportive sont deux choses différentes. Ton image se construit sur le terrain… et en dehors." />
      <div className="grid g2">
        <div className="col" style={{ gap: 16 }}>
          <div className="card">
            <h3>🪞 Image publique</h3>
            <StatBar label="Popularité" value={Math.round(r.popularity)} color="blue" hint="Combien les gens te connaissent." />
            <StatBar label="Réputation sportive" value={Math.round(r.sport)} color="gold" hint="Ce que le milieu du foot pense de ton niveau." />
            <StatBar label="Image auprès des supporters" value={Math.round(r.fanImage)} hint="Sympathie, comportement, attachement." />
            <StatBar label="Crédibilité auprès des marques" value={Math.round(r.sponsorCred)} hint="Fiabilité, respect des contrats, absence de polémique." />
            <StatBar label="Présence médiatique" value={Math.round(r.media)} color="blue" />
            <div className="row between"><span className="muted small">Abonnés Tribune</span><b className="display" style={{ fontSize: 22 }}>{g.social.unlocked ? fmtInt(r.followers) : '—'}</b></div>
          </div>
          <div className="card">
            <h3>✍️ Publier sur Tribune <span className="sub">{g.social.postsThisWeek}/{MAX_POSTS_PER_WEEK} cette semaine</span></h3>
            {locked ? <Empty>🔒 {locked}</Empty> : (
              <>
                <div className="seg mb">
                  {POST_TEMPLATES.map((p) => <button key={p.kind} className={kind === p.kind ? 'on' : ''} onClick={() => setKind(p.kind)}>{p.icon} {p.label}</button>)}
                </div>
                {reason ? <div className="small orange">{reason}</div> : tpl.tones.map((t) => (
                  <button key={t.id} className="choice" disabled={g.social.postsThisWeek >= MAX_POSTS_PER_WEEK} onClick={() => post(kind, t.id)}>
                    <div className="t">Ton {t.label.toLowerCase()}</div>
                    <div className="small muted" style={{ marginTop: 4 }}>« {t.text.replace('{brand}', 'ta marque')} »</div>
                    <div className="s"><span>Sympathie {t.sentiment >= 0.5 ? '++' : t.sentiment > 0 ? '+' : '–'}</span><span>Risque de polémique {t.risk >= 0.15 ? 'élevé' : t.risk > 0.03 ? 'modéré' : 'faible'}</span></div>
                  </button>
                ))}
                <div className="tiny dim">Publier ne coûte pas d’action, mais deux posts par semaine maximum. Les publications partenaires comptent pour tes obligations de sponsor.</div>
              </>
            )}
          </div>
        </div>
        <div className="card">
          <h3>📱 Ton fil</h3>
          {g.social.posts.length === 0 ? <Empty>Aucune publication.</Empty> : g.social.posts.slice(0, 20).map((p) => (
            <div key={p.id} className="feed-item">
              <div style={{ flexShrink: 0 }}><Avatar a={g.appearance} age={ageAt(g)} size={36} showNumber={false} ring={false} /></div>
              <div style={{ flex: 1 }}>
                <div className="small"><b>{g.identity.firstName} {g.identity.lastName}</b> <span className="dim">· {formatShortDate(p.t, g.startYear)}</span> {p.brandId && <span className="pill">#partenariat {brand(p.brandId).name}</span>}</div>
                <div style={{ margin: '3px 0' }}>{p.text}</div>
                <div className="tiny muted">❤️ {fmtInt(p.likes)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
