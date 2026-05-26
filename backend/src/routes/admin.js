import express from 'express';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

/** Middleware — vérifie le secret admin dans le header ou le query param */
function requireAdmin(req, res, next) {
  const secret = req.headers['x-admin-secret'] || req.query.secret;
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET)
    return res.status(401).json({ error: 'Non autorisé' });
  next();
}

// ── GET /api/admin/stats?secret=XXX ───────────────────────────────────────────
// Retourne les chiffres clés de la plateforme en temps réel.

router.get('/stats', requireAdmin, async (_req, res) => {
  try {
    const now    = new Date();
    const day7   = new Date(now - 7  * 24 * 60 * 60 * 1000).toISOString();
    const day30  = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Compter en parallèle
    const [
      { count: totalAdoptants },
      { count: totalShelters  },
      { count: totalAnimals   },
      { count: activeAnimals  },
      { count: adoptedAnimals },
      { count: newAdoptants7  },
      { count: newAdoptants30 },
      { count: newShelters7   },
      { count: newShelters30  },
      { data:  recentAdoptants },
      { data:  recentShelters  },
    ] = await Promise.all([
      supabase.from('adoptants').select('*', { count: 'exact', head: true }),
      supabase.from('shelters' ).select('*', { count: 'exact', head: true }),
      supabase.from('animals'  ).select('*', { count: 'exact', head: true }),
      supabase.from('animals'  ).select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('animals'  ).select('*', { count: 'exact', head: true }).eq('status', 'adopted'),
      supabase.from('adoptants').select('*', { count: 'exact', head: true }).gte('created_at', day7),
      supabase.from('adoptants').select('*', { count: 'exact', head: true }).gte('created_at', day30),
      supabase.from('shelters' ).select('*', { count: 'exact', head: true }).gte('created_at', day7),
      supabase.from('shelters' ).select('*', { count: 'exact', head: true }).gte('created_at', day30),
      // 10 derniers adoptants
      supabase.from('adoptants').select('email, created_at').order('created_at', { ascending: false }).limit(10),
      // 10 derniers refuges
      supabase.from('shelters' ).select('name, email, address, created_at').order('created_at', { ascending: false }).limit(10),
    ]);

    res.json({
      generatedAt: new Date().toLocaleString('fr-BE', { timeZone: 'Europe/Brussels' }),
      adoptants: {
        total:    totalAdoptants  ?? 0,
        last7d:   newAdoptants7  ?? 0,
        last30d:  newAdoptants30 ?? 0,
        recent:   recentAdoptants ?? [],
      },
      shelters: {
        total:   totalShelters  ?? 0,
        last7d:  newShelters7  ?? 0,
        last30d: newShelters30 ?? 0,
        recent:  recentShelters ?? [],
      },
      animals: {
        total:   totalAnimals   ?? 0,
        active:  activeAnimals  ?? 0,
        adopted: adoptedAnimals ?? 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
