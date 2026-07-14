import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

/**
 * Connexion par lien magique : échange le token (reçu par email) contre une
 * vraie session, puis ouvre directement la conversation concernée. Aucun mot
 * de passe requis — c'est ce qui débloque les réponses des adoptants.
 */
export default function MagicLogin() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const { login }  = useAuth();
  const [status, setStatus] = useState('loading'); // loading | error
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return; // évite le double appel en StrictMode
    done.current = true;

    const token = params.get('token');
    if (!token) { setStatus('error'); return; }

    api.post('/auth/magic', { token })
      .then(({ data }) => {
        login(data.token, data.user, data.role);
        navigate(data.matchId ? `/chat/${data.matchId}` : '/adoptant/messages', { replace: true });
      })
      .catch(() => setStatus('error'));
  }, []);

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-bg-light flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-5xl">⏳</div>
          <h1 className="text-xl font-extrabold text-gray-900">Ce lien a expiré</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Pas de souci — connecte-toi pour retrouver ta conversation avec le refuge.
          </p>
          <Link
            to="/adoptant/login"
            className="btn-primary inline-flex items-center justify-center px-6 py-3 text-sm"
          >
            Me connecter →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-light flex items-center justify-center px-6">
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-gray-500 text-sm">Connexion en cours…</p>
      </div>
    </div>
  );
}
