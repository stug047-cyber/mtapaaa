import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api, formatCurrency, formatDateArabic } from '../services/api';
import { DashboardStats, Appointment } from '../types';
import { StatsCard } from '../components/StatsCard';
import {
  Calendar,
  Clock,
  Plus,
  Coins,
  CheckCircle2,
  AlertTriangle,
  Bell,
  Phone,
  MessageCircle,
  ShieldAlert,
  Search,
  ArrowRight,
  TrendingUp,
  User,
  CreditCard,
  ChevronLeft,
  Flame,
  Star,
  RefreshCw,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const {
    openAddAppointmentModal,
    openEditAppointmentModal,
    openScheduleAlertModal,
    openPaymentModal,
    setActivePage,
    dataRefreshKey,
    currency,
  } = useApp();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Appointment[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api
      .getDashboardStats()
      .then((data) => {
        if (isMounted) {
          setStats(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load dashboard stats:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [dataRefreshKey]);

  // Quick search handler
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.getAppointments({ search: searchTerm.trim() });
        setSearchResults(res.appointments);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const openWhatsApp = (phone: string, text: string) => {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('07')) clean = '964' + clean.slice(1);
    else if (!clean.startsWith('964')) clean = '964' + clean;
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1/3 bg-radial from-emerald-500/10 to-transparent pointer-events-none" />

        <div className="relative z-10 space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            نظام طابور المواعيد وجدولة التنبيهات
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            مرحباً بك في لوحة طابور المواعيد والتحصيل
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl leading-relaxed">
            متابعة دقيقة لمواعيد السداد، أصحاب المواعيد والكفلاء، المبالغ بالدينار العراقي والتنبيهات المجدولة.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5 sm:gap-3">
          <button
            onClick={() => setActivePage('alerts')}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md transition-all active:scale-95"
          >
            <Bell className="w-4 h-4 text-indigo-400" />
            <span>التنبيهات المجدولة</span>
          </button>

          <button
            onClick={() => openAddAppointmentModal()}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة موعد جديد للطابور</span>
          </button>
        </div>
      </div>

      {/* Quick Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث سريع في الطابور بالاسم، رقم الهاتف، اسم الكفيل أو رقم هاتف الكفيل..."
            className="w-full pr-11 pl-10 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute left-3.5 top-3 text-xs text-slate-400 hover:text-slate-600 font-semibold"
            >
              مسح
            </button>
          )}
        </div>

        {/* Live Search Results Dropdown */}
        {searchTerm.trim() && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            {isSearching ? (
              <p className="text-xs text-slate-400 py-2 text-center">جاري البحث...</p>
            ) : searchResults && searchResults.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-xs"
                  >
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <span className="font-bold text-slate-900">#{item.queueNumber} {item.clientName}</span>
                      <span className="text-slate-500 font-mono" dir="ltr">{item.clientPhone}</span>
                      <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                        كفيل: {item.guarantorName}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <span className="font-black text-emerald-700">
                        {item.remainingAmount.toLocaleString()} {currency}
                      </span>
                      <button
                        onClick={() => openPaymentModal(item)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700"
                      >
                        سداد
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-2 text-center">لا توجد نتائج مطابقة</p>
            )}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatsCard
          title="مواعيد اليوم في الطابور"
          value={stats ? `${stats.dueTodayCount} موعد` : '...'}
          subtext="مواعيد مستحقة للمتابعة والتحصيل اليوم"
          icon={Clock}
          variant="emerald"
          badge={stats && stats.dueTodayCount > 0 ? 'مستحق اليوم' : undefined}
          badgeType={stats && stats.dueTodayCount > 0 ? 'warning' : 'info'}
        />

        <StatsCard
          title="المواعيد المتأخرة"
          value={stats ? `${stats.overdueCount} موعد` : '...'}
          subtext="تجاوزت تاريخ الموعد المحدد"
          icon={AlertTriangle}
          variant="rose"
          badge={stats && stats.overdueCount > 0 ? 'بحاجة اتصال بالكفيل' : undefined}
          badgeType="danger"
        />

        <StatsCard
          title="المبالغ المطلوبة للتحصيل"
          value={stats ? `${stats.totalRemaining.toLocaleString()} ${currency}` : '...'}
          subtext={`إجمالي المطلوب: ${stats ? stats.totalDue.toLocaleString() : 0} ${currency}`}
          icon={Coins}
          variant="amber"
          badge={stats ? `نسبة السداد: ${stats.collectionRate}%` : undefined}
          badgeType="info"
        />

        <StatsCard
          title="المبالغ المسددة والمحصلة"
          value={stats ? `${stats.totalPaid.toLocaleString()} ${currency}` : '...'}
          subtext={`من إجمالي ${stats ? stats.totalAppointmentsCount || stats.totalClientsCount : 0} موعد`}
          icon={CheckCircle2}
          variant="slate"
          badge={stats && stats.totalPaid > 0 ? 'تحصيل ناجح' : undefined}
          badgeType="success"
        />
      </div>

      {/* Main Content: Today's Queue & Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Collection Queue (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 space-x-reverse">
              <h2 className="text-lg font-bold text-slate-900">مواعيد اليوم في الطابور</h2>
              {stats && stats.dueTodayCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                  {stats.dueTodayCount} اليوم
                </span>
              )}
            </div>
            <button
              onClick={() => setActivePage('queue')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1 space-x-reverse"
            >
              <span>فتح كامل الطابور</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-slate-400">جاري التحميل...</div>
            ) : !stats?.todayAppointments || stats.todayAppointments.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">لا توجد مواعيد مستحقة متبقية لليوم</p>
                <p className="text-xs text-slate-400">جميع مواعيد اليوم مسددة أو لا توجد مواعيد مضافة لليوم</p>
              </div>
            ) : (
              stats.todayAppointments.map((apt) => {
                const clientMsg = `السلام عليكم ورحمة الله، الأخ ${apt.clientName} المحترم. نود تذكيركم بموعدكم اليوم لدفع مبلغ (${apt.remainingAmount.toLocaleString()} ${currency}). شاكرين تعاونكم.`;
                const guarantorMsg = `السلام عليكم ورحمة الله، الأخ الكفيل ${apt.guarantorName} المحترم. نود إشعاركم بأن مكفولكم السيد (${apt.clientName}) لديه موعد تسديد اليوم بمبلغ (${apt.remainingAmount.toLocaleString()} ${currency}).`;

                return (
                  <div key={apt.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start space-x-3 space-x-reverse">
                        <span className="w-9 h-9 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                          #{apt.queueNumber}
                        </span>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{apt.clientName}</h4>
                          <div className="flex items-center space-x-3 space-x-reverse text-xs text-slate-500 mt-0.5">
                            <span dir="ltr" className="font-mono">{apt.clientPhone}</span>
                            <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                              الكفيل: {apt.guarantorName} ({apt.guarantorPhone})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 space-x-reverse mr-auto sm:mr-0">
                        <div className="text-left ml-3">
                          <span className="text-xs text-slate-400 block">المطلوب</span>
                          <span className="font-black text-emerald-700 text-sm">
                            {apt.remainingAmount.toLocaleString()} {currency}
                          </span>
                        </div>

                        {/* Quick WhatsApp client */}
                        <button
                          type="button"
                          onClick={() => openWhatsApp(apt.clientPhone, clientMsg)}
                          className="p-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition-colors"
                          title="واتساب للزبون"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>

                        {/* Quick WhatsApp guarantor */}
                        <button
                          type="button"
                          onClick={() => openWhatsApp(apt.guarantorPhone, guarantorMsg)}
                          className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-colors"
                          title="واتساب للكفيل"
                        >
                          <ShieldAlert className="w-4 h-4" />
                        </button>

                        {/* Pay button */}
                        <button
                          type="button"
                          onClick={() => openPaymentModal(apt)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                        >
                          سداد
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Upcoming Appointments in Queue */}
          <div className="space-y-4 pt-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">المواعيد القادمة في الطابور</h2>
              <button
                onClick={() => setActivePage('queue')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1 space-x-reverse"
              >
                <span>عرض الكل</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
              {!stats?.upcomingAppointments || stats.upcomingAppointments.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">لا توجد مواعيد قادمة مسجلة</div>
              ) : (
                stats.upcomingAppointments.slice(0, 5).map((apt) => (
                  <div key={apt.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50">
                    <div className="flex items-center space-x-2.5 space-x-reverse">
                      <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center">
                        #{apt.queueNumber}
                      </span>
                      <div>
                        <span className="font-bold text-slate-900 block">{apt.clientName}</span>
                        <span className="text-slate-400">
                          الكفيل: {apt.guarantorName} | الموعد: {apt.appointmentDate}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 space-x-reverse">
                      <span className="font-black text-slate-800">
                        {apt.remainingAmount.toLocaleString()} {currency}
                      </span>
                      <button
                        onClick={() => openScheduleAlertModal(apt)}
                        className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50"
                        title="جدولة تنبيه"
                      >
                        <Bell className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Recent Payments & Alerts Summary */}
        <div className="space-y-6">
          {/* Scheduled Alerts Summary */}
          <div className="bg-indigo-50/70 rounded-2xl border border-indigo-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 space-x-reverse text-indigo-950 font-bold text-sm">
                <Bell className="w-4 h-4 text-indigo-600" />
                <span>التنبيهات المجدولة</span>
              </div>
              <button
                onClick={() => setActivePage('alerts')}
                className="text-xs font-bold text-indigo-700 hover:text-indigo-900"
              >
                إدارة
              </button>
            </div>
            <p className="text-xs text-indigo-800 leading-relaxed">
              يوجد <span className="font-black">{stats?.scheduledAlertsCount || 0}</span> تنبيه مجدول قادم لمتابعة مواعيد السداد وإشعار العملاء والكفلاء.
            </p>
            <button
              onClick={() => setActivePage('alerts')}
              className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-xs"
            >
              عرض جدول التنبيهات المجدولة
            </button>
          </div>

          {/* Recent Payments */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 space-x-reverse font-bold text-slate-900 text-sm">
                <CreditCard className="w-4 h-4 text-teal-600" />
                <span>آخر عمليات التحصيل والسداد</span>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {!stats?.recentPayments || stats.recentPayments.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">لا توجد عمليات سداد مسجلة حديثاً</p>
              ) : (
                stats.recentPayments.map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800 block">{p.clientName}</span>
                      <span className="text-[11px] text-slate-400">{p.paymentDate}</span>
                    </div>
                    <span className="font-black text-teal-700">
                      +{p.amount.toLocaleString()} {currency}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
