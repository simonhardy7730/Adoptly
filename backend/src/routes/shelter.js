import express from 'express';
import multer from 'multer';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { sendNewAnimalNotificationEmail, sendAnimalAdoptedEmail } from '../lib/email.js';
import { passesHardFilters } from '../lib/matching.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ── Dashboard ─────────────────────────────────────────────

router.get('/dashboard', authenticate, async (req, res) => {
  if (req.user.role !== 'shelter')
    return res.status(403).json({ error: 'Forbidden' });
  try {
    const [{ data: shelter }, { data: animals }] = await Promise.all([
      supabase
        .from('shelters')
        .select('id, name, email, phone, address')
        .eq('id', req.user.id)
        .single(),
      supabase
        .from('animals')
        .select('*')
        .eq('shelter_id', req.user.id)
        .order('created_at', { ascending: false }),
    ]);

    const animalIds = (animals || []).map((a) => a.id);
    let allMatches = [];
    if (animalIds.length > 0) {
      const { data } = await supabase
        .from('matches')
        .select('animal_id, swipe_direction, contacted, timestamp')
        .in('animal_id', animalIds);
      allMatches = data || [];
    }

    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    // Stats hebdomadaires — 8 dernières semaines
    const weeklyStats = [];
    for (let i = 7; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - (i + 1) * 7);
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setDate(end.getDate() - i * 7);
      end.setHours(23, 59, 59, 999);

      const count = (allMatches || []).filter(
        (m) => m.swipe_direction === 'right' &&
               new Date(m.timestamp) >= start &&
               new Date(m.timestamp) <= end
      ).length;

      // Label court : "01/04" style
      const label = end.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      weeklyStats.push({ label, count });
    }

    const stats = {
      total_animals: (animals || []).length,
      matches_this_month: allMatches.filter(
        (m) => m.swipe_direction === 'right' && new Date(m.timestamp) >= thisMonthStart
      ).length,
      pending_contacts: allMatches.filter(
        (m) => m.swipe_direction === 'right' && !m.contacted
      ).length,
      weekly: weeklyStats,
    };

    const enriched = (animals || []).map((a) => ({
      ...a,
      match_count: allMatches.filter(
        (m) => m.animal_id === a.id && m.swipe_direction === 'right'
      ).length,
      contact_count: allMatches.filter((m) => m.animal_id === a.id && m.contacted)
        .length,
    }));

    res.json({ shelter, animals: enriched, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Profil refuge ─────────────────────────────────────────

router.get('/profile', authenticate, async (req, res) => {
  if (req.user.role !== 'shelter')
    return res.status(403).json({ error: 'Forbidden' });
  try {
    const { data, error } = await supabase
      .from('shelters')
      .select('id, email, name, phone, address, latitude, longitude, created_at')
      .eq('id', req.user.id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/profile', authenticate, async (req, res) => {
  if (req.user.role !== 'shelter')
    return res.status(403).json({ error: 'Forbidden' });
  const { name, phone, address } = req.body;
  if (!name) return res.status(400).json({ error: 'Le nom est requis' });
  try {
    const { data, error } = await supabase
      .from('shelters')
      .update({ name, phone: phone || null, address: address || null })
      .eq('id', req.user.id)
      .select('id, email, name, phone, address, latitude, longitude, created_at')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Adoptants intéressés par un animal ───────────────────

router.get('/animals/:id/interested', authenticate, async (req, res) => {
  if (req.user.role !== 'shelter')
    return res.status(403).json({ error: 'Forbidden' });
  try {
    // Vérifier que l'animal appartient bien à ce refuge
    const { data: animal } = await supabase
      .from('animals')
      .select('id, name')
      .eq('id', req.params.id)
      .eq('shelter_id', req.user.id)
      .single();

    if (!animal) return res.status(404).json({ error: 'Animal introuvable' });

    const { data: matches, error } = await supabase
      .from('matches')
      .select('id, timestamp, contacted, adoptant_id')
      .eq('animal_id', req.params.id)
      .eq('swipe_direction', 'right')
      .order('timestamp', { ascending: false });

    if (error) throw error;

    // Récupérer les infos des adoptants
    const adoptantIds = (matches || []).map((m) => m.adoptant_id);
    let adoptants = [];
    if (adoptantIds.length > 0) {
      const { data } = await supabase
        .from('adoptants')
        .select('id, email, first_name, last_name')
        .in('id', adoptantIds);
      adoptants = data || [];
    }

    const result = (matches || []).map((m) => {
      const a = adoptants.find((ad) => ad.id === m.adoptant_id) || {};
      return {
        match_id:   m.id,
        timestamp:  m.timestamp,
        contacted:  m.contacted,
        email:      a.email,
        first_name: a.first_name,
        last_name:  a.last_name,
      };
    });

    res.json({ animal, interested: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Marquer un animal comme adopté ───────────────────────

router.patch('/animals/:id/adopted', authenticate, async (req, res) => {
  if (req.user.role !== 'shelter')
    return res.status(403).json({ error: 'Forbidden' });
  try {
    // 1. Marquer l'animal comme adopté
    const { data: animal, error } = await supabase
      .from('animals')
      .update({ status: 'adopted' })
      .eq('id', req.params.id)
      .eq('shelter_id', req.user.id)
      .select()
      .single();
    if (error) throw error;

    // 2. Fermer tous les matchs ouverts + notifier les adoptants (non-bloquant)
    notifyAdoptedAnimal(animal, req.user.id).catch(() => {});

    res.json(animal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Animals CRUD ──────────────────────────────────────────

router.post('/animals', authenticate, upload.array('photos', 3), async (req, res) => {
  if (req.user.role !== 'shelter')
    return res.status(403).json({ error: 'Forbidden' });
  try {
    const photoUrls = await uploadPhotos(req.files || [], req.user.id);
    const { name, species, breed, age, size, temperament, special_needs, story, requirements,
            is_international, origin_country } = req.body;

    const { data, error } = await supabase
      .from('animals')
      .insert({
        shelter_id: req.user.id,
        name,
        species,
        breed: breed || null,
        age: age ? parseInt(age) : null,
        size: size || null,
        temperament,
        special_needs: special_needs || null,
        story: story || null,
        photos: photoUrls,
        requirements: safeJson(requirements),
        is_international: is_international === 'true' || is_international === true || false,
        origin_country: origin_country || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Notifier les adoptants compatibles en arrière-plan (non-bloquant)
    supabase
      .from('shelters')
      .select('id, name, latitude, longitude')
      .eq('id', req.user.id)
      .single()
      .then(({ data: shelter }) => {
        notifyCompatibleAdoptants(data, shelter).catch(() => {});
      })
      .catch(() => {});

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/animals/:id', authenticate, upload.array('photos', 3), async (req, res) => {
  if (req.user.role !== 'shelter')
    return res.status(403).json({ error: 'Forbidden' });
  try {
    const newPhotoUrls = await uploadPhotos(req.files || [], req.user.id);
    const existingPhotos = safeJson(req.body.existing_photos, []);
    const photoUrls = [...existingPhotos, ...newPhotoUrls];

    const { name, species, breed, age, size, temperament, special_needs, story, requirements, status,
            is_international, origin_country } = req.body;

    const { data, error } = await supabase
      .from('animals')
      .update({
        name,
        species,
        breed: breed || null,
        age: age ? parseInt(age) : null,
        size: size || null,
        temperament,
        special_needs: special_needs || null,
        story: story || null,
        photos: photoUrls,
        requirements: safeJson(requirements),
        status: status || 'active',
        is_international: is_international === 'true' || is_international === true || false,
        origin_country: origin_country || null,
      })
      .eq('id', req.params.id)
      .eq('shelter_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/animals/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'shelter')
    return res.status(403).json({ error: 'Forbidden' });
  try {
    const { error } = await supabase
      .from('animals')
      .delete()
      .eq('id', req.params.id)
      .eq('shelter_id', req.user.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Helpers ───────────────────────────────────────────────

/**
 * Ferme tous les matchs ouverts d'un animal adopté et notifie les adoptants concernés.
 */
async function notifyAdoptedAnimal(animal, shelterId) {
  try {
    // Récupérer le refuge pour le nom
    const { data: shelter } = await supabase
      .from('shelters')
      .select('name')
      .eq('id', shelterId)
      .single();

    // Récupérer tous les matchs "right" encore ouverts (non-closed, non-adopted)
    const { data: matches } = await supabase
      .from('matches')
      .select('id, adoptant_id')
      .eq('animal_id', animal.id)
      .eq('swipe_direction', 'right')
      .neq('status', 'adopted');

    if (!matches?.length) return;

    // Passer tous ces matchs au statut 'adopted'
    await supabase
      .from('matches')
      .update({ status: 'adopted' })
      .eq('animal_id', animal.id)
      .eq('swipe_direction', 'right');

    // Récupérer les emails/prénoms des adoptants concernés
    const adoptantIds = matches.map((m) => m.adoptant_id);
    const { data: adoptants } = await supabase
      .from('adoptants')
      .select('id, email, first_name')
      .in('id', adoptantIds);

    if (!adoptants?.length) return;

    // Envoyer les notifications en parallèle
    await Promise.allSettled(
      adoptants.map((a) =>
        sendAnimalAdoptedEmail({
          adoptantEmail:    a.email,
          adoptantFirstName: a.first_name,
          animalName:       animal.name,
          animalSpecies:    animal.species,
          shelterName:      shelter?.name || 'Un refuge partenaire',
        })
      )
    );

    console.log(`[Adopté] ${adoptants.length} adoptant(s) notifié(s) — ${animal.name} a trouvé sa famille`);
  } catch (err) {
    console.error('[Adopté] Erreur notification adoption :', err.message);
  }
}

/**
 * Notifie les adoptants compatibles qu'un nouvel animal vient d'être ajouté.
 * S'exécute en arrière-plan (non-bloquant) — les erreurs sont silencieuses.
 */
async function notifyCompatibleAdoptants(animal, shelter) {
  try {
    // Récupérer tous les adoptants ayant rempli le questionnaire
    const { data: adoptants } = await supabase
      .from('adoptants')
      .select('id, email, first_name, questionnaire_answers')
      .not('questionnaire_answers', 'is', null);

    if (!adoptants?.length) return;

    const photoUrl = animal.photos?.[0] || null;

    // Filtrer ceux dont le profil est compatible
    const compatible = adoptants.filter((a) => {
      try {
        return passesHardFilters(animal, shelter, a.questionnaire_answers);
      } catch {
        return false;
      }
    });

    // Envoyer les emails en parallèle (max 50 pour rester dans la limite Resend)
    const targets = compatible.slice(0, 50);
    await Promise.allSettled(
      targets.map((a) =>
        sendNewAnimalNotificationEmail({
          adoptantEmail:    a.email,
          adoptantFirstName: a.first_name,
          animalName:       animal.name,
          animalSpecies:    animal.species,
          animalBreed:      animal.breed,
          shelterName:      shelter?.name || 'Un refuge partenaire',
          photoUrl,
        })
      )
    );

    console.log(`[Notif] ${targets.length} adoptant(s) notifié(s) pour ${animal.name}`);
  } catch (err) {
    console.error('[Notif] Erreur notification nouvel animal :', err.message);
  }
}

async function uploadPhotos(files, shelterId) {
  const urls = [];
  for (const file of files) {
    const path = `${shelterId}/${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`;
    const { error } = await supabase.storage
      .from('animal-photos')
      .upload(path, file.buffer, { contentType: file.mimetype });
    if (!error) {
      const { data } = supabase.storage.from('animal-photos').getPublicUrl(path);
      urls.push(data.publicUrl);
    }
  }
  return urls;
}

function safeJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export default router;
