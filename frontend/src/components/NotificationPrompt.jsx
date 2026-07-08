import { useState, useEffect } from 'react';
import { pushSupported, pushPermission, enablePush } from '../lib/push';

/**
 * Bandeau invitant l'utilisateur connecté à activer les notifications push.
 * S'affiche si : push supporté, permission encore « default », non masqué.
 */
export default function NotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | loading | ok | error

  useEffect(() => {
    if (!pushSupported()) return;
    if (pushPermission() !== 'default') return;
    if (localStorage.getItem('push-prompt-dismissed') === '1') return;
    setVisible(true);
  }, []);

  async function activer() {
    setStatus('loading');
    const res = await enablePush();
    if (res.ok) {
      setStatus('ok');
      setTimeout(() => setVisible(false), 2500);
    } else {
      setStatus('error');
    }
  }

  function masquer() {
    localStorage.setItem('push-prompt-dismissed', '1');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="bg-gradient-to-r from-primary to-secondary text-white px-4 py-2.5">
      <div className="max-w-2xl mx-auto flex items-center gap-3">
        <span className="text-lg">🔔</span>
        <p className="flex-1 text-sm font-medium leading-tight">
          {status === 'ok'
            ? 'Notifications activées ! Vous serez prévenu directement sur ce téléphone. 🎉'
            : status === 'error'
            ? "Impossible d'activer les notifications. Vérifiez qu'Adoptly est bien installé sur votre écran d'accueil (iPhone)."
            : 'Activez les notifications pour être prévenu dès qu\'un message arrive.'}
        </p>
        {status !== 'ok' && (
          <>
            <button
              onClick={activer}
              disabled={status === 'loading'}
              className="bg-white text-primary text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap disabled:opacity-60"
            >
              {status === 'loading' ? '…' : 'Activer'}
            </button>
            <button onClick={masquer} className="text-white/80 hover:text-white text-lg leading-none" aria-label="Fermer">
              &times;
            </button>
          </>
        )}
      </div>
    </div>
  );
}
