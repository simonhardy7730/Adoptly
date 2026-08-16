import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import LoadingSpinner from '../components/LoadingSpinner';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { setCanonical, resetCanonical } from '../lib/seo';
import { thumb } from '../lib/img';

const SPECIES_OPTIONS = [
  { value: 'all', label: 'Tous', emoji: '🐾' },
  { value: 'dog', label: 'Chiens', emoji: '🐕' },
  { value: 'cat', label: 'Chats', emoji: '🐈' },
  { value: 'small_animal', label: 'NAC', emoji: '🐹' },
];

const SPECIES_LABEL = { dog: 'Chien', cat: 'Chat', rabbit: 'Lapin', guinea_pig: 'Cobaye', other: 'Animal' };
const SIZE_LABEL = { small: 'Petit', medium: 'Moyen', large: 'Grand', xlarge: 'Très grand' };

const AGE_OPTIONS = [
  { value: 'all',    label: 'Tout âge', emoji: '🎂' },
  { value: 'baby',   label: 'Bébé',     emoji: '🍼' },
  { value: 'young',  label: 'Jeune',    emoji: '⚡' },
  { value: 'adult',  label: 'Adulte',   emoji: '🐾' },
  { value: 'senior', label: 'Senior',   emoji: '🧡' },
];
const SEX_OPTIONS = [
  { value: 'all',    label: 'Mâle & femelle', emoji: '⚥' },
  { value: 'male',   label: 'Mâle',           emoji: '♂️' },
  { value: 'female', label: 'Femelle',        emoji: '♀️' },
];
const SIZE_OPTIONS = [
  { value: 'all',    label: 'Toutes tailles', emoji: '📏' },
  { value: 'small',  label: 'Petit',  emoji: '🐭' },
  { value: 'medium', label: 'Moyen',  emoji: '🐕' },
  { value: 'large',  label: 'Grand',  emoji: '🦮' },
];

