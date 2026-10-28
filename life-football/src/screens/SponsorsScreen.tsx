// Sponsors & équipementiers : offres (comparateur), négociation, contrats actifs, revenus, marques.
import { useState } from 'react';
import { useGame } from '../store/gameStore';
import type { SponsorOffer, SponsorTerms } from '../game/types';
import { BRANDS, brand, SPONSOR_CATEGORY_LABELS } from '../content/brands';
import { activeContracts, commercialIncome, exclusivityConflict, visibility } from '../game/sponsors';
import { ageAt, formatShortDate } from '../game/calendar';
import { BrandChip, Empty, Modal, PageTitle, StatBar, fmtMoney } from '../ui/kit';

function TermsTable({ offers }: { offers: SponsorOffer[] }) {
  const rows: { label: string; f: (t: SponsorTerms) => string }[] = [
    { label: 'Montant garanti', f: (t) => `${fmtMoney(t.monthly)}/mois` },
    { label: 'Durée', f: (t) => `${t.months} mois` },
    { label: 'Total garanti', f: (t) => fmtMoney(t.monthly * t.months) },
    { label: 'Prime par but', f: (t) => (t.bonusPerGoal ? fmtMoney(t.bonusPerGoal) : '—') },
    { label: 'Prime par sélection', f: (t) => (t.bonusPerCap ? fmtMoney(t.bonusPerCap) : '—') },
    { label: 'Publications / mois', f: (t) => String(t.postsPerMonth) },
    { label: 'Présences / an', f: (t) => String(t.appearancesPerYear) },
    { label: 'Exclusivité', f: (t) => (t.exclusive ? 'Oui (concurrents interdits)' : 'Non') },
    { label: 'Pénalité de rupture', f: (t) => fmtMoney(t.penalty) },
    { label: 'Équipement fourni', f: (t) => (t.freeBoots ? 'Oui' : 'Non') },
    { label: 'Renouvellement si visibilité ≥', f: (t) => String(t.renewalMinRep) },
  ];
  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead><tr><th></th>{offers.map((o) => <th key={o.id}><div className="row"><BrandChip logo={brand(o.brandId).logo} color={brand(o.brandId).color} size={26} />{brand(o.brandId).name}</div></th>)}</tr></thead>
        <tbody>{rows.map((r) => <tr key={r.label}><td className="small muted">{r.label}</td>{offers.map((o) => <td key={o.id} className="small">{r.f(o.terms)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function Negotiation({ offer, onClose }: { offer: SponsorOffer; onClose: () => void }) {
  const negotiate = useGame((s) => s.sponsorNegotiate);
  const sign = useGame((s) => s.sponsorSign);
  const g = useGame((s) => s.game)!;
  const live = g.sponsors.offers.find((o) => o.id === offer.id)!;
  const [ask, setAsk] = useState<SponsorTerms>({ ...live.terms });
  const [msg, setMsg] = useState<string | null>(live.lastResponse ? `Dernière réponse : ${live.lastResponse}` : null);
  const b = brand(offer.brandId);
  const orig = live.original;
  const closed = live.status !== 'pending';
  const delta = Math.round(((ask.monthly * ask.months) / Math.max(1, orig.monthly * orig.months) - 1) * 100);
  return (
    <Modal wide onClose={onClose}>
      <div className="modal-head">
        <div className="row"><BrandChip logo={b.logo} color={b.color} /><div><div className="card-title" style={{ margin: 0 }}>Négociation · {SPONSOR_CATEGORY_LABELS[b.category]}</div><h2 className="display" style={{ fontSize: 26 }}>{b.name}</h2></div><span className="pill right">Patience de la marque : {'●'.repeat(Math.max(0, live.roundsLeft + 1))}</span></div>
      </div>
      <div className="modal-body">
        <div className="grid g2">
          <div>
            <div className="field"><label>Montant mensuel : {fmtMoney(ask.monthly)} (offre initiale {fmtMoney(orig.monthly)})</label><input type="range" min={Math.round(orig.monthly * 0.8)} max={Math.round(orig.monthly * 1.8)} step={5} value={ask.monthly} onChange={(e) => setAsk({ ...ask, monthly: Number(e.target.value) })} /></div>
            <div className="field"><label>Durée : {ask.months} mois</label><input type="range" min={6} max={36} step={6} value={ask.months} onChange={(e) => setAsk({ ...ask, months: Number(e.target.value) })} /></div>
            <div className="field"><label>Publications par mois : {ask.postsPerMonth}</label><input type="range" min={0} max={Math.max(orig.postsPerMonth, 1)} step={1} value={ask.postsPerMonth} onChange={(e) => setAsk({ ...ask, postsPerMonth: Number(e.target.value) })} disabled={orig.postsPerMonth === 0} /></div>
            <div className="field"><label>Présences par an : {ask.appearancesPerYear}</label><input type="range" min={0} max={Math.max(orig.appearancesPerYear, 1)} step={1} value={ask.appearancesPerYear} onChange={(e) => setAsk({ ...ask, appearancesPerYear: Number(e.target.value) })} /></div>
            <div className="field"><label>Prime par but : {fmtMoney(ask.bonusPerGoal)}</label><input type="range" min={0} max={Math.max(10, orig.bonusPerGoal * 2)} step={1} value={ask.bonusPerGoal} onChange={(e) => setAsk({ ...ask, bonusPerGoal: Number(e.target.value) })} /></div>
          </div>
          <div className="col">
            <div className="card flat" style={{ padding: 12 }}>
              <div className="small">Valeur totale demandée : <b>{fmtMoney(ask.monthly * ask.months)}</b> <span className={delta > 25 ? 'red' : delta > 10 ? 'orange' : 'green'}>({delta >= 0 ? '+' : ''}{delta} %)</span></div>
              <div className="tiny muted mt">Moins d’obligations = moins de valeur pour la marque. Une demande trop agressive peut faire échouer l’accord ; une offre concurrente dans la même catégorie te donne plus de poids. Ta crédibilité auprès des marques ({Math.round(g.reputation.sponsorCred)}) compte aussi.</div>
            </div>
            {msg && <div className="pill gold" style={{ whiteSpace: 'normal' }}>{msg}</div>}
            {!closed ? (
              <>
                <button className="btn primary" onClick={() => { const r = negotiate(offer.id, ask); if (r) { setMsg(r.message); if (r.outcome === 'counter') { const o = useGame.getState().game!.sponsors.offers.find((x) => x.id === offer.id)!; setAsk({ ...o.terms }); } } }}>Faire cette contre-proposition</button>
                <button className="btn" onClick={() => { sign(offer.id); onClose(); }}>Signer l’offre actuelle ({fmtMoney(live.terms.monthly)}/mois · {live.terms.months} mois)</button>
              </>
            ) : <div className="pill red">La marque a mis fin aux discussions.</div>}
            <button className="btn ghost" onClick={onClose}>Fermer</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function SponsorsScreen() {
  const g = useGame((s) => s.game)!;
  const sign = useGame((s) => s.sponsorSign);
  const decline = useGame((s) => s.sponsorDecline);
  const [tab, setTab] = useState<'offers' | 'contracts' | 'history' | 'brands'>('offers');
  const [nego, setNego] = useState<SponsorOffer | null>(null);
  const offers = g.sponsors.offers.filter((o) => o.status === 'pending');
  const contracts = activeContracts(g);
  const vis = visibility(g);
  const age = ageAt(g);
  const commercialLedger = g.ledger.filter((x) => x.category === 'sponsor' || x.category === 'sponsor_bonus' || (x.category === 'penalty' && x.label.includes('ontrat')));

  return (
    <>
      <PageTitle title="Sponsors & équipementiers" sub="Les marques regardent ta popularité, tes performances, ta crédibilité et ton image. Ne signe pas n’importe quoi." />
      <div className="grid g4 mb">
        <div className="card"><div className="card-title">Visibilité commerciale</div><div className="big-number">{Math.round(vis)}</div><div className="bar mt"><span style={{ width: `${vis}%` }} /></div></div>
        <div className="card"><div className="card-title">Crédibilité marques</div><div className="big-number">{Math.round(g.reputation.sponsorCred)}</div></div>
        <div className="card"><div className="card-title">Contrats actifs</div><div className="big-number">{contracts.length}</div><div className="tiny dim">Max actuel : {1 + Math.floor(g.reputation.popularity / 25)}</div></div>
        <div className="card"><div className="card-title">Revenus commerciaux</div><div className="big-number">{fmtMoney(commercialIncome(g))}</div><div className="tiny dim">depuis le début</div></div>
      </div>
      <div className="tabs">
        {([['offers', `Offres (${offers.length})`], ['contracts', `Contrats (${contracts.length})`], ['history', 'Historique des revenus'], ['brands', 'Marques']] as const).map(([id, l]) => <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{l}</button>)}
      </div>

      {tab === 'offers' && (
        offers.length === 0 ? <Empty>Aucune offre pour le moment. {age < 10 ? 'Les premières marques locales s’intéressent aux jeunes dès 9-10 ans après de bonnes performances.' : 'Améliore ta popularité et tes performances : les marques font des propositions en fin de mois.'}</Empty> : (
          <div className="col" style={{ gap: 16 }}>
            <div className="grid g2">
              {offers.map((o) => {
                const b = brand(o.brandId);
                const conflict = exclusivityConflict(g, b);
                return (
                  <div key={o.id} className="card">
                    <div className="row"><BrandChip logo={b.logo} color={b.color} /><div><b>{b.name}</b> {o.isRenewal && <span className="pill gold">Renouvellement</span>}<div className="tiny muted">{SPONSOR_CATEGORY_LABELS[b.category]} · {b.values}</div></div><span className="pill right">Expire {formatShortDate(o.expires, g.startYear)}</span></div>
                    <div className="row mt" style={{ alignItems: 'baseline' }}><span className="big-number" style={{ fontSize: 30 }}>{fmtMoney(o.terms.monthly)}</span><span className="muted">/mois · {o.terms.months} mois</span></div>
                    <div className="row wrap" style={{ gap: 4, marginTop: 6 }}>
                      {o.terms.postsPerMonth > 0 && <span className="pill">{o.terms.postsPerMonth} publication(s)/mois</span>}
                      <span className="pill">{o.terms.appearancesPerYear} présence(s)/an</span>
                      {o.terms.exclusive && <span className="pill violet">Exclusif</span>}
                      {o.terms.freeBoots && <span className="pill green">Crampons fournis</span>}
                    </div>
                    {conflict && <div className="tiny red mt">⚠ Conflit avec ton contrat {brand(conflict.brandId).name} : signer entraîne une pénalité de {fmtMoney(conflict.terms.penalty)} et une perte de crédibilité.</div>}
                    {age < 18 && <div className="tiny dim mt">Contrat cosigné par tes parents (mineur).</div>}
                    <div className="row mt">
                      <button className="btn primary sm" onClick={() => sign(o.id)}>Accepter</button>
                      <button className="btn sm" onClick={() => setNego(o)}>Négocier</button>
                      <button className="btn sm ghost" onClick={() => decline(o.id)}>Refuser</button>
                    </div>
                  </div>
                );
              })}
            </div>
            {offers.length > 1 && <div className="card"><h3>⚖️ Comparateur des offres</h3><TermsTable offers={offers} /></div>}
          </div>
        )
      )}

      {tab === 'contracts' && (
        contracts.length === 0 ? <Empty>Aucun contrat actif.</Empty> : (
          <div className="grid g2">
            {contracts.map((c) => {
              const b = brand(c.brandId);
              return (
                <div key={c.id} className="card">
                  <div className="row"><BrandChip logo={b.logo} color={b.color} /><div><b>{b.name}</b><div className="tiny muted">{SPONSOR_CATEGORY_LABELS[b.category]} · jusqu’à {formatShortDate(c.end, g.startYear)}</div></div><b className="right">{fmtMoney(c.terms.monthly)}/mois</b></div>
                  <div className="sep" />
                  {c.terms.postsPerMonth > 0 && <StatBar label={`Publications ce mois-ci (${c.postsThisMonth}/${c.terms.postsPerMonth})`} value={c.postsThisMonth} max={c.terms.postsPerMonth} color="auto" />}
                  <StatBar label={`Présences cette année (${c.appearancesThisYear}/${c.terms.appearancesPerYear})`} value={c.appearancesThisYear} max={Math.max(1, c.terms.appearancesPerYear)} color="blue" />
                  <div className="row between small"><span className="muted">Déjà perçu</span><b>{fmtMoney(c.earned)}</b></div>
                  {c.warnings > 0 && <div className="tiny red">⚠ {c.warnings} avertissement(s) pour obligations non respectées.</div>}
                  {c.terms.postsPerMonth > 0 && <div className="tiny dim">Publie depuis l’onglet « Image & réseaux » (type « Publication partenaire »).</div>}
                </div>
              );
            })}
          </div>
        )
      )}

      {tab === 'history' && (
        <div className="card">
          {commercialLedger.length === 0 ? <Empty>Aucun revenu commercial pour l’instant.</Empty> : (
            <table>
              <thead><tr><th>Date</th><th>Libellé</th><th className="num">Montant</th></tr></thead>
              <tbody>{commercialLedger.slice(0, 80).map((x, i) => <tr key={i}><td className="tiny muted">{formatShortDate(x.t, g.startYear)}</td><td className="small">{x.label}</td><td className={`num ${x.amount > 0 ? 'green' : 'red'}`}>{fmtMoney(x.amount)}</td></tr>)}</tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'brands' && (
        <div className="grid g3">
          {BRANDS.map((b) => {
            const ageOk = age >= b.minAge;
            const visOk = vis >= b.minVisibility;
            return (
              <div key={b.id} className="card flat" style={{ padding: 14, opacity: ageOk && visOk ? 1 : 0.6 }}>
                <div className="row"><BrandChip logo={b.logo} color={b.color} size={32} /><div><b className="small">{b.name}</b><div className="tiny muted">{SPONSOR_CATEGORY_LABELS[b.category]} · {'★'.repeat(b.tier)}</div></div></div>
                <div className="tiny muted mt">{b.values}</div>
                <div className="tiny mt">{ageOk ? '✓' : '✗'} Âge ≥ {b.minAge} · {visOk ? '✓' : '✗'} Visibilité ≥ {b.minVisibility}</div>
              </div>
            );
          })}
        </div>
      )}
      {nego && <Negotiation offer={nego} onClose={() => setNego(null)} />}
    </>
  );
}
