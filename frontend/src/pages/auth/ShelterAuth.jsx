import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function ShelterAuth({ mode = 'login' }) {
  const navigate  = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({
    email:     '',
    password:  '',
    name:      '',
    phone:     '',
    address:   '',
    latitude:  null,
    longitude: null,
  });
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  function detectLocation() {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
        setGeoLoading(false);
      },
      () => setGeoLoading(false)
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/shelter/login' : '/auth/shelter/register';
      const payload  = mode === 'login' ? { email: form.email, password: form.password } : form;
      const { data } = await api.post(endpoint, payload);
      login(data.token, data.user, 'shelter');
      navigate('/shelter/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-light flex flex-col">
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
              {mode === 'login' ? 'Espace refuge' : 'Enregistrer votre refuge'}
            </h1>
            <p className="text-gray-500 mt-1.5 text-sm">
              {mode === 'login'
                ? 'Gérez vos animaux et suivez les adoptions'
                : 'Commencez à lister vos animaux'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                required
                className="input-field"
                placeholder="refuge@exemple.com"
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

            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du refuge <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="SPA de Lyon"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input
                    type="tel"
                    className="input-field"
                    placeholder="+33 6 00 00 00 00"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="12 rue des Lilas, Lyon"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>

                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={geoLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl
                             border-2 border-dashed border-secondary text-secondary font-medium
                             text-sm hover:bg-secondary/5 transition-colors"
                >
                  {geoLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      📍{' '}
                      {form.latitude
                        ? `Position enregistrée (${form.latitude.toFixed(3)}, ${form.longitude.toFixed(3)})`
                        : 'Détecter ma position automatiquement'}
                    </>
                  )}
                </button>
              </>
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
                'Se connecter'
              ) : (
                'Enregistrer le refuge'
              )}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            {mode === 'login' ? (
              <>
                Nouveau refuge ?{' '}
                <Link to="/shelter/register" className="text-secondary font-semibold hover:underline">
                  S'inscrire ici
                </Link>
              </>
            ) : (
              <>
                Déjà inscrit ?{' '}
                <Link to="/shelter/login" className="text-secondary font-semibold hover:underline">
                  Se connecter
                </Link>
              </>
            )}
          </p>

          <div className="text-center mt-4">
            <Link to="/adoptant/login" className="text-secondary text-sm font-medium hover:underline">
              Vous souhaitez adopter ? →
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
