import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';
import { useLanguage } from '../../context/LanguageContext';
import LoadingSpinner from '../../components/LoadingSpinner';

function getQuestions(t) {
  return [
    {
      id: 'has_children',
      text: t('q1_text'),
      hint: t('q1_hint'),
      type: 'choice',
      options: [
        { value: true,  label: t('val_yes'), emoji: '👶' },
        { value: false, label: t('val_no'),  emoji: '🙅' },
      ],
    },
    {
      id: 'children_age',
      text: t('q2_text'),
      hint: t('q2_hint'),
      type: 'choice',
      showIf: (a) => a.has_children === true,
      options: [
        { value: '<6',  label: t('qopt_child_lt6'),    emoji: '🍼' },
        { value: '6-12',label: t('qopt_child_6to12'),  emoji: '🎒' },
        { value: '12+', label: t('qopt_child_12plus'), emoji: '🎓' },
      ],
    },
    {
      id: 'existing_pets',
      text: t('q3_text'),
      hint: t('q3_hint'),
      type: 'choice',
      options: [
        { value: 'none',  label: t('qopt_pets_none'),  emoji: '🏠' },
        { value: 'dog',   label: t('qopt_pets_dog'),   emoji: '🐕' },
        { value: 'cat',   label: t('qopt_pets_cat'),   emoji: '🐈' },
        { value: 'both',  label: t('qopt_pets_both'),  emoji: '🐾' },
        { value: 'other', label: t('qopt_pets_other'), emoji: '🐹' },
      ],
    },
    {
      id: 'has_garden',
      text: t('q4_text'),
      hint: t('q4_hint'),
      type: 'choice',
      options: [
        { value: 'yes',     label: t('qopt_garden_yes'), emoji: '🌳' },
        { value: 'balcony', label: t('qopt_garden_bal'), emoji: '🪴' },
        { value: 'no',      label: t('qopt_garden_no'),  emoji: '🏢' },
      ],
    },
    {
      id: 'housing_size',
      text: t('q5_text'),
      hint: t('q5_hint'),
      type: 'choice',
      options: [
        { value: 'small',  label: t('qopt_house_sm'), emoji: '📦' },
        { value: 'medium', label: t('qopt_house_md'), emoji: '🏠' },
        { value: 'large',  label: t('qopt_house_lg'), emoji: '🏡' },
        { value: 'xlarge', label: t('qopt_house_xl'), emoji: '🏘️' },
      ],
    },
    {
      id: 'works_outdoor',
      text: t('q6_text'),
      hint: t('q6_hint'),
      type: 'choice',
      options: [
        { value: 'yes',      label: t('qopt_activity_yes'), emoji: '🏃' },
        { value: 'flexible', label: t('qopt_activity_fl'),  emoji: '🚶' },
        { value: 'no',       label: t('qopt_activity_no'),  emoji: '🛋️' },
      ],
    },
    {
      id: 'allergies',
      text: t('q7_text'),
      hint: t('q7_hint'),
      type: 'choice',
      options: [
        { value: 'none',  label: t('qopt_allergy_none'), emoji: '✅' },
        { value: 'cats',  label: t('qopt_allergy_cats'), emoji: '🐈' },
        { value: 'dogs',  label: t('qopt_allergy_dogs'), emoji: '🐕' },
        { value: 'other', label: t('qopt_allergy_oth'),  emoji: '🤧' },
      ],
    },
    {
      id: 'monthly_budget',
      text: t('q8_text'),
      hint: t('q8_hint'),
      type: 'choice',
      options: [
        { value: '50-100',  label: t('qopt_budget_sm'), emoji: '💰' },
        { value: '100-200', label: t('qopt_budget_md'), emoji: '💵' },
        { value: '200+',    label: t('qopt_budget_lg'), emoji: '💎' },
      ],
    },
    {
      id: 'preferred_animal',
      text: t('q9_text'),
      hint: t('q9_hint'),
      type: 'choice',
      options: [
        { value: 'dog',          label: t('qopt_pref_dog'),   emoji: '🐕' },
        { value: 'cat',          label: t('qopt_pref_cat'),   emoji: '🐈' },
        { value: 'both',         label: t('qopt_pref_both'),  emoji: '🐾' },
        { value: 'small_animal', label: t('qopt_pref_small'), emoji: '🐹' },
      ],
    },
    {
      id: 'size_preference',
      text: t('q10_text'),
      hint: t('q10_hint'),
      type: 'choice',
      options: [
        { value: 'small',         label: t('sz_small'),          emoji: '🐭' },
        { value: 'medium',        label: t('sz_medium'),         emoji: '🐕' },
        { value: 'large',         label: t('sz_large'),          emoji: '🦮' },
        { value: 'no_preference', label: t('qopt_size_no_pref'), emoji: '🤷' },
      ],
    },
    {
      id: 'age_preference',
      text: t('q11_text'),
      hint: t('q11_hint'),
      type: 'choice',
      options: [
        { value: 'baby',          label: t('qopt_age_baby'),    emoji: '🍼' },
        { value: 'young',         label: t('qopt_age_young'),   emoji: '⚡' },
        { value: 'adult',         label: t('qopt_age_adult'),   emoji: '🐾' },
        { value: 'senior',        label: t('qopt_age_senior'),  emoji: '🧡' },
        { value: 'no_preference', label: t('qopt_age_no_pref'), emoji: '🤷' },
      ],
    },
    {
      id: 'energy_level',
      text: t('q12_text'),
      hint: t('q12_hint'),
      type: 'choice',
      options: [
        { value: 'calm',          label: t('qopt_energy_calm'),    emoji: '😌' },
        { value: 'balanced',      label: t('qopt_energy_bal'),     emoji: '🙂' },
        { value: 'very_energetic',label: t('qopt_energy_high'),    emoji: '🤸' },
        { value: 'no_preference', label: t('qopt_energy_no_pref'), emoji: '🤷' },
      ],
    },
    {
      id: 'search_radius',
      text: t('q13_text'),
      hint: t('q13_hint'),
      type: 'radius',
    },
    {
      id: 'accepts_international',
      text: 'Êtes-vous ouvert à adopter un animal venant de l\'étranger ?',
      hint: 'Des associations sauvent des animaux en Roumanie, Espagne, etc. Ces animaux correspondent quand même à vos critères, sans contrainte de distance.',
      type: 'choice',
      options: [
        { value: true,  label: 'Oui, pourquoi pas !', emoji: '🌍' },
        { value: false, label: 'Non, merci',           emoji: '🏠' },
      ],
    },
  ];
}

