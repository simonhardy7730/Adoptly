/**
 * Utilitaires PWA : détection de plateforme + capture du prompt d'installation.
 *
 * - Android/Chrome expose l'événement `beforeinstallprompt` : on le capture pour
 *   pouvoir déclencher l'installation en 1 clic depuis notre propre bouton.
 * - iOS/Safari n'a pas cette API : l'installation se fait à la main
 *   (Partager → « Sur l'écran d'accueil »). On se contente d'afficher les instructions.
 */

let deferredPrompt = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // empêche la mini-infobar automatique de Chrome
    deferredPrompt = e;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

/** L'app tourne-t-elle en mode installé (écran d'accueil) ? */
export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true // iOS
  );
}

/** 'ios' | 'android' | 'other' */
export function getPlatform() {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent || '';
  // iPadOS récent se fait passer pour un Mac → on le détecte via le tactile
  if (/iphone|ipad|ipod/i.test(ua) || (/Mac/.test(ua) && 'ontouchend' in document)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'other';
}

/** Le prompt natif d'installation est-il disponible (Android/Chrome) ? */
export function installAvailable() {
  return deferredPrompt !== null;
}

/**
 * S'abonne aux changements de disponibilité du prompt d'installation.
 * @returns {() => void} fonction de désabonnement
 */
export function onInstallChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Déclenche le prompt natif d'installation. @returns {Promise<{ok:boolean, outcome?:string}>} */
export async function promptInstall() {
  if (!deferredPrompt) return { ok: false, outcome: 'unavailable' };
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  notify();
  return { ok: outcome === 'accepted', outcome };
}
