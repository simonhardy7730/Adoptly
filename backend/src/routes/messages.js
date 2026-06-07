import express from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { sendNewMessageNotificationEmail } from '../lib/email.js';

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

// ── GET /api/messages/conversations (shelter) ────────────
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const { role, id } = req.user;
    if (role !== 'shelter') return res.status(403).json({ error: 'Réservé aux refuges' });

    // Get all animals for this shelter
    const { data: animals, error: animalErr } = await supabase
      .from('animals')
      .select('id, name, photos')
      .eq('shelter_id', id);

    if (animalErr) throw animalErr;
    if (!animals?.length) return res.json([]);

    const animalIds = animals.map((a) => a.id);
    const animalMap = Object.fromEntries(animals.map((a) => [a.id, a]));

    // Get all matches for these animals that have messages
    const { data: matches, error: matchErr } = await supabase
      .from('matches')
      .select('id, adoptant_id, animal_id')
      .in('animal_id', animalIds);

    if (matchErr) throw matchErr;
    if (!matches?.length) return res.json([]);

    const matchIds = matches.map((m) => m.id);

    // Get the last message and unread count per match
    const { data: messages, error: msgErr } = await supabase
      .from('messages')
      .select('id, match_id, content, sender_role, read, created_at')
      .in('match_id', matchIds)
      .order('created_at', { ascending: false });

    if (msgErr) throw msgErr;
    if (!messages?.length) return res.json([]);

    // Get adoptant info
    const adoptantIds = [...new Set(matches.map((m) => m.adoptant_id))];
    const { data: adoptants } = await supabase
      .from('adoptants')
      .select('id, first_name, last_name, email')
      .in('id', adoptantIds);

    const adoptantMap = Object.fromEntries((adoptants || []).map((a) => [a.id, a]));

    // Group by match
    const convMap = {};
    for (const msg of messages) {
      if (!convMap[msg.match_id]) {
        convMap[msg.match_id] = { lastMessage: msg, unread: 0 };
      }
      if (msg.sender_role === 'adoptant' && !msg.read) {
        convMap[msg.match_id].unread++;
      }
    }

    // Build conversations array
    const conversations = matches
      .filter((m) => convMap[m.id])
      .map((m) => {
        const conv = convMap[m.id];
        const animal = animalMap[m.animal_id];
        const adoptant = adoptantMap[m.adoptant_id];
        const name = [adoptant?.first_name, adoptant?.last_name].filter(Boolean).join(' ') || adoptant?.email || 'Adoptant';
        return {
          match_id:     m.id,
          animal_name:  animal?.name || 'Animal',
          animal_photo: animal?.photos?.[0] || null,
          adoptant_name: name,
          last_message:  conv.lastMessage.content,
          last_sender:   conv.lastMessage.sender_role,
          last_date:     conv.lastMessage.created_at,
          unread:        conv.unread,
        };
      })
      .sort((a, b) => new Date(b.last_date) - new Date(a.last_date));

    res.json(conversations);
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

    // Notifier le refuge par email quand un adoptant envoie un message (non-bloquant)
    if (role === 'adoptant') {
      (async () => {
        try {
          // Récupérer l'animal et le refuge via le match
          const { data: animal } = await supabase
            .from('animals')
            .select('name, shelter_id, shelters(email, name)')
            .eq('id', match.animal_id)
            .single();

          // Récupérer le nom de l'adoptant
          const { data: adoptant } = await supabase
            .from('adoptants')
            .select('first_name, last_name, email')
            .eq('id', userId)
            .single();

          const adoptantName = [adoptant?.first_name, adoptant?.last_name].filter(Boolean).join(' ') || adoptant?.email || 'Un adoptant';
          const preview = content.trim().length > 150 ? content.trim().slice(0, 150) + '…' : content.trim();

          if (animal?.shelters?.email) {
            await sendNewMessageNotificationEmail({
              shelterEmail:   animal.shelters.email,
              shelterName:    animal.shelters.name || 'Refuge',
              adoptantName,
              animalName:     animal.name,
              messagePreview: preview,
            });
          }
        } catch (emailErr) {
          console.error('[Messages] Erreur notification email:', emailErr.message);
        }
      })();
    }

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
