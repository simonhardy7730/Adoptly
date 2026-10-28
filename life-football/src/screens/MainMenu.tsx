// Menu principal : nouvelle partie, reprise des sauvegardes, suppression.
import { useState } from 'react';
import { useGame } from '../store/gameStore';
import { SLOT_COUNT } from '../game/save';

function PitchArt() {
  return (
    <svg viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#123d27" />
          <stop offset="1" stopColor="#081a10" />
        </linearGradient>
        <radialGradient id="light" cx="0.7" cy="0.1" r="0.8">
          <stop offset="0" stopColor="#2fd17a" stopOpacity="0.35" />
          <stop offset="1" stopColor="#2fd17a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="600" height="800" fill="url(#grass)" />
      {Array.from({ length: 10 }).map((_, i) => <rect key={i} y={i * 80} width="600" height="40" fill="#ffffff" opacity="0.025" />)}
      <rect width="600" height="800" fill="url(#light)" />
      <g stroke="#ffffff" strokeOpacity="0.22" strokeWidth="3" fill="none">
        <rect x="60" y="60" width="480" height="680" rx="6" />
        <line x1="60" y1="400" x2="540" y2="400" />
        <circle cx="300" cy="400" r="80" />
        <rect x="180" y="60" width="240" height="120" />
        <rect x="240" y="60" width="120" height="50" />
        <rect x="180" y="620" width="240" height="120" />
        <path d="M250 180 A60 60 0 0 0 350 180" />
      </g>
      <g opacity="0.9">
        <circle cx="300" cy="400" r="5" fill="#fff" />
        <path d="M150 560 C 230 470, 330 520, 420 330 S 360 160, 300 120" stroke="#2fd17a" strokeWidth="4" strokeDasharray="10 10" fill="none" opacity="0.8" />
        <circle cx="150" cy="560" r="14" fill="#2fd17a" />
        <circle cx="300" cy="120" r="10" fill="#fff" />
      </g>
      <text x="64" y="770" fill="#ffffff" opacity="0.35" fontFamily="Barlow Condensed" fontSize="22" letterSpacing="4">DU CITY-STADE AUX GRANDES AFFICHES</text>
    </svg>
  );
}

export function MainMenu() {
  const saves = useGame((s) => s.saves);
  const load = useGame((s) => s.load);
  const goCreate = useGame((s) => s.goCreate);
  const del = useGame((s) => s.deleteSlot);
  const goDemo = useGame((s) => s.goDemo);
  const [confirm, setConfirm] = useState<number | null>(null);
  const latest = saves.filter(Boolean).sort((a, b) => b!.savedAt - a!.savedAt)[0];

  return (
    <div className="menu-wrap">
      <div className="menu-art"><PitchArt /></div>
      <div className="menu-panel fade-in">
        <div className="row">
          <div className="brand-logo">LF</div>
          <span className="pill green">Version 0.1 · Prototype jouable</span>
        </div>
        <h1 className="title-xl">Life<br /><span>Football</span></h1>
        <p className="muted" style={{ fontSize: 15, maxWidth: 440 }}>
          De ton premier match au city-stade à ta première sélection : construis la vie d’un footballeur. Chaque choix compte — sur le terrain comme en dehors.
        </p>
        <div className="row wrap" style={{ marginTop: 8 }}>
          {latest && <button className="btn primary lg" onClick={() => load(latest.slot)}>▶ Continuer</button>}
          <button className={`btn lg ${latest ? '' : 'primary'}`} onClick={goCreate} disabled={saves.every(Boolean)} title={saves.every(Boolean) ? 'Libère un emplacement pour commencer' : ''}>＋ Nouvelle carrière</button>
          <button className="btn lg ghost" onClick={goDemo}>⚽ Match de démonstration</button>
        </div>
        <div className="card-title" style={{ marginTop: 22 }}>Sauvegardes ({saves.filter(Boolean).length}/{SLOT_COUNT})</div>
        <div className="col">
          {saves.map((sv, i) => (
            <div key={i} className="slot-card">
              <div className="brand-logo" style={{ width: 30, height: 30, fontSize: 14, background: sv ? undefined : '#1e332c', color: sv ? undefined : '#63786d' }}>{i + 1}</div>
              {sv ? (
                <>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>{sv.name} <span className="muted small">· {sv.age} ans · Note {sv.overall}</span></div>
                    <div className="small muted">{sv.club} · {sv.date}</div>
                  </div>
                  <div className="row right">
                    {confirm === i ? (
                      <>
                        <button className="btn sm danger" onClick={() => { del(i); setConfirm(null); }}>Supprimer</button>
                        <button className="btn sm ghost" onClick={() => setConfirm(null)}>Annuler</button>
                      </>
                    ) : (
                      <>
                        <button className="btn sm primary" onClick={() => load(i)}>Charger</button>
                        <button className="btn sm ghost" onClick={() => setConfirm(i)} aria-label="Supprimer">🗑</button>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <span className="muted small">Emplacement libre</span>
              )}
            </div>
          ))}
        </div>
        <p className="tiny dim" style={{ marginTop: 12 }}>Sauvegarde locale dans ce navigateur. Les clubs, marques et personnages sont fictifs.</p>
      </div>
    </div>
  );
}
