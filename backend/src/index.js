import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import authRoutes    from './routes/auth.js';
import adoptantRoutes from './routes/adoptant.js';
import shelterRoutes from './routes/shelter.js';
import fosterRoutes  from './routes/foster.js';
import publicRoutes  from './routes/public.js';
import adminRoutes   from './routes/admin.js';
import messagesRouter from './routes/messages.js';
import articlesRouter from './routes/articles.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://adoptly-fr.netlify.app',
  'https://adoptly.fr',
  'https://www.adoptly.fr',
  'https://adoptly-teal.vercel.app',
  'https://adoptly-eta.vercel.app',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Autoriser les requêtes sans origin (Postman, curl, mobile)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS bloqué pour : ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));

// ── Rate limiting — protection anti-brute-force ───────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // max 10 tentatives par IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Veuillez réessayer dans 15 minutes.' },
  skip: (req) => req.method !== 'POST', // ne limiter que les POST (login/register)
});

const swipeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de swipes. Veuillez patienter.' },
});
app.use('/api/adoptant/swipe', swipeLimiter);
app.use('/api/foster/swipe', swipeLimiter);

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/adoptant', adoptantRoutes);
app.use('/api/shelter', shelterRoutes);
app.use('/api/foster', fosterRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messagesRouter);
app.use('/api/articles', articlesRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── Pages SEO + sitemap accessibles à la racine ─────────
app.use(publicRoutes);

// ── Désinscription notifications (lien dans les emails) ───────────
app.get('/api/unsubscribe/:adoptantId', async (req, res) => {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    const { data: adoptant } = await supabase
      .from('adoptants')
      .select('id, questionnaire_answers')
      .eq('id', req.params.adoptantId)
      .single();

    if (!adoptant) {
      return res.status(404).send('<html><body style="font-family:sans-serif;text-align:center;padding:60px;"><h2>Lien invalide</h2></body></html>');
    }

    const answers = adoptant.questionnaire_answers || {};
    answers.email_notifications = false;
    await supabase.from('adoptants').update({ questionnaire_answers: answers }).eq('id', adoptant.id);

    res.send(`
      <!DOCTYPE html>
      <html lang="fr">
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Désabonnement — Adoptly</title></head>
      <body style="margin:0;padding:60px 20px;font-family:Inter,system-ui,sans-serif;background:#F4F7FF;text-align:center;">
        <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:24px;padding:48px 32px;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
          <div style="font-size:48px;margin-bottom:16px;">✅</div>
          <h1 style="color:#1B4F8A;font-size:22px;margin:0 0 12px;">C'est fait !</h1>
          <p style="color:#6B7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
            Vous ne recevrez plus de notifications par email lorsqu'un nouvel animal compatible est ajouté.
          </p>
          <p style="color:#9CA3AF;font-size:13px;line-height:1.5;margin:0 0 28px;">
            Votre compte reste actif — vous pouvez toujours vous connecter sur Adoptly pour découvrir les animaux, matcher et discuter avec les refuges.
          </p>
          <a href="https://adoptly.fr" style="background:#1B4F8A;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:14px;display:inline-block;">
            Retour sur Adoptly →
          </a>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('[Unsubscribe] Erreur:', err.message);
    res.status(500).send('<html><body style="font-family:sans-serif;text-align:center;padding:60px;"><h2>Une erreur est survenue</h2><p>Veuillez réessayer plus tard.</p></body></html>');
  }
});


// ── Digest quotidien — appelé chaque jour à 18h par cron-job.org ───────────
app.get('/api/cron/daily-digest', async (req, res) => {
  if (req.query.key !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const { passesHardFilters } = await import('./lib/matching.js');
    const { sendDailyDigestEmail, sendEmailsThrottled } = await import('./lib/email.js');

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    // Animaux ajoutés dans les dernières 26h (marge de 2h pour éviter les trous)
    const since = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString();
    const { data: newAnimals, error: animalsError } = await supabase
      .from('animals')
      .select('id, name, species, breed, photos, shelter_id, shelters(id, name, latitude, longitude)')
      .eq('status', 'active')
      .gte('created_at', since);

    if (animalsError) {
      console.error('[Digest] Erreur requête animaux:', animalsError.message);
      return res.status(500).json({ error: animalsError.message });
    }

    console.log(`[Digest] ${newAnimals?.length || 0} animal(aux) trouvé(s) depuis ${since}`);

    if (!newAnimals?.length) {
      return res.json({ message: 'Aucun nouvel animal', sent: 0, since });
    }

    // Tous les adoptants avec questionnaire + notifications actives
    const { data: adoptants, error: adoptantsError } = await supabase
      .from('adoptants')
      .select('id, email, first_name, questionnaire_answers')
      .not('questionnaire_answers', 'is', null);

    if (adoptantsError) {
      console.error('[Digest] Erreur requête adoptants:', adoptantsError.message);
      return res.status(500).json({ error: adoptantsError.message });
    }

    const activeAdoptants = (adoptants || []).filter(
      (a) => a.questionnaire_answers?.email_notifications !== false
    );
    console.log(`[Digest] ${adoptants?.length || 0} adoptant(s) total, ${activeAdoptants.length} avec notifs actives`);

    if (!activeAdoptants.length) {
      return res.json({ message: 'Aucun adoptant avec notifs actives', sent: 0 });
    }

    let totalSent = 0;
    const emailFns = [];
    const debugLog = [];

    for (const adoptant of activeAdoptants) {
      const compatible = [];
      for (const a of newAnimals) {
        try {
          if (passesHardFilters(a, a.shelters, adoptant.questionnaire_answers)) {
            compatible.push(a);
          }
        } catch (err) {
          console.error(`[Digest] Erreur matching ${a.name} ↔ ${adoptant.email}:`, err.message);
        }
      }

      debugLog.push({
        email: adoptant.email,
        compatible: compatible.length,
        total: newAnimals.length,
      });

      if (!compatible.length) continue;

      const animals = compatible.map((a) => ({
        name: a.name,
        species: a.species,
        breed: a.breed,
        photos: a.photos,
        shelterName: a.shelters?.name || 'Refuge partenaire',
      }));

      emailFns.push(() => sendDailyDigestEmail({
        adoptantId: adoptant.id,
        adoptantEmail: adoptant.email,
        adoptantFirstName: adoptant.first_name,
        animals,
      }));

      totalSent++;
    }

    console.log('[Digest] Détail matching:', JSON.stringify(debugLog));

    await sendEmailsThrottled(emailFns);

    console.log(`[Digest] ${totalSent} email(s) envoyé(s) pour ${newAnimals.length} nouvel animal(aux)`);
    res.json({
      message: 'Digest envoyé',
      sent: totalSent,
      newAnimals: newAnimals.length,
      adoptantsChecked: activeAdoptants.length,
      since,
      debug: debugLog,
    });
  } catch (err) {
    console.error('[Digest] Erreur:', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

// ── Sync du kit Facebook — appelé chaque nuit par cron-job.org ────────────
app.get('/api/cron/fb-kit', async (req, res) => {
  if (req.query.key !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { syncFbKit } = await import('./lib/fbkit.js');
    const result = await syncFbKit();
    console.log('[FbKit] Sync:', JSON.stringify(result));
    res.json({ message: 'Kit synchronisé', ...result });
  } catch (err) {
    console.error('[FbKit] Erreur:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Relance J+2 — adoptants qui ont swipé right mais pas écrit ─────────────
app.get('/api/cron/reminder-j2', async (req, res) => {
  if (req.query.key !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const { sendReminderJ2Email, sendEmailsThrottled } = await import('./lib/email.js');

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    // Matchs right créés entre 48h et 72h ago
    const now = new Date();
    const h72 = new Date(now - 72 * 60 * 60 * 1000).toISOString();
    const h48 = new Date(now - 48 * 60 * 60 * 1000).toISOString();

    const { data: matches, error: matchErr } = await supabase
      .from('matches')
      .select('id, adoptant_id, animal_id')
      .eq('swipe_direction', 'right')
      .gte('timestamp', h72)
      .lte('timestamp', h48);

    if (matchErr) throw matchErr;

    console.log(`[Reminder-J2] ${matches?.length || 0} match(s) dans la fenêtre 48-72h`);

    if (!matches?.length) {
      return res.json({ message: 'Aucun match dans la fenêtre', sent: 0 });
    }

    // Filtrer ceux où l'adoptant n'a envoyé aucun message
    const emailFns = [];
    let skipped = 0;

    for (const match of matches) {
      const { data: msgs } = await supabase
        .from('messages')
        .select('id')
        .eq('match_id', match.id)
        .eq('sender_role', 'adoptant')
        .limit(1);

      if (msgs?.length > 0) {
        skipped++;
        continue;
      }

      const { data: adoptant } = await supabase
        .from('adoptants')
        .select('email, first_name')
        .eq('id', match.adoptant_id)
        .single();

      const { data: animal } = await supabase
        .from('animals')
        .select('name, photos, shelters(name)')
        .eq('id', match.animal_id)
        .single();

      if (!adoptant?.email || !animal) continue;

      emailFns.push(() => sendReminderJ2Email({
        adoptantEmail: adoptant.email,
        adoptantName:  adoptant.first_name || '',
        animalName:    animal.name,
        animalPhoto:   animal.photos?.[0] || null,
        shelterName:   animal.shelters?.name || 'Le refuge',
      }));
    }

    await sendEmailsThrottled(emailFns);

    console.log(`[Reminder-J2] ${emailFns.length} email(s) envoyé(s), ${skipped} ignoré(s) (déjà écrit)`);
    res.json({
      message: 'Relance J+2 terminée',
      sent: emailFns.length,
      skipped,
      totalMatches: matches.length,
    });
  } catch (err) {
    console.error('[Reminder-J2] Erreur:', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

// ── Relance J+3 — refuges qui n'ont pas répondu à un adoptant ──────────────
app.get('/api/cron/reminder-j3-shelter', async (req, res) => {
  if (req.query.key !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const { sendReminderJ3ShelterEmail, sendEmailsThrottled } = await import('./lib/email.js');

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    // Messages d'adoptants créés entre 72h et 96h ago, non lus
    const now = new Date();
    const h96 = new Date(now - 96 * 60 * 60 * 1000).toISOString();
    const h72 = new Date(now - 72 * 60 * 60 * 1000).toISOString();

    const { data: messages, error: msgErr } = await supabase
      .from('messages')
      .select('id, match_id, content, created_at')
      .eq('sender_role', 'adoptant')
      .eq('read', false)
      .gte('created_at', h96)
      .lte('created_at', h72);

    if (msgErr) throw msgErr;

    console.log(`[Reminder-J3] ${messages?.length || 0} message(s) non-lu(s) dans la fenêtre 72-96h`);

    if (!messages?.length) {
      return res.json({ message: 'Aucun message non-lu dans la fenêtre', sent: 0 });
    }

    // Dédupliquer par match_id (un seul rappel par conversation)
    const matchMap = {};
    for (const msg of messages) {
      if (!matchMap[msg.match_id]) matchMap[msg.match_id] = msg;
    }
    const uniqueMatches = Object.values(matchMap);

    const emailFns = [];

    for (const msg of uniqueMatches) {
      // Vérifier si le refuge a répondu après ce message
      const { data: replies } = await supabase
        .from('messages')
        .select('id')
        .eq('match_id', msg.match_id)
        .eq('sender_role', 'shelter')
        .gt('created_at', msg.created_at)
        .limit(1);

      if (replies?.length > 0) continue;

      const { data: match } = await supabase
        .from('matches')
        .select('adoptant_id, animal_id')
        .eq('id', msg.match_id)
        .single();

      if (!match) continue;

      const { data: adoptant } = await supabase
        .from('adoptants')
        .select('first_name, last_name, email')
        .eq('id', match.adoptant_id)
        .single();

      const { data: animal } = await supabase
        .from('animals')
        .select('name, shelter_id, shelters(email, name)')
        .eq('id', match.animal_id)
        .single();

      if (!animal?.shelters?.email) continue;

      const adoptantName = [adoptant?.first_name, adoptant?.last_name].filter(Boolean).join(' ') || adoptant?.email || 'Un adoptant';
      const preview = msg.content.length > 100 ? msg.content.slice(0, 100) + '…' : msg.content;

      emailFns.push(() => sendReminderJ3ShelterEmail({
        shelterEmail:   animal.shelters.email,
        shelterName:    animal.shelters.name,
        adoptantName,
        animalName:     animal.name,
        messagePreview: preview,
      }));
    }

    await sendEmailsThrottled(emailFns);

    console.log(`[Reminder-J3] ${emailFns.length} email(s) envoyé(s) à des refuges`);
    res.json({
      message: 'Relance J+3 refuges terminée',
      sent: emailFns.length,
      totalUnread: messages.length,
    });
  } catch (err) {
    console.error('[Reminder-J3] Erreur:', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
