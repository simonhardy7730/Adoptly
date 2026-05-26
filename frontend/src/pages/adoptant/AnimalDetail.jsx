import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState } from 'react';
import Navbar from '../../components/Navbar';
import api from '../../lib/api';

function ageLabel(months) {
  if (!months) return 'Âge inconnu';
  if (months < 12) return `${months} mois`;
  const y = Math.floor(months / 12);
  return `${y} an${y > 1 ? 's' : ''}`;
}

const TEMPERAMENT = {
  calm: '😌 Calme',
  playful: '🎾 Joueur',
  energetic: '⚡ Énergique',
  mixed: '🙂 Équilibré',
};

const SIZE_LABEL = {
  small: '🐭 Petit',
  medium: '🐕 Moyen',
  large: '🦮 Grand',
};

const SPECIES_EMOJI = {
  dog: '🐕', cat: '🐈', rabbit: '🐇', guinea_pig: '🐹', other: '🐾',
};

export default function AnimalDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { match } = location.state || {};
  const [photoIndex, setPhotoIndex] = useState(0);

  if (!match) {
    return (
      <div className="min-h-screen bg-bg-light flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <div className="text-5xl">😕</div>
          <p className="text-gray-500">Animal introuvable.</p>
          <button onClick={() => navigate('/adoptant/matches')} className="btn-primary px-6 py-2">
            ← Mes matchs
          </button>
        </div>
      </div>
    );
  }

  const animal  = match.animals;
  const shelter = animal?.shelters;
  const photos  = animal?.photos || [];
  const req     = animal?.requirements || {};

  function markContacted() {
    api.patch(`/adoptant/matches/${match.id}/contacted`).catch(() => {});
  }

  return (
    <div className="min-h-screen bg-bg-light">
      <Navbar />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Bouton retour */}
        <button
          onClick={() => navigate('/adoptant/matches')}
          className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors text-sm font-medium"
        >
          ← Retour aux matchs
        </button>

        {/* Galerie photos */}
        <div className="card overflow-hidden">
          <div className="relative w-full bg-blue-50" style={{ paddingBottom: '75%' }}>
            {photos.length > 0 ? (
              <motion.img
                key={photoIndex}
                src={photos[photoIndex]}
                alt={animal?.name}
                className="absolute inset-0 w-full h-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-6xl">
                {SPECIES_EMOJI[animal?.species] || '🐾'}
              </div>
            )}

            {/* Indicateurs photos */}
            {photos.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPhotoIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === photoIndex ? 'bg-white w-4' : 'bg-white/60'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Vignettes */}
          {photos.length > 1 && (
            <div className="flex gap-2 p-3 overflow-x-auto">
              {photos.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setPhotoIndex(i)}
                  className={`w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                    i === photoIndex ? 'border-secondary' : 'border-transparent'
                  }`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Infos principales */}
        <div className="card p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold text-primary">{animal?.name}</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {SPECIES_EMOJI[animal?.species]} {animal?.breed || animal?.species}
                {animal?.age ? ` · ${ageLabel(animal.age)}` : ''}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {animal?.size && (
                <span className="badge bg-blue-50 text-blue-600 text-xs">
                  {SIZE_LABEL[animal.size] || animal.size}
                </span>
              )}
              {animal?.temperament && (
                <span className="badge bg-orange-50 text-orange-600 text-xs">
                  {TEMPERAMENT[animal.temperament] || animal.temperament}
                </span>
              )}
            </div>
          </div>

          {animal?.story && (
            <div>
              <h3 className="font-semibold text-gray-700 text-sm mb-1.5">Son histoire</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{animal.story}</p>
            </div>
          )}

          {animal?.special_needs && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-3">
              <p className="text-yellow-700 text-sm">
                ⚠️ <strong>Besoins spéciaux :</strong> {animal.special_needs}
              </p>
            </div>
          )}
        </div>

        {/* Compatibilités */}
        {(req.children_compatible || req.cats_compatible || req.dogs_compatible ||
          req.needs_garden || req.daily_outdoor_time || req.spacious_home) && (
          <div className="card p-5 space-y-3">
            <h3 className="font-semibold text-gray-700">Compatibilités</h3>
            <div className="grid grid-cols-2 gap-2">
              {req.children_compatible && (
                <CompatBadge
                  label="Enfants"
                  value={req.children_compatible}
                  icons={{ yes: '✅', no: '❌', '6+': '⚠️', '12+': '⚠️' }}
                  texts={{ yes: 'Oui', no: 'Non', '6+': '+ 6 ans', '12+': '+ 12 ans' }}
                />
              )}
              {req.cats_compatible && (
                <CompatBadge
                  label="Avec chats"
                  value={req.cats_compatible}
                  icons={{ yes: '✅', no: '❌', unknown: '❓' }}
                  texts={{ yes: 'Compatible', no: 'Non', unknown: 'Inconnu' }}
                />
              )}
              {req.dogs_compatible && (
                <CompatBadge
                  label="Avec chiens"
                  value={req.dogs_compatible}
                  icons={{ yes: '✅', no: '❌', unknown: '❓' }}
                  texts={{ yes: 'Compatible', no: 'Non', unknown: 'Inconnu' }}
                />
              )}
              {req.needs_garden && (
                <CompatBadge
                  label="Jardin"
                  value={req.needs_garden}
                  icons={{ yes: '🌳', no: '🏢' }}
                  texts={{ yes: 'Nécessaire', no: 'Non requis' }}
                />
              )}
              {req.daily_outdoor_time && (
                <CompatBadge
                  label="Sorties/jour"
                  value={req.daily_outdoor_time}
                  icons={{ yes: '🏃', no: '🛋️' }}
                  texts={{ yes: 'Oui requis', no: 'Non requis' }}
                />
              )}
              {req.spacious_home && (
                <CompatBadge
                  label="Grand logement"
                  value={req.spacious_home}
                  icons={{ yes: '🏡', no: '📦' }}
                  texts={{ yes: 'Nécessaire', no: 'Non requis' }}
                />
              )}
            </div>
          </div>
        )}

        {/* Refuge */}
        {shelter && (
          <div className="card p-5 space-y-3">
            <h3 className="font-semibold text-gray-700">🏠 {shelter.name}</h3>
            {shelter.address && (
              <p className="text-gray-500 text-sm">📍 {shelter.address}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {shelter.phone && (
                <a
                  href={`tel:${shelter.phone}`}
                  onClick={markContacted}
                  className="btn-primary text-sm py-2.5 px-4"
                >
                  📞 Appeler
                </a>
              )}
              {shelter.email && (
                <a
                  href={`mailto:${shelter.email}?subject=Intérêt pour ${animal?.name}&body=Bonjour, je suis intéressé(e) par l'adoption de ${animal?.name} que j'ai découvert sur Adoptly.`}
                  onClick={markContacted}
                  className="btn-secondary text-sm py-2.5 px-4"
                >
                  ✉️ Envoyer un email
                </a>
              )}
              {shelter.address && (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(shelter.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-sm py-2.5 px-4"
                >
                  🗺️ Voir sur la carte
                </a>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function CompatBadge({ label, value, icons, texts }) {
  const icon = icons[value] || '❓';
  const text = texts[value] || value;
  const isPositive = value === 'yes';
  const isNegative = value === 'no';
  return (
    <div className={`rounded-2xl p-3 text-xs ${
      isPositive ? 'bg-green-50' : isNegative ? 'bg-red-50' : 'bg-gray-50'
    }`}>
      <p className="text-gray-400 mb-0.5">{label}</p>
      <p className={`font-semibold ${
        isPositive ? 'text-green-700' : isNegative ? 'text-red-600' : 'text-gray-600'
      }`}>
        {icon} {text}
      </p>
    </div>
  );
}
