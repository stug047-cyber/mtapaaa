import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api, formatCurrency, formatDateArabic } from '../services/api';
import { Installment } from '../types';
import {
  CalendarClock,
  Search,
  PlusCircle,
  Calendar,
  Wallet,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  MessageCircle,
  Phone,
  Filter,
  Loader2,
} from 'lucide-react';

export const InstallmentsPage: React.FC = () => {
  const {
    openAddInstallmentModal,
    openEditInstallmentModal,
    openPaymentModal,
    openClientDetail,
    openDeleteModal,
    dataRefreshKey,
    showToast,
    currency,
  } = useApp();

  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api
      .getInstallments({
        search: searchTerm,
        status: statusFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      })
      .then((res) => {
        if (isMounted) {
          setInstallments(res.installments);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error loading installments:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [searchTerm, statusFilter, startDate, endDate, dataRefreshKey]);

  const handleDeleteInstallment = (inst: Installment) => {
    openDeleteModal(
      'تأكيد حذف القسط',
      `هل أنت متأكد من حذف القسط بمبلغ ${inst.amount.toLocaleString()} ${currency} لصاحب الموعد (${inst.clientName})؟ لا يمكن التراجع عن هذا الإجراء وسيتم حذف سجلات السداد المرتبطة به.`,
      async () => {
        await api.deleteInstallment(inst.id);
        showToast('تم حذف القسط بنجاح', 'success');
      }
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            جدول الأقساط ومواعيد الدفع
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            متابعة دقيقة لكل قسط، تواريخ استحقاقه، المبالغ المسددة، وتسجيل الدفعات
          </p>
        </div>

        <button
          onClick={() => openAddInstallmentModal()}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>إضافة قسط جديد</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-3">
        {/* Top line: Search & Quick Status Tabs */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث باسم صاحب الموعد أو رقم هاتفه أو الملاحظات..."
              className="w-full pr-10 pl-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'due_today', label: 'مستحق اليوم' },
              { id: 'overdue', label: 'متأخر' },
              { id: 'unpaid', label: 'غير مدفوع' },
              { id: 'partially_paid', label: 'مدفوع جزئياً' },
              { id: 'paid', label: 'مدفوع بالكامل' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Range Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
            <Filter className="w-3.5 h-3.5 text-emerald-600" />
            <span>نطاق تاريخ الاستحقاق:</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-slate-500">من:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-800"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-slate-500">إلى:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-800"
            />
          </div>

          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs font-semibold text-rose-600 hover:underline mr-auto"
            >
              إلغاء تصفية التاريخ
            </button>
          )}
        </div>
      </div>

      {/* Installments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            <span>جاري تحميل بيانات الأقساط...</span>
          </div>
        ) : installments.length === 0 ? (
          <div className="p-12 text-center bg-slate-50">
            <CalendarClock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-700 text-base">لا توجد أقساط مطابقة</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              لم يتم العثور على أي أقساط وفق الفلتر المحدد. يمكنك إضافة قسط جديد أو تغيير معايير البحث.
            </p>
            <button
              onClick={() => openAddInstallmentModal()}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <PlusCircle className="w-4 h-4" />
              <span>إضافة قسط جديد</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">صاحب الموعد</th>
                  <th className="py-3.5 px-4">رقم الهاتف</th>
                  <th className="py-3.5 px-4">مبلغ القسط</th>
                  <th className="py-3.5 px-4">المسدد</th>
                  <th className="py-3.5 px-4">المتبقي</th>
                  <th className="py-3.5 px-4">تاريخ الاستحقاق</th>
                  <th className="py-3.5 px-4">الحالة</th>
                  <th className="py-3.5 px-4">ملاحظات</th>
                  <th className="py-3.5 px-4 sm:px-6 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {installments.map((inst) => {
                  const remaining = Math.max(0, inst.amount - (inst.paidAmount || 0));
                  const isPaid = inst.status === 'paid' || remaining === 0;
                  const isOverdue = inst.status === 'overdue';
                  const isToday = inst.dueDate === todayStr;

                  const cleanPhone = inst.clientPhone.replace(/\D/g, '');
                  const waPhone = cleanPhone.startsWith('0') ? '966' + cleanPhone.substring(1) : cleanPhone;
                  const waMsg = encodeURIComponent(
                    `السلام عليكم ورحمة الله، تذكير بموعد استحقاق قسطكم بمبلغ ${remaining.toLocaleString()} ${currency} بتاريخ ${inst.dueDate}.`
                  );

                  return (
                    <tr
                      key={inst.id}
                      className={`hover:bg-slate-50/70 transition-colors group ${
                        isOverdue ? 'bg-rose-50/20' : isToday ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Client Name */}
                      <td className="py-4 px-4 sm:px-6">
                        <button
                          onClick={() => openClientDetail(inst.clientId)}
                          className="font-bold text-slate-900 hover:text-emerald-700 transition-colors text-right block group-hover:underline"
                        >
                          {inst.clientName}
                        </button>
                      </td>

                      {/* Phone with WhatsApp shortcut */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-700" dir="ltr">
                            {inst.clientPhone}
                          </span>
                          <a
                            href={`https://wa.me/${waPhone}?text=${waMsg}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                            title="إرسال تذكير واتساب"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-4 font-bold text-slate-900">
                        {formatCurrency(inst.amount, currency)}
                      </td>

                      {/* Paid Amount */}
                      <td className="py-4 px-4 font-bold text-emerald-700">
                        {formatCurrency(inst.paidAmount || 0, currency)}
                      </td>

                      {/* Remaining Amount */}
                      <td className="py-4 px-4 font-bold text-rose-600">
                        {formatCurrency(remaining, currency)}
                      </td>

                      {/* Due Date */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{formatDateArabic(inst.dueDate)}</span>
                        </div>
                        {isToday && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md mt-1 inline-block">
                            مستحق اليوم!
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : isOverdue
                              ? 'bg-rose-100 text-rose-800 animate-pulse'
                              : inst.status === 'partially_paid'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isPaid ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>مدفوع</span>
                            </>
                          ) : isOverdue ? (
                            <>
                              <AlertCircle className="w-3 h-3" />
                              <span>متأخر</span>
                            </>
                          ) : inst.status === 'partially_paid' ? (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>سداد جزئي</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>مستحق</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Notes */}
                      <td className="py-4 px-4 max-w-xs truncate text-xs text-slate-500">
                        {inst.notes || '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Pay Button */}
                          {!isPaid && (
                            <button
                              onClick={() => openPaymentModal(inst)}
                              title="تسجيل دفعة لهذا القسط"
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1 active:scale-95"
                            >
                              <Wallet className="w-3 h-3" />
                              <span>سداد</span>
                            </button>
                          )}

                          {/* Edit Button */}
                          <button
                            onClick={() => openEditInstallmentModal(inst)}
                            title="تعديل القسط"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteInstallment(inst)}
                            title="حذف القسط"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
