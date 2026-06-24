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


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
