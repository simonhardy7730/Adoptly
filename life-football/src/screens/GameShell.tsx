// Coque de jeu : navigation latérale, barre d'état, contenu de l'onglet, superpositions bloquantes.
import { useState } from 'react';
import { useGame, type TabId } from '../store/gameStore';
import { ageAt, formatDate, seasonLabel, isHolidays } from '../game/calendar';
import { blockingActivity } from '../game/week';
import { currentClub } from '../game/career';
import { fmtMoney, MiniBar, Modal } from '../ui/kit';
import { EventModal } from './EventModal';
import { Dashboard } from './Dashboard';
import { CalendarScreen } from './CalendarScreen';
import { TrainingScreen } from './TrainingScreen';
import { ClubScreen } from './ClubScreen';
import { LifeScreen } from './LifeScreen';
import { FinanceScreen } from './FinanceScreen';
import { RelationsScreen } from './RelationsScreen';
import { ProfileScreen } from './ProfileScreen';
import { NationalScreen } from './NationalScreen';
import { SponsorsScreen } from './SponsorsScreen';
import { SocialScreen } from './SocialScreen';
import { HistoryScreen } from './HistoryScreen';
import { MatchScreen } from './MatchScreen';
import { TryoutScreen } from './TryoutScreen';
import { PracticeScreen } from './PracticeScreen';
import { PrologueScreen } from './PrologueScreen';
import type { GameState } from '../game/types';
import { socialLocked } from '../game/social';

interface NavDef { id: TabId; label: string; icon: string; group: string; badge?: (g: GameState) => number }

const NAV: NavDef[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: '🏠', group: 'Ma semaine', badge: (g) => g.notifications.filter((n) => !n.read).length },
  { id: 'calendar', label: 'Calendrier', icon: '📅', group: 'Ma semaine' },
  { id: 'training', label: 'Entraînement & mini-jeux', icon: '🎯', group: 'Ma semaine' },
  { id: 'club', label: 'Club & détections', icon: '🏟️', group: 'Carrière', badge: (g) => g.tryouts.filter((t) => t.status === 'invited').length + g.clubOffers.filter((o) => o.status === 'pending').length },
  { id: 'national', label: 'Sélections', icon: '🎽', group: 'Carrière', badge: (g) => (g.national.pendingCallup?.status === 'pending' ? 1 : 0) },
  { id: 'history', label: 'Historique & stats', icon: '📜', group: 'Carrière' },
  { id: 'life', label: 'Courses & alimentation', icon: '🛒', group: 'Vie' },
  { id: 'finance', label: 'Logement & finances', icon: '💶', group: 'Vie' },
  { id: 'relations', label: 'Relations & famille', icon: '❤️', group: 'Vie', badge: (g) => g.admin.filter((a) => !a.done).length },
  { id: 'profile', label: 'Profil & nationalité', icon: '🪪', group: 'Identité' },
  { id: 'sponsors', label: 'Sponsors', icon: '🤝', group: 'Image', badge: (g) => g.sponsors.offers.filter((o) => o.status === 'pending').length },
  { id: 'social', label: 'Image & réseaux', icon: '📱', group: 'Image' },
];

