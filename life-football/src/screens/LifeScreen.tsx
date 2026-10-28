// Courses & alimentation : magasin interactif, garde-manger, équipement.
import { useState } from 'react';
import { useGame } from '../store/gameStore';
import { BOOTS, FOODS, food, WEEKLY_PORTIONS } from '../content/foods';
import { ageAt } from '../game/calendar';
import { background } from '../content/profiles';
import { currentClub } from '../game/career';
import { PageTitle, StatBar, fmtMoney, Empty } from '../ui/kit';

export function LifeScreen() {
  const g = useGame((s) => s.game)!;
  const buy = useGame((s) => s.buy);
  const buyBoots = useGame((s) => s.buyBoots);
  const [cart, setCart] = useState<Record<string, number>>({});
  const age = ageAt(g);
  const total = Object.entries(cart).reduce((a, [id, q]) => a + (food(id)?.price ?? 0) * q, 0);
  const cartNut = (() => {
    let n = 0, w = 0;
    for (const [id, q] of Object.entries(cart)) { const f = food(id)!; n += f.nutrition * f.portions * q; w += f.portions * q; }
    return w ? Math.round(n / w) : 0;
  })();
  const pantryCount = Object.values(g.pantry).reduce((a, b) => a + b, 0);
  const club = currentClub(g);
  const boarding = !!club?.boarding && age >= 12;
  const add = (id: string, d: number) => setCart((c) => {
    const n = { ...c, [id]: Math.max(0, (c[id] ?? 0) + d) };
    if (!n[id]) delete n[id];
    return n;
  });

  return (
    <>
      <PageTitle title="Courses & alimentation" sub={`Repas principaux : ${boarding ? 'cantine du centre (qualité 74)' : `cuisine familiale (qualité ${background(g.identity.background).homeNutrition})`}. Ton garde-manger complète ${WEEKLY_PORTIONS} repas/collations par semaine.`} />
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)' }}>
        <div className="card">
          <h3>🛒 Supérette du quartier <span className="sub">Budget : {fmtMoney(g.money)}</span></h3>
          <div className="grid g3">
            {FOODS.filter((f) => !f.minAge || age >= f.minAge).map((f) => (
              <div key={f.id} className="card flat" style={{ padding: 12 }}>
                <div className="row"><span style={{ fontSize: 26 }}>{f.icon}</span><div><b className="small">{f.name}</b><div className="tiny muted">{f.portions} portions · {fmtMoney(f.price)}</div></div></div>
                <div className="row wrap" style={{ gap: 4, marginTop: 8 }}>
                  <span className={`pill ${f.nutrition >= 65 ? 'green' : f.nutrition >= 40 ? 'gold' : 'red'}`}>Nutrition {f.nutrition}</span>
                  {f.recovery > 2 && <span className="pill blue">Récup +{f.recovery}</span>}
                  {f.morale > 2 && <span className="pill violet">Plaisir +{f.morale}</span>}
                </div>
                <div className="row mt">
                  <button className="btn sm" onClick={() => add(f.id, -1)} disabled={!cart[f.id]}>−</button>
                  <b style={{ minWidth: 20, textAlign: 'center' }}>{cart[f.id] ?? 0}</b>
                  <button className="btn sm" onClick={() => add(f.id, 1)}>+</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="col" style={{ gap: 16 }}>
          <div className="card">
            <h3>🧾 Panier</h3>
            {Object.keys(cart).length === 0 ? <div className="small muted">Ton panier est vide.</div> : Object.entries(cart).map(([id, q]) => <div key={id} className="row between small"><span>{food(id)!.icon} {food(id)!.name} × {q}</span><b>{fmtMoney(food(id)!.price * q)}</b></div>)}
            <div className="sep" />
            <div className="row between"><span className="muted">Total</span><b className="display" style={{ fontSize: 22 }}>{fmtMoney(total)}</b></div>
            {total > 0 && <div className="tiny muted">Qualité nutritionnelle moyenne du panier : {cartNut}/100</div>}
            {total > g.money && <div className="tiny red">Budget insuffisant.</div>}
            <button className="btn primary block mt" disabled={total <= 0 || total > g.money} onClick={() => { buy(cart); setCart({}); }}>Payer</button>
          </div>
          <div className="card">
            <h3>🥫 Garde-manger <span className="sub">{pantryCount} portion(s)</span></h3>
            {pantryCount === 0 ? <Empty>Vide : tu ne manges que les repas principaux.</Empty> : Object.entries(g.pantry).map(([id, q]) => <div key={id} className="row between small"><span>{food(id)?.icon} {food(id)?.name}</span><b>{q}</b></div>)}
            <div className="sep" />
            <StatBar label="Nutrition (moyenne récente)" value={Math.round(g.player.nutrition)} color="auto" />
            <p className="tiny dim">Chaque fin de semaine, jusqu’à {WEEKLY_PORTIONS} portions sont consommées (les plus nutritives d’abord). Une bonne nutrition accélère la récupération et la guérison ; les snacks remontent le moral mais pas la forme.</p>
          </div>
          <div className="card">
            <h3>👟 Équipement</h3>
            <StatBar label={g.player.boots.name} value={Math.round(100 - g.player.boots.wear)} suffix="%" color="auto" />
            {g.player.boots.sponsored ? <div className="small green">Fourni par ton équipementier.</div> : BOOTS.map((b) => (
              <div key={b.id} className="row between small" style={{ marginBottom: 6 }}>
                <div><b>{b.name}</b><div className="tiny muted">{b.description}</div></div>
                <button className="btn sm" disabled={g.money < b.price} onClick={() => buyBoots(b.id)}>{fmtMoney(b.price)}</button>
              </div>
            ))}
            <p className="tiny dim">Les crampons n’améliorent pas tes statistiques ; des crampons très usés augmentent légèrement le risque de blessure et gênent un peu l’exécution.</p>
          </div>
        </div>
      </div>
    </>
  );
}
