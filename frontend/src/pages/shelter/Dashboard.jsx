import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../../components/Navbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../lib/api';
import { thumb } from '../../lib/img';

// ── Modal : liste des adoptants intéressés ────────────────
function InterestedModal({ animal, onClose, t }) {
  const navigate = useNavigate();
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
                  <div className="flex-shrink-0 text-right space-y-1">
                    <p className="text-gray-300 text-xs">{date}</p>
                    {person.contacted && (
                      <p className="text-blue-400 text-xs">{t('interested_contacted')}</p>
                    )}
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => {
                          onClose();
                          navigate(`/shelter/chat/${person.match_id}`);
                        }}
                        className="text-xs font-medium text-secondary hover:text-primary bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors"
                      >
                        💬
                      </button>
                      <button
                        title="Retirer ce contact"
                        onClick={async () => {
                          if (!window.confirm('Retirer ce contact de la liste ? Il disparaîtra aussi du suivi quotidien.')) return;
                          try {
                            await api.patch(`/shelter/matches/${person.match_id}/dismiss`);
                            setInterested((prev) => prev.filter((p) => p.match_id !== person.match_id));
                          } catch {
                            alert('Erreur, réessayez.');
                          }
                        }}
                        className="text-xs text-gray-300 hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                      >
                        ✕
                      </button>
                    </div>
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

const SPECIES_FR = { dog: 'Chien', cat: 'Chat', rabbit: 'Lapin', guinea_pig: 'Cobaye', other: 'Autre' };

function StatCard({ value, label, emoji, onClick }) {
  return (
    <div
      className={`card p-4 text-center space-y-1 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-secondary/30 transition-all active:scale-95' : ''}`}
      onClick={onClick}
    >
      <p className="text-2xl">{emoji}</p>
      <p className="text-2xl font-extrabold text-primary">{value}</p>
      <p className="text-gray-500 text-xs">{label}</p>
    </div>
  );
}

