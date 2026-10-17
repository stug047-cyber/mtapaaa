import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { AppointmentStatus, PostponementRecord } from '../types';
import {
  X,
  Bell,
  Clock,
  Calendar,
  Phone,
  MessageCircle,
  ShieldAlert,
  CheckCircle2,
  SlidersHorizontal,
  History,
  AlertCircle,
  RefreshCw,
  User,
  Sparkles,
} from 'lucide-react';

export const ScheduleAlertModal: React.FC = () => {
  const {
    isScheduleAlertModalOpen,
    scheduleAlertTarget,
    closeScheduleAlertModal,
    refreshData,
    showToast,
    currency,
  } = useApp();

  // Status state
  const [selectedStatus, setSelectedStatus] = useState<AppointmentStatus>('waiting');
  const [statusNotes, setStatusNotes] = useState('');

  // Reschedule / Postpone fields
  const [isPostponing, setIsPostponing] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('10:00');
  const [postponeReason, setPostponeReason] = useState('');

  // Alert fields
  const [enableAlert, setEnableAlert] = useState(true);
  const [reminderType, setReminderType] = useState<'at_appointment' | '15m_before' | '1h_before' | '1d_before' | 'custom'>('1h_before');
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('09:00');
  const [alertNote, setAlertNote] = useState('');
  const [notifyGuarantor, setNotifyGuarantor] = useState(true);

  // History state
  const [postponementHistory, setPostponementHistory] = useState<PostponementRecord[]>([]);
  const [originalDate, setOriginalDate] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isScheduleAlertModalOpen || !scheduleAlertTarget) return;

    setSelectedStatus(scheduleAlertTarget.status || 'waiting');
    setStatusNotes(scheduleAlertTarget.notes || '');

    const currentAptDate = scheduleAlertTarget.appointmentDate || new Date().toISOString().split('T')[0];
    const currentAptTime = scheduleAlertTarget.appointmentTime || '10:00';
    setNewDate(currentAptDate);
    setNewTime(currentAptTime);
    setPostponeReason('');
    setIsPostponing(scheduleAlertTarget.status === 'postponed');

    setPostponementHistory(scheduleAlertTarget.postponementHistory || []);
    setOriginalDate(scheduleAlertTarget.originalAppointmentDate || scheduleAlertTarget.appointmentDate);

    // Alert setup
    if (scheduleAlertTarget.scheduledAlert) {
      setEnableAlert(true);
      setReminderType(scheduleAlertTarget.scheduledAlert.reminderType || '1h_before');
      setCustomDate(scheduleAlertTarget.scheduledAlert.customDate || currentAptDate);
      setCustomTime(scheduleAlertTarget.scheduledAlert.customTime || '09:00');
      setAlertNote(scheduleAlertTarget.scheduledAlert.note || '');
      setNotifyGuarantor(!!scheduleAlertTarget.scheduledAlert.notifyGuarantor);
    } else {
      setEnableAlert(true);
      setReminderType('1h_before');
      setCustomDate(currentAptDate);
      setCustomTime('09:00');
      setAlertNote(`تذكير بموعد ${scheduleAlertTarget.clientName} لدفع ${scheduleAlertTarget.remainingAmount.toLocaleString()} ${currency}`);
      setNotifyGuarantor(true);
    }

    // Also fetch full fresh history from server
    api.getAppointmentHistory(scheduleAlertTarget.id)
      .then((res) => {
        if (res.postponementHistory) {
          setPostponementHistory(res.postponementHistory);
        }
        if (res.originalAppointmentDate) {
          setOriginalDate(res.originalAppointmentDate);
        }
      })
      .catch((err) => console.warn('Could not fetch appointment history:', err));
  }, [isScheduleAlertModalOpen, scheduleAlertTarget, currency]);

  if (!isScheduleAlertModalOpen || !scheduleAlertTarget) return null;

  const statusOptions: { id: AppointmentStatus; label: string; color: string; desc: string }[] = [
    { id: 'waiting', label: 'بانتظار الموعد', color: 'border-amber-300 bg-amber-50 text-amber-900', desc: 'في الطابور بانتظار تاريخ الاستحقاق' },
    { id: 'today', label: 'حان موعده اليوم 🔥', color: 'border-emerald-400 bg-emerald-50 text-emerald-900', desc: 'الموعد مستحق اليوم' },
    { id: 'postponed', label: 'تم تأجيل الموعد 🔄', color: 'border-purple-300 bg-purple-50 text-purple-900', desc: 'تم الاتفاق على موعد لاحق وتأجيله' },
    { id: 'paid', label: 'تم السداد بالكامل ✓', color: 'border-teal-400 bg-teal-50 text-teal-900', desc: 'اكتمل سداد المبلغ المطلوب' },
    { id: 'partially_paid', label: 'مسدد جزئياً', color: 'border-blue-300 bg-blue-50 text-blue-900', desc: 'تم دفع جزء من المبلغ' },
    { id: 'referred_to_guarantor', label: 'محال للكفيل 🛡️', color: 'border-indigo-300 bg-indigo-50 text-indigo-900', desc: 'تم التواصل مع الكفيل للضمان' },
    { id: 'overdue', label: 'متأخر عن الموعد 🚨', color: 'border-rose-400 bg-rose-50 text-rose-900', desc: 'تجاوز تاريخ الموعد بدون حضور' },
    { id: 'no_answer', label: 'لم يرد على الاتصال', color: 'border-slate-300 bg-slate-100 text-slate-800', desc: 'تم الاتصال ولم يجب' },
    { id: 'phone_off', label: 'الهاتف مغلق', color: 'border-zinc-300 bg-zinc-100 text-zinc-800', desc: 'خارج التغطية أو مغلق' },
    { id: 'refused', label: 'ممتنع عن السداد', color: 'border-red-400 bg-red-100 text-red-950', desc: 'رفض الالتزام أو السداد' },
  ];

  const calculateScheduledAt = (): string => {
    const targetAptDate = isPostponing && newDate ? newDate : scheduleAlertTarget.appointmentDate;
    const targetAptTime = isPostponing && newTime ? newTime : (scheduleAlertTarget.appointmentTime || '10:00');

    const [year, month, day] = (targetAptDate || new Date().toISOString().split('T')[0]).split('-').map(Number);
    const [hours, minutes] = targetAptTime.split(':').map(Number);
    const aptDateTime = new Date(year, month - 1, day, hours, minutes);

    if (reminderType === 'custom') {
      if (customDate && customTime) {
        const [cYear, cMonth, cDay] = customDate.split('-').map(Number);
        const [cHours, cMinutes] = customTime.split(':').map(Number);
        return new Date(cYear, cMonth - 1, cDay, cHours, cMinutes).toISOString();
      }
      return aptDateTime.toISOString();
    }
    if (reminderType === 'at_appointment') return aptDateTime.toISOString();
    if (reminderType === '15m_before') return new Date(aptDateTime.getTime() - 15 * 60 * 1000).toISOString();
    if (reminderType === '1h_before') return new Date(aptDateTime.getTime() - 60 * 60 * 1000).toISOString();
    if (reminderType === '1d_before') return new Date(aptDateTime.getTime() - 24 * 60 * 60 * 1000).toISOString();
    return aptDateTime.toISOString();
  };

  const handleStatusSelect = (st: AppointmentStatus) => {
    setSelectedStatus(st);
    if (st === 'postponed') {
      setIsPostponing(true);
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      let scheduledAlertData = null;
      if (enableAlert) {
        scheduledAlertData = {
          scheduledAt: calculateScheduledAt(),
          reminderType,
          customDate: reminderType === 'custom' ? customDate : undefined,
          customTime: reminderType === 'custom' ? customTime : undefined,
          note: alertNote.trim() || `تذكير بموعد ${scheduleAlertTarget.clientName} (${selectedStatus})`,
          notifyGuarantor,
        };
      }

      const isDateChanged = isPostponing && newDate && newDate !== scheduleAlertTarget.appointmentDate;
      const finalNotes = postponeReason.trim()
        ? `${statusNotes ? statusNotes + ' | ' : ''}سبب التأجيل: ${postponeReason.trim()}`
        : statusNotes;

      await api.updateAppointmentStatus(scheduleAlertTarget.id, {
        status: selectedStatus,
        notes: finalNotes || undefined,
        newAppointmentDate: isDateChanged ? newDate : undefined,
        newAppointmentTime: isDateChanged ? newTime : undefined,
        scheduledAlert: scheduledAlertData,
      });

      showToast('تم تحديث حالة الموعد وجدولة التنبيه بنجاح', 'success');
      refreshData();
      closeScheduleAlertModal();
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء حفظ التعديلات', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTriggerNow = async () => {
    try {
      await api.triggerAppointmentAlert(scheduleAlertTarget.id);
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

  const clientWhatsappText = `السلام عليكم ورحمة الله، أستاذ ${scheduleAlertTarget.clientName}. نود تذكيركم بموعدكم (${scheduleAlertTarget.appointmentDate}) لدفع مبلغ (${scheduleAlertTarget.remainingAmount.toLocaleString()} ${currency}). يرجى الالتزام بالموعد.`;
  const guarantorWhatsappText = `السلام عليكم ورحمة الله، الأخ الكفيل ${scheduleAlertTarget.guarantorName}. نود إشعاركم بموعد سداد مكفولكم السيد (${scheduleAlertTarget.clientName}) بتاريخ (${scheduleAlertTarget.appointmentDate}) بمبلغ (${scheduleAlertTarget.remainingAmount.toLocaleString()} ${currency}).`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-l from-indigo-700 via-indigo-800 to-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black">تغيير حالة الموعد وجدولة التنبيه</h2>
              <p className="text-xs text-indigo-200">
                الموعد رقم #{scheduleAlertTarget.queueNumber}: {scheduleAlertTarget.clientName}
              </p>
            </div>
          </div>
          <button
            onClick={closeScheduleAlertModal}
            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 text-sm max-h-[80vh] overflow-y-auto">
          {/* Target Client & Guarantor Contact Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold text-slate-400 block">العميل صاحب الموعد:</span>
                <span className="text-base font-black text-slate-900">{scheduleAlertTarget.clientName}</span>
                <div className="flex items-center space-x-2 space-x-reverse text-xs text-slate-600 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span dir="ltr" className="font-mono">{scheduleAlertTarget.clientPhone}</span>
                  <a
                    href={`tel:${scheduleAlertTarget.clientPhone}`}
                    className="text-emerald-700 hover:underline font-bold mr-1 text-[11px]"
                  >
                    اتصال
                  </a>
                  <button
                    type="button"
                    onClick={() => openWhatsApp(scheduleAlertTarget.clientPhone, clientWhatsappText)}
                    className="text-teal-700 hover:underline font-bold text-[11px]"
                  >
                    واتساب
                  </button>
                </div>
              </div>

              <div className="sm:text-left bg-white p-2.5 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-400 block">المبلغ المطلوب</span>
                <span className="text-base font-black text-emerald-700">
                  {scheduleAlertTarget.remainingAmount.toLocaleString()} {currency}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  الموعد الحالي: <strong className="font-mono text-slate-800">{scheduleAlertTarget.appointmentDate}</strong>
                </span>
              </div>
            </div>

            {/* Guarantor Details */}
            <div className="pt-2 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-2 space-x-reverse">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-amber-900">الكفيل:</span>
                <span className="font-semibold text-slate-800">{scheduleAlertTarget.guarantorName}</span>
                <span dir="ltr" className="font-mono text-slate-600">({scheduleAlertTarget.guarantorPhone})</span>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <a
                  href={`tel:${scheduleAlertTarget.guarantorPhone}`}
                  className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold hover:bg-amber-200 text-[11px]"
                >
                  اتصال بالكفيل
                </a>
                <button
                  type="button"
                  onClick={() => openWhatsApp(scheduleAlertTarget.guarantorPhone, guarantorWhatsappText)}
                  className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold hover:bg-emerald-200 text-[11px]"
                >
                  واتساب الكفيل
                </button>
              </div>
            </div>
          </div>

          {/* Section: Previous Appointments & Reschedule History */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 space-x-reverse text-amber-900 font-bold text-xs sm:text-sm">
                <History className="w-4 h-4 text-amber-700" />
                <span>سجل المواعيد وتواريخ التأجيل السابقة لهذا الزبون</span>
              </div>
              {postponementHistory.length > 0 ? (
                <span className="text-[11px] font-bold bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full">
                  تم التأجيل {postponementHistory.length} مرات سابقاً
                </span>
              ) : (
                <span className="text-[11px] text-slate-500 font-medium">
                  لم يتم التأجيل من قبل
                </span>
              )}
            </div>

            {postponementHistory.length > 0 ? (
              <div className="space-y-2 pt-1">
                <div className="text-xs text-amber-950/80 font-semibold flex items-center space-x-1.5 space-x-reverse">
                  <span>الموعد الأصلي عند التسجيل:</span>
                  <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-amber-300">
                    {originalDate || postponementHistory[0].previousDate}
                  </span>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {postponementHistory.map((rec, idx) => (
                    <div
                      key={rec.id || idx}
                      className="p-2.5 rounded-xl bg-white border border-amber-200/90 text-xs text-slate-800 space-y-1"
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-amber-800 flex items-center space-x-1 space-x-reverse">
                          <RefreshCw className="w-3 h-3 text-amber-600" />
                          <span>تأجيل #{idx + 1}:</span>
                        </span>
                        <div className="flex items-center space-x-1 space-x-reverse font-mono text-[11px]">
                          <span className="line-through text-slate-400">{rec.previousDate}</span>
                          <span className="text-amber-600 font-bold">➔</span>
                          <span className="text-emerald-700 font-bold">{rec.newDate}</span>
                        </div>
                      </div>
                      {rec.reason && (
                        <p className="text-[11px] text-slate-600 mr-4 italic">
                          السبب / ما دار في الاتصال: {rec.reason}
                        </p>
                      )}
                      <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5 border-t border-slate-100">
                        <span>سجل بواسطة: {rec.postponedBy || 'الموظف'}</span>
                        <span dir="ltr">{new Date(rec.postponedAt).toLocaleDateString('ar-IQ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-600 pt-1">
                هذا الموعد ما زال على موعده الأصلي المحدد بتاريخ ({originalDate || scheduleAlertTarget.appointmentDate}). عند تسجيل أي تأجيل سيتم حفظ تاريخ الموعد السابق وتفاصيله هنا تلقائياً.
              </p>
            )}
          </div>

          {/* Section: Select Status */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              اختر حالة الموعد الجديدة <span className="text-rose-500">*</span>:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {statusOptions.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => handleStatusSelect(st.id)}
                  className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between ${
                    selectedStatus === st.id
                      ? `${st.color} ring-2 ring-indigo-500 font-bold shadow-xs`
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold">{st.label}</span>
                    {selectedStatus === st.id && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 line-clamp-1">{st.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Postpone & New Date Options (when postponed or user toggles) */}
          <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 space-x-reverse text-xs font-bold text-purple-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPostponing || selectedStatus === 'postponed'}
                  onChange={(e) => {
                    setIsPostponing(e.target.checked);
                    if (e.target.checked && selectedStatus !== 'postponed') {
                      setSelectedStatus('postponed');
                    }
                  }}
                  className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                />
                <span>تأجيل الموعد إلى تاريخ جديد (مع الاحتفاظ بالموعد السابق في السجل)</span>
              </label>

              {(isPostponing || selectedStatus === 'postponed') && (
                <span className="text-[11px] bg-purple-200/80 text-purple-900 px-2 py-0.5 rounded-full font-bold">
                  سيتم تسجيل تأجيل جديد
                </span>
              )}
            </div>

            {(isPostponing || selectedStatus === 'postponed') && (
              <div className="space-y-3 pt-1 animate-in fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      تاريخ الموعد الجديد بعد التأجيل <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-purple-600 absolute right-3 top-2.5" />
                      <input
                        type="date"
                        required
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        className="w-full pr-9 pl-3 py-2 text-xs sm:text-sm rounded-xl border border-purple-300 bg-white font-bold text-slate-900 focus:ring-2 focus:ring-purple-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      وقت الموعد الجديد
                    </label>
                    <div className="relative">
                      <Clock className="w-4 h-4 text-purple-600 absolute right-3 top-2.5" />
                      <input
                        type="time"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        className="w-full pr-9 pl-3 py-2 text-xs sm:text-sm rounded-xl border border-purple-300 bg-white font-bold text-slate-900 focus:ring-2 focus:ring-purple-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    سبب التأجيل / ما تم بالاتصال مع الزبون
                  </label>
                  <input
                    type="text"
                    value={postponeReason}
                    onChange={(e) => setPostponeReason(e.target.value)}
                    placeholder="مثال: تم الاتصال بالزبون وطلب تأجيل لنهاية الأسبوع لحين استلام الراتب..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-purple-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section: Merged Alert Scheduling (جدولة التنبيه) */}
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 space-x-reverse text-xs font-bold text-indigo-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableAlert}
                  onChange={(e) => setEnableAlert(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <Bell className="w-4 h-4 text-indigo-600" />
                <span>جدولة إشعار وتنبيه آلي لهذا الموعد</span>
              </label>

              {enableAlert && (
                <span className="text-[11px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold">
                  تنبيه نشط
                </span>
              )}
            </div>

            {enableAlert && (
              <div className="space-y-3 pt-1 animate-in fade-in">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    اختر توقيت إطلاق التنبيه:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {[
                      { id: 'at_appointment', label: 'في وقت الموعد' },
                      { id: '15m_before', label: 'قبل 15 دقيقة' },
                      { id: '1h_before', label: 'قبل ساعة' },
                      { id: '1d_before', label: 'قبل يوم' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setReminderType(opt.id as any)}
                        className={`py-2 px-2 rounded-lg border text-center transition-all ${
                          reminderType === opt.id
                            ? 'bg-indigo-600 border-indigo-600 text-white font-bold shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setReminderType('custom')}
                    className={`w-full text-xs py-2 px-3 rounded-lg border text-center transition-colors mt-2 ${
                      reminderType === 'custom'
                        ? 'bg-indigo-600 border-indigo-600 text-white font-bold'
                        : 'bg-white border-slate-300 text-slate-700 hover:border-indigo-300'
                    }`}
                  >
                    تحديد تاريخ وساعة تنبيه مخصصة
                  </button>

                  {reminderType === 'custom' && (
                    <div className="grid grid-cols-2 gap-3 p-3 bg-white rounded-xl border border-indigo-200 mt-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          تاريخ التنبيه
                        </label>
                        <input
                          type="date"
                          value={customDate}
                          onChange={(e) => setCustomDate(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          ساعة التنبيه
                        </label>
                        <input
                          type="time"
                          value={customTime}
                          onChange={(e) => setCustomTime(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Notify Guarantor Checkbox */}
                <div className="flex items-center space-x-2 space-x-reverse bg-white p-2.5 rounded-xl border border-indigo-200">
                  <input
                    type="checkbox"
                    id="mergedNotifyGuarantor"
                    checked={notifyGuarantor}
                    onChange={(e) => setNotifyGuarantor(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <label htmlFor="mergedNotifyGuarantor" className="text-xs font-semibold text-slate-800 cursor-pointer">
                    إشعار وتنبيه الكفيل الضامن أيضاً ({scheduleAlertTarget.guarantorName})
                  </label>
                </div>

                {/* Alert Note */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ملاحظة نص التنبيه
                  </label>
                  <input
                    type="text"
                    value={alertNote}
                    onChange={(e) => setAlertNote(e.target.value)}
                    placeholder="نص التنبيه أو تفاصيل المتابعة..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleTriggerNow}
            className="text-xs font-bold text-rose-700 hover:text-rose-800 hover:bg-rose-50 px-3 py-2 rounded-xl border border-rose-200 transition-colors"
          >
            إطلاق تنبيه تجريبي فوراً
          </button>

          <div className="flex items-center space-x-2 space-x-reverse mr-auto">
            <button
              type="button"
              onClick={closeScheduleAlertModal}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-1.5 space-x-reverse disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ الحالة وجدولة التنبيه'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
