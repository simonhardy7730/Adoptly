import webpush from 'web-push';
import { supabase } from './supabase.js';

/**
 * Notifications push (Web Push / VAPID).
 * Fonctionne sur Android (Chrome) et iPhone (iOS 16.4+ installé en PWA).
 * Les abonnements sont stockés dans la table `push_subscriptions`.
 */

const PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT     = process.env.VAPID_SUBJECT || 'mailto:info@adoptly.fr';

let configured = false;
if (PUBLIC_KEY && PRIVATE_KEY) {
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
  configured = true;
} else {
  console.warn('[Push] VAPID non configuré — notifications push désactivées');
}

export function getVapidPublicKey() {
  return PUBLIC_KEY || null;
}

/** Enregistre (ou met à jour) l'abonnement push d'un utilisateur. */
export async function savePushSubscription({ userId, role, subscription }) {
  if (!subscription?.endpoint) throw new Error('Abonnement invalide');
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id:      userId,
        role,
        endpoint:     subscription.endpoint,
        subscription,
      },
      { onConflict: 'endpoint' }
    );
  if (error) throw error;
}

/** Supprime un abonnement (au désabonnement ou s'il est mort). */
export async function removePushSubscription(endpoint) {
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
}

/**
 * Envoie une notification push à tous les appareils d'un utilisateur.
 * Non-bloquant : les erreurs sont loggées, les abonnements morts supprimés.
 * @param {{ userId: string, role: string, title: string, body: string, url?: string }} p
 */
export async function sendPushToUser({ userId, role, title, body, url }) {
  if (!configured) return;
  try {
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, subscription')
      .eq('user_id', userId)
      .eq('role', role);

    if (!subs?.length) return;

    const payload = JSON.stringify({ title, body, url: url || 'https://adoptly.fr' });

    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(s.subscription, payload);
        } catch (err) {
          // 404/410 = abonnement expiré → on le supprime
          if (err.statusCode === 404 || err.statusCode === 410) {
            await removePushSubscription(s.endpoint);
          } else {
            console.error('[Push] Échec envoi:', err.statusCode || err.message);
          }
        }
      })
    );
  } catch (err) {
    console.error('[Push] Erreur sendPushToUser:', err.message);
  }
}