export function GameShell() {
  const g = useGame((s) => s.game)!;
  const tab = useGame((s) => s.tab);
  const setTab = useGame((s) => s.setTab);
  const advance = useGame((s) => s.advance);
  const save = useGame((s) => s.save);
  const goMenu = useGame((s) => s.goMenu);
  const match = useGame((s) => s.match);
  const tryout = useGame((s) => s.tryout);
  const practice = useGame((s) => s.practice);
  const report = useGame((s) => s.weekReport);
  const closeReport = useGame((s) => s.closeReport);
  const [menuOpen, setMenuOpen] = useState(false);
  const [quit, setQuit] = useState(false);

  const age = ageAt(g);
  const club = currentClub(g);
  const block = blockingActivity(g);
  const nextLabel = block?.type === 'event' ? 'Décision en attente' : block?.type === 'tryout' ? 'Aller à la détection' : block?.type === 'league' ? 'Jouer le match' : block?.type === 'national' ? 'Match en sélection' : 'Semaine suivante';
  const p = g.player;

  if (!g.prologue.done) return <PrologueScreen />;

  let lastGroup = '';
  return (
    <div className="shell">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-logo">LF</div>
          <div className="brand-name">Life Football<small>CARRIÈRE</small></div>
        </div>
        {NAV.map((n) => {
          const header = n.group !== lastGroup ? <div className="nav-group" key={`g_${n.group}`}>{n.group}</div> : null;
          lastGroup = n.group;
          const badge = n.badge?.(g) ?? 0;
          const locked = n.id === 'social' && !!socialLocked(g);
          return (
            <div key={n.id}>
              {header}
              <button className={`nav-item ${tab === n.id ? 'active' : ''}`} onClick={() => { setTab(n.id); setMenuOpen(false); }}>
                <span className="ico">{n.icon}</span>{n.label}
                {locked && <span className="tiny dim right">13 ans</span>}
                {badge > 0 && <span className={`badge ${n.id === 'relations' ? 'warn' : ''}`}>{badge}</span>}
              </button>
            </div>
          );
        })}
        <div style={{ marginTop: 'auto', paddingTop: 16 }} className="col">
          <button className="btn sm" onClick={() => save(true)}>💾 Sauvegarder</button>
          <button className="btn sm ghost" onClick={() => setQuit(true)}>⏏ Menu principal</button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="btn sm menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">☰</button>
          <div className="date">
            {formatDate(g.t, g.startYear)}
            <small>Saison {seasonLabel(g.t, g.startYear)} · {age} ans · {club ? club.name : 'Sans club'}{isHolidays(g.t, g.startYear) ? ' · Vacances' : ''}</small>
          </div>
          <div className="kpis">
            <div className="kpi">
              <span className="k">Actions</span>
              <div className="slots" title={`${g.slots.left}/${g.slots.max} créneaux de temps libre`}>
                {Array.from({ length: g.slots.max }).map((_, i) => <span key={i} className={`slot ${i >= g.slots.left ? 'used' : ''}`} />)}
              </div>
            </div>
            <div className="kpi"><span className="k">Énergie</span><span className="v">{Math.round(p.energy)}</span><MiniBar value={p.energy} /></div>
            <div className="kpi hide-sm"><span className="k">Moral</span><span className="v">{Math.round(p.morale)}</span><MiniBar value={p.morale} color="blue" /></div>
            <div className="kpi hide-sm"><span className="k">Forme</span><span className="v">{Math.round(p.form)}</span><MiniBar value={p.form} color="gold" /></div>
            <div className="kpi"><span className="k">Argent</span><span className="v" style={{ color: g.money < 0 ? 'var(--red)' : undefined }}>{fmtMoney(g.money)}</span></div>
            <button className={`btn primary ${block && block.type !== 'event' ? 'pulse' : ''}`} onClick={() => advance()} disabled={block?.type === 'event'}>
              {nextLabel} ▶
            </button>
          </div>
        </header>
        <main className="content" key={tab}>
          <div className="fade-in">
            {tab === 'dashboard' && <Dashboard />}
            {tab === 'calendar' && <CalendarScreen />}
            {tab === 'training' && <TrainingScreen />}
            {tab === 'club' && <ClubScreen />}
            {tab === 'life' && <LifeScreen />}
            {tab === 'finance' && <FinanceScreen />}
            {tab === 'relations' && <RelationsScreen />}
            {tab === 'profile' && <ProfileScreen />}
            {tab === 'national' && <NationalScreen />}
            {tab === 'sponsors' && <SponsorsScreen />}
            {tab === 'social' && <SocialScreen />}
            {tab === 'history' && <HistoryScreen />}
          </div>
        </main>
      </div>

      {g.events.pending.length > 0 && !match && !tryout && <EventModal />}
      {match && <MatchScreen />}
      {tryout && <TryoutScreen />}
      {practice && <PracticeScreen />}

      {report && report.title === '__confirm__' && (
        <Modal onClose={closeReport}>
          <div className="modal-head"><h2>Terminer la semaine ?</h2></div>
          <div className="modal-body">
            <p className="muted">{report.lines[0]} Le temps non utilisé est perdu (mais tu récupères de l’énergie).</p>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" onClick={closeReport}>Continuer ma semaine</button>
              <button className="btn primary" onClick={() => { closeReport(); advance(true); }}>Passer à la suite ▶</button>
            </div>
          </div>
        </Modal>
      )}
      {report && report.title !== '__confirm__' && !g.events.pending.length && report.lines.length > 0 && (
        <Modal onClose={closeReport}>
          <div className="modal-head"><div className="card-title">Bilan de la semaine</div><h2 className="display" style={{ fontSize: 26 }}>{report.title}</h2></div>
          <div className="modal-body">
            {report.lines.map((l, i) => <div key={i} className="feed-item"><div className="ic">✓</div><div className="small">{l}</div></div>)}
            <button className="btn primary block mt" onClick={closeReport}>C’est parti</button>
          </div>
        </Modal>
      )}
      {quit && (
        <Modal onClose={() => setQuit(false)}>
          <div className="modal-head"><h2>Retourner au menu ?</h2></div>
          <div className="modal-body">
            <p className="muted">La partie est sauvegardée automatiquement avant de quitter.</p>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setQuit(false)}>Annuler</button>
              <button className="btn primary" onClick={goMenu}>Sauvegarder et quitter</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
