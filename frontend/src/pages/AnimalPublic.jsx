import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../lib/api';

const SPECIES_EMOJI = { dog: '🐕', cat: '🐈', rabbit: '🐇', bird: '🐦', guinea_pig: '🐹', other: '🐾' };
const SPECIES_LABEL = { dog: 'Chien', cat: 'Chat', rabbit: 'Lapin', bird: 'Oiseau', guinea_pig: 'Cobaye', other: 'Animal' };
const SIZE_LABEL    = { small: 'Petit', medium: 'Moyen', large: 'Grand', xlarge: 'Très grand' };

function ageLabel(months) {
  if (!months && months !== 0) return 'Âge inconnu';
  if (months < 12) return `${months} mois`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m > 0 ? `${y} an${y > 1 ? 's' : ''} ${m} mois` : `${y} an${y > 1 ? 's' : ''}`;
}

export default function AnimalPublic() {
  const { id } = useParams();
  const [animal,  setAnimal]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx,  setImgIdx]  = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get(`/public/animals/${id}`)
      .then(({ data }) => {
        setAnimal(data);
        document.title = `${data.name} cherche une famille | Adoptly`;
      })
      .catch((err) => {
        if (err.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
    return () => { document.title = 'Adoptly · Adopter un animal en refuge'; };
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-bg-light flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );

  if (notFound || !animal) return (
    <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-6xl">🐾</div>
      <h1 className="text-2xl font-bold text-gray-700">Animal introuvable</h1>
      <p className="text-gray-400 text-sm">Ce lien n'est plus valide ou l'animal a déjà été adopté.</p>
      <Link to="/" className="btn-primary px-6 py-3 mt-2">Retour à l'accueil</Link>
    </div>
  );

  const photos  = animal.photos?.length ? animal.photos : [];
  const emoji       = SPECIES_EMOJI[animal.species] || '🐾';
  const speciesName = SPECIES_LABEL[animal.species] || animal.species;
  const adopted = animal.status === 'adopted';

  // Extraire la ville depuis l'adresse "Rue X, 5000 Namur" → "Namur"
  const city = animal.shelter_address
    ? animal.shelter_address.split(',').pop()?.trim()
    : null;

  return (
    <div className="min-h-screen bg-bg-light">

      {/* Header minimal */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between max-w-lg mx-auto">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center group-hover:bg-primary-dark transition-colors">
            <span className="text-white font-black text-sm select-none">A</span>
          </div>
          <span className="font-black text-primary text-lg tracking-tight">Adoptly</span>
        </Link>
        <Link to="/adoptant/register" className="text-secondary text-sm font-medium hover:underline">
          Créer un compte →
        </Link>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Galerie photos / vidéo */}
        {photos.length > 0 || animal.video_url ? (
          <div className="relative rounded-3xl overflow-hidden bg-gray-100" style={{ aspectRatio: '4/3' }}>
            {showVideo && animal.video_url ? (
              <video
                src={animal.video_url}
                controls
                autoPlay
                className="w-full h-full object-contain bg-black"
                onEnded={() => setShowVideo(false)}
              />
            ) : photos.length > 0 ? (
              <motion.img
                key={imgIdx}
                src={photos[imgIdx]}
                alt={animal.name}
                className="w-full h-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-7xl bg-blue-50">
                {emoji}
              </div>
            )}

            {/* Badge adopté */}
            {adopted && (
              <div className="absolute top-3 left-3 bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full z-10">
                🎉 Déjà adopté
              </div>
            )}

            {/* Bouton vidéo */}
            {animal.video_url && (
              <button
                onClick={() => setShowVideo((v) => !v)}
                className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 bg-black/60 text-white text-xs font-semibold
                           px-3 py-1.5 rounded-full backdrop-blur-sm hover:bg-black/80 transition-colors"
              >
                {showVideo ? '📷 Photos' : '▶ Vidéo'}
              </button>
            )}

            {/* Navigation photos */}
            {!showVideo && photos.length > 1 && (
              <>
                <button
                  onClick={() => setImgIdx((i) => (i - 1 + photos.length) % photos.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                >
                  ‹
                </button>
                <button
                  onClick={() => setImgIdx((i) => (i + 1) % photos.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                >
                  ›
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setImgIdx(i)}
                      className={`w-2 h-2 rounded-full transition-colors ${i === imgIdx ? 'bg-white' : 'bg-white/50'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="rounded-3xl bg-blue-50 flex items-center justify-center text-7xl"
               style={{ aspectRatio: '4/3' }}>
            {emoji}
          </div>
        )}

        {/* Identité */}
        <div className="card p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-800">
                {emoji} {animal.name}
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {speciesName}
                {animal.breed ? ` · ${animal.breed}` : ''}
                {animal.age != null ? ` · ${ageLabel(animal.age)}` : ''}
                {animal.size ? ` · ${SIZE_LABEL[animal.size] || animal.size}` : ''}
              </p>
            </div>
            {animal.shelter_name && (
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-gray-400">Refuge</p>
                <p className="text-sm font-semibold text-primary">{animal.shelter_name}</p>
                {city && <p className="text-xs text-gray-400">📍 {city}</p>}
              </div>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {animal.temperament && animal.temperament.split(',').map((tp) => {
              const key = tp.trim();
              const TEMP_LABEL = { calm: 'Calme', playful: 'Joueur', energetic: 'Énergique', mixed: 'Mixte', resilient: 'Résilient' };
              const TEMP_COLOR = { calm: 'bg-blue-50 text-blue-700', playful: 'bg-yellow-50 text-yellow-700', energetic: 'bg-orange-50 text-orange-700', mixed: 'bg-purple-50 text-purple-700', resilient: 'bg-green-50 text-green-700' };
              return (
                <span key={key} className={`text-xs font-medium px-3 py-1 rounded-full ${TEMP_COLOR[key] || 'bg-blue-50 text-primary'}`}>
                  {TEMP_LABEL[key] || key}
                </span>
              );
            })}
            {animal.special_needs && (
              <span className="bg-orange-50 text-accent text-xs font-medium px-3 py-1 rounded-full">
                ℹ️ Informations importantes
              </span>
            )}
          </div>
        </div>

        {/* Histoire */}
        {animal.story && (
          <div className="card p-5">
            <h2 className="font-bold text-gray-700 mb-2">Mon histoire</h2>
            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{animal.story}</p>
          </div>
        )}

        {/* Besoins spéciaux */}
        {animal.special_needs && (
          <div className="card p-5">
            <h2 className="font-bold text-gray-700 mb-2">ℹ️ Informations importantes</h2>
            <p className="text-gray-600 text-sm leading-relaxed">{animal.special_needs}</p>
          </div>
        )}

        {/* CTA */}
        {!adopted ? (
          <div className="card p-6 text-center space-y-3">
            <div className="text-4xl">💚</div>
            <h2 className="font-bold text-gray-800 text-lg">
              {animal.name} vous attend !
            </h2>
            <p className="text-gray-500 text-sm">
              Créez un compte gratuit pour découvrir si {animal.name} est compatible avec votre mode de vie.
            </p>
            <Link
              to={`/adoptant/register`}
              className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2"
              onClick={() => {
                if (typeof window.gtag === 'function') {
                  window.gtag('event', 'cta_public_animal', { animal_id: animal.id, animal_name: animal.name });
                }
              }}
            >
              Je veux adopter {animal.name} →
            </Link>
            <p className="text-gray-400 text-xs">
              Déjà membre ?{' '}
              <Link to="/adoptant/login" className="text-secondary hover:underline">Se connecter</Link>
            </p>
          </div>
        ) : (
          <div className="card p-6 text-center space-y-3">
            <div className="text-4xl">🎉</div>
            <h2 className="font-bold text-gray-700 text-lg">{animal.name} a trouvé sa famille !</h2>
            <p className="text-gray-500 text-sm">
              Mais de nombreux animaux attendent encore leur famille idéale.
            </p>
            <Link to="/adoptant/register" className="btn-primary w-full py-4 text-base">
              Découvrir d'autres animaux →
            </Link>
          </div>
        )}

        {/* Footer léger */}
        <p className="text-center text-gray-300 text-xs pb-4">
          Adoptly — Adoption animale responsable
        </p>

      </div>
    </div>
  );
}
