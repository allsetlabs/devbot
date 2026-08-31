/**
 * Authentication context — checks session status on mount and provides
 * login/logout helpers. Renders children only when authenticated; shows
 * the login page otherwise.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import type { ReactNode } from 'react';
import { BACKEND_URL } from '../lib/api';

export interface AuthUser {
  email: string;
  name: string;
  picture: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  oauthConfigured: boolean;
  login: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [oauthConfigured, setOauthConfigured] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND_URL}/auth/status`, { credentials: 'include' })
      .then((r) => r.json())
      .then(
        (data: {
          authenticated: boolean;
          user?: AuthUser;
          oauthConfigured?: boolean;
        }) => {
          if (data.authenticated && data.user) {
            setUser(data.user);
          }
          setOauthConfigured(data.oauthConfigured ?? false);
        }
      )
      .catch(() => {
        // Backend unreachable — stay unauthenticated
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(() => {
    const redirect = encodeURIComponent(window.location.origin);
    window.location.href = `${BACKEND_URL}/auth/google?redirect=${redirect}`;
  }, []);

  const logout = useCallback(async () => {
    await fetch(`${BACKEND_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, oauthConfigured, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
