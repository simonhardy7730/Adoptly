import { useState, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../lib/api';

const SPECIES = ['dog', 'cat', 'rabbit', 'guinea_pig', 'other'];
const TEMPERAMENTS = ['calm', 'playful', 'energetic', 'mixed'];
const SIZES = ['small', 'medium', 'large'];

const EMPTY_REQUIREMENTS = {
  needs_garden: 'no',
  children_compatible: 'yes',
  cats_compatible: 'unknown',
  dogs_compatible: 'unknown',
  daily_outdoor_time: 'no',
  spacious_home: 'flexible',
  special_notes: '',
};

function RadioGroup({ label, name, options, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium border-2 transition-all active:scale-95
              ${value === opt.value
                ? 'border-secondary bg-secondary/10 text-secondary'
                : 'border-gray-200 bg-white text-gray-600 hover:border-secondary/40'
              }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AnimalForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { t } = useLanguage();
  const isEdit = Boolean(id);
  const existing = location.state?.animal;

  const [form, setForm] = useState({
    name: existing?.name || '',
    species: existing?.species || 'dog',
    breed: existing?.breed || '',
    age: existing?.age || '',
    size: existing?.size || 'medium',
    temperament: existing?.temperament || 'playful',
    special_needs: existing?.special_needs || '',
    story: existing?.story || '',
    status: existing?.status || 'active',
    requirements: existing?.requirements || { ...EMPTY_REQUIREMENTS },
    is_international: existing?.is_international || false,
    origin_country: existing?.origin_country || '',
  });

  const [existingPhotos, setExistingPhotos] = useState(existing?.photos || []);
  const [newFiles, setNewFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(existing?.video_url || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileRef = useRef();
  const videoRef = useRef();

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setReq(key, value) {
    setForm((f) => ({ ...f, requirements: { ...f.requirements, [key]: value } }));
  }

  function handleFiles(files) {
    const arr = Array.from(files);
    const total = existingPhotos.length + newFiles.length + arr.length;
    if (total > 3) {
      setError(t('form_photos_max_err'));
      return;
    }
    setNewFiles((prev) => [...prev, ...arr]);
    arr.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => setPreviews((p) => [...p, e.target.result]);
      reader.readAsDataURL(file);
    });
  }

  function removeExistingPhoto(idx) {
    setExistingPhotos((p) => p.filter((_, i) => i !== idx));
  }

  function removeNewFile(idx) {
    setNewFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    // Scroll en haut pour voir le résultat
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('species', form.species);
      formData.append('breed', form.breed);
      formData.append('age', form.age);
      formData.append('size', form.size);
      formData.append('temperament', form.temperament);
      formData.append('special_needs', form.special_needs);
      formData.append('story', form.story);
      formData.append('requirements', JSON.stringify(form.requirements));
      formData.append('is_international', form.is_international);
      if (form.is_international && form.origin_country)
        formData.append('origin_country', form.origin_country);
      if (isEdit) formData.append('status', form.status);
      if (isEdit) formData.append('existing_photos', JSON.stringify(existingPhotos));
      if (isEdit && !videoFile && videoPreview) formData.append('existing_video_url', videoPreview);

      newFiles.forEach((f) => formData.append('photos', f));
      if (videoFile) formData.append('video', videoFile);

      if (isEdit) {
        await api.put(`/shelter/animals/${id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60000, // 60s pour les vidéos
        });
        setSuccess(t('form_success_edit'));
      } else {
        await api.post('/shelter/animals', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60000, // 60s pour les vidéos
        });
        setSuccess(t('form_success_add'));
        setForm({
          name: '',
          species: 'dog',
          breed: '',
          age: '',
          size: 'medium',
          temperament: 'playful',
          special_needs: '',
          story: '',
          status: 'active',
          requirements: { ...EMPTY_REQUIREMENTS },
        });
        setNewFiles([]);
        setPreviews([]);
        setExistingPhotos([]);
      }
    } catch (err) {
      const msg = err.response?.data?.error
        || (err.code === 'ECONNABORTED' ? 'Délai dépassé — la vidéo est peut-être trop lourde. Réessayez sans vidéo ou avec une vidéo plus courte.' : null)
        || (err.message?.includes('Network') ? 'Erreur réseau — vérifiez votre connexion et réessayez.' : null)
        || t('form_error');
      setError(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' }); // scroll en haut pour voir l'erreur
    } finally {
      setSaving(false);
    }
  }

  const storyLength = form.story.length;

  // Labels traduits
  const speciesOptions = SPECIES.map((s) => ({ value: s, label: t(`sp_${s}`) }));
  const sizeOptions    = SIZES.map((s) => ({ value: s, label: t(`sz_${s}`) }));
  const tempOptions    = TEMPERAMENTS.map((tp) => ({ value: tp, label: t(`tp_${tp}`) }));

  const yesNo = [
    { value: 'yes', label: t('val_yes') },
    { value: 'no',  label: t('val_no') },
  ];

  return (
    <div className="min-h-screen bg-bg-light">
      <Navbar />

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 text-lg">
            ←
          </button>
          <h1 className="text-2xl font-extrabold text-primary">
            {isEdit ? t('form_title_edit') : t('form_title_add')}
          </h1>
        </div>

        {/* Bandeau erreur visible en haut */}
        {error && (
          <div className="bg-red-50 border-2 border-red-300 text-red-700 text-sm px-4 py-4 rounded-2xl flex items-start gap-3">
            <span className="text-xl flex-shrink-0">⚠️</span>
            <div>
              <p className="font-semibold mb-0.5">Une erreur est survenue</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photos */}
          <div className="card p-5 space-y-3">
            <h2 className="font-bold text-gray-700">{t('form_photos')}</h2>

            <div className="flex gap-3 flex-wrap">
              {existingPhotos.map((url, i) => (
                <div key={url} className="relative w-24 h-24 rounded-2xl overflow-hidden group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeExistingPhoto(i)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}

              {previews.map((src, i) => (
                <div key={i} className="relative w-24 h-24 rounded-2xl overflow-hidden group">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeNewFile(i)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}

              {existingPhotos.length + newFiles.length < 3 && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-secondary hover:text-secondary transition-colors"
                >
                  <span className="text-2xl">+</span>
                  <span className="text-xs">{t('form_photo_add')}</span>
                </button>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {/* ── Vidéo (optionnelle) ───────────────────────────────── */}
          <div className="card p-5 space-y-3">
            <label className="block text-sm font-semibold text-gray-700">
              🎥 Vidéo de l'animal <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <p className="text-xs text-gray-400">MP4, MOV ou WEBM · 80 Mo max</p>

            {videoPreview ? (
              <div className="relative">
                <video
                  src={videoPreview}
                  controls
                  className="w-full rounded-2xl max-h-52 object-cover bg-black"
                />
                <button
                  type="button"
                  onClick={() => { setVideoFile(null); setVideoPreview(null); }}
                  className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full hover:bg-red-600 transition"
                >
                  Supprimer
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => videoRef.current?.click()}
                className="w-full h-24 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-secondary hover:text-secondary transition-colors"
              >
                <span className="text-2xl">▶</span>
                <span className="text-xs">Ajouter une vidéo</span>
              </button>
            )}

            <input
              ref={videoRef}
              type="file"
              accept="video/mp4,video/mov,video/quicktime,video/webm"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setVideoFile(file);
                setVideoPreview(URL.createObjectURL(file));
              }}
            />
          </div>

          {/* Informations de base */}
          <div className="card p-5 space-y-4">
            <h2 className="font-bold text-gray-700">{t('form_basic_info')}</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('form_name')} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="Rex"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
              />
            </div>

            <RadioGroup
              label={t('form_species')}
              name="species"
              options={speciesOptions}
              value={form.species}
              onChange={(v) => setField('species', v)}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('form_breed')}</label>
              <input
                type="text"
                className="input-field"
                placeholder="Labrador Croisé"
                value={form.breed}
                onChange={(e) => setField('breed', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('form_age')}</label>
              <input
                type="number"
                min={0}
                className="input-field"
                placeholder="18"
                value={form.age}
                onChange={(e) => setField('age', e.target.value)}
              />
              <p className="text-gray-400 text-xs mt-1">{t('form_age_hint')}</p>
            </div>

            <RadioGroup
              label={t('form_size')}
              name="size"
              options={sizeOptions}
              value={form.size}
              onChange={(v) => setField('size', v)}
            />

            <RadioGroup
              label={t('form_temperament')}
              name="temperament"
              options={tempOptions}
              value={form.temperament}
              onChange={(v) => setField('temperament', v)}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('form_special_needs')}</label>
              <textarea
                className="input-field resize-none h-20"
                placeholder={t('form_special_ph')}
                value={form.special_needs}
                onChange={(e) => setField('special_needs', e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">{t('form_story')}</label>
                <span className={`text-xs ${storyLength > 550 ? 'text-orange-500' : 'text-gray-400'}`}>
                  {storyLength}/600
                </span>
              </div>
              <textarea
                className="input-field resize-none h-36"
                maxLength={600}
                placeholder={t('form_story_ph')}
                value={form.story}
                onChange={(e) => setField('story', e.target.value)}
              />
            </div>

            {/* ── Animal international ──────────────────────────────── */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded accent-primary"
                  checked={form.is_international}
                  onChange={(e) => setField('is_international', e.target.checked)}
                />
                <div>
                  <p className="text-sm font-semibold text-gray-800">🌍 Cet animal vient de l'étranger</p>
                  <p className="text-xs text-gray-500">Hors Belgique / France — la distance ne s'applique pas</p>
                </div>
              </label>
              {form.is_international && (
                <input
                  type="text"
                  className="input-field"
                  placeholder="Pays d'origine (ex : Roumanie, Espagne…)"
                  value={form.origin_country}
                  onChange={(e) => setField('origin_country', e.target.value)}
                />
              )}
            </div>

            {isEdit && (
              <RadioGroup
                label={t('form_status')}
                name="status"
                options={[
                  { value: 'active',  label: t('val_active') },
                  { value: 'adopted', label: t('val_adopted') },
                ]}
                value={form.status}
                onChange={(v) => setField('status', v)}
              />
            )}
          </div>

          {/* Besoins de l'animal */}
          <div className="card p-5 space-y-4">
            <h2 className="font-bold text-gray-700">
              {t('form_needs_title', { name: form.name || '…' })}
            </h2>

            <RadioGroup
              label={t('form_needs_garden')}
              name="needs_garden"
              options={[
                { value: 'yes',        label: t('val_yes') },
                { value: 'no',         label: t('val_no') },
                { value: 'preferable', label: t('val_preferable') },
              ]}
              value={form.requirements.needs_garden}
              onChange={(v) => setReq('needs_garden', v)}
            />

            <RadioGroup
              label={t('form_needs_children')}
              name="children_compatible"
              options={[
                { value: 'yes', label: t('val_yes') },
                { value: 'no',  label: t('val_no') },
                { value: '6+',  label: '6+' },
                { value: '12+', label: '12+' },
              ]}
              value={form.requirements.children_compatible}
              onChange={(v) => setReq('children_compatible', v)}
            />

            <RadioGroup
              label={t('form_needs_cats')}
              name="cats_compatible"
              options={[
                { value: 'yes',     label: t('val_yes') },
                { value: 'no',      label: t('val_no') },
                { value: 'unknown', label: t('val_unknown') },
              ]}
              value={form.requirements.cats_compatible}
              onChange={(v) => setReq('cats_compatible', v)}
            />

            <RadioGroup
              label={t('form_needs_dogs')}
              name="dogs_compatible"
              options={[
                { value: 'yes',     label: t('val_yes') },
                { value: 'no',      label: t('val_no') },
                { value: 'unknown', label: t('val_unknown') },
              ]}
              value={form.requirements.dogs_compatible}
              onChange={(v) => setReq('dogs_compatible', v)}
            />

            <RadioGroup
              label={t('form_needs_outdoor')}
              name="daily_outdoor_time"
              options={[
                { value: 'yes',   label: t('val_yes') },
                { value: 'no',    label: t('val_no') },
                { value: 'ideal', label: t('val_ideal') },
              ]}
              value={form.requirements.daily_outdoor_time}
              onChange={(v) => setReq('daily_outdoor_time', v)}
            />

            <RadioGroup
              label={t('form_needs_space')}
              name="spacious_home"
              options={[
                { value: 'yes',      label: t('val_yes') },
                { value: 'no',       label: t('val_no') },
                { value: 'flexible', label: t('val_flexible') },
              ]}
              value={form.requirements.spacious_home}
              onChange={(v) => setReq('spacious_home', v)}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('form_special_notes')}
              </label>
              <textarea
                className="input-field resize-none h-20"
                placeholder={t('form_notes_ph')}
                value={form.requirements.special_notes}
                onChange={(e) => setReq('special_notes', e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-2xl">
              {error}
            </div>
          )}

          {success && (
            <motion.div
              className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-2xl text-center font-medium"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {success} 🎉
            </motion.div>
          )}

          <div className="flex gap-3 pb-8">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1 py-4 flex items-center justify-center gap-2 text-base"
            >
              {saving ? (
                <LoadingSpinner size="sm" className="text-white" />
              ) : isEdit ? (
                t('form_save_edit')
              ) : (
                t('form_save_add')
              )}
            </button>

            {!isEdit && (
              <button
                type="button"
                onClick={() => navigate('/shelter/dashboard')}
                className="btn-secondary px-5"
              >
                {t('form_done')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
