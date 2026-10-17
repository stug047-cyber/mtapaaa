import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  ShieldAlert,
  AlertCircle,
  Bell,
  Coins,
  FileText,
  Flame,
  Star,
  CheckCircle2,
  Sparkles,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Branch } from '../types';
import { GuarantorAutocompleteInput } from './GuarantorAutocompleteInput';

export const AppointmentModal: React.FC = () => {
  const {
    isAppointmentModalOpen,
    appointmentModalTarget,
    appointmentModalPrefill,
    closeAppointmentModal,
    refreshData,
    showToast,
    currency,
  } = useApp();
  const { user: currentUser } = useAuth();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  // The 5 required fields explicitly requested by user:
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorPhone, setGuarantorPhone] = useState('');
  const [requiredAmount, setRequiredAmount] = useState<string>('');

  // Additional appointment details
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('10:00');
  const [priority, setPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [notes, setNotes] = useState('');

  // Scheduled Alert Section
  const [enableAlert, setEnableAlert] = useState(true);
  const [reminderType, setReminderType] = useState<'at_appointment' | '15m_before' | '1h_before' | '1d_before' | 'custom'>('1h_before');
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('09:00');
  const [alertNote, setAlertNote] = useState('');
  const [notifyGuarantor, setNotifyGuarantor] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const isEditMode = !!appointmentModalTarget;

  // Initialize form when opened
  useEffect(() => {
    if (!isAppointmentModalOpen) return;

    // Load branches
    api.getBranches().then((res) => {
      setBranches(res.branches || []);
    }).catch((err) => {
      console.error('Failed to load branches in AppointmentModal', err);
    });

    const todayStr = new Date().toISOString().split('T')[0];

    if (appointmentModalTarget) {
      setClientName(appointmentModalTarget.clientName || '');
      setClientPhone(appointmentModalTarget.clientPhone || '');
      setGuarantorName(appointmentModalTarget.guarantorName || '');
      setGuarantorPhone(appointmentModalTarget.guarantorPhone || '');
      setRequiredAmount(appointmentModalTarget.requiredAmount ? String(appointmentModalTarget.requiredAmount) : '');
      setAppointmentDate(appointmentModalTarget.appointmentDate || todayStr);
      setAppointmentTime(appointmentModalTarget.appointmentTime || '10:00');
      setPriority(appointmentModalTarget.priority || 'normal');
      setNotes(appointmentModalTarget.notes || '');
      setSelectedBranchId(appointmentModalTarget.branchId || currentUser?.branchId || '');

      if (appointmentModalTarget.scheduledAlert) {
        setEnableAlert(true);
        setReminderType(appointmentModalTarget.scheduledAlert.reminderType || '1h_before');
        setCustomDate(appointmentModalTarget.scheduledAlert.customDate || todayStr);
        setCustomTime(appointmentModalTarget.scheduledAlert.customTime || '09:00');
        setAlertNote(appointmentModalTarget.scheduledAlert.note || '');
        setNotifyGuarantor(!!appointmentModalTarget.scheduledAlert.notifyGuarantor);
      } else {
        setEnableAlert(false);
        setReminderType('1h_before');
        setCustomDate(todayStr);
        setCustomTime('09:00');
        setAlertNote('');
        setNotifyGuarantor(true);
      }
    } else {
      // New Appointment
      setClientName(appointmentModalPrefill?.clientName || '');
      setClientPhone(appointmentModalPrefill?.clientPhone || '');
      setGuarantorName(appointmentModalPrefill?.guarantorName || '');
      setGuarantorPhone(appointmentModalPrefill?.guarantorPhone || '');
      setRequiredAmount(appointmentModalPrefill?.requiredAmount ? String(appointmentModalPrefill.requiredAmount) : '');
      setAppointmentDate(appointmentModalPrefill?.appointmentDate || todayStr);
      setAppointmentTime(appointmentModalPrefill?.appointmentTime || '10:00');
      setPriority(appointmentModalPrefill?.priority || 'normal');
      setNotes(appointmentModalPrefill?.notes || '');
      setSelectedBranchId(currentUser?.branchId || '');

      setEnableAlert(true);
      setReminderType('1h_before');
      setCustomDate(todayStr);
      setCustomTime('09:00');
      setAlertNote('');
      setNotifyGuarantor(true);
    }
    setFormErrors({});
  }, [isAppointmentModalOpen, appointmentModalTarget, appointmentModalPrefill, currentUser]);

  // Compute scheduled alert ISO timestamp
  const calculateScheduledAt = (): string => {
    if (!appointmentDate) return new Date().toISOString();

    const [year, month, day] = appointmentDate.split('-').map(Number);
    const [hours, minutes] = (appointmentTime || '10:00').split(':').map(Number);
    const aptDateTime = new Date(year, month - 1, day, hours, minutes);

    if (reminderType === 'custom') {
      if (customDate && customTime) {
        const [cYear, cMonth, cDay] = customDate.split('-').map(Number);
        const [cHours, cMinutes] = customTime.split(':').map(Number);
        return new Date(cYear, cMonth - 1, cDay, cHours, cMinutes).toISOString();
      }
      return aptDateTime.toISOString();
    }

    if (reminderType === 'at_appointment') {
      return aptDateTime.toISOString();
    }

    if (reminderType === '15m_before') {
      return new Date(aptDateTime.getTime() - 15 * 60 * 1000).toISOString();
    }

    if (reminderType === '1h_before') {
      return new Date(aptDateTime.getTime() - 60 * 60 * 1000).toISOString();
    }

    if (reminderType === '1d_before') {
      return new Date(aptDateTime.getTime() - 24 * 60 * 60 * 1000).toISOString();
    }

    return aptDateTime.toISOString();
  };

  const validate = () => {
    const errors: Record<string, string> = {};

    if (!clientName.trim()) {
      errors.clientName = 'يرجى إدخال اسم العميل';
    }
    if (!clientPhone.trim()) {
      errors.clientPhone = 'يرجى إدخال رقم هاتف العميل';
    }
    if (!guarantorName.trim()) {
      errors.guarantorName = 'يرجى إدخال اسم الكفيل الضامن';
    }
    if (!guarantorPhone.trim()) {
      errors.guarantorPhone = 'يرجى إدخال رقم هاتف الكفيل';
    }

    const numAmount = Number(requiredAmount.replace(/,/g, ''));
    if (!requiredAmount || isNaN(numAmount) || numAmount <= 0) {
      errors.requiredAmount = 'يرجى إدخال مبلغ صحيح أكبر من صفر';
    }

    if (!appointmentDate) {
      errors.appointmentDate = 'يرجى تحديد تاريخ الموعد';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const parsedAmount = Number(requiredAmount.replace(/,/g, ''));

      let scheduledAlertData = undefined;
      if (enableAlert) {
        scheduledAlertData = {
          scheduledAt: calculateScheduledAt(),
          reminderType,
          customDate: reminderType === 'custom' ? customDate : undefined,
          customTime: reminderType === 'custom' ? customTime : undefined,
          note: alertNote.trim() || `تذكير بموعد ${clientName.trim()} لدفع ${parsedAmount.toLocaleString()} ${currency}`,
          notifyGuarantor,
          isTriggered: false,
        };
      }

      if (isEditMode && appointmentModalTarget) {
        await api.updateAppointment(appointmentModalTarget.id, {
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          guarantorName: guarantorName.trim(),
          guarantorPhone: guarantorPhone.trim(),
          requiredAmount: parsedAmount,
          appointmentDate,
          appointmentTime,
          priority,
          branchId: selectedBranchId || undefined,
          notes: notes.trim() || undefined,
          scheduledAlert: scheduledAlertData,
        });
        showToast('تم تحديث بيانات الموعد بنجاح', 'success');
      } else {
        await api.createAppointment({
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          guarantorName: guarantorName.trim(),
          guarantorPhone: guarantorPhone.trim(),
          requiredAmount: parsedAmount,
          appointmentDate,
          appointmentTime,
          priority,
          branchId: selectedBranchId || undefined,
          notes: notes.trim() || undefined,
          scheduledAlert: scheduledAlertData,
        });
        showToast('تمت إضافة الموعد إلى الطابور وجدولة التنبيه بنجاح', 'success');
      }

      refreshData();
      closeAppointmentModal();
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء حفظ الموعد', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAppointmentModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-l from-emerald-600 via-teal-600 to-emerald-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {isEditMode ? 'تعديل موعد في الطابور' : 'إضافة موعد جديد إلى الطابور'}
              </h2>
              <p className="text-xs text-emerald-100">
                تسجيل بيانات صاحب الموعد، الكفيل، المبلغ المطلوب وجدولة التنبيه
              </p>
            </div>
          </div>
          <button
            onClick={closeAppointmentModal}
            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Section 1: Customer Info (الاسم ورقم الهاتف) */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center space-x-2 space-x-reverse text-slate-700 font-bold text-sm">
              <User className="w-4 h-4 text-emerald-600" />
              <span>معلومات العميل (صاحب الموعد)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  الاسم الكامل <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="مثال: علي حيدر الزبيدي"
                    className={`w-full pr-9 pl-3 py-2 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 ${
                      formErrors.clientName
                        ? 'border-rose-400 focus:ring-rose-200'
                        : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-200'
                    }`}
                  />
                  <User className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
                {formErrors.clientName && (
                  <p className="text-xs text-rose-500 mt-1">{formErrors.clientName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  رقم هاتف العميل <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    dir="ltr"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="07701234567"
                    className={`w-full pr-9 pl-3 py-2 text-sm rounded-lg border bg-white text-right focus:outline-none focus:ring-2 ${
                      formErrors.clientPhone
                        ? 'border-rose-400 focus:ring-rose-200'
                        : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-200'
                    }`}
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
                {formErrors.clientPhone && (
                  <p className="text-xs text-rose-500 mt-1">{formErrors.clientPhone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Guarantor Info (اسم الكفيل ورقم هاتف الكفيل مع الاقتراح والتخزين التلقائي) */}
          <GuarantorAutocompleteInput
            guarantorName={guarantorName}
            onNameChange={setGuarantorName}
            guarantorPhone={guarantorPhone}
            onPhoneChange={setGuarantorPhone}
            errorName={formErrors.guarantorName}
            errorPhone={formErrors.guarantorPhone}
          />

          {/* Section 3: Financial & Appointment Date */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center space-x-2 space-x-reverse text-slate-700 font-bold text-sm">
              <Coins className="w-4 h-4 text-emerald-600" />
              <span>المبلغ وتوقيت الموعد</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Required Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  المبلغ المطلوب للدفع <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={requiredAmount}
                    onChange={(e) => setRequiredAmount(e.target.value)}
                    placeholder="مثال: 500000"
                    className={`w-full pr-9 pl-12 py-2 text-sm font-bold text-emerald-700 rounded-lg border bg-white focus:outline-none focus:ring-2 ${
                      formErrors.requiredAmount
                        ? 'border-rose-400 focus:ring-rose-200'
                        : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-200'
                    }`}
                  />
                  <Coins className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">
                    {currency}
                  </span>
                </div>
                {formErrors.requiredAmount && (
                  <p className="text-xs text-rose-500 mt-1">{formErrors.requiredAmount}</p>
                )}
              </div>

              {/* Appointment Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  تاريخ الموعد <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full pr-9 pl-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              {/* Appointment Time */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  وقت الموعد
                </label>
                <div className="relative">
                  <input
                    type="time"
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                    className="w-full pr-9 pl-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
                  />
                  <Clock className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Priority and Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  درجة الأولوية
                </label>
                <div className="flex rounded-lg border border-slate-300 p-0.5 bg-white text-xs">
                  <button
                    type="button"
                    onClick={() => setPriority('normal')}
                    className={`flex-1 py-1.5 rounded-md text-center font-medium transition-colors ${
                      priority === 'normal'
                        ? 'bg-slate-100 text-slate-800 font-bold shadow-xs'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    عادي
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('important')}
                    className={`flex-1 py-1.5 rounded-md text-center font-medium transition-colors flex items-center justify-center space-x-1 space-x-reverse ${
                      priority === 'important'
                        ? 'bg-amber-100 text-amber-800 font-bold shadow-xs'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span>مهم</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('urgent')}
                    className={`flex-1 py-1.5 rounded-md text-center font-medium transition-colors flex items-center justify-center space-x-1 space-x-reverse ${
                      priority === 'urgent'
                        ? 'bg-rose-100 text-rose-800 font-bold shadow-xs'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Flame className="w-3 h-3 text-rose-500 fill-rose-500" />
                    <span>عاجل</span>
                  </button>
                </div>
              </div>

              <div className={branches.length > 0 ? "sm:col-span-1" : "sm:col-span-2"}>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ملاحظات أو سبب الموعد
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="مثال: وعد بالحضور الساعة 11 لدفع القسط الشهري"
                    className="w-full pr-9 pl-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
                  />
                  <FileText className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              {branches.length > 0 && (
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    الفرع التابع له الموعد
                  </label>
                  <div className="relative">
                    <select
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      className="w-full pr-9 pl-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none text-slate-700 font-medium"
                    >
                      <option value="">-- اختياري (تلقائي للفرع التابع) --</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                    <Building2 className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Scheduled Alert (جدولة إشعار التنبيه) */}
          <div className="border border-indigo-200 bg-indigo-50/60 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 space-x-reverse text-indigo-950 font-bold text-sm">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <span>جدولة إشعار تنبيه للموعد</span>
                  <p className="text-[11px] font-normal text-indigo-700">
                    إطلاق تنبيه صوتي وإشعار داخل التطبيق وتجهيز رسالة واتساب
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableAlert}
                  onChange={(e) => setEnableAlert(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {enableAlert && (
              <div className="pt-2 space-y-3 border-t border-indigo-200/70 animate-in fade-in duration-150">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    وقت إطلاق إشعار التنبيه:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {[
                      { id: 'at_appointment', label: 'في وقت الموعد' },
                      { id: '15m_before', label: 'قبل 15 دقيقة' },
                      { id: '1h_before', label: 'قبل ساعة واحدة' },
                      { id: '1d_before', label: 'قبل يوم واحد' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setReminderType(opt.id as any)}
                        className={`py-2 px-2.5 rounded-lg border text-center transition-all ${
                          reminderType === opt.id
                            ? 'bg-indigo-600 border-indigo-600 text-white font-bold shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setReminderType('custom')}
                      className={`text-xs py-1.5 px-3 rounded-lg border transition-colors ${
                        reminderType === 'custom'
                          ? 'bg-indigo-600 border-indigo-600 text-white font-bold'
                          : 'bg-white border-slate-300 text-slate-700 hover:border-indigo-300'
                      }`}
                    >
                      تحديد تاريخ ووقت مخصص بدقة
                    </button>
                  </div>
                </div>

                {reminderType === 'custom' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-white rounded-lg border border-indigo-200">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        تاريخ إطلاق التنبيه
                      </label>
                      <input
                        type="date"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        ساعة التنبيه
                      </label>
                      <input
                        type="time"
                        value={customTime}
                        onChange={(e) => setCustomTime(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                )}

                {/* Notify Guarantor Checkbox */}
                <div className="flex items-center space-x-2 space-x-reverse bg-white/80 p-2.5 rounded-lg border border-indigo-100">
                  <input
                    type="checkbox"
                    id="notifyGuarantor"
                    checked={notifyGuarantor}
                    onChange={(e) => setNotifyGuarantor(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <label htmlFor="notifyGuarantor" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    تنبيه وتذكير الكفيل أيضاً ({guarantorName || 'الكفيل الضامن'})
                  </label>
                </div>

                {/* Custom Alert Message */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    نص التنبيه والتذكير (اختياري)
                  </label>
                  <input
                    type="text"
                    value={alertNote}
                    onChange={(e) => setAlertNote(e.target.value)}
                    placeholder={`تذكير بموعد سداد ${requiredAmount ? Number(requiredAmount).toLocaleString() : ''} ${currency}`}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex items-center justify-end space-x-3 space-x-reverse border-t border-slate-100">
            <button
              type="button"
              onClick={closeAppointmentModal}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm font-medium transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center space-x-2 space-x-reverse disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>جاري الحفظ...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEditMode ? 'حفظ التعديلات' : 'إضافة الموعد للطابور'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
