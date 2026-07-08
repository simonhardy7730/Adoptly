import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getVapidPublicKey, savePushSubscription, removePushSubscription } from '../lib/push.js';

const router = express.Router();

// Clé publique VAPID — nécessaire au frontend pour s'abonner
router.get('/vapid-public-key', (_req, res) => {
  const key = getVapidPublicKey();
  if (!key) return res.status(503).json({ error: 'Push non configuré' });
  res.json({ publicKey: key });
});

// Enregistrer l'abonnement push de l'utilisateur connecté
router.post('/subscribe', authenticate, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint) return res.status(400).json({ error: 'Abonnement invalide' });
    await savePushSubscription({ userId: req.user.id, role: req.user.role, subscription });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Désabonnement
router.post('/unsubscribe', authenticate, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) await removePushSubscription(endpoint);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
