import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function FosterAuth({ mode = 'login' }) {
  const navigate  = useNavigate();
  const { login } = useAuth();
  const { lang, setLang } = useLanguage();
  const [form,    setForm]    = useState({ email: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/foster/login' : '/auth/foster/register';
      const { data } = await api.post(endpoint, form);
      login(data.token, data.user, 'foster');
      navigate(data.user.questionnaire_answers ? '/famille-accueil/swipe' : '/famille-accueil/questionnaire');
    } catch (err) {
      setError(err.response?.data?.error || 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
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
          <span className="text-sm font-medium">Retour</span>
        </Link>
        <button
          onClick={() => setLang(lang === 'fr' ? 'nl' : 'fr')}
          className="text-xs font-bold px-2 py-1 rounded-lg border border-gray-200
                     text-gray-500 hover:border-secondary hover:text-secondary transition-colors"
          title={lang === 'fr' ? 'Switch to Nederlands' : 'Passer en français'}
        >
          {lang === 'fr' ? 'NL' : 'FR'}
        </button>
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
              {mode === 'login' ? 'Connexion famille d\'accueil' : 'Devenir famille d\'accueil'}
            </h1>
            <p className="text-gray-500 mt-1.5 text-sm">
              {mode === 'login'
                ? 'Accueillir un animal temporairement, c\'est changer une vie.'
                : 'Offrez un foyer temporaire à un animal dans le besoin.'}
            </p>
          </div>

          {/* Formulaire email/mdp */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse email</label>
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Mot de passe</label>
                {mode === 'login' && (
                  <Link
                    to="/auth/forgot-password?role=foster"
                    className="text-xs text-secondary hover:underline"
                    tabIndex={-1}
                  >
                    Mot de passe oublié ?
                  </Link>
                )}
              </div>
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
                <Link to="/famille-accueil/register" className="text-secondary font-semibold hover:underline">
                  S'inscrire
                </Link>
              </>
            ) : (
              <>
                Déjà un compte ?{' '}
                <Link to="/famille-accueil/login" className="text-secondary font-semibold hover:underline">
                  Se connecter
                </Link>
              </>
            )}
          </p>

          <div className="text-center mt-4">
            <p className="text-gray-400 text-xs">Vous êtes un refuge ?</p>
            <Link to="/shelter/login" className="text-secondary text-sm font-medium hover:underline">
              Accéder à l'espace refuge →
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
