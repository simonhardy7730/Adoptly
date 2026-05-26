import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';
import LoadingSpinner from '../../components/LoadingSpinner';

const questions = [
  {
    id: 'has_children',
    text: 'Avez-vous des enfants à la maison ?',
    hint: 'Cela nous aide à trouver des animaux adaptés aux enfants',
    type: 'choice',
    options: [
      { value: true, label: 'Oui', emoji: '👶' },
      { value: false, label: 'Non', emoji: '🙅' },
    ],
  },
  {
    id: 'children_age',
    text: 'Quel âge ont vos enfants ?',
    hint: 'Certains animaux s\'adaptent mieux aux enfants plus âgés',
    type: 'choice',
    showIf: (a) => a.has_children === true,
    options: [
      { value: '<6', label: 'Moins de 6 ans', emoji: '🍼' },
      { value: '6-12', label: '6–12 ans', emoji: '🎒' },
      { value: '12+', label: '12 ans et plus', emoji: '🎓' },
    ],
  },
  {
    id: 'existing_pets',
    text: 'Avez-vous déjà des animaux à la maison ?',
    hint: 'Cela nous aide à trouver des animaux compatibles avec les vôtres',
    type: 'choice',
    options: [
      { value: 'none',  label: 'Aucun',         emoji: '🏠' },
      { value: 'dog',   label: 'Un chien',       emoji: '🐕' },
      { value: 'cat',   label: 'Un chat',        emoji: '🐈' },
      { value: 'both',  label: 'Chien et chat',  emoji: '🐾' },
      { value: 'other', label: 'Autre animal',   emoji: '🐹' },
    ],
  },
  {
    id: 'has_garden',
    text: 'Quel espace extérieur avez-vous ?',
    hint: 'Les chiens adorent avoir de l\'espace pour courir',
    type: 'choice',
    options: [
      { value: 'yes', label: 'Jardin', emoji: '🌳' },
      { value: 'balcony', label: 'Balcon', emoji: '🪴' },
      { value: 'no', label: 'Aucun', emoji: '🏢' },
    ],
  },
  {
    id: 'housing_size',
    text: 'Quelle est la superficie de votre logement ?',
    hint: 'La taille compte plus que le type — un grand appart vaut une petite maison !',
    type: 'choice',
    options: [
      { value: 'small',  label: '< 40 m²',      emoji: '📦' },
      { value: 'medium', label: '40 – 80 m²',   emoji: '🏠' },
      { value: 'large',  label: '80 – 150 m²',  emoji: '🏡' },
      { value: 'xlarge', label: '> 150 m²',     emoji: '🏘️' },
    ],
  },
  {
    id: 'works_outdoor',
    text: 'Quel est votre niveau d\'activité ?',
    hint: "Cela nous aide à aligner votre énergie avec les besoins de votre animal",
    type: 'choice',
    options: [
      { value: 'yes', label: 'Très actif(ve)', emoji: '🏃' },
      { value: 'flexible', label: 'Flexible', emoji: '🚶' },
      { value: 'no', label: 'Casanier(ère)', emoji: '🛋️' },
    ],
  },
  {
    id: 'allergies',
    text: 'Des allergies aux animaux ?',
    hint: "Nous nous assurerons que votre match est compatible",
    type: 'choice',
    options: [
      { value: 'none', label: 'Aucune', emoji: '✅' },
      { value: 'cats', label: 'Chats', emoji: '🐈' },
      { value: 'dogs', label: 'Chiens', emoji: '🐕' },
      { value: 'other', label: 'Autre', emoji: '🤧' },
    ],
  },
  {
    id: 'monthly_budget',
    text: 'Quel est votre budget mensuel pour un animal ?',
    hint: 'Inclut la nourriture, les visites vétérinaires et les soins',
    type: 'choice',
    options: [
      { value: '50-100', label: '50–100 €', emoji: '💰' },
      { value: '100-200', label: '100–200 €', emoji: '💵' },
      { value: '200+', label: '200 € et plus', emoji: '💎' },
    ],
  },
  {
    id: 'preferred_animal',
    text: 'Quel type d\'animal recherchez-vous ?',
    hint: "Nous afficherons uniquement les espèces correspondantes",
    type: 'choice',
    options: [
      { value: 'dog', label: 'Chien', emoji: '🐕' },
      { value: 'cat', label: 'Chat', emoji: '🐈' },
      { value: 'both', label: 'Chien ou chat', emoji: '🐾' },
      { value: 'small_animal', label: 'Petit animal', emoji: '🐹' },
    ],
  },
  {
    id: 'size_preference',
    text: 'Taille préférée ?',
    hint: 'Choisissez selon votre espace de vie et votre style de vie',
    type: 'choice',
    options: [
      { value: 'small', label: 'Petit', emoji: '🐭' },
      { value: 'medium', label: 'Moyen', emoji: '🐕' },
      { value: 'large', label: 'Grand', emoji: '🦮' },
      { value: 'no_preference', label: 'Peu importe', emoji: '🤷' },
    ],
  },
  {
    id: 'age_preference',
    text: 'Âge préféré ?',
    hint: 'Chaque étape de vie a son propre charme',
    type: 'choice',
    options: [
      { value: 'baby', label: 'Bébé', emoji: '🍼' },
      { value: 'young', label: 'Jeune adulte', emoji: '⚡' },
      { value: 'adult', label: 'Adulte', emoji: '🐾' },
      { value: 'senior', label: 'Senior', emoji: '🧡' },
    ],
  },
  {
    id: 'energy_level',
    text: 'Quel niveau d\'énergie vous convient le mieux ?',
    hint: 'Votre quotidien influe sur la relation avec votre animal',
    type: 'choice',
    options: [
      { value: 'calm', label: 'Calme et tranquille', emoji: '😌' },
      { value: 'balanced', label: 'Équilibré(e)', emoji: '🙂' },
      { value: 'very_energetic', label: 'Très énergique', emoji: '🤸' },
    ],
  },
  {
    id: 'search_radius',
    text: 'Jusqu\'où êtes-vous prêt(e) à vous déplacer ?',
    hint: "Nous rechercherons des refuges dans ce rayon",
    type: 'radius',
  },
];

