import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { Client } from '../types';
import {
  X,
  CalendarClock,
  User,
  Phone,
  DollarSign,
  Calendar,
  FileText,
  Trash2,
  Wallet,
  Loader2,
  CheckCircle2,
  UserPlus,
} from 'lucide-react';

export const InstallmentModal: React.FC = () => {
  const {
    isInstallmentModalOpen,
    installmentModalTarget,
    installmentPreselectedClientId,
    closeInstallmentModal,
    openPaymentModal,
    openDeleteModal,
    refreshData,
    showToast,
    currency,
  } = useApp();

  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isNewClientMode, setIsNewClientMode] = useState<boolean>(false);
  const [clientName, setClientName] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [status, setStatus] = useState<string>('unpaid');
  const [notes, setNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load clients list for the selector
  useEffect(() => {
    if (!isInstallmentModalOpen) return;

    api
      .getClients()
      .then((res) => {
        setClients(res.clients);
      })
      .catch((err) => {
        console.error('Error fetching clients for selector:', err);
      });
  }, [isInstallmentModalOpen]);

  useEffect(() => {
    if (installmentModalTarget) {
      setSelectedClientId(installmentModalTarget.clientId);
      setIsNewClientMode(false);
      setClientName(installmentModalTarget.clientName);
      setClientPhone(installmentModalTarget.clientPhone);
      setAmount(String(installmentModalTarget.amount));
      setDueDate(installmentModalTarget.dueDate);
      setStatus(installmentModalTarget.status);
      setNotes(installmentModalTarget.notes || '');
    } else {
      const today = new Date().toISOString().split('T')[0];
      setSelectedClientId(installmentPreselectedClientId || '');
      setIsNewClientMode(false);
      setClientName('');
      setClientPhone('');
      setAmount('');
      setDueDate(today);
      setStatus('unpaid');
      setNotes('');
    }
    setError(null);
  }, [installmentModalTarget, installmentPreselectedClientId, isInstallmentModalOpen]);

  if (!isInstallmentModalOpen) return null;

  // Handle client select change
  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const found = clients.find((c) => c.id === clientId);
    if (found) {
      setClientName(found.name);
      setClientPhone(found.phone);
    }
  };

  // Quick date presets
  const setPresetDate = (days: number) => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    setDueDate(target.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('يرجى إدخال مبلغ صالح أكبر من صفر');
      return;
    }
    if (!dueDate) {
      setError('يرجى تحديد تاريخ استحقاق القسط');
      return;
    }

    if (!isNewClientMode && !selectedClientId) {
      setError('يرجى اختيار صاحب الموعد من القائمة أو تفعيل إضافة عميل جديد');
      return;
    }

    if (isNewClientMode && (!clientName.trim() || !clientPhone.trim())) {
      setError('يرجى إدخال اسم ورقم هاتف صاحب الموعد الجديد');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (installmentModalTarget) {
        await api.updateInstallment(installmentModalTarget.id, {
          clientId: selectedClientId,
          amount: numAmount,
          dueDate,
          notes: notes.trim() || undefined,
          status: status as any,
        });
        showToast('تم تعديل بيانات القسط بنجاح', 'success');
      } else {
        await api.createInstallment({
          clientId: !isNewClientMode ? selectedClientId : undefined,
          clientName: isNewClientMode ? clientName.trim() : undefined,
          clientPhone: isNewClientMode ? clientPhone.trim() : undefined,
          amount: numAmount,
          dueDate,
          notes: notes.trim() || undefined,
          status,
        });
        showToast('تمت إضافة القسط وموعد الدفع بنجاح', 'success');
      }

      refreshData();
      closeInstallmentModal();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ القسط');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!installmentModalTarget) return;

    openDeleteModal(
      'تأكيد حذف القسط',
      `هل أنت متأكد من رغبتك في حذف القسط بمبلغ ${installmentModalTarget.amount.toLocaleString()} ${currency} لصالح (${installmentModalTarget.clientName})؟ لا يمكن التراجع عن هذا الإجراء وسيتم حذف جميع سجلات الدفع المرتبطة به.`,
      async () => {
        await api.deleteInstallment(installmentModalTarget.id);
        showToast('تم حذف القسط بنجاح', 'success');
        closeInstallmentModal();
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-100">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {installmentModalTarget ? 'تعديل موعد وقسط الدفع' : 'إضافة قسط وموعد دفع جديد'}
              </h3>
              <p className="text-xs text-slate-500">
                {installmentModalTarget
                  ? 'تعديل تفاصيل المبلغ، الموعد، أو الحالة'
                  : 'ربط القسط بصاحب الموعد وتحديد تاريخ الاستحقاق'}
              </p>
            </div>
          </div>

          <button
            onClick={closeInstallmentModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Client Selection */}
          {!installmentModalTarget && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  <span>صاحب الموعد</span>
                </label>

                <button
                  type="button"
                  onClick={() => setIsNewClientMode(!isNewClientMode)}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
                >
                  {isNewClientMode ? (
                    <span>اختيار من المسجلين مسبقاً</span>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>تسجيل شخص جديد</span>
                    </>
                  )}
                </button>
              </div>

              {!isNewClientMode ? (
                <div>
                  <select
                    value={selectedClientId}
                    onChange={(e) => handleClientSelect(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                  >
                    <option value="">-- اختر صاحب الموعد من القائمة --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">الاسم الكامل</label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="اسم العميل الجديد"
                      className="w-full px-3 py-1.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">رقم الهاتف</label>
                    <input
                      type="tel"
                      dir="ltr"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="05XXXXXXXX"
                      className="w-full px-3 py-1.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-right"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {installmentModalTarget && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block">صاحب الموعد</span>
                <span className="text-sm font-bold text-slate-900">{clientName}</span>
                <span className="text-xs text-slate-500 block" dir="ltr">{clientPhone}</span>
              </div>
              <div className="text-left">
                <span className="text-xs text-slate-500 block">المبلغ الحالي</span>
                <span className="text-sm font-bold text-emerald-700">{installmentModalTarget.amount.toLocaleString()} {currency}</span>
              </div>
            </div>
          )}

          {/* Amount & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                مبلغ القسط ({currency}) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <input
                  type="number"
                  step="0.01"
                  required
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="2500"
                  className="w-full pr-9 pl-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                تاريخ الاستحقاق <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500 ml-1">اختصار:</span>
            <button
              type="button"
              onClick={() => setPresetDate(0)}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
            >
              اليوم
            </button>
            <button
              type="button"
              onClick={() => setPresetDate(7)}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
            >
              بعد أسبوع
            </button>
            <button
              type="button"
              onClick={() => setPresetDate(14)}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
            >
              بعد أسبوعين
            </button>
            <button
              type="button"
              onClick={() => setPresetDate(30)}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
            >
              بعد شهر
            </button>
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              حالة القسط
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus('unpaid')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  status === 'unpaid' || status === 'overdue'
                    ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                غير مدفوع (مستحق)
              </button>

              <button
                type="button"
                onClick={() => setStatus('paid')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  status === 'paid'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>مدفوع بالكامل</span>
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ملاحظات وتفاصيل الدفع <span className="text-slate-400 font-normal">(اختياري)</span>
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: القسط الثاني من أصل 5 أقساط..."
                className="w-full pr-9 pl-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <div>
              {installmentModalTarget && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1"
                  title="حذف هذا القسط"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">حذف القسط</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {installmentModalTarget && installmentModalTarget.status !== 'paid' && (
                <button
                  type="button"
                  onClick={() => {
                    closeInstallmentModal();
                    openPaymentModal(installmentModalTarget);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1.5"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>تسجيل سداد</span>
                </button>
              )}

              <button
                type="button"
                onClick={closeInstallmentModal}
                disabled={isSubmitting}
                className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                إلغاء
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{installmentModalTarget ? 'حفظ التعديل' : 'حفظ القسط والموعد'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
