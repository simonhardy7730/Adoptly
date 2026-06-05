import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../lib/api';

// Clés de préférences à afficher
const PREF_KEYS = [
  'existing_pets',
  'has_garden',
  'housing_size',
  'works_outdoor',
  'allergies',
  'monthly_budget',
  'preferred_animal',
  'size_preference',
  'age_preference',
  'energy_level',
];

// Carte de traduction : champ → valeur → clé de traduction
const LABEL_MAP = {
  existing_pets:    { none: 'lbl_pets_none', dog: 'lbl_pets_dog', cat: 'lbl_pets_cat', both: 'lbl_pets_both', other: 'lbl_pets_other' },
  has_garden:       { yes: 'lbl_garden_yes', balcony: 'lbl_garden_bal', no: 'lbl_garden_no' },
  housing_size:     { small: 'lbl_house_sm', medium: 'lbl_house_md', large: 'lbl_house_lg', xlarge: 'lbl_house_xl' },
  works_outdoor:    { yes: 'lbl_act_yes', flexible: 'lbl_act_fl', no: 'lbl_act_no' },
  allergies:        { none: 'lbl_alg_none', cats: 'lbl_alg_cats', dogs: 'lbl_alg_dogs', other: 'lbl_alg_other' },
  monthly_budget:   { '50-100': 'lbl_bud_sm', '100-200': 'lbl_bud_md', '200+': 'lbl_bud_lg' },
  preferred_animal: { dog: 'lbl_pref_dog', cat: 'lbl_pref_cat', both: 'lbl_pref_both', small_animal: 'lbl_pref_small' },
  size_preference:  { small: 'lbl_sz_sm', medium: 'lbl_sz_md', large: 'lbl_sz_lg', no_preference: 'lbl_sz_no_pref' },
  age_preference:   { baby: 'lbl_age_baby', young: 'lbl_age_young', adult: 'lbl_age_adult', senior: 'lbl_age_senior', no_preference: 'lbl_age_no_pref' },
  energy_level:     { calm: 'lbl_en_calm', balanced: 'lbl_en_bal', very_energetic: 'lbl_en_high' },
};

const CHILDREN_AGE_KEY = { '<6': 'lbl_lt6', '6-12': 'lbl_6to12', '12+': 'lbl_12plus' };

export default function Profile() {
  const navigate = useNavigate();
  const { t }    = useLanguage();

  const [profile, setProfile]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [firstName, setFirstName]     = useState('');
  const [lastName, setLastName]       = useState('');
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [resetting, setResetting]    = useState(false);
  const [resetDone, setResetDone]    = useState(false);

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
                  placeholder={t('prof_fn_ph')}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoFocus
                />
                <input
                  className="input-field flex-1 text-center"
                  placeholder={t('prof_ln_ph')}
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
                  {saving ? <LoadingSpinner size="sm" className="text-white" /> : t('profile_save')}
                </button>
                <button
                  onClick={() => {
                    setEditingName(false);
                    setFirstName(profile?.first_name || '');
                    setLastName(profile?.last_name || '');
                  }}
                  className="btn-secondary flex-1 py-2 text-sm"
                >
                  {t('profile_cancel')}
                </button>
              </div>
            </div>
          ) : (
            <div>
              {fullName ? (
                <p className="font-bold text-primary text-xl">{fullName}</p>
              ) : (
                <p className="text-gray-400 text-sm italic">{t('prof_no_name')}</p>
              )}
              <p className="text-gray-400 text-sm mt-1">{profile?.email}</p>
              <p className="text-gray-300 text-xs mt-0.5">{t('profile_member_since')} {memberSince}</p>
              <button
                onClick={() => setEditingName(true)}
                className="mt-2 text-secondary text-sm font-medium hover:underline"
              >
                ✏️ {fullName ? t('prof_edit_name') : t('prof_add_name')}
              </button>
            </div>
          )}

          {saved && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-green-500 text-sm font-medium"
            >
              {t('prof_saved')}
            </motion.p>
          )}

          <div className="flex gap-2">
            <Link to="/adoptant/matches" className="btn-secondary text-sm py-2 px-4">
              {t('prof_my_matches')}
            </Link>
            <Link to="/adoptant/swipe" className="btn-primary text-sm py-2 px-4">
              {t('prof_discover')}
            </Link>
          </div>
        </div>

        {/* Réinitialiser le swipe */}
        <div className="card p-5 space-y-3">
          <h2 className="font-bold text-gray-700">🔄 Revoir les animaux</h2>
          <p className="text-gray-400 text-sm">
            Vous avez swipé tous les animaux ? Réinitialisez pour les revoir (vos matchs existants sont conservés).
          </p>
          {resetDone ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-green-500 text-sm font-medium text-center"
            >
              ✅ C'est fait ! Retournez swiper →
            </motion.p>
          ) : (
            <button
              onClick={async () => {
                if (!confirm('Réinitialiser votre historique de swipe ? Vos matchs actuels seront conservés.')) return;
                setResetting(true);
                try {
                  await api.post('/adoptant/reset-swipes');
                  setResetDone(true);
                } catch { /* silent */ }
                setResetting(false);
              }}
              disabled={resetting}
              className="btn-secondary w-full py-3 text-sm flex items-center justify-center gap-2"
            >
              {resetting ? <LoadingSpinner size="sm" /> : '🔄 Réinitialiser mon historique de swipe'}
            </button>
          )}
        </div>

        {/* Préférences */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-700">{t('prof_prefs')}</h2>
            <button
              onClick={() => navigate('/adoptant/questionnaire')}
              className="text-secondary text-sm font-medium hover:underline"
            >
              {t('prof_edit_prefs')}
            </button>
          </div>

          {hasAnswers ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {PREF_KEYS.map((key) =>
                  answers[key] ? (
                    <div key={key} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-gray-400 text-xs mb-1">{t(`pref_${key}`)}</p>
                      <p className="text-gray-700 text-sm font-medium">
                        {LABEL_MAP[key]?.[answers[key]]
                          ? t(LABEL_MAP[key][answers[key]])
                          : answers[key]}
                      </p>
                    </div>
                  ) : null
                )}
              </div>

              {answers.search_radius_km && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-gray-400 text-xs mb-1">{t('prof_radius')}</p>
                  <p className="text-gray-700 text-sm font-medium">📍 {answers.search_radius_km} km</p>
                </div>
              )}

              {answers.has_children && answers.children_age && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-gray-400 text-xs mb-1">{t('prof_children')}</p>
                  <p className="text-gray-700 text-sm font-medium">
                    {t(CHILDREN_AGE_KEY[answers.children_age] || answers.children_age)}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4 space-y-3">
              <p className="text-gray-400 text-sm">{t('prof_no_prefs')}</p>
              <button
                onClick={() => navigate('/adoptant/questionnaire')}
                className="btn-primary py-3 px-6"
              >
                {t('prof_complete')}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
