import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../../components/Navbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../lib/api';

function StatCard({ value, label, emoji }) {
  return (
    <div className="card p-4 text-center space-y-1">
      <p className="text-2xl">{emoji}</p>
      <p className="text-2xl font-extrabold text-primary">{value}</p>
      <p className="text-gray-500 text-xs">{label}</p>
    </div>
  );
}

function ConfirmModal({ name, onConfirm, onCancel }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center space-y-2">
          <div className="text-4xl">🗑️</div>
          <h3 className="font-bold text-gray-800 text-lg">Supprimer {name} ?</h3>
          <p className="text-gray-500 text-sm">
            Cela supprimera définitivement cet animal ainsi que toutes ses données de match.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1 text-sm py-3">
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors active:scale-95"
          >
            Supprimer
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    api
      .get('/shelter/dashboard')
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function deleteAnimal(id) {
    try {
      await api.delete(`/shelter/animals/${id}`);
      setData((d) => ({
        ...d,
        animals: d.animals.filter((a) => a.id !== id),
        stats: { ...d.stats, total_animals: d.stats.total_animals - 1 },
      }));
    } catch {}
    setDeleting(null);
  }

  const STATUS_COLOR = {
    active: 'bg-green-100 text-green-700',
    adopted: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="min-h-screen bg-bg-light">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            {/* Bienvenue */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-extrabold text-primary">
                  {data?.shelter?.name || 'Tableau de bord'}
                </h1>
                <p className="text-gray-500 text-sm mt-0.5">
                  Gérez vos animaux et suivez les adoptions
                </p>
              </div>
              <Link to="/shelter/animals/add" className="btn-primary text-sm py-2.5 px-4">
                + Ajouter un animal
              </Link>
            </div>

            {/* Statistiques */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard value={data?.stats?.total_animals ?? 0} label="Animaux listés" emoji="🐾" />
              <StatCard value={data?.stats?.matches_this_month ?? 0} label="Matchs ce mois" emoji="💚" />
              <StatCard value={data?.stats?.pending_contacts ?? 0} label="Contacts en attente" emoji="📬" />
            </div>

            {/* Liste des animaux */}
            <div>
              <h2 className="font-bold text-gray-700 mb-3">Vos Animaux</h2>

              {!data?.animals?.length ? (
                <div className="card p-8 text-center space-y-4">
                  <div className="text-5xl">🐾</div>
                  <p className="text-gray-500 font-medium">Aucun animal listé pour l'instant</p>
                  <Link to="/shelter/animals/add" className="btn-primary inline-block px-6 py-2.5 text-sm">
                    Ajouter votre premier animal
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.animals.map((animal, i) => {
                    const photo = animal.photos?.[0];
                    return (
                      <motion.div
                        key={animal.id}
                        className="card p-4 flex gap-4"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        {/* Photo */}
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-blue-50 flex-shrink-0">
                          {photo ? (
                            <img src={photo} alt={animal.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">🐾</div>
                          )}
                        </div>

                        {/* Infos */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-bold text-gray-800 truncate">{animal.name}</h3>
                            <span
                              className={`badge text-xs flex-shrink-0 ${STATUS_COLOR[animal.status] || STATUS_COLOR.active}`}
                            >
                              {animal.status === 'adopted' ? 'Adopté 🎉' : 'Actif'}
                            </span>
                          </div>
                          <p className="text-gray-500 text-xs mt-0.5">
                            {animal.species}{animal.breed ? ` · ${animal.breed}` : ''}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                            <span>💚 {animal.match_count} match{animal.match_count > 1 ? 's' : ''}</span>
                            <span>📬 {animal.contact_count} contact{animal.contact_count > 1 ? 's' : ''}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <Link
                            to={`/shelter/animals/${animal.id}/edit`}
                            state={{ animal }}
                            className="text-xs font-medium text-secondary hover:text-primary bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors text-center"
                          >
                            Modifier
                          </Link>
                          <button
                            onClick={() => setDeleting(animal)}
                            className="text-xs font-medium text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Supprimer
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {deleting && (
          <ConfirmModal
            name={deleting.name}
            onConfirm={() => deleteAnimal(deleting.id)}
            onCancel={() => setDeleting(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
