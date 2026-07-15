import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Lit d'abord localStorage (persistant ~30j), sinon sessionStorage (session courante)
  const readInit = (key) => localStorage.getItem(key) ?? sessionStorage.getItem(key);

  const [token, setToken] = useState(() => readInit('token'));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(readInit('user') || 'null');
    } catch {
      return null;
    }
  });
  const [role, setRole] = useState(() => readInit('role'));

  // remember=true → localStorage (reste connecté) ; false → sessionStorage (déconnexion à la fermeture du navigateur)
  const login = useCallback((tokenVal, userData, roleVal, remember = true) => {
    const store = remember ? localStorage : sessionStorage;
    const other = remember ? sessionStorage : localStorage;
    store.setItem('token', tokenVal);
    store.setItem('user', JSON.stringify(userData));
    store.setItem('role', roleVal);
    ['token', 'user', 'role'].forEach((k) => other.removeItem(k));
    setToken(tokenVal);
    setUser(userData);
    setRole(roleVal);
  }, []);

  const logout = useCallback(() => {
    ['token', 'user', 'role'].forEach((k) => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
    setToken(null);
    setUser(null);
    setRole(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
