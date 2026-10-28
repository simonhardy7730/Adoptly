// Logement & finances : situation de logement, budget, revenus sportifs vs commerciaux, historique.
import { useState } from 'react';
import { useGame } from '../store/gameStore';
import type { TxCategory } from '../game/types';
import { ageAt, formatShortDate } from '../game/calendar';
import { currentClub } from '../game/career';
import { PageTitle, fmtMoney } from '../ui/kit';
import { brand } from '../content/brands';

export const CAT_LABELS: Record<TxCategory, string> = {
  pocket: 'Argent de poche', family: 'Famille', job: 'Petits boulots', salary: 'Salaire / indemnité club', bonus: 'Primes sportives',
  sponsor: 'Revenus publicitaires', sponsor_bonus: 'Primes de sponsoring', food: 'Alimentation', transport: 'Transports', equipment: 'Équipement',
  leisure: 'Loisirs', health: 'Santé', admin: 'Démarches', tax: 'Impôts & charges', penalty: 'Pénalités', gift: 'Cadeaux',
};
const GROUPS: { label: string; cats: TxCategory[]; color: string }[] = [
  { label: 'Revenus sportifs', cats: ['salary', 'bonus'], color: '#2fd17a' },
  { label: 'Revenus commerciaux', cats: ['sponsor', 'sponsor_bonus'], color: '#5ab0ff' },
  { label: 'Famille & petits boulots', cats: ['pocket', 'family', 'job', 'gift'], color: '#f4c95d' },
];

export function FinanceScreen() {
  const g = useGame((s) => s.game)!;
  const [filter, setFilter] = useState<'all' | 'in' | 'out' | 'commercial'>('all');
  const age = ageAt(g);
  const club = currentClub(g);
  const boarding = !!club?.boarding && age >= 12;
  const since = Math.max(0, g.t - 48);
  const lastYear = g.ledger.filter((x) => x.t >= since);
  const income = lastYear.filter((x) => x.amount > 0).reduce((a, x) => a + x.amount, 0);
  const spend = -lastYear.filter((x) => x.amount < 0).reduce((a, x) => a + x.amount, 0);
  const byCat = new Map<TxCategory, number>();
  for (const x of lastYear) byCat.set(x.category, (byCat.get(x.category) ?? 0) + x.amount);
  const groups = GROUPS.map((gr) => ({ ...gr, value: gr.cats.reduce((a, c) => a + Math.max(0, byCat.get(c) ?? 0), 0) }));
  const maxG = Math.max(1, ...groups.map((x) => x.value));
  const expenses = [...byCat.entries()].filter(([, v]) => v < 0).sort((a, b) => a[1] - b[1]);
  const list = g.ledger.filter((x) => filter === 'all' || (filter === 'in' ? x.amount > 0 : filter === 'out' ? x.amount < 0 : x.category === 'sponsor' || x.category === 'sponsor_bonus')).slice(0, 60);
  const commercialByBrand = g.sponsors.contracts.map((c) => ({ name: brand(c.brandId).name, earned: c.earned, active: c.active }));

  return (
    <>
      <PageTitle title="Logement & finances" sub="Tous les mouvements d’argent sont enregistrés. Un gros revenu ne garantit pas des finances saines." />
      <div className="grid g3 mb">
        <div className="card"><div className="card-title">Solde</div><div className="big-number" style={{ color: g.money < 0 ? 'var(--red)' : undefined }}>{fmtMoney(g.money)}</div></div>
        <div className="card"><div className="card-title">Revenus (12 mois)</div><div className="big-number green">{fmtMoney(income)}</div></div>
        <div className="card"><div className="card-title">Dépenses (12 mois)</div><div className="big-number red">{fmtMoney(spend)}</div></div>
      </div>
      <div className="grid g2">
        <div className="col" style={{ gap: 16 }}>
          <div className="card">
            <h3>🏠 Logement</h3>
            <div className="row">
              <div className="brand-logo" style={{ fontSize: 18 }}>{boarding ? '🏫' : '🏠'}</div>
              <div><b>{boarding ? `Internat du centre — ${club!.name}` : 'Chez tes parents'}</b><div className="small muted">{boarding ? 'Logé, nourri par le club. Retours à la maison le week-end (action « Temps en famille », 12 €).' : 'Pas de loyer à payer. Tes parents assurent les repas principaux.'}</div></div>
            </div>
            <p className="tiny dim mt">Location et achat d’un logement personnel : disponibles à l’âge adulte (phase « Vie adulte », pas encore développée).</p>
          </div>
          <div className="card">
            <h3>⚖️ Revenus sportifs vs commerciaux <span className="sub">12 derniers mois</span></h3>
            {groups.map((gr) => (
              <div key={gr.label} style={{ marginBottom: 10 }}>
                <div className="row between small"><span>{gr.label}</span><b>{fmtMoney(gr.value)}</b></div>
                <div className="bar" style={{ height: 10 }}><span style={{ width: `${(gr.value / maxG) * 100}%`, background: gr.color }} /></div>
              </div>
            ))}
            <div className="tiny dim">Revenus sportifs : indemnités de formation (dès 16 ans en centre pro). Les salaires professionnels arriveront avec la phase Carrière professionnelle.</div>
          </div>
          <div className="card">
            <h3>📉 Où part ton argent</h3>
            {expenses.length === 0 ? <div className="small muted">Aucune dépense sur 12 mois.</div> : expenses.map(([c, v]) => <div key={c} className="row between small"><span>{CAT_LABELS[c]}</span><b className="red">{fmtMoney(v)}</b></div>)}
          </div>
          {commercialByBrand.length > 0 && (
            <div className="card">
              <h3>🤝 Revenus commerciaux par marque</h3>
              {commercialByBrand.map((c, i) => <div key={i} className="row between small"><span>{c.name} {c.active ? <span className="pill green">actif</span> : <span className="pill">terminé</span>}</span><b>{fmtMoney(c.earned)}</b></div>)}
            </div>
          )}
        </div>
        <div className="card">
          <h3>📒 Historique</h3>
          <div className="tabs">
            {([['all', 'Tout'], ['in', 'Revenus'], ['out', 'Dépenses'], ['commercial', 'Commercial']] as const).map(([id, l]) => <button key={id} className={filter === id ? 'on' : ''} onClick={() => setFilter(id)}>{l}</button>)}
          </div>
          <table>
            <thead><tr><th>Date</th><th>Libellé</th><th className="num">Montant</th></tr></thead>
            <tbody>
              {list.map((x, i) => (
                <tr key={i}><td className="tiny muted">{formatShortDate(x.t, g.startYear)}</td><td><div className="small">{x.label}</div><div className="tiny dim">{CAT_LABELS[x.category]}</div></td><td className={`num ${x.amount > 0 ? 'green' : 'red'}`}>{x.amount > 0 ? '+' : ''}{fmtMoney(x.amount)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
