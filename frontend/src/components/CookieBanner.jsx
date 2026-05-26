import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const GA_ID = 'G-GS4YBE8MFP';

function loadGA() {
  if (window._gaLoaded) return;
  window._gaLoaded = true;
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_ID);
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      // Petit délai pour ne pas gêner le chargement initial
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
    if (consent === 'accepted') loadGA();
  }, []);

  function accept() {
    localStorage.setItem('cookie-consent', 'accepted');
    loadGA();
    setVisible(false);
  }

  function refuse() {
    localStorage.setItem('cookie-consent', 'refused');
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4"
        >
          <div className="max-w-3xl mx-auto bg-gray-900 text-white rounded-2xl shadow-2xl
                          px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">

            {/* Texte */}
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-relaxed text-gray-200">
                🍪 <strong className="text-white">Adoptly utilise des cookies</strong> pour mesurer
                l'audience du site (Google Analytics) et améliorer votre expérience.
                {' '}
                <Link
                  to="/legal/privacy"
                  className="text-orange-400 hover:text-orange-300 underline underline-offset-2 transition-colors"
                >
                  En savoir plus
                </Link>
              </p>
            </div>

            {/* Boutons */}
            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
              <button
                onClick={refuse}
                className="flex-1 sm:flex-none text-sm font-medium text-gray-400
                           hover:text-white border border-gray-600 hover:border-gray-400
                           px-4 py-2 rounded-xl transition-colors"
              >
                Refuser
              </button>
              <button
                onClick={accept}
                className="flex-1 sm:flex-none text-sm font-bold bg-accent hover:bg-orange-500
                           text-white px-5 py-2 rounded-xl transition-colors shadow-md"
              >
                Accepter
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
