import { Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Layout } from './components/Layout';
import { LoginScreen } from './auth/LoginScreen';
import { useAuth } from './auth/AuthContext';
import { Dashboard } from './pages/Dashboard';
import { EquipmentListPage } from './pages/EquipmentListPage';
import { EquipmentPage } from './pages/EquipmentPage';
import { TrapsPage } from './pages/TrapsPage';
import { TrapDetailPage } from './pages/TrapDetailPage';
import { SettingsPage } from './pages/SettingsPage';
import { ReportingPage } from './pages/ReportingPage';

export default function App() {
  const { authed, ready } = useAuth();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!authed) return <LoginScreen />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/equipment" element={<EquipmentListPage />} />
        <Route path="/equipment/:equipmentId" element={<EquipmentPage />} />
        <Route path="/traps" element={<TrapsPage />} />
        <Route path="/traps/:trapId" element={<TrapDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/reporting" element={<ReportingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
