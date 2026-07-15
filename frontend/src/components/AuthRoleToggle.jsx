import { Link } from 'react-router-dom';

/**
 * Bascule bien visible en haut des pages d'auth pour différencier clairement
 * l'espace ADOPTANT de l'espace REFUGE — évite qu'un refuge se retrouve par
 * erreur dans le questionnaire adoptant.
 *
 * @param {'adoptant'|'shelter'} active - l'espace de la page courante
 * @param {'login'|'register'} mode     - préserve le mode en changeant d'espace
 */
export default function AuthRoleToggle({ active, mode = 'login' }) {
  const adoptantTo = mode === 'login' ? '/adoptant/login' : '/adoptant/register';
  const shelterTo  = mode === 'login' ? '/shelter/login'  : '/shelter/register';

  const base = 'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-colors';
  const on   = 'bg-white text-primary shadow-sm';
  const off  = 'text-gray-500 hover:text-gray-700';

  return (
    <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl mb-6">
      <Link to={adoptantTo} className={`${base} ${active === 'adoptant' ? on : off}`}>
        🐾 J'adopte
      </Link>
      <Link to={shelterTo} className={`${base} ${active === 'shelter' ? on : off}`}>
        🏠 Je suis un refuge
      </Link>
    </div>
  );
}
