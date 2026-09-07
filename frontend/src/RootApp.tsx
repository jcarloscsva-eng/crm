import { useState } from 'react';
import { App } from './App';
import { AuthProvider } from './AuthContext';
import { PlatformAdminDashboardPage } from './pages/PlatformAdminDashboardPage';
import { PlatformAdminLoginPage } from './pages/PlatformAdminLoginPage';

const STORAGE_KEY = 'crm_platform_admin_session';

interface PlatformAdminSession {
  token: string;
  email: string;
}

function loadStoredSession(): PlatformAdminSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function RootApp() {
  const [mode, setMode] = useState<'tenant' | 'platform-admin'>('tenant');
  const [paSession, setPaSession] = useState<PlatformAdminSession | null>(loadStoredSession);

  function handlePlatformAdminLogin(token: string, email: string) {
    const session = { token, email };
    setPaSession(session);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // sigue funcionando en memoria aunque falle el guardado
    }
  }

  function handlePlatformAdminLogout() {
    setPaSession(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // nada que limpiar si no había storage disponible
    }
  }

  if (mode === 'platform-admin') {
    if (!paSession) {
      return (
        <PlatformAdminLoginPage
          onLogin={handlePlatformAdminLogin}
          onSwitchToTenant={() => setMode('tenant')}
        />
      );
    }
    return (
      <PlatformAdminDashboardPage
        token={paSession.token}
        adminEmail={paSession.email}
        onLogout={handlePlatformAdminLogout}
      />
    );
  }

  return (
    <AuthProvider>
      <App onSwitchToPlatformAdmin={() => setMode('platform-admin')} />
    </AuthProvider>
  );
}
