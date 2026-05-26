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

// ── Liste publique des refuges partenaires ────────────────

router.get('/shelters', async (_req, res) => {
  try {
    // Récupérer tous les refuges avec leurs animaux actifs
    const { data: shelters, error } = await supabase
      .from('shelters')
      .select('id, name, address, phone, email')
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
          animal_count:  shelterAnimals.length,
          species,
          cover,
        };
      })
      // Ne montrer que les refuges avec au moins 1 animal actif
      .filter((s) => s.animal_count > 0);

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
