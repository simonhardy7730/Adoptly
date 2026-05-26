import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../lib/api';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get('role') || 'adoptant';

  const [email,   setEmail]   = useState('');
  const [role,    setRole]    = useState(defaultRole);
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email, role });
      setSent(true);
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  const backLink = role === 'shelter' ? '/shelter/login' : '/adoptant/login';

  return (
    <div className="min-h-screen bg-bg-light flex flex-col">
      <div className="p-4">
        <Link
          to={backLink}
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
            <div className="text-4xl mb-3">🔑</div>
            <h1 className="text-2xl font-extrabold text-gray-900 mt-1">
              Mot de passe oublié ?
            </h1>
            <p className="text-gray-500 mt-1.5 text-sm">
              Entrez votre email — nous vous enverrons un lien de réinitialisation.
            </p>
          </div>

          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card p-6 text-center space-y-4"
            >
              <div className="text-5xl">📬</div>
              <h2 className="font-bold text-gray-800 text-lg">Email envoyé !</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                Si un compte existe avec <strong>{email}</strong>, vous recevrez
                un email avec un lien valable <strong>1 heure</strong>.
              </p>
              <p className="text-gray-400 text-xs">
                Pensez à vérifier vos spams.
              </p>
              <Link to={backLink} className="btn-primary block py-3 text-sm">
                Retour à la connexion
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Sélecteur de rôle */}
              <div className="flex rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 p-1 gap-1">
                {[
                  { value: 'adoptant', label: '🐾 Adoptant' },
                  { value: 'shelter',  label: '🏠 Refuge'   },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRole(value)}
                    className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${
                      role === value
                        ? 'bg-white shadow text-primary'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse email
                </label>
                <input
                  type="email"
                  required
                  className="input-field"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
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
                ) : (
                  'Envoyer le lien →'
                )}
              </button>

              <p className="text-center">
                <Link to={backLink} className="text-gray-400 text-sm hover:text-gray-600">
                  Retour à la connexion
                </Link>
              </p>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
