import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Client, Appointment, Installment, Payment, ToastMessage, AppSettings } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

export type ActivePage =
  | 'dashboard'
  | 'queue'
  | 'alerts'
  | 'clients'
  | 'payments'
  | 'installments'
  | 'notifications'
  | 'reports'
  | 'settings';

interface DeleteModalState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => Promise<void>;
  isProcessing: boolean;
}

interface AppContextType {
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
  currency: string;
  setCurrency: (c: string) => void;
  businessName: string;
  setBusinessName: (n: string) => void;
  unreadCount: number;
  setUnreadCount: (c: number) => void;
  dataRefreshKey: number;
  refreshData: () => void;

  // Toast
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info', title?: string) => void;
  removeToast: (id: string) => void;

  // Sound alert
  playNotificationSound: () => void;

  // Appointment Modal (طابور المواعيد)
  isAppointmentModalOpen: boolean;
  appointmentModalTarget: Appointment | null;
  appointmentModalPrefill?: Partial<Appointment>;
  openAddAppointmentModal: (prefill?: Partial<Appointment>) => void;
  openEditAppointmentModal: (appointment: Appointment) => void;
  closeAppointmentModal: () => void;

  // Schedule Alert Modal (جدولة التنبيه)
  isScheduleAlertModalOpen: boolean;
  scheduleAlertTarget: Appointment | null;
  openScheduleAlertModal: (appointment: Appointment) => void;
  closeScheduleAlertModal: () => void;

  // Modals state
  isClientModalOpen: boolean;
  clientModalTarget: Client | null;
  openAddClientModal: () => void;
  openEditClientModal: (client: Client) => void;
  closeClientModal: () => void;

  // Client Details Drawer
  selectedClientId: string | null;
  openClientDetail: (clientId: string) => void;
  closeClientDetail: () => void;

  // Legacy Installment Modal (backward compatibility)
  isInstallmentModalOpen: boolean;
  installmentModalTarget: Installment | null;
  installmentPreselectedClientId?: string;
  openAddInstallmentModal: (clientId?: string) => void;
  openEditInstallmentModal: (installment: Installment) => void;
  closeInstallmentModal: () => void;

  // Payment Modal
  isPaymentModalOpen: boolean;
  paymentTargetInstallment: Installment | null;
  paymentTargetAppointment: Appointment | null;
  openPaymentModal: (target: Installment | Appointment) => void;
  closePaymentModal: () => void;

  // Call Modal
  isCallModalOpen: boolean;
  callModalClient: Client | null;
  openCallModal: (client?: Client) => void;
  closeCallModal: () => void;

  // Permissions helper
  hasPermission: (permission: keyof import('../types').UserPermissions) => boolean;