// Ligne de filtre à choix unique (label + pastilles)
function FilterRow({ label, options, value, onSelect }) {
  return (
    <div className="flex items-center gap-2 flex-wrap justify-center">
      <span className="text-xs font-semibold text-gray-400 w-14 text-right">{label}</span>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            value === opt.value
              ? 'bg-secondary text-white shadow-sm'
              : 'bg-white text-gray-500 border border-gray-200 hover:border-secondary hover:text-secondary'
          }`}
        >
          {opt.emoji} {opt.label}
        </button>
      ))}
    </div>
  );
}
function ageBracket(m) {
  if (m == null) return null;
  if (m < 6) return 'baby';
  if (m < 24) return 'young';
  if (m < 84) return 'adult';
  return 'senior';
}
const CATALOG_CACHE_KEY = 'adoptly_catalog_state';

function ageLabel(months) {
  if (!months && months !== 0) return null;
  if (months < 12) return `${months} mois`;
  const y = Math.floor(months / 12);
  return `${y} an${y > 1 ? 's' : ''}`;
}

function AnimalCard({ animal, onNavigate }) {
  const tempLabels = {
    calm: 'Calme', playful: 'Joueur', energetic: 'Énergique', cuddly: 'Câlin',
    affectionate: 'Affectueux', shy: 'Timide', mixed: 'Mixte',
    fearful: 'Craintif', very_fearful: 'Très apeuré', resilient: 'Résilient',
  };
  const tempColors = {
    calm: 'bg-blue-50 text-blue-700', playful: 'bg-yellow-50 text-yellow-700',
    energetic: 'bg-orange-50 text-orange-700', cuddly: 'bg-pink-50 text-pink-700',
    affectionate: 'bg-rose-50 text-rose-700', shy: 'bg-indigo-50 text-indigo-700',
    mixed: 'bg-purple-50 text-purple-700', fearful: 'bg-amber-50 text-amber-700',
    very_fearful: 'bg-red-50 text-red-700', resilient: 'bg-green-50 text-green-700',
  };

  const temps = animal.temperament?.split(',').map(t => t.trim()).filter(Boolean).slice(0, 2) || [];

  return (
    <Link to={`/animal/${animal.id}`} onClick={onNavigate}>
      <motion.div
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="aspect-[4/5] bg-gray-100 overflow-hidden">
          {animal.photo ? (
            <img src={thumb(animal.photo, 400)} alt={animal.name} className="w-full h-full object-cover" style={{ objectPosition: '50% 50%' }} loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl bg-blue-50">
              {SPECIES_OPTIONS.find(s => s.value === animal.species)?.emoji || '🐾'}
            </div>
          )}
        </div>
        <div className="p-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-gray-800 truncate">{animal.name}</h3>
            <div className="flex gap-1 flex-shrink-0">
              {temps.map(tp => (
                <span key={tp} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${tempColors[tp] || 'bg-gray-50 text-gray-600'}`}>
                  {tempLabels[tp] || tp}
                </span>
              ))}
            </div>
          </div>
          <p className="text-gray-400 text-xs truncate">
            {SPECIES_LABEL[animal.species] || animal.species}
            {animal.breed ? ` · ${animal.breed}` : ''}
            {animal.age != null ? ` · ${ageLabel(animal.age)}` : ''}
            {animal.size ? ` · ${SIZE_LABEL[animal.size]}` : ''}
          </p>
          {animal.shelter_name && (
            <p className="text-xs text-gray-400 truncate">
              📍 {animal.shelter_name}{animal.city ? ` — ${animal.city}` : ''}
            </p>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

export default function AnimalCatalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(24);
  const species   = searchParams.get('espece') || 'all';
  const ageFilter = searchParams.get('age')  || 'all';
  const sexFilter = searchParams.get('sexe') || 'all';
  const sizeFilter = searchParams.get('taille') || 'all';

  const { token, role } = useAuth();
  const loggedInAdoptant = (token || localStorage.getItem('token')) && (role || localStorage.getItem('role')) === 'adoptant';

  useEffect(() => () => resetCanonical(), []);

  useEffect(() => {
    document.title = 'Animaux à adopter | Adoptly';
    setCanonical('/animaux');
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    meta.content = 'Découvrez les animaux disponibles à l\'adoption dans nos refuges partenaires. Chiens, chats, NAC — trouvez votre compagnon idéal sur Adoptly.';

    // Restauration : si on revient d'une fiche animal, on remet la liste, le
    // compteur et la position de défilement exactement là où on les avait laissés.
    let restored = false;
    try {
      const raw = sessionStorage.getItem(CATALOG_CACHE_KEY);
      if (raw) {
        const c = JSON.parse(raw);
        if (c.species === species && Array.isArray(c.animals) && c.animals.length) {
          setAnimals(c.animals);
          setVisibleCount(c.visibleCount || 24);
          setLoading(false);
          restored = true;
          requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, c.scrollY || 0)));
        }
      }
    } catch { /* ignore */ }
    sessionStorage.removeItem(CATALOG_CACHE_KEY);

    if (!restored) setLoading(true);
    api.get('/public/animals', { params: { species: species === 'all' ? undefined : species } })
      .then(({ data }) => { setAnimals(data); if (!restored) setVisibleCount(24); })
      .catch(() => { if (!restored) setAnimals([]); })
      .finally(() => setLoading(false));
  }, [species]);

  // Filtres âge / sexe / taille, côté client sur la liste chargée
  const filtered = animals.filter((a) => {
    if (ageFilter  !== 'all' && ageBracket(a.age) !== ageFilter) return false;
    if (sexFilter  !== 'all' && a.sex  !== sexFilter)  return false;
    if (sizeFilter !== 'all' && a.size !== sizeFilter) return false;
    return true;
  });

  function updateParam(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value === 'all' || value === '' || value == null) next.delete(key);
    else next.set(key, value);
    setSearchParams(next);
    setVisibleCount(24);
  }
  function setSpecies(value) { updateParam('espece', value); }
  function setAge(value)     { updateParam('age', value); }
  function setSex(value)     { updateParam('sexe', value); }
  function setSize(value)    { updateParam('taille', value); }
  function resetFilters() { setSearchParams({}); setVisibleCount(24); }

  // Mémorise la position avant d'aller voir une fiche animal
  function saveScrollState() {
    try {
      sessionStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify({ species, animals, visibleCount, scrollY: window.scrollY }));
    } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen bg-bg-light">
      {/* En-tête : menu d'app si connecté, sinon en-tête public */}
      {loggedInAdoptant ? (
        <Navbar />
      ) : (
        <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center group-hover:bg-primary-dark transition-colors">
                <span className="text-white font-black text-sm select-none">A</span>
              </div>
              <span className="font-black text-primary text-lg tracking-tight">Adoptly</span>
            </Link>
            <Link
              to="/adoptant/register"
              className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-primary-dark transition-colors"
            >
              Créer un compte gratuit
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Titre */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800">
            Ils cherchent une famille 🐾
          </h1>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            {animals.length > 0 && !loading
              ? `${filtered.length} ${filtered.length > 1 ? 'animaux' : 'animal'} ${filtered.length !== animals.length ? `sur ${animals.length} ` : ''}dans nos refuges partenaires`
              : 'Découvrez les animaux disponibles à l\'adoption dans nos refuges partenaires'
            }
          </p>
        </div>

        {/* Filtres espèce */}
        <div className="flex justify-center gap-2 mb-4 flex-wrap">
          {SPECIES_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSpecies(opt.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                species === opt.value
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-primary hover:text-primary'
              }`}
            >
              {opt.emoji} {opt.label}
            </button>
          ))}
        </div>

        {/* Filtres avancés : âge · sexe · taille · compatibilité */}
        <div className="max-w-3xl mx-auto mb-6 space-y-2">
          <FilterRow label="Âge" options={AGE_OPTIONS} value={ageFilter} onSelect={setAge} />
          <FilterRow label="Sexe" options={SEX_OPTIONS} value={sexFilter} onSelect={setSex} />
          <FilterRow label="Taille" options={SIZE_OPTIONS} value={sizeFilter} onSelect={setSize} />
          {(ageFilter !== 'all' || sexFilter !== 'all' || sizeFilter !== 'all') && (
            <div className="text-center pt-1">
              <button onClick={resetFilters} className="text-xs text-gray-400 hover:text-primary underline">
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>

        {/* Bannière matching — uniquement pour les visiteurs non connectés */}
        {!loggedInAdoptant && (
          <div className="mb-8 bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-5 text-white flex flex-col sm:flex-row items-center gap-4">
            <div className="text-3xl flex-shrink-0">🧩</div>
            <div className="flex-1 text-center sm:text-left">
              <p className="font-bold text-sm">Parcourir c'est bien. Matcher c'est mieux.</p>
              <p className="text-white/80 text-xs mt-0.5">
                Notre algorithme analyse 14 critères pour vous proposer les animaux vraiment compatibles avec votre mode de vie.
              </p>
            </div>
            <Link
              to="/adoptant/register"
              className="bg-white text-primary font-semibold text-sm px-5 py-2.5 rounded-full hover:bg-gray-50 transition-colors flex-shrink-0"
            >
              Faire le test →
            </Link>
          </div>
        )}

        {/* Grille */}
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <div className="text-5xl">🔍</div>
            <p className="text-gray-500 font-medium">Aucun animal ne correspond à ces filtres</p>
            <button onClick={resetFilters} className="text-secondary text-sm hover:underline">
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.slice(0, visibleCount).map(animal => (
                <AnimalCard key={animal.id} animal={animal} onNavigate={saveScrollState} />
              ))}
            </div>
            {visibleCount < filtered.length && (
              <div className="text-center mt-8">
                <button
                  onClick={() => setVisibleCount(c => c + 24)}
                  className="bg-white text-primary font-semibold px-8 py-3 rounded-full border border-primary hover:bg-primary hover:text-white transition-colors"
                >
                  Voir plus d'animaux ({filtered.length - visibleCount})
                </button>
              </div>
            )}
          </>
        )}

        {/* CTA bas de page — uniquement pour les visiteurs non connectés */}
        {!loading && animals.length > 0 && !loggedInAdoptant && (
          <div className="mt-12 text-center bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Trouvez votre compagnon idéal
            </h2>
            <p className="text-gray-500 text-sm mb-5 max-w-md mx-auto">
              Créez votre profil gratuitement et notre algorithme vous proposera les animaux
              les plus compatibles avec votre mode de vie.
            </p>
            <Link
              to="/adoptant/register"
              className="inline-block bg-primary text-white font-semibold px-8 py-3 rounded-full hover:bg-primary-dark transition-colors"
            >
              Découvrir mes compatibilités →
            </Link>
          </div>
        )}

        {/* CTA refuges */}
        <div className="mt-8 text-center bg-gradient-to-r from-primary/5 to-secondary/5 rounded-2xl p-6 border border-gray-100">
          <p className="text-sm text-gray-600 mb-2">
            Vous êtes un <strong>refuge</strong> ou une <strong>association</strong> ?
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Inscrivez vos animaux gratuitement et trouvez des adoptants compatibles.
          </p>
          <Link
            to="/shelter/register"
            className="inline-block bg-white text-primary font-semibold text-sm px-6 py-2.5 rounded-full border border-primary hover:bg-primary hover:text-white transition-colors"
          >
            Inscrire mon refuge gratuitement
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-300 text-xs pb-6">
          <Link to="/" className="hover:text-gray-400">Accueil</Link>
          {' · '}
          <Link to="/refuges" className="hover:text-gray-400">Nos refuges</Link>
          {' · '}
          <Link to="/adoptions" className="hover:text-gray-400">Adoptions réussies</Link>
          {' · '}
          <Link to="/preparer-adoption" className="hover:text-gray-400">Préparer son adoption</Link>
          {' · '}
          <Link to="/actualites" className="hover:text-gray-400">Actualités</Link>
        </div>
      </div>
    </div>
  );
}
