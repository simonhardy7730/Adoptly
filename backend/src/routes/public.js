import express from 'express';
import { supabase } from '../lib/supabase.js';

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
    const { data: shelters } = shelterIds.length
      ? await supabase.from('shelters').select('id, name, address').in('id', shelterIds)
      : { data: [] };

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
      .select('name, address, logo_url, description, description_photo_url')
      .eq('id', animal.shelter_id)
      .single();

    res.json({
      ...animal,
      shelter_name:                 shelter?.name                 || null,
      shelter_address:              shelter?.address              || null,
      shelter_logo_url:             shelter?.logo_url             || null,
      shelter_description:          shelter?.description          || null,
      shelter_description_photo_url:shelter?.description_photo_url|| null,
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
      .select('id, name, address, phone, email, logo_url, description, description_photo_url, created_at, siret')
      .order('name', { ascending: true });

    if (error) throw error;

    if (!shelters?.length) return res.json([]);

    // Compter les animaux actifs par refuge et récupérer les espèces
    const shelterIds = shelters.map((s) => s.id);
    const { data: animals } = await supabase
      .from('animals')
      .select('shelter_id, species, photos')
      .eq('status', 'active')
      .in('shelter_id', shelterIds);

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
      .select('id, name, address, phone, email, logo_url, description, description_photo_url, created_at, siret')
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
      .order('updated_at', { ascending: false })
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

    if (!animal) return res.redirect('https://adoptly.fr');

    const ua = req.headers['user-agent'] || '';
    const isCrawler = /facebookexternalhit|whatsapp|twitterbot|linkedinbot|slackbot|telegrambot|discordbot/i.test(ua);

    const species = { dog: 'Chien', cat: 'Chat', rabbit: 'Lapin', guinea_pig: 'Cobaye', other: 'Animal' }[animal.species] || 'Animal';
    const age = animal.age < 12 ? `${animal.age} mois` : `${Math.floor(animal.age / 12)} an(s)`;
    const title = `${animal.name} cherche une famille 🐾`;
    const desc = animal.story
      ? animal.story.slice(0, 160)
      : `${species} · ${age} · ${animal.shelters?.name || 'Refuge partenaire'} — Adoptez-le sur Adoptly !`;
    const photo = animal.photos?.[0] || 'https://adoptly.fr/pwa-512x512.png';
    const shareUrl = `https://adoptly.fr/share/animal/${animal.id}`;

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

    res.redirect(`https://adoptly.fr/animal/${animal.id}`);
  } catch {
    res.redirect('https://adoptly.fr');
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

    if (!article) return res.redirect('https://adoptly.fr/actualites');

    const ua = req.headers['user-agent'] || '';
    const isCrawler = /facebookexternalhit|whatsapp|twitterbot|linkedinbot|slackbot|telegrambot|discordbot/i.test(ua);

    const title = article.title;
    const desc = article.excerpt || '';
    const image = article.cover_image || 'https://adoptly.fr/pwa-512x512.png';
    const shareUrl = `https://adoptly.fr/share/article/${article.slug}`;

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

    res.redirect(`https://adoptly.fr/actualites/${article.slug}`);
  } catch {
    res.redirect('https://adoptly.fr/actualites');
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
    const image = 'https://adoptly.fr/pwa-512x512.png';
    const shareUrl = 'https://adoptly.fr/share/animaux';

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

    res.redirect('https://adoptly.fr/animaux');
  } catch {
    res.redirect('https://adoptly.fr/animaux');
  }
});

// ── Sitemap dynamique ────────────────────────────────────
router.get('/sitemap.xml', async (_req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [{ data: animals }, { data: shelters }, { data: articles }] = await Promise.all([
      supabase.from('animals').select('id, created_at').eq('status', 'active'),
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
      { loc: '/adoptant/register',  freq: 'monthly', priority: '0.8' },
      { loc: '/shelter/register',   freq: 'monthly', priority: '0.7' },
      { loc: '/famille-accueil/register', freq: 'monthly', priority: '0.6' },
      { loc: '/legal/cgu',          freq: 'yearly',  priority: '0.2' },
      { loc: '/legal/privacy',      freq: 'yearly',  priority: '0.2' },
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    for (const p of staticPages) {
      xml += `  <url><loc>https://adoptly.fr${p.loc}</loc><changefreq>${p.freq}</changefreq><priority>${p.priority}</priority><lastmod>${today}</lastmod></url>\n`;
    }

    for (const a of (animals || [])) {
      const mod = a.created_at?.split('T')[0] || today;
      xml += `  <url><loc>https://adoptly.fr/animal/${a.id}</loc><changefreq>weekly</changefreq><priority>0.7</priority><lastmod>${mod}</lastmod></url>\n`;
    }

    for (const s of (shelters || [])) {
      const mod = s.created_at?.split('T')[0] || today;
      xml += `  <url><loc>https://adoptly.fr/refuges/${s.id}</loc><changefreq>weekly</changefreq><priority>0.6</priority><lastmod>${mod}</lastmod></url>\n`;
    }

    for (const ar of (articles || [])) {
      const mod = ar.updated_at?.split('T')[0] || today;
      xml += `  <url><loc>https://adoptly.fr/actualites/${ar.slug}</loc><changefreq>monthly</changefreq><priority>0.6</priority><lastmod>${mod}</lastmod></url>\n`;
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
