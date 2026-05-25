import express from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// ── Matching helpers ──────────────────────────────────────

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function passesHardFilters(animal, shelter, prefs) {
  // Distance
  if (
    prefs.latitude &&
    prefs.longitude &&
    shelter?.latitude &&
    shelter?.longitude
  ) {
    const dist = haversineKm(
      prefs.latitude,
      prefs.longitude,
      shelter.latitude,
      shelter.longitude
    );
    if (dist > (prefs.search_radius_km || 50)) return false;
  }

  // Species
  if (prefs.preferred_animal !== 'both') {
    if (
      prefs.preferred_animal === 'small_animal' &&
      !['rabbit', 'guinea_pig', 'other'].includes(animal.species)
    )
      return false;
    if (
      prefs.preferred_animal !== 'small_animal' &&
      animal.species !== prefs.preferred_animal
    )
      return false;
  }

  const req = animal.requirements || {};

  // Children compatibility
  if (prefs.has_children) {
    const ca = prefs.children_age;
    if (req.children_compatible === 'no') return false;
    if (req.children_compatible === '12+' && (ca === '<6' || ca === '6-12'))
      return false;
    if (req.children_compatible === '6+' && ca === '<6') return false;
  }

  // Existing pets compatibility
  const existingPets = prefs.existing_pets || 'none';
  if (existingPets === 'cat' || existingPets === 'both') {
    if (req.cats_compatible === 'no') return false;
  }
  if (existingPets === 'dog' || existingPets === 'both') {
    if (req.dogs_compatible === 'no') return false;
  }

  // Garden
  if (req.needs_garden === 'yes' && prefs.has_garden === 'no') return false;

  // Daily outdoor
  if (req.daily_outdoor_time === 'yes' && prefs.works_outdoor === 'no')
    return false;

  // Spacious home
  if (req.spacious_home === 'yes' && prefs.housing_type === 'apartment')
    return false;

  return true;
}

function scoreAnimal(animal, prefs) {
  let score = 0;
  const energyTemperMap = { calm: 'calm', balanced: 'playful', very_energetic: 'energetic' };
  const ageBrackets = { baby: [0, 6], young: [6, 24], adult: [24, 84], senior: [84, 9999] };

  if (animal.temperament === energyTemperMap[prefs.energy_level]) score += 25;

  if (prefs.size_preference !== 'no_preference' && animal.size === prefs.size_preference)
    score += 20;

  const [minA, maxA] = ageBrackets[prefs.age_preference] || [0, 9999];
  if ((animal.age || 0) >= minA && (animal.age || 0) < maxA) score += 15;

  const broadEnergyMatch = {
    calm: ['calm'],
    balanced: ['calm', 'playful', 'mixed'],
    very_energetic: ['energetic', 'playful', 'mixed'],
  };
  if (broadEnergyMatch[prefs.energy_level]?.includes(animal.temperament)) score += 20;

  if (!animal.special_needs) score += 10;

  return score;
}

// ── Routes ────────────────────────────────────────────────

router.get('/profile', authenticate, async (req, res) => {
  if (req.user.role !== 'adoptant')
    return res.status(403).json({ error: 'Forbidden' });
  try {
    const { data, error } = await supabase
      .from('adoptants')
      .select('id, email, created_at, questionnaire_answers')
      .eq('id', req.user.id)
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
      .limit(200);

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
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

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
      return res.json({ match, animal, isMatch: true });
    }

    res.json({ match, isMatch: false });
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

export default router;
