/**
 * Netlify Edge Function — OG tags dynamiques pour /animal/:id
 *
 * Les crawlers sociaux (Facebook, WhatsApp, Twitter, Discord...)
 * ne font pas tourner JavaScript. Cette fonction intercepte leurs
 * requêtes et renvoie un HTML minimal avec les bonnes balises OG,
 * afin que le lien partagé affiche une belle preview avec la photo.
 *
 * Les vrais utilisateurs passent normalement vers l'app React.
 */

const SUPABASE_URL  = 'https://lybvajageblpdauprnus.supabase.co';
const SUPABASE_KEY  = 'sb_publishable_uHtfWY5iYuNREMac_YKocQ_gq-s3Wt-';
const SITE_URL      = 'https://adoptly.fr';

const SPECIES_EMOJI = { Chien: '🐕', Chat: '🐈', Lapin: '🐇', Oiseau: '🐦', Rongeur: '🐹' };

// Crawlers sociaux connus
const BOT_PATTERNS = [
  'facebookexternalhit', 'facebot',
  'twitterbot', 'x-bot',
  'whatsapp',
  'linkedinbot',
  'telegrambot',
  'slackbot', 'slack-imgproxy',
  'discordbot',
  'googlebot',       // Google Preview
  'bingbot',
  'applebot',
  'embedly',
  'pinterest',
  'vkshare',
];

function isCrawler(userAgent = '') {
  const ua = userAgent.toLowerCase();
  return BOT_PATTERNS.some((bot) => ua.includes(bot));
}

async function fetchAnimal(id) {
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  };

  // Récupérer l'animal
  const animalRes = await fetch(
    `${SUPABASE_URL}/rest/v1/animals?id=eq.${id}&select=id,name,species,breed,age,photos,status,shelter_id&limit=1`,
    { headers }
  );
  const animals = await animalRes.json();
  const animal = animals?.[0];
  if (!animal) return null;

  // Récupérer le refuge
  const shelterRes = await fetch(
    `${SUPABASE_URL}/rest/v1/shelters?id=eq.${animal.shelter_id}&select=name,address&limit=1`,
    { headers }
  );
  const shelters = await shelterRes.json();
  const shelter = shelters?.[0];

  return { ...animal, shelter_name: shelter?.name || null, shelter_address: shelter?.address || null };
}

function buildOgHtml(animal, id) {
  const emoji    = SPECIES_EMOJI[animal.species] || '🐾';
  const photo    = animal.photos?.[0] || null;
  const city     = animal.shelter_address?.split(',').pop()?.trim() || null;
  const adopted  = animal.status === 'adopted';

  const title = adopted
    ? `${emoji} ${animal.name} a trouvé sa famille | Adoptly`
    : `${emoji} ${animal.name} cherche une famille ! | Adoptly`;

  const descParts = [animal.species];
  if (animal.breed)         descParts.push(animal.breed);
  if (animal.age != null)   descParts.push(`${animal.age} an${animal.age > 1 ? 's' : ''}`);
  if (animal.shelter_name)  descParts.push(`• ${animal.shelter_name}`);
  if (city)                 descParts.push(`(${city})`);
  if (!adopted)             descParts.push('— Adoptez-le gratuitement sur Adoptly !');

  const description = descParts.join(' ');
  const url         = `${SITE_URL}/animal/${id}`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>${escHtml(title)}</title>

  <!-- Open Graph -->
  <meta property="og:type"         content="website" />
  <meta property="og:url"          content="${escHtml(url)}" />
  <meta property="og:site_name"    content="Adoptly" />
  <meta property="og:title"        content="${escHtml(title)}" />
  <meta property="og:description"  content="${escHtml(description)}" />
  ${photo ? `<meta property="og:image"        content="${escHtml(photo)}" />
  <meta property="og:image:width"  content="1200" />
  <meta property="og:image:height" content="630" />` : ''}
  <meta property="og:locale"       content="fr_BE" />

  <!-- Twitter / X -->
  <meta name="twitter:card"        content="${photo ? 'summary_large_image' : 'summary'}" />
  <meta name="twitter:title"       content="${escHtml(title)}" />
  <meta name="twitter:description" content="${escHtml(description)}" />
  ${photo ? `<meta name="twitter:image" content="${escHtml(photo)}" />` : ''}

  <!-- Redirect humans instantly to the React app -->
  <script>window.location.replace("${escHtml(url)}")</script>
</head>
<body>
  <p>Chargement de la fiche de ${escHtml(animal.name)}...</p>
  <a href="${escHtml(url)}">Voir ${escHtml(animal.name)} sur Adoptly</a>
</body>
</html>`;
}

function escHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default async (request, context) => {
  const ua = request.headers.get('user-agent') || '';

  // Laisser passer les vraies personnes → app React
  if (!isCrawler(ua)) return context.next();

  // Extraire l'ID de l'URL /animal/:id
  const url = new URL(request.url);
  const id  = url.pathname.split('/').filter(Boolean).pop();

  if (!id) return context.next();

  try {
    const animal = await fetchAnimal(id);
    if (!animal) return context.next();

    const html = buildOgHtml(animal, id);
    return new Response(html, {
      headers: { 'content-type': 'text/html;charset=UTF-8', 'cache-control': 'public,max-age=60' },
    });
  } catch {
    return context.next(); // En cas d'erreur, l'app React prend le relais
  }
};

export const config = { path: '/animal/*' };
