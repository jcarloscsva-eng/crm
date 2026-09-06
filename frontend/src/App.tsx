import { useState } from 'react';
import { useAuth } from './AuthContext';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

export function App() {
  const { session } = useAuth();
  const [view, setView] = useState<'login' | 'register'>('login');

  if (session) {
    return <DashboardPage />;
  }

  return view === 'login' ? (
    <LoginPage onSwitchToRegister={() => setView('register')} />
  ) : (
    <RegisterPage onSwitchToLogin={() => setView('login')} />
  );
}
