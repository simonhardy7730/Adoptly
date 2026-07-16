import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../lib/api';

function timeAgo(iso) {
  if (!iso) return '';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d < 1) return "aujourd'hui";
  if (d === 1) return 'hier';
  if (d < 7) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function dueStatus(due) {
  const d = new Date(due); d.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  if (diff < 0)   return { label: `en retard (${-diff} j)`, cls: 'bg-red-100 text-red-700' };
  if (diff === 0) return { label: "aujourd'hui",            cls: 'bg-blue-100 text-blue-700' };
  if (diff <= 7)  return { label: `dans ${diff} j`,         cls: 'bg-amber-100 text-amber-700' };
  return { label: new Date(due).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }), cls: 'bg-gray-100 text-gray-600' };
}

const COLUMNS = [
  { key: 'interested', label: 'Intéressé',             dot: 'bg-blue-400' },
  { key: 'discussion', label: 'En discussion',         dot: 'bg-amber-400' },
  { key: 'visit',      label: 'Visite / visio prévue', dot: 'bg-purple-400' },
  { key: 'adopted',    label: 'Adopté',                dot: 'bg-green-500' },
];
const STAGE_OPTS = [
  { v: 'interested', t: 'Intéressé' },
  { v: 'discussion', t: 'En discussion' },
  { v: 'visit',      t: 'Visite / visio prévue' },
  { v: 'adopted',    t: 'Adopté' },
];
const REMINDER_TYPES = [
  { key: 'vaccin',        label: 'Vaccin',        emoji: '💉' },
  { key: 'sterilisation', label: 'Stérilisation', emoji: '✂️' },
  { key: 'vermifuge',     label: 'Vermifuge',     emoji: '🪱' },
  { key: 'visite',        label: 'Visite véto',   emoji: '🩺' },
];
const typeMeta = (t) => REMINDER_TYPES.find((x) => x.key === t) || { label: t, emoji: '🔔' };