  // Delete Modal
  deleteModal: DeleteModalState;
  openDeleteModal: (title: string, message: string, onConfirm: () => Promise<void>) => void;
  closeDeleteModal: () => void;
  confirmDelete: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [activePage, setActivePage] = useState<ActivePage>('queue');
  const [currency, setCurrency] = useState<string>('د.ع');
  const [businessName, setBusinessName] = useState<string>('نظام طابور المواعيد والتحصيل');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [dataRefreshKey, setDataRefreshKey] = useState<number>(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Sound chime helper using Web Audio API
  const playNotificationSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.42);
    } catch {
      // Audio autoplay may be restricted until user interaction
    }
  }, []);

  // Appointment Modal (طابور المواعيد)
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [appointmentModalTarget, setAppointmentModalTarget] = useState<Appointment | null>(null);
  const [appointmentModalPrefill, setAppointmentModalPrefill] = useState<Partial<Appointment> | undefined>(undefined);

  const openAddAppointmentModal = (prefill?: Partial<Appointment>) => {
    setAppointmentModalTarget(null);
    setAppointmentModalPrefill(prefill);
    setIsAppointmentModalOpen(true);
  };

  const openEditAppointmentModal = (appointment: Appointment) => {
    setAppointmentModalTarget(appointment);
    setAppointmentModalPrefill(undefined);
    setIsAppointmentModalOpen(true);
  };

  const closeAppointmentModal = () => {
    setIsAppointmentModalOpen(false);
    setAppointmentModalTarget(null);
    setAppointmentModalPrefill(undefined);
  };

  // Schedule Alert Modal (جدولة التنبيه)
  const [isScheduleAlertModalOpen, setIsScheduleAlertModalOpen] = useState(false);
  const [scheduleAlertTarget, setScheduleAlertTarget] = useState<Appointment | null>(null);

  const openScheduleAlertModal = (appointment: Appointment) => {
    setScheduleAlertTarget(appointment);
    setIsScheduleAlertModalOpen(true);
  };

  const closeScheduleAlertModal = () => {
    setIsScheduleAlertModalOpen(false);
    setScheduleAlertTarget(null);
  };

  // Modals
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientModalTarget, setClientModalTarget] = useState<Client | null>(null);

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [installmentModalTarget, setInstallmentModalTarget] = useState<Installment | null>(null);
  const [installmentPreselectedClientId, setInstallmentPreselectedClientId] = useState<string | undefined>(undefined);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTargetInstallment, setPaymentTargetInstallment] = useState<Installment | null>(null);
  const [paymentTargetAppointment, setPaymentTargetAppointment] = useState<Appointment | null>(null);

  // Call Modal
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callModalClient, setCallModalClient] = useState<Client | null>(null);

  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: async () => {},
    isProcessing: false,
  });

  const refreshData = useCallback(() => {
    setDataRefreshKey((prev) => prev + 1);
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success', title?: string) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type, title }]);
    if (type === 'success' || type === 'info') {
      playNotificationSound();
    }
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, [playNotificationSound]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch initial settings & unread count
  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true;
    async function loadInitial() {
      try {
        const [settingsRes, notifRes] = await Promise.all([
          api.getSettings(),
          api.getNotifications({ unreadOnly: true }),
        ]);

        if (isMounted) {
          if (settingsRes.settings.currency) setCurrency(settingsRes.settings.currency);
          if (settingsRes.settings.businessName) setBusinessName(settingsRes.settings.businessName);
          setUnreadCount(notifRes.unreadCount || 0);
        }
      } catch (err) {
        console.warn('Failed to load initial settings:', err);
      }
    }

    loadInitial();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, dataRefreshKey]);

  // Client modal handlers
  const openAddClientModal = () => {
    setClientModalTarget(null);
    setIsClientModalOpen(true);
  };

  const openEditClientModal = (client: Client) => {
    setClientModalTarget(client);
    setIsClientModalOpen(true);
  };

  const closeClientModal = () => {
    setIsClientModalOpen(false);
    setClientModalTarget(null);
  };

  // Client Details
  const openClientDetail = (clientId: string) => {
    setSelectedClientId(clientId);
  };

  const closeClientDetail = () => {
    setSelectedClientId(null);
  };

  // Installment modal handlers (legacy)
  const openAddInstallmentModal = (clientId?: string) => {
    setInstallmentModalTarget(null);
    setInstallmentPreselectedClientId(clientId);
    setIsInstallmentModalOpen(true);
  };

  const openEditInstallmentModal = (installment: Installment) => {
    setInstallmentModalTarget(installment);
    setInstallmentPreselectedClientId(installment.clientId);
    setIsInstallmentModalOpen(true);
  };

  const closeInstallmentModal = () => {
    setIsInstallmentModalOpen(false);
    setInstallmentModalTarget(null);
    setInstallmentPreselectedClientId(undefined);
  };

  // Payment modal handlers: accepts either Appointment or Installment
  const openPaymentModal = (target: Installment | Appointment) => {
    if ('requiredAmount' in target) {
      setPaymentTargetAppointment(target as Appointment);
      setPaymentTargetInstallment(null);
    } else {
      setPaymentTargetInstallment(target as Installment);
      setPaymentTargetAppointment(null);
    }
    setIsPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setPaymentTargetInstallment(null);
    setPaymentTargetAppointment(null);
  };

  // Call modal handlers
  const openCallModal = (client?: Client) => {
    setCallModalClient(client || null);
    setIsCallModalOpen(true);
  };

  const closeCallModal = () => {
    setIsCallModalOpen(false);
    setCallModalClient(null);
  };

  const { user } = useAuth();
  const hasPermission = useCallback(
    (perm: keyof import('../types').UserPermissions) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      return !!user.permissions?.[perm];
    },
    [user]
  );

  // Delete modal handlers
  const openDeleteModal = (title: string, message: string, onConfirm: () => Promise<void>) => {
    setDeleteModal({
      isOpen: true,
      title,
      message,
      onConfirm,
      isProcessing: false,
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal((prev) => ({ ...prev, isOpen: false, isProcessing: false }));
  };

  const confirmDelete = async () => {
    setDeleteModal((prev) => ({ ...prev, isProcessing: true }));
    try {
      await deleteModal.onConfirm();
      closeDeleteModal();
      refreshData();
    } catch (err: any) {
      setDeleteModal((prev) => ({ ...prev, isProcessing: false }));
      showToast(err.message || 'حدث خطأ أثناء الحذف', 'error');
    }
  };

  return (
    <AppContext.Provider
      value={{
        activePage,
        setActivePage,
        currency,
        setCurrency,
        businessName,
        setBusinessName,
        unreadCount,
        setUnreadCount,
        dataRefreshKey,
        refreshData,
        toasts,
        showToast,
        removeToast,
        playNotificationSound,
        isAppointmentModalOpen,
        appointmentModalTarget,
        appointmentModalPrefill,
        openAddAppointmentModal,
        openEditAppointmentModal,
        closeAppointmentModal,
        isScheduleAlertModalOpen,
        scheduleAlertTarget,
        openScheduleAlertModal,
        closeScheduleAlertModal,
        isClientModalOpen,
        clientModalTarget,
        openAddClientModal,
        openEditClientModal,
        closeClientModal,
        selectedClientId,
        openClientDetail,
        closeClientDetail,
        isInstallmentModalOpen,
        installmentModalTarget,
        installmentPreselectedClientId,
        openAddInstallmentModal,
        openEditInstallmentModal,
        closeInstallmentModal,
        isPaymentModalOpen,
        paymentTargetInstallment,
        paymentTargetAppointment,
        openPaymentModal,
        closePaymentModal,
        isCallModalOpen,
        callModalClient,
        openCallModal,
        closeCallModal,
        hasPermission,
        deleteModal,
        openDeleteModal,
        closeDeleteModal,
        confirmDelete,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
