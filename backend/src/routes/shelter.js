import express from 'express';
import multer from 'multer';
import { supabase } from '../lib/supabase.js';
import { selectIn } from '../lib/db.js';
import { authenticate } from '../middleware/auth.js';
import { sendNewAnimalNotificationEmail, sendAnimalAdoptedEmail, sendAdminNewAnimalEmail, sendEmailsThrottled, sendShelterFeedbackEmail } from '../lib/email.js';
import { passesHardFilters } from '../lib/matching.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024 }, // 80 MB max (vidéos)
  fileFilter: (req, file, cb) => {
    const allowedImages = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const allowedVideos = ['video/mp4', 'video/quicktime', 'video/webm', 'video/mov'];
    const allowed = [...allowedImages, ...allowedVideos];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`Type de fichier non autorisé : ${file.mimetype}`), false);
  },
});

// Wrap the upload middleware to catch multer errors
function uploadMiddleware(fields) {
  return (req, res, next) => {
    upload.fields(fields)(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  };
}

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
      allMatches = await selectIn('matches', 'animal_id, swipe_direction, contacted, timestamp', 'animal_id', animalIds);
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
      .select('id, email, name, phone, address, latitude, longitude, created_at, logo_url, description, description_photo_url, description_photos, siret')
      .eq('id', req.user.id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/profile', authenticate, uploadMiddleware([
  { name: 'logo',              maxCount: 1 },
  { name: 'description_photos', maxCount: 5 },
]), async (req, res) => {
  if (req.user.role !== 'shelter')
    return res.status(403).json({ error: 'Forbidden' });
  const { name, phone, address, description, siret } = req.body;
  try {
    const logoUrl = await uploadVideo(req.files?.logo?.[0] || null, req.user.id)
                 || req.body.existing_logo_url || null;

    const newPhotoUrls    = await uploadPhotos(req.files?.description_photos || [], req.user.id);
    const existingPhotos  = safeJson(req.body.existing_description_photos, []);
    const descriptionPhotos = [...existingPhotos, ...newPhotoUrls].slice(0, 5);
    const descPhotoUrl    = descriptionPhotos[0] || null;

    const { data, error } = await supabase
      .from('shelters')
      .update({
        name,
        phone:                   phone       || null,
        address:                 address     || null,
        description:             description || null,
        logo_url:                logoUrl,
        description_photo_url:   descPhotoUrl,
        description_photos:      descriptionPhotos,
        siret:                   siret       || null,
      })
      .eq('id', req.user.id)
      .select('id, email, name, phone, address, latitude, longitude, created_at, logo_url, description, description_photo_url, description_photos, siret')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Tous les contacts en attente ─────────────────────────

router.get('/pending-contacts', authenticate, async (req, res) => {
  if (req.user.role !== 'shelter')
    return res.status(403).json({ error: 'Forbidden' });
  try {
    const { data: animals } = await supabase
      .from('animals')
      .select('id, name, photos')
      .eq('shelter_id', req.user.id);

    const animalIds = (animals || []).map((a) => a.id);
    if (animalIds.length === 0) return res.json({ contacts: [] });

    const matches = await selectIn(
      'matches',
      'id, timestamp, contacted, adoptant_id, animal_id',
      'animal_id',
      animalIds,
      (q) => q.eq('swipe_direction', 'right').eq('contacted', false)
    );
    matches.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const adoptantIds = [...new Set(matches.map((m) => m.adoptant_id))];
    let adoptants = [];
    if (adoptantIds.length > 0) {
      adoptants = await selectIn('adoptants', 'id, email, first_name, last_name', 'id', adoptantIds);
    }

    const contacts = (matches || []).map((m) => {
      const a = adoptants.find((ad) => ad.id === m.adoptant_id) || {};
      const animal = animals.find((an) => an.id === m.animal_id) || {};
      return {
        match_id:     m.id,
        timestamp:    m.timestamp,
        email:        a.email,
        first_name:   a.first_name,
        last_name:    a.last_name,
        animal_name:  animal.name,
        animal_photo: animal.photos?.[0] || null,
      };
    });

    res.json({ contacts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Pipeline de suivi des adoptions ──────────────────────
// Regroupe les adoptants intéressés par étape (dérivé des données existantes).
router.get('/pipeline', authenticate, async (req, res) => {
  if (req.user.role !== 'shelter')
    return res.status(403).json({ error: 'Forbidden' });
  try {
    const { data: animals } = await supabase
      .from('animals')
      .select('id, name, photos, status')
      .eq('shelter_id', req.user.id);

    const animalIds = (animals || []).map((a) => a.id);
    const empty = { interested: [], discussion: [], visit: [], adopted: [] };
    if (animalIds.length === 0) return res.json(empty);

    const matches = await selectIn(
      'matches',
      'id, timestamp, contacted, status, pipeline_stage, adoptant_id, animal_id',
      'animal_id',
      animalIds,
      (q) => q.eq('swipe_direction', 'right')
    );

    const adoptantIds = [...new Set((matches || []).map((m) => m.adoptant_id))];
    let adoptants = [];
    if (adoptantIds.length > 0) {
      adoptants = await selectIn('adoptants', 'id, email, first_name, last_name', 'id', adoptantIds);
    }

    const groups = { interested: [], discussion: [], visit: [], adopted: [] };
    for (const m of matches || []) {
      const ad = adoptants.find((a) => a.id === m.adoptant_id) || {};
      const animal = animals.find((a) => a.id === m.animal_id) || {};
      const name = [ad.first_name, ad.last_name].filter(Boolean).join(' ') || ad.email || 'Adoptant';
      const card = {
        match_id:     m.id,
        animal_id:    m.animal_id,
        adoptant_name: name,
        adoptant_email: ad.email,
        animal_name:  animal.name,
        animal_photo: animal.photos?.[0] || null,
        timestamp:    m.timestamp,
      };
      // Étape : adopté > visite/visio prévue > en discussion > intéressé
      let stage;
      if (animal.status === 'adopted' || m.status === 'adopted') stage = 'adopted';
      else if (m.pipeline_stage === 'visit') stage = 'visit';
      else if (m.contacted) stage = 'discussion';
      else stage = 'interested';
      groups[stage].push(card);
    }
    for (const k of Object.keys(groups)) {
      groups[k].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Déplacer une carte du pipeline (intéressé / en discussion / visite-visio)
router.patch('/matches/:id/stage', authenticate, async (req, res) => {
  if (req.user.role !== 'shelter') return res.status(403).json({ error: 'Forbidden' });
  const { stage } = req.body;
  if (!['interested', 'discussion', 'visit'].includes(stage))
    return res.status(400).json({ error: 'Étape invalide' });
  try {
    const { data: match } = await supabase.from('matches').select('id, animal_id').eq('id', req.params.id).single();
    if (!match) return res.status(404).json({ error: 'Introuvable' });
    const { data: animal } = await supabase.from('animals').select('id').eq('id', match.animal_id).eq('shelter_id', req.user.id).single();
    if (!animal) return res.status(403).json({ error: 'Forbidden' });

    const update = stage === 'visit'      ? { contacted: true,  pipeline_stage: 'visit' }
                 : stage === 'discussion' ? { contacted: true,  pipeline_stage: null }
                 :                          { contacted: false, pipeline_stage: null };
    const { error } = await supabase.from('matches').update(update).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, stage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Rappels santé ─────────────────────────────────────────
const REMINDER_TYPES = ['vaccin', 'sterilisation', 'vermifuge', 'visite'];

// Liste simple des animaux du refuge (pour le formulaire de rappel)
router.get('/animals-simple', authenticate, async (req, res) => {
  if (req.user.role !== 'shelter') return res.status(403).json({ error: 'Forbidden' });
  try {
    const { data } = await supabase
      .from('animals').select('id, name, photos, status')
      .eq('shelter_id', req.user.id).order('created_at', { ascending: false });
    res.json({ animals: (data || []).map((a) => ({ id: a.id, name: a.name, photo: a.photos?.[0] || null })) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/reminders', authenticate, async (req, res) => {
  if (req.user.role !== 'shelter') return res.status(403).json({ error: 'Forbidden' });
  try {
    const { data: reminders } = await supabase
      .from('animal_reminders')
      .select('id, animal_id, type, label, due_date, done')
      .eq('shelter_id', req.user.id).eq('done', false)
      .order('due_date', { ascending: true });
    const animalIds = [...new Set((reminders || []).map((r) => r.animal_id))];
    let animals = [];
    if (animalIds.length) animals = await selectIn('animals', 'id, name, photos', 'id', animalIds);
    const result = (reminders || []).map((r) => {
      const a = animals.find((x) => x.id === r.animal_id) || {};
      return { ...r, animal_name: a.name, animal_photo: a.photos?.[0] || null };
    });
    res.json({ reminders: result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/reminders', authenticate, async (req, res) => {
  if (req.user.role !== 'shelter') return res.status(403).json({ error: 'Forbidden' });
  const { animal_id, type, label, due_date } = req.body;
  if (!animal_id || !type || !due_date) return res.status(400).json({ error: 'Animal, type et date requis' });
  if (!REMINDER_TYPES.includes(type)) return res.status(400).json({ error: 'Type invalide' });
  try {
    const { data: animal } = await supabase.from('animals').select('id').eq('id', animal_id).eq('shelter_id', req.user.id).single();
    if (!animal) return res.status(403).json({ error: 'Animal introuvable' });
    const { data, error } = await supabase.from('animal_reminders')
      .insert({ animal_id, shelter_id: req.user.id, type, label: label || null, due_date })
      .select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/reminders/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'shelter') return res.status(403).json({ error: 'Forbidden' });
  try {
    const { data, error } = await supabase.from('animal_reminders')
      .update({ done: req.body.done === true })
      .eq('id', req.params.id).eq('shelter_id', req.user.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/reminders/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'shelter') return res.status(403).json({ error: 'Forbidden' });
  try {
    const { error } = await supabase.from('animal_reminders').delete().eq('id', req.params.id).eq('shelter_id', req.user.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
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
      adoptants = await selectIn('adoptants', 'id, email, first_name, last_name', 'id', adoptantIds);
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

// ── Remettre un animal en actif (annuler "adopté") ───────
router.patch('/animals/:id/reactivate', authenticate, async (req, res) => {
  if (req.user.role !== 'shelter')
    return res.status(403).json({ error: 'Forbidden' });
  try {
    const { data: animal, error } = await supabase
      .from('animals')
      .update({ status: 'active' })
      .eq('id', req.params.id)
      .eq('shelter_id', req.user.id)
      .eq('status', 'adopted')
      .select()
      .single();
    if (error) throw error;
    res.json(animal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Réserver / rendre disponible un animal ───────────────
// Un animal "réservé" (adoption en cours) est retiré du matching et des annonces
// (elles filtrent status='active'), sans être marqué adopté.
router.patch('/animals/:id/reserve', authenticate, async (req, res) => {
  if (req.user.role !== 'shelter')
    return res.status(403).json({ error: 'Forbidden' });
  const reserved = req.body.reserved === true;
  try {
    const { data, error } = await supabase
      .from('animals')
      .update({ status: reserved ? 'reserved' : 'active' })
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

// ── Animals CRUD ──────────────────────────────────────────

router.post('/animals', authenticate, uploadMiddleware([{ name: 'photos', maxCount: 5 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  if (req.user.role !== 'shelter')
    return res.status(403).json({ error: 'Forbidden' });
  try {
    // Vérifier la limite de stockage (200 Mo par refuge)
    const allFiles = [...(req.files?.photos || []), ...(req.files?.video || [])];
    const newSize  = allFiles.reduce((s, f) => s + f.size, 0);
    if (newSize > 0) {
      const ok = await checkStorageLimit(req.user.id, newSize);
      if (!ok) return res.status(400).json({ error: 'Limite de stockage atteinte (200 Mo). Supprimez des animaux ou contactez-nous.' });
    }

    const photoUrls = await uploadPhotos(req.files?.photos || [], req.user.id);
    const videoUrl  = await uploadVideo(req.files?.video?.[0] || null, req.user.id);
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
        video_url: videoUrl,
        requirements: safeJson(requirements),
        is_international: is_international === 'true' || is_international === true || false,
        origin_country: origin_country || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[POST /animals] Supabase insert error:', JSON.stringify(error));
      throw error;
    }

    // Répondre d'abord au refuge, puis envoyer les notifications
    res.json(data);

    // Notifications — awaited pour éviter que Render free tier coupe le process
    try {
      const { data: shelter } = await supabase
        .from('shelters')
        .select('id, name, email, latitude, longitude')
        .eq('id', req.user.id)
        .single();

      await Promise.allSettled([
        // notifyCompatibleAdoptants désactivé — remplacé par le digest quotidien (GET /api/cron/daily-digest)
        sendAdminNewAnimalEmail({
          shelterName:   shelter?.name  || 'Refuge inconnu',
          shelterEmail:  shelter?.email || '',
          animalName:    data.name,
          animalSpecies: data.species,
          animalBreed:   data.breed,
          photoUrl:      data.photos?.[0] || null,
        }),
      ].filter(Boolean));
    } catch (notifErr) {
      console.error('[POST /animals] Notification error:', notifErr.message);
    }
  } catch (err) {
    console.error('[POST /animals] Error:', err.message, err.details || '', err.hint || '');
    res.status(500).json({ error: err.message || 'Erreur inconnue lors de la sauvegarde' });
  }
});

router.put('/animals/:id', authenticate, uploadMiddleware([{ name: 'photos', maxCount: 5 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  if (req.user.role !== 'shelter')
    return res.status(403).json({ error: 'Forbidden' });
  try {
    const newPhotoUrls   = await uploadPhotos(req.files?.photos || [], req.user.id);
    const existingPhotos = safeJson(req.body.existing_photos, []);
    const photoUrls      = [...existingPhotos, ...newPhotoUrls];
    const newVideoUrl    = await uploadVideo(req.files?.video?.[0] || null, req.user.id);
    const videoUrl       = newVideoUrl || req.body.existing_video_url || null;

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
        video_url: videoUrl,
        requirements: safeJson(requirements),
        status: status || 'active',
        is_international: is_international === 'true' || is_international === true || false,
        origin_country: origin_country || null,
      })
      .eq('id', req.params.id)
      .eq('shelter_id', req.user.id)
      .select()
      .single();

    if (error) {
      console.error('[PUT /animals] Supabase update error:', JSON.stringify(error));
      throw error;
    }
    res.json(data);
  } catch (err) {
    console.error('[PUT /animals] Error:', err.message, err.details || '', err.hint || '');
    res.status(500).json({ error: err.message || 'Erreur inconnue lors de la mise à jour' });
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
    const adoptants = await selectIn('adoptants', 'id, email, first_name', 'id', adoptantIds);

    if (!adoptants?.length) return;

    // Envoyer les notifications avec throttle (max 4/seconde)
    await sendEmailsThrottled(
      adoptants.map((a) => () =>
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

    // Filtrer ceux dont le profil est compatible ET notifications actives
    const compatible = adoptants.filter((a) => {
      try {
        if (a.questionnaire_answers?.email_notifications === false) return false;
        return passesHardFilters(animal, shelter, a.questionnaire_answers);
      } catch {
        return false;
      }
    });

    // Envoyer les emails avec throttle (max 4/seconde, max 50 adoptants)
    const targets = compatible.slice(0, 50);
    await sendEmailsThrottled(
      targets.map((a) => () =>
        sendNewAnimalNotificationEmail({
          adoptantId:       a.id,
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

const MAX_STORAGE_PER_SHELTER = 200 * 1024 * 1024; // 200 Mo par refuge

async function checkStorageLimit(shelterId, newFilesSize) {
  const { data: files } = await supabase.storage.from('animal-photos').list(shelterId, { limit: 500 });
  const currentSize = (files || []).reduce((sum, f) => sum + (f.metadata?.size || 0), 0);
  return (currentSize + newFilesSize) <= MAX_STORAGE_PER_SHELTER;
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

async function uploadVideo(file, shelterId) {
  if (!file) return null;
  const ext  = file.originalname.split('.').pop().toLowerCase();
  const path = `${shelterId}/${Date.now()}_video.${ext}`;
  const { error } = await supabase.storage
    .from('animal-photos') // même bucket, dossier shelter
    .upload(path, file.buffer, { contentType: file.mimetype });
  if (error) {
    console.error('[uploadVideo]', error.message);
    return null;
  }
  const { data } = supabase.storage.from('animal-photos').getPublicUrl(path);
  return data.publicUrl;
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

// ── Feedback refuge ──────────────────────────────────────────
router.post('/feedback', authenticate, async (req, res) => {
  try {
    const { category, message } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message requis.' });
    if (!['bug', 'suggestion', 'question'].includes(category)) return res.status(400).json({ error: 'Catégorie invalide.' });

    const { data: shelter } = await supabase
      .from('shelters')
      .select('name, email')
      .eq('id', req.user.id)
      .single();

    if (!shelter) return res.status(404).json({ error: 'Refuge introuvable.' });

    await sendShelterFeedbackEmail({
      shelterName: shelter.name,
      shelterEmail: shelter.email,
      category,
      message: message.trim(),
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[Feedback] Erreur :', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;
