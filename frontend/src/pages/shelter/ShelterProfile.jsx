import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../lib/api';

export default function ShelterProfile() {
  const navigate = useNavigate();
  const { t }    = useLanguage();
  const logoRef  = useRef();
  const descPhotoRef = useRef();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState('');

  const [form, setForm] = useState({
    name: '', phone: '', address: '', description: '', siret: '',
  });
  const [logoFile,      setLogoFile]      = useState(null);
  const [logoPreview,   setLogoPreview]   = useState(null);
  const [descPhotos,    setDescPhotos]    = useState([]);
  const [newDescFiles,  setNewDescFiles]  = useState([]);

  useEffect(() => {
    api.get('/shelter/profile')
      .then(({ data }) => {
        setProfile(data);
        setForm({
          name:        data.name        || '',
          phone:       data.phone       || '',
          address:     data.address     || '',
          description: data.description || '',
          siret:       data.siret       || '',
        });
        setLogoPreview(data.logo_url || null);
        const photos = data.description_photos?.length
          ? data.description_photos
          : data.description_photo_url ? [data.description_photo_url] : [];
        setDescPhotos(photos);
      })
      .catch(() => navigate('/shelter/dashboard'))
      .finally(() => setLoading(false));
  }, [navigate]);

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name',        form.name);
      formData.append('phone',       form.phone);
      formData.append('address',     form.address);
      formData.append('description', form.description);
      formData.append('siret',       form.siret);
      if (logoFile) formData.append('logo', logoFile);
      if (!logoFile && logoPreview) formData.append('existing_logo_url', logoPreview);
      newDescFiles.forEach(f => formData.append('description_photos', f));
      formData.append('existing_description_photos', JSON.stringify(descPhotos));

      const { data } = await api.put('/shelter/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfile(data);
      const saved_photos = data.description_photos?.length
        ? data.description_photos
        : data.description_photo_url ? [data.description_photo_url] : [];
      setDescPhotos(saved_photos);
      setNewDescFiles([]);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.response?.data?.error || t('profile_error'));
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setEditing(false);
    setError('');
    setLogoFile(null);
    setNewDescFiles([]);
    setLogoPreview(profile?.logo_url || null);
    const photos = profile?.description_photos?.length
      ? profile.description_photos
      : profile?.description_photo_url ? [profile.description_photo_url] : [];
    setDescPhotos(photos);
    setForm({
      name:        profile?.name        || '',
      phone:       profile?.phone       || '',
      address:     profile?.address     || '',
      description: profile?.description || '',
      siret:       profile?.siret       || '',
    });
  }

  if (loading) return (
    <div className="min-h-screen bg-bg-light flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );

  const initial      = profile?.name?.[0]?.toUpperCase() || '?';
  const memberSince  = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="min-h-screen bg-bg-light">
      <Navbar />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* ── Carte identité refuge ──────────────────────────────── */}
        <div className="card p-6 flex flex-col items-center gap-4 text-center">

          {/* Logo */}
          <div className="relative group">
            {(editing ? logoPreview : profile?.logo_url) ? (
              <img
                src={editing ? logoPreview : profile.logo_url}
                alt="Logo"
                className="w-20 h-20 rounded-full object-cover shadow-lg border-2 border-white"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary
                              flex items-center justify-center shadow-lg">
                <span className="text-white font-black text-3xl">{initial}</span>
              </div>
            )}
            {editing && (
              <button
                type="button"
                onClick={() => logoRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center
                           opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span className="text-white text-xs font-semibold">📷 Logo</span>
              </button>
            )}
          </div>
          <input ref={logoRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); }
            }}
          />

          {!editing ? (
            <div className="w-full">
              <p className="font-bold text-primary text-xl">{profile?.name}</p>
              <p className="text-gray-400 text-sm mt-1">{profile?.email}</p>
              <p className="text-gray-300 text-xs mt-0.5">{t('profile_member_since')} {memberSince}</p>
              {profile?.siret && (
                <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1 rounded-full mt-2 border border-green-200">
                  <span>✅</span> Association vérifiée · N° {profile.siret}
                </div>
              )}
              {profile?.phone   && <p className="text-gray-500 text-sm mt-2">📞 {profile.phone}</p>}
              {profile?.address && <p className="text-gray-500 text-sm mt-1">📍 {profile.address}</p>}

              {/* Description */}
              {profile?.description && (
                <p className="text-gray-600 text-sm mt-3 text-left leading-relaxed border-t border-gray-100 pt-3">
                  {profile.description}
                </p>
              )}
              {descPhotos.length > 0 && (
                <div className={`mt-3 grid gap-2 ${descPhotos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {descPhotos.map((url, i) => (
                    <img key={i} src={url} alt={`Photo refuge ${i + 1}`}
                      className="w-full rounded-2xl object-cover max-h-48" />
                  ))}
                </div>
              )}

              <button
                onClick={() => setEditing(true)}
                className="mt-4 text-secondary text-sm font-medium hover:underline"
              >
                {t('profile_edit_btn')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSave} className="w-full space-y-3 text-left">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {t('profile_name_label')}
                </label>
                <input className="input-field" placeholder={t('profile_name_ph')}
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('profile_phone_label')}</label>
                <input className="input-field" placeholder={t('profile_phone_ph')}
                  value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('profile_address_label')}</label>
                <input className="input-field" placeholder={t('profile_address_ph')}
                  value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  🏛️ N° d'identification <span className="text-gray-400 font-normal">(optionnel)</span>
                </label>
                <input
                  className="input-field"
                  placeholder="SIRET, BCE, RNA…"
                  maxLength={20}
                  value={form.siret}
                  onChange={(e) => setForm({ ...form, siret: e.target.value })}
                />
                <p className="text-xs text-gray-400 mt-0.5">SIRET (France), BCE (Belgique), ou autre — affiché comme badge de confiance</p>
              </div>

              {/* Histoire du refuge */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  📖 Histoire du refuge <span className="text-gray-400 font-normal">(optionnel)</span>
                </label>
                <textarea
                  className="input-field resize-none h-32"
                  maxLength={1000}
                  placeholder="Parlez de votre refuge, de votre mission, de l'équipe…"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
                <p className="text-xs text-gray-400 mt-0.5 text-right">{form.description.length}/1000</p>
              </div>

              {/* Photos du refuge (max 5) */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  🖼️ Photos du refuge <span className="text-gray-400 font-normal">(max 5)</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {descPhotos.map((url, i) => (
                    <div key={`existing-${i}`} className="relative aspect-square">
                      <img src={url} alt={`Photo ${i + 1}`}
                        className="w-full h-full rounded-xl object-cover" />
                      <button type="button"
                        onClick={() => setDescPhotos(prev => prev.filter((_, j) => j !== i))}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center shadow"
                      >✕</button>
                    </div>
                  ))}
                  {newDescFiles.map((f, i) => (
                    <div key={`new-${i}`} className="relative aspect-square">
                      <img src={URL.createObjectURL(f)} alt={`Nouvelle ${i + 1}`}
                        className="w-full h-full rounded-xl object-cover" />
                      <button type="button"
                        onClick={() => setNewDescFiles(prev => prev.filter((_, j) => j !== i))}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center shadow"
                      >✕</button>
                    </div>
                  ))}
                  {(descPhotos.length + newDescFiles.length) < 5 && (
                    <button type="button" onClick={() => descPhotoRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-secondary hover:text-secondary transition-colors"
                    >
                      <span className="text-lg">+</span>
                      <span className="text-xs">Photo</span>
                    </button>
                  )}
                </div>
                <input ref={descPhotoRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && (descPhotos.length + newDescFiles.length) < 5) {
                      setNewDescFiles(prev => [...prev, f]);
                    }
                    e.target.value = '';
                  }}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-2xl">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saving}
                  className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2"
                >
                  {saving ? <LoadingSpinner size="sm" className="text-white" /> : t('profile_save')}
                </button>
                <button type="button" onClick={cancelEdit}
                  className="btn-secondary flex-1 py-2.5 text-sm"
                >
                  {t('profile_cancel')}
                </button>
              </div>
            </form>
          )}

          {saved && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="text-green-500 text-sm font-medium"
            >
              {t('profile_saved_msg')}
            </motion.p>
          )}
        </div>

        {/* ── Actions rapides ────────────────────────────────────── */}
        <div className="card p-5 space-y-3">
          <h2 className="font-bold text-gray-700">{t('profile_actions')}</h2>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => navigate('/shelter/dashboard')}
              className="bg-blue-50 hover:bg-blue-100 text-primary font-semibold text-sm py-4 rounded-2xl transition-colors"
            >{t('profile_goto_dash')}</button>
            <button onClick={() => navigate('/shelter/animals/add')}
              className="bg-orange-50 hover:bg-orange-100 text-accent font-semibold text-sm py-4 rounded-2xl transition-colors"
            >{t('profile_add_animal')}</button>
          </div>
        </div>

        {/* ── Compte ─────────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="font-bold text-gray-700 mb-3">{t('profile_account')}</h2>
          <div className="space-y-2 text-sm text-gray-500">
            <div className="flex justify-between">
              <span>{t('profile_email_label')}</span>
              <span className="font-medium text-gray-700">{profile?.email}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('profile_member_since')}</span>
              <span className="font-medium text-gray-700">{memberSince}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <a href="/auth/forgot-password?role=shelter"
              className="text-secondary text-sm font-medium hover:underline"
            >{t('profile_change_pwd')}</a>
          </div>
        </div>

      </div>
    </div>
  );
}
