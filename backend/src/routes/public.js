import express from 'express';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

// ── Page publique d'un animal (sans authentification) ─────

router.get('/animals/:id', async (req, res) => {
  try {
    const { data: animal, error } = await supabase
      .from('animals')
      .select('id, name, species, breed, age, size, temperament, special_needs, story, photos, status, shelter_id')
      .eq('id', req.params.id)
      .single();

    if (error || !animal) return res.status(404).json({ error: 'Animal introuvable' });

    // Récupérer les infos publiques du refuge (nom + ville extraite de l'adresse)
    const { data: shelter } = await supabase
      .from('shelters')
      .select('name, address')
      .eq('id', animal.shelter_id)
      .single();

    res.json({
      ...animal,
      shelter_name:    shelter?.name    || null,
      shelter_address: shelter?.address || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
