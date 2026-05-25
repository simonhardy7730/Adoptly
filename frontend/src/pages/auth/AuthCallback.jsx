import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { supabase } from '../../lib/supabase';
import LoadingSpinner from '../../components/LoadingSpinner';

/**
 * Page de callback OAuth Google.
 * Supabase redirige ici après la connexion Google (flux PKCE).
 * On attend l'événement SIGNED_IN pour être sûr que l'échange de code est terminé,
 * puis on échange le token Supabase contre un JWT Adoptly.
 */
export default function AuthCallback() {
  const navigate  = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    if (!supabase) {
      navigate('/adoptant/login');
      return;
    }

    let handled = false;

    // onAuthStateChange capte le SIGNED_IN APRÈS que Supabase
    // a échangé le ?code= PKCE contre une vraie session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (handled) return;

        if (event === 'SIGNED_IN' && session?.access_token) {
          handled = true;
          try {
            const { data } = await api.post('/auth/google', {
              access_token: session.access_token,
            });
            login(data.token, data.user, 'adoptant');
            navigate(
              data.user.questionnaire_answers ? '/adoptant/swipe' : '/adoptant/questionnaire'
            );
          } catch (err) {
            console.error('[AuthCallback] erreur backend:', err);
            navigate('/adoptant/login');
          }
        }
      }
    );

    // Fallback : si aucun événement après 10 secondes → retour login
    const timeout = setTimeout(() => {
      if (!handled) {
        console.warn('[AuthCallback] timeout — aucune session reçue');
        navigate('/adoptant/login');
      }
    }, 10_000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate, login]);

  return (
    <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center gap-4">
      <LoadingSpinner size="lg" />
      <p className="text-gray-500 text-sm">Connexion en cours…</p>
    </div>
  );
}
