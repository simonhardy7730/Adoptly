import { useState, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../lib/api';

const SPECIES = ['dog', 'cat', 'rabbit', 'guinea_pig', 'other'];
const SPECIES_LABELS = {
  dog: 'Chien',
  cat: 'Chat',
  rabbit: 'Lapin',
  guinea_pig: "Cochon d'Inde",
  other: 'Autre',
};

const TEMPERAMENTS = ['calm', 'playful', 'energetic', 'mixed'];
const TEMPERAMENT_LABELS = {
  calm: 'Calme',
  playful: 'Joueur',
  energetic: 'Énergique',
  mixed: 'Mixte',
};

const SIZES = ['small', 'medium', 'large'];
const SIZE_LABELS = {
  small: 'Petit',
  medium: 'Moyen',
  large: 'Grand',
};

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
  });

  const [existingPhotos, setExistingPhotos] = useState(existing?.photos || []);
  const [newFiles, setNewFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileRef = useRef();

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
      setError('Maximum 3 photos autorisées');
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
      if (isEdit) formData.append('status', form.status);
      if (isEdit) formData.append('existing_photos', JSON.stringify(existingPhotos));

      newFiles.forEach((f) => formData.append('photos', f));

      if (isEdit) {
        await api.put(`/shelter/animals/${id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setSuccess('Animal mis à jour avec succès !');
      } else {
        await api.post('/shelter/animals', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setSuccess('Animal ajouté avec succès !');
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
      setError(err.response?.data?.error || 'Échec de la sauvegarde. Veuillez réessayer.');
    } finally {
      setSaving(false);
    }
  }

  const storyLength = form.story.length;

  return (
    <div className="min-h-screen bg-bg-light">
      <Navbar />

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 text-lg">
            ←
          </button>
          <h1 className="text-2xl font-extrabold text-primary">
            {isEdit ? "Modifier l'animal" : 'Ajouter un animal'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photos */}
          <div className="card p-5 space-y-3">
            <h2 className="font-bold text-gray-700">Photos (jusqu'à 3)</h2>

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
                  <span className="text-xs">Ajouter</span>
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

          {/* Informations de base */}
          <div className="card p-5 space-y-4">
            <h2 className="font-bold text-gray-700">Informations de base</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom <span className="text-red-400">*</span>
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
              label="Espèce"
              name="species"
              options={SPECIES.map((s) => ({ value: s, label: SPECIES_LABELS[s] }))}
              value={form.species}
              onChange={(v) => setField('species', v)}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Race (facultatif)</label>
              <input
                type="text"
                className="input-field"
                placeholder="Labrador Croisé"
                value={form.breed}
                onChange={(e) => setField('breed', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Âge (en mois)</label>
              <input
                type="number"
                min={0}
                className="input-field"
                placeholder="18"
                value={form.age}
                onChange={(e) => setField('age', e.target.value)}
              />
              <p className="text-gray-400 text-xs mt-1">ex. 6 = 6 mois, 24 = 2 ans</p>
            </div>

            <RadioGroup
              label="Taille"
              name="size"
              options={SIZES.map((s) => ({ value: s, label: SIZE_LABELS[s] }))}
              value={form.size}
              onChange={(v) => setField('size', v)}
            />

            <RadioGroup
              label="Caractère"
              name="temperament"
              options={TEMPERAMENTS.map((t) => ({ value: t, label: TEMPERAMENT_LABELS[t] }))}
              value={form.temperament}
              onChange={(v) => setField('temperament', v)}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Besoins spéciaux</label>
              <textarea
                className="input-field resize-none h-20"
                placeholder="Médicaments, régime alimentaire, etc."
                value={form.special_needs}
                onChange={(e) => setField('special_needs', e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Histoire</label>
                <span className={`text-xs ${storyLength > 180 ? 'text-orange-500' : 'text-gray-400'}`}>
                  {storyLength}/200
                </span>
              </div>
              <textarea
                className="input-field resize-none h-24"
                maxLength={200}
                placeholder="Décrivez la personnalité de cet animal aux futurs adoptants..."
                value={form.story}
                onChange={(e) => setField('story', e.target.value)}
              />
            </div>

            {isEdit && (
              <RadioGroup
                label="Statut"
                name="status"
                options={[
                  { value: 'active', label: 'Actif' },
                  { value: 'adopted', label: 'Adopté' },
                ]}
                value={form.status}
                onChange={(v) => setField('status', v)}
              />
            )}
          </div>

          {/* Besoins de l'animal */}
          <div className="card p-5 space-y-4">
            <h2 className="font-bold text-gray-700">
              De quoi a besoin {form.name || 'cet animal'} ?
            </h2>

            <RadioGroup
              label="Besoin d'un jardin ?"
              name="needs_garden"
              options={[
                { value: 'yes', label: 'Oui' },
                { value: 'no', label: 'Non' },
                { value: 'preferable', label: 'Préférable' },
              ]}
              value={form.requirements.needs_garden}
              onChange={(v) => setReq('needs_garden', v)}
            />

            <RadioGroup
              label="Compatible avec les enfants ?"
              name="children_compatible"
              options={[
                { value: 'yes', label: 'Oui' },
                { value: 'no', label: 'Non' },
                { value: '6+', label: '6 ans +' },
                { value: '12+', label: '12 ans +' },
              ]}
              value={form.requirements.children_compatible}
              onChange={(v) => setReq('children_compatible', v)}
            />

            <RadioGroup
              label="Compatible avec les chats ?"
              name="cats_compatible"
              options={[
                { value: 'yes', label: 'Oui' },
                { value: 'no', label: 'Non' },
                { value: 'unknown', label: 'Inconnu' },
              ]}
              value={form.requirements.cats_compatible}
              onChange={(v) => setReq('cats_compatible', v)}
            />

            <RadioGroup
              label="Compatible avec les chiens ?"
              name="dogs_compatible"
              options={[
                { value: 'yes', label: 'Oui' },
                { value: 'no', label: 'Non' },
                { value: 'unknown', label: 'Inconnu' },
              ]}
              value={form.requirements.dogs_compatible}
              onChange={(v) => setReq('dogs_compatible', v)}
            />

            <RadioGroup
              label="Promenades quotidiennes nécessaires ?"
              name="daily_outdoor_time"
              options={[
                { value: 'yes', label: 'Oui' },
                { value: 'no', label: 'Non' },
                { value: 'ideal', label: 'Idéal' },
              ]}
              value={form.requirements.daily_outdoor_time}
              onChange={(v) => setReq('daily_outdoor_time', v)}
            />

            <RadioGroup
              label="Logement spacieux nécessaire ?"
              name="spacious_home"
              options={[
                { value: 'yes', label: 'Oui' },
                { value: 'no', label: 'Non' },
                { value: 'flexible', label: 'Flexible' },
              ]}
              value={form.requirements.spacious_home}
              onChange={(v) => setReq('spacious_home', v)}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes spéciales pour les adoptants
              </label>
              <textarea
                className="input-field resize-none h-20"
                placeholder="Tout ce que les adoptants devraient savoir..."
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
                'Enregistrer les modifications'
              ) : (
                'Ajouter cet animal 🐾'
              )}
            </button>

            {!isEdit && (
              <button
                type="button"
                onClick={() => navigate('/shelter/dashboard')}
                className="btn-secondary px-5"
              >
                Terminer
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
