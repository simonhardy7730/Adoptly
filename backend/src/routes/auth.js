import express from 'express';
import bcrypt  from 'bcryptjs';
import jwt     from 'jsonwebtoken';
import { supabase }          from '../lib/supabase.js';
import { sendWelcomeEmail, sendShelterWelcomeEmail } from '../lib/email.js';

const router = express.Router();

function makeToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
}

// ── Adoptant — inscription ────────────────────────────────────────────────────

router.post('/adoptant/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email et mot de passe requis' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const { data, error } = await supabase
      .from('adoptants')
      .insert({ email, password_hash: hash })
      .select('id, email, created_at')
      .single();

    if (error) {
      if (error.code === '23505')
        return res.status(409).json({ error: 'Cet email est déjà utilisé' });
      throw error;
    }

    // Email de bienvenue (non-bloquant)
    sendWelcomeEmail({ email }).catch(() => {});

    const token = makeToken({ id: data.id, email: data.email, role: 'adoptant' });
    res.json({ token, user: data, role: 'adoptant' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Adoptant — connexion ──────────────────────────────────────────────────────

router.post('/adoptant/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data: adoptant } = await supabase
      .from('adoptants')
      .select('*')
      .eq('email', email)
      .single();

    if (!adoptant || !(await bcrypt.compare(password, adoptant.password_hash)))
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

    const { password_hash, ...user } = adoptant;
    const token = makeToken({ id: user.id, email: user.email, role: 'adoptant' });
    res.json({ token, user, role: 'adoptant' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Adoptant — connexion Google OAuth ────────────────────────────────────────
// Reçoit un access_token Supabase, vérifie l'identité, crée le compte si nouveau.

router.post('/google', async (req, res) => {
  const { access_token } = req.body;
  if (!access_token)
    return res.status(400).json({ error: 'Token manquant' });

  try {
    // Vérifier le token auprès de Supabase Auth
    const supaRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        apikey:        process.env.SUPABASE_SERVICE_KEY,
      },
    });

    if (!supaRes.ok)
      return res.status(401).json({ error: 'Token Google invalide' });

    const supaUser = await supaRes.json();
    const { email } = supaUser;

    if (!email)
      return res.status(401).json({ error: 'Email introuvable dans le token' });

    // Trouver ou créer l'adoptant
    let { data: adoptant } = await supabase
      .from('adoptants')
      .select('*')
      .eq('email', email)
      .single();

    let isNew = false;

    if (!adoptant) {
      const { data: newAdoptant, error: insertError } = await supabase
        .from('adoptants')
        .insert({ email, password_hash: 'GOOGLE_OAUTH' })
        .select('id, email, created_at, questionnaire_answers')
        .single();

      if (insertError)
        return res.status(500).json({ error: 'Erreur lors de la création du compte' });

      adoptant = newAdoptant;
      isNew    = true;
    }

    if (isNew) {
      sendWelcomeEmail({ email }).catch(() => {});
    }

    const { password_hash, ...user } = adoptant;
    const token = makeToken({ id: user.id, email: user.email, role: 'adoptant' });
    res.json({ token, user, role: 'adoptant' });

  } catch (err) {
    console.error('[Auth/Google]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Refuge — inscription ──────────────────────────────────────────────────────

router.post('/shelter/register', async (req, res) => {
  const { email, password, name, phone, address, latitude, longitude } = req.body;
  if (!email || !password || !name)
    return res.status(400).json({ error: 'Email, mot de passe et nom requis' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const { data, error } = await supabase
      .from('shelters')
      .insert({ email, password_hash: hash, name, phone, address, latitude, longitude })
      .select('id, email, name, phone, address, latitude, longitude, created_at')
      .single();

    if (error) {
      if (error.code === '23505')
        return res.status(409).json({ error: 'Cet email est déjà utilisé' });
      throw error;
    }

    // Email de bienvenue refuge (non-bloquant)
    sendShelterWelcomeEmail({ email: data.email, name: data.name }).catch(() => {});

    const token = makeToken({ id: data.id, email: data.email, role: 'shelter' });
    res.json({ token, user: data, role: 'shelter' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Refuge — connexion ────────────────────────────────────────────────────────

router.post('/shelter/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data: shelter } = await supabase
      .from('shelters')
      .select('*')
      .eq('email', email)
      .single();

    if (!shelter || !(await bcrypt.compare(password, shelter.password_hash)))
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

    const { password_hash, ...user } = shelter;
    const token = makeToken({ id: user.id, email: user.email, role: 'shelter' });
    res.json({ token, user, role: 'shelter' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
