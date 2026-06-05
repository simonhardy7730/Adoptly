import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PhotoLightbox({ photos, initialIndex = 0, onClose }) {
  const [idx, setIdx] = useState(initialIndex);

  // Fermer avec Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIdx((i) => Math.min(i + 1, photos.length - 1));
      if (e.key === 'ArrowLeft')  setIdx((i) => Math.max(i - 1, 0));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, photos.length]);

  // Bloquer le scroll du body
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Bouton fermer */}
        <button
          className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl z-10
                     w-10 h-10 flex items-center justify-center"
          onClick={onClose}
        >
          ×
        </button>

        {/* Compteur */}
        {photos.length > 1 && (
          <p className="absolute top-5 left-1/2 -translate-x-1/2 text-white/60 text-sm">
            {idx + 1} / {photos.length}
          </p>
        )}

        {/* Photo principale */}
        <motion.img
          key={idx}
          src={photos[idx]}
          alt={`Photo ${idx + 1}`}
          className="max-h-[85vh] max-w-[95vw] object-contain rounded-lg select-none"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          draggable={false}
        />

        {/* Navigation gauche */}
        {idx > 0 && (
          <button
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/15
                       hover:bg-white/30 rounded-full flex items-center justify-center
                       text-white text-lg transition-colors"
            onClick={(e) => { e.stopPropagation(); setIdx((i) => i - 1); }}
          >
            ‹
          </button>
        )}

        {/* Navigation droite */}
        {idx < photos.length - 1 && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/15
                       hover:bg-white/30 rounded-full flex items-center justify-center
                       text-white text-lg transition-colors"
            onClick={(e) => { e.stopPropagation(); setIdx((i) => i + 1); }}
          >
            ›
          </button>
        )}

        {/* Dots en bas */}
        {photos.length > 1 && (
          <div className="absolute bottom-6 flex gap-2">
            {photos.map((_, i) => (
              <button
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === idx ? 'bg-white w-4' : 'bg-white/40'
                }`}
                onClick={(e) => { e.stopPropagation(); setIdx(i); }}
              />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
