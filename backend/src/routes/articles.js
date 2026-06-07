import express from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// ── Helper: générer un slug à partir du titre ────────────
function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

// ── GET /api/articles — Liste publique des articles publiés ──
router.get('/', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('id, title, slug, excerpt, cover_image, author_name, shelter_id, created_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/articles/:slug — Article unique par slug ────
router.get('/:slug', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('slug', req.params.slug)
      .eq('status', 'published')
      .single();

    if (error || !data) return res.status(404).json({ error: 'Article introuvable' });

    // Incrémenter les vues (non-bloquant)
    supabase
      .from('articles')
      .update({ views: (data.views || 0) + 1 })
      .eq('id', data.id)
      .then(() => {});

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/articles — Créer un article (shelter ou admin) ──
router.post('/', authenticate, async (req, res) => {
  try {
    const { role, id } = req.user;
    const { title, content, excerpt, cover_image, shelter_id } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Titre et contenu requis' });
    }

    // Déterminer l'auteur
    let author_name = 'Adoptly';
    let linked_shelter_id = shelter_id || null;

    if (role === 'shelter') {
      const { data: shelter } = await supabase
        .from('shelters')
        .select('name')
        .eq('id', id)
        .single();
      author_name = shelter?.name || 'Refuge partenaire';
      linked_shelter_id = id;
    }

    // Générer le slug
    let slug = slugify(title);
    // Vérifier unicité
    const { data: existing } = await supabase
      .from('articles')
      .select('id')
      .eq('slug', slug);
    if (existing?.length > 0) {
      slug += '-' + Date.now().toString(36);
    }

    const { data, error } = await supabase
      .from('articles')
      .insert({
        title,
        slug,
        content,
        excerpt: excerpt || content.slice(0, 200).replace(/\n/g, ' ').trim() + '…',
        cover_image: cover_image || null,
        author_name,
        author_type: role === 'shelter' ? 'shelter' : 'admin',
        shelter_id: linked_shelter_id,
        status: role === 'shelter' ? 'draft' : 'published', // Les shelters sont en brouillon par défaut
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/articles/:id/publish — Publier un article (admin only) ──
router.put('/:id/publish', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('articles')
      .update({ status: 'published' })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
