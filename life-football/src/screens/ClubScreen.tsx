// Club & détections : invitations, offres, club actuel, classement, clubs de la région.
import { useGame } from '../store/gameStore';
import { clubById, currentClub, standings, STATUS_LABELS, TIER_LABELS, TRYOUT_THRESHOLD } from '../game/career';
import { ageAt, ageCategory, formatShortDate } from '../game/calendar';
import { ageNorm, playerOverall } from '../game/stats';
import { Crest, Empty, PageTitle, StatBar, fmtMoney } from '../ui/kit';
import { npcByRole } from '../game/helpers';

export function ClubScreen() {
  const g = useGame((s) => s.game)!;
  const answerTryout = useGame((s) => s.answerTryout);
  const answerOffer = useGame((s) => s.answerOffer);
  const club = currentClub(g);
  const age = ageAt(g);
  const ovr = playerOverall(g);
  const invites = g.tryouts.filter((t) => t.status === 'invited' || t.status === 'accepted');
  const offers = g.clubOffers.filter((o) => o.status === 'pending');
  const past = g.tryouts.filter((t) => t.status === 'done').slice(-5).reverse();
  const coach = npcByRole(g, 'coach');
  const table = g.membership ? standings(g.membership.league) : [];

  return (
    <>
      <PageTitle title="Club & détections" sub={club ? `${club.name} · ${TIER_LABELS[club.tier]}` : 'Tu n’as pas encore de club. Fais-toi remarquer !'} />
      <div className="grid g2">
        <div className="col" style={{ gap: 16 }}>
          <div className="card">
            <h3>📨 Invitations à des détections</h3>
            {invites.length === 0 && <Empty>Aucune invitation en cours. Les recruteurs repèrent les joueurs qui brillent en match (quartier ou club).</Empty>}
            {invites.map((t) => {
              const c = clubById(g, t.clubId)!;
              return (
                <div key={t.id} className="card flat" style={{ padding: 14, marginBottom: 10 }}>
                  <div className="row">
                    <Crest name={c.name} colors={c.colors} />
                    <div>
                      <div style={{ fontWeight: 700 }}>{c.name} {t.isRetry && <span className="pill gold">2e chance</span>}</div>
                      <div className="tiny muted">{TIER_LABELS[c.tier]} · {c.distanceKm} km · réputation {c.reputation}</div>
                    </div>
                    <span className="pill right">{formatShortDate(t.week, g.startYear)}</span>
                  </div>
                  <div className="small muted mt">Épreuves : {g.identity.position === 'GK' ? 'réflexes de gardien, passe, décision' : 'passe, conduite de balle, décision'}. Niveau exigé : {TRYOUT_THRESHOLD[c.tier]}/100.</div>
                  {c.boarding && age >= 12 && <div className="tiny orange">Centre avec internat : éloignement familial en cas de signature.</div>}
                  {t.status === 'invited' ? (
                    <div className="row mt">
                      <button className="btn primary sm" onClick={() => answerTryout(t.id, true)}>Accepter</button>
                      <button className="btn sm ghost" onClick={() => answerTryout(t.id, false)}>Décliner</button>
                      {club && <span className="tiny orange">Ton entraîneur actuel n’appréciera pas forcément.</span>}
                    </div>
                  ) : (
                    <div className="pill green mt">✓ Acceptée — prépare-toi (repos, énergie) pour le jour J</div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="card">
            <h3>📝 Propositions de clubs</h3>
            {offers.length === 0 && <Empty>Aucune proposition en attente.</Empty>}
            {offers.map((o) => {
              const c = clubById(g, o.clubId)!;
              return (
                <div key={o.id} className="card flat" style={{ padding: 14, marginBottom: 10, borderColor: 'var(--green-2)' }}>
                  <div className="row">
                    <Crest name={c.name} colors={c.colors} />
                    <div><div style={{ fontWeight: 700 }}>{c.name}</div><div className="tiny muted">{TIER_LABELS[c.tier]} · équipe {ageCategory(age)}</div></div>
                    <span className="pill gold right">Expire {formatShortDate(o.expires, g.startYear)}</span>
                  </div>
                  <div className="grid g3 mt">
                    <div><div className="tiny dim">Rôle envisagé</div><b className="small">{STATUS_LABELS[o.role]}</b></div>
                    <div><div className="tiny dim">Coût annuel</div><b className="small">{o.fee ? fmtMoney(o.fee) : 'Gratuit'}</b></div>
                    <div><div className="tiny dim">Installations</div><b className="small">{c.facilities}/100</b></div>
                  </div>
                  <div className="small muted mt">{o.note}</div>
                  <div className="row mt">
                    <button className="btn primary sm" onClick={() => answerOffer(o.id, true)}>Signer</button>
                    <button className="btn sm ghost" onClick={() => answerOffer(o.id, false)}>Refuser</button>
                  </div>
                </div>
              );
            })}
          </div>

          {past.length > 0 && (
            <div className="card">
              <h3>📋 Dernières détections</h3>
              {past.map((t) => (
                <div key={t.id} className="feed-item">
                  <div className="ic">{t.result?.outcome === 'offer' ? '✅' : t.result?.outcome === 'retry' ? '🔁' : '❌'}</div>
                  <div><div className="t">{clubById(g, t.clubId)?.name} — {t.result?.total}/{t.result?.threshold}</div><div className="b">{t.result?.feedback.slice(0, 2).join(' ')}</div></div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="col" style={{ gap: 16 }}>
          {club && g.membership ? (
            <>
              <div className="card">
                <div className="row">
                  <Crest name={club.name} colors={club.colors} size={56} />
                  <div><h2 className="display" style={{ fontSize: 24 }}>{club.name}</h2><div className="small muted">{TIER_LABELS[club.tier]} · {club.city}</div></div>
                  <span className="pill green right">{STATUS_LABELS[g.membership.status]}</span>
                </div>
                <div className="sep" />
                <StatBar label="Ton niveau" value={Math.round(ovr)} />
                <StatBar label={`Niveau moyen ${ageCategory(age)} du club`} value={Math.round(ageNorm(age, club.tier))} color="gold" />
                <StatBar label={`Relation avec ${coach?.name ?? 'l’entraîneur'}`} value={Math.round(coach?.relation ?? 50)} color="blue" />
                <div className="tiny dim">Le statut dépend de ton niveau, de ta relation avec l’entraîneur, de tes notes récentes et de ta discipline. Il est réévalué chaque mois.</div>
              </div>
              <div className="card">
                <h3>🏆 Championnat {ageCategory(age)} <span className="sub">Journée {g.membership.matchday}/18</span></h3>
                <table>
                  <thead><tr><th>#</th><th>Équipe</th><th className="num">J</th><th className="num">V-N-D</th><th className="num">Diff</th><th className="num">Pts</th></tr></thead>
                  <tbody>
                    {table.map((t, i) => (
                      <tr key={t.id} className={t.isPlayerTeam ? 'me' : ''}>
                        <td>{i + 1}</td><td>{t.name}</td><td className="num">{t.played}</td><td className="num">{t.w}-{t.d}-{t.l}</td><td className="num">{t.gf - t.ga > 0 ? '+' : ''}{t.gf - t.ga}</td><td className="num"><b>{t.w * 3 + t.d}</b></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="card">
              <h3>🚸 Sans club</h3>
              <p className="small muted">Tu joues au quartier. Pour être repéré : enchaîne les bons matchs de quartier (onglet Entraînement), progresse, et accepte les détections. Un échec n’est jamais la fin : d’autres clubs existent.</p>
            </div>
          )}
          <div className="card">
            <h3>🗺️ Clubs de ta région</h3>
            <table>
              <thead><tr><th>Club</th><th>Niveau</th><th className="num">Distance</th><th className="num">Rép.</th></tr></thead>
              <tbody>
                {[...g.clubs].sort((a, b) => a.tier - b.tier).map((c) => (
                  <tr key={c.id} className={c.id === club?.id ? 'me' : ''}>
                    <td><div className="row"><Crest name={c.name} colors={c.colors} size={24} />{c.name}</div></td>
                    <td className="small muted">{TIER_LABELS[c.tier]}</td>
                    <td className="num">{c.distanceKm} km</td>
                    <td className="num">{Math.round(c.reputation)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="tiny dim mt">Ton niveau ({Math.round(ovr)}) vs attendu à {age} ans : local ~{Math.round(ageNorm(age, 1))}, régional ~{Math.round(ageNorm(age, 2))}, centre pro ~{Math.round(ageNorm(age, 3))}, grand centre ~{Math.round(ageNorm(age, 4))}.</div>
          </div>
        </div>
      </div>
    </>
  );
}
