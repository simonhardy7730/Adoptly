import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../lib/api';

export default function Navbar() {
  const { role, logout } = useAuth();
  const navigate = useNavigate();
  const { t, lang, setLang } = useLanguage();
  const [unreadCount, setUnreadCount] = useState(0);

  // Polling des messages non lus toutes les 10s
  useEffect(() => {
    if (!role || role === 'foster') return;
    function fetchUnread() {
      api.get('/messages/unread/count')
        .then(({ data }) => setUnreadCount(data.count || 0))
        .catch(() => {});
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 10000);
    return () => clearInterval(interval);
  }, [role]);

  function handleLogout() {
    logout();
    navigate('/');
  }

  const UnreadBadge = () => unreadCount > 0 ? (
    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  ) : null;

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
                {t('nav_discover')}
              </Link>
              <Link to="/adoptant/matches" className="relative btn-ghost text-sm py-1.5 px-3">
                {t('nav_matches')}
                <UnreadBadge />
              </Link>
              <Link to="/adoptant/profile" className="btn-ghost text-sm py-1.5 px-3">
                {t('nav_profile')}
              </Link>

              {/* Toggle FR / NL */}
              <button
                onClick={() => setLang(lang === 'fr' ? 'nl' : 'fr')}
                className="text-xs font-bold px-2 py-1 rounded-lg border border-gray-200
                           text-gray-500 hover:border-secondary hover:text-secondary transition-colors"
                title={lang === 'fr' ? 'Switch to Nederlands' : 'Passer en français'}
              >
                {lang === 'fr' ? 'NL' : 'FR'}
              </button>
            </>
          )}

          {role === 'shelter' && (
            <>
              <Link to="/shelter/dashboard" className="relative btn-ghost text-sm py-1.5 px-3">
                {t('nav_dashboard')}
                <UnreadBadge />
              </Link>
              <Link to="/shelter/animals/add" className="btn-ghost text-sm py-1.5 px-3">
                {t('nav_add')}
              </Link>
              <Link to="/shelter/profile" className="btn-ghost text-sm py-1.5 px-3">
                {t('nav_profile')}
              </Link>

              {/* Toggle FR / NL */}
              <button
                onClick={() => setLang(lang === 'fr' ? 'nl' : 'fr')}
                className="text-xs font-bold px-2 py-1 rounded-lg border border-gray-200
                           text-gray-500 hover:border-secondary hover:text-secondary transition-colors"
                title={lang === 'fr' ? 'Switch to Nederlands' : 'Passer en français'}
              >
                {lang === 'fr' ? 'NL' : 'FR'}
              </button>
            </>
          )}

          <button
            onClick={handleLogout}
            className="text-sm py-1.5 px-3 rounded-xl font-medium text-red-400
                       hover:bg-red-50 hover:text-red-500 active:scale-95 transition-all"
          >
            {t('nav_logout')}
          </button>
        </div>
      </div>
    </nav>
  );
}
