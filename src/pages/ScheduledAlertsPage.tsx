import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { Appointment } from '../types';
import {
  Bell,
  Clock,
  Calendar,
  MessageCircle,
  Phone,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Play,
  RefreshCw,
  Plus,
} from 'lucide-react';

export const ScheduledAlertsPage: React.FC = () => {
  const {
    openScheduleAlertModal,
    openAddAppointmentModal,
    showToast,
    dataRefreshKey,
    refreshData,
    currency,
  } = useApp();

  const [alerts, setAlerts] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'triggered'>('pending');

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const res = await api.getScheduledAlerts();
      setAlerts(res.alerts || []);
    } catch (err: any) {
      showToast(err.message || 'فشل تحميل التنبيهات المجدولة', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [dataRefreshKey]);

  const filteredAlerts = alerts.filter((apt) => {
    if (!apt.scheduledAlert) return false;
    if (filter === 'pending') return !apt.scheduledAlert.isTriggered;
    if (filter === 'triggered') return apt.scheduledAlert.isTriggered;
    return true;
  });

  const handleTriggerNow = async (aptId: string) => {
    try {
      await api.triggerAppointmentAlert(aptId);
      showToast('تم إطلاق التنبيه الفوري بنجاح', 'success');
      refreshData();
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء إطلاق التنبيه', 'error');
    }
  };

  const openWhatsApp = (phone: string, text: string) => {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('07')) clean = '964' + clean.slice(1);
    else if (!clean.startsWith('964')) clean = '964' + clean;
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Format relative countdown
  const getCountdownText = (scheduledAtStr: string) => {
    const diff = new Date(scheduledAtStr).getTime() - Date.now();
    if (diff <= 0) return 'حان موعد التنبيه الآن!';

    const mins = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `متبقي ${days} يوم و ${hours % 24} ساعة`;
    if (hours > 0) return `متبقي ${hours} ساعة و ${mins % 60} دقيقة`;
    return `متبقي ${mins} دقيقة`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-md">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">جدولة الإشعارات والتنبيهات</h1>
            <p className="text-xs sm:text-sm text-slate-500">
              إدارة مواعيد التنبيهات المؤتمتة ورسائل التذكير للعملاء والكفلاء
            </p>
          </div>
        </div>

        <button
          onClick={() => openAddAppointmentModal()}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md transition-colors flex items-center space-x-2 space-x-reverse self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة موعد وتنبيه جديد</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 space-x-reverse bg-white p-1 rounded-xl border border-slate-200 w-fit text-xs font-bold">
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'pending'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          التنبيهات القادمة ({alerts.filter((a) => a.scheduledAlert && !a.scheduledAlert.isTriggered).length})
        </button>
        <button
          onClick={() => setFilter('triggered')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'triggered'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          تم إطلاقها ({alerts.filter((a) => a.scheduledAlert && a.scheduledAlert.isTriggered).length})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          الكل ({alerts.length})
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3 border border-slate-200">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm font-semibold">جاري تحميل التنبيهات المجدولة...</p>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-500 space-y-3 border border-slate-200 shadow-xs">
            <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mx-auto text-indigo-500">
              <Bell className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">لا توجد تنبيهات مجدولة حالياً</h3>
            <p className="text-xs text-slate-400">
              يمكنك جدولة إشعار تنبيه لأي موعد في الطابور عند إضافته أو تعديله
            </p>
          </div>
        ) : (
          filteredAlerts.map((apt) => {
            const alert = apt.scheduledAlert!;
            const isDueNow = new Date(alert.scheduledAt).getTime() <= Date.now();
            const clientMsg = `السلام عليكم ورحمة الله، الأخ ${apt.clientName} المحترم. نود تذكيركم بموعدكم القادم بتاريخ ${apt.appointmentDate} لدفع مبلغ (${apt.remainingAmount.toLocaleString()} ${currency}). شاكرين تعاونكم.`;
            const guarantorMsg = `السلام عليكم ورحمة الله، الأخ الكفيل ${apt.guarantorName} المحترم. نود إشعاركم بأن مكفولكم السيد (${apt.clientName}) لديه موعد تسديد بتاريخ ${apt.appointmentDate} بمبلغ (${apt.remainingAmount.toLocaleString()} ${currency}). شاكرين تعاونكم.`;

            return (
              <div
                key={apt.id}
                className={`bg-white rounded-2xl border p-4 sm:p-5 transition-all shadow-xs ${
                  isDueNow && !alert.isTriggered
                    ? 'border-indigo-400 ring-2 ring-indigo-200'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Client & Guarantor */}
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2.5 space-x-reverse">
                      <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center">
                        #{apt.queueNumber}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">{apt.clientName}</h3>
                      <span className="text-xs text-slate-500 font-mono" dir="ltr">
                        {apt.clientPhone}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md font-semibold flex items-center space-x-1 space-x-reverse">
                        <ShieldAlert className="w-3 h-3 text-amber-600" />
                        <span>الكفيل: {apt.guarantorName}</span>
                      </span>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        المطلوب: {apt.remainingAmount.toLocaleString()} {currency}
                      </span>
                      <span className="text-slate-400">
                        موعد الحضور: {apt.appointmentDate}
                      </span>
                    </div>

                    {alert.note && (
                      <p className="text-xs text-slate-500 italic">
                        ملاحظة: {alert.note}
                      </p>
                    )}
                  </div>

                  {/* Right: Scheduled time, Countdown & Quick actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="text-right sm:text-left space-y-0.5">
                      <div className="text-xs font-bold text-slate-800 flex items-center space-x-1.5 space-x-reverse sm:justify-end">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{new Date(alert.scheduledAt).toLocaleString('ar-IQ')}</span>
                      </div>
                      <span
                        className={`text-xs font-semibold block ${
                          alert.isTriggered
                            ? 'text-slate-400'
                            : isDueNow
                            ? 'text-rose-600 font-black animate-pulse'
                            : 'text-indigo-600'
                        }`}
                      >
                        {alert.isTriggered ? 'تم إطلاق التنبيه' : getCountdownText(alert.scheduledAt)}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <button
                        type="button"
                        onClick={() => openWhatsApp(apt.clientPhone, clientMsg)}
                        className="p-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition-colors"
                        title="واتساب للزبون"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>

                      {apt.guarantorPhone && (
                        <button
                          type="button"
                          onClick={() => openWhatsApp(apt.guarantorPhone, guarantorMsg)}
                          className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-colors"
                          title="واتساب للكفيل"
                        >
                          <ShieldAlert className="w-4 h-4" />
                        </button>
                      )}

                      {!alert.isTriggered && (
                        <button
                          type="button"
                          onClick={() => handleTriggerNow(apt.id)}
                          className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center space-x-1 space-x-reverse shadow-xs transition-colors"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>تنبيه الآن</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => openScheduleAlertModal(apt)}
                        className="px-3 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-xs transition-colors"
                      >
                        تعديل الموعد
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
