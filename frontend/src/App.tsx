import { useState } from 'react';
import { useAuth } from './AuthContext';
import { View } from './components/AppLayout';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { ProductsPage } from './pages/ProductsPage';
import { RegisterPage } from './pages/RegisterPage';
import { ReportsPage } from './pages/ReportsPage';
import { SegmentsPage } from './pages/SegmentsPage';

export function App() {
  const { session } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [view, setView] = useState<View>({ name: 'dashboard' });

  if (!session) {
    return authView === 'login' ? (
      <LoginPage onSwitchToRegister={() => setAuthView('register')} />
    ) : (
      <RegisterPage onSwitchToLogin={() => setAuthView('login')} />
    );
  }

  switch (view.name) {
    case 'customer':
      return <CustomerDetailPage customerId={view.customerId} onNavigate={setView} />;
    case 'segments':
      return <SegmentsPage onNavigate={setView} />;
    case 'products':
      return <ProductsPage onNavigate={setView} />;
    case 'reports':
      return <ReportsPage onNavigate={setView} />;
    default:
      return <DashboardPage onNavigate={setView} />;
  }
}
