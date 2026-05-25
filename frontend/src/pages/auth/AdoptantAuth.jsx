import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import LoadingSpinner from '../../components/LoadingSpinner';

// Icône Google SVG
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
      <path d="M47.53 24.55c0-1.63-.14-3.2-.42-4.71H24v8.91h13.19c-.57 3.06-2.29 5.65-4.89 7.39v6.14h7.92c4.63-4.27 7.31-10.56 7.31-17.73z" fill="#4285F4"/>
      <path d="M24 48c6.63 0 12.19-2.2 16.25-5.95l-7.92-6.14c-2.2 1.48-5.01 2.35-8.33 2.35-6.41 0-11.84-4.33-13.77-10.15H2.04v6.34C6.08 42.66 14.41 48 24 48z" fill="#34A853"/>
      <path d="M10.23 28.11A14.44 14.44 0 019.7 24c0-1.42.24-2.8.53-4.11v-6.34H2.04A23.97 23.97 0 000 24c0 3.87.93 7.53 2.04 10.45l8.19-6.34z" fill="#FBBC05"/>
      <path d="M24 9.74c3.61 0 6.84 1.24 9.38 3.68l7.04-7.04C36.18 2.42 30.62 0 24 0 14.41 0 6.08 5.34 2.04 13.55l8.19 6.34C12.16 14.07 17.59 9.74 24 9.74z" fill="#EA4335"/>
    </svg>
  );
}

export default function AdoptantAuth({ mode = 'login' }) {
  const navigate  = useNavigate();
  const { login } = useAuth();
  const [form,    setForm]    = useState({ email: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  // ── Connexion email/mot de passe ──────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/adoptant/login' : '/auth/adoptant/register';
      const { data } = await api.post(endpoint, form);
      login(data.token, data.user, 'adoptant');
      navigate(data.user.questionnaire_answers ? '/adoptant/swipe' : '/adoptant/questionnaire');
    } catch (err) {
      setError(err.response?.data?.error || 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  // ── Connexion Google OAuth ────────────────────────────────────
  async function handleGoogleAuth() {
    if (!supabase) {
      setError("Google OAuth n'est pas configuré. Utilisez email/mot de passe.");
      return;
    }
    setLoading(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) {
      setError('Erreur lors de la connexion Google. Veuillez réessayer.');
      setLoading(false);
    }
    // Sinon, la page redirige vers Google → AuthCallback s'occupe du reste
  }

  return (
    <div className="min-h-screen bg-bg-light flex flex-col">
      {/* Header retour */}
      <div className="p-4">
        <Link
          to="/"
          className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors w-fit"
        >
          <span>←</span>
          <span className="text-sm font-medium">Retour</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 pb-16">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Logo + titre */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center
                              group-hover:bg-primary-dark transition-colors">
                <span className="text-white font-black text-base select-none">A</span>
              </div>
              <span className="font-black text-primary text-xl tracking-tight">Adoptly</span>
            </Link>
            <h1 className="text-2xl font-extrabold text-gray-900 mt-1">
              {mode === 'login' ? 'Bon retour !' : 'Commencez à adopter'}
            </h1>
            <p className="text-gray-500 mt-1.5 text-sm">
              {mode === 'login'
                ? 'Connectez-vous pour continuer votre recherche'
                : 'Créez votre compte gratuitement'}
            </p>
          </div>

          {/* Bouton Google */}
          <button type="button" onClick={handleGoogleAuth} disabled={loading} className="btn-google mb-4">
            <GoogleIcon />
            Continuer avec Google
          </button>

          {/* Séparateur */}
          <div className="divider-text mb-4">ou</div>

          {/* Formulaire email/mdp */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                required
                className="input-field"
                placeholder="vous@exemple.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <input
                type="password"
                required
                minLength={6}
                className="input-field"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-2xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 text-base py-4"
            >
              {loading ? (
                <LoadingSpinner size="sm" className="text-white" />
              ) : mode === 'login' ? (
                'Se connecter'
              ) : (
                'Créer mon compte'
              )}
            </button>
          </form>

          {/* Lien bascule login ↔ register */}
          <p className="text-center text-gray-500 text-sm mt-6">
            {mode === 'login' ? (
              <>
                Pas encore de compte ?{' '}
                <Link to="/adoptant/register" className="text-secondary font-semibold hover:underline">
                  S'inscrire
                </Link>
              </>
            ) : (
              <>
                Déjà un compte ?{' '}
                <Link to="/adoptant/login" className="text-secondary font-semibold hover:underline">
                  Se connecter
                </Link>
              </>
            )}
          </p>

          <div className="text-center mt-4">
            <p className="text-gray-400 text-xs">Vous êtes un refuge ?</p>
            <Link to="/shelter/login" className="text-secondary text-sm font-medium hover:underline">
              Espace refuge →
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
