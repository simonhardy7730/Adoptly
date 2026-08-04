import { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import PhotoLightbox from './PhotoLightbox';
import { thumb } from '../lib/img';

const SPECIES_EMOJI = {
  dog: '🐕',
  cat: '🐈',
  rabbit: '🐇',
  guinea_pig: '🐹',
  other: '🐾',
};

// Drapeau du pays d'origine (animaux internationaux)
const COUNTRY_FLAG = {
  'Roumanie': '🇷🇴', 'Canada': '🇨🇦', 'Espagne': '🇪🇸', 'Grèce': '🇬🇷',
  'Portugal': '🇵🇹', 'Albanie': '🇦🇱', 'Serbie': '🇷🇸', 'Guadeloupe': '🇬🇵',
  'France': '🇫🇷', 'Belgique': '🇧🇪', 'Bulgarie': '🇧🇬', 'Italie': '🇮🇹',
};
const flagFor = (country) => COUNTRY_FLAG[country] || '🌍';

const TEMPERAMENT_LABEL = {
  calm: 'Calme',
  playful: 'Joueur',
  energetic: 'Énergique',
  cuddly: 'Câlin',
  affectionate: 'Affectueux',
  mixed: 'Mixte',
  resilient: 'Résilient',
  shy: 'Timide',
  fearful: 'Craintif',
  very_fearful: 'Très apeuré',
};

const TEMPERAMENT_COLOR = {
  calm: 'bg-blue-100 text-blue-700',
  playful: 'bg-yellow-100 text-yellow-700',
  energetic: 'bg-orange-100 text-orange-700',
  cuddly: 'bg-pink-100 text-pink-700',
  affectionate: 'bg-rose-100 text-rose-700',
  mixed: 'bg-purple-100 text-purple-700',
  resilient: 'bg-green-100 text-green-700',
  shy: 'bg-indigo-100 text-indigo-700',
  fearful: 'bg-amber-100 text-amber-700',
  very_fearful: 'bg-red-100 text-red-700',
};

function ageLabel(months) {
  if (!months) return 'Âge inconnu';
  if (months < 12) return `${months} mois`;
  const y = Math.floor(months / 12);
  return `${y} an${y > 1 ? 's' : ''}`;
}

const STORY_THRESHOLD = 90; // nb de caractères avant le "Lire plus"

const FOSTER_REASON_LABEL = {
  recovery: 'Convalescence', stress: 'Stress refuge',
  young: 'Trop jeune', overflow: 'Surpopulation',
};

function shareAnimal(animal) {
  const age   = animal.age < 12 ? `${animal.age} mois` : `${Math.floor(animal.age / 12)} an(s)`;
  const story = animal.story ? `\n\n"${animal.story.slice(0, 120)}${animal.story.length > 120 ? '…' : ''}"` : '';
  const shareUrl = `https://adoptly.fr/share/animal/${animal.id}`;
  const text  = `🐾 ${animal.name} cherche une famille !\n${animal.breed || animal.species} · ${age} · ${animal.shelters?.name || 'Refuge partenaire'}${story}\n\nPeut-être votre futur compagnon ? 👉`;

  if (navigator.share) {
    navigator.share({ title: `${animal.name} cherche une famille`, text, url: shareUrl }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(text + ' ' + shareUrl)
      .then(() => alert('Lien copié ! Colle-le sur Facebook ou WhatsApp 👍'));
  }
}

export default function SwipeCard({ animal, onSwipe, isTop, stackIndex = 0 }) {
  const x         = useMotionValue(0);
  const rotate    = useTransform(x, [-250, 250], [-18, 18]);
  const loveOpacity = useTransform(x, [20, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, -20], [1, 0]);
  const cardOpacity = useTransform(x, [-350, -200, 0, 200, 350], [0, 1, 1, 1, 0]);
  const dragging  = useRef(false);

  // ── Photo carousel ────────────────────────────────────────────────────────
  const photos    = animal.photos?.length > 0 ? animal.photos : [null];
  const [photoIdx, setPhotoIdx] = useState(0);

  function goNext(e) {
    e.stopPropagation();
    if (dragging.current) return;
    setPhotoIdx((i) => Math.min(i + 1, photos.length - 1));
  }
  function goPrev(e) {
    e.stopPropagation();
    if (dragging.current) return;
    setPhotoIdx((i) => Math.max(i - 1, 0));
  }

  // ── Lightbox plein écran ─────────────────────────────────────────────────
  const [lightbox, setLightbox] = useState(false);

  // ── Vidéo ────────────────────────────────────────────────────────────────
  const [showVideo, setShowVideo] = useState(false);

  // ── Description ──────────────────────────────────────────────────────────
  const [expanded, setExpanded] = useState(false);
  const story       = animal.story || '';
  const isLong      = story.length > STORY_THRESHOLD;
  const displayedStory = expanded || !isLong
    ? story
    : story.slice(0, STORY_THRESHOLD).trimEnd() + '…';

  // ── Swipe drag ───────────────────────────────────────────────────────────
  async function handleDragEnd(_, info) {
    dragging.current = false;
    const threshold    = 100;
    const velThreshold = 600;
    const goRight = info.offset.x > threshold  || info.velocity.x > velThreshold;
    const goLeft  = info.offset.x < -threshold || info.velocity.x < -velThreshold;

    if (goRight) {
      await animate(x, 1400, { duration: 0.25, ease: 'easeOut' });
      onSwipe('right');
    } else if (goLeft) {
      await animate(x, -1400, { duration: 0.25, ease: 'easeOut' });
      onSwipe('left');
    } else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
    }
  }

  const photo       = photos[photoIdx];
  const scaleOffset = 1 - stackIndex * 0.04;
  const yOffset     = stackIndex * 10;

  return (
    <>
    <motion.div
      className="absolute inset-0 no-select"
      style={{
        x:       isTop ? x : 0,
        rotate:  isTop ? rotate : 0,
        opacity: isTop ? cardOpacity : 1,
        scale:   scaleOffset,
        y:       yOffset,
        zIndex:  10 - stackIndex,
        touchAction: isTop ? 'none' : 'auto',
      }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragStart={() => { dragging.current = true; }}
      onDragEnd={isTop ? handleDragEnd : undefined}
      whileTap={isTop ? { cursor: 'grabbing' } : {}}
    >
      <div className="w-full h-full bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col">

        {/* ── Zone photo / vidéo ──────────────────────────────────────── */}
        <div className="relative flex-1 min-h-0 bg-gradient-to-br from-blue-100 to-blue-50">
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
          ) : photo ? (
            <img
              src={thumb(photo, 700)}
              alt={animal.name}
              className="w-full h-full object-cover cursor-zoom-in"
              draggable={false}
              onClick={(e) => {
                if (dragging.current) return;
                e.stopPropagation();
                setLightbox(true);
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-8xl">{SPECIES_EMOJI[animal.species] || '🐾'}</span>
            </div>
          )}

          {/* Boutons vidéo + partage */}
          {isTop && (
            <div className="absolute bottom-4 left-4 right-4 z-30 flex items-center justify-between">
              {animal.video_url ? (
                <button
                  className="flex items-center gap-1.5 bg-black/60 text-white text-xs font-semibold
                             px-3 py-1.5 rounded-full backdrop-blur-sm hover:bg-black/80 transition-colors"
                  onClick={(e) => { e.stopPropagation(); setShowVideo((v) => !v); }}
                >
                  {showVideo ? '📷 Photos' : '▶ Vidéo'}
                </button>
              ) : <div />}
              <button
                className="flex items-center gap-1.5 bg-black/60 text-white text-xs font-semibold
                           px-3 py-1.5 rounded-full backdrop-blur-sm hover:bg-black/80 transition-colors"
                onClick={(e) => { e.stopPropagation(); shareAnimal(animal); }}
              >
                🔗 Partager
              </button>
            </div>
          )}

          {/* Zones de navigation photos (gauche / droite) */}
          {isTop && photos.length > 1 && (
            <>
              <div
                className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-pointer"
                onClick={goPrev}
              />
              <div
                className="absolute inset-y-0 right-0 w-1/3 z-20 cursor-pointer"
                onClick={goNext}
              />
            </>
          )}

          {/* Indicateurs de swipe (love / nope) */}
          {isTop && (
            <>
              <motion.div
                className="absolute top-6 left-6 text-5xl drop-shadow-lg pointer-events-none"
                style={{ opacity: loveOpacity }}
              >
                💚
              </motion.div>
              <motion.div
                className="absolute top-6 right-6 text-5xl drop-shadow-lg pointer-events-none"
                style={{ opacity: nopeOpacity }}
              >
                👋
              </motion.div>
            </>
          )}

          {/* Badge distance ou international */}
          {animal.is_international ? (
            <div className="absolute top-4 right-4 bg-blue-600/80 text-white text-xs font-semibold
                            px-2.5 py-1 rounded-full backdrop-blur-sm pointer-events-none">
              {flagFor(animal.origin_country)} {animal.origin_country || 'Étranger'}
            </div>
          ) : animal.distance != null && (
            <div className="absolute top-4 right-4 bg-black/40 text-white text-xs font-semibold
                            px-2.5 py-1 rounded-full backdrop-blur-sm pointer-events-none">
              📍 {animal.distance} km
            </div>
          )}

          {/* Dots indicateurs de photos */}
          {photos.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
              {photos.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    i === photoIdx
                      ? 'w-4 bg-white'
                      : 'w-1.5 bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Infos ───────────────────────────────────────────────────── */}
        <div className="p-5 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-2xl font-bold text-primary leading-tight">{animal.name}</h2>
              <p className="text-gray-500 text-sm">
                {animal.breed || animal.species} · {ageLabel(animal.age)}
              </p>
            </div>
            {animal.temperament && (
              <div className="flex flex-wrap gap-1 mt-1">
                {animal.temperament.split(',').map(t => t.trim()).filter(Boolean).map(tp => (
                  <span key={tp} className={`badge text-xs ${TEMPERAMENT_COLOR[tp] || 'bg-gray-100 text-gray-600'}`}>
                    {TEMPERAMENT_LABEL[tp] || tp}
                  </span>
                ))}
              </div>
            )}
          </div>

          {story && (
            <div>
              <p className="text-gray-600 text-sm leading-relaxed">{displayedStory}</p>
              {isLong && (
                <button
                  className="text-secondary text-xs font-semibold mt-0.5 hover:underline"
                  onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
                >
                  {expanded ? 'Lire moins ↑' : 'Lire plus ↓'}
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-1.5">
            {animal.shelters?.logo_url ? (
              <img src={animal.shelters.logo_url} alt=""
                className="w-5 h-5 rounded-full object-cover border border-gray-100" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-secondary
                              flex items-center justify-center flex-shrink-0">
                <span className="text-white font-black text-[8px]">
                  {animal.shelters?.name?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
            )}
            <p className="text-gray-400 text-xs font-medium">{animal.shelters?.name}</p>
          </div>
        </div>
      </div>
    </motion.div>

    {/* Lightbox plein écran */}
    {lightbox && photos.filter(Boolean).length > 0 && (
      <PhotoLightbox
        photos={photos.filter(Boolean)}
        initialIndex={photoIdx}
        onClose={() => setLightbox(false)}
      />
    )}
    </>
  );
}
