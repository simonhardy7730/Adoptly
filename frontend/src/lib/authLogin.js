import axios from 'axios';

// Connexion « intelligente » : trouve automatiquement le bon espace (adoptant,
// refuge ou famille d'accueil) à partir de l'email + mot de passe, quel que soit
// le formulaire utilisé. Objectif : qu'un refuge qui tape ses identifiants sur le
// formulaire adoptant (le bouton « Connexion » le plus visible de l'accueil)
// atterrisse quand même sur son tableau de bord, au lieu d'un « mot de passe
// incorrect » suivi d'une redirection vers l'accueil.

const baseURL = import.meta.env.VITE_API_URL
  || (import.meta.env.PROD ? 'https://adoptly-backend-p2os.onrender.com/api' : 'http://localhost:3001/api');

// Instance dédiée SANS l'intercepteur 401 global de lib/api.js (qui vide le
// localStorage et fait window.location.href = '/'). Indispensable ici : un échec
// de connexion sur un rôle renvoie 401 ; sans cette instance isolée, la
// redirection se déclencherait avant qu'on ait pu essayer les autres rôles.
const authClient = axios.create({ baseURL });

const LOGIN_ENDPOINTS = {
  adoptant: '/auth/adoptant/login',
  shelter:  '/auth/shelter/login',
  foster:   '/auth/foster/login',
};

// Essaie les rôles dans l'ordre fourni. Renvoie { token, user, role } au premier
// succès. Si tous renvoient 401 (identifiants inconnus partout), relance le
// dernier 401 (message « Email ou mot de passe incorrect »). Toute autre erreur
// (500, réseau…) est propagée immédiatement, sans tenter les rôles suivants.
export async function loginAnyRole({ email, password }, order = ['adoptant', 'shelter', 'foster']) {
  // Email insensible à la casse / aux espaces : sur mobile le clavier met souvent
  // une majuscule à la 1re lettre ou ajoute un espace, ce qui bloquait la connexion.
  const cleanEmail = (email || '').trim().toLowerCase();
  let lastAuthError = null;
  for (const role of order) {
    try {
      const { data } = await authClient.post(LOGIN_ENDPOINTS[role], { email: cleanEmail, password });
      return { ...data, role: data.role || role };
    } catch (err) {
      if (err.response?.status === 401) {
        lastAuthError = err;
        continue; // pas ce rôle-là, on tente le suivant
      }
      throw err; // 500 / réseau : on arrête net
    }
  }
  throw lastAuthError || new Error('Échec de connexion');
}

// Où envoyer l'utilisateur après une connexion réussie, selon son rôle réel.
export function loginRedirectPath(data) {
  if (data.role === 'shelter') return '/shelter/dashboard';
  if (data.role === 'foster')  return data.user?.questionnaire_answers ? '/famille-accueil/swipe' : '/famille-accueil/questionnaire';
  return data.user?.questionnaire_answers ? '/adoptant/swipe' : '/adoptant/questionnaire';
}
