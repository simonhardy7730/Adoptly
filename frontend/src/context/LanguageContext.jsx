import { createContext, useContext, useState } from 'react';
import { translations } from '../lib/translations';

const LanguageContext = createContext(null);

/** Détecte la langue du navigateur au premier chargement */
function detectDefaultLang() {
  const saved = localStorage.getItem('shelter_lang');
  if (saved === 'nl' || saved === 'fr') return saved;
  const browser = (navigator.language || '').toLowerCase();
  return browser.startsWith('nl') ? 'nl' : 'fr';
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(detectDefaultLang);

  function setLang(l) {
    setLangState(l);
    localStorage.setItem('shelter_lang', l);
  }

  /**
   * Retourne la chaîne traduite.
   * Supporte les variables : t('confirm_delete_title', { name: 'Rex' })
   */
  function t(key, vars = {}) {
    let str = translations[lang]?.[key] ?? translations.fr[key] ?? key;
    Object.entries(vars).forEach(([k, v]) => {
      str = str.replace(`{${k}}`, v);
    });
    return str;
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
