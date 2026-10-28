// Profil détaillé : identité (verrouillée), apparence, caractéristiques, potentiel, nationalités.
import { useGame } from '../store/gameStore';
import { ageAt, MONTHS } from '../game/calendar';
import { ATTR_GROUPS, ATTR_LABELS, POSITION_LABELS, archetype, background, environment } from '../content/profiles';
import { Avatar } from '../ui/Avatar';
import { country } from '../content/countries';
import { PageTitle, StatBar, Stars } from '../ui/kit';
import { playerOverall, potentialEstimate, overall } from '../game/stats';
import { nationEligibility, ELIGIBILITY_RULES } from '../game/eligibility';
import { currentClub } from '../game/career';
import type { Position } from '../game/types';

export function ProfileScreen() {
  const g = useGame((s) => s.game)!;
  const id = g.identity;
  const age = ageAt(g);
  const pot = potentialEstimate(g);
  const club = currentClub(g);
  const nations = nationEligibility(g);
  const foot = id.foot === 'right' ? 'Droitier' : id.foot === 'left' ? 'Gaucher' : 'Ambidextre';
  return (
    <>
      <PageTitle title="Profil du joueur" sub="Ton identité est fixée depuis le début de la carrière ; tes caractéristiques, elles, évoluent." />
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)' }}>
        <div className="col" style={{ gap: 16 }}>
          <div className="card center">
            <Avatar a={g.appearance} age={age} size={190} colors={club?.colors ?? ['#1fa860', '#ffffff']} />
            <div className="hero-name" style={{ fontSize: 30 }}>{id.firstName} {id.lastName}</div>
            {id.nickname && <div className="green">« {id.nickname} »</div>}
            <div className="small muted">{age} ans · né(e) en {MONTHS[id.birthMonth - 1]} {id.birthYear} à {id.birthCity} ({country(id.birthCountry).name})</div>
            <div className="sep" />
            <div className="grid g2" style={{ textAlign: 'left' }}>
              <div><div className="tiny dim">Poste</div><b className="small">{POSITION_LABELS[id.position]}{id.secondaryPosition ? ` / ${POSITION_LABELS[id.secondaryPosition]}` : ''}</b></div>
              <div><div className="tiny dim">Pied fort</div><b className="small">{foot}</b></div>
              <div><div className="tiny dim">Profil</div><b className="small">{archetype(id.archetype).label}</b></div>
              <div><div className="tiny dim">Maillot</div><b className="small">n°{g.appearance.jerseyNumber}</b></div>
              <div><div className="tiny dim">Grandit en</div><b className="small">{country(id.growUpCountry).flag} {country(id.growUpCountry).name}</b></div>
              <div><div className="tiny dim">Langue</div><b className="small">{id.language}</b></div>
              <div><div className="tiny dim">Milieu</div><b className="small">{background(id.background).label}</b></div>
              <div><div className="tiny dim">Environnement</div><b className="small">{environment(id.environment).label}</b></div>
            </div>
          </div>
          <div className="card">
            <h3>🌍 Nationalités & éligibilité</h3>
            {nations.map((n) => (
              <div key={n.code} className="row between" style={{ marginBottom: 8 }}>
                <div><b>{n.flag} {n.name}</b><div className="tiny muted">{n.reason}</div></div>
                <span className={`pill ${n.status === 'committed' ? 'gold' : n.status === 'locked' ? 'red' : 'green'}`}>{n.status === 'committed' ? 'Engagé définitivement' : n.status === 'locked' ? 'Plus éligible' : 'Éligible'}</span>
              </div>
            ))}
            {id.parentOrigin && id.parentOrigin !== id.nationality && id.parentOrigin !== id.secondNationality && <div className="tiny dim">Origine parentale : {country(id.parentOrigin).name} (pas de nationalité déclarée).</div>}
            <div className="tiny dim mt">Règles du jeu (simplifiées) : matchs de jeunes non engageants{ELIGIBILITY_RULES.seniorFriendlyLocks ? '' : ', amicaux seniors non engageants'}, un match officiel en équipe A rend le choix définitif.</div>
          </div>
        </div>
        <div className="col" style={{ gap: 16 }}>
          <div className="card">
            <div className="row">
              <div className="ovr"><b>{Math.round(playerOverall(g))}</b><span>NIVEAU</span></div>
              <div>
                <div className="small muted">Potentiel estimé par les recruteurs</div>
                <div className="row"><Stars value={pot.stars} /><span className="pill gold">{pot.label}</span></div>
                <div className="tiny dim">Fourchette estimée : {pot.low}–{pot.high}. L’estimation s’affine avec l’âge. Le potentiel ne garantit rien : travail, blessures et choix décident.</div>
              </div>
            </div>
            <div className="sep" />
            <div className="row wrap" style={{ gap: 6 }}>
              {(['GK', 'DEF', 'MID', 'ATT'] as Position[]).map((p) => <span key={p} className={`pill ${p === id.position ? 'green' : ''}`}>{POSITION_LABELS[p]} : {Math.round(overall(g.player.attrs, p))}</span>)}
            </div>
          </div>
          <div className="grid g2">
            {ATTR_GROUPS.map((gr) => (
              <div key={gr.label} className="card">
                <h3>{gr.label}</h3>
                {gr.keys.map((k) => <StatBar key={k} label={ATTR_LABELS[k]} value={Math.round(g.player.attrs[k] * 10) / 10} />)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
