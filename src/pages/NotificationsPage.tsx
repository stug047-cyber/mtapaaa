import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api, formatCurrency, formatDateArabic } from '../services/api';
import { AppNotification, AppSettings } from '../types';
import {
  Bell,
  CheckCheck,
  Check,
  Clock,
  AlertTriangle,
  CalendarCheck,
  Calendar,
  Phone,
  MessageCircle,
  RefreshCw,
  Sliders,
  Wallet,
  Loader2,
} from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const {
    openPaymentModal,
    openClientDetail,
    refreshData,
    showToast,
    dataRefreshKey,
    currency,
  } = useApp();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [counts, setCounts] = useState<{ dueToday: number; overdue: number; upcoming: number }>({
    dueToday: 0,
    overdue: 0,
    upcoming: 0,
  });
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api
      .getNotifications({
        category: activeCategory,
        unreadOnly,
      })
      .then((res) => {
        if (isMounted) {
          setNotifications(res.notifications);
          setCounts(res.counts);
          setSettings(res.settings);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching notifications:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeCategory, unreadOnly, dataRefreshKey]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      refreshData();
      showToast('تم تحديد الإشعار كمقروء', 'info');
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      refreshData();
      showToast('تم تحديد كافة الإشعارات كمقروءة', 'success');
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ', 'error');
    }
  };

  const handleRunServerCron = async () => {
    setIsSyncing(true);
    try {
      const res = await api.runCronCheck();
      refreshData();
      showToast(res.message, 'success', 'فحص الخادم المجدول');
    } catch (err: any) {
      showToast(err.message || 'فشل الفحص', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleNotifyDay = async (day: number) => {
    if (!settings) return;
    const currentDays = settings.notifyDaysBefore || [1, 3, 7];
    let newDays: number[];
    if (currentDays.includes(day)) {
      if (currentDays.length === 1) {
        showToast('يجب اختيار خيار تنبيه واحد على الأقل', 'error');
        return;
      }
      newDays = currentDays.filter((d) => d !== day);
    } else {
      newDays = [...currentDays, day].sort((a, b) => a - b);
    }

    setSavingSettings(true);
    try {
      const res = await api.updateSettings({ notifyDaysBefore: newDays });
      setSettings(res.settings);
      showToast('تم حفظ إعدادات مواعيد التنبيهات التلقائية', 'success');
      refreshData();
    } catch (err: any) {
      showToast(err.message || 'فشل حفظ الإعدادات', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            مركز الإشعارات والتنبيهات التلقائية
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            إشعارات الأقساط المستحقة، المتأخرة، وتنبيهات الاستحقاق التلقائية التي ينشئها الخادم
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunServerCron}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-xs active:scale-95 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>فحص وتحديث الخادم الآن</span>
          </button>

          <button
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 active:scale-95 transition-all"
          >
            <CheckCheck className="w-4 h-4" />
            <span>تحديد الكل كمقروء</span>
          </button>
        </div>
      </div>

      {/* Automated Server Notification Settings Box (Prompt Requirement) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="font-bold text-sm text-white">
                خدمة الجدولة التلقائية بالخادم (Server Scheduled Service)
              </h3>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              تعمل الخدمة على مدار الساعة في الخادم لفحص مواعيد الأقساط وإنشاء الإشعارات وتحديث حالات التأخير حتى في حال إغلاق المتصفح. يمكنك اختيار مواعيد التنبيه الاستباقي قبل تاريخ الاستحقاق:
            </p>
          </div>

          {/* Toggle buttons for 1 day, 3 days, 7 days (Prompt Requirement) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 ml-1 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>التنبيه قبل الموعد بـ:</span>
            </span>

            {[
              { days: 1, label: 'يوم' },
              { days: 3, label: '3 أيام' },
              { days: 7, label: 'أسبوع' },
            ].map((opt) => {
              const isChecked = settings?.notifyDaysBefore?.includes(opt.days);
              return (
                <button
                  key={opt.days}
                  onClick={() => toggleNotifyDay(opt.days)}
                  disabled={savingSettings}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    isChecked
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {isChecked && '✓ '}
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeCategory === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            الكل
          </button>

          {/* Due today */}
          <button
            onClick={() => setActiveCategory('due_today')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeCategory === 'due_today'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>مستحقة اليوم ({counts.dueToday})</span>
          </button>

          {/* Upcoming */}
          <button
            onClick={() => setActiveCategory('upcoming')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeCategory === 'upcoming'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>اقترب موعدها ({counts.upcoming})</span>
          </button>

          {/* Overdue */}
          <button
            onClick={() => setActiveCategory('overdue')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeCategory === 'overdue'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>متأخرة ({counts.overdue})</span>
          </button>
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
          />
          <span>عرض غير المقروءة فقط</span>
        </label>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2 bg-white rounded-2xl border border-slate-200">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            <span>جاري تحميل الإشعارات...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-2 opacity-60" />
            <h3 className="font-bold text-slate-700 text-base">لا توجد إشعارات حالياً</h3>
            <p className="text-xs text-slate-500 mt-1">
              جميع الأقساط والمواعيد في وضع سليم ولا توجد تنبيهات مطابقة لهذا التصنيف
            </p>
          </div>
        ) : (
          notifications.map((notif) => {
            const isDueToday = notif.type === 'due_today';
            const isOverdue = notif.type === 'overdue';
            const isUpcoming = notif.type === 'upcoming';
            const isPayment = notif.type === 'payment_received';

            const cleanPhone = notif.clientPhone.replace(/\D/g, '');
            const waPhone = cleanPhone.startsWith('0') ? '966' + cleanPhone.substring(1) : cleanPhone;
            const reminderText = encodeURIComponent(
              `السلام عليكم ورحمة الله، تذكير بموعد استحقاق قسطكم بمبلغ ${notif.amount.toLocaleString()} ${currency} بتاريخ ${notif.dueDate}.`
            );

            return (
              <div
                key={notif.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  !notif.isRead
                    ? isOverdue
                      ? 'bg-rose-50/50 border-rose-200/90 shadow-xs'
                      : isDueToday
                      ? 'bg-amber-50/50 border-amber-200/90 shadow-xs'
                      : isUpcoming
                      ? 'bg-blue-50/50 border-blue-200/90 shadow-xs'
                      : 'bg-emerald-50/50 border-emerald-200/90 shadow-xs'
                    : 'bg-white border-slate-200/80 opacity-80 hover:opacity-100'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {/* Icon */}
                  <div
                    className={`p-3 rounded-xl shrink-0 mt-0.5 ${
                      isOverdue
                        ? 'bg-rose-100 text-rose-700'
                        : isDueToday
                        ? 'bg-amber-100 text-amber-700'
                        : isUpcoming
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {isOverdue && <AlertTriangle className="w-5 h-5" />}
                    {isDueToday && <CalendarCheck className="w-5 h-5" />}
                    {isUpcoming && <Clock className="w-5 h-5" />}
                    {isPayment && <Wallet className="w-5 h-5" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm">{notif.title}</h4>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
                      {notif.message}
                    </p>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500 font-medium">
                      {notif.clientId && (
                        <button
                          onClick={() => openClientDetail(notif.clientId!)}
                          className="font-bold text-slate-800 hover:text-emerald-700 underline"
                        >
                          صاحب الموعد: {notif.clientName}
                        </button>
                      )}

                      <span className="flex items-center gap-1" dir="ltr">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{notif.clientPhone}</span>
                      </span>

                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>تاريخ الاستحقاق: {formatDateArabic(notif.dueDate)}</span>
                      </span>

                      <span className="font-bold text-slate-900">
                        المبلغ: {formatCurrency(notif.amount, currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/60">
                  {/* WhatsApp Reminder */}
                  <a
                    href={`https://wa.me/${waPhone}?text=${reminderText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all active:scale-95"
                    title="إرسال تذكير مباشر بالواتساب"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>تذكير واتساب</span>
                  </a>

                  {/* Mark as read */}
                  {!notif.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(notif.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
                      title="تحديد كمقروء"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>كمقروء</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
