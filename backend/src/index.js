import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import authRoutes    from './routes/auth.js';
import adoptantRoutes from './routes/adoptant.js';
import shelterRoutes from './routes/shelter.js';
import publicRoutes  from './routes/public.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://adoptly-fr.netlify.app',
  'https://adoptly.fr',
  'https://www.adoptly.fr',
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

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/adoptant', adoptantRoutes);
app.use('/api/shelter', shelterRoutes);
app.use('/api/public', publicRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