export default function SuiviAdoptions() {
  const navigate = useNavigate();
  const [groups,    setGroups]    = useState({ interested: [], discussion: [], visit: [], adopted: [] });
  const [reminders, setReminders] = useState([]);
  const [animals,   setAnimals]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [form,      setForm]      = useState({ animal_id: '', type: 'vaccin', due_date: '', label: '' });
  const [saving,    setSaving]    = useState(false);

  const loadPipeline  = () => api.get('/shelter/pipeline').then(({ data }) => setGroups(data)).catch(() => {});
  const loadReminders = () => api.get('/shelter/reminders').then(({ data }) => setReminders(data.reminders || [])).catch(() => {});

  useEffect(() => {
    Promise.all([
      loadPipeline(),
      loadReminders(),
      api.get('/shelter/animals-simple').then(({ data }) => setAnimals(data.animals || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  async function changeStage(card, current, next) {
    if (!next || next === current) return;
    if (next === 'adopted' &&
        !window.confirm(`Marquer ${card.animal_name} comme adopté ? Les autres adoptants intéressés seront prévenus.`)) return;

    setGroups((g) => ({
      ...g,
      [current]: (g[current] || []).filter((c) => c.match_id !== card.match_id),
      [next]:    [card, ...(g[next] || [])],
    }));
    try {
      if (next === 'adopted') {
        await api.patch(`/shelter/animals/${card.animal_id}/adopted`);
        loadPipeline();
      } else {
        await api.patch(`/shelter/matches/${card.match_id}/stage`, { stage: next });
      }
    } catch {
      alert('Erreur lors du déplacement.');
      loadPipeline();
    }
  }

  async function addReminder(e) {
    e.preventDefault();
    if (!form.animal_id || !form.due_date) return;
    setSaving(true);
    try {
      await api.post('/shelter/reminders', form);
      setForm({ animal_id: '', type: 'vaccin', due_date: '', label: '' });
      setShowForm(false);
      loadReminders();
    } catch (err) { alert(err.response?.data?.error || 'Erreur.'); }
    finally { setSaving(false); }
  }
  async function markDone(id)    { await api.patch(`/shelter/reminders/${id}`, { done: true }).catch(() => {}); loadReminders(); }
  async function delReminder(id) { if (!window.confirm('Supprimer ce rappel ?')) return; await api.delete(`/shelter/reminders/${id}`).catch(() => {}); loadReminders(); }

  const pipelineTotal = COLUMNS.reduce((s, c) => s + (groups[c.key]?.length || 0), 0);

  return (
    <div className="min-h-screen bg-bg-light">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-primary">Suivi quotidien</h1>
          <p className="text-gray-500 text-sm mt-1">
            Le suivi de votre refuge au jour le jour : rappels santé et adoptants intéressés.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : (
          <>
            {/* ── Rappels santé ── */}
            <section className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-800 flex items-center gap-2">🔔 Rappels santé</h2>
                <button onClick={() => setShowForm((v) => !v)}
                        className="text-sm font-semibold text-secondary hover:text-primary bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                  {showForm ? '× Fermer' : '+ Ajouter un rappel'}
                </button>
              </div>

              {showForm && (
                <form onSubmit={addReminder} className="bg-gray-50 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select required value={form.animal_id} onChange={(e) => setForm({ ...form, animal_id: e.target.value })} className="input-field">
                    <option value="">Choisir un animal…</option>
                    {animals.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-field">
                    {REMINDER_TYPES.map((t) => <option key={t.key} value={t.key}>{t.emoji} {t.label}</option>)}
                  </select>
                  <input type="date" required value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="input-field" />
                  <input type="text" placeholder="Note (optionnel)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="input-field" />
                  <button type="submit" disabled={saving} className="btn-primary text-sm py-2.5 sm:col-span-2">
                    {saving ? '…' : 'Ajouter le rappel'}
                  </button>
                </form>
              )}

              {reminders.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-2">Aucun rappel à venir. Ajoutez-en pour ne rien oublier ! 💉</p>
              ) : (
                <div className="space-y-2">
                  {reminders.map((r) => {
                    const meta = typeMeta(r.type);
                    const st = dueStatus(r.due_date);
                    return (
                      <div key={r.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-3 py-2.5">
                        <span className="text-xl">{meta.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-sm truncate">{meta.label} — {r.animal_name || 'Animal'}</p>
                          {r.label && <p className="text-gray-400 text-xs truncate">{r.label}</p>}
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-lg whitespace-nowrap ${st.cls}`}>{st.label}</span>
                        <button onClick={() => markDone(r.id)} title="Marquer fait" className="text-green-600 hover:bg-green-50 px-2 py-1 rounded-lg text-sm">✓</button>
                        <button onClick={() => delReminder(r.id)} title="Supprimer" className="text-gray-300 hover:text-red-500 px-1 text-sm">🗑</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── Pipeline ── */}
            <section className="space-y-3">
              <h2 className="font-bold text-gray-800">Suivi des adoptions</h2>
              {pipelineTotal === 0 ? (
                <div className="card p-8 text-center space-y-2">
                  <div className="text-5xl">🐾</div>
                  <p className="text-gray-500 font-medium">Aucun adoptant intéressé pour l'instant</p>
                  <p className="text-gray-400 text-sm">Dès qu'un adoptant s'intéresse à un de vos animaux, il apparaîtra ici.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {COLUMNS.map((col) => {
                    const cards = groups[col.key] || [];
                    return (
                      <div key={col.key} className="bg-gray-50 rounded-2xl p-3">
                        <div className="flex items-center gap-2 mb-3 px-1">
                          <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                          <span className="font-bold text-gray-700 text-xs">{col.label}</span>
                          <span className="ml-auto text-xs text-gray-400 font-medium">{cards.length}</span>
                        </div>
                        <div className="space-y-2">
                          {cards.length === 0 ? (
                            <p className="text-xs text-gray-300 text-center py-4">—</p>
                          ) : cards.map((c, i) => (
                            <motion.div key={c.match_id}
                              className="bg-white rounded-xl border border-gray-100 p-3 space-y-2 shadow-sm"
                              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                              <div className="flex items-center gap-2.5">
                                {c.animal_photo ? (
                                  <img src={c.animal_photo} alt={c.animal_name} className="w-9 h-9 rounded-lg object-cover object-top flex-shrink-0" />
                                ) : (
                                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-lg flex-shrink-0">🐾</div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-bold text-gray-800 text-sm truncate">{c.animal_name}</p>
                                  <p className="text-gray-500 text-xs truncate">{c.adoptant_name}</p>
                                </div>
                              </div>
                              {col.key !== 'adopted' && (
                                <div className="flex items-center gap-1.5">
                                  <select value={col.key} onChange={(e) => changeStage(c, col.key, e.target.value)}
                                          className="flex-1 text-xs border border-gray-200 rounded-lg py-1 px-1.5 bg-white text-gray-600">
                                    {STAGE_OPTS.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
                                  </select>
                                  <button onClick={() => navigate(`/shelter/chat/${c.match_id}`)}
                                          className="text-xs font-semibold text-secondary hover:text-primary bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg whitespace-nowrap">💬</button>
                                </div>
                              )}
                              <p className="text-[11px] text-gray-400">{timeAgo(c.timestamp)}</p>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
