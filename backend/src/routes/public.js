import express from 'express';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

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
      .select('id, name, address, phone, email, logo_url, description, description_photo_url, created_at')
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
      .select('id, name, address, phone, email, logo_url, description, description_photo_url, created_at')
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

export default router;
