import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from '../../components/Navbar';
import SwipeCard from '../../components/SwipeCard';
import MatchModal from '../../components/MatchModal';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../lib/api';

export default function Swiper() {
  const navigate = useNavigate();
  const [animals, setAnimals] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [noMore, setNoMore] = useState(false);
  const [emptyFromStart, setEmptyFromStart] = useState(false); // aucun animal compatible dès le départ
  const [matchData, setMatchData] = useState(null);
  const [swipeHint, setSwipeHint] = useState(true);
  const swiping = useRef(false);

  const fetchAnimals = useCallback(async () => {
    try {
      const { data } = await api.get('/adoptant/animals');
      if (!data.length) {
        setNoMore(true);
        setEmptyFromStart(true);
      } else {
        setAnimals(data);
        setCurrentIndex(0);
        setEmptyFromStart(false);
      }
    } catch (err) {
      if (err.response?.status === 400) {
        // Questionnaire non rempli → rediriger
        navigate('/adoptant/questionnaire');
      } else {
        // Autre erreur → montrer l'empty state "aucun animal"
        setNoMore(true);
        setEmptyFromStart(true);
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchAnimals();
  }, [fetchAnimals]);

  useEffect(() => {
    function onKey(e) {
      if (matchData) return;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') triggerSwipe('right');
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') triggerSwipe('left');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [animals, currentIndex, matchData]);

  useEffect(() => {
    const t = setTimeout(() => setSwipeHint(false), 4000);
    return () => clearTimeout(t);
  }, []);

  async function handleSwipe(direction) {
    if (swiping.current) return;
    const animal = animals[currentIndex];
    if (!animal) return;

    swiping.current = true;
    setSwipeHint(false);

    try {
      const { data } = await api.post('/adoptant/swipe', {
        animal_id: animal.id,
        direction,
      });

      if (direction === 'right' && data.isMatch) {
        setMatchData({ animal: data.animal, matchId: data.match.id });
      }

      const next = currentIndex + 1;
      if (next >= animals.length) {
        setCurrentIndex(next);
        setNoMore(true);
      } else {
        setCurrentIndex(next);
      }
    } catch {
      const next = currentIndex + 1;
      if (next >= animals.length) setNoMore(true);
      setCurrentIndex(next);
    } finally {
      swiping.current = false;
    }
  }

  function triggerSwipe(direction) {
    if (swiping.current || noMore || currentIndex >= animals.length) return;
    handleSwipe(direction);
  }

  const remaining = animals.slice(currentIndex, currentIndex + 3);
  const totalRemaining = animals.length - currentIndex;

  return (
    <div className="min-h-screen bg-bg-light flex flex-col">
      <Navbar />

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-4">
        {loading ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-4">
            <LoadingSpinner size="lg" />
            <p className="text-gray-500 text-sm">Recherche de vos matchs...</p>
          </div>
        ) : noMore || currentIndex >= animals.length ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-6 text-center px-8">
            {emptyFromStart ? (
              /* Aucun animal compatible dès le départ */
              <>
                <div className="text-6xl">🔍</div>
                <div>
                  <h2 className="text-2xl font-bold text-primary">Aucun animal compatible</h2>
                  <p className="text-gray-500 mt-2 text-sm leading-relaxed">
                    Pas encore d'animal qui correspond à votre profil dans votre zone de recherche.<br />
                    Les refuges partenaires ajoutent régulièrement de nouveaux pensionnaires.
                  </p>
                </div>
                <button onClick={fetchAnimals} className="btn-primary px-8 py-3">
                  Actualiser
                </button>
                <button
                  onClick={() => navigate('/adoptant/questionnaire')}
                  className="btn-secondary text-sm px-6 py-2.5"
                >
                  ✏️ Modifier mes préférences
                </button>
              </>
            ) : (
              /* A tout swipé */
              <>
                <div className="text-6xl">🎉</div>
                <div>
                  <h2 className="text-2xl font-bold text-primary">Vous avez tout vu !</h2>
                  <p className="text-gray-500 mt-2 text-sm leading-relaxed">
                    Vous avez swipé tous les animaux compatibles.<br />
                    Revenez bientôt — les refuges ajoutent de nouveaux pensionnaires régulièrement.
                  </p>
                </div>
                <button onClick={() => navigate('/adoptant/matches')} className="btn-primary px-8 py-3">
                  Voir mes matchs 💚
                </button>
                <div className="flex gap-3">
                  <button onClick={fetchAnimals} className="btn-secondary text-sm px-5 py-2.5">
                    Actualiser
                  </button>
                  <button
                    onClick={() => navigate('/adoptant/questionnaire')}
                    className="btn-secondary text-sm px-5 py-2.5"
                  >
                    ✏️ Mes préférences
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Compteur */}
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-gray-400 text-sm font-medium">
                {totalRemaining} animal{totalRemaining > 1 ? 'aux' : ''} restant{totalRemaining > 1 ? 's' : ''}
              </p>
              <button
                onClick={() => navigate('/adoptant/matches')}
                className="text-secondary text-sm font-medium"
              >
                Mes matchs 💚
              </button>
            </div>

            {/* Pile de cartes */}
            <div className="relative flex-1 min-h-0" style={{ minHeight: '480px' }}>
              <AnimatePresence>
                {remaining.map((animal, i) => (
                  <SwipeCard
                    key={animal.id}
                    animal={animal}
                    isTop={i === 0}
                    stackIndex={i}
                    onSwipe={i === 0 ? handleSwipe : undefined}
                  />
                ))}
              </AnimatePresence>

              {/* Indication de swipe */}
              {swipeHint && remaining.length > 0 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 text-white text-xs px-4 py-2 rounded-full backdrop-blur-sm pointer-events-none">
                  <span>👋 glisser à gauche</span>
                  <span className="opacity-40">·</span>
                  <span>💚 glisser à droite</span>
                </div>
              )}
            </div>

            {/* Boutons d'action */}
            <div className="flex items-center justify-center gap-6 py-5">
              <button
                onClick={() => triggerSwipe('left')}
                className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center text-2xl
                           border-2 border-gray-100 hover:border-red-200 hover:shadow-xl active:scale-90 transition-all"
                aria-label="Passer"
              >
                👋
              </button>

              <button
                onClick={() => triggerSwipe('right')}
                className="w-20 h-20 rounded-full bg-success shadow-xl flex items-center justify-center text-3xl
                           hover:shadow-2xl active:scale-90 transition-all"
                aria-label="J'adore"
              >
                💚
              </button>
            </div>

            {/* Aide clavier */}
            <p className="text-center text-gray-300 text-xs pb-2">
              A / ← pour passer · D / → pour adorer
            </p>
          </>
        )}
      </div>

      <AnimatePresence>
        {matchData && (
          <MatchModal
            animal={matchData.animal}
            matchId={matchData.matchId}
            onClose={() => setMatchData(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
