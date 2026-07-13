import express from 'express';
import { supabase } from '../lib/supabase.js';
import { selectIn } from '../lib/db.js';

const router = express.Router();

// ── Photos des animaux actifs (pour le carrousel landing) ──
router.get('/animals/photos', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('animals')
      .select('id, name, species, photos')
      .eq('status', 'active')
      .not('photos', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    const result = (data || [])
      .filter(a => a.photos?.length > 0)
      .map(a => ({ id: a.id, name: a.name, species: a.species, photo: a.photos[0] }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Catalogue public : tous les animaux actifs ──────────
router.get('/animals', async (req, res) => {
  try {
    const { species } = req.query;
    let query = supabase
      .from('animals')
      .select('id, name, species, breed, age, size, temperament, photos, status, shelter_id, special_needs')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (species && species !== 'all') {
      if (species === 'small_animal') {
        query = query.in('species', ['rabbit', 'guinea_pig', 'other']);
      } else {
        query = query.eq('species', species);
      }
    }

    const { data: animals, error } = await query;
    if (error) throw error;

    const shelterIds = [...new Set((animals || []).map(a => a.shelter_id))];
    const shelters = shelterIds.length
      ? await selectIn('shelters', 'id, name, address', 'id', shelterIds)
      : [];

    const shelterMap = Object.fromEntries((shelters || []).map(s => [s.id, s]));

    const result = (animals || []).map(a => {
      const shelter = shelterMap[a.shelter_id] || {};
      const city = shelter.address
        ? (shelter.address.match(/\d{4,5}\s+([^,]+)$/)?.[1]?.trim()
            || shelter.address.split(',').pop()?.trim()
            || shelter.address)
        : null;
      return {
        id: a.id,
        name: a.name,
        species: a.species,
        breed: a.breed,
        age: a.age,
        size: a.size,
        temperament: a.temperament,
        photo: a.photos?.[0] || null,
        special_needs: !!a.special_needs,
        shelter_name: shelter.name || null,
        city,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Page publique d'un animal (sans authentification) ─────

router.get('/animals/:id', async (req, res) => {
  try {
    const { data: animal, error } = await supabase
      .from('animals')
      .select('id, name, species, breed, age, size, temperament, special_needs, story, photos, video_url, status, shelter_id')
      .eq('id', req.params.id)
      .single();

    if (error || !animal) return res.status(404).json({ error: 'Animal introuvable' });

    // Récupérer les infos publiques du refuge (nom + ville extraite de l'adresse)
    const { data: shelter } = await supabase
      .from('shelters')
      .select('name, address, logo_url, description, description_photo_url, description_photos')
      .eq('id', animal.shelter_id)
      .single();

    res.json({
      ...animal,
      shelter_name:                 shelter?.name                 || null,
      shelter_address:              shelter?.address              || null,
      shelter_logo_url:             shelter?.logo_url             || null,
      shelter_description:          shelter?.description          || null,
      shelter_description_photo_url:shelter?.description_photo_url|| null,
      shelter_description_photos:   shelter?.description_photos   || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Liste publique des refuges partenaires ────────────────

router.get('/shelters', async (_req, res) => {
  try {
    // Récupérer tous les refuges avec leurs animaux actifs
    const { data: shelters, error } = await supabase
      .from('shelters')
      .select('id, name, address, phone, email, logo_url, description, description_photo_url, description_photos, created_at, siret')
      .order('name', { ascending: true });

    if (error) throw error;

    if (!shelters?.length) return res.json([]);

    // Compter les animaux actifs par refuge et récupérer les espèces
    const shelterIds = shelters.map((s) => s.id);
    const animals = await selectIn('animals', 'shelter_id, species, photos', 'shelter_id', shelterIds, (q) => q.eq('status', 'active'));

    // Enrichir chaque refuge
    const enriched = shelters
      .map((shelter) => {
        const shelterAnimals = (animals || []).filter((a) => a.shelter_id === shelter.id);
        const species = [...new Set(shelterAnimals.map((a) => a.species))];
        const cover   = shelterAnimals.find((a) => a.photos?.[0])?.photos?.[0] || null;

        // Extraire la ville depuis l'adresse (dernier segment avant le code postal)
        const city = shelter.address
          ? (shelter.address.match(/\d{4,5}\s+([^,]+)$/)?.[1]?.trim()
              || shelter.address.split(',').pop()?.trim()
              || shelter.address)
          : null;

        return {
          id:            shelter.id,
          name:          shelter.name,
          address:       shelter.address,
          city,
          phone:         shelter.phone,
          email:         shelter.email,
          logo_url:      shelter.logo_url || null,
          description:   shelter.description || null,
          description_photo_url: shelter.description_photo_url || null,
          description_photos: shelter.description_photos || [],
          siret:         shelter.siret || null,
          created_at:    shelter.created_at,
          animal_count:  shelterAnimals.length,
          species,
          cover,
        };
      })
      // Montrer tous les refuges inscrits (partenaires même sans animaux actifs)
      .filter((s) => s.animal_count >= 0);

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Page publique d'un refuge ─────────────────────────────
router.get('/shelters/:id', async (req, res) => {
  try {
    const { data: shelter, error } = await supabase
      .from('shelters')
      .select('id, name, address, phone, email, logo_url, description, description_photo_url, description_photos, created_at, siret')
      .eq('id', req.params.id)
      .single();

    if (error || !shelter) return res.status(404).json({ error: 'Refuge introuvable' });

    // Récupérer les animaux actifs (juste les photos et espèces, pas les détails)
    const { data: animals } = await supabase
      .from('animals')
      .select('species, photos')
      .eq('shelter_id', shelter.id)
      .eq('status', 'active');

    const species = [...new Set((animals || []).map((a) => a.species))];
    // Collecter quelques photos pour la galerie (max 6)
    const gallery = (animals || [])
      .flatMap((a) => a.photos || [])
      .slice(0, 6);

    const city = shelter.address
      ? (shelter.address.match(/\d{4,5}\s+([^,]+)$/)?.[1]?.trim()
          || shelter.address.split(',').pop()?.trim()
          || shelter.address)
      : null;

    res.json({
      ...shelter,
      city,
      animal_count: (animals || []).length,
      species,
      gallery,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Animaux adoptés (succès d'adoption) ──────────────────
router.get('/adopted', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('animals')
      .select('id, name, species, breed, age, photos, shelters(name, logo_url)')
      .eq('status', 'adopted')
      .not('photos', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/share/animal/:id', async (req, res) => {
  try {
    const { data: animal } = await supabase
      .from('animals')
      .select('id, name, species, breed, age, story, photos, shelters(name)')
      .eq('id', req.params.id)
      .single();

    if (!animal) return res.redirect('https://www.adoptly.fr');

    const ua = req.headers['user-agent'] || '';
    const isCrawler = /facebookexternalhit|whatsapp|twitterbot|linkedinbot|slackbot|telegrambot|discordbot/i.test(ua);

    const species = { dog: 'Chien', cat: 'Chat', rabbit: 'Lapin', guinea_pig: 'Cobaye', other: 'Animal' }[animal.species] || 'Animal';
    const age = animal.age < 12 ? `${animal.age} mois` : `${Math.floor(animal.age / 12)} an(s)`;
    const title = `${animal.name} cherche une famille 🐾`;
    const desc = animal.story
      ? animal.story.slice(0, 160)
      : `${species} · ${age} · ${animal.shelters?.name || 'Refuge partenaire'} — Adoptez-le sur Adoptly !`;
    const photo = animal.photos?.[0] || 'https://www.adoptly.fr/pwa-512x512.png';
    const shareUrl = `https://www.adoptly.fr/share/animal/${animal.id}`;

    if (isCrawler) {
      return res.send(`<!DOCTYPE html><html><head>
        <meta charset="UTF-8"/>
        <title>${title}</title>
        <meta property="og:type" content="website"/>
        <meta property="og:url" content="${shareUrl}"/>
        <meta property="og:title" content="${title}"/>
        <meta property="og:description" content="${desc}"/>
        <meta property="og:image" content="${photo}"/>
        <meta property="og:image:width" content="800"/>
        <meta property="og:image:height" content="600"/>
        <meta property="og:site_name" content="Adoptly"/>
        <meta name="twitter:card" content="summary_large_image"/>
        <meta name="twitter:title" content="${title}"/>
        <meta name="twitter:description" content="${desc}"/>
        <meta name="twitter:image" content="${photo}"/>
      </head><body><p>Redirection...</p></body></html>`);
    }

    res.redirect(`https://www.adoptly.fr/animal/${animal.id}`);
  } catch {
    res.redirect('https://www.adoptly.fr');
  }
});

// ── Share article (OG meta pour crawlers) ────────────────
router.get('/share/article/:slug', async (req, res) => {
  try {
    const { data: article } = await supabase
      .from('articles')
      .select('title, slug, excerpt, cover_image')
      .eq('slug', req.params.slug)
      .eq('status', 'published')
      .single();

    if (!article) return res.redirect('https://www.adoptly.fr/actualites');

    const ua = req.headers['user-agent'] || '';
    const isCrawler = /facebookexternalhit|whatsapp|twitterbot|linkedinbot|slackbot|telegrambot|discordbot/i.test(ua);

    const title = article.title;
    const desc = article.excerpt || '';
    const image = article.cover_image || 'https://www.adoptly.fr/pwa-512x512.png';
    const shareUrl = `https://www.adoptly.fr/share/article/${article.slug}`;

    if (isCrawler) {
      return res.send(`<!DOCTYPE html><html><head>
        <meta charset="UTF-8"/>
        <title>${title}</title>
        <meta property="og:type" content="article"/>
        <meta property="og:url" content="${shareUrl}"/>
        <meta property="og:title" content="${title}"/>
        <meta property="og:description" content="${desc}"/>
        <meta property="og:image" content="${image}"/>
        <meta property="og:image:width" content="800"/>
        <meta property="og:image:height" content="600"/>
        <meta property="og:site_name" content="Adoptly"/>
        <meta name="twitter:card" content="summary_large_image"/>
        <meta name="twitter:title" content="${title}"/>
        <meta name="twitter:description" content="${desc}"/>
        <meta name="twitter:image" content="${image}"/>
      </head><body><p>Redirection...</p></body></html>`);
    }

    res.redirect(`https://www.adoptly.fr/actualites/${article.slug}`);
  } catch {
    res.redirect('https://www.adoptly.fr/actualites');
  }
});

// ── Share catalogue (OG meta pour crawlers) ─────────────
router.get('/share/animaux', async (req, res) => {
  try {
    const ua = req.headers['user-agent'] || '';
    const isCrawler = /facebookexternalhit|whatsapp|twitterbot|linkedinbot|slackbot|telegrambot|discordbot/i.test(ua);

    const { count } = await supabase
      .from('animals')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    const title = 'Animaux à adopter | Adoptly';
    const desc = `${count || 'Des'} animaux cherchent une famille dans nos refuges partenaires. Chiens, chats, NAC — trouvez votre compagnon idéal gratuitement sur Adoptly.`;
    const image = 'https://www.adoptly.fr/pwa-512x512.png';
    const shareUrl = 'https://www.adoptly.fr/share/animaux';

    if (isCrawler) {
      return res.send(`<!DOCTYPE html><html><head>
        <meta charset="UTF-8"/>
        <title>${title}</title>
        <meta property="og:type" content="website"/>
        <meta property="og:url" content="${shareUrl}"/>
        <meta property="og:title" content="${title}"/>
        <meta property="og:description" content="${desc}"/>
        <meta property="og:image" content="${image}"/>
        <meta property="og:image:width" content="512"/>
        <meta property="og:image:height" content="512"/>
        <meta property="og:site_name" content="Adoptly"/>
        <meta name="twitter:card" content="summary_large_image"/>
        <meta name="twitter:title" content="${title}"/>
        <meta name="twitter:description" content="${desc}"/>
        <meta name="twitter:image" content="${image}"/>
      </head><body><p>Redirection...</p></body></html>`);
    }

    res.redirect('https://www.adoptly.fr/animaux');
  } catch {
    res.redirect('https://www.adoptly.fr/animaux');
  }
});

// ── Pages SEO server-rendered ────────────────────────────
// a.age est en MOIS en base
function seoAgeLabel(months) {
  if (months == null) return '';
  if (months < 12) return `${months} mois`;
  const y = Math.floor(months / 12);
  return `${y} an${y > 1 ? 's' : ''}`;
}

function seoAnimalPage({ title, description, canonical, animals, shelterMap, species, heading: customHeading, label: customLabel, intro }) {
  const defaultHeading = species === 'dog' ? 'Chiens à adopter' : species === 'cat' ? 'Chats à adopter' : 'Animaux à adopter';
  const heading = customHeading || `${defaultHeading} en refuge — France, Belgique, Europe`;
  const count = animals.length;
  const speciesLabel = customLabel || (species === 'dog' ? 'chiens' : species === 'cat' ? 'chats' : 'animaux');

  const animalCards = animals.map(a => {
    const photo = a.photos?.[0] || '';
    const shelter = shelterMap[a.shelter_id] || {};
    const city = shelter.address ? (shelter.address.match(/\d{4,5}\s+([^,]+)/)?.[1]?.trim() || shelter.address.split(',').pop()?.trim() || '') : '';
    const age = seoAgeLabel(a.age);
    return `
      <a href="https://www.adoptly.fr/animal/${a.id}" style="display:block;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);text-decoration:none;color:#333;">
        ${photo ? `<img src="${photo}" alt="${a.name}" style="width:100%;height:200px;object-fit:cover;" loading="lazy"/>` : ''}
        <div style="padding:12px 16px;">
          <h3 style="margin:0 0 4px;font-size:16px;font-weight:700;color:#1B4F8A;">${a.name}</h3>
          <p style="margin:0;font-size:13px;color:#666;">${a.breed || 'Croisé'} · ${age}${city ? ` · ${city}` : ''}</p>
          ${shelter.name ? `<p style="margin:4px 0 0;font-size:12px;color:#999;">🏠 ${shelter.name}</p>` : ''}
        </div>
      </a>`;
  }).join('\n');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: `https://www.adoptly.fr${canonical}`,
    numberOfItems: count,
    provider: { '@type': 'Organization', name: 'Adoptly', url: 'https://www.adoptly.fr' },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: count,
      itemListElement: animals.slice(0, 20).map((a, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Product',
          name: a.name,
          description: `${a.name}, ${a.breed || 'croisé'}${a.age != null ? `, ${seoAgeLabel(a.age)}` : ''} — disponible à l'adoption via Adoptly`,
          image: a.photos?.[0] || '',
          url: `https://www.adoptly.fr/animal/${a.id}`,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR', availability: 'https://schema.org/InStock' },
        },
      })),
    },
  };

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
  <meta name="description" content="${description}"/>
  <link rel="canonical" href="https://www.adoptly.fr${canonical}"/>
  <meta name="robots" content="index, follow"/>
  <meta property="og:type" content="website"/>
  <meta property="og:title" content="${title}"/>
  <meta property="og:description" content="${description}"/>
  <meta property="og:url" content="https://www.adoptly.fr${canonical}"/>
  <meta property="og:image" content="https://www.adoptly.fr/pwa-512x512.png"/>
  <meta property="og:locale" content="fr_FR"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet"/>
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Inter,system-ui,sans-serif;background:#f5f7fa;color:#333}
    .nav{background:#fff;border-bottom:1px solid #e5e7eb;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50}
    .logo{display:flex;align-items:center;gap:8px;text-decoration:none}
    .logo-box{width:28px;height:28px;background:#1B4F8A;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:14px}
    .logo-text{font-weight:900;color:#1B4F8A;font-size:18px}
    .cta-btn{background:#F07A2A;color:#fff;padding:8px 20px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px}
    .container{max-width:960px;margin:0 auto;padding:24px 16px}
    .hero{text-align:center;margin-bottom:32px}
    .hero h1{font-size:28px;font-weight:800;color:#1B4F8A;margin-bottom:8px}
    .hero p{font-size:15px;color:#666;max-width:600px;margin:0 auto 16px}
    .count{display:inline-block;background:#e8f0fe;color:#1B4F8A;font-weight:700;padding:6px 16px;border-radius:20px;font-size:14px;margin-bottom:8px}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
    .intro{max-width:720px;margin:0 auto 28px;color:#555;font-size:15px;line-height:1.7}
    .intro p{margin-bottom:12px}
    .intro a{color:#1B4F8A;font-weight:600}
    .bottom-cta{text-align:center;margin:40px 0;padding:32px;background:linear-gradient(135deg,#1B4F8A,#2d6ab8);border-radius:20px;color:#fff}
    .bottom-cta h2{font-size:22px;font-weight:800;margin-bottom:8px}
    .bottom-cta p{font-size:14px;opacity:.85;margin-bottom:20px}
    .bottom-cta a{display:inline-block;background:#fff;color:#1B4F8A;font-weight:700;padding:12px 28px;border-radius:12px;text-decoration:none;font-size:15px}
    footer{text-align:center;padding:24px;font-size:12px;color:#aaa}
    footer a{color:#1B4F8A;text-decoration:none}
  </style>
</head>
<body>
  <nav class="nav">
    <a href="https://www.adoptly.fr" class="logo">
      <div class="logo-box">A</div>
      <span class="logo-text">Adoptly</span>
    </a>
    <a href="https://www.adoptly.fr/adoptant/register" class="cta-btn">Adopter →</a>
  </nav>
  <div class="container">
    <div class="hero">
      <span class="count">${count} ${speciesLabel} disponibles</span>
      <h1>${heading}</h1>
      <p>${description}</p>
    </div>
    ${intro ? `<div class="intro">${intro}</div>` : ''}
    <div class="grid">
      ${animalCards}
    </div>
    <div class="bottom-cta">
      <h2>Trouvez votre compagnon idéal</h2>
      <p>Notre algorithme analyse 14 critères de compatibilité pour vous proposer les ${speciesLabel} qui correspondent à votre mode de vie. Gratuit et sans engagement.</p>
      <a href="https://www.adoptly.fr/adoptant/register">Commencer le questionnaire →</a>
    </div>
  </div>
  <footer>
    <a href="https://www.adoptly.fr">Adoptly</a> · <a href="https://www.adoptly.fr/actualites">Actualités</a> · <a href="https://www.adoptly.fr/refuges">Nos refuges</a> · <a href="https://www.adoptly.fr/legal/cgu">CGU</a>
  </footer>
</body>
</html>`;
}

router.get('/chiens-a-adopter', async (_req, res) => {
  try {
    const { data: animals } = await supabase
      .from('animals')
      .select('id, name, breed, age, photos, shelter_id, size')
      .eq('status', 'active').eq('species', 'dog')
      .order('created_at', { ascending: false });

    const shelterIds = [...new Set((animals || []).map(a => a.shelter_id))];
    const shelters = await selectIn('shelters', 'id, name, address', 'id', shelterIds);
    const shelterMap = Object.fromEntries((shelters || []).map(s => [s.id, s]));

    res.set('Cache-Control', 'public, max-age=3600');
    res.send(seoAnimalPage({
      title: `Chiens à adopter en refuge — ${(animals || []).length} chiens disponibles | Adoptly`,
      description: `Découvrez ${(animals || []).length} chiens disponibles à l'adoption dans nos refuges partenaires en France, Belgique et Europe. Matching intelligent gratuit basé sur 14 critères de compatibilité.`,
      canonical: '/chiens-a-adopter',
      animals: animals || [],
      shelterMap,
      species: 'dog',
    }));
  } catch (err) {
    res.status(500).send('Erreur serveur');
  }
});

router.get('/chats-a-adopter', async (_req, res) => {
  try {
    const { data: animals } = await supabase
      .from('animals')
      .select('id, name, breed, age, photos, shelter_id, size')
      .eq('status', 'active').eq('species', 'cat')
      .order('created_at', { ascending: false });

    const shelterIds = [...new Set((animals || []).map(a => a.shelter_id))];
    const shelters = await selectIn('shelters', 'id, name, address', 'id', shelterIds);
    const shelterMap = Object.fromEntries((shelters || []).map(s => [s.id, s]));

    res.set('Cache-Control', 'public, max-age=3600');
    res.send(seoAnimalPage({
      title: `Chats à adopter en refuge — ${(animals || []).length} chats disponibles | Adoptly`,
      description: `Découvrez ${(animals || []).length} chats disponibles à l'adoption dans nos refuges partenaires. Trouvez le chat qui correspond à votre mode de vie grâce au matching intelligent Adoptly. 100% gratuit.`,
      canonical: '/chats-a-adopter',
      animals: animals || [],
      shelterMap,
      species: 'cat',
    }));
  } catch (err) {
    res.status(500).send('Erreur serveur');
  }
});

router.get('/animaux-a-adopter', async (_req, res) => {
  try {
    const { data: animals } = await supabase
      .from('animals')
      .select('id, name, breed, age, photos, shelter_id, species, size')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    const shelterIds = [...new Set((animals || []).map(a => a.shelter_id))];
    const shelters = await selectIn('shelters', 'id, name, address', 'id', shelterIds);
    const shelterMap = Object.fromEntries((shelters || []).map(s => [s.id, s]));

    res.set('Cache-Control', 'public, max-age=3600');
    res.send(seoAnimalPage({
      title: `Animaux à adopter en refuge — ${(animals || []).length} animaux disponibles | Adoptly`,
      description: `Découvrez ${(animals || []).length} animaux (chiens, chats, lapins...) disponibles à l'adoption dans nos refuges partenaires en France, Belgique et Europe. Matching intelligent gratuit.`,
      canonical: '/animaux-a-adopter',
      animals: animals || [],
      shelterMap,
      species: 'all',
    }));
  } catch (err) {
    res.status(500).send('Erreur serveur');
  }
});

// ── Pages SEO segmentées (chiots, tailles, seniors, origine, pays) ──
// Uniquement visibles via Google : aucun lien depuis l'app.
const SEO_SEGMENTS = [
  {
    slug: 'chiots-a-adopter',
    filter: a => a.age != null && a.age < 12,
    heading: 'Chiots à adopter en refuge',
    label: 'chiots',
    title: c => `Chiots à adopter — ${c} chiots en refuge | Adoptly`,
    desc: c => `${c} chiots de moins d'un an disponibles à l'adoption dans nos refuges partenaires. Adoption possible partout en France, Belgique et Europe. Service gratuit avec matching de compatibilité.`,
    intro: `<p>Adopter un chiot en refuge, c'est possible — et c'est souvent une meilleure idée qu'un achat en élevage ou en animalerie. Nos refuges partenaires recueillent régulièrement des portées abandonnées : des chiots de moins d'un an, identifiés, vaccinés et suivis par des vétérinaires, qui attendent une famille pour grandir.</p>
<p>Un chiot demande du temps, de la patience et de l'éducation. Notre <a href="https://www.adoptly.fr/adoptant/register">questionnaire de compatibilité</a> vérifie que votre mode de vie correspond avant la mise en relation — c'est gratuit et ça évite les adoptions ratées.</p>`,
  },
  {
    slug: 'chiens-de-roumanie-a-adopter',
    filter: a => (a.origin_country || '').toLowerCase().includes('rouman') || a.is_international,
    heading: 'Chiens de Roumanie à adopter',
    label: 'chiens',
    title: c => `Adopter un chien de Roumanie — ${c} chiens disponibles | Adoptly`,
    desc: c => `${c} chiens sauvés des rues et des fourrières de Roumanie cherchent une famille en France ou en Belgique. Transport organisé, passeport européen, vaccins à jour. Service d'adoption gratuit.`,
    intro: `<p>En Roumanie, des milliers de chiens survivent dans les rues ou dans des fourrières surpeuplées. Nos refuges partenaires les sauvent, les soignent et les préparent à l'adoption : chaque chien arrive <strong>identifié, vacciné, stérilisé et muni de son passeport européen</strong>.</p>
<p>Le transport vers la France ou la Belgique est organisé par les refuges via des transporteurs agréés — vous n'avez pas à vous déplacer en Roumanie. Répondez à notre <a href="https://www.adoptly.fr/adoptant/register">questionnaire gratuit</a> pour découvrir les chiens compatibles avec votre mode de vie, et consultez notre <a href="https://www.adoptly.fr/actualites/adopter-chien-roumanie-france-guide-complet">guide complet de l'adoption d'un chien de Roumanie</a>.</p>`,
  },
  {
    slug: 'petit-chien-a-adopter',
    filter: a => a.size === 'small',
    heading: 'Petits chiens à adopter en refuge',
    label: 'petits chiens',
    title: c => `Petit chien à adopter — ${c} petits chiens en refuge | Adoptly`,
    desc: c => `${c} petits chiens disponibles à l'adoption dans nos refuges partenaires en Europe. Idéal en appartement. Adoption via un service gratuit avec matching de compatibilité.`,
    intro: `<p>Vous cherchez un chien de petit gabarit, adapté à un appartement ou à une vie citadine ? Les refuges regorgent de petits chiens pleins de vie qui attendent leur famille — souvent plus longtemps que les autres, car on pense rarement à eux en premier.</p>
<p>Chaque profil ci-dessous est réel et à jour. Pour savoir lesquels correspondent vraiment à votre quotidien, faites notre <a href="https://www.adoptly.fr/adoptant/register">test de compatibilité gratuit</a> : logement, rythme de vie, expérience — on analyse 14 critères.</p>`,
  },
  {
    slug: 'grand-chien-a-adopter',
    filter: a => a.size === 'large',
    heading: 'Grands chiens à adopter en refuge',
    label: 'grands chiens',
    title: c => `Grand chien à adopter — ${c} grands chiens en refuge | Adoptly`,
    desc: c => `${c} chiens de grande taille disponibles à l'adoption dans nos refuges partenaires en Europe. Bergers, croisés et grands gabarits. Service d'adoption gratuit.`,
    intro: `<p>Les grands chiens sont souvent les derniers adoptés en refuge : ils impressionnent, prennent de la place... et pourtant ce sont fréquemment les plus doux. Bergers, croisés de grande taille, gardiens au grand cœur — ils attendent une famille avec un peu d'espace et beaucoup d'amour.</p>
<p>Avant d'adopter un grand gabarit, vérifiez la compatibilité avec votre logement et votre rythme de vie grâce à notre <a href="https://www.adoptly.fr/adoptant/register">questionnaire gratuit</a>.</p>`,
  },
  {
    slug: 'chien-senior-a-adopter',
    filter: a => a.age != null && a.age >= 84,
    heading: 'Chiens seniors à adopter',
    label: 'chiens seniors',
    title: c => `Chien senior à adopter — ${c} chiens de 7 ans et plus | Adoptly`,
    desc: c => `${c} chiens seniors (7 ans et plus) attendent une famille dans nos refuges partenaires. Calmes, éduqués et affectueux : l'adoption d'un senior change deux vies. Service gratuit.`,
    intro: `<p>Adopter un chien senior, c'est offrir une retraite douce à un animal qui a souvent tout connu — et recevoir en échange un compagnon calme, posé, généralement propre et éduqué. Les seniors sont les grands oubliés des refuges, alors que ce sont souvent les adoptions les plus faciles à vivre au quotidien.</p>
<p>Chaque chien ci-dessous a 7 ans ou plus et attend une famille. Découvrez ceux qui correspondent à votre mode de vie avec notre <a href="https://www.adoptly.fr/adoptant/register">test de compatibilité gratuit</a>.</p>`,
  },
  {
    slug: 'adopter-un-chien-en-belgique',
    filter: () => true,
    heading: 'Adopter un chien en Belgique',
    label: 'chiens',
    title: c => `Adopter un chien en Belgique — ${c} chiens disponibles | Adoptly`,
    desc: c => `${c} chiens disponibles à l'adoption pour les familles en Belgique. Refuges partenaires en Belgique et en Europe, transport organisé, passeport européen. Service d'adoption gratuit.`,
    intro: `<p>Vous habitez en Belgique et souhaitez adopter un chien ? Tous les chiens ci-dessous sont adoptables depuis la Belgique : certains se trouvent dans des refuges belges, d'autres chez nos refuges partenaires européens qui organisent le transport jusqu'à chez vous — chiens identifiés, vaccinés, stérilisés, avec passeport européen.</p>
<p>L'adoption suit les règles belges du bien-être animal : les refuges vérifient chaque famille avant de confier un animal. Notre <a href="https://www.adoptly.fr/adoptant/register">questionnaire gratuit</a> facilite cette étape en présentant votre profil directement au refuge. Pour les démarches détaillées, consultez notre <a href="https://www.adoptly.fr/actualites/adopter-animal-belgique-refuges-demarches">guide de l'adoption en Belgique</a>.</p>`,
  },
  {
    slug: 'adopter-un-chien-en-france',
    filter: () => true,
    heading: 'Adopter un chien en France',
    label: 'chiens',
    title: c => `Adopter un chien en France — ${c} chiens disponibles | Adoptly`,
    desc: c => `${c} chiens disponibles à l'adoption pour les familles en France. Refuges partenaires en France et en Europe, transport organisé, passeport européen. Service d'adoption gratuit.`,
    intro: `<p>Vous habitez en France et cherchez un chien à adopter ? Tous les chiens ci-dessous sont adoptables depuis la France : certains sont dans des refuges et familles d'accueil françaises, d'autres chez nos refuges partenaires européens qui organisent le transport — chiens identifiés, vaccinés, stérilisés, avec passeport européen conforme à la réglementation.</p>
<p>Chaque adoption passe par le refuge, qui valide votre famille. Pour gagner du temps, remplissez notre <a href="https://www.adoptly.fr/adoptant/register">questionnaire de compatibilité gratuit</a> : il présente votre mode de vie au refuge et vous propose les chiens qui vous correspondent.</p>`,
  },
];

for (const seg of SEO_SEGMENTS) {
  router.get('/' + seg.slug, async (_req, res) => {
    try {
      const { data: animals } = await supabase
        .from('animals')
        .select('id, name, breed, age, photos, shelter_id, size, origin_country, is_international')
        .eq('status', 'active').eq('species', 'dog')
        .order('created_at', { ascending: false });

      const filtered = (animals || []).filter(seg.filter);
      const shelterIds = [...new Set(filtered.map(a => a.shelter_id))];
      const shelters = shelterIds.length
        ? await selectIn('shelters', 'id, name, address', 'id', shelterIds)
        : [];
      const shelterMap = Object.fromEntries((shelters || []).map(s => [s.id, s]));

      res.set('Cache-Control', 'public, max-age=3600');
      res.send(seoAnimalPage({
        title: seg.title(filtered.length),
        description: seg.desc(filtered.length),
        canonical: '/' + seg.slug,
        animals: filtered,
        shelterMap,
        species: 'dog',
        heading: seg.heading,
        label: seg.label,
        intro: seg.intro,
      }));
    } catch (err) {
      res.status(500).send('Erreur serveur');
    }
  });
}

// ── Kit publications Facebook (page privée, lien non listé) ──
// Le HTML est généré par backend/make-fb-kit.js et stocké dans Supabase
// Storage, qui refuse de servir du text/html — on le proxifie ici.
router.get('/kit-facebook-7h2p', async (_req, res) => {
  try {
    const { data, error } = await supabase.storage.from('animal-photos').download('fb-kit-7h2p/index.html');
    if (error) return res.status(404).send('Kit introuvable');
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('X-Robots-Tag', 'noindex, nofollow');
    res.send(Buffer.from(await data.arrayBuffer()));
  } catch (err) {
    res.status(500).send('Erreur serveur');
  }
});

// ── Sitemap dynamique ────────────────────────────────────
router.get('/sitemap.xml', async (_req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [{ data: animals }, { data: shelters }, { data: articles }] = await Promise.all([
      supabase.from('animals').select('id, created_at, species, age, size, origin_country, is_international').eq('status', 'active'),
      supabase.from('shelters').select('id, created_at'),
      supabase.from('articles').select('slug, updated_at').eq('status', 'published'),
    ]);

    const staticPages = [
      { loc: '/',                   freq: 'weekly',  priority: '1.0' },
      { loc: '/animaux',            freq: 'daily',   priority: '0.9' },
      { loc: '/refuges',            freq: 'weekly',  priority: '0.8' },
      { loc: '/pour-les-refuges',   freq: 'monthly', priority: '0.8' },
      { loc: '/preparer-adoption',  freq: 'monthly', priority: '0.7' },
      { loc: '/actualites',         freq: 'weekly',  priority: '0.7' },
      { loc: '/adoptions',          freq: 'weekly',  priority: '0.6' },
      { loc: '/chiens-a-adopter',   freq: 'daily',   priority: '0.9' },
      { loc: '/chats-a-adopter',    freq: 'daily',   priority: '0.9' },
      { loc: '/animaux-a-adopter',  freq: 'daily',   priority: '0.9' },
      { loc: '/adoptant/register',  freq: 'monthly', priority: '0.8' },
      { loc: '/shelter/register',   freq: 'monthly', priority: '0.7' },
      { loc: '/famille-accueil/register', freq: 'monthly', priority: '0.6' },
      { loc: '/legal/cgu',          freq: 'yearly',  priority: '0.2' },
      { loc: '/legal/privacy',      freq: 'yearly',  priority: '0.2' },
    ];

    // Pages SEO segmentées — uniquement si assez d'animaux (contenu maigre = pénalité)
    const activeDogs = (animals || []).filter(a => a.species === 'dog');
    for (const seg of SEO_SEGMENTS) {
      if (activeDogs.filter(seg.filter).length >= 6) {
        staticPages.push({ loc: '/' + seg.slug, freq: 'daily', priority: '0.8' });
      }
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    for (const p of staticPages) {
      xml += `  <url><loc>https://www.adoptly.fr${p.loc}</loc><changefreq>${p.freq}</changefreq><priority>${p.priority}</priority><lastmod>${today}</lastmod></url>\n`;
    }

    for (const a of (animals || [])) {
      const mod = a.created_at?.split('T')[0] || today;
      xml += `  <url><loc>https://www.adoptly.fr/animal/${a.id}</loc><changefreq>weekly</changefreq><priority>0.7</priority><lastmod>${mod}</lastmod></url>\n`;
    }

    for (const s of (shelters || [])) {
      const mod = s.created_at?.split('T')[0] || today;
      xml += `  <url><loc>https://www.adoptly.fr/refuges/${s.id}</loc><changefreq>weekly</changefreq><priority>0.6</priority><lastmod>${mod}</lastmod></url>\n`;
    }

    for (const ar of (articles || [])) {
      const mod = ar.updated_at?.split('T')[0] || today;
      xml += `  <url><loc>https://www.adoptly.fr/actualites/${ar.slug}</loc><changefreq>monthly</changefreq><priority>0.6</priority><lastmod>${mod}</lastmod></url>\n`;
    }

    xml += `</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (err) {
    res.status(500).send(`<!-- sitemap error: ${err.message} -->`);
  }
});

export default router;
