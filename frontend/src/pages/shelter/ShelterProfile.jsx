import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../lib/api';

export default function ShelterProfile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState('');

  const [form, setForm] = useState({ name: '', phone: '', address: '' });

  useEffect(() => {
    api.get('/shelter/profile')
      .then(({ data }) => {
        setProfile(data);
        setForm({ name: data.name || '', phone: data.phone || '', address: data.address || '' });
      })
      .catch(() => navigate('/shelter/dashboard'))
      .finally(() => setLoading(false));
  }, [navigate]);

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data } = await api.put('/shelter/profile', form);
      setProfile(data);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setEditing(false);
    setError('');
    setForm({ name: profile.name || '', phone: profile.phone || '', address: profile.address || '' });
  }

  if (loading) return (
    <div className="min-h-screen bg-bg-light flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );

  const initial = profile?.name?.[0]?.toUpperCase() || '?';
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="min-h-screen bg-bg-light">
      <Navbar />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Carte identité refuge */}
        <div className="card p-6 flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary
                          flex items-center justify-center shadow-lg">
            <span className="text-white font-black text-3xl">{initial}</span>
          </div>

          {!editing ? (
            <div className="w-full">
              <p className="font-bold text-primary text-xl">{profile?.name}</p>
              <p className="text-gray-400 text-sm mt-1">{profile?.email}</p>
              <p className="text-gray-300 text-xs mt-0.5">Membre depuis {memberSince}</p>

              {profile?.phone && (
                <p className="text-gray-500 text-sm mt-2">📞 {profile.phone}</p>
              )}
              {profile?.address && (
                <p className="text-gray-500 text-sm mt-1">📍 {profile.address}</p>
              )}

              <button
                onClick={() => setEditing(true)}
                className="mt-4 text-secondary text-sm font-medium hover:underline"
              >
                ✏️ Modifier les informations
              </button>
            </div>
          ) : (
            <form onSubmit={handleSave} className="w-full space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 text-left">
                  Nom du refuge <span className="text-red-400">*</span>
                </label>
                <input
                  className="input-field"
                  placeholder="SPA de Namur"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 text-left">
                  Téléphone
                </label>
                <input
                  className="input-field"
                  placeholder="+32 81 00 00 00"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 text-left">
                  Adresse
                </label>
                <input
                  className="input-field"
                  placeholder="Rue des Animaux 12, 5000 Namur"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-2xl text-left">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2"
                >
                  {saving ? <LoadingSpinner size="sm" className="text-white" /> : 'Sauvegarder'}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="btn-secondary flex-1 py-2.5 text-sm"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}

          {saved && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-green-500 text-sm font-medium"
            >
              ✓ Informations sauvegardées !
            </motion.p>
          )}
        </div>

        {/* Actions rapides */}
        <div className="card p-5 space-y-3">
          <h2 className="font-bold text-gray-700">Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/shelter/dashboard')}
              className="bg-blue-50 hover:bg-blue-100 text-primary font-semibold text-sm py-4 rounded-2xl transition-colors"
            >
              📊 Tableau de bord
            </button>
            <button
              onClick={() => navigate('/shelter/animals/add')}
              className="bg-orange-50 hover:bg-orange-100 text-accent font-semibold text-sm py-4 rounded-2xl transition-colors"
            >
              ➕ Ajouter un animal
            </button>
          </div>
        </div>

        {/* Informations légales */}
        <div className="card p-5">
          <h2 className="font-bold text-gray-700 mb-3">Informations du compte</h2>
          <div className="space-y-2 text-sm text-gray-500">
            <div className="flex justify-between">
              <span>Email</span>
              <span className="font-medium text-gray-700">{profile?.email}</span>
            </div>
            <div className="flex justify-between">
              <span>Membre depuis</span>
              <span className="font-medium text-gray-700">{memberSince}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <a
              href="/auth/forgot-password?role=shelter"
              className="text-secondary text-sm font-medium hover:underline"
            >
              🔑 Changer mon mot de passe
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
