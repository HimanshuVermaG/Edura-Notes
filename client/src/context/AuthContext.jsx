import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getApiUrl, clearBlobCache } from '../api/client';

const AuthContext = createContext(null);
const TOKEN_KEY = 'notes_token';
const USER_KEY = 'notes_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(!!localStorage.getItem(TOKEN_KEY));

  const setToken = useCallback((newToken, newUser) => {
    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken);
      if (newUser) localStorage.setItem(USER_KEY, JSON.stringify(newUser));
      setTokenState(newToken);
      setUser(newUser || (newUser === null ? null : JSON.parse(localStorage.getItem(USER_KEY) || 'null')));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setTokenState(null);
      setUser(null);
      // A viewed file's blob can otherwise still be served from the local
      // cache with no auth check, even after the session ends — see
      // api/client.js's clearBlobCache for the full explanation.
      clearBlobCache();
    }
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
  }, [setToken]);

  // A 401 from any authenticated request means this token is no longer
  // valid; api()/apiForm()/apiGetBlob broadcast this instead of every page
  // having to notice and handle it individually.
  useEffect(() => {
    const onUnauthorized = () => signOut();
    window.addEventListener('edura:unauthorized', onUnauthorized);
    return () => window.removeEventListener('edura:unauthorized', onUnauthorized);
  }, [signOut]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    const stored = localStorage.getItem(USER_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        setUser(null);
      }
    }
    fetch(getApiUrl('/auth/me'), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setUser(data.user);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      })
      .catch(() => {
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [token, setToken]);

  const value = {
    user,
    token,
    setToken,
    signOut,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