const variants = {
  enter: (dir) => ({ x: dir > 0 ? 120 : -120, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -120 : 120, opacity: 0 }),
};

const DEFAULTS = {
  has_children: false,
  children_age: 'n/a',
  existing_pets: 'none',
  has_garden: 'no',
  housing_size: 'medium',
  works_outdoor: 'flexible',
  allergies: 'none',
  monthly_budget: '100-200',
  preferred_animal: 'both',
  size_preference: 'no_preference',
  age_preference: 'adult',
  energy_level: 'balanced',
  search_radius_km: 25,
  latitude: null,
  longitude: null,
};

export default function Questionnaire() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState(DEFAULTS);
  const [stepIndex, setStepIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [geoLoading, setGeoLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Charger les réponses existantes pour pré-remplir le formulaire
  useEffect(() => {
    api.get('/adoptant/profile')
      .then(({ data }) => {
        if (data.questionnaire_answers && Object.keys(data.questionnaire_answers).length > 0) {
          setAnswers({ ...DEFAULTS, ...data.questionnaire_answers });
          setIsEditing(true);
        }
      })
      .catch(() => {}) // silently ignore — on utilise les defaults
      .finally(() => setLoadingExisting(false));
  }, []);

  const visibleQuestions = questions.filter((q) => !q.showIf || q.showIf(answers));
  const current = visibleQuestions[stepIndex];

  // Auto-détecter la position quand on arrive sur l'étape rayon de recherche
  useEffect(() => {
    if (current?.type === 'radius' && !answers.latitude && !geoLoading) {
      detectLocation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.type]);
  const progress = ((stepIndex + 1) / visibleQuestions.length) * 100;
  const isLast = stepIndex === visibleQuestions.length - 1;

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
          latitude: pos.coords.latitude,
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
      // Si c'est une modification → retour au profil, sinon → découvrir les animaux
      navigate(isEditing ? '/adoptant/profile' : '/adoptant/swipe');
    } catch (err) {
      setError(err.response?.data?.error || 'Échec de la sauvegarde. Veuillez réessayer.');
      setSaving(false);
    }
  }

  const currentAnswer = answers[current?.id];
  const hasAnswer = currentAnswer !== undefined && currentAnswer !== null && currentAnswer !== '';

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
                ✏️ Modification
              </span>
            )}
            <span className="text-gray-400 text-sm">
              {stepIndex + 1} / {visibleQuestions.length}
            </span>
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
            key={current?.id}
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
                    <>📍 Position enregistrée ✓</>
                  ) : (
                    <>
                      📍 Détecter ma position
                      <span className="ml-1 text-xs bg-secondary text-white px-1.5 py-0.5 rounded-full">
                        Recommandé
                      </span>
                    </>
                  )}
                </button>
                {!answers.latitude && !geoLoading && (
                  <p className="text-center text-xs text-gray-400">
                    Sans position, nous ne pouvons pas filtrer par distance
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
              isEditing ? 'Sauvegarder les modifications ✓' : 'Trouver mes animaux ✨'
            ) : (
              'Suivant →'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
