import express from 'express';
import multer from 'multer';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';

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

    const stats = {
      total_animals: (animals || []).length,
      matches_this_month: allMatches.filter(
        (m) => m.swipe_direction === 'right' && new Date(m.timestamp) >= thisMonthStart
      ).length,
      pending_contacts: allMatches.filter(
        (m) => m.swipe_direction === 'right' && !m.contacted
      ).length,
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

// ── Animals CRUD ──────────────────────────────────────────

router.post('/animals', authenticate, upload.array('photos', 3), async (req, res) => {
  if (req.user.role !== 'shelter')
    return res.status(403).json({ error: 'Forbidden' });
  try {
    const photoUrls = await uploadPhotos(req.files || [], req.user.id);
    const { name, species, breed, age, size, temperament, special_needs, story, requirements } =
      req.body;

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
      })
      .select()
      .single();

    if (error) throw error;
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

    const { name, species, breed, age, size, temperament, special_needs, story, requirements, status } =
      req.body;

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
