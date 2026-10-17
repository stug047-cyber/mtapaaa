import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Appointment, AppointmentStatus, QueueStats, Branch } from '../types';
import { exportAppointmentsToExcel } from '../utils/excelExport';
import {
  Calendar,
  Clock,
  Plus,
  Search,
  Filter,
  Phone,
  MessageCircle,
  ShieldAlert,
  Coins,
  CheckCircle2,
  AlertCircle,
  Bell,
  MoreVertical,
  Edit2,
  Trash2,
  CreditCard,
  User,
  ArrowUpDown,
  Flame,
  Star,
  RefreshCw,
  ExternalLink,
  SlidersHorizontal,
  History,
  FileSpreadsheet,
  Building2,
  Download,
} from 'lucide-react';

export const AppointmentQueuePage: React.FC = () => {
  const {
    openAddAppointmentModal,
    openEditAppointmentModal,
    openScheduleAlertModal,
    openPaymentModal,
    openDeleteModal,
    showToast,
    dataRefreshKey,
    refreshData,
    currency,
    setActivePage,
    hasPermission,
  } = useApp();

  const { user: currentUser } = useAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Branches & branch filtering
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchFilter, setBranchFilter] = useState<string>('all');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('');

  // Dropdown menu state
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Load branches if user is admin or allowed to view other branches
  useEffect(() => {
    const canSeeOthers = currentUser?.role === 'admin' || currentUser?.canViewOtherBranches || currentUser?.canViewOtherBranchesOverride;
    if (canSeeOthers) {
      api
        .getBranches()
        .then((res) => setBranches(res.branches || []))
        .catch((err) => console.error('Failed to load branches:', err));
    }
  }, [currentUser]);

  // Fetch appointments
  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const res = await api.getAppointments({
        search,
        status: statusFilter,
        priority: priorityFilter,
        date: dateFilter,
        branchId: branchFilter,
      });
      setAppointments(res.appointments || []);
      setQueueStats(res.queueStats || null);
    } catch (err: any) {
      showToast(err.message || 'فشل تحميل طابور المواعيد', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [search, statusFilter, priorityFilter, dateFilter, branchFilter, dataRefreshKey]);

  // Export to Excel handler
  const handleExportExcel = () => {
    if (appointments.length === 0) {
      showToast('لا توجد أي مواعيد في القائمة الحالية لتصديرها', 'error');
      return;
    }
    const dateStr = new Date().toISOString().split('T')[0];
    const statusPart = statusFilter !== 'all' ? `_${statusFilter}` : '';
    const filename = `طابور_المواعيد_والتحصيل${statusPart}_${dateStr}.xlsx`;

    try {
      exportAppointmentsToExcel(appointments, currency, filename);
      showToast(`تم تصدير ${appointments.length} موعد إلى ملف إكسل (Excel) بنجاح`, 'success');
    } catch (err: any) {
      console.error('Export error:', err);
      showToast('حدث خطأ أثناء تصدير ملف الإكسل', 'error');
    }
  };

  // Status changer handler
  const handleStatusChange = async (appointmentId: string, newStatus: AppointmentStatus) => {
    try {
      await api.updateAppointmentStatus(appointmentId, { status: newStatus });
      showToast('تم تحديث حالة الموعد في الطابور', 'success');
      refreshData();
    } catch (err: any) {
      showToast(err.message || 'فشل تحديث الحالة', 'error');
    }
  };

  // WhatsApp quick trigger
  const openWhatsApp = (phone: string, text: string) => {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('07')) clean = '964' + clean.slice(1);
    else if (!clean.startsWith('964')) clean = '964' + clean;
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Status badge config
  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'today':
        return {
          label: 'حان موعده اليوم',
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          dot: 'bg-emerald-500',
        };
      case 'waiting':
        return {
          label: 'بانتظار الموعد',
          bg: 'bg-amber-100 text-amber-800 border-amber-300',
          dot: 'bg-amber-500',
        };
      case 'overdue':
        return {
          label: 'متأخر عن الموعد',
          bg: 'bg-rose-100 text-rose-800 border-rose-300',
          dot: 'bg-rose-500',
        };
      case 'paid':
        return {
          label: 'تم السداد بالكامل',
          bg: 'bg-teal-100 text-teal-800 border-teal-300',
          dot: 'bg-teal-500',
        };
      case 'partially_paid':
        return {
          label: 'مسدد جزئياً',
          bg: 'bg-blue-100 text-blue-800 border-blue-300',
          dot: 'bg-blue-500',
        };
      case 'postponed':
        return {
          label: 'تم تأجيل الموعد',
          bg: 'bg-orange-100 text-orange-800 border-orange-300',
          dot: 'bg-orange-500',
        };
      case 'referred_to_guarantor':
        return {
          label: 'محال إلى الكفيل',
          bg: 'bg-purple-100 text-purple-800 border-purple-300',
          dot: 'bg-purple-500',
        };
      case 'no_answer':
        return {
          label: 'لم يرد على الاتصال',
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          dot: 'bg-slate-400',
        };
      case 'phone_off':
        return {
          label: 'الهاتف مغلق',
          bg: 'bg-zinc-100 text-zinc-700 border-zinc-300',
          dot: 'bg-zinc-400',
        };
      case 'refused':
        return {
          label: 'ممتنع عن السداد',
          bg: 'bg-red-100 text-red-900 border-red-300',
          dot: 'bg-red-600',
        };
      default:
        return {
          label: 'في الطابور',
          bg: 'bg-slate-100 text-slate-800 border-slate-200',
          dot: 'bg-slate-400',
        };
    }
  };

  const getPriorityBadge = (priority: 'normal' | 'important' | 'urgent') => {
    if (priority === 'urgent') {
      return (
        <span className="inline-flex items-center space-x-1 space-x-reverse px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
          <Flame className="w-3 h-3 fill-rose-500 text-rose-500" />
          <span>عاجل</span>
        </span>
      );
    }
    if (priority === 'important') {
      return (
        <span className="inline-flex items-center space-x-1 space-x-reverse px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
          <span>مهم</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
        عادي
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">طابور المواعيد والتحصيل</h1>
              <p className="text-xs sm:text-sm text-slate-500">
                إدارة أصحاب المواعيد، الكفلاء، المبالغ المطلوبة وجدولة تنبيهات المتابعة
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Excel Export Button */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs sm:text-sm font-bold flex items-center space-x-1.5 space-x-reverse transition-all shadow-xs active:scale-95"
            title="تصدير كشف طابور المواعيد الحالي إلى ملف إكسل Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>تصدير إكسل ({appointments.length})</span>
          </button>

          <button
            onClick={() => setActivePage('alerts')}
            className="px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs sm:text-sm font-bold flex items-center space-x-1.5 space-x-reverse transition-colors shadow-xs"
          >
            <Bell className="w-4 h-4 text-indigo-600" />
            <span>التنبيهات المجدولة</span>
          </button>

          <button
            onClick={() => openAddAppointmentModal()}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center space-x-2 space-x-reverse"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة موعد جديد للطابور</span>
          </button>
        </div>
      </div>

      {/* Summary Stats Bar */}
      {queueStats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 block">إجمالي في الطابور</span>
            <span className="text-xl font-black text-slate-800">{queueStats.total}</span>
            <span className="text-[11px] text-slate-500 mr-1">موعد</span>
          </div>

          <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200 shadow-xs">
            <span className="text-[11px] font-semibold text-emerald-700 block">مواعيد اليوم</span>
            <span className="text-xl font-black text-emerald-800">{queueStats.todayCount}</span>
            <span className="text-[11px] text-emerald-600 mr-1">مستحق الآن</span>
          </div>

          <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200 shadow-xs">
            <span className="text-[11px] font-semibold text-amber-700 block">بانتظار الموعد</span>
            <span className="text-xl font-black text-amber-800">{queueStats.waitingCount}</span>
            <span className="text-[11px] text-amber-600 mr-1">قادم</span>
          </div>

          <div className="bg-rose-50/60 p-3.5 rounded-2xl border border-rose-200 shadow-xs">
            <span className="text-[11px] font-semibold text-rose-700 block">المتأخرة</span>
            <span className="text-xl font-black text-rose-800">{queueStats.overdueCount}</span>
            <span className="text-[11px] text-rose-600 mr-1">بحاجة اتصال</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 block">المبالغ المطلوبة</span>
            <span className="text-base font-black text-slate-800">
              {queueStats.totalRequired.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400 mr-1">{currency}</span>
          </div>

          <div className="bg-teal-50/60 p-3.5 rounded-2xl border border-teal-200 shadow-xs">
            <span className="text-[11px] font-semibold text-teal-700 block">المحصل / المسدد</span>
            <span className="text-base font-black text-teal-800">
              {queueStats.totalPaid.toLocaleString()}
            </span>
            <span className="text-[11px] text-teal-600 mr-1">{currency}</span>
          </div>
        </div>
      )}

      {/* Filter Tabs and Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-4">
        {/* Status Tabs */}
        <div className="flex items-center space-x-1.5 space-x-reverse overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
          {[
            { id: 'all', label: 'كل الطابور' },
            { id: 'today', label: 'مواعيد اليوم 🔥' },
            { id: 'waiting', label: 'بانتظار الموعد' },
            { id: 'overdue', label: 'المتأخرة 🚨' },
            { id: 'paid', label: 'المسددة بالكامل' },
            { id: 'referred_to_guarantor', label: 'المحالة للكفيل 🛡️' },
            { id: 'postponed', label: 'المؤجلة' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs font-black'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Extra Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
          {/* Search Box */}
          <div className={branches.length > 0 ? "sm:col-span-5 relative" : "sm:col-span-6 relative"}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم، رقم الهاتف، اسم الكفيل أو رقم هاتف الكفيل..."
              className="w-full pr-10 pl-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
          </div>

          {/* Branch filter if user has access to branches */}
          {branches.length > 0 && (
            <div className="sm:col-span-3">
              <div className="relative">
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="w-full pr-8 pl-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none font-medium text-slate-700"
                >
                  <option value="all">كافة الفروع ({branches.length})</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
                <Building2 className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Priority filter */}
          <div className={branches.length > 0 ? "sm:col-span-2" : "sm:col-span-3"}>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none font-medium text-slate-700"
            >
              <option value="all">كافة الأولويات</option>
              <option value="urgent">الأولوية: عاجل 🔥</option>
              <option value="important">الأولوية: مهم ⭐</option>
              <option value="normal">الأولوية: عادي</option>
            </select>
          </div>

          {/* Date filter */}
          <div className={branches.length > 0 ? "sm:col-span-2 relative" : "sm:col-span-3 relative"}>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pr-9 pl-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none text-slate-700"
            />
            <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="absolute left-3 top-2.5 text-xs text-rose-500 hover:text-rose-700 font-bold"
              >
                مسح
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Queue Items List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3 border border-slate-200">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
            <p className="text-sm font-semibold">جاري تحميل طابور المواعيد...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-500 space-y-4 border border-slate-200 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Calendar className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">لا توجد مواعيد تطابق البحث</h3>
              <p className="text-xs text-slate-500 mt-1">
                يمكنك إضافة موعد جديد إلى الطابور وتعيين الكفيل والمبلغ المطلوب وجدولة التنبيه
              </p>
            </div>
            <button
              onClick={() => openAddAppointmentModal()}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center space-x-2 space-x-reverse transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة أول موعد للطابور</span>
            </button>
          </div>
        ) : (
          appointments.map((apt) => {
            const statusConfig = getStatusBadge(apt.status);
            const remaining = Math.max(0, apt.requiredAmount - (apt.paidAmount || 0));
            const isCompleted = remaining === 0 || apt.status === 'paid';

            // Client WhatsApp Text
            const clientMsg = `السلام عليكم ورحمة الله، الأخ ${apt.clientName} المحترم.
نود تذكيركم بموعدكم القادم بتاريخ ${apt.appointmentDate} لدفع مبلغ (${remaining.toLocaleString()} ${currency}).
شاكرين التزامكم بالموعد.`;

            // Guarantor WhatsApp Text
            const guarantorMsg = `السلام عليكم ورحمة الله، الأخ الكفيل ${apt.guarantorName} المحترم.
نود إشعاركم بأن مكفولكم السيد (${apt.clientName}) لديه موعد تسديد بتاريخ ${apt.appointmentDate} بمبلغ (${remaining.toLocaleString()} ${currency}).
يرجى المتابعة معه لضمان السداد في الوقت المحدد.`;

            return (
              <div
                key={apt.id}
                className={`bg-white rounded-2xl border transition-all hover:shadow-md overflow-hidden ${
                  apt.status === 'today'
                    ? 'border-emerald-300 ring-1 ring-emerald-200'
                    : apt.status === 'overdue'
                    ? 'border-rose-300'
                    : 'border-slate-200'
                }`}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left Info: Queue number, Client & Guarantor */}
                    <div className="flex items-start space-x-3.5 space-x-reverse">
                      {/* Queue Number Badge */}
                      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white shrink-0 shadow-xs">
                        <span className="text-[10px] font-semibold text-slate-300 leading-none">الدور</span>
                        <span className="text-lg font-black leading-none mt-0.5">#{apt.queueNumber}</span>
                      </div>

                      {/* Client & Guarantor Info */}
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">{apt.clientName}</h3>
                          {getPriorityBadge(apt.priority)}

                          {/* Branch badge */}
                          {apt.branchName && (
                            <span className="inline-flex items-center space-x-1 space-x-reverse px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              <Building2 className="w-3 h-3 text-slate-500" />
                              <span>{apt.branchName}</span>
                            </span>
                          )}

                          {/* Status Badge */}
                          <div className="relative inline-block">
                            <span
                              className={`inline-flex items-center space-x-1.5 space-x-reverse px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusConfig.bg}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                              <span>{statusConfig.label}</span>
                            </span>
                          </div>

                          {/* Postponement count badge if any */}
                          {apt.postponementHistory && apt.postponementHistory.length > 0 && (
                            <button
                              type="button"
                              onClick={() => openScheduleAlertModal(apt)}
                              className="inline-flex items-center space-x-1 space-x-reverse px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300 hover:bg-purple-200 transition-colors"
                              title="عرض تفاصيل المواعيد السابقة والتأجيلات"
                            >
                              <History className="w-3.5 h-3.5 text-purple-700" />
                              <span>تم التأجيل ({apt.postponementHistory.length})</span>
                            </button>
                          )}
                        </div>

                        {/* Client Phone & Quick Contact */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                          <div className="flex items-center space-x-1.5 space-x-reverse font-mono">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span dir="ltr">{apt.clientPhone}</span>
                          </div>

                          <div className="flex items-center space-x-2 space-x-reverse">
                            <a
                              href={`tel:${apt.clientPhone}`}
                              className="text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center space-x-1 space-x-reverse bg-emerald-50 px-2 py-0.5 rounded-md"
                            >
                              <Phone className="w-3 h-3" />
                              <span>اتصال</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => openWhatsApp(apt.clientPhone, clientMsg)}
                              className="text-teal-700 hover:text-teal-800 font-semibold inline-flex items-center space-x-1 space-x-reverse bg-teal-50 px-2 py-0.5 rounded-md"
                            >
                              <MessageCircle className="w-3 h-3" />
                              <span>واتساب</span>
                            </button>
                          </div>
                        </div>

                        {/* Guarantor Info Block */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs bg-amber-50/80 border border-amber-200/70 px-2.5 py-1.5 rounded-xl">
                          <span className="font-bold text-amber-900 flex items-center space-x-1 space-x-reverse">
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                            <span>الكفيل:</span>
                          </span>
                          <span className="font-semibold text-slate-800">{apt.guarantorName}</span>
                          <span className="text-slate-400">|</span>
                          <span dir="ltr" className="font-mono text-slate-700">{apt.guarantorPhone}</span>

                          <div className="flex items-center space-x-1.5 space-x-reverse mr-auto">
                            <a
                              href={`tel:${apt.guarantorPhone}`}
                              className="text-amber-800 hover:bg-amber-100 p-1 rounded transition-colors"
                              title="اتصال بالكفيل"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => openWhatsApp(apt.guarantorPhone, guarantorMsg)}
                              className="text-amber-800 hover:bg-amber-100 p-1 rounded transition-colors"
                              title="واتساب الكفيل"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {apt.notes && (
                          <p className="text-xs text-slate-500 italic mt-0.5">
                            ملاحظة: {apt.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Middle: Financials & Date */}
                    <div className="flex flex-wrap items-center gap-4 lg:gap-6 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                      {/* Financial amounts */}
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-semibold text-slate-400 block">المبلغ المطلوب</span>
                        <div className="text-base font-black text-slate-900">
                          {apt.requiredAmount.toLocaleString()} <span className="text-xs text-slate-500 font-bold">{currency}</span>
                        </div>
                        {apt.paidAmount > 0 && (
                          <div className="text-xs text-teal-700 font-bold">
                            مدفوع: {apt.paidAmount.toLocaleString()} | متبقي: {remaining.toLocaleString()}
                          </div>
                        )}
                      </div>

                      {/* Date & Time */}
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-semibold text-slate-400 block">موعد الحضور / الدفع</span>
                        <div className="flex items-center space-x-1.5 space-x-reverse text-xs font-bold text-slate-800">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{apt.appointmentDate}</span>
                          {apt.appointmentTime && (
                            <>
                              <Clock className="w-3 h-3 text-slate-400 mr-1" />
                              <span dir="ltr">{apt.appointmentTime}</span>
                            </>
                          )}
                        </div>

                        {/* Scheduled Alert Indicator */}
                        {apt.scheduledAlert && (
                          <div
                            onClick={() => openScheduleAlertModal(apt)}
                            className="cursor-pointer inline-flex items-center space-x-1 space-x-reverse text-[11px] text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-200 font-medium transition-colors"
                          >
                            <Bell className="w-3 h-3 text-indigo-600 animate-pulse" />
                            <span>
                              {apt.scheduledAlert.isTriggered ? 'تم إطلاق التنبيه' : 'تنبيه مجدول'}
                            </span>
                          </div>
                        )}

                        {/* Previous Appointments & Reschedule History if exists */}
                        {apt.postponementHistory && apt.postponementHistory.length > 0 && (
                          <div
                            onClick={() => openScheduleAlertModal(apt)}
                            className="cursor-pointer bg-amber-50 hover:bg-amber-100/80 p-2 rounded-xl border border-amber-200/90 text-right space-y-1 transition-colors mt-1"
                            title="انقر لعرض المواعيد السابقة وتغيير الحالة وجدولة التنبيه"
                          >
                            <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
                              <span className="flex items-center space-x-1 space-x-reverse">
                                <History className="w-3 h-3 text-amber-600" />
                                <span>المواعيد السابقة:</span>
                              </span>
                              <span className="bg-amber-200/80 px-1.5 py-0.2 rounded text-[10px]">
                                تم التأجيل {apt.postponementHistory.length} مرات
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1 font-mono text-[11px] text-slate-700" dir="ltr">
                              <span className="line-through text-slate-400">
                                {apt.originalAppointmentDate || apt.postponementHistory[0].previousDate}
                              </span>
                              {apt.postponementHistory.length > 1 && (
                                <span className="text-slate-400">➔ ...</span>
                              )}
                              <span className="text-amber-600 font-bold">➔</span>
                              <span className="font-bold text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-amber-200">
                                {apt.appointmentDate}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap items-center gap-2 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                      {/* Merged Change Status & Schedule Alert Button */}
                      <button
                        type="button"
                        onClick={() => openScheduleAlertModal(apt)}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs flex items-center space-x-1.5 space-x-reverse transition-all shadow-xs hover:shadow-md active:scale-95"
                        title="تغيير حالة الموعد مع جدولة التنبيه وعرض المواعيد السابقة"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <Bell className="w-3.5 h-3.5 text-indigo-200" />
                        <span>تغيير حالة الموعد وجدولة التنبيه</span>
                      </button>

                      {/* Quick Status Dropdown */}
                      <select
                        value={apt.status}
                        onChange={(e) => {
                          const newSt = e.target.value as AppointmentStatus;
                          if (newSt === 'postponed') {
                            openScheduleAlertModal(apt);
                          } else {
                            handleStatusChange(apt.id, newSt);
                          }
                        }}
                        className="px-2 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        title="تغيير الحالة السريع"
                      >
                        <option value="waiting">بانتظار الموعد</option>
                        <option value="today">حان موعده اليوم</option>
                        <option value="postponed">تم تأجيل الموعد (تاريخ جديد)</option>
                        <option value="paid">تم السداد بالكامل</option>
                        <option value="partially_paid">مسدد جزئياً</option>
                        <option value="referred_to_guarantor">محال إلى الكفيل</option>
                        <option value="overdue">متأخر عن الموعد</option>
                        <option value="no_answer">لم يرد على الاتصال</option>
                        <option value="phone_off">الهاتف مغلق</option>
                        <option value="refused">ممتنع عن السداد</option>
                      </select>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => openEditAppointmentModal(apt)}
                        className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                        title="تعديل الموعد"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() =>
                          openDeleteModal(
                            'حذف موعد من الطابور',
                            `هل أنت متأكد من حذف موعد الزبون (${apt.clientName}) رقم #${apt.queueNumber}؟`,
                            async () => {
                              await api.deleteAppointment(apt.id);
                              showToast('تم حذف الموعد من الطابور بنجاح', 'success');
                            }
                          )
                        }
                        className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
