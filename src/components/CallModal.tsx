import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api, formatCurrency } from '../services/api';
import { Client } from '../types';
import {
  X,
  PhoneCall,
  Calendar,
  DollarSign,
  FileText,
  Loader2,
  CheckCircle2,
  PhoneForwarded,
  Clock,
  AlertTriangle,
  User,
} from 'lucide-react';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetClient?: Client | null;
}

export const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  onClose,
  targetClient,
}) => {
  const { refreshData, showToast, currency } = useApp();

  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [result, setResult] = useState<string>('promised');
  const [promisedDate, setPromisedDate] = useState<string>('');
  const [promisedAmount, setPromisedAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (targetClient) {
      setSelectedClientId(targetClient.id);
    } else {
      api.getClients().then((res) => {
        setClients(res.clients);
      }).catch(console.error);
    }

    // Default promised date = in 3 days
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 3);
    setPromisedDate(nextDate.toISOString().split('T')[0]);
    setResult('promised');
    setPromisedAmount(targetClient?.promiseAmount ? String(targetClient.promiseAmount) : '');
    setNotes('');
    setError(null);
  }, [isOpen, targetClient]);

  if (!isOpen) return null;

  const currentClient = targetClient || clients.find((c) => c.id === selectedClientId);

  const cleanPhone = (phone?: string) => {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  };

  const toWhatsAppUrl = (phone?: string, text?: string) => {
    if (!phone) return '#';
    let p = cleanPhone(phone);
    if (p.startsWith('0')) {
      // Iraqi numbers start with 07... -> country code 964
      p = '964' + p.substring(1);
    }
    const msg = encodeURIComponent(text || 'السلام عليكم، تذكير بموعد سداد القسط المستحق.');
    return `https://wa.me/${p}?text=${msg}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      setError('يرجى اختيار الزبون الذي تم الاتصال به');
      return;
    }

    if ((result === 'promised' || result === 'postponed') && !promisedDate) {
      setError('يرجى تحديد تاريخ موعد السداد المتفق عليه');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.recordCall(selectedClientId, {
        result,
        promisedDate: (result === 'promised' || result === 'postponed') ? promisedDate : undefined,
        promisedAmount: promisedAmount ? Number(promisedAmount) : undefined,
        notes: notes.trim() || undefined,
      });

      showToast('تم تسجيل تفاصيل الاتصال وتحديث موعد السداد بنجاح', 'success');
      refreshData();
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل حفظ سجل الاتصال');
    } finally {
      setLoading(false);
    }
  };

  const callResultOptions = [
    { id: 'promised', label: 'انطاني موعد للتسديد (وعد بالسداد)', color: 'emerald' },
    { id: 'postponed', label: 'تم تأجيل الموعد إلى تاريخ آخر', color: 'purple' },
    { id: 'no_answer', label: 'تم الاتصال ولا يرد', color: 'amber' },
    { id: 'phone_off', label: 'الهاتف مغلق / خارج التغطية', color: 'slate' },
    { id: 'asked_to_call_later', label: 'طلب الاتصال لاحقاً', color: 'blue' },
    { id: 'referred_to_guarantor', label: 'تمت الإحالة للكفيل الضامن', color: 'indigo' },
    { id: 'excuse', label: 'لديه عذر / ظرف خاص', color: 'amber' },
    { id: 'refused', label: 'ممتنع / رافض للدفع', color: 'rose' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">تسجيل مكالمة وموعد سداد</h3>
              <p className="text-xs text-slate-500">توثيق ما دار بالاتصال وتثبيت موعد السداد الموعود</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Client & Guarantor Contact Card */}
        {currentClient && (
          <div className="bg-slate-900 text-white p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] text-emerald-400 font-semibold block">الزبون صاحب القسط</span>
                <span className="text-base font-bold text-white mt-0.5 block">{currentClient.name}</span>
                <span className="text-xs text-slate-300 block" dir="ltr">{currentClient.phone}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <a
                  href={`tel:${currentClient.phone}`}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1 transition-colors"
                  title="اتصال هاتفي بالزبون"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>اتصال</span>
                </a>
                <a
                  href={toWhatsAppUrl(currentClient.phone, `السلام عليكم أستاذ ${currentClient.name}، نود تذكيرك بموعد سداد القسط المستحق.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold inline-flex items-center gap-1 transition-colors"
                  title="واتساب الزبون"
                >
                  <span>واتساب</span>
                </a>
              </div>
            </div>

            {/* Guarantor Details */}
            {currentClient.guarantorName && (
              <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-amber-400 font-bold block">الكفيل الضامن:</span>
                  <span className="text-xs font-bold text-slate-100">{currentClient.guarantorName}</span>
                  {currentClient.guarantorPhone && (
                    <span className="text-[11px] text-slate-400 block" dir="ltr">{currentClient.guarantorPhone}</span>
                  )}
                </div>

                {currentClient.guarantorPhone && (
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`tel:${currentClient.guarantorPhone}`}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-bold inline-flex items-center gap-1 transition-colors border border-slate-700"
                      title="اتصال بالكفيل"
                    >
                      <PhoneCall className="w-3 h-3" />
                      <span>اتصال بالكفيل</span>
                    </a>
                    <a
                      href={toWhatsAppUrl(currentClient.guarantorPhone, `السلام عليكم أستاذ ${currentClient.guarantorName}، بخصوص كفالتكم للزبون ${currentClient.name} وموعد سداد القسط.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[11px] font-bold inline-flex items-center gap-1 transition-colors border border-slate-700"
                      title="واتساب الكفيل"
                    >
                      <span>واتساب الكفيل</span>
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Select Client if not preset */}
          {!targetClient && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                اختر صاحب الموعد / الزبون <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white font-medium"
                required
              >
                <option value="">-- اختر من قائمة الزبائن --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone}) {c.guarantorName ? `- كفيل: ${c.guarantorName}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Call Result Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              نتيجة الاتصال <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {callResultOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setResult(opt.id)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-right flex items-center justify-between ${
                    result === opt.id
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{opt.label}</span>
                  {result === opt.id && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* If promised or postponed, show Promise Date & Amount */}
          {(result === 'promised' || result === 'postponed') && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>تفاصيل موعد السداد المتفق عليه (الموعد القادم):</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ موعد السداد المتفق عليه <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                    <input
                      type="date"
                      required
                      value={promisedDate}
                      onChange={(e) => setPromisedDate(e.target.value)}
                      className="w-full pr-9 pl-3 py-2 text-sm rounded-xl border border-emerald-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المبلغ المتفق على سداده ({currency})
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                    <input
                      type="number"
                      step="1"
                      value={promisedAmount}
                      onChange={(e) => setPromisedAmount(e.target.value)}
                      placeholder="مثال: 50000"
                      className="w-full pr-9 pl-3 py-2 text-sm rounded-xl border border-emerald-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ملاحظات وتفاصيل ما دار في الاتصال <span className="text-slate-400 font-normal">(اختياري)</span>
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أوضح الزبون أنه سيستلم راتبه يوم الأحد وسيقوم بالتحويل..."
                className="w-full pr-9 pl-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PhoneForwarded className="w-4 h-4" />
              )}
              <span>حفظ وتثبيت موعد السداد</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
