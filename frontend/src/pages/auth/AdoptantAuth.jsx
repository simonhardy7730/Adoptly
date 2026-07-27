import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../lib/api';
import { loginAnyRole, loginRedirectPath } from '../../lib/authLogin';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../lib/supabase';
import LoadingSpinner from '../../components/LoadingSpinner';
import PasswordInput from '../../components/PasswordInput';
import AuthRoleToggle from '../../components/AuthRoleToggle';

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

function getPasswordStrength(password) {
  if (!password || password.length < 6) return { score: 0, label: 'Trop court', color: 'bg-red-400' };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const levels = [
    { score: 0, label: 'Faible',    color: 'bg-red-400'    },
    { score: 1, label: 'Faible',    color: 'bg-red-400'    },
    { score: 2, label: 'Moyen',     color: 'bg-orange-400' },
    { score: 3, label: 'Bien',      color: 'bg-yellow-400' },
    { score: 4, label: 'Excellent', color: 'bg-green-400'  },
  ];
  return levels[score];
}

export default function AdoptantAuth({ mode = 'login' }) {
  const navigate  = useNavigate();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [form,     setForm]     = useState({ email: '', password: '' });
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [remember, setRemember] = useState(true);

  // ── Connexion email/mot de passe ──────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        // Connexion « intelligente » : si l'email/mdp ne correspond pas à un
        // compte adoptant, on essaie automatiquement refuge puis famille
        // d'accueil — pour qu'un refuge tombé ici par erreur atterrisse quand
        // même sur son tableau de bord au lieu d'être renvoyé à l'accueil.
        const data = await loginAnyRole(form, ['adoptant', 'shelter', 'foster']);
        login(data.token, data.user, data.role, remember);
        navigate(loginRedirectPath(data));
        return;
      }
      const { data } = await api.post('/auth/adoptant/register', form);
      login(data.token, data.user, 'adoptant', remember);
      // GA4 tracking
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'sign_up', { method: 'email', role: 'adoptant' });
      }
      navigate(data.user.questionnaire_answers ? '/adoptant/swipe' : '/adoptant/questionnaire');
    } catch (err) {
      setError(err.response?.data?.error || t('auth_error_default'));
    } finally {
      setLoading(false);
    }
  }

  // ── Connexion Google OAuth ────────────────────────────────────
  async function handleGoogleAuth() {
    if (!supabase) {
      setError(t('auth_error_default'));
      return;
    }
    setLoading(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Force Google à toujours proposer le choix du compte
        queryParams: { prompt: 'select_account' },
      },
    });
    if (oauthError) {
      setError(t('auth_error_default'));
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-light flex flex-col">
      {/* Header retour + toggle langue */}
      <div className="p-4 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors"
        >
          <span>←</span>
          <span className="text-sm font-medium">{t('ad_back')}</span>
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
              {mode === 'login' ? t('ad_login_title') : t('ad_register_title')}
            </h1>
            <p className="text-gray-500 mt-1.5 text-sm">
              {mode === 'login' ? t('ad_login_sub') : t('ad_register_sub')}
            </p>
          </div>

          {/* Bascule adoptant / refuge */}
          <AuthRoleToggle active="adoptant" mode={mode} />

          {/* Bouton Google */}
          <button type="button" onClick={handleGoogleAuth} disabled={loading} className="btn-google mb-4">
            <GoogleIcon />
            {t('ad_google_btn')}
          </button>

          {/* Séparateur */}
          <div className="divider-text mb-4">{t('ad_or')}</div>

          {/* Formulaire email/mdp */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth_email')}</label>
              <input
                type="email"
                required
                name="email"
                autoComplete="email"
                className="input-field"
                placeholder="vous@exemple.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">{t('auth_password')}</label>
                {mode === 'login' && (
                  <Link
                    to="/auth/forgot-password?role=adoptant"
                    className="text-xs text-secondary hover:underline"
                    tabIndex={-1}
                  >
                    {t('ad_forgot')}
                  </Link>
                )}
              </div>
              <PasswordInput
                required
                minLength={6}
                name="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              {mode === 'register' && form.password && (() => {
                const strength = getPasswordStrength(form.password);
                return (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1 h-1.5">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-full transition-all duration-300 ${
                            i < strength.score + 1 ? strength.color : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-400">{strength.label}</p>
                  </div>
                );
              })()}
            </div>

            {mode === 'login' && (
              <label className="flex items-center gap-2 text-sm text-gray-600 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                Rester connecté
              </label>
            )}

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
                t('ad_login_btn')
              ) : (
                t('ad_register_btn')
              )}
            </button>
          </form>

          {/* Lien bascule login ↔ register */}
          <p className="text-center text-gray-500 text-sm mt-6">
            {mode === 'login' ? (
              <>
                {t('ad_no_account')}{' '}
                <Link to="/adoptant/register" className="text-secondary font-semibold hover:underline">
                  {t('ad_register_link')}
                </Link>
              </>
            ) : (
              <>
                {t('ad_has_account')}{' '}
                <Link to="/adoptant/login" className="text-secondary font-semibold hover:underline">
                  {t('ad_login_link')}
                </Link>
              </>
            )}
          </p>

          <div className="text-center mt-4">
            <p className="text-gray-400 text-xs">{t('ad_shelter_q')}</p>
            <Link to="/shelter/login" className="text-secondary text-sm font-medium hover:underline">
              {t('ad_shelter_link')}
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
