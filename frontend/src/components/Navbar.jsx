import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { role, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">

        {/* Logo Adoptly */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center
                          group-hover:bg-primary-dark transition-colors">
            <span className="text-white font-black text-sm leading-none select-none">A</span>
          </div>
          <span className="font-black text-primary text-lg tracking-tight">Adoptly</span>
        </Link>

        {/* Navigation contextuelle */}
        <div className="flex items-center gap-1">
          {role === 'adoptant' && (
            <>
              <Link to="/adoptant/swipe" className="btn-ghost text-sm py-1.5 px-3">
                Découvrir
              </Link>
              <Link to="/adoptant/matches" className="btn-ghost text-sm py-1.5 px-3">
                Mes matchs
              </Link>
            </>
          )}
          {role === 'shelter' && (
            <>
              <Link to="/shelter/dashboard" className="btn-ghost text-sm py-1.5 px-3">
                Tableau de bord
              </Link>
              <Link to="/shelter/animals/add" className="btn-ghost text-sm py-1.5 px-3">
                + Ajouter
              </Link>
            </>
          )}
          <button
            onClick={handleLogout}
            className="text-sm py-1.5 px-3 rounded-xl font-medium text-red-400
                       hover:bg-red-50 hover:text-red-500 active:scale-95 transition-all"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </nav>
  );
}
