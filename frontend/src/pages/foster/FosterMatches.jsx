import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../lib/api';
import { thumb } from '../../lib/img';

function ageLabel(months) {
  if (!months) return '';
  if (months < 12) return `${months} mois`;
  const y = Math.floor(months / 12);
  return `${y} an${y > 1 ? 's' : ''}`;
}

function fosterDurationLabel(days) {
  if (!days) return null;
  if (days < 7) return `${days} jour${days > 1 ? 's' : ''}`;
  if (days < 30) return `${Math.round(days / 7)} semaine${Math.round(days / 7) > 1 ? 's' : ''}`;
  if (days < 365) return `${Math.round(days / 30)} mois`;
  return `${Math.round(days / 365)} an${Math.round(days / 365) > 1 ? 's' : ''}`;
}

const STATUS_BADGE = {
  interested: { label: 'En attente',  color: 'bg-green-100 text-green-700' },
  confirmed:  { label: 'Confirmé',    color: 'bg-blue-100 text-blue-700' },
  closed:     { label: 'Terminé',     color: 'bg-gray-100 text-gray-500' },
};

export default function FosterMatches() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/foster/matches')
      .then(({ data }) => setMatches(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function markContacted(matchId) {
    try {
      const { data } = await api.patch(`/foster/matches/${matchId}/contacted`);
      setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, ...data } : m)));
    } catch {}
  }

  return (
    <div className="min-h-screen bg-bg-light">
      <Navbar />

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-primary">Mes demandes d'accueil</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {matches.length} demande{matches.length > 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={() => navigate('/famille-accueil/swipe')} className="btn-primary text-sm py-2 px-4">
            Continuer
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="text-6xl">🏠</div>
            <p className="text-gray-500 font-medium">Aucune demande pour l'instant</p>
            <p className="text-gray-400 text-sm">Swipez à droite sur les animaux que vous souhaitez accueillir.</p>
            <button onClick={() => navigate('/famille-accueil/swipe')} className="btn-primary px-8 py-3">
              Voir les animaux disponibles
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match, i) => {
              const animal  = match.animals;
              const shelter = animal?.shelters;
              const photo   = animal?.photos?.[0];
              const badge   = STATUS_BADGE[match.status] || STATUS_BADGE.interested;

              return (
                <motion.div
                  key={match.id}
                  className="card p-4 flex gap-4"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  {/* Photo */}
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-blue-50 flex-shrink-0">
                    {photo ? (
                      <img src={thumb(photo, 400)} alt={animal?.name} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">🐾</div>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-gray-800 truncate">
                        {animal?.name}
                      </span>
                      <span className={`badge text-xs flex-shrink-0 ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>

                    <p className="text-gray-500 text-xs">
                      {animal?.breed || animal?.species}
                      {animal?.age ? ` · ${ageLabel(animal.age)}` : ''}
                    </p>

                    {/* Infos d'accueil */}
                    {animal?.foster_duration_days && (
                      <p className="text-orange-600 text-xs font-medium">
                        📅 Durée estimée : {fosterDurationLabel(animal.foster_duration_days)}
                      </p>
                    )}

                    {animal?.foster_expenses_covered && (
                      <p className="text-green-600 text-xs font-medium">
                        ✓ Frais pris en charge par le refuge
                      </p>
                    )}

                    {shelter && (
                      <p className="text-gray-400 text-xs truncate">{shelter.name}</p>
                    )}

                    {/* Actions de contact */}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {shelter?.phone && (
                        <a
                          href={`tel:${shelter.phone}`}
                          onClick={() => !match.contacted && markContacted(match.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-secondary hover:text-primary bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          Appeler
                        </a>
                      )}
                      {shelter?.email && (
                        <a
                          href={`mailto:${shelter.email}`}
                          onClick={() => !match.contacted && markContacted(match.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-secondary hover:text-primary bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          Envoyer un email
                        </a>
                      )}
                      {shelter?.address && (
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent(shelter.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-secondary hover:text-primary bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          Voir sur la carte
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
