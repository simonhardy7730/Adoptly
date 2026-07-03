import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../lib/api';

const SPECIES_EMOJI = { dog: '🐕', cat: '🐈', rabbit: '🐇', guinea_pig: '🐹', other: '🐾' };
const SPECIES_LABEL = { dog: 'Chiens', cat: 'Chats', rabbit: 'Lapins', guinea_pig: 'Cobayes', other: 'Autres' };

export default function ShelterPublic() {
  const { id } = useParams();
  const [shelter, setShelter]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState(0);

  useEffect(() => {
    api.get(`/public/shelters/${id}`)
      .then(({ data }) => {
        setShelter(data);
        document.title = `${data.name} | Adoptly`;
      })
      .catch((err) => {
        if (err.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
    return () => { document.title = 'Adoptly - Adopter un animal en refuge'; };
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-bg-light flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );

  if (notFound || !shelter) return (
    <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-6xl">🏠</div>
      <h1 className="text-2xl font-bold text-gray-700">Refuge introuvable</h1>
      <p className="text-gray-400 text-sm">Ce refuge n'existe pas ou n'est plus partenaire.</p>
      <Link to="/refuges" className="btn-primary px-6 py-3 mt-2">Voir tous les refuges</Link>
    </div>
  );

  const memberSince = shelter.created_at
    ? new Date(shelter.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : null;

  const gallery = shelter.gallery || [];

  return (
    <div className="min-h-screen bg-bg-light">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center group-hover:bg-primary-dark transition-colors">
              <span className="text-white font-black text-sm select-none">A</span>
            </div>
            <span className="font-black text-primary text-lg tracking-tight">Adoptly</span>
          </Link>
          <Link to="/adoptant/register" className="btn-primary text-sm py-1.5 px-4">
            Adopter un animal →
          </Link>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* En-tête refuge */}
        <motion.div
          className="card p-6 text-center space-y-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Logo */}
          {shelter.logo_url ? (
            <img
              src={shelter.logo_url}
              alt={shelter.name}
              className="w-20 h-20 rounded-full object-cover mx-auto shadow-lg border-2 border-white"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary
                            flex items-center justify-center mx-auto shadow-lg">
              <span className="text-white font-black text-3xl">
                {shelter.name?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
          )}

          <div>
            <h1 className="text-2xl font-extrabold text-primary">{shelter.name}</h1>
            {shelter.siret && (
              <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1 rounded-full mt-2 border border-green-200">
                <span>✅</span> Association vérifiée
              </div>
            )}
            {shelter.city && (
              <p className="text-gray-500 text-sm mt-1">📍 {shelter.address || shelter.city}</p>
            )}
            {memberSince && (
              <p className="text-gray-400 text-xs mt-1">Partenaire depuis {memberSince}</p>
            )}
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-extrabold text-primary">{shelter.animal_count}</p>
              <p className="text-gray-500 text-xs">
                {shelter.animal_count > 1 ? 'animaux disponibles' : 'animal disponible'}
              </p>
            </div>
            {shelter.species?.length > 0 && (
              <div className="text-center">
                <p className="text-2xl">{shelter.species.map(s => SPECIES_EMOJI[s] || '🐾').join(' ')}</p>
                <p className="text-gray-500 text-xs">
                  {shelter.species.map(s => SPECIES_LABEL[s] || s).join(', ')}
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Description */}
        {shelter.description && (
          <motion.div
            className="card p-5 space-y-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="font-bold text-gray-700">Notre mission</h2>
            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
              {shelter.description}
            </p>
          </motion.div>
        )}

        {/* Photos du refuge */}
        {(() => {
          const photos = shelter.description_photos?.length
            ? shelter.description_photos
            : shelter.description_photo_url ? [shelter.description_photo_url] : [];
          if (!photos.length) return null;
          return (
            <motion.div
              className={`grid gap-2 ${photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              {photos.map((url, i) => (
                <img key={i} src={url} alt={`Photo de ${shelter.name}`}
                  className="w-full object-cover max-h-64 rounded-3xl" />
              ))}
            </motion.div>
          );
        })()}

        {/* Galerie photos des animaux */}
        {gallery.length > 0 && (
          <motion.div
            className="card p-5 space-y-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="font-bold text-gray-700">Nos pensionnaires</h2>
            <p className="text-gray-500 text-sm">
              Quelques-uns de nos animaux qui attendent leur famille...
            </p>

            {/* Photo principale */}
            <div className="relative rounded-2xl overflow-hidden bg-gray-100" style={{ aspectRatio: '4/3' }}>
              <motion.img
                key={galleryIdx}
                src={gallery[galleryIdx]}
                alt="Animal du refuge"
                className="w-full h-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
              {gallery.length > 1 && (
                <>
                  <button
                    onClick={() => setGalleryIdx((i) => (i - 1 + gallery.length) % gallery.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => setGalleryIdx((i) => (i + 1) % gallery.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60"
                  >
                    ›
                  </button>
                </>
              )}
            </div>

            {/* Vignettes */}
            {gallery.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {gallery.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setGalleryIdx(i)}
                    className={`w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                      i === galleryIdx ? 'border-secondary' : 'border-transparent'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Contact */}
        <motion.div
          className="card p-5 space-y-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h2 className="font-bold text-gray-700">Nous contacter</h2>
          <div className="flex flex-wrap gap-2">
            {shelter.phone && (
              <a href={`tel:${shelter.phone}`}
                className="btn-primary text-sm py-2.5 px-4">
                📞 Appeler
              </a>
            )}
            {shelter.email && (
              <a href={`mailto:${shelter.email}`}
                className="btn-secondary text-sm py-2.5 px-4">
                ✉️ Email
              </a>
            )}
            {shelter.address && (
              <a href={`https://maps.google.com/?q=${encodeURIComponent(shelter.address)}`}
                target="_blank" rel="noopener noreferrer"
                className="btn-secondary text-sm py-2.5 px-4">
                📍 Itinéraire
              </a>
            )}
          </div>
        </motion.div>

        {/* CTA principal */}
        <motion.div
          className="card p-6 text-center space-y-3 bg-gradient-to-br from-primary to-secondary text-white"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-4xl">💚</div>
          <h2 className="font-bold text-xl">
            Trouvez votre compagnon idéal
          </h2>
          <p className="text-white/80 text-sm">
            Adoptly analyse votre mode de vie et vous propose uniquement les animaux
            de {shelter.name} compatibles avec vous. Gratuit et sans engagement.
          </p>
          <Link
            to="/adoptant/register"
            className="inline-block bg-white text-primary font-bold text-sm
                       px-6 py-3 rounded-2xl hover:bg-white/90 transition-colors"
            onClick={() => {
              if (typeof window.gtag === 'function') {
                window.gtag('event', 'cta_shelter_page', { shelter_id: shelter.id, shelter_name: shelter.name });
              }
            }}
          >
            Commencer le questionnaire →
          </Link>
        </motion.div>

        {/* Retour liste */}
        <div className="text-center">
          <Link to="/refuges" className="text-secondary text-sm font-medium hover:underline">
            ← Voir tous les refuges partenaires
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-300 text-xs pb-4 space-x-3">
          <Link to="/" className="hover:text-gray-500 transition-colors">Accueil</Link>
          <span>·</span>
          <Link to="/legal/cgu" className="hover:text-gray-500 transition-colors">CGU</Link>
          <span>·</span>
          <Link to="/legal/privacy" className="hover:text-gray-500 transition-colors">Confidentialité</Link>
        </div>

      </div>
    </div>
  );
}
