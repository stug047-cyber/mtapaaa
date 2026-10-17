import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api, formatCurrency } from '../services/api';
import {
  X,
  Wallet,
  DollarSign,
  Calendar,
  CreditCard,
  FileText,
  Hash,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

export const PaymentModal: React.FC = () => {
  const {
    isPaymentModalOpen,
    paymentTargetInstallment,
    paymentTargetAppointment,
    closePaymentModal,
    refreshData,
    showToast,
    currency,
  } = useApp();

  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'cheque' | 'card' | 'zain_cash' | 'qi_card'>('cash');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const target = paymentTargetAppointment || paymentTargetInstallment;

  useEffect(() => {
    if (paymentTargetAppointment) {
      const remaining = paymentTargetAppointment.remainingAmount;
      setAmount(String(remaining > 0 ? remaining : paymentTargetAppointment.requiredAmount));
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('cash');
      setReferenceNo('');
      setNotes('');
    } else if (paymentTargetInstallment) {
      const remaining = paymentTargetInstallment.amount - (paymentTargetInstallment.paidAmount || 0);
      setAmount(String(remaining > 0 ? remaining : paymentTargetInstallment.amount));
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('cash');
      setReferenceNo('');
      setNotes('');
    }
    setError(null);
  }, [paymentTargetAppointment, paymentTargetInstallment, isPaymentModalOpen]);

  if (!isPaymentModalOpen || !target) return null;

  const totalAmount = 'requiredAmount' in target ? target.requiredAmount : target.amount;
  const currentPaid = target.paidAmount || 0;
  const remaining = Math.max(0, totalAmount - currentPaid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payAmount = parseFloat(amount);

    if (!payAmount || payAmount <= 0) {
      setError('يرجى إدخال مبلغ دفع صالح');
      return;
    }

    if (payAmount > remaining) {
      setError(`المبلغ المدخل (${payAmount.toLocaleString()}) يتجاوز المبلغ المتبقي (${remaining.toLocaleString()} ${currency})`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (paymentTargetAppointment) {
        const res = await api.payAppointment(paymentTargetAppointment.id, {
          amount: payAmount,
          paymentDate,
          paymentMethod,
          referenceNo: referenceNo.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        showToast(res.message, 'success', 'تسجيل السداد');
      } else if (paymentTargetInstallment) {
        const res = await api.payInstallment(paymentTargetInstallment.id, {
          amount: payAmount,
          paymentDate,
          paymentMethod,
          referenceNo: referenceNo.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        showToast(res.message, 'success', 'تسجيل السداد');
      }

      refreshData();
      closePaymentModal();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تسجيل الدفع');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayFull = () => {
    setAmount(String(remaining));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">تسجيل دفعة / سداد في الطابور</h3>
              <p className="text-xs text-slate-500">إثبات استلام دفعة مالية وتحديث المتبقي فورياً</p>
            </div>
          </div>

          <button
            onClick={closePaymentModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Banner */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">صاحب الموعد</span>
            <span className="text-base font-bold text-white mt-0.5 block">{target.clientName}</span>
            <span className="text-xs text-emerald-400 block mt-0.5" dir="ltr">{target.clientPhone}</span>
            {target.guarantorName && (
              <span className="text-[11px] text-amber-300 block mt-1">
                الكفيل: {target.guarantorName}
              </span>
            )}
          </div>

          <div className="text-left">
            <span className="text-xs text-slate-400 block">المبلغ المتبقي</span>
            <span className="text-xl font-extrabold text-emerald-400 mt-0.5 block">
              {formatCurrency(remaining, currency)}
            </span>
            <span className="text-[11px] text-slate-400 block">
              من إجمالي: {formatCurrency(totalAmount, currency)}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                مبلغ الدفعة ({currency}) <span className="text-rose-500">*</span>
              </label>

              <button
                type="button"
                onClick={handlePayFull}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                سداد كامل المتبقي ({remaining.toLocaleString()})
              </button>
            </div>

            <div className="relative">
              <DollarSign className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="number"
                step="0.01"
                required
                min="0.1"
                max={remaining}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={String(remaining)}
                className="w-full pr-9 pl-3 py-2 text-base rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                تاريخ السداد <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                طريقة الدفع <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full pr-9 pl-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                >
                  <option value="cash">نقداً (كاش عراقي)</option>
                  <option value="zain_cash">زين كاش (Zain Cash)</option>
                  <option value="qi_card">بطاقة كي كارد (Qi Card) / الماستر</option>
                  <option value="bank_transfer">حوالة / تحويل مصرفي</option>
                  <option value="cheque">صك / شيك مصرفي</option>
                  <option value="card">بطاقة دفع إلكتروني</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              رقم الإيصال / المرجع البنكي <span className="text-slate-400 font-normal">(اختياري)</span>
            </label>
            <div className="relative">
              <Hash className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="مثال: TRX-839210 أو رقم الشيك"
                className="w-full pr-9 pl-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ملاحظات السداد <span className="text-slate-400 font-normal">(اختياري)</span>
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي ملاحظات حول المستلم أو فرع السداد..."
                className="w-full pr-9 pl-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closePaymentModal}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/25 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>تأكيد تسجيل السداد</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
