import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { AppSettings, User, Branch } from '../types';
import { EmployeeModal } from '../components/EmployeeModal';
import { exportBranchesToExcel, exportStaffToExcel } from '../utils/excelExport';
import {
  Settings,
  Building,
  Building2,
  DollarSign,
  Bell,
  Clock,
  Shield,
  Save,
  CheckCircle2,
  RefreshCw,
  Loader2,
  UserPlus,
  Users,
  Trash2,
  ShieldCheck,
  Calendar,
  Edit,
  Sliders,
  Plus,
  Eye,
  EyeOff,
  Phone,
  MapPin,
  AlertCircle,
  FileSpreadsheet,
  Check,
  X,
  Info,
  Database,
  Download,
  Copy,
  FileCode,
  HardDrive,
  CheckCheck,
  Server,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { refreshData, showToast, openDeleteModal } = useApp();
  const { user: currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'branches' | 'staff' | 'database' | 'general'>('branches');

  const [settings, setSettings] = useState<AppSettings>({
    businessName: '',
    currency: 'د.ع',
    notifyDaysBefore: [1, 3, 7],
    autoCheckIntervalMinutes: 10,
    defaultBranchId: '',
  });

  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Database migration and tables states
  const [dbOverview, setDbOverview] = useState<{
    tables: { name: string; arabicName: string; count: number; description: string }[];
    totalTables: number;
    totalRecords: number;
  } | null>(null);
  const [downloadingSql, setDownloadingSql] = useState(false);
  const [downloadingDump, setDownloadingDump] = useState(false);
  const [downloadingJson, setDownloadingJson] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Employee modal states
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [targetEmployee, setTargetEmployee] = useState<User | null>(null);

  // Branch modal states
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [targetBranch, setTargetBranch] = useState<Branch | null>(null);
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('');
  const [branchManagerName, setBranchManagerName] = useState('');
  const [branchCanViewOtherBranches, setBranchCanViewOtherBranches] = useState(false);
  const [branchNotes, setBranchNotes] = useState('');
  const [branchSaving, setBranchSaving] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  // Load all settings, branches, users, and database overview
  const loadData = async () => {
    setLoading(true);
    try {
      const promises: Promise<any>[] = [api.getSettings(), api.getBranches(), api.getDatabaseOverview()];
      if (isAdmin) {
        promises.push(api.getUsers());
      }

      const results = await Promise.all(promises);
      const settingsRes = results[0];
      const branchesRes = results[1];
      const dbRes = results[2];
      const usersRes = isAdmin ? results[3] : null;

      setSettings(settingsRes.settings);
      setBranches(branchesRes.branches || []);
      if (dbRes) {
        setDbOverview(dbRes);
      }
      if (usersRes) {
        setUsers(usersRes.users || []);
      }
    } catch (err) {
      console.error('Error fetching settings, branches, or users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAdmin]);

  // Handle open branch modal
  const handleOpenBranchModal = (branch?: Branch) => {
    if (branch) {
      setTargetBranch(branch);
      setBranchName(branch.name);
      setBranchCode(branch.code);
      setBranchAddress(branch.address || '');
      setBranchPhone(branch.phone || '');
      setBranchManagerName(branch.managerName || '');
      setBranchCanViewOtherBranches(!!branch.canViewOtherBranches);
      setBranchNotes(branch.notes || '');
    } else {
      setTargetBranch(null);
      setBranchName('');
      setBranchCode(`BR-${Math.floor(100 + Math.random() * 900)}`);
      setBranchAddress('');
      setBranchPhone('');
      setBranchManagerName('');
      setBranchCanViewOtherBranches(false);
      setBranchNotes('');
    }
    setBranchError(null);
    setIsBranchModalOpen(true);
  };

  // Save branch
  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) {
      setBranchError('يرجى كتابة اسم الفرع');
      return;
    }

    setBranchSaving(true);
    setBranchError(null);

    try {
      if (targetBranch) {
        const res = await api.updateBranch(targetBranch.id, {
          name: branchName.trim(),
          code: branchCode.trim(),
          address: branchAddress.trim(),
          phone: branchPhone.trim(),
          managerName: branchManagerName.trim(),
          canViewOtherBranches: branchCanViewOtherBranches,
          notes: branchNotes.trim(),
        });
        showToast(res.message, 'success');
      } else {
        const res = await api.createBranch({
          name: branchName.trim(),
          code: branchCode.trim(),
          address: branchAddress.trim(),
          phone: branchPhone.trim(),
          managerName: branchManagerName.trim(),
          canViewOtherBranches: branchCanViewOtherBranches,
          notes: branchNotes.trim(),
        });
        showToast(res.message, 'success');
      }

      setIsBranchModalOpen(false);
      await loadData();
      refreshData();
    } catch (err: any) {
      setBranchError(err.message || 'فشل حفظ بيانات الفرع');
    } finally {
      setBranchSaving(false);
    }
  };

  // Quick toggle branch visibility permission (Main Admin command)
  const handleToggleBranchVisibility = async (branch: Branch) => {
    try {
      const res = await api.toggleBranchVisibility(branch.id);
      showToast(res.message, 'success', 'إدارة صلاحيات الفروع');
      await loadData();
      refreshData();
    } catch (err: any) {
      showToast(err.message || 'فشل تغيير صلاحية رؤية الفروع', 'error');
    }
  };

  // Delete branch
  const handleDeleteBranch = (branch: Branch) => {
    if (branches.length <= 1) {
      showToast('لا يمكن حذف الفرع الوحيد في النظام', 'error');
      return;
    }

    openDeleteModal(
      'تأكيد حذف الفرع',
      `هل أنت متأكد من حذف (${branch.name})؟ سيتم تحويل الموظفين والمواعيد والزبائن المرتبطين به إلى الفرع البديل تلقائياً.`,
      async () => {
        try {
          const res = await api.deleteBranch(branch.id);
          showToast(res.message, 'success');
          await loadData();
          refreshData();
        } catch (err: any) {
          showToast(err.message || 'فشل حذف الفرع', 'error');
        }
      }
    );
  };

  // Toggle user active status
  const handleToggleUserStatus = async (userItem: User) => {
    if (userItem.id === currentUser?.id) {
      showToast('لا يمكنك تعطيل حسابك الحالي الذي تستخدمه', 'error');
      return;
    }

    const newStatus = userItem.isActive === false ? true : false;
    try {
      await api.updateUser(userItem.id, { isActive: newStatus });
      showToast(
        newStatus
          ? `تم تفعيل حساب الموظف (${userItem.name}) بنجاح`
          : `تم تعطيل حساب الموظف (${userItem.name})`,
        'success'
      );
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'فشل تحديث حالة الحساب', 'error');
    }
  };

  // Delete user
  const handleDeleteUser = (userItem: User) => {
    if (userItem.id === currentUser?.id) {
      showToast('لا يمكنك حذف حسابك الحالي', 'error');
      return;
    }

    openDeleteModal(
      'تأكيد حذف الموظف',
      `هل أنت متأكد من رغبتك في حذف حساب الموظف (${userItem.name})؟ لن يتمكن من تسجيل الدخول للنظام بعد الحذف.`,
      async () => {
        try {
          await api.deleteUser(userItem.id);
          showToast('تم حذف حساب الموظف بنجاح', 'success');
          await loadData();
        } catch (err: any) {
          showToast(err.message || 'فشل حذف الموظف', 'error');
        }
      }
    );
  };

  // General settings handlers
  const handleToggleDay = (day: number) => {
    const list = settings.notifyDaysBefore || [];
    let updated: number[];
    if (list.includes(day)) {
      if (list.length === 1) {
        showToast('يجب اختيار خيار تنبيه واحد على الأقل', 'error');
        return;
      }
      updated = list.filter((d) => d !== day);
    } else {
      updated = [...list, day].sort((a, b) => a - b);
    }
    setSettings((prev) => ({ ...prev, notifyDaysBefore: updated }));
  };

  const handleSaveGeneralSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updateSettings(settings);
      setSettings(res.settings);
      showToast('تم حفظ إعدادات النظام بنجاح', 'success');
      refreshData();
    } catch (err: any) {
      showToast(err.message || 'فشل حفظ الإعدادات', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerCron = async () => {
    setIsSyncing(true);
    try {
      const res = await api.runCronCheck();
      showToast(res.message, 'success', 'فحص الخادم');
      refreshData();
    } catch (err: any) {
      showToast(err.message || 'فشل فحص الخادم', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Database migration and export handlers
  const handleDownloadSchemaSql = async () => {
    setDownloadingSql(true);
    try {
      await api.downloadSchemaSql();
      showToast('تم تحميل ملف مخطط الجداول database_schema.sql بنجاح', 'success');
    } catch (err: any) {
      showToast(err.message || 'فشل تحميل ملف المخطط', 'error');
    } finally {
      setDownloadingSql(false);
    }
  };

  const handleDownloadExportSql = async () => {
    setDownloadingDump(true);
    try {
      await api.downloadExportSql();
      showToast('تم تفريغ وتحميل قاعدة البيانات بالكامل (SQL Dump) بنجاح', 'success');
    } catch (err: any) {
      showToast(err.message || 'فشل تفريغ قاعدة البيانات', 'error');
    } finally {
      setDownloadingDump(false);
    }
  };

  const handleDownloadBackupJson = async () => {
    setDownloadingJson(true);
    try {
      await api.downloadBackupJson();
      showToast('تم تحميل النسخة الاحتياطية JSON بنجاح', 'success');
    } catch (err: any) {
      showToast(err.message || 'فشل تحميل النسخة الاحتياطية', 'error');
    } finally {
      setDownloadingJson(false);
    }
  };

  const handleCopySchemaSql = async () => {
    try {
      const token = localStorage.getItem('aqsat_auth_token');
      const res = await fetch('/api/database/schema-sql', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('فشل جلب ملف المخطط');
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopiedSql(true);
      showToast('تم نسخ استعلامات إنشاء الجداول SQL إلى الحافظة بنجاح', 'success');
      setTimeout(() => setCopiedSql(false), 3000);
    } catch (err: any) {
      showToast(err.message || 'فشل نسخ الاستعلامات', 'error');
    }
  };

  // Summary counts
  const openBranchesCount = branches.filter((b) => b.canViewOtherBranches).length;
  const isolatedBranchesCount = branches.filter((b) => !b.canViewOtherBranches).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">
                لوحة الإعدادات وإدارة الفروع وقواعد البيانات
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                إدارة شبكة الفروع، حسابات الموظفين، ترحيل وتصدير جداول قواعد البيانات، وإعدادات النظام
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center space-x-2 space-x-reverse border-b border-slate-200 overflow-x-auto pb-0.5">
        <button
          onClick={() => setActiveTab('branches')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center space-x-2 space-x-reverse transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'branches'
              ? 'border-emerald-600 text-emerald-700 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>إدارة الفروع وصلاحيات الرؤية</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
            {branches.length}
          </span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('staff')}
            className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center space-x-2 space-x-reverse transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'staff'
                ? 'border-emerald-600 text-emerald-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>حسابات الموظفين والمحصلين</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700">
              {users.length}
            </span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('database')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center space-x-2 space-x-reverse transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'database'
              ? 'border-emerald-600 text-emerald-700 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>جداول قواعد البيانات ونقل الجداول</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-100 text-indigo-800 font-bold">
            11 جدولاً
          </span>
        </button>

        <button
          onClick={() => setActiveTab('general')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center space-x-2 space-x-reverse transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'general'
              ? 'border-emerald-600 text-emerald-700 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>الإعدادات العامة والتنبيهات</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
          <span>جاري تحميل بيانات النظام...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ================= TAB 1: BRANCHES MANAGEMENT ================= */}
          {activeTab === 'branches' && (
            <div className="space-y-6">
              {/* Stats Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">إجمالي الفروع المسجلة</span>
                    <Building2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-1">{branches.length}</div>
                  <span className="text-[11px] text-slate-400">فرع معتمد في المنظومة</span>
                </div>

                <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-700">فروع بصلاحية رؤية الكل</span>
                    <Eye className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-900 mt-1">{openBranchesCount}</div>
                  <span className="text-[11px] text-emerald-600">يمكن لموظفيها الاطلاع على كافة الفروع</span>
                </div>

                <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-700">فروع مقيدة ومستقلة</span>
                    <EyeOff className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl font-black text-amber-900 mt-1">{isolatedBranchesCount}</div>
                  <span className="text-[11px] text-amber-600">ترى فقط المواعيد والزبائن التابعين لفرعها</span>
                </div>
              </div>

              {/* Central Admin Info Banner */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 flex items-start space-x-3 space-x-reverse">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900 leading-relaxed">
                  <span className="font-bold block mb-0.5">
                    تحكم مدير النظام الرئيسي برؤية الفروع (Cross-Branch Visibility):
                  </span>
                  يمكنك كمدير رئيسي تحديد ما إذا كان كل فرع يحق له رؤية مواعيد وزبائن وأقساط الفروع الأخرى،
                  أو تقييده ليرى فقط بيانات فرعه الخاص. استخدم مفتاح التبديل المباشر أمام كل فرع لتعديل الصلاحية فوراً.
                </div>
              </div>

              {/* Branches Table Container */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">قائمة الفروع وصلاحياتها</h3>
                      <p className="text-xs text-slate-500">
                        تعديل كود الفرع، مديره، وإمكانية الاطلاع على بيانات الفروع الأخرى
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => exportBranchesToExcel(branches)}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors shadow-xs active:scale-95"
                      title="تصدير بيانات الفروع إلى ملف إكسل"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>تصدير إكسل ({branches.length})</span>
                    </button>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleOpenBranchModal()}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xs active:scale-95 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        <span>إضافة فرع جديد</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-right border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="py-3 px-4">اسم الفرع والكود</th>
                        <th className="py-3 px-4">مدير الفرع والهاتف</th>
                        <th className="py-3 px-4 text-center">الموظفين والمواعيد</th>
                        <th className="py-3 px-4 text-center">
                          رؤية الفروع الأخرى (بأمر المدير)
                        </th>
                        <th className="py-3 px-4 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {branches.map((b) => {
                        const canView = !!b.canViewOtherBranches;
                        return (
                          <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900 flex items-center gap-2">
                                <span>{b.name}</span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200">
                                  {b.code}
                                </span>
                              </div>
                              {b.address && (
                                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  <span>{b.address}</span>
                                </p>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-slate-700">
                              <div className="font-semibold">{b.managerName || 'غير محدد'}</div>
                              {b.phone && (
                                <div className="text-xs font-mono text-slate-400" dir="ltr">
                                  {b.phone}
                                </div>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800"
                                  title="عدد الموظفين في هذا الفرع"
                                >
                                  {b.employeesCount || 0} موظف
                                </span>
                                <span
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  title="عدد المواعيد التابعة لهذا الفرع"
                                >
                                  {b.appointmentsCount || 0} موعد
                                </span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              {isAdmin ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleBranchVisibility(b)}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                    canView
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                      : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                  }`}
                                  title="اضغط لتغيير إمكانية رؤية باقي الفروع"
                                >
                                  {canView ? (
                                    <>
                                      <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>مسموح له رؤية باقي الفروع</span>
                                    </>
                                  ) : (
                                    <>
                                      <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                                      <span>مقيد ببيانات فرعه فقط</span>
                                    </>
                                  )}
                                </button>
                              ) : (
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                    canView
                                      ? 'bg-emerald-50 text-emerald-800'
                                      : 'bg-amber-50 text-amber-800'
                                  }`}
                                >
                                  {canView ? 'يرى كافة الفروع' : 'مقيد بفرعه'}
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              {isAdmin && (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenBranchModal(b)}
                                    title="تعديل بيانات الفرع"
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  {branches.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteBranch(b)}
                                      title="حذف الفرع"
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: STAFF & EMPLOYEES ================= */}
          {activeTab === 'staff' && isAdmin && (
            <div className="space-y-6">
              {/* Staff Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500 block">إجمالي الموظفين</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">{users.length}</div>
                </div>

                <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200 shadow-xs">
                  <span className="text-xs font-semibold text-blue-700 block">مدراء النظام (عام)</span>
                  <div className="text-2xl font-black text-blue-900 mt-1">
                    {users.filter((u) => u.role === 'admin').length}
                  </div>
                </div>

                <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-200 shadow-xs">
                  <span className="text-xs font-semibold text-indigo-700 block">مدراء الفروع</span>
                  <div className="text-2xl font-black text-indigo-900 mt-1">
                    {users.filter((u) => u.role === 'branch_manager').length}
                  </div>
                </div>

                <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 shadow-xs">
                  <span className="text-xs font-semibold text-emerald-700 block">الموظفين والمحصلين</span>
                  <div className="text-2xl font-black text-emerald-900 mt-1">
                    {users.filter((u) => u.role === 'agent' || !u.role).length}
                  </div>
                </div>
              </div>

              {/* Staff Table */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">سجل الموظفين والمحصلين</h3>
                      <p className="text-xs text-slate-500">
                        ربط الموظفين بالفروع وتخصيص الصلاحيات والحسابات
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => exportStaffToExcel(users)}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors shadow-xs active:scale-95"
                      title="تصدير بيانات الموظفين إلى ملف إكسل"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>تصدير إكسل ({users.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTargetEmployee(null);
                        setIsEmployeeModalOpen(true);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xs active:scale-95 transition-all"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>إضافة موظف جديد</span>
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-right border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="py-3 px-4">اسم الموظف</th>
                        <th className="py-3 px-4">الفرع التابع له</th>
                        <th className="py-3 px-4">اسم الدخول والبريد</th>
                        <th className="py-3 px-4">الدور الوظيفي</th>
                        <th className="py-3 px-4 text-center">رؤية الفروع</th>
                        <th className="py-3 px-4 text-center">الحالة</th>
                        <th className="py-3 px-4 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map((u) => {
                        const isSelf = u.id === currentUser?.id;
                        const userBranch = branches.find((b) => b.id === u.branchId);
                        const canSeeAll =
                          u.role === 'admin' ||
                          u.canViewOtherBranchesOverride ||
                          (userBranch && userBranch.canViewOtherBranches);

                        return (
                          <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {isSelf && (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                                    حسابك
                                  </span>
                                )}
                              </div>
                              {u.phone && (
                                <p className="text-xs text-slate-400 font-mono mt-0.5" dir="ltr">
                                  {u.phone}
                                </p>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                                <Building2 className="w-3 h-3 text-slate-500" />
                                <span>{u.branchName || userBranch?.name || 'الفرع الرئيسي'}</span>
                              </span>
                            </td>

                            <td className="py-3.5 px-4 font-mono text-xs">
                              <div className="font-semibold text-slate-700" dir="ltr">
                                {u.username}
                              </div>
                              <div className="text-slate-400" dir="ltr">
                                {u.email}
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                  u.role === 'admin'
                                    ? 'bg-blue-100 text-blue-800'
                                    : u.role === 'branch_manager'
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                <ShieldCheck className="w-3 h-3" />
                                <span>
                                  {u.role === 'admin'
                                    ? 'مدير نظام عام'
                                    : u.role === 'branch_manager'
                                    ? 'مدير فرع'
                                    : 'موظف / محصل'}
                                </span>
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                  canSeeAll
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {canSeeAll ? (
                                  <>
                                    <Eye className="w-3 h-3 text-emerald-600" />
                                    <span>يرى الكل</span>
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="w-3 h-3 text-slate-400" />
                                    <span>فرعه فقط</span>
                                  </>
                                )}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <button
                                type="button"
                                disabled={isSelf}
                                onClick={() => handleToggleUserStatus(u)}
                                className={`px-2.5 py-0.5 rounded-full text-xs font-bold transition-colors ${
                                  u.isActive !== false
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                    : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                                } ${isSelf ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title={isSelf ? 'لا يمكن تعطيل حسابك' : 'اضغط للتبديل بين التفعيل والتعطيل'}
                              >
                                {u.isActive !== false ? 'نشط' : 'معطل'}
                              </button>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTargetEmployee(u);
                                    setIsEmployeeModalOpen(true);
                                  }}
                                  title="تعديل الموظف والصلاحيات والفرع"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                {!isSelf && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(u)}
                                    title="حذف حساب الموظف"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 3: DATABASE & TABLES MIGRATION ================= */}
          {activeTab === 'database' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Top Highlights Banner */}
              <div className="bg-gradient-to-l from-indigo-900 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1/3 bg-radial from-indigo-500/10 to-transparent pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-400/30">
                      <Database className="w-3.5 h-3.5" />
                      <span>مخطط قواعد البيانات العلائقية (SQL Relational Schema)</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white">
                      جداول النظام ونقل وترحيل قواعد البيانات
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                      تم إنشاء وتجهيز ملف المخطط <code className="bg-white/10 px-1.5 py-0.5 rounded text-emerald-300 font-mono text-xs">database_schema.sql</code> داخل ملفات المشروع. يحتوي على تعريف كافة الجداول (11 جدولاً) مع الحقول والفهارس والمفاتيح الأجنبية والبيانات الأولية، لتسهيل النقل المباشر إلى أي قاعدة بيانات (PostgreSQL / MySQL / Supabase / SQLite / Neon).
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleDownloadSchemaSql}
                      disabled={downloadingSql}
                      className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {downloadingSql ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span>تحميل database_schema.sql</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopySchemaSql}
                      className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/20 flex items-center gap-2 transition-all active:scale-95"
                    >
                      {copiedSql ? (
                        <>
                          <CheckCheck className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-300">تم النسخ!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-slate-300" />
                          <span>نسخ كود SQL</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">إجمالي الجداول المجهزة</span>
                    <Database className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-1">11</div>
                  <span className="text-[11px] text-slate-400">جدول علائقي متكامل</span>
                </div>

                <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-700">إجمالي السجلات الحالية</span>
                    <Server className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-900 mt-1">
                    {dbOverview ? dbOverview.totalRecords : '—'}
                  </div>
                  <span className="text-[11px] text-emerald-600">سجل في النظام جاهز للنقل</span>
                </div>

                <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-700">التوافقية البرمجية</span>
                    <HardDrive className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-sm font-black text-blue-900 mt-1">PostgreSQL & MySQL</div>
                  <span className="text-[11px] text-blue-600">ودعم كامل لـ Supabase و SQLite</span>
                </div>

                <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-purple-700">ملفات النقل المنشأة</span>
                    <FileCode className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-sm font-black text-purple-900 mt-1">2 ملفات رئيسية</div>
                  <span className="text-[11px] text-purple-600">.sql و دليل .md الترحيل</span>
                </div>
              </div>

              {/* Action Buttons Hub */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-base">
                    خيارات تصدير وترحيل قواعد البيانات
                  </h3>
                  <p className="text-xs text-slate-500">
                    يمكنك تنزيل ملف المخطط الخام أو تفريغ كامل يحتوي على السجلات الحالية كاستعلامات INSERT
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card 1: Schema SQL */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <FileCode className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">مخطط الجداول (DDL Only)</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        ملف <code className="text-emerald-700 font-mono">database_schema.sql</code> يحتوي على أوامر إنشاء الجداول والفهارس والعلاقات فقط بدون سجلات.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadSchemaSql}
                      disabled={downloadingSql}
                      className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تنزيل المخطط (Schema SQL)</span>
                    </button>
                  </div>

                  {/* Card 2: Full SQL Dump */}
                  <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                        <Database className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">تفريغ كامل مع البيانات (SQL Dump)</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        ملف SQL كامل يدمج إنشاء الجداول واستعلامات INSERT INTO لكافة الزبائن والمواعيد والأقساط لنقل مباشر.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadExportSql}
                      disabled={downloadingDump}
                      className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    >
                      {downloadingDump ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>تنزيل التفريغ الكامل (Dump SQL)</span>
                    </button>
                  </div>

                  {/* Card 3: JSON Backup */}
                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                        <HardDrive className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">نسخة احتياطية خام (JSON Backup)</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        تحميل قاعدة البيانات الحالية بصيغة JSON الأصلية للاحتفاظ بنسخة احتياطية سحابية أو استرجاعها.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadBackupJson}
                      disabled={downloadingJson}
                      className="w-full py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    >
                      {downloadingJson ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>تحميل النسخة الاحتياطية (JSON)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Table of the 11 Database Tables */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">دليل ومحتويات الجداول الـ 11</h3>
                      <p className="text-xs text-slate-500">
                        جميع الجداول المعرفة في ملف <code className="font-mono text-emerald-700">database_schema.sql</code> المخصص لنقل وترحيل البيانات
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                    مخطط معياري متوافق ANSI SQL
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-right border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-4">اسم الجدول (SQL Table)</th>
                        <th className="py-3 px-4">الاسم بالعربية</th>
                        <th className="py-3 px-4 text-center">عدد السجلات الحالية</th>
                        <th className="py-3 px-4">الوصف والغرض في المنظومة</th>
                        <th className="py-3 px-4 text-center">المفتاح الرئيسي (PK)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        { num: 1, name: 'branches', ar: 'الفروع ومقرات العمل', count: branches.length, desc: 'شبكة الفروع المستقلة وصلاحيات الرؤية المتبادلة', pk: 'id (VARCHAR)' },
                        { num: 2, name: 'users', ar: 'المستخدمين والموظفين', count: users.length, desc: 'حسابات المدراء والمحصلين وكلمات المرور المشفرة والصلاحيات', pk: 'id (VARCHAR)' },
                        { num: 3, name: 'clients', ar: 'العملاء وأصحاب الأقساط', count: dbOverview?.tables?.find(t => t.name === 'clients')?.count || '—', desc: 'سجلات الزبائن وبيانات الكفلاء وتفاصيل الديون الكلية', pk: 'id (VARCHAR)' },
                        { num: 4, name: 'guarantors', ar: 'دليل الكفلاء الضامنين', count: dbOverview?.tables?.find(t => t.name === 'guarantors')?.count || '—', desc: 'أرشيف الكفلاء الموحد لسرعة الاقتراح والربط السريع', pk: 'id (VARCHAR)' },
                        { num: 5, name: 'appointments', ar: 'طابور المواعيد والتحصيل', count: dbOverview?.tables?.find(t => t.name === 'appointments')?.count || '—', desc: 'طابور مواعيد الحضور والدفع، التنبيهات المجدولة، والأولويات', pk: 'id (VARCHAR)' },
                        { num: 6, name: 'appointment_postponements', ar: 'سجل تأجيل المواعيد', count: dbOverview?.tables?.find(t => t.name === 'appointment_postponements')?.count || '—', desc: 'أرشفة المواعيد السابقة وأسباب ومبررات التأجيل', pk: 'id (VARCHAR)' },
                        { num: 7, name: 'installments', ar: 'الأقساط المجدولة', count: dbOverview?.tables?.find(t => t.name === 'installments')?.count || '—', desc: 'جدول الأقساط الشهرية وتواريخ الاستحقاق وحالات السداد', pk: 'id (VARCHAR)' },
                        { num: 8, name: 'payments', ar: 'سندات القبض والدفعات', count: dbOverview?.tables?.find(t => t.name === 'payments')?.count || '—', desc: 'توثيق الدفعات النقدية والتحويلات (زين كاش، كي كارد، بنك)', pk: 'id (VARCHAR)' },
                        { num: 9, name: 'call_logs', ar: 'سجل الاتصالات والمتابعات', count: dbOverview?.tables?.find(t => t.name === 'call_logs')?.count || '—', desc: 'نتائج الاتصال الهاتفي ووعود السداد ومتابعات الكفلاء', pk: 'id (VARCHAR)' },
                        { num: 10, name: 'notifications', ar: 'الإشعارات والتنبيهات', count: dbOverview?.tables?.find(t => t.name === 'notifications')?.count || '—', desc: 'تنبيهات الاستحقاق اليومي والتذكيرات المجدولة للمواعيد', pk: 'id (VARCHAR)' },
                        { num: 11, name: 'app_settings', ar: 'إعدادات النظام العامة', count: 1, desc: 'اسم المنشأة، العملة (د.ع)، أوقات الفحص الآلي والفرع الافتراضي', pk: 'id (VARCHAR)' },
                      ].map((tbl) => (
                        <tr key={tbl.name} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 text-center font-bold text-slate-400">{tbl.num}</td>
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded border border-indigo-100">
                              {tbl.name}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">{tbl.ar}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                              {tbl.count}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600">{tbl.desc}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {tbl.pk}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Instructions Box */}
              <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md space-y-4">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>طريقة تنفيذ ملف database_schema.sql وترحيل البيانات في دقيقة واحدة:</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1.5">
                    <span className="text-slate-400 block font-sans font-bold">PostgreSQL / Supabase:</span>
                    <code className="text-emerald-300 block select-all">
                      psql -h HOST -U USER -d DBNAME -f database_schema.sql
                    </code>
                  </div>

                  <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1.5">
                    <span className="text-slate-400 block font-sans font-bold">MySQL 8+:</span>
                    <code className="text-emerald-300 block select-all">
                      mysql -u USER -p DBNAME &lt; database_schema.sql
                    </code>
                  </div>

                  <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1.5">
                    <span className="text-slate-400 block font-sans font-bold">SQLite:</span>
                    <code className="text-emerald-300 block select-all">
                      sqlite3 app.db &lt; database_schema.sql
                    </code>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 font-sans">
                  * ملف الدليل التفصيلي المرفق بالمشروع: <code className="text-slate-200">DATABASE_MIGRATION_GUIDE.md</code> يحتوي على شرح العلاقات ومفاتيح الربط والأنواع المالية بدقة.
                </p>
              </div>
            </div>
          )}

          {/* ================= TAB 4: GENERAL SETTINGS ================= */}
          {activeTab === 'general' && (
            <form onSubmit={handleSaveGeneralSettings} className="space-y-6">
              {/* General Business Info */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">بيانات المنشأة والعملة</h3>
                    <p className="text-xs text-slate-500">اسم النظام المعتمد ورمز العملة في الكشوفات والإكسل</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      اسم المنشأة / التطبيق
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                      <input
                        type="text"
                        required
                        value={settings.businessName}
                        onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                        placeholder="نظام متابعة الأقساط والتمويل"
                        className="w-full pr-9 pl-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">رمز العملة</label>
                    <div className="relative">
                      <DollarSign className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                      <input
                        type="text"
                        required
                        value={settings.currency}
                        onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                        placeholder="د.ع"
                        className="w-full pr-9 pl-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                      />
                    </div>
                    <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                      العملة الحالية المعتمدة: الدينار العراقي (د.ع)
                    </p>
                  </div>
                </div>

                {/* Default branch selection */}
                {branches.length > 0 && (
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      الفرع الافتراضي للمواعيد والحسابات الجديدة
                    </label>
                    <select
                      value={settings.defaultBranchId || branches[0]?.id}
                      onChange={(e) => setSettings({ ...settings, defaultBranchId: e.target.value })}
                      className="w-full sm:w-1/2 px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Automated Notification Timing */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">مواعيد التنبيه التلقائي قبل الاستحقاق</h3>
                    <p className="text-xs text-slate-500">
                      تحديد الأيام التي يتم فيها إرسال تنبيه استباقي قبل موعد استحقاق القسط
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  <span className="text-xs font-bold text-slate-700 block">
                    تفعيل الإشعارات قبل تاريخ الاستحقاق بـ:
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { days: 1, label: 'قبل الموعد بيوم واحد', desc: 'تذكير سريع قبل 24 ساعة' },
                      { days: 3, label: 'قبل الموعد بـ 3 أيام', desc: 'تنبيه تحضيري مبكر' },
                      { days: 7, label: 'قبل الموعد بأسبوع (7 أيام)', desc: 'تنبيه أسبوعي للاستعداد' },
                    ].map((item) => {
                      const active = settings.notifyDaysBefore?.includes(item.days);
                      return (
                        <button
                          key={item.days}
                          type="button"
                          onClick={() => handleToggleDay(item.days)}
                          className={`p-3.5 rounded-xl border text-right transition-all ${
                            active
                              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                              : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`text-xs font-bold ${
                                active ? 'text-emerald-900' : 'text-slate-800'
                              }`}
                            >
                              {item.label}
                            </span>
                            {active && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                          </div>
                          <p className="text-[11px] text-slate-500">{item.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Background Server Cron Status */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">خدمة الخادم المجدولة في الخلفية</h3>
                      <p className="text-xs text-slate-500">
                        فحص استحقاق المواعيد وجدولة التنبيهات دورياً على الخادم
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleTriggerCron}
                    disabled={isSyncing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>تشغيل الفحص الفوري</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <div>
                    <span className="text-slate-500 block mb-0.5">حالة الخدمة</span>
                    <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      نشطة وتعمل في الخلفية (كل 10 دقائق)
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-0.5">آخر عملية فحص ومزامنة</span>
                    <span className="font-bold text-slate-800">
                      {settings.lastCronCheck
                        ? new Date(settings.lastCronCheck).toLocaleTimeString('ar-SA')
                        : 'منذ لحظات'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>حفظ التعديلات</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ================= BRANCH MODAL (إضافة / تعديل فرع) ================= */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {targetBranch ? `تعديل الفرع: ${targetBranch.name}` : 'إضافة فرع جديد للمنظومة'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    تحديد بيانات الفرع وتحديد ما إذا كان يرى باقي الفروع
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsBranchModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveBranch} className="p-6 space-y-4 overflow-y-auto">
              {branchError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {branchError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    اسم الفرع <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="مثال: فرع الكرخ - المنصور"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">كود الفرع</label>
                  <input
                    type="text"
                    value={branchCode}
                    onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                    placeholder="KRH-01"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم مدير الفرع</label>
                  <input
                    type="text"
                    value={branchManagerName}
                    onChange={(e) => setBranchManagerName(e.target.value)}
                    placeholder="مثال: الأستاذ عمر"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">هاتف الفرع</label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={branchPhone}
                    onChange={(e) => setBranchPhone(e.target.value)}
                    placeholder="07XXXXXXXXX"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">عنوان / موقع الفرع</label>
                <input
                  type="text"
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  placeholder="بغداد - المنصور - شارع 14 رمضان"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Critical requirement: Can view other branches */}
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-900 block">
                      إمكانية رؤية باقي الفروع (محددة من مدير النظام)
                    </span>
                    <span className="text-[11px] text-slate-600 block">
                      {branchCanViewOtherBranches
                        ? 'مسموح: موظفو هذا الفرع يمكنهم رؤية مواعيد وزبائن الفروع الأخرى'
                        : 'مقيد: موظفو هذا الفرع معزولون ويرون فقط مواعيد وزبائن فرعهم'}
                    </span>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={branchCanViewOtherBranches}
                      onChange={(e) => setBranchCanViewOtherBranches(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">ملاحظات إضافية</label>
                <textarea
                  rows={2}
                  value={branchNotes}
                  onChange={(e) => setBranchNotes(e.target.value)}
                  placeholder="أي معلومات إضافية عن الفرع..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  disabled={branchSaving}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={branchSaving}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {branchSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{targetBranch ? 'حفظ تعديلات الفرع' : 'إنشاء الفرع الآن'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Modal */}
      <EmployeeModal
        isOpen={isEmployeeModalOpen}
        targetEmployee={targetEmployee}
        branches={branches}
        onClose={() => {
          setIsEmployeeModalOpen(false);
          setTargetEmployee(null);
        }}
        onSuccess={(savedEmp) => {
          showToast(
            targetEmployee
              ? `تم تحديث بيانات وصلاحيات الموظف (${savedEmp.name}) بنجاح`
              : `تم إنشاء حساب الموظف (${savedEmp.name}) بنجاح`,
            'success'
          );
          loadData();
        }}
      />
    </div>
  );
};
