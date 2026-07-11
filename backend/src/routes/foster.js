import express from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { sendFosterMatchNotificationEmail } from '../lib/email.js';
import { haversineKm, passesHardFiltersFoster, scoreAnimalFoster } from '../lib/matching.js';

const router = express.Router();

// ── Profil ────────────────────────────────────────────────────────────────────

router.get('/profile', authenticate, async (req, res) => {
  if (req.user.role !== 'foster')
    return res.status(403).json({ error: 'Forbidden' });
  try {
    const { data, error } = await supabase
      .from('fosters')
      .select('id, email, first_name, last_name, created_at, questionnaire_answers')
      .eq('id', req.user.id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/profile', authenticate, async (req, res) => {
  if (req.user.role !== 'foster')
    return res.status(403).json({ error: 'Forbidden' });
  const { first_name, last_name } = req.body;
  try {
    const { data, error } = await supabase
      .from('fosters')
      .update({ first_name: first_name || null, last_name: last_name || null })
      .eq('id', req.user.id)
      .select('id, email, first_name, last_name, created_at, questionnaire_answers')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Questionnaire ─────────────────────────────────────────────────────────────

router.post('/questionnaire', authenticate, async (req, res) => {
  if (req.user.role !== 'foster')
    return res.status(403).json({ error: 'Forbidden' });
  try {
    const { error } = await supabase
      .from('fosters')
      .update({ questionnaire_answers: req.body })
      .eq('id', req.user.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Animaux compatibles ───────────────────────────────────────────────────────

router.get('/animals', authenticate, async (req, res) => {
  if (req.user.role !== 'foster')
    return res.status(403).json({ error: 'Forbidden' });
  try {
    const { data: foster } = await supabase
      .from('fosters')
      .select('questionnaire_answers, swiped_animals')
      .eq('id', req.user.id)
      .single();

    if (!foster.questionnaire_answers)
      return res.status(400).json({ error: 'Questionnaire not completed' });

    const prefs = foster.questionnaire_answers;
    const swipedIds = (foster.swiped_animals || []).map((s) => s.animal_id);

    let query = supabase
      .from('animals')
      .select('*, shelters(id, name, phone, email, address, latitude, longitude)')
      .eq('status', 'active')
      .eq('needs_foster', true)
      .limit(500);

    if (swipedIds.length > 0) {
      query = query.not('id', 'in', `(${swipedIds.join(',')})`);
    }

    const { data: animals, error } = await query;
    if (error) throw error;

    const results = (animals || [])
      .filter((a) => passesHardFiltersFoster(a, a.shelters, prefs))
      .map((a) => ({
        ...a,
        score: scoreAnimalFoster(a, prefs),
        distance:
          prefs.latitude && a.shelters?.latitude
            ? Math.round(
                haversineKm(
                  prefs.latitude,
                  prefs.longitude,
                  a.shelters.latitude,
                  a.shelters.longitude
                )
              )
            : null,
      }))
      .sort((a, b) => b.score - a.score);

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Swipe ─────────────────────────────────────────────────────────────────────

router.post('/swipe', authenticate, async (req, res) => {
  if (req.user.role !== 'foster')
    return res.status(403).json({ error: 'Forbidden' });
  const { animal_id, direction } = req.body;
  try {
    const { data: foster } = await supabase
      .from('fosters')
      .select('swiped_animals')
      .eq('id', req.user.id)
      .single();

    const swiped = [...(foster.swiped_animals || [])];
    swiped.push({ animal_id, direction, timestamp: new Date().toISOString() });

    await supabase
      .from('fosters')
      .update({ swiped_animals: swiped })
      .eq('id', req.user.id);

    const { data: match, error } = await supabase
      .from('foster_matches')
      .insert({
        foster_id: req.user.id,
        animal_id,
        swipe_direction: direction,
        status: direction === 'right' ? 'interested' : 'closed',
      })
      .select()
      .single();

    if (error) throw error;

    if (direction === 'right') {
      const { data: animal } = await supabase
        .from('animals')
        .select('*, shelters(id, name, phone, email, address)')
        .eq('id', animal_id)
        .single();

      // Notifier le refuge par email (non-bloquant)
      if (animal?.shelters?.email) {
        const { data: fosterInfo } = await supabase
          .from('fosters')
          .select('email, first_name, last_name')
          .eq('id', req.user.id)
          .single();

        sendFosterMatchNotificationEmail({
          shelterEmail:    animal.shelters.email,
          shelterName:     animal.shelters.name,
          animalName:      animal.name,
          fosterEmail:     fosterInfo?.email || req.user.email,
          fosterFirstName: fosterInfo?.first_name,
          fosterLastName:  fosterInfo?.last_name,
        }).catch(() => {});
      }

      return res.json({ match, animal, isMatch: true });
    }

    res.json({ match, isMatch: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Demandes d'accueil ────────────────────────────────────────────────────────

router.get('/matches', authenticate, async (req, res) => {
  if (req.user.role !== 'foster')
    return res.status(403).json({ error: 'Forbidden' });
  try {
    const { data, error } = await supabase
      .from('foster_matches')
      .select('*, animals(*, shelters(id, name, phone, email, address))')
      .eq('foster_id', req.user.id)
      .eq('swipe_direction', 'right')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/matches/:id/contacted', authenticate, async (req, res) => {
  if (req.user.role !== 'foster')
    return res.status(403).json({ error: 'Forbidden' });
  try {
    const { data, error } = await supabase
      .from('foster_matches')
      .update({ contacted: true })
      .eq('id', req.params.id)
      .eq('foster_id', req.user.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
