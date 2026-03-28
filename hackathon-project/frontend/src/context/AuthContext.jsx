import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const SESSION_KEY = 'nl_cleaner_auth';

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    // Rehydrate from sessionStorage on page refresh
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      return stored ? JSON.parse(stored) : { token: null, user: null };
    } catch {
      return { token: null, user: null };
    }
  });

  // Keep sessionStorage in sync whenever auth changes
  useEffect(() => {
    if (auth.token) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(auth));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, [auth]);

  function login(token, user) {
    setAuth({ token, user });
  }

  function logout() {
    setAuth({ token: null, user: null });
  }

  return (
    <AuthContext.Provider value={{ ...auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
