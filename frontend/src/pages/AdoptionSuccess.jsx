import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { thumb } from '../lib/img';

const SPECIES_LABEL = { dog: 'Chien', cat: 'Chat', rabbit: 'Lapin', guinea_pig: 'Cobaye', other: 'Animal' };

function ageLabel(months) {
  if (!months && months !== 0) return null;
  if (months < 12) return `${months} mois`;
  const y = Math.floor(months / 12);
  return `${y} an${y > 1 ? 's' : ''}`;
}

export default function AdoptionSuccess() {
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Ils ont trouvé leur famille | Adoptly';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    meta.content = 'Découvrez les animaux adoptés grâce à Adoptly et ses refuges partenaires. Chaque adoption est une victoire.';
    api.get('/public/adopted')
      .then(({ data }) => setAnimals(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-bg-light">
      {/* Header navbar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center group-hover:bg-primary-dark transition-colors">
              <span className="text-white font-black text-sm select-none">A</span>
            </div>
            <span className="font-black text-primary text-lg tracking-tight">Adoptly</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/animaux"
              className="hidden sm:inline-block text-sm text-gray-500 hover:text-primary transition-colors px-3 py-1.5"
            >
              Voir les animaux
            </Link>
            <Link
              to="/adoptant/register"
              className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-primary-dark transition-colors"
            >
              Adopter un animal
            </Link>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-4 pt-12 pb-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            {animals.length > 0 && !loading
              ? `${animals.length} adoption${animals.length > 1 ? 's' : ''} réussie${animals.length > 1 ? 's' : ''}`
              : 'Adoptions réussies'
            }
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800">
            Ils ont trouvé leur famille 💚
          </h1>
          <p className="text-gray-500 mt-3 max-w-lg mx-auto">
            Chaque animal sur cette page a été adopté grâce à Adoptly et ses refuges partenaires. Une nouvelle vie commence pour eux.
          </p>
        </motion.div>
      </div>

      {/* Grille */}
      <div className="max-w-5xl mx-auto px-4 pb-12">
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : animals.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <div className="text-5xl">🐾</div>
            <p className="text-gray-500 font-medium text-lg">Les premières adoptions arrivent bientôt !</p>
            <p className="text-gray-400 text-sm">Rejoignez Adoptly pour trouver votre compagnon idéal.</p>
            <Link to="/adoptant/register" className="inline-block mt-4 bg-primary text-white font-semibold px-6 py-3 rounded-full hover:bg-primary-dark transition-colors">
              Trouver mon animal idéal →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {animals.map((animal, i) => (
              <motion.div
                key={animal.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                <div className="relative aspect-square bg-gray-100 overflow-hidden">
                  {animal.photos?.[0] ? (
                    <img
                      src={thumb(animal.photos[0], 400)}
                      alt={animal.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      style={{ objectPosition: '50% 30%' }}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl bg-green-50">
                      {animal.species === 'dog' ? '🐕' : animal.species === 'cat' ? '🐈' : '🐾'}
                    </div>
                  )}
                  <div className="absolute top-2.5 right-2.5 bg-green-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    Adopté
                  </div>
                </div>

                <div className="p-3 space-y-1.5">
                  <h3 className="font-bold text-gray-800 truncate">{animal.name}</h3>
                  <p className="text-gray-400 text-xs truncate">
                    {SPECIES_LABEL[animal.species] || animal.species}
                    {animal.breed ? ` · ${animal.breed}` : ''}
                    {animal.age != null ? ` · ${ageLabel(animal.age)}` : ''}
                  </p>
                  {animal.shelters?.name && (
                    <div className="flex items-center gap-1.5 mt-1">
                      {animal.shelters?.logo_url ? (
                        <img src={animal.shelters.logo_url} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <span className="text-xs">🏠</span>
                      )}
                      <p className="text-gray-400 text-xs truncate">{animal.shelters.name}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Bannière matching */}
        {!loading && animals.length > 0 && (
          <div className="mt-10 bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-5 text-white flex flex-col sm:flex-row items-center gap-4">
            <div className="text-3xl flex-shrink-0">🧩</div>
            <div className="flex-1 text-center sm:text-left">
              <p className="font-bold text-sm">Et le prochain, ce sera peut-être le vôtre.</p>
              <p className="text-white/80 text-xs mt-0.5">
                Créez votre profil gratuit et notre algorithme vous proposera les animaux compatibles avec votre mode de vie.
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

        {/* Footer links */}
        <div className="mt-8 text-center text-gray-300 text-xs pb-6">
          <Link to="/" className="hover:text-gray-400">Accueil</Link>
          {' · '}
          <Link to="/animaux" className="hover:text-gray-400">Animaux à adopter</Link>
          {' · '}
          <Link to="/refuges" className="hover:text-gray-400">Nos refuges</Link>
          {' · '}
          <Link to="/actualites" className="hover:text-gray-400">Actualités</Link>
        </div>
      </div>
    </div>
  );
}
