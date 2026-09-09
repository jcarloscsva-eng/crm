import { useState } from 'react';
import { useAuth } from './AuthContext';
import { View } from './components/AppLayout';
import { ContactsPage } from './pages/ContactsPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { DashboardPage } from './pages/DashboardPage';
import { LeadsPage } from './pages/LeadsPage';
import { LoginPage } from './pages/LoginPage';
import { ProductsPage } from './pages/ProductsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SegmentsPage } from './pages/SegmentsPage';

export function App({ onSwitchToPlatformAdmin }: { onSwitchToPlatformAdmin: () => void }) {
  const { session } = useAuth();
  const [view, setView] = useState<View>({ name: 'dashboard' });

  if (!session) {
    return <LoginPage onSwitchToPlatformAdmin={onSwitchToPlatformAdmin} />;
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
    case 'leads':
      return <LeadsPage onNavigate={setView} />;
    case 'contacts':
      return <ContactsPage onNavigate={setView} />;
    default:
      return <DashboardPage onNavigate={setView} />;
  }
}
