import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import {
  X,
  User,
  Phone,
  IdCard,
  MapPin,
  FileText,
  ShieldCheck,
  DollarSign,
  Calendar,
  Loader2,
} from 'lucide-react';
import { GuarantorAutocompleteInput } from './GuarantorAutocompleteInput';

export const ClientModal: React.FC = () => {
  const { isClientModalOpen, clientModalTarget, closeClientModal, refreshData, showToast, currency } = useApp();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Guarantor fields (الكفيل الضامن)
  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorPhone, setGuarantorPhone] = useState('');
  const [guarantorRelation, setGuarantorRelation] = useState('');
  const [guarantorAddress, setGuarantorAddress] = useState('');

  // Initial debt & promise date (for new clients)
  const [totalDebt, setTotalDebt] = useState('');
  const [initialDueDate, setInitialDueDate] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (clientModalTarget) {
      setName(clientModalTarget.name || '');
      setPhone(clientModalTarget.phone || '');
      setNationalId(clientModalTarget.nationalId || '');
      setAddress(clientModalTarget.address || '');
      setNotes(clientModalTarget.notes || '');
      setGuarantorName(clientModalTarget.guarantorName || '');
      setGuarantorPhone(clientModalTarget.guarantorPhone || '');
      setGuarantorRelation(clientModalTarget.guarantorRelation || '');
      setGuarantorAddress(clientModalTarget.guarantorAddress || '');
      setTotalDebt('');
      setInitialDueDate('');
    } else {
      setName('');
      setPhone('');
      setNationalId('');
      setAddress('');
      setNotes('');
      setGuarantorName('');
      setGuarantorPhone('');
      setGuarantorRelation('');
      setGuarantorAddress('');
      setTotalDebt('');
      const inSevenDays = new Date();
      inSevenDays.setDate(inSevenDays.getDate() + 7);
      setInitialDueDate(inSevenDays.toISOString().split('T')[0]);
    }
    setError(null);
  }, [clientModalTarget, isClientModalOpen]);

  if (!isClientModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('يرجى إدخال اسم الزبون / صاحب القسط');
      return;
    }
    if (!phone.trim()) {
      setError('يرجى إدخال رقم هاتف الزبون');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (clientModalTarget) {
        await api.updateClient(clientModalTarget.id, {
          name: name.trim(),
          phone: phone.trim(),
          nationalId: nationalId.trim() || undefined,
          address: address.trim() || undefined,
          notes: notes.trim() || undefined,
          guarantorName: guarantorName.trim() || undefined,
          guarantorPhone: guarantorPhone.trim() || undefined,
          guarantorRelation: guarantorRelation.trim() || undefined,
          guarantorAddress: guarantorAddress.trim() || undefined,
        });
        showToast('تم تحديث بيانات الزبون والكفيل بنجاح', 'success');
      } else {
        await api.createClient({
          name: name.trim(),
          phone: phone.trim(),
          nationalId: nationalId.trim() || undefined,
          address: address.trim() || undefined,
          notes: notes.trim() || undefined,
          guarantorName: guarantorName.trim() || undefined,
          guarantorPhone: guarantorPhone.trim() || undefined,
          guarantorRelation: guarantorRelation.trim() || undefined,
          guarantorAddress: guarantorAddress.trim() || undefined,
          totalDebt: totalDebt ? Number(totalDebt) : undefined,
          initialDueDate: initialDueDate || undefined,
        });
        showToast('تمت إضافة الزبون والكفيل وتثبيت الموعد بنجاح', 'success');
      }
      refreshData();
      closeClientModal();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {clientModalTarget ? 'تعديل بيانات الزبون والكفيل' : 'إضافة زبون وصاحب موعد جديد'}
              </h3>
              <p className="text-xs text-slate-500">
                {clientModalTarget ? 'تعديل بيانات المدين ومعلومات كفيله الضامن' : 'تسجيل ملف زبون جديد مع بيانات الكفيل وتحديد موعد السداد'}
              </p>
            </div>
          </div>

          <button
            onClick={closeClientModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Section 1: Customer Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-100">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              <span>معلومات الزبون (صاحب الدين / القسط)</span>
            </h4>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الاسم الكامل للزبون <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: حيدر كريم الشمري"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم هاتف الزبون <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07XXXXXXXXX"
                    className="w-full pr-9 pl-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-right font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم الهوية / الأحوال المدنية <span className="text-slate-400 font-normal">(اختياري)</span>
                </label>
                <div className="relative">
                  <IdCard className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  <input
                    type="text"
                    dir="ltr"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="رقم الهوية الوطنية"
                    className="w-full pr-9 pl-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-right"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                السكن / العنوان <span className="text-slate-400 font-normal">(اختياري)</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="بغداد - المنصور / البصرة..."
                  className="w-full pr-9 pl-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Guarantor Details (اسم الكفيل ورقم هاتفه) */}
          <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-3">
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-emerald-200/60">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>معلومات الكفيل الضامن (Guarantor)</span>
            </h4>

            {/* Guarantor Autocomplete with Live Suggestions */}
            <GuarantorAutocompleteInput
              guarantorName={guarantorName}
              onNameChange={setGuarantorName}
              guarantorPhone={guarantorPhone}
              onPhoneChange={setGuarantorPhone}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  صلة القرابة بالكفيل
                </label>
                <input
                  type="text"
                  value={guarantorRelation}
                  onChange={(e) => setGuarantorRelation(e.target.value)}
                  placeholder="مثال: أخ / أب / صديق / زميل عمل"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عنوان أو عمل الكفيل
                </label>
                <input
                  type="text"
                  value={guarantorAddress}
                  onChange={(e) => setGuarantorAddress(e.target.value)}
                  placeholder="وزارة / دائرة / محل تجاري..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Initial Debt & Due Date (For new clients only) */}
          {!clientModalTarget && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>مبلغ القسط وموعد السداد الأولي</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    مبلغ القسط / الدين ({currency})
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={totalDebt}
                    onChange={(e) => setTotalDebt(e.target.value)}
                    placeholder="مثال: 250000"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    موعد السداد المتفق عليه
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                    <input
                      type="date"
                      value={initialDueDate}
                      onChange={(e) => setInitialDueDate(e.target.value)}
                      className="w-full pr-9 pl-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ملاحظات إضافية <span className="text-slate-400 font-normal">(اختياري)</span>
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي اتفاقات خاصة أو تفاصيل العقد..."
                className="w-full pr-9 pl-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeClientModal}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{clientModalTarget ? 'حفظ التعديلات' : 'حفظ الزبون وتثبيت الموعد'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
