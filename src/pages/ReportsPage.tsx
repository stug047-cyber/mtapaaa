import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api, formatCurrency, formatDateArabic, exportToCSV } from '../services/api';
import { Installment, Payment, ReportSummary } from '../types';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Filter,
  Wallet,
  CheckCircle2,
  CreditCard,
  TrendingUp,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { dataRefreshKey, currency, businessName } = useApp();

  const [installments, setInstallments] = useState<Installment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api
      .getReports({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: statusFilter,
      })
      .then((res) => {
        if (isMounted) {
          setInstallments(res.installments);
          setPayments(res.payments);
          setSummary(res.summary);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching reports:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [startDate, endDate, statusFilter, dataRefreshKey]);

  // Export to Excel
  const handleExportExcel = () => {
    if (!installments.length) return;

    const headers = [
      'اسم صاحب الموعد',
      'رقم الهاتف',
      'اسم الكفيل',
      'رقم هاتف الكفيل',
      'المبلغ المطلوب',
      'المبلغ المسدد',
      'المبلغ المتبقي',
      'تاريخ الموعد',
      'الحالة',
      'ملاحظات',
    ];

    const statusTranslations: Record<string, string> = {
      paid: 'مدفوع بالكامل',
      partially_paid: 'مدفوع جزئياً',
      unpaid: 'غير مدفوع',
      overdue: 'متأخر',
      waiting: 'بانتظار الموعد',
      today: 'موعد اليوم',
      postponed: 'تم التأجيل',
      referred_to_guarantor: 'محال للكفيل',
    };

    const rows = installments.map((i) => [
      i.clientName,
      i.clientPhone,
      i.guarantorName || '',
      i.guarantorPhone || '',
      i.amount,
      i.paidAmount || 0,
      Math.max(0, i.amount - (i.paidAmount || 0)),
      i.dueDate,
      statusTranslations[i.status] || i.status,
      i.notes || '',
    ]);

    const dateStr = new Date().toISOString().split('T')[0];
    exportToCSV(`تقرير_المواعيد_والتحصيل_${dateStr}`, headers, rows);
  };

  const handlePrint = () => {
    window.print();
  };

  const statusOptions = [
    { id: 'all', label: 'كافة الحالات' },
    { id: 'paid', label: 'الأقساط المسددة' },
    { id: 'unpaid', label: 'غير مسددة' },
    { id: 'overdue', label: 'المتأخرة فقط' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Printable Report Header (Visible only when printing) */}
      <div className="hidden print:block text-center pb-6 border-b border-slate-300">
        <h1 className="text-2xl font-bold text-slate-900">{businessName || 'نظام متابعة الأقساط'}</h1>
        <h2 className="text-lg font-semibold text-slate-700 mt-1">تقرير كشف الحسابات والأقساط المالية</h2>
        <p className="text-xs text-slate-500 mt-1">
          تاريخ استخراج التقرير: {new Intl.DateTimeFormat('ar-SA', { dateStyle: 'full' }).format(new Date())}
        </p>
      </div>

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            التقارير المالية والحسابات
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ملخص التحصيل، كشف الأقساط حسب التواريخ، وتصدير التقارير إلى Excel والطباعة
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export to Excel */}
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs active:scale-95 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>تصدير Excel</span>
          </button>

          {/* Print / PDF */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs active:scale-95 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة / حفظ PDF</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs print:hidden space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <Filter className="w-4 h-4 text-emerald-600" />
              <span>تصفية التقرير:</span>
            </div>

            {/* Date range */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">من:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">إلى:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800"
              />
            </div>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-xs text-slate-700"
            >
              {statusOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {(startDate || endDate || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setStatusFilter('all');
              }}
              className="text-xs font-semibold text-rose-600 hover:underline"
            >
              إعادة ضبط الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* Financial Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Due */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 block">إجمالي المستحق بالتقرير</span>
            <span className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 block">
              {formatCurrency(summary.totalDue, currency)}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {summary.totalCount} قسط مسجل
            </span>
          </div>

          {/* Total Paid */}
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 shadow-xs">
            <span className="text-xs font-semibold text-emerald-700 block">إجمالي المحصل (المدفوع)</span>
            <span className="text-xl sm:text-2xl font-bold text-emerald-800 mt-1 block">
              {formatCurrency(summary.totalPaid, currency)}
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
              {summary.paidCount} قسط مسدد
            </span>
          </div>

          {/* Remaining */}
          <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/60 border border-rose-200/80 shadow-xs">
            <span className="text-xs font-semibold text-rose-700 block">المبالغ المتبقية</span>
            <span className="text-xl sm:text-2xl font-bold text-rose-800 mt-1 block">
              {formatCurrency(summary.totalRemaining, currency)}
            </span>
            <span className="text-[11px] text-rose-600 font-semibold mt-1 block">
              {summary.unpaidCount + summary.overdueCount} قسط متبقي
            </span>
          </div>

          {/* Collection Rate */}
          <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/60 border border-blue-200/80 shadow-xs">
            <span className="text-xs font-semibold text-blue-700 block">نسبة التحصيل</span>
            <span className="text-xl sm:text-2xl font-bold text-blue-800 mt-1 block">
              {summary.collectionRate}%
            </span>
            <div className="w-full bg-blue-200/60 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full"
                style={{ width: `${Math.min(100, summary.collectionRate)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Detailed Installments Table for the report */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 sm:px-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm sm:text-base">
            تفاصيل الأقساط المدرجة في التقرير ({installments.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            <span>جاري إعداد التقرير...</span>
          </div>
        ) : installments.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-slate-50">
            لا توجد بيانات متاحة لهذا النطاق المحدد
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-3 px-4">صاحب الموعد</th>
                  <th className="py-3 px-4">رقم الهاتف</th>
                  <th className="py-3 px-4">المبلغ المستحق</th>
                  <th className="py-3 px-4">المبلغ المسدد</th>
                  <th className="py-3 px-4">المتبقي</th>
                  <th className="py-3 px-4">تاريخ الاستحقاق</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {installments.map((inst) => {
                  const remaining = Math.max(0, inst.amount - (inst.paidAmount || 0));
                  return (
                    <tr key={inst.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-bold text-slate-900">{inst.clientName}</td>
                      <td className="py-3 px-4 font-medium text-slate-600" dir="ltr">{inst.clientPhone}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{formatCurrency(inst.amount, currency)}</td>
                      <td className="py-3 px-4 font-bold text-emerald-700">{formatCurrency(inst.paidAmount || 0, currency)}</td>
                      <td className="py-3 px-4 font-bold text-rose-600">{formatCurrency(remaining, currency)}</td>
                      <td className="py-3 px-4">{formatDateArabic(inst.dueDate)}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                            inst.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inst.status === 'overdue'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {inst.status === 'paid'
                            ? 'مدفوع'
                            : inst.status === 'overdue'
                            ? 'متأخر'
                            : 'غير مدفوع'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 max-w-xs truncate">{inst.notes || '—'}</td>
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
