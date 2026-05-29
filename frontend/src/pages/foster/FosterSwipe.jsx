import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from '../../components/Navbar';
import SwipeCard from '../../components/SwipeCard';
import MatchModal from '../../components/MatchModal';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../lib/api';

const DURATION_LABEL = {
  1:  '1 jour',
  7:  '1 semaine',
  14: '2 semaines',
  30: '1 mois',
  90: '3 mois',
};

function fosterDurationLabel(days) {
  if (!days) return null;
  if (DURATION_LABEL[days]) return DURATION_LABEL[days];
  if (days < 7) return `${days} jour${days > 1 ? 's' : ''}`;
  if (days < 30) return `${Math.round(days / 7)} semaine${Math.round(days / 7) > 1 ? 's' : ''}`;
  if (days < 365) return `${Math.round(days / 30)} mois`;
  return `${Math.round(days / 365)} an${Math.round(days / 365) > 1 ? 's' : ''}`;
}

const REASON_LABEL = {
  hospitalization:  'Hospitalisation',
  vacation:         'Vacances',
  moving:           'Déménagement',
  rehabilitation:   'Rééducation',
  overflow:         'Surpopulation',
  other:            'Autre',
};

export default function FosterSwipe() {
  const navigate = useNavigate();
  const [animals, setAnimals] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [noMore, setNoMore] = useState(false);
  const [emptyFromStart, setEmptyFromStart] = useState(false);
  const [matchData, setMatchData] = useState(null);
  const [swipeHint, setSwipeHint] = useState(true);
  const swiping = useRef(false);

  const fetchAnimals = useCallback(async () => {
    try {
      const { data } = await api.get('/foster/animals');
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
        navigate('/famille-accueil/questionnaire');
      } else {
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
    const timer = setTimeout(() => setSwipeHint(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  async function handleSwipe(direction) {
    if (swiping.current) return;
    const animal = animals[currentIndex];
    if (!animal) return;

    swiping.current = true;
    setSwipeHint(false);

    try {
      const { data } = await api.post('/foster/swipe', {
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
  const currentAnimal = animals[currentIndex];

  return (
    <div className="min-h-screen bg-bg-light flex flex-col">
      <Navbar />

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-4">
        {loading ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-4">
            <LoadingSpinner size="lg" />
            <p className="text-gray-500 text-sm">Recherche d'animaux à accueillir…</p>
          </div>
        ) : noMore || currentIndex >= animals.length ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-6 text-center px-8">
            {emptyFromStart ? (
              <>
                <div className="text-6xl">🔍</div>
                <div>
                  <h2 className="text-2xl font-bold text-primary">Aucun animal disponible</h2>
                  <p className="text-gray-500 mt-2 text-sm leading-relaxed">
                    Aucun animal ne correspond à vos critères pour le moment.<br />
                    Modifiez vos préférences ou revenez bientôt.
                  </p>
                </div>
                <button onClick={fetchAnimals} className="btn-primary px-8 py-3">
                  Actualiser
                </button>
                <button
                  onClick={() => navigate('/famille-accueil/questionnaire')}
                  className="btn-secondary text-sm px-6 py-2.5"
                >
                  Modifier mes préférences
                </button>
              </>
            ) : (
              <>
                <div className="text-6xl">🎉</div>
                <div>
                  <h2 className="text-2xl font-bold text-primary">C'est tout pour l'instant !</h2>
                  <p className="text-gray-500 mt-2 text-sm leading-relaxed">
                    Vous avez vu tous les animaux disponibles.<br />
                    Consultez vos demandes d'accueil ou revenez bientôt.
                  </p>
                </div>
                <button onClick={() => navigate('/famille-accueil/matches')} className="btn-primary px-8 py-3">
                  Mes demandes d'accueil
                </button>
                <div className="flex gap-3">
                  <button onClick={fetchAnimals} className="btn-secondary text-sm px-5 py-2.5">
                    Actualiser
                  </button>
                  <button
                    onClick={() => navigate('/famille-accueil/questionnaire')}
                    className="btn-secondary text-sm px-5 py-2.5"
                  >
                    Mes préférences
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
                {totalRemaining} animal{totalRemaining > 1 ? 'x' : ''} disponible{totalRemaining > 1 ? 's' : ''}
              </p>
              <button
                onClick={() => navigate('/famille-accueil/matches')}
                className="text-secondary text-sm font-medium"
              >
                Mes demandes
              </button>
            </div>

            {/* Infos foster de l'animal courant */}
            {currentAnimal && (currentAnimal.foster_duration_days || currentAnimal.foster_reason || currentAnimal.foster_expenses_covered) && (
              <div className="mb-3 bg-orange-50 border border-orange-100 rounded-2xl px-4 py-2.5 flex flex-wrap gap-3 text-xs text-orange-700">
                {currentAnimal.foster_duration_days && (
                  <span>📅 Durée : {fosterDurationLabel(currentAnimal.foster_duration_days)}</span>
                )}
                {currentAnimal.foster_reason && (
                  <span>ℹ️ {REASON_LABEL[currentAnimal.foster_reason] || currentAnimal.foster_reason}</span>
                )}
                {currentAnimal.foster_expenses_covered && (
                  <span className="font-semibold text-green-700">✓ Frais pris en charge</span>
                )}
              </div>
            )}

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

              {swipeHint && remaining.length > 0 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 text-white text-xs px-4 py-2 rounded-full backdrop-blur-sm pointer-events-none">
                  <span>👋 Passer</span>
                  <span className="opacity-40">·</span>
                  <span>Accueillir 🏠</span>
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
                aria-label="Accueillir"
              >
                🏠
              </button>
            </div>

            <p className="text-center text-gray-300 text-xs pb-2">
              Utilisez les touches ← → ou A/D
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
