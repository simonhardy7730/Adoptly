import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import InstallPrompt from './InstallPrompt';
import api from '../lib/api';

export default function Navbar() {
  const { role, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const adoptantLinks = [
    { to: '/adoptant/swipe', label: t('nav_discover'), icon: '🐾' },
    { to: '/animaux', label: 'Tous les animaux', icon: '🔍' },
    { to: '/adoptant/matches', label: t('nav_matches'), icon: '💚' },
    { to: '/adoptant/messages', label: '💬 Messages', icon: null, badge: true },
    { to: '/adoptant/profile', label: t('nav_profile'), icon: '👤' },
  ];

  const shelterLinks = [
    { to: '/shelter/dashboard', label: t('nav_dashboard'), icon: '📊' },
    { to: '/shelter/messages', label: '💬 Messages', icon: null, badge: true },
    { to: '/shelter/animals/add', label: t('nav_discover') === 'Ontdekken' ? 'Toevoegen' : 'Ajouter', icon: '➕' },
    { to: '/shelter/profile', label: t('nav_profile'), icon: '🏠' },
  ];

  const links = role === 'adoptant' ? adoptantLinks : role === 'shelter' ? shelterLinks : [];

  return (
    <>
    <nav className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">

        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center
                          group-hover:bg-primary-dark transition-colors">
            <span className="text-white font-black text-sm leading-none select-none">A</span>
          </div>
          <span className="font-black text-primary text-lg tracking-tight">Adoptly</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-1">
          {links.map((link) => (
            <Link key={link.to} to={link.to} className="relative btn-ghost text-sm py-1.5 px-3">
              {link.label}
              {link.badge && <UnreadBadge />}
            </Link>
          ))}

          <button
            onClick={handleLogout}
            className="text-sm py-1.5 px-3 rounded-xl font-medium text-red-400
                       hover:bg-red-50 hover:text-red-500 active:scale-95 transition-all"
          >
            {t('nav_logout')}
          </button>
        </div>

        {/* Mobile: hamburger */}
        <div className="flex sm:hidden items-center gap-2">
          {unreadCount > 0 && (
            <Link to={role === 'shelter' ? '/shelter/messages' : '/adoptant/messages'} className="relative p-1">
              <span className="text-lg">💬</span>
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </Link>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-600
                       hover:bg-gray-100 transition-colors"
            aria-label="Menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="sm:hidden overflow-hidden bg-white border-t border-gray-100"
          >
            <div className="px-4 py-2 space-y-1">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="relative block py-2.5 px-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  {link.icon && <span className="mr-2">{link.icon}</span>}
                  {link.label}
                  {link.badge && unreadCount > 0 && (
                    <span className="ml-2 inline-flex min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full items-center justify-center px-1">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
              ))}

              <button
                onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                className="block w-full text-left py-2.5 px-3 text-sm font-medium text-red-400 hover:bg-red-50 rounded-xl transition-colors"
              >
                {t('nav_logout')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
    <InstallPrompt />
    </>
  );
}
