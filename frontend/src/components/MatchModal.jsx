import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { thumb } from '../lib/img';
import { useState } from 'react';

export default function MatchModal({ animal, matchId, onClose }) {
  const navigate = useNavigate();
  const shelter = animal?.shelters;
  const [contacted, setContacted] = useState(false);

  if (!animal) return null;

  async function markContacted() {
    if (contacted || !matchId) return;
    try {
      await api.patch(`/adoptant/matches/${matchId}/contacted`);
      setContacted(true);
    } catch {
      // non-critique
    }
  }

  const photo = animal.photos?.[0];
  const mapsUrl = shelter?.address
    ? `https://maps.google.com/?q=${encodeURIComponent(shelter.address)}`
    : null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-lg bg-white rounded-t-3xl p-6 pb-10 space-y-5"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* En-tête */}
          <div className="text-center space-y-2">
            <div className="text-5xl">💚</div>
            <h2 className="text-2xl font-bold text-primary">
              Super match avec {animal.name} !
            </h2>
            <p className="text-gray-500 text-sm">
              Contactez le refuge pour démarrer le processus d'adoption
            </p>
          </div>

          {/* Photo de l'animal */}
          <div className="flex gap-4 items-center bg-bg-light rounded-2xl p-3">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-blue-100 flex-shrink-0">
              {photo ? (
                <img src={thumb(photo, 500)} alt={animal.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">🐾</div>
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-800">{animal.name}</p>
              <p className="text-gray-500 text-sm">{animal.breed || animal.species}</p>
            </div>
          </div>

          {/* Fiche refuge */}
          {shelter && (
            <div className="card p-4 space-y-3">
              <h3 className="font-bold text-gray-800">{shelter.name}</h3>

              {shelter.phone && (
                <a
                  href={`tel:${shelter.phone}`}
                  onClick={markContacted}
                  className="flex items-center gap-3 text-secondary hover:text-primary transition-colors"
                >
                  <span className="text-xl">📞</span>
                  <span className="font-medium">{shelter.phone}</span>
                </a>
              )}

              {shelter.email && (
                <a
                  href={`mailto:${shelter.email}`}
                  onClick={markContacted}
                  className="flex items-center gap-3 text-secondary hover:text-primary transition-colors"
                >
                  <span className="text-xl">✉️</span>
                  <span className="font-medium">{shelter.email}</span>
                </a>
              )}

              {shelter.address && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-secondary hover:text-primary transition-colors"
                >
                  <span className="text-xl">📍</span>
                  <span className="font-medium">{shelter.address}</span>
                </a>
              )}
            </div>
          )}

          {/* Bouton principal : envoyer un message */}
          <button
            onClick={() => {
              markContacted();
              navigate(`/chat/${matchId}`);
            }}
            className="w-full btn-primary text-center text-sm py-3"
          >
            💬 Envoyer un message
          </button>

          {/* Boutons secondaires */}
          <div className="flex gap-3">
            {shelter?.phone && (
              <a
                href={`tel:${shelter.phone}`}
                onClick={markContacted}
                className="flex-1 btn-secondary text-center text-sm"
              >
                📞 Appeler
              </a>
            )}
            {shelter?.email && (
              <a
                href={`mailto:${shelter.email}`}
                onClick={markContacted}
                className="flex-1 btn-secondary text-center text-sm"
              >
                ✉️ E-mail
              </a>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/adoptant/matches')}
              className="flex-1 btn-ghost text-sm border border-gray-200 rounded-2xl"
            >
              Voir tous mes matchs
            </button>
            <button onClick={onClose} className="flex-1 btn-ghost text-sm border border-gray-200 rounded-2xl">
              Continuer à swiper
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
