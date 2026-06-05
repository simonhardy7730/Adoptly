import { useState } from 'react';
import { motion } from 'framer-motion';
import api from '../../lib/api';
import LoadingSpinner from '../../components/LoadingSpinner';

function StatCard({ label, value, sub, color = 'text-primary' }) {
  return (
    <div className="card p-5 text-center">
      <p className={`text-4xl font-extrabold ${color}`}>{value ?? '—'}</p>
      <p className="text-gray-700 font-semibold text-sm mt-1">{label}</p>
      {sub && <p className="text-gray-400 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-BE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export default function AdminDashboard() {
  const [secret,  setSecret]  = useState(() => sessionStorage.getItem('admin_secret') || '');
  const [input,   setInput]   = useState('');
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function fetchStats(s) {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/admin/stats?secret=${encodeURIComponent(s)}`);
      setStats(data);
      setSecret(s);
      sessionStorage.setItem('admin_secret', s);
    } catch (err) {
      setError(err.response?.status === 401
        ? 'Mot de passe incorrect.'
        : err.response?.data?.error || 'Erreur lors du chargement.');
      sessionStorage.removeItem('admin_secret');
    } finally {
      setLoading(false);
    }
  }

  // Auto-fetch if secret already stored
  if (secret && !stats && !loading && !error) {
    fetchStats(secret);
  }

  function handleLogin(e) {
    e.preventDefault();
    if (!input.trim()) return;
    fetchStats(input.trim());
  }

  function handleLogout() {
    setStats(null);
    setSecret('');
    setInput('');
    sessionStorage.removeItem('admin_secret');
  }

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!stats && !loading) {
    return (
      <div className="min-h-screen bg-bg-light flex items-center justify-center px-6">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="text-white font-black text-xl">A</span>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900">Admin Adoptly</h1>
            <p className="text-gray-400 text-sm mt-1">Tableau de bord interne</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe admin</label>
              <input
                type="password"
                required
                className="input-field"
                placeholder="••••••••"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-2xl">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full py-4 text-base">
              Accéder au dashboard
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // ── Loading screen ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-bg-light flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg-light">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
            <span className="text-white font-black text-sm">A</span>
          </div>
          <span className="font-black text-primary text-lg tracking-tight">Adoptly Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-gray-400 text-xs hidden sm:block">
            Mis à jour : {stats?.generatedAt || '—'}
          </p>
          <button
            onClick={() => fetchStats(secret)}
            className="text-xs text-secondary font-semibold hover:underline"
          >
            Actualiser
          </button>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-red-500 font-semibold transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">

        {/* ── Chiffres clés ────────────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Vue d'ensemble</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard label="Adoptants" value={stats?.adoptants?.total} color="text-primary" />
            <StatCard label="Refuges" value={stats?.shelters?.total} color="text-secondary" />
            <StatCard label="Animaux" value={stats?.animals?.total} color="text-accent" />
          </div>
        </section>

        {/* ── Animaux actifs / adoptés ─────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Animaux</h2>
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              label="Actifs"
              value={stats?.animals?.active}
              color="text-green-600"
            />
            <StatCard
              label="Adoptés"
              value={stats?.animals?.adopted}
              color="text-purple-600"
            />
          </div>
        </section>

        {/* ── Nouveaux inscriptions ────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Nouvelles inscriptions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Adoptants (7j)"
              value={stats?.adoptants?.last7d}
              color="text-primary"
            />
            <StatCard
              label="Adoptants (30j)"
              value={stats?.adoptants?.last30d}
              color="text-primary"
            />
            <StatCard
              label="Refuges (7j)"
              value={stats?.shelters?.last7d}
              color="text-secondary"
            />
            <StatCard
              label="Refuges (30j)"
              value={stats?.shelters?.last30d}
              color="text-secondary"
            />
          </div>
        </section>

        {/* ── Derniers adoptants ───────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Derniers adoptants</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-semibold">Email</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-semibold">Inscrit le</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.adoptants?.recent || []).map((a, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-700 truncate max-w-[200px]">{a.email}</td>
                    <td className="px-4 py-3 text-gray-400 text-right whitespace-nowrap">{formatDate(a.created_at)}</td>
                  </tr>
                ))}
                {!stats?.adoptants?.recent?.length && (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-gray-400">Aucun adoptant</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Derniers refuges ─────────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Derniers refuges</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-semibold">Nom</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-semibold hidden sm:table-cell">Email</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-semibold">Inscrit le</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.shelters?.recent || []).map((s, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-700 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-gray-400 truncate max-w-[180px] hidden sm:table-cell">{s.email}</td>
                    <td className="px-4 py-3 text-gray-400 text-right whitespace-nowrap">{formatDate(s.created_at)}</td>
                  </tr>
                ))}
                {!stats?.shelters?.recent?.length && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-gray-400">Aucun refuge</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