function PendingContactsModal({ onClose, onDismissed, t }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [dismissing, setDismissing] = useState(null);

  useEffect(() => {
    api.get('/shelter/pending-contacts')
      .then(({ data }) => setContacts(data.contacts || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function dismiss(matchId) {
    setDismissing(matchId);
    try {
      await api.patch(`/shelter/matches/${matchId}/dismiss`);
      setContacts((prev) => prev.filter((c) => c.match_id !== matchId));
      onDismissed?.();
    } catch {
      alert('Impossible de retirer ce contact. Réessayez.');
    } finally {
      setDismissing(null);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl"
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-800">Contacts en attente</h3>
            <p className="text-gray-400 text-xs mt-0.5">
              {contacts.length} {contacts.length > 1 ? 'personnes ont eu un coup de cœur pour vos animaux' : 'personne a eu un coup de cœur pour vos animaux'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <p className="text-xs text-gray-600 bg-blue-50 px-5 py-2.5 leading-relaxed">
          💡 Ces personnes ont <strong>liké</strong> vos animaux : à vous de leur écrire en premier avec « Message ». Répondez ici dans Adoptly — jamais par email, l'adoptant ne le recevrait pas.
        </p>

        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8"><LoadingSpinner size="md" /></div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              🎉 Aucun coup de cœur en attente !
            </div>
          ) : (
            contacts.map((c) => {
              const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Anonyme';
              const date = new Date(c.timestamp).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'short',
              });
              return (
                <div key={c.match_id} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
                  {c.animal_photo ? (
                    <img src={thumb(c.animal_photo, 200)} alt={c.animal_name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 text-lg">🐾</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-700 text-sm truncate">{name}</p>
                    <p className="text-gray-400 text-xs truncate">
                      💚 Coup de cœur pour <span className="font-medium text-primary">{c.animal_name}</span>
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                    <span className="text-gray-300 text-xs">{date}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => dismiss(c.match_id)}
                        disabled={dismissing === c.match_id}
                        title="Retirer ce contact de la liste"
                        className="text-xs font-medium text-gray-500 bg-gray-100 hover:bg-red-50 hover:text-red-600 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
                      >
                        {dismissing === c.match_id ? '…' : '✕ Retirer'}
                      </button>
                      <button
                        onClick={() => {
                          onClose();
                          navigate(`/shelter/chat/${c.match_id}`);
                        }}
                        className="text-sm font-medium text-white bg-secondary hover:bg-primary px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                      >
                        💬 Écrire
                      </button>
                    </div>
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

function ConfirmModal({ name, isAdopted, onConfirm, onCancel, t }) {
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
          {isAdopted && (
            <p className="text-amber-700 text-sm bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              ⚠️ {name} fait partie de vos <strong>adoptions réussies</strong> et compte dans vos
              statistiques. Si c'est un doublon, supprimez — sinon, il vaut mieux le garder dans
              « Ils ont trouvé leur famille ».
            </p>
          )}
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

function FeedbackModal({ onClose }) {
  const [category, setCategory] = useState('suggestion');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      await api.post('/shelter/feedback', { category, message });
      setSent(true);
    } catch {
      alert('Erreur lors de l\'envoi. Réessayez.');
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-4">💚</div>
          <h3 className="font-bold text-gray-800 text-lg mb-2">Merci pour votre retour !</h3>
          <p className="text-gray-500 text-sm mb-6">Votre message a bien été envoyé. Nous reviendrons vers vous rapidement.</p>
          <button onClick={onClose} className="btn-primary w-full py-3 text-sm">Fermer</button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl"
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-800 text-lg">Votre avis compte</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Type de retour</label>
            <div className="flex gap-2">
              {[
                { value: 'suggestion', label: '💡 Suggestion', bg: 'bg-orange-50 border-orange-200 text-orange-700' },
                { value: 'bug', label: '🐛 Bug', bg: 'bg-red-50 border-red-200 text-red-700' },
                { value: 'question', label: '❓ Question', bg: 'bg-blue-50 border-blue-200 text-blue-700' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCategory(opt.value)}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold border-2 transition-all
                    ${category === opt.value ? opt.bg : 'bg-gray-50 border-transparent text-gray-400'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Votre message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={category === 'bug' ? 'Décrivez le problème rencontré...' : category === 'question' ? 'Posez votre question...' : 'Partagez votre idée...'}
              rows={4}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary"
              required
            />
          </div>

          <button
            type="submit"
            disabled={sending || !message.trim()}
            className="btn-primary w-full py-3 text-sm disabled:opacity-50"
          >
            {sending ? 'Envoi en cours…' : 'Envoyer mon retour'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// Mini-guide refuge : expliqué au 1er login + accessible via « Comment ça marche ».
// Clarifie coup de cœur vs message, "répondre dans l'app", et "passer en Adopté
// plutôt que supprimer une fiche" (pour que les adoptants soient prévenus).
function RefugeGuide({ onClose }) {
  const steps = [
    { emoji: '💚', title: 'Un « coup de cœur »', body: "Un adoptant a liké un de vos animaux. Ce n'est pas encore un message : c'est à VOUS de lui écrire en premier — dans « Contacts en attente », puis le bouton « Message »." },
    { emoji: '💬', title: 'Un message reçu', body: "L'adoptant vous a écrit : vous le retrouvez dans « Messages ». Répondez-lui directement là." },
    { emoji: '📱', title: 'Répondez toujours dans Adoptly', body: "Ne répondez jamais à l'email de notification : l'adoptant ne le recevrait pas. Toutes les réponses se font depuis la plateforme." },
    { emoji: '🏡', title: "Un animal n'est plus à l'adoption ?", body: "Passez-le en « Adopté » (au lieu de supprimer sa fiche) : les adoptants intéressés reçoivent alors un email automatique. Personne ne reste sans nouvelle." },
  ];
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-3xl w-full max-w-md max-h-[88vh] flex flex-col shadow-2xl"
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-extrabold text-primary text-lg">Comment ça marche 🐾</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {steps.map((s, i) => (
            <div key={i} className="flex gap-3">
              <span className="text-2xl flex-shrink-0">{s.emoji}</span>
              <div>
                <p className="font-bold text-gray-800 text-sm">{s.title}</p>
                <p className="text-gray-500 text-sm leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-100">
          <button onClick={onClose} className="btn-primary w-full py-3 text-sm">J'ai compris 👍</button>
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
  const [showFeedback, setShowFeedback] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  function shareAnimal(animal) {
    const url = `https://adoptly.fr/share/animal/${animal.id}`;
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

  // Lien du mail refuge « ✍️ Écrire à… » (?contacts=1) → ouvre directement
  // la liste des coups de cœur, plutôt que d'atterrir sur le tableau générique.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('contacts') === '1') {
      setShowPending(true);
    }
  }, []);

  // Guide affiché une seule fois, au premier passage sur le tableau de bord.
  useEffect(() => {
    if (!localStorage.getItem('adoptly_refuge_guide_v1')) setShowGuide(true);
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
    if (!window.confirm(`Êtes-vous sûr de vouloir marquer ${animal.name} comme adopté(e) ? Cette action notifiera tous les adoptants intéressés.`)) return;
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

  async function markActive(animal) {
    setMarkingAdopted(animal.id);
    try {
      await api.patch(`/shelter/animals/${animal.id}/reactivate`);
      setData((d) => ({
        ...d,
        animals: d.animals.map((a) => a.id === animal.id ? { ...a, status: 'active' } : a),
      }));
    } catch {}
    setMarkingAdopted(null);
  }

  async function toggleReserved(animal) {
    const reserved = animal.status !== 'reserved';
    setMarkingAdopted(animal.id);
    try {
      await api.patch(`/shelter/animals/${animal.id}/reserve`, { reserved });
      setData((d) => ({
        ...d,
        animals: d.animals.map((a) => a.id === animal.id ? { ...a, status: reserved ? 'reserved' : 'active' } : a),
      }));
    } catch {}
    setMarkingAdopted(null);
  }

  const STATUS_COLOR = {
    active: 'bg-green-100 text-green-700',
    reserved: 'bg-amber-100 text-amber-700',
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
                <button
                  onClick={() => setShowGuide(true)}
                  className="text-xs font-semibold text-secondary hover:text-primary mt-1 transition-colors"
                >
                  ❓ Comment ça marche ?
                </button>
              </div>
              <Link to="/shelter/animals/add" className="btn-primary text-sm py-2.5 px-4">
                {t('dash_add_btn')}
              </Link>
            </div>

            {/* Accès à la page dédiée "Suivi des adoptions" (opt-in) */}
            <Link
              to="/shelter/suivi"
              className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow group"
            >
              <span className="text-2xl">📋</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-sm">Suivi quotidien</p>
                <p className="text-gray-500 text-xs">Adoptions et santé de vos animaux, jour après jour</p>
              </div>
              <span className="text-secondary group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>

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
              <StatCard
                value={data?.stats?.pending_contacts ?? 0}
                label={t('dash_stat_contacts')}
                emoji="💚"
                onClick={(data?.stats?.pending_contacts ?? 0) > 0 ? () => setShowPending(true) : undefined}
              />
            </div>

            {/* Bandeau « coups de cœur à contacter » — distinct des messages reçus.
                Clarifie que c'est à VOUS d'écrire en premier (source de confusion refuge). */}
            {(data?.stats?.pending_contacts ?? 0) > 0 && (
              <button
                onClick={() => setShowPending(true)}
                className="card w-full p-4 flex items-center gap-3 text-left bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 hover:shadow-md transition-shadow"
              >
                <span className="text-2xl flex-shrink-0">💚</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 text-sm">
                    {data.stats.pending_contacts} coup{data.stats.pending_contacts > 1 ? 's' : ''} de cœur en attente
                  </p>
                  <p className="text-gray-500 text-xs">
                    Ces adoptants ont liké vos animaux — à vous de leur écrire en premier 💬
                  </p>
                </div>
                <span className="flex-shrink-0 text-xs font-semibold text-white bg-secondary px-3 py-1.5 rounded-lg whitespace-nowrap">
                  ✍️ Écrire
                </span>
              </button>
            )}

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
                  {[...data.animals].sort((a, b) => (a.status === 'adopted') - (b.status === 'adopted')).map((animal, i, arr) => {
                    const photo = animal.photos?.[0];
                    const isFirstAdopted = animal.status === 'adopted' && arr[i - 1]?.status !== 'adopted';
                    return (
                      <div key={animal.id}>
                        {isFirstAdopted && (
                          <div className="mt-6 mb-3">
                            <h2 className="font-bold text-gray-700">🎉 Ils ont trouvé leur famille</h2>
                            <p className="text-gray-400 text-xs mt-0.5">
                              Vos belles histoires restent ici et comptent dans vos statistiques — inutile de les supprimer.
                            </p>
                          </div>
                        )}
                      <motion.div
                        className="card p-4 flex gap-4"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        {/* Photo + nom */}
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className="w-20 h-20 rounded-xl overflow-hidden bg-blue-50">
                            {photo ? (
                              <img src={thumb(photo, 400)} alt={animal.name} loading="lazy" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl">🐾</div>
                            )}
                          </div>
                          <p className="text-sm font-bold text-primary mt-1.5 text-center max-w-[80px] truncate">{animal.name}</p>
                        </div>

                        {/* Infos */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={`badge text-xs flex-shrink-0 ${STATUS_COLOR[animal.status] || STATUS_COLOR.active}`}
                            >
                              {animal.status === 'adopted' ? t('dash_status_adopted') : animal.status === 'reserved' ? 'Réservé' : t('dash_status_active')}
                            </span>
                          </div>
                          <p className="text-gray-500 text-xs mt-0.5">
                            {SPECIES_FR[animal.species] || animal.species}{animal.breed ? ` · ${animal.breed}` : ''}
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
                              onClick={() => toggleReserved(animal)}
                              disabled={markingAdopted === animal.id}
                              className="text-xs font-medium text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              {animal.status === 'reserved' ? '🔓 Rendre disponible' : '🔖 Réserver'}
                            </button>
                          )}
                          {animal.status !== 'adopted' ? (
                            <button
                              onClick={() => markAdopted(animal)}
                              disabled={markingAdopted === animal.id}
                              className="text-xs font-medium text-purple-500 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              {markingAdopted === animal.id ? '…' : t('dash_mark_adopted')}
                            </button>
                          ) : (
                            <button
                              onClick={() => markActive(animal)}
                              disabled={markingAdopted === animal.id}
                              className="text-xs font-medium text-green-500 hover:text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              {markingAdopted === animal.id ? '…' : 'Remettre actif'}
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
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Bouton feedback flottant */}
      <button
        onClick={() => setShowFeedback(true)}
        className="fixed bottom-6 right-6 z-40 bg-accent hover:bg-accent/90 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl transition-all active:scale-90 hover:shadow-xl"
        title="Donner votre avis"
      >
        💬
      </button>

      <AnimatePresence>
        {deleting && (
          <ConfirmModal
            name={deleting.name}
            isAdopted={deleting.status === 'adopted'}
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
        {showFeedback && (
          <FeedbackModal onClose={() => setShowFeedback(false)} />
        )}
        {showPending && (
          <PendingContactsModal
            onClose={() => setShowPending(false)}
            onDismissed={() =>
              setData((d) =>
                d?.stats
                  ? { ...d, stats: { ...d.stats, pending_contacts: Math.max(0, (d.stats.pending_contacts ?? 0) - 1) } }
                  : d
              )
            }
            t={t}
          />
        )}
        {showGuide && (
          <RefugeGuide
            onClose={() => { setShowGuide(false); localStorage.setItem('adoptly_refuge_guide_v1', '1'); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
