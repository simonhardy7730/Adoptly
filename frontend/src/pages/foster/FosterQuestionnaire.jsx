import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';
import { useLanguage } from '../../context/LanguageContext';
import LoadingSpinner from '../../components/LoadingSpinner';

const variants = {
  enter:  (dir) => ({ x: dir > 0 ?  120 : -120, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir) => ({ x: dir > 0 ? -120 :  120, opacity: 0 }),
};

const STEPS = [
  {
    id: 'preferred_animal',
    text: 'Quel animal souhaitez-vous accueillir ?',
    hint: 'Choisissez l\'espèce qui vous correspond le mieux.',
    type: 'choice',
    options: [
      { value: 'dog',          label: 'Chien',          emoji: '🐕' },
      { value: 'cat',          label: 'Chat',           emoji: '🐈' },
      { value: 'small_animal', label: 'Petit animal',   emoji: '🐹' },
      { value: 'all',          label: 'Peu importe',    emoji: '🐾' },
    ],
  },
  {
    id: 'max_duration',
    text: 'Combien de temps êtes-vous disponible ?',
    hint: 'La durée maximale pendant laquelle vous pouvez accueillir un animal.',
    type: 'choice',
    options: [
      { value: '1-2_weeks', label: '1 à 2 semaines', emoji: '📅' },
      { value: '1_month',   label: '1 mois',         emoji: '🗓️' },
      { value: '3_months',  label: '3 mois',         emoji: '🌿' },
      { value: 'unlimited', label: 'Sans limite',    emoji: '♾️' },
    ],
  },
  {
    id: 'existing_pets',
    text: 'Avez-vous déjà des animaux ?',
    hint: 'Cela nous aide à trouver des animaux compatibles avec votre foyer.',
    type: 'choice',
    options: [
      { value: 'none', label: 'Aucun',        emoji: '🏠' },
      { value: 'cat',  label: 'Un chat',      emoji: '🐈' },
      { value: 'dog',  label: 'Un chien',     emoji: '🐕' },
      { value: 'both', label: 'Chat et chien', emoji: '🐾' },
    ],
  },
  {
    id: 'has_garden',
    text: 'Avez-vous un jardin ?',
    hint: 'Certains animaux ont besoin d\'un espace extérieur.',
    type: 'choice',
    options: [
      { value: 'yes', label: 'Oui, un jardin', emoji: '🌳' },
      { value: 'no',  label: 'Non',            emoji: '🏢' },
    ],
  },
  {
    id: 'experience',
    text: 'Votre expérience avec les animaux ?',
    hint: 'Soyez honnête, cela nous aide à proposer les bons animaux.',
    type: 'choice',
    options: [
      { value: 'beginner',    label: 'Débutant(e)',  emoji: '🌱' },
      { value: 'experienced', label: 'Expérimenté(e)', emoji: '🌟' },
    ],
  },
  {
    id: 'can_handle_special_needs',
    text: 'Pouvez-vous administrer des médicaments ou soins spéciaux ?',
    hint: 'Certains animaux nécessitent des soins réguliers.',
    type: 'choice',
    options: [
      { value: 'yes', label: 'Oui', emoji: '💊' },
      { value: 'no',  label: 'Non', emoji: '🙅' },
    ],
  },
  {
    id: 'can_handle_babies',
    text: 'Pouvez-vous accueillir de très jeunes animaux (biberon) ?',
    hint: 'Les nouveau-nés nécessitent des soins toutes les quelques heures.',
    type: 'choice',
    options: [
      { value: 'yes', label: 'Oui', emoji: '🍼' },
      { value: 'no',  label: 'Non', emoji: '🙅' },
    ],
  },
  {
    id: 'search_radius',
    text: 'Votre adresse (pour calculer la distance)',
    hint: 'Nous localisons les animaux proches de chez vous.',
    type: 'radius',
  },
];

const DEFAULTS = {
  preferred_animal:       'all',
  max_duration:           '1_month',
  existing_pets:          'none',
  has_garden:             'no',
  experience:             'beginner',
  can_handle_special_needs: 'no',
  can_handle_babies:      'no',
  search_radius_km:       50,
  latitude:               null,
  longitude:              null,
};

export default function FosterQuestionnaire() {
  const navigate = useNavigate();
  const { lang, setLang } = useLanguage();
  const [answers, setAnswers]             = useState(DEFAULTS);
  const [stepIndex, setStepIndex]         = useState(0);
  const [dir, setDir]                     = useState(1);
  const [geoLoading, setGeoLoading]       = useState(false);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState('');
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [isEditing, setIsEditing]         = useState(false);

  useEffect(() => {
    api.get('/foster/profile')
      .then(({ data }) => {
        if (data.questionnaire_answers && Object.keys(data.questionnaire_answers).length > 0) {
          setAnswers({ ...DEFAULTS, ...data.questionnaire_answers });
          setIsEditing(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingExisting(false));
  }, []);

  const current  = STEPS[stepIndex];
  const progress = ((stepIndex + 1) / STEPS.length) * 100;
  const isLast   = stepIndex === STEPS.length - 1;

  useEffect(() => {
    if (current?.type === 'radius' && !answers.latitude && !geoLoading) {
      detectLocation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.type]);

  function selectOption(value) {
    setAnswers((a) => ({ ...a, [current.id]: value }));
  }

  function goNext() {
    if (isLast) return submit();
    setDir(1);
    setStepIndex((i) => i + 1);
  }

  function goPrev() {
    if (stepIndex === 0) return;
    setDir(-1);
    setStepIndex((i) => i - 1);
  }

  function detectLocation() {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setAnswers((a) => ({
          ...a,
          latitude:  pos.coords.latitude,
          longitude: pos.coords.longitude,
        }));
        setGeoLoading(false);
      },
      () => setGeoLoading(false)
    );
  }

  async function submit() {
    setSaving(true);
    setError('');
    try {
      await api.post('/foster/questionnaire', answers);
      navigate(isEditing ? '/famille-accueil/swipe' : '/famille-accueil/swipe');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la sauvegarde.');
      setSaving(false);
    }
  }

  const currentAnswer = answers[current?.id];
  const hasAnswer     = currentAnswer !== undefined && currentAnswer !== null && currentAnswer !== '';

  if (loadingExisting) {
    return (
      <div className="min-h-screen bg-bg-light flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-light flex flex-col">
      {/* En-tête */}
      <div className="p-4 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm leading-none select-none">A</span>
            </div>
            <span className="font-black text-primary text-lg tracking-tight">Adoptly</span>
          </div>
          <div className="flex items-center gap-3">
            {isEditing && (
              <span className="text-xs text-secondary font-medium bg-secondary/10 px-2 py-1 rounded-full">
                Modification
              </span>
            )}
            <span className="text-gray-400 text-sm">
              {stepIndex + 1} / {STEPS.length}
            </span>
            <button
              onClick={() => setLang(lang === 'fr' ? 'nl' : 'fr')}
              className="text-xs font-bold px-2 py-1 rounded-lg border border-gray-200
                         text-gray-500 hover:border-secondary hover:text-secondary transition-colors"
            >
              {lang === 'fr' ? 'NL' : 'FR'}
            </button>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-secondary to-accent rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Zone de question */}
      <div className="flex-1 flex flex-col justify-center px-6 max-w-lg mx-auto w-full overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={`${current?.id}-${lang}`}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-primary">{current?.text}</h2>
              {current?.hint && (
                <p className="text-gray-500 text-sm">{current.hint}</p>
              )}
            </div>

            {current?.type === 'choice' && (
              <div className="grid grid-cols-2 gap-3">
                {current.options.map((opt) => {
                  const selected = answers[current.id] === opt.value;
                  return (
                    <button
                      key={String(opt.value)}
                      onClick={() => selectOption(opt.value)}
                      className={`
                        flex flex-col items-center gap-2 p-4 rounded-2xl border-2 font-medium
                        transition-all duration-150 active:scale-95
                        ${selected
                          ? 'border-secondary bg-secondary/10 text-secondary shadow-md'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-secondary/40'
                        }
                      `}
                    >
                      <span className="text-3xl">{opt.emoji}</span>
                      <span className="text-sm">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {current?.type === 'radius' && (
              <div className="space-y-4">
                <div className="text-center">
                  <span className="text-4xl font-extrabold text-primary">
                    {answers.search_radius_km}
                  </span>
                  <span className="text-gray-500 ml-1">km</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={200}
                  step={5}
                  value={answers.search_radius_km}
                  onChange={(e) =>
                    setAnswers((a) => ({ ...a, search_radius_km: parseInt(e.target.value) }))
                  }
                  className="w-full accent-secondary"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>5 km</span>
                  <span>200 km</span>
                </div>

                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={geoLoading || !!answers.latitude}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 font-medium text-sm transition-colors
                    ${answers.latitude
                      ? 'border-green-300 bg-green-50 text-green-600 cursor-default'
                      : 'border-dashed border-secondary text-secondary hover:bg-secondary/5'
                    }`}
                >
                  {geoLoading ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Détection en cours…</span>
                    </>
                  ) : answers.latitude ? (
                    <>Position enregistrée</>
                  ) : (
                    <>
                      Détecter ma position
                      <span className="ml-1 text-xs bg-secondary text-white px-1.5 py-0.5 rounded-full">
                        Recommandé
                      </span>
                    </>
                  )}
                </button>
                {!answers.latitude && !geoLoading && (
                  <p className="text-center text-xs text-gray-400">
                    Sans position, nous ne pouvons pas filtrer par distance.
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="p-6 max-w-lg mx-auto w-full space-y-3">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-2xl text-center">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          {stepIndex > 0 && (
            <button onClick={goPrev} className="btn-secondary flex-shrink-0 px-5 py-3 text-sm">
              ←
            </button>
          )}
          <button
            onClick={goNext}
            disabled={saving || (current?.type === 'choice' && !hasAnswer)}
            className="btn-primary flex-1 py-4 flex items-center justify-center gap-2 text-base"
          >
            {saving ? (
              <LoadingSpinner size="sm" className="text-white" />
            ) : isLast ? (
              isEditing ? 'Enregistrer les modifications' : 'Voir les animaux disponibles'
            ) : (
              'Continuer →'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
