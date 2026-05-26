import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../../components/Navbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../lib/api';

// ── Modal : liste des adoptants intéressés ────────────────
function InterestedModal({ animal, onClose, t }) {
  const [loading, setLoading]       = useState(true);
  const [interested, setInterested] = useState([]);

  useEffect(() => {
    api.get(`/shelter/animals/${animal.id}/interested`)
      .then(({ data }) => setInterested(data.interested || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [animal.id]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-3xl w-full max-w-sm max-h-[80vh] flex flex-col shadow-2xl"
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-800">{t('interested_title', { name: animal.name })}</h3>
            <p className="text-gray-400 text-xs mt-0.5">
              {interested.length} {interested.length > 1 ? t('interested_adoptants') : t('interested_adoptant')}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8"><LoadingSpinner size="md" /></div>
          ) : interested.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              {t('interested_empty')}
            </div>
          ) : (
            interested.map((person) => {
              const name = [person.first_name, person.last_name].filter(Boolean).join(' ') || 'Anonyme';
              const date = new Date(person.timestamp).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'short',
              });
              return (
                <div key={person.match_id} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-secondary to-accent
                                  flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">
                      {(person.first_name?.[0] || person.email?.[0] || '?').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-700 text-sm truncate">{name}</p>
                    <a
                      href={`mailto:${person.email}`}
                      className="text-secondary text-xs hover:underline truncate block"
                    >
                      {person.email}
                    </a>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-gray-300 text-xs">{date}</p>
                    {person.contacted && (
                      <p className="text-blue-400 text-xs">{t('interested_contacted')}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatCard({ value, label, emoji }) {
  return (
    <div className="card p-4 text-center space-y-1">
      <p className="text-2xl">{emoji}</p>
      <p className="text-2xl font-extrabold text-primary">{value}</p>
      <p className="text-gray-500 text-xs">{label}</p>
    </div>
  );
}

function WeeklyChart({ weeks }) {
  const max = Math.max(...(weeks || []).map((w) => w.count), 1);
  return (
    <div className="flex items-end gap-1.5 h-24 w-full">
      {(weeks || []).map((w, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
          <span className="text-[9px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
            {w.count || ''}
          </span>
          <div className="w-full flex-1 flex items-end">
            <div
              className="w-full rounded-t-md transition-all bg-primary/25 group-hover:bg-primary/50"
              style={{ height: w.count ? `${Math.max((w.count / max) * 100, 8)}%` : '3px' }}
            />
          </div>
          <span className="text-[9px] text-gray-400 leading-none">{w.label}</span>
        </div>
      ))}
    </div>
  );
}

function ConfirmModal({ name, onConfirm, onCancel, t }) {
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
          <h3 className="font-bold text-gray-800 text-lg">{t('confirm_delete_title', { name })}</h3>
          <p className="text-gray-500 text-sm">{t('confirm_delete_body')}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1 text-sm py-3">
            {t('confirm_cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors active:scale-95"
          >
            {t('confirm_delete')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Dashboard() {
  const { t } = useLanguage();
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [deleting,  setDeleting]  = useState(null);
  const [interested, setInterested] = useState(null);
  const [markingAdopted, setMarkingAdopted] = useState(null);
  const [copiedId,  setCopiedId]  = useState(null);

  function shareAnimal(animal) {
    const url = `https://adoptly.fr/animal/${animal.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(animal.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

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

  async function markAdopted(animal) {
    setMarkingAdopted(animal.id);
    try {
      await api.patch(`/shelter/animals/${animal.id}/adopted`);
      setData((d) => ({
        ...d,
        animals: d.animals.map((a) => a.id === animal.id ? { ...a, status: 'adopted' } : a),
      }));
    } catch {}
    setMarkingAdopted(null);
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
                  {data?.shelter?.name || t('nav_dashboard')}
                </h1>
                <p className="text-gray-500 text-sm mt-0.5">{t('dash_subtitle')}</p>
              </div>
              <Link to="/shelter/animals/add" className="btn-primary text-sm py-2.5 px-4">
                {t('dash_add_btn')}
              </Link>
            </div>

            {/* Onboarding — affiché seulement si aucun animal */}
            {data?.stats?.total_animals === 0 && (
              <motion.div
                className="card p-5 border-2 border-secondary/20 bg-gradient-to-br from-blue-50 to-indigo-50 space-y-4"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">👋</span>
                  <div>
                    <h2 className="font-bold text-primary text-base">Bienvenue sur Adoptly !</h2>
                    <p className="text-gray-500 text-sm mt-0.5">
                      Suivez ces 3 étapes pour recevoir vos premiers matchs.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { done: true,  label: 'Compte créé',                          link: null },
                    { done: false, label: 'Complétez le profil de votre refuge',  link: '/shelter/profile' },
                    { done: false, label: 'Ajoutez votre premier animal',          link: '/shelter/animals/add' },
                  ].map((step, i) => (
                    <div key={i} className={`flex items-center gap-3 rounded-xl px-3 py-2.5
                      ${step.done ? 'bg-green-50' : 'bg-white border border-gray-100'}`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                        ${step.done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                        {step.done ? '✓' : i + 1}
                      </span>
                      {step.link ? (
                        <Link to={step.link} className="text-sm font-medium text-secondary hover:text-primary transition-colors flex-1">
                          {step.label} →
                        </Link>
                      ) : (
                        <span className="text-sm font-medium text-green-700 flex-1">{step.label}</span>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Statistiques */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard value={data?.stats?.total_animals ?? 0} label={t('dash_stat_animals')} emoji="🐾" />
              <StatCard value={data?.stats?.matches_this_month ?? 0} label={t('dash_stat_matches')} emoji="💚" />
              <StatCard value={data?.stats?.pending_contacts ?? 0} label={t('dash_stat_contacts')} emoji="📬" />
            </div>

            {/* Graphique matchs hebdomadaires */}
            {data?.stats?.weekly?.some((w) => w.count > 0) && (
              <div className="card p-5">
                <h2 className="font-bold text-gray-700 mb-4">{t('dash_chart_title')}</h2>
                <WeeklyChart weeks={data.stats.weekly} />
              </div>
            )}

            {/* Liste des animaux */}
            <div>
              <h2 className="font-bold text-gray-700 mb-3">{t('dash_animals_title')}</h2>

              {!data?.animals?.length ? (
                <div className="card p-8 text-center space-y-4">
                  <div className="text-5xl">🐾</div>
                  <p className="text-gray-500 font-medium">{t('dash_empty')}</p>
                  <Link to="/shelter/animals/add" className="btn-primary inline-block px-6 py-2.5 text-sm">
                    {t('dash_empty_cta')}
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
                              {animal.status === 'adopted' ? t('dash_status_adopted') : t('dash_status_active')}
                            </span>
                          </div>
                          <p className="text-gray-500 text-xs mt-0.5">
                            {animal.species}{animal.breed ? ` · ${animal.breed}` : ''}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                            <span>💚 {animal.match_count} {animal.match_count > 1 ? t('dash_matches') : t('dash_match')}</span>
                            <span>📬 {animal.contact_count} {animal.contact_count > 1 ? t('dash_contacts') : t('dash_contact')}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          {/* Intéressés */}
                          {animal.match_count > 0 && (
                            <button
                              onClick={() => setInterested(animal)}
                              className="text-xs font-medium text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              💚 {animal.match_count} {animal.match_count > 1 ? t('dash_interested_pl') : t('dash_interested')}
                            </button>
                          )}
                          <button
                            onClick={() => shareAnimal(animal)}
                            className="text-xs font-medium text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            {copiedId === animal.id ? t('dash_copied') : t('dash_share')}
                          </button>
                          <Link
                            to={`/shelter/animals/${animal.id}/edit`}
                            state={{ animal }}
                            className="text-xs font-medium text-secondary hover:text-primary bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors text-center"
                          >
                            {t('dash_edit')}
                          </Link>
                          {animal.status !== 'adopted' && (
                            <button
                              onClick={() => markAdopted(animal)}
                              disabled={markingAdopted === animal.id}
                              className="text-xs font-medium text-purple-500 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              {markingAdopted === animal.id ? '…' : t('dash_mark_adopted')}
                            </button>
                          )}
                          <button
                            onClick={() => setDeleting(animal)}
                            className="text-xs font-medium text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            {t('dash_delete')}
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
            t={t}
          />
        )}
        {interested && (
          <InterestedModal
            animal={interested}
            onClose={() => setInterested(null)}
            t={t}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
