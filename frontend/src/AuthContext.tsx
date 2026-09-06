import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthResponse } from './api';

interface Session {
  token: string;
  tenant: AuthResponse['tenant'];
  user: AuthResponse['user'];
}

interface AuthContextValue {
  session: Session | null;
  login: (auth: AuthResponse) => void;
  logout: () => void;
}

const STORAGE_KEY = 'crm_session';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setSession(JSON.parse(raw));
      }
    } catch {
      // localStorage no disponible o dato corrupto: se ignora, queda sin sesión
    }
  }, []);

  const login = (auth: AuthResponse) => {
    const next: Session = { token: auth.accessToken, tenant: auth.tenant, user: auth.user };
    setSession(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // si falla el guardado, la sesión sigue funcionando solo en memoria para esta pestaña
    }
  };

  const logout = () => {
    setSession(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // nada que limpiar si no había storage disponible
    }
  };

  return <AuthContext.Provider value={{ session, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return ctx;
}
