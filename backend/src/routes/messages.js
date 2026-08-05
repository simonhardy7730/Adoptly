import express from 'express';
import multer from 'multer';
import { supabase } from '../lib/supabase.js';
import { selectIn } from '../lib/db.js';
import { sendPushToUser } from '../lib/push.js';
import { authenticate } from '../middleware/auth.js';
import { sendNewMessageNotificationEmail, sendAdoptantMessageNotificationEmail } from '../lib/email.js';
import { makeMagicToken } from '../lib/magic.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

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

      const unread = await selectIn('messages', 'id', 'match_id', matchIds, (q) =>
        q.eq('sender_role', 'shelter').eq('read', false)
      );
      return res.json({ count: unread.length });
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

      const matches = await selectIn('matches', 'id', 'animal_id', animalIds);
      if (!matches.length) return res.json({ count: 0 });

      const matchIds = matches.map((m) => m.id);

      const unread = await selectIn('messages', 'id', 'match_id', matchIds, (q) =>
        q.eq('sender_role', 'adoptant').eq('read', false)
      );
      return res.json({ count: unread.length });
    }

    return res.status(403).json({ error: 'Forbidden' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/messages/unread/matches ─────────────────────
// Returns match IDs that have unread messages (without marking them as read)
router.get('/unread/matches', authenticate, async (req, res) => {
  try {
    const { role, id } = req.user;
    const otherRole = role === 'adoptant' ? 'shelter' : 'adoptant';

    let matchIds = [];

    if (role === 'adoptant') {
      const { data: matches } = await supabase
        .from('matches')
        .select('id')
        .eq('adoptant_id', id)
        .eq('swipe_direction', 'right');
      matchIds = (matches || []).map((m) => m.id);
    } else if (role === 'shelter') {
      const { data: animals } = await supabase
        .from('animals')
        .select('id')
        .eq('shelter_id', id);
      if (animals?.length) {
        const matches = await selectIn('matches', 'id', 'animal_id', animals.map((a) => a.id));
        matchIds = matches.map((m) => m.id);
      }
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!matchIds.length) return res.json([]);

    const unreadMsgs = await selectIn('messages', 'match_id', 'match_id', matchIds, (q) =>
      q.eq('sender_role', otherRole).eq('read', false)
    );

    const unreadMatchIds = [...new Set(unreadMsgs.map((m) => m.match_id))];
    res.json(unreadMatchIds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/messages/conversations (shelter) ────────────
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const { role, id } = req.user;

    if (role === 'adoptant') {
      const { data: matches, error: matchErr } = await supabase
        .from('matches')
        .select('id, adoptant_id, animal_id, animals(name, photos, shelter_id, shelters(name))')
        .eq('adoptant_id', id)
        .eq('swipe_direction', 'right');

      if (matchErr) throw matchErr;
      if (!matches?.length) return res.json([]);

      const matchIds = matches.map((m) => m.id);

      const messages = await selectIn('messages', 'id, match_id, content, sender_role, read, created_at', 'match_id', matchIds);
      messages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      if (!messages.length) return res.json([]);

      const convMap = {};
      for (const msg of messages) {
        if (!convMap[msg.match_id]) {
          convMap[msg.match_id] = { lastMessage: msg, unread: 0 };
        }
        if (msg.sender_role === 'shelter' && !msg.read) {
          convMap[msg.match_id].unread++;
        }
      }

      const conversations = matches
        .filter((m) => convMap[m.id])
        .map((m) => {
          const conv = convMap[m.id];
          return {
            match_id:      m.id,
            animal_name:   m.animals?.name || 'Animal',
            animal_photo:  m.animals?.photos?.[0] || null,
            shelter_name:  m.animals?.shelters?.name || 'Refuge',
            last_message:  conv.lastMessage.content,
            last_sender:   conv.lastMessage.sender_role,
            last_date:     conv.lastMessage.created_at,
            unread:        conv.unread,
          };
        })
        .sort((a, b) => new Date(b.last_date) - new Date(a.last_date));

      return res.json(conversations);
    }

    if (role !== 'shelter') return res.status(403).json({ error: 'Forbidden' });

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
    const matches = await selectIn('matches', 'id, adoptant_id, animal_id', 'animal_id', animalIds);
    if (!matches.length) return res.json([]);

    const matchIds = matches.map((m) => m.id);

    // Get the last message and unread count per match (chunked to avoid URL overflow)
    const messages = await selectIn('messages', 'id, match_id, content, sender_role, read, created_at', 'match_id', matchIds);
    messages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (!messages.length) return res.json([]);

    // Get adoptant info
    const adoptantIds = [...new Set(matches.map((m) => m.adoptant_id))];
    const adoptants = await selectIn('adoptants', 'id, first_name, last_name, email', 'id', adoptantIds);

    const adoptantMap = Object.fromEntries(adoptants.map((a) => [a.id, a]));

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

          // Notification push au refuge
          if (animal?.shelter_id) {
            await sendPushToUser({
              userId: animal.shelter_id,
              role:   'shelter',
              title:  `💬 ${adoptantName} vous a écrit`,
              body:   `À propos de ${animal.name} : ${preview}`,
              url:    'https://adoptly.fr/shelter/messages',
            });
          }
        } catch (emailErr) {
          console.error('[Messages] Erreur notification email:', emailErr.message);
        }
      })();
    }

    // Marquer le match comme contacté quand le refuge envoie un message
    if (role === 'shelter') {
      supabase
        .from('matches')
        .update({ contacted: true })
        .eq('id', match_id)
        .eq('contacted', false)
        .then(() => {})
        .catch(() => {});
    }

    // Notifier l'adoptant par email quand un refuge envoie un message (non-bloquant)
    if (role === 'shelter') {
      (async () => {
        try {
          const { data: animal } = await supabase
            .from('animals')
            .select('name, shelter_id, shelters(email, name)')
            .eq('id', match.animal_id)
            .single();

          const { data: adoptant } = await supabase
            .from('adoptants')
            .select('first_name, last_name, email')
            .eq('id', match.adoptant_id)
            .single();

          const adoptantName = [adoptant?.first_name, adoptant?.last_name].filter(Boolean).join(' ') || 'Adoptant';
          const preview = content.trim().length > 150 ? content.trim().slice(0, 150) + '…' : content.trim();

          // Throttle email : au plus 1 email par conversation / 24h. Si le refuge a
          // déjà écrit dans cette conversation sur les dernières 24h, on n'envoie pas
          // un nouvel email (le push, gratuit, prend le relais) → économise le quota
          // email et évite la fatigue côté adoptant.
          const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
          const { data: recentShelterMsgs } = await supabase
            .from('messages')
            .select('id')
            .eq('match_id', match_id)
            .eq('sender_role', 'shelter')
            .gte('created_at', since24h)
            .neq('id', message.id)
            .limit(1);
          const alreadyNotified = (recentShelterMsgs || []).length > 0;

          if (adoptant?.email && !alreadyNotified) {
            // Lien magique : connexion en 1 clic, directement dans la conversation
            const magicToken = makeMagicToken({ adoptantId: match.adoptant_id, matchId: match_id });
            const magicUrl = `https://www.adoptly.fr/magic?token=${magicToken}`;
            await sendAdoptantMessageNotificationEmail({
              adoptantEmail:  adoptant.email,
              adoptantName,
              shelterName:    animal?.shelters?.name || 'Un refuge',
              animalName:     animal?.name || 'votre animal',
              messagePreview: preview,
              magicUrl,
            });
          }

          // Notification push à l'adoptant
          await sendPushToUser({
            userId: match.adoptant_id,
            role:   'adoptant',
            title:  `🐾 ${animal?.shelters?.name || 'Un refuge'} vous a répondu`,
            body:   `À propos de ${animal?.name || 'votre animal'} : ${preview}`,
            url:    'https://adoptly.fr/adoptant/messages',
          });
        } catch (emailErr) {
          console.error('[Messages] Erreur notification adoptant:', emailErr.message);
        }
      })();
    }

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/messages/:match_id/image ───────────────────
router.post('/:match_id/image', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { match_id } = req.params;
    const { id: userId, role } = req.user;

    if (!req.file) return res.status(400).json({ error: 'Image requise' });

    const match = await getMatchForUser(match_id, userId, role);
    if (!match) return res.status(403).json({ error: 'Forbidden' });

    const ext = req.file.originalname.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `${match_id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('chat-images')
      .upload(filename, req.file.buffer, { contentType: req.file.mimetype, upsert: false });

    if (uploadErr) throw uploadErr;

    const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(filename);
    const imageUrl = urlData.publicUrl;

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        match_id,
        sender_id: userId,
        sender_role: role,
        content: imageUrl,
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
