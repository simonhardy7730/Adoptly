import express from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { haversineKm, passesHardFilters, scoreAnimal, hardFilterReason } from '../lib/matching.js';

const router = express.Router();

// ── Routes ────────────────────────────────────────────────

router.get('/profile', authenticate, async (req, res) => {
  if (req.user.role !== 'adoptant')
    return res.status(403).json({ error: 'Forbidden' });
  try {
    const { data, error } = await supabase
      .from('adoptants')
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
  if (req.user.role !== 'adoptant')
    return res.status(403).json({ error: 'Forbidden' });
  const { first_name, last_name } = req.body;
  try {
    const { data, error } = await supabase
      .from('adoptants')
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

router.post('/questionnaire', authenticate, async (req, res) => {
  if (req.user.role !== 'adoptant')
    return res.status(403).json({ error: 'Forbidden' });
  try {
    const { error } = await supabase
      .from('adoptants')
      .update({ questionnaire_answers: req.body })
      .eq('id', req.user.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/animals', authenticate, async (req, res) => {
  if (req.user.role !== 'adoptant')
    return res.status(403).json({ error: 'Forbidden' });
  try {
    const { data: adoptant } = await supabase
      .from('adoptants')
      .select('questionnaire_answers, swiped_animals')
      .eq('id', req.user.id)
      .single();

    if (!adoptant.questionnaire_answers)
      return res.status(400).json({ error: 'Questionnaire not completed' });

    const prefs = adoptant.questionnaire_answers;
    const swipedIds = (adoptant.swiped_animals || []).map((s) => s.animal_id);

    let query = supabase
      .from('animals')
      .select('*, shelters(id, name, phone, email, address, latitude, longitude)')
      .eq('status', 'active')
      .limit(500);

    if (swipedIds.length > 0) {
      query = query.not('id', 'in', `(${swipedIds.join(',')})`);
    }

    const { data: animals, error } = await query;
    if (error) throw error;

    const results = (animals || [])
      .filter((a) => passesHardFilters(a, a.shelters, prefs))
      .map((a) => ({
        ...a,
        score: scoreAnimal(a, prefs),
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

router.post('/swipe', authenticate, async (req, res) => {
  if (req.user.role !== 'adoptant')
    return res.status(403).json({ error: 'Forbidden' });
  const { animal_id, direction } = req.body;
  try {
    const { data: adoptant } = await supabase
      .from('adoptants')
      .select('swiped_animals')
      .eq('id', req.user.id)
      .single();

    const swiped = [...(adoptant.swiped_animals || [])];
    swiped.push({ animal_id, direction, timestamp: new Date().toISOString() });

    await supabase
      .from('adoptants')
      .update({ swiped_animals: swiped })
      .eq('id', req.user.id);

    const { data: match, error } = await supabase
      .from('matches')
      .insert({
        adoptant_id: req.user.id,
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

      // Les emails ne sont plus envoyés ici, à chaque swipe (spam + quota) :
      // le match reste `adoptant_notified=false` / `shelter_notified=false`,
      // et le cron /api/cron/match-digests envoie UN récap groupé par session.

      return res.json({ match, animal, isMatch: true });
    }

    res.json({ match, isMatch: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Compatibilité d'un connecté avec UN animal précis (depuis sa fiche) ──
// Réutilise son questionnaire déjà rempli : aucune question à reposer.
router.get('/animals/:id/compatibility', authenticate, async (req, res) => {
  if (req.user.role !== 'adoptant')
    return res.status(403).json({ error: 'Forbidden' });
  try {
    const { data: adoptant } = await supabase
      .from('adoptants')
      .select('questionnaire_answers, swiped_animals')
      .eq('id', req.user.id)
      .single();

    if (!adoptant?.questionnaire_answers)
      return res.json({ hasProfile: false });

    const { data: animal, error } = await supabase
      .from('animals')
      .select('*, shelters(id, latitude, longitude)')
      .eq('id', req.params.id)
      .single();
    if (error || !animal) return res.status(404).json({ error: 'Animal introuvable' });

    const prefs = adoptant.questionnaire_answers;
    const compatible = passesHardFilters(animal, animal.shelters, prefs);
    const alreadyInterested = (adoptant.swiped_animals || [])
      .some((s) => s.animal_id === req.params.id && s.direction === 'right');

    res.json({
      hasProfile: true,
      compatible,
      score: scoreAnimal(animal, prefs),
      reason: compatible ? null : hardFilterReason(animal, animal.shelters, prefs),
      alreadyInterested,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── "Cet animal m'intéresse" depuis la fiche ────────────────────────────
// Enregistre l'intérêt (comme un swipe droit) SANS ouvrir le chat. Idempotent.
router.post('/animals/:id/interest', authenticate, async (req, res) => {
  if (req.user.role !== 'adoptant')
    return res.status(403).json({ error: 'Forbidden' });
  const animal_id = req.params.id;
  try {
    const { data: adoptant } = await supabase
      .from('adoptants')
      .select('questionnaire_answers, swiped_animals')
      .eq('id', req.user.id)
      .single();

    // Garde de compatibilité : on ne crée un match QUE si l'animal correspond
    // (pas de match "forcé" sur un animal incompatible). Le bouton n'apparaît
    // déjà pas côté front, ceci est la sécurité côté serveur.
    const prefs = adoptant?.questionnaire_answers;
    if (!prefs) return res.status(400).json({ error: 'no_profile' });

    const { data: animal, error: animalErr } = await supabase
      .from('animals')
      .select('*, shelters(id, latitude, longitude)')
      .eq('id', animal_id)
      .single();
    if (animalErr || !animal) return res.status(404).json({ error: 'Animal introuvable' });

    if (!passesHardFilters(animal, animal.shelters, prefs))
      return res.status(400).json({ error: 'incompatible' });

    const swiped = [...(adoptant?.swiped_animals || [])];

    // Déjà un match "intéressé" pour cet animal ? → ne rien dupliquer.
    const { data: existing } = await supabase
      .from('matches')
      .select('id')
      .eq('adoptant_id', req.user.id)
      .eq('animal_id', animal_id)
      .eq('swipe_direction', 'right')
      .limit(1);

    if (existing && existing.length) {
      if (!swiped.some((s) => s.animal_id === animal_id)) {
        swiped.push({ animal_id, direction: 'right', timestamp: new Date().toISOString() });
        await supabase.from('adoptants').update({ swiped_animals: swiped }).eq('id', req.user.id);
      }
      return res.json({ alreadyInterested: true, created: false });
    }

    swiped.push({ animal_id, direction: 'right', timestamp: new Date().toISOString() });
    await supabase.from('adoptants').update({ swiped_animals: swiped }).eq('id', req.user.id);

    const { error } = await supabase.from('matches').insert({
      adoptant_id: req.user.id,
      animal_id,
      swipe_direction: 'right',
      status: 'interested',
    });
    if (error) throw error;

    // Pas d'email ici : le cron /api/cron/match-digests enverra un récap groupé.
    res.json({ alreadyInterested: false, created: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/matches', authenticate, async (req, res) => {
  if (req.user.role !== 'adoptant')
    return res.status(403).json({ error: 'Forbidden' });
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('*, animals(*, shelters(id, name, phone, email, address))')
      .eq('adoptant_id', req.user.id)
      .eq('swipe_direction', 'right')
      .order('timestamp', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Reset swipe history — revoir tous les animaux ────────
router.post('/reset-swipes', authenticate, async (req, res) => {
  if (req.user.role !== 'adoptant')
    return res.status(403).json({ error: 'Forbidden' });
  try {
    // Vider la liste swiped_animals (garder les matchs 'right' intacts)
    const { error } = await supabase
      .from('adoptants')
      .update({ swiped_animals: [] })
      .eq('id', req.user.id);
    if (error) throw error;

    // Supprimer uniquement les swipes 'left' (non intéressé) pour qu'ils réapparaissent
    await supabase
      .from('matches')
      .delete()
      .eq('adoptant_id', req.user.id)
      .eq('swipe_direction', 'left');

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/matches/:id/contacted', authenticate, async (req, res) => {
  if (req.user.role !== 'adoptant')
    return res.status(403).json({ error: 'Forbidden' });
  try {
    const { data, error } = await supabase
      .from('matches')
      .update({ contacted: true, status: 'contacted' })
      .eq('id', req.params.id)
      .eq('adoptant_id', req.user.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Suppression définitive de son propre compte (droit à l'effacement — RGPD)
router.delete('/account', authenticate, async (req, res) => {
  if (req.user.role !== 'adoptant')
    return res.status(403).json({ error: 'Forbidden' });
  try {
    const uid = req.user.id;
    // 1) messages liés à ses matchs, 2) ses matchs, 3) son compte
    const { data: matches } = await supabase.from('matches').select('id').eq('adoptant_id', uid);
    const matchIds = (matches || []).map((m) => m.id);
    if (matchIds.length) await supabase.from('messages').delete().in('match_id', matchIds);
    await supabase.from('matches').delete().eq('adoptant_id', uid);
    const { error } = await supabase.from('adoptants').delete().eq('id', uid);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
