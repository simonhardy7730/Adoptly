import express from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// ── GET /api/messages/unread/count ────────────────────────
// Must be registered before /:match_id to avoid route conflict
router.get('/unread/count', authenticate, async (req, res) => {
  try {
    const { role, id } = req.user;

    if (role === 'adoptant') {
      // Get all match IDs for this adoptant
      const { data: matches, error: matchErr } = await supabase
        .from('matches')
        .select('id')
        .eq('adoptant_id', id)
        .eq('swipe_direction', 'right');

      if (matchErr) throw matchErr;

      if (!matches || matches.length === 0) return res.json({ count: 0 });

      const matchIds = matches.map((m) => m.id);

      const { count, error } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('match_id', matchIds)
        .eq('sender_role', 'shelter')
        .eq('read', false);

      if (error) throw error;
      return res.json({ count: count || 0 });
    }

    if (role === 'shelter') {
      // Get all animal IDs for this shelter
      const { data: animals, error: animalErr } = await supabase
        .from('animals')
        .select('id')
        .eq('shelter_id', id);

      if (animalErr) throw animalErr;

      if (!animals || animals.length === 0) return res.json({ count: 0 });

      const animalIds = animals.map((a) => a.id);

      const { data: matches, error: matchErr } = await supabase
        .from('matches')
        .select('id')
        .in('animal_id', animalIds);

      if (matchErr) throw matchErr;

      if (!matches || matches.length === 0) return res.json({ count: 0 });

      const matchIds = matches.map((m) => m.id);

      const { count, error } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('match_id', matchIds)
        .eq('sender_role', 'adoptant')
        .eq('read', false);

      if (error) throw error;
      return res.json({ count: count || 0 });
    }

    return res.status(403).json({ error: 'Forbidden' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Helper: verify user belongs to match ─────────────────
async function getMatchForUser(matchId, userId, userRole) {
  const { data: match, error } = await supabase
    .from('matches')
    .select('id, adoptant_id, animal_id, animals(shelter_id)')
    .eq('id', matchId)
    .single();

  if (error || !match) return null;

  if (userRole === 'adoptant' && match.adoptant_id === userId) return match;
  if (userRole === 'shelter' && match.animals?.shelter_id === userId) return match;
  return null;
}

// ── GET /api/messages/:match_id ───────────────────────────
router.get('/:match_id', authenticate, async (req, res) => {
  try {
    const { match_id } = req.params;
    const { id: userId, role } = req.user;

    const match = await getMatchForUser(match_id, userId, role);
    if (!match) return res.status(403).json({ error: 'Forbidden' });

    // Fetch messages
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', match_id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Mark messages from the other side as read
    const otherRole = role === 'adoptant' ? 'shelter' : 'adoptant';
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('match_id', match_id)
      .eq('sender_role', otherRole)
      .eq('read', false);

    res.json(messages || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/messages/:match_id ──────────────────────────
router.post('/:match_id', authenticate, async (req, res) => {
  try {
    const { match_id } = req.params;
    const { id: userId, role } = req.user;
    const { content } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }
    if (content.length > 1000) {
      return res.status(400).json({ error: 'Message too long (max 1000 characters)' });
    }

    const match = await getMatchForUser(match_id, userId, role);
    if (!match) return res.status(403).json({ error: 'Forbidden' });

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        match_id,
        sender_id: userId,
        sender_role: role,
        content: content.trim(),
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
