import { createContext, useContext } from 'react';
import { translations } from '../lib/translations';

const LanguageContext = createContext(null);

// Site 100% français : le néerlandais a été retiré (confusion utilisateurs).
// On garde le contexte pour ne pas toucher aux appels t() existants.
export function LanguageProvider({ children }) {
  const lang = 'fr';
  function setLang() {}

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
