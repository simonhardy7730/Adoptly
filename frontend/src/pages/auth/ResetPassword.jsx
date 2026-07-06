import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../lib/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import PasswordInput from '../../components/PasswordInput';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token    = searchParams.get('token') || '';
  const role     = searchParams.get('role')  || 'adoptant';
  const navigate = useNavigate();

  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [error,     setError]     = useState('');

  const loginLink = role === 'shelter' ? '/shelter/login' : '/adoptant/login';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (!token) {
      setError('Lien invalide. Veuillez redemander un lien de réinitialisation.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password, role });
      setSuccess(true);
      setTimeout(() => navigate(loginLink), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Lien invalide ou expiré.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-bg-light flex items-center justify-center px-6">
        <div className="card p-8 max-w-sm w-full text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="font-bold text-gray-800">Lien invalide</h2>
          <p className="text-gray-500 text-sm">Ce lien de réinitialisation est invalide ou a expiré.</p>
          <Link to="/auth/forgot-password" className="btn-primary block py-3 text-sm">
            Demander un nouveau lien
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-light flex flex-col">
      <div className="p-4">
        <Link
          to={loginLink}
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
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center
                              group-hover:bg-primary-dark transition-colors">
                <span className="text-white font-black text-base select-none">A</span>
              </div>
              <span className="font-black text-primary text-xl tracking-tight">Adoptly</span>
            </Link>
            <div className="text-4xl mb-3">🔐</div>
            <h1 className="text-2xl font-extrabold text-gray-900 mt-1">
              Nouveau mot de passe
            </h1>
            <p className="text-gray-500 mt-1.5 text-sm">
              Choisissez un mot de passe sécurisé (6 caractères minimum).
            </p>
          </div>

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card p-6 text-center space-y-4"
            >
              <div className="text-5xl">✅</div>
              <h2 className="font-bold text-gray-800 text-lg">Mot de passe modifié !</h2>
              <p className="text-gray-500 text-sm">
                Vous allez être redirigé(e) vers la connexion dans quelques instants…
              </p>
              <Link to={loginLink} className="btn-primary block py-3 text-sm">
                Se connecter maintenant
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nouveau mot de passe
                </label>
                <PasswordInput
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le mot de passe
                </label>
                <PasswordInput
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
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
                  'Enregistrer le mot de passe →'
                )}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
