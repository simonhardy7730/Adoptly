import { useState, useEffect } from 'react';
import { pushSupported, pushPermission, enablePush } from '../lib/push';
import { isStandalone, getPlatform, installAvailable, onInstallChange, promptInstall } from '../lib/pwa';

/**
 * Bandeau intelligent d'installation / notifications pour l'utilisateur connecté.
 *
 * Selon l'appareil :
 *  - iPhone non installé  → invite à ajouter à l'écran d'accueil (obligatoire pour le push sur iOS)
 *  - Android / installé   → propose d'activer les notifications (1 clic, sans install)
 *  - Android non installé → propose EN PLUS d'installer l'app (icône = rétention)
 */

const KEY = { ios: 'pwa-ios-dismissed', notif: 'push-prompt-dismissed', install: 'pwa-install-dismissed' };
const isDismissed = (k) => localStorage.getItem(KEY[k]) === '1';

export default function InstallPrompt() {
  const [notifStatus, setNotifStatus] = useState('idle'); // idle | loading | ok | error
  const [canInstall, setCanInstall] = useState(installAvailable());
  const [closed, setClosed] = useState({});
  const [tick, setTick] = useState(0); // force le recalcul après une action

  const installed = isStandalone();
  const platform = getPlatform();

  useEffect(() => onInstallChange(() => setCanInstall(installAvailable())), []);

  // Quels blocs sont pertinents ?
  const needsIOSInstall = platform === 'ios' && !installed;
  const notifRelevant =
    !needsIOSInstall && pushSupported() && pushPermission() === 'default' && notifStatus !== 'ok';
  const installRelevant = canInstall && !installed && platform !== 'ios';

  const iosActive = needsIOSInstall && !isDismissed('ios') && !closed.ios;
  const notifActive = notifRelevant && !isDismissed('notif') && !closed.notif;
  const installActive = installRelevant && !isDismissed('install') && !closed.install;

  void tick; // dépendance implicite pour re-render

  async function activerNotifs() {
    setNotifStatus('loading');
    const res = await enablePush();
    setNotifStatus(res.ok ? 'ok' : 'error');
    if (res.ok) setTimeout(() => setTick((t) => t + 1), 2600);
  }

  async function installer() {
    const res = await promptInstall();
    if (res.ok) setClosed((c) => ({ ...c, install: true }));
  }

  function fermer(kind) {
    localStorage.setItem(KEY[kind], '1');
    setClosed((c) => ({ ...c, [kind]: true }));
  }

  const wrap = 'bg-gradient-to-r from-primary to-secondary text-white px-4 py-2.5';
  const inner = 'max-w-2xl mx-auto flex items-center gap-3';
  const btn = 'bg-white text-primary text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap disabled:opacity-60';
  const closeBtn = 'text-white/80 hover:text-white text-lg leading-none';

  // ── iPhone non installé : prérequis pour le push ──────────────
  if (iosActive) {
    return (
      <div className={wrap}>
        <div className={`${inner} flex-wrap`}>
          <span className="text-lg">📲</span>
          <p className="flex-1 min-w-0 text-sm font-medium leading-tight">
            Ajoute Adoptly à ton écran d'accueil pour être prévenu des réponses des refuges.
            <span className="block text-white/85 text-xs mt-0.5">
              Appuie sur l'icône <strong>Partager</strong> (carré avec une flèche ↑) en bas de Safari,
              puis <strong>« Sur l'écran d'accueil »</strong>.
            </span>
          </p>
          <button onClick={() => fermer('ios')} className={closeBtn} aria-label="Fermer">&times;</button>
        </div>
      </div>
    );
  }

  // ── Android / installé : activer les notifs (+ install si dispo) ──
  if (notifActive) {
    return (
      <div className={wrap}>
        <div className={inner}>
          <span className="text-lg">🔔</span>
          <p className="flex-1 min-w-0 text-sm font-medium leading-tight">
            {notifStatus === 'error'
              ? "Impossible d'activer les notifications. Vérifie qu'Adoptly est bien installé sur ton écran d'accueil (iPhone)."
              : 'Active les notifications pour être prévenu dès qu\'un refuge te répond.'}
          </p>
          <button onClick={activerNotifs} disabled={notifStatus === 'loading'} className={btn}>
            {notifStatus === 'loading' ? '…' : 'Activer'}
          </button>
          {installActive && (
            <button onClick={installer} className={`${btn} bg-white/20 text-white`}>📲 Installer</button>
          )}
          <button onClick={() => fermer('notif')} className={closeBtn} aria-label="Fermer">&times;</button>
        </div>
      </div>
    );
  }

  // ── Notif déjà OK (message de confirmation transitoire) ──
  if (notifStatus === 'ok') {
    return (
      <div className={wrap}>
        <div className={inner}>
          <span className="text-lg">🎉</span>
          <p className="flex-1 min-w-0 text-sm font-medium leading-tight">
            Notifications activées ! Tu seras prévenu directement sur ce téléphone.
          </p>
        </div>
      </div>
    );
  }

  // ── Android non installé, notifs déjà gérées : proposer l'install (rétention) ──
  if (installActive) {
    return (
      <div className={wrap}>
        <div className={inner}>
          <span className="text-lg">📲</span>
          <p className="flex-1 min-w-0 text-sm font-medium leading-tight">
            Installe Adoptly sur ton écran d'accueil pour y revenir en 1 clic.
          </p>
          <button onClick={installer} className={btn}>Installer</button>
          <button onClick={() => fermer('install')} className={closeBtn} aria-label="Fermer">&times;</button>
        </div>
      </div>
    );
  }

  return null;
}
