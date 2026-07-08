import api from './api';

/**
 * Notifications push (Web Push).
 * Fonctionne sur Android (Chrome) et iPhone (iOS 16.4+ installé en PWA via
 * « Sur l'écran d'accueil »).
 */

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/**
 * Demande la permission et abonne l'appareil aux notifications push.
 * @returns {Promise<{ok: boolean, reason?: string}>}
 */
export async function enablePush() {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' };

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { ok: false, reason: 'denied' };

    const reg = await navigator.serviceWorker.ready;

    // Récupérer la clé publique VAPID du serveur
    const { data } = await api.get('/push/vapid-public-key');
    if (!data?.publicKey) return { ok: false, reason: 'no-key' };

    // Réutilise l'abonnement existant ou en crée un
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });
    }

    await api.post('/push/subscribe', { subscription: sub });
    return { ok: true };
  } catch (err) {
    console.error('[Push] enablePush error:', err);
    return { ok: false, reason: 'error' };
  }
}

/** Statut actuel de la permission : 'default' | 'granted' | 'denied' | 'unsupported' */
export function pushPermission() {
  if (!pushSupported()) return 'unsupported';
  return Notification.permission;
}
