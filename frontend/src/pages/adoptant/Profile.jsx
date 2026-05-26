import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../lib/api';

const LABELS = {
  existing_pets:    { none: '🏠 Aucun', dog: '🐕 Un chien', cat: '🐈 Un chat', both: '🐾 Chien et chat', other: '🐹 Autre animal' },
  has_garden:       { yes: '🌳 Jardin', balcony: '🪴 Balcon', no: '🏢 Aucun' },
  housing_size:     { small: '📦 < 40 m²', medium: '🏠 40–80 m²', large: '🏡 80–150 m²', xlarge: '🏘️ > 150 m²' },
  works_outdoor:    { yes: '🏃 Très actif(ve)', flexible: '🚶 Flexible', no: '🛋️ Casanier(ère)' },
  allergies:        { none: '✅ Aucune', cats: '🐈 Chats', dogs: '🐕 Chiens', other: '🤧 Autre' },
  monthly_budget:   { '50-100': '💰 50–100 €', '100-200': '💵 100–200 €', '200+': '💎 200 € +' },
  preferred_animal: { dog: '🐕 Chien', cat: '🐈 Chat', both: '🐾 Chien ou chat', small_animal: '🐹 Petit animal' },
  size_preference:  { small: '🐭 Petit', medium: '🐕 Moyen', large: '🦮 Grand', no_preference: '🤷 Peu importe' },
  age_preference:   { baby: '🍼 Bébé', young: '⚡ Jeune adulte', adult: '🐾 Adulte', senior: '🧡 Senior', no_preference: '🤷 Peu importe' },
  energy_level:     { calm: '😌 Calme', balanced: '🙂 Équilibré(e)', very_energetic: '🤸 Très énergique' },
};

const PREFS = [
  { label: 'Animaux existants',  key: 'existing_pets' },
  { label: 'Espace extérieur',   key: 'has_garden' },
  { label: 'Superficie',         key: 'housing_size' },
  { label: 'Activité',           key: 'works_outdoor' },
  { label: 'Allergies',          key: 'allergies' },
  { label: 'Budget mensuel',     key: 'monthly_budget' },
  { label: 'Animal souhaité',    key: 'preferred_animal' },
  { label: 'Taille préférée',    key: 'size_preference' },
  { label: 'Âge préféré',        key: 'age_preference' },
  { label: "Niveau d'énergie",   key: 'energy_level' },
];

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [firstName, setFirstName]   = useState('');
  const [lastName, setLastName]     = useState('');
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);

  useEffect(() => {
    api.get('/adoptant/profile')
      .then(({ data }) => {
        setProfile(data);
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
      })
      .catch(() => navigate('/adoptant/swipe'))
      .finally(() => setLoading(false));
  }, [navigate]);

  async function saveName() {
    setSaving(true);
    try {
      const { data } = await api.put('/adoptant/profile', { first_name: firstName, last_name: lastName });
      setProfile(data);
      setEditingName(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-bg-light flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );

  const answers    = profile?.questionnaire_answers || {};
  const hasAnswers = Object.keys(answers).length > 0;
  const fullName   = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');
  const initial    = profile?.first_name?.[0]?.toUpperCase()
                  || profile?.email?.[0]?.toUpperCase()
                  || '?';
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="min-h-screen bg-bg-light">
      <Navbar />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Carte identité */}
        <div className="card p-6 flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-secondary to-accent
                          flex items-center justify-center shadow-lg">
            <span className="text-white font-black text-3xl">{initial}</span>
          </div>

          {/* Nom / Prénom */}
          {editingName ? (
            <div className="w-full space-y-2">
              <div className="flex gap-2">
                <input
                  className="input-field flex-1 text-center"
                  placeholder="Prénom"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoFocus
                />
                <input
                  className="input-field flex-1 text-center"
                  placeholder="Nom"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveName}
                  disabled={saving}
                  className="btn-primary flex-1 py-2 text-sm flex items-center justify-center gap-2"
                >
                  {saving ? <LoadingSpinner size="sm" className="text-white" /> : 'Sauvegarder'}
                </button>
                <button
                  onClick={() => { setEditingName(false); setFirstName(profile?.first_name || ''); setLastName(profile?.last_name || ''); }}
                  className="btn-secondary flex-1 py-2 text-sm"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div>
              {fullName ? (
                <p className="font-bold text-primary text-xl">{fullName}</p>
              ) : (
                <p className="text-gray-400 text-sm italic">Aucun nom renseigné</p>
              )}
              <p className="text-gray-400 text-sm mt-1">{profile?.email}</p>
              <p className="text-gray-300 text-xs mt-0.5">Membre depuis {memberSince}</p>
              <button
                onClick={() => setEditingName(true)}
                className="mt-2 text-secondary text-sm font-medium hover:underline"
              >
                ✏️ {fullName ? 'Modifier mon nom' : 'Ajouter mon nom'}
              </button>
            </div>
          )}

          {saved && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-green-500 text-sm font-medium"
            >
              ✓ Sauvegardé !
            </motion.p>
          )}

          <div className="flex gap-2">
            <Link to="/adoptant/matches" className="btn-secondary text-sm py-2 px-4">
              🐾 Mes matchs
            </Link>
            <Link to="/adoptant/swipe" className="btn-primary text-sm py-2 px-4">
              Découvrir →
            </Link>
          </div>
        </div>

        {/* Préférences */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-700">Mes préférences</h2>
            <button
              onClick={() => navigate('/adoptant/questionnaire')}
              className="text-secondary text-sm font-medium hover:underline"
            >
              Modifier ✏️
            </button>
          </div>

          {hasAnswers ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {PREFS.map(({ label, key }) =>
                  answers[key] ? (
                    <div key={key} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-gray-400 text-xs mb-1">{label}</p>
                      <p className="text-gray-700 text-sm font-medium">
                        {LABELS[key]?.[answers[key]] ?? answers[key]}
                      </p>
                    </div>
                  ) : null
                )}
              </div>

              {answers.search_radius_km && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-gray-400 text-xs mb-1">Rayon de recherche</p>
                  <p className="text-gray-700 text-sm font-medium">📍 {answers.search_radius_km} km</p>
                </div>
              )}

              {answers.has_children && answers.children_age && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-gray-400 text-xs mb-1">Enfants</p>
                  <p className="text-gray-700 text-sm font-medium">
                    👶 {{ '<6': 'Moins de 6 ans', '6-12': '6–12 ans', '12+': '12 ans +' }[answers.children_age]}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4 space-y-3">
              <p className="text-gray-400 text-sm">
                Complétez votre profil pour trouver votre animal idéal.
              </p>
              <button
                onClick={() => navigate('/adoptant/questionnaire')}
                className="btn-primary py-3 px-6"
              >
                Compléter mon profil →
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