const variants = {
  enter:  (dir) => ({ x: dir > 0 ?  120 : -120, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir) => ({ x: dir > 0 ? -120 :  120, opacity: 0 }),
};

const DEFAULTS = {
  has_children:     false,
  children_age:     'n/a',
  existing_pets:    'none',
  has_garden:       'no',
  housing_size:     'medium',
  works_outdoor:    'flexible',
  allergies:        'none',
  monthly_budget:   '100-200',
  preferred_animal: 'both',
  size_preference:  'no_preference',
  age_preference:   'adult',
  energy_level:     'balanced',
  search_radius_km: 25,
  latitude:         null,
  longitude:        null,
};

export default function Questionnaire() {
  const navigate = useNavigate();
  const { t, lang, setLang } = useLanguage();
  const [answers, setAnswers]             = useState(DEFAULTS);
  const [stepIndex, setStepIndex]         = useState(0);
  const [dir, setDir]                     = useState(1);
  const [geoLoading, setGeoLoading]       = useState(false);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState('');
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [isEditing, setIsEditing]         = useState(false);

  // Charger les réponses existantes pour pré-remplir le formulaire
  useEffect(() => {
    api.get('/adoptant/profile')
      .then(({ data }) => {
        if (data.questionnaire_answers && Object.keys(data.questionnaire_answers).length > 0) {
          setAnswers({ ...DEFAULTS, ...data.questionnaire_answers });
          setIsEditing(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingExisting(false));
  }, []);

  const questions        = getQuestions(t);
  const visibleQuestions = questions.filter((q) => !q.showIf || q.showIf(answers));
  const current          = visibleQuestions[stepIndex];

  // Auto-détecter la position quand on arrive sur l'étape rayon de recherche
  useEffect(() => {
    if (current?.type === 'radius' && !answers.latitude && !geoLoading) {
      detectLocation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.type]);

  const progress = ((stepIndex + 1) / visibleQuestions.length) * 100;
  const isLast   = stepIndex === visibleQuestions.length - 1;

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
      await api.post('/adoptant/questionnaire', answers);
      if (typeof window.gtag === 'function') {
        window.gtag('event', isEditing ? 'questionnaire_updated' : 'questionnaire_complete');
      }
      navigate(isEditing ? '/adoptant/profile' : '/adoptant/swipe');
    } catch (err) {
      setError(err.response?.data?.error || t('q_save_error'));
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
                {t('q_editing')}
              </span>
            )}
            <span className="text-gray-400 text-sm">
              {stepIndex + 1} / {visibleQuestions.length}
            </span>
            {/* Toggle FR / NL */}
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
                  const selected =
                    answers[current.id] === opt.value ||
                    String(answers[current.id]) === String(opt.value);
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
                    {answers.search_radius_km >= 500 ? '∞' : answers.search_radius_km}
                  </span>
                  {answers.search_radius_km < 500 && (
                    <span className="text-gray-500 ml-1">km</span>
                  )}
                </div>
                <input
                  type="range"
                  min={5}
                  max={200}
                  step={5}
                  value={Math.min(answers.search_radius_km, 200)}
                  disabled={answers.search_radius_km >= 500}
                  onChange={(e) =>
                    setAnswers((a) => ({ ...a, search_radius_km: parseInt(e.target.value) }))
                  }
                  className={`w-full accent-secondary ${answers.search_radius_km >= 500 ? 'opacity-30' : ''}`}
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>5 km</span>
                  <span>200 km</span>
                </div>

                {/* Checkbox voir tous les animaux */}
                <button
                  type="button"
                  onClick={() => setAnswers((a) => ({
                    ...a,
                    search_radius_km: a.search_radius_km >= 500 ? 50 : 9999,
                  }))}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 font-medium text-sm transition-colors
                    ${answers.search_radius_km >= 500
                      ? 'border-secondary bg-secondary/10 text-secondary'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-secondary/40'
                    }`}
                >
                  <span>{answers.search_radius_km >= 500 ? '✅' : '🌍'}</span>
                  <span>{t('q_see_all')}</span>
                </button>

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
                      <span>{t('q_detecting')}</span>
                    </>
                  ) : answers.latitude ? (
                    <>{t('q_loc_saved')}</>
                  ) : (
                    <>
                      {t('q_detect_loc')}
                      <span className="ml-1 text-xs bg-secondary text-white px-1.5 py-0.5 rounded-full">
                        {t('q_recommended')}
                      </span>
                    </>
                  )}
                </button>
                {!answers.latitude && !geoLoading && (
                  <p className="text-center text-xs text-gray-400">{t('q_no_loc')}</p>
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
              isEditing ? t('q_save_edit') : t('q_find_animals')
            ) : (
              t('q_next')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
