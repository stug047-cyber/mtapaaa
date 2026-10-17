import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AppointmentQueuePage } from './pages/AppointmentQueuePage';
import { ScheduledAlertsPage } from './pages/ScheduledAlertsPage';
import { ClientsPage } from './pages/ClientsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ClientModal } from './components/ClientModal';
import { ClientDetailDrawer } from './components/ClientDetailDrawer';
import { AppointmentModal } from './components/AppointmentModal';
import { ScheduleAlertModal } from './components/ScheduleAlertModal';
import { PaymentModal } from './components/PaymentModal';
import { CallModal } from './components/CallModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { ToastContainer } from './components/Toast';
import { Loader2 } from 'lucide-react';

const MainAppLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { activePage, isCallModalOpen, closeCallModal, callModalClient } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center animate-pulse">
          <Loader2 className="w-6 h-6 animate-spin text-white" />
        </div>
        <p className="text-sm font-semibold text-slate-300">جاري تشغيل نظام طابور المواعيد والتحصيل...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex text-slate-800 font-['Cairo',sans-serif]">
      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:mr-72 flex flex-col min-h-screen transition-all">
        <Header onOpenMobile={() => setMobileMenuOpen(true)} />

        <main className="flex-1 pb-16">
          {activePage === 'dashboard' && <DashboardPage />}
          {(activePage === 'queue' || activePage === 'installments') && <AppointmentQueuePage />}
          {(activePage === 'alerts' || activePage === 'notifications') && <ScheduledAlertsPage />}
          {activePage === 'clients' && <ClientsPage />}
          {activePage === 'reports' && <ReportsPage />}
          {activePage === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Modals & Toasts */}
      <AppointmentModal />
      <ScheduleAlertModal />
      <PaymentModal />
      <ClientModal />
      <ClientDetailDrawer />
      <CallModal
        isOpen={isCallModalOpen}
        onClose={closeCallModal}
        targetClient={callModalClient}
      />
      <DeleteConfirmModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <MainAppLayout />
      </AppProvider>
    </AuthProvider>
  );
}
