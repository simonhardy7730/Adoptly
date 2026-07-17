import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../lib/api';
import { setCanonical, resetCanonical } from '../lib/seo';

const SPECIES_EMOJI = { dog: '🐕', cat: '🐈', rabbit: '🐇', bird: '🐦', guinea_pig: '🐹', other: '🐾' };
const SPECIES_LABEL = { dog: 'Chien', cat: 'Chat', rabbit: 'Lapin', bird: 'Oiseau', guinea_pig: 'Cobaye', other: 'Animal' };
const SIZE_LABEL    = { small: 'Petit', medium: 'Moyen', large: 'Grand', xlarge: 'Très grand' };

function ageLabel(months) {
  if (!months && months !== 0) return 'Âge inconnu';
  if (months < 12) return `${months} mois`;
  const y = Math.floor(months / 12);
  return `${y} an${y > 1 ? 's' : ''}`;
}

function ShareBar({ animal }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `https://adoptly.fr/share/animal/${animal.id}`;
  const text = `${animal.name} cherche une famille ! Découvrez son profil sur Adoptly 🐾`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + '\n' + shareUrl)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex items-center justify-center gap-3">
      <span className="text-xs text-gray-400 mr-1">Partager</span>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-100 transition-colors"
        aria-label="Partager sur WhatsApp"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      </a>
      <a
        href={facebookUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors"
        aria-label="Partager sur Facebook"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
      </a>
      <button
        onClick={copyLink}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
          copied ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
        }`}
        aria-label="Copier le lien"
      >
        {copied ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
        )}
      </button>
    </div>
  );
}

function Lightbox({ photos, startIdx, onClose }) {
  const [idx, setIdx] = useState(startIdx);
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIdx(i => (i + 1) % photos.length);
      if (e.key === 'ArrowLeft') setIdx(i => (i - 1 + photos.length) % photos.length);
    };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [photos.length, onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl z-10">✕</button>
      <img
        src={photos[idx]}
        alt=""
        className="max-h-[90vh] max-w-[95vw] object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
      {photos.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setIdx(i => (i - 1 + photos.length) % photos.length); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/20 text-white text-xl flex items-center justify-center hover:bg-white/30"
          >‹</button>
          <button
            onClick={(e) => { e.stopPropagation(); setIdx(i => (i + 1) % photos.length); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/20 text-white text-xl flex items-center justify-center hover:bg-white/30"
          >›</button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
            {idx + 1} / {photos.length}
          </div>
        </>
      )}
    </motion.div>
  );
}

export default function AnimalPublic() {
  const { id } = useParams();
  const [animal,  setAnimal]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx,  setImgIdx]  = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    api.get(`/public/animals/${id}`)
      .then(({ data }) => {
        setAnimal(data);
        document.title = `${data.name} cherche une famille | Adoptly`;
        setCanonical(`/animal/${id}`);
      })
      .catch((err) => {
        if (err.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
    return () => { document.title = 'Adoptly — Adopter un chien ou un chat en refuge'; resetCanonical(); };
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
        <div className="flex items-center gap-4">
          <Link to="/animaux" className="text-gray-400 text-sm hover:text-primary transition-colors">
            Voir tous les animaux
          </Link>
          <Link to="/adoptant/register" className="text-secondary text-sm font-medium hover:underline">
            Créer un compte →
          </Link>
        </div>
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
                playsInline
                preload="metadata"
                className="w-full h-full object-contain bg-black"
                onEnded={() => setShowVideo(false)}
              />
            ) : photos.length > 0 ? (
              <motion.img
                key={imgIdx}
                src={photos[imgIdx]}
                alt={animal.name}
                className="w-full h-full object-cover object-top cursor-pointer"
                onClick={() => setLightbox(true)}
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
              const TEMP_LABEL = { calm: 'Calme', playful: 'Joueur', energetic: 'Énergique', mixed: 'Mixte', resilient: 'Résilient', cuddly: 'Câlin', affectionate: 'Affectueux', shy: 'Timide', fearful: 'Craintif', very_fearful: 'Très apeuré' };
              const TEMP_COLOR = { calm: 'bg-blue-50 text-blue-700', playful: 'bg-yellow-50 text-yellow-700', energetic: 'bg-orange-50 text-orange-700', mixed: 'bg-purple-50 text-purple-700', resilient: 'bg-green-50 text-green-700', cuddly: 'bg-pink-50 text-pink-700', affectionate: 'bg-rose-50 text-rose-700', shy: 'bg-indigo-50 text-indigo-700', fearful: 'bg-amber-50 text-amber-700', very_fearful: 'bg-red-50 text-red-700' };
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

        {/* Partager */}
        <ShareBar animal={animal} />

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
            <div className="text-4xl">🧩</div>
            <h2 className="font-bold text-gray-800 text-lg">
              Êtes-vous compatibles ?
            </h2>
            <p className="text-gray-500 text-sm">
              Créez votre profil gratuitement et notre algorithme vous dira si {animal.name} correspond à votre mode de vie.
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
              Tester ma compatibilité avec {animal.name} →
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

      {/* Lightbox plein écran */}
      {lightbox && photos.length > 0 && (
        <Lightbox photos={photos} startIdx={imgIdx} onClose={() => setLightbox(false)} />
      )}
    </div>
  );
}
