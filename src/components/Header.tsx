import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Menu,
  PlusCircle,
  UserPlus,
  Bell,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { api } from '../services/api';

interface HeaderProps {
  onOpenMobile: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobile }) => {
  const {
    activePage,
    unreadCount,
    setActivePage,
    openAddAppointmentModal,
    openAddClientModal,
    refreshData,
    showToast,
    hasPermission,
  } = useApp();

  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const getPageTitle = () => {
    switch (activePage) {
      case 'dashboard':
        return 'لوحة التحكم والمتابعة';
      case 'queue':
        return 'طابور المواعيد والتحصيل';
      case 'alerts':
        return 'جدولة الإشعارات والتنبيهات';
      case 'clients':
        return 'سجل الزبائن والكفلاء';
      case 'installments':
        return 'طابور المواعيد';
      case 'notifications':
        return 'مركز الإشعارات والتنبيهات';
      case 'reports':
        return 'التقارير المالية';
      case 'settings':
        return 'إعدادات النظام وإدارة الموظفين';
      default:
        return 'نظام طابور المواعيد والتحصيل';
    }
  };

  const todayFormatted = new Intl.DateTimeFormat('ar-IQ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const handleManualSync = async () => {
    setIsRefreshing(true);
    try {
      const res = await api.runCronCheck();
      refreshData();
      showToast(res.message, 'success', 'مزامنة الخادم');
    } catch (err: any) {
      showToast(err.message || 'فشلت المزامنة', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3.5 transition-all">
      <div className="flex items-center justify-between gap-4">
        {/* Left / Start: Title & Mobile toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobile}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="القائمة الجانبية"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {getPageTitle()}
            </h2>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>{todayFormatted}</span>
            </div>
          </div>
        </div>

        {/* Right / End: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Add Appointment Button */}
          <button
            onClick={() => openAddAppointmentModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ موعد جديد</span>
          </button>

          {/* Quick Add Client */}
          {hasPermission('canEditClients') && (
            <button
              onClick={openAddClientModal}
              className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/90 active:scale-95 transition-all"
            >
              <UserPlus className="w-4 h-4 text-slate-600" />
              <span>+ زبون / كفيل</span>
            </button>
          )}

          {/* Server Sync / Cron button */}
          <button
            onClick={handleManualSync}
            disabled={isRefreshing}
            title="مزامنة وفحص المواعيد عبر الخادم"
            className="p-2 rounded-xl text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 active:scale-95 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          {/* Scheduled Alerts bell */}
          <button
            onClick={() => setActivePage('alerts')}
            className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition-all"
            title="التنبيهات المجدولة"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
