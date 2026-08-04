// Vignettes Supabase : sert une version redimensionnée ET mise en cache CDN,
// au lieu de l'image originale (souvent lourde et renvoyée en Cache-Control:
// no-cache → re-téléchargée à chaque visite). On bascule l'URL de
// /object/public/ vers /render/image/public/ avec une largeur + qualité.
//
// Usage : thumb(url, 400) pour une vignette de liste, thumb(url, 900) pour une
// image de fiche. Sur une URL non-Supabase, renvoie l'URL telle quelle.
export function thumb(url, width = 400, quality = 65) {
  if (!url || typeof url !== 'string') return url;
  const marker = '/storage/v1/object/public/';
  if (!url.includes(marker)) return url;
  const base = url.replace(marker, '/storage/v1/render/image/public/');
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}width=${width}&quality=${quality}`;
}
