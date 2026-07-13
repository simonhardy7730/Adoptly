// Met à jour la balise <link rel="canonical"> pour la page courante.
// Nécessaire car l'app est une SPA : sans ça, toutes les pages héritent
// du canonical statique de l'accueil (index.html) et Google ne les indexe
// pas comme des pages distinctes.

const SITE = 'https://www.adoptly.fr';

export function setCanonical(path = '/') {
  const url = path.startsWith('http') ? path : SITE + path;
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

export function resetCanonical() {
  setCanonical('/');
}
