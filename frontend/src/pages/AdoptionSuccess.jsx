import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';

const SPECIES_EMOJI = { dog:'🐕', cat:'🐈', rabbit:'🐇', guinea_pig:'🐹', other:'🐾' };

function ageLabel(months) {
  if (!months) return '';
  if (months < 12) return `${months} mois`;
  const y = Math.floor(months / 12);
  return `${y} an${y > 1 ? 's' : ''}`;
}

export default function AdoptionSuccess() {
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Adoptions réussies | Adoptly';
    api.get('/public/adopted')
      .then(({ data }) => setAnimals(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => { document.title = 'Adoptly · Adopter un animal en refuge'; };
  }, []);

  return (
    <div className="min-h-screen bg-bg-light">

      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-blue-700 text-white py-16 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link to="/" className="inline-flex items-center gap-2 mb-8 group">
            <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-base">A</span>
            </div>
            <span className="font-black text-white text-xl tracking-tight">Adoptly</span>
          </Link>

          <div className="text-5xl mb-4">💚</div>
          <h1 className="text-3xl font-extrabold mb-3">
            Ils ont trouvé leur famille
          </h1>
          <p className="text-blue-100 text-base max-w-md mx-auto">
            Chaque animal ici a été adopté grâce à Adoptly et à ses refuges partenaires.
            {animals.length > 0 && (
              <span className="block mt-1 font-semibold text-white">
                {animals.length} {animals.length > 1 ? 'animaux adoptés' : 'animal adopté'} 🎉
              </span>
            )}
          </p>
        </motion.div>
      </div>

      {/* Grille des animaux adoptés */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : animals.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🐾</div>
            <p className="text-gray-500 text-lg font-medium">Les premières adoptions arrivent bientôt !</p>
            <p className="text-gray-400 text-sm mt-2">Rejoignez Adoptly pour trouver votre compagnon.</p>
            <Link to="/adoptant/register" className="btn-primary inline-block mt-6 px-8 py-3">
              Trouver mon animal idéal →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {animals.map((animal, i) => (
              <motion.div
                key={animal.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100
                           hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
              >
                {/* Photo */}
                <div className="relative aspect-square bg-gradient-to-br from-blue-50 to-blue-100">
                  {animal.photos?.[0] ? (
                    <img
                      src={animal.photos[0]}
                      alt={animal.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      {SPECIES_EMOJI[animal.species] || '🐾'}
                    </div>
                  )}
                  {/* Badge adopté */}
                  <div className="absolute top-2 right-2 bg-green-500 text-white text-xs
                                  font-bold px-2 py-0.5 rounded-full">
                    Adopté ✓
                  </div>
                </div>

                {/* Infos */}
                <div className="p-3">
                  <p className="font-bold text-gray-900 text-sm">{animal.name}</p>
                  <p className="text-gray-400 text-xs truncate">
                    {animal.breed || animal.species}
                    {animal.age ? ` · ${ageLabel(animal.age)}` : ''}
                  </p>
                  {animal.shelters?.name && (
                    <div className="flex items-center gap-1 mt-1.5">
                      {animal.shelters?.logo_url ? (
                        <img src={animal.shelters.logo_url} alt=""
                          className="w-3.5 h-3.5 rounded-full object-cover flex-shrink-0" />
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

        {/* CTA */}
        <motion.div
          className="text-center mt-16 p-8 bg-white rounded-3xl shadow-sm border border-gray-100"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="text-4xl mb-3">🐾</div>
          <h2 className="text-xl font-extrabold text-primary mb-2">
            Et le vôtre pourrait être le prochain
          </h2>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
            Créez votre profil gratuit et découvrez les animaux compatibles avec votre mode de vie.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/adoptant/register" className="btn-primary px-8 py-3">
              Trouver mon animal idéal →
            </Link>
            <Link to="/" className="btn-secondary px-8 py-3">
              Retour à l'accueil
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
