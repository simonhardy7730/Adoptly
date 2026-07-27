import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../lib/api';
import { loginAnyRole, loginRedirectPath } from '../../lib/authLogin';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import PasswordInput from '../../components/PasswordInput';
import AuthRoleToggle from '../../components/AuthRoleToggle';

export default function ShelterAuth({ mode = 'login' }) {
  const navigate  = useNavigate();
  const { login } = useAuth();
  const { t } = useLanguage();

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
  const [remember,   setRemember]   = useState(true);

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
      if (mode === 'login') {
        // Connexion « intelligente » : refuge d'abord, puis adoptant / famille
        // d'accueil en repli — pour qu'un adoptant tombé sur ce formulaire soit
        // quand même connecté au bon espace au lieu d'être renvoyé à l'accueil.
        const data = await loginAnyRole(
          { email: form.email, password: form.password },
          ['shelter', 'adoptant', 'foster'],
        );
        login(data.token, data.user, data.role, remember);
        navigate(loginRedirectPath(data));
        return;
      }
      const { data } = await api.post('/auth/shelter/register', form);
      login(data.token, data.user, 'shelter', remember);
      // GA4 tracking
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'sign_up', { method: 'email', role: 'shelter' });
      }
      navigate('/shelter/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || t('auth_error_default'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-light flex flex-col">
      <div className="p-4 flex items-center justify-between">
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
              {mode === 'login' ? t('auth_login_title') : t('auth_register_title')}
            </h1>
            <p className="text-gray-500 mt-1.5 text-sm">
              {mode === 'login' ? t('auth_login_sub') : t('auth_register_sub')}
            </p>
          </div>

          {/* Bascule adoptant / refuge */}
          <AuthRoleToggle active="shelter" mode={mode} />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth_email')}</label>
              <input
                type="email"
                required
                name="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="input-field"
                placeholder="contact@monrefuge.fr"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">{t('auth_password')}</label>
                {mode === 'login' && (
                  <Link
                    to="/auth/forgot-password?role=shelter"
                    className="text-xs text-secondary hover:underline"
                    tabIndex={-1}
                  >
                    {t('auth_forgot')}
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
            </div>

            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('auth_shelter_name')} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder={t('profile_name_ph')}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth_phone')}</label>
                  <input
                    type="tel"
                    className="input-field"
                    placeholder={t('profile_phone_ph')}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth_address')}</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder={t('profile_address_ph')}
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
                        ? `${t('auth_loc_saved')} (${form.latitude.toFixed(3)}, ${form.longitude.toFixed(3)})`
                        : t('auth_detect_loc')}
                    </>
                  )}
                </button>
              </>
            )}

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
                t('auth_login_btn')
              ) : (
                t('auth_register_btn')
              )}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            {mode === 'login' ? (
              <>
                {t('auth_new_shelter')}{' '}
                <Link to="/shelter/register" className="text-secondary font-semibold hover:underline">
                  {t('auth_register_link')}
                </Link>
              </>
            ) : (
              <>
                {t('auth_existing')}{' '}
                <Link to="/shelter/login" className="text-secondary font-semibold hover:underline">
                  {t('auth_login_link')}
                </Link>
              </>
            )}
          </p>

          <div className="text-center mt-4">
            <Link to="/adoptant/login" className="text-secondary text-sm font-medium hover:underline">
              {t('auth_adopt_cta')}
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
