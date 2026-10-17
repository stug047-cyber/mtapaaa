import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, UserPermissions, Branch } from '../types';
import {
  X,
  UserPlus,
  User as UserIcon,
  Mail,
  Lock,
  Loader2,
  Sliders,
  Calendar,
  CreditCard,
  PhoneCall,
  Bell,
  Trash2,
  Building2,
  Phone,
  Eye,
  EyeOff,
  CheckCircle2,
  FileSpreadsheet,
  BarChart3,
  ShieldCheck,
} from 'lucide-react';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedEmployee: User) => void;
  targetEmployee?: User | null;
  branches?: Branch[];
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  targetEmployee,
  branches: initialBranches,
}) => {
  const isEditMode = !!targetEmployee;

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'agent' | 'branch_manager'>('agent');
  const [branchId, setBranchId] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [canViewOtherBranchesOverride, setCanViewOtherBranchesOverride] = useState<boolean>(false);

  const [branchesList, setBranchesList] = useState<Branch[]>(initialBranches || []);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // Specific employee permissions
  const [permissions, setPermissions] = useState<UserPermissions>({
    canAddAppointment: true,
    canEditAppointment: true,
    canDeleteAppointment: false,
    canScheduleAlerts: true,
    canRecordPayments: true,
    canRecordCalls: true,
    canChangeStatus: true,
    canEditClients: true,
    canDeleteClients: false,
    canViewReports: true,
    canExportData: true,
    canManageBranches: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load branches
  useEffect(() => {
    if (!isOpen) return;

    if (!initialBranches || initialBranches.length === 0) {
      setLoadingBranches(true);
      api
        .getBranches()
        .then((res) => {
          setBranchesList(res.branches || []);
          if (!targetEmployee && res.branches?.length > 0 && !branchId) {
            setBranchId(res.branches[0].id);
          }
        })
        .catch((err) => console.error('Failed to load branches:', err))
        .finally(() => setLoadingBranches(false));
    } else {
      setBranchesList(initialBranches);
      if (!targetEmployee && initialBranches.length > 0 && !branchId) {
        setBranchId(initialBranches[0].id);
      }
    }
  }, [isOpen, initialBranches]);

  useEffect(() => {
    if (!isOpen) return;

    if (targetEmployee) {
      setName(targetEmployee.name || '');
      setUsername(targetEmployee.username || '');
      setEmail(targetEmployee.email || '');
      setPassword('');
      setRole(targetEmployee.role || 'agent');
      setBranchId(targetEmployee.branchId || '');
      setPhone(targetEmployee.phone || '');
      setIsActive(targetEmployee.isActive !== false);
      setCanViewOtherBranchesOverride(!!targetEmployee.canViewOtherBranchesOverride);
      setPermissions(
        targetEmployee.permissions || {
          canAddAppointment: true,
          canEditAppointment: true,
          canDeleteAppointment: targetEmployee.role === 'admin',
          canScheduleAlerts: true,
          canRecordPayments: true,
          canRecordCalls: true,
          canChangeStatus: true,
          canEditClients: true,
          canDeleteClients: targetEmployee.role === 'admin',
          canViewReports: true,
          canExportData: true,
          canManageBranches: targetEmployee.role === 'admin',
        }
      );
    } else {
      setName('');
      setUsername('');
      setEmail('');
      setPassword('');
      setRole('agent');
      setPhone('');
      setIsActive(true);
      setCanViewOtherBranchesOverride(false);
      if (branchesList.length > 0) {
        setBranchId(branchesList[0].id);
      }
      setPermissions({
        canAddAppointment: true,
        canEditAppointment: true,
        canDeleteAppointment: false,
        canScheduleAlerts: true,
        canRecordPayments: true,
        canRecordCalls: true,
        canChangeStatus: true,
        canEditClients: true,
        canDeleteClients: false,
        canViewReports: true,
        canExportData: true,
        canManageBranches: false,
      });
    }
    setError(null);
  }, [isOpen, targetEmployee]);

  if (!isOpen) return null;

  const handleRoleChange = (newRole: 'admin' | 'agent' | 'branch_manager') => {
    setRole(newRole);
    if (newRole === 'admin') {
      setPermissions({
        canAddAppointment: true,
        canEditAppointment: true,
        canDeleteAppointment: true,
        canScheduleAlerts: true,
        canRecordPayments: true,
        canRecordCalls: true,
        canChangeStatus: true,
        canEditClients: true,
        canDeleteClients: true,
        canViewReports: true,
        canExportData: true,
        canManageBranches: true,
      });
      setCanViewOtherBranchesOverride(true);
    } else if (newRole === 'branch_manager') {
      setPermissions({
        canAddAppointment: true,
        canEditAppointment: true,
        canDeleteAppointment: false,
        canScheduleAlerts: true,
        canRecordPayments: true,
        canRecordCalls: true,
        canChangeStatus: true,
        canEditClients: true,
        canDeleteClients: false,
        canViewReports: true,
        canExportData: true,
        canManageBranches: false,
      });
    } else {
      setPermissions({
        canAddAppointment: true,
        canEditAppointment: true,
        canDeleteAppointment: false,
        canScheduleAlerts: true,
        canRecordPayments: true,
        canRecordCalls: true,
        canChangeStatus: true,
        canEditClients: true,
        canDeleteClients: false,
        canViewReports: true,
        canExportData: true,
        canManageBranches: false,
      });
    }
  };

  const togglePermission = (key: keyof UserPermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !email.trim()) {
      setError('يرجى تعبئة كافة الحقول المطلوبة للموظف');
      return;
    }

    if (!isEditMode && (!password || password.length < 4)) {
      setError('كلمة المرور يجب أن لا تقل عن 4 خانات');
      return;
    }

    if (isEditMode && password && password.length < 4) {
      setError('كلمة المرور الجديدة يجب أن لا تقل عن 4 خانات');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditMode && targetEmployee) {
        const updatePayload: any = {
          name: name.trim(),
          role,
          branchId,
          phone: phone.trim(),
          isActive,
          canViewOtherBranchesOverride,
          permissions,
        };
        if (password) {
          updatePayload.password = password;
        }

        const res = await api.updateUser(targetEmployee.id, updatePayload);
        onSuccess(res.user);
      } else {
        const res = await api.createUser({
          name: name.trim(),
          username: username.trim(),
          email: email.trim(),
          password,
          role,
          branchId,
          phone: phone.trim(),
          canViewOtherBranchesOverride,
          permissions,
        });
        onSuccess(res.user);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل حفظ بيانات الموظف والصلاحيات');
    } finally {
      setLoading(false);
    }
  };

  const selectedBranch = branchesList.find((b) => b.id === branchId);

  const permissionItems = [
    { key: 'canAddAppointment', label: 'إضافة مواعيد جديدة إلى الطابور', icon: Calendar, desc: 'تسجيل مواعيد الزبائن والكفلاء والمبالغ' },
    { key: 'canEditAppointment', label: 'تعديل بيانات وحالات المواعيد', icon: Sliders, desc: 'تحديث بيانات وتاريخ ووقت الموعد' },
    { key: 'canScheduleAlerts', label: 'جدولة إشعارات وتنبيهات المواعيد', icon: Bell, desc: 'ضبط التنبيهات ورسائل التذكير' },
    { key: 'canRecordPayments', label: 'تسجيل المقبوضات والدفعات', icon: CreditCard, desc: 'استلام مبالغ السداد وإصدار الوصولات' },
    { key: 'canRecordCalls', label: 'تسجيل الاتصالات والوعود بالسداد', icon: PhoneCall, desc: 'توثيق نتائج المكالمات الهاتفية' },
    { key: 'canEditClients', label: 'تعديل بيانات الزبائن والكفلاء', icon: UserIcon, desc: 'تحديث أرقام الهواتف والعناوين' },
    { key: 'canExportData', label: 'تصدير إكسل والتقارير', icon: FileSpreadsheet, desc: 'تنزيل كشوفات طابور المواعيد بصيغة Excel' },
    { key: 'canViewReports', label: 'عرض التقارير والإحصائيات', icon: BarChart3, desc: 'الاطلاع على تقارير التحصيل والديون' },
    { key: 'canDeleteAppointment', label: 'حذف المواعيد من الطابور', icon: Trash2, desc: 'صلاحية إزالة المواعيد نهائياً' },
    { key: 'canDeleteClients', label: 'حذف الزبائن والملفات', icon: Trash2, desc: 'صلاحية حذف ملف العميل وسجلاته' },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-sm">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {isEditMode ? `تعديل موظف: ${targetEmployee?.name}` : 'إضافة حساب موظف جديد'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تحديد الفرع التابع له، الصلاحيات، وإمكانية رؤية باقي الفروع
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <UserIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>البيانات الشخصية وحساب الدخول</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الاسم الكامل للموظف <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: أحمد عبدالكريم"
                    className="w-full pr-9 pl-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  رقم الهاتف للتواصل
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  <input
                    type="tel"
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07XXXXXXXXX"
                    className="w-full pr-9 pl-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-right font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  اسم المستخدم للدخول <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={isEditMode}
                  dir="ltr"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ahmed_staff"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-right disabled:bg-slate-100 disabled:text-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  البريد الإلكتروني <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  <input
                    type="email"
                    required
                    disabled={isEditMode}
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ahmed@aqsat.com"
                    className="w-full pr-9 pl-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-right disabled:bg-slate-100 disabled:text-slate-500 font-mono"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isEditMode ? 'كلمة المرور (اتركها فارغة إذا لم ترغب بتغييرها)' : 'كلمة المرور'} {!isEditMode && <span className="text-rose-500">*</span>}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <input
                  type="password"
                  required={!isEditMode}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isEditMode ? '•••••••• (غير معدلة)' : '•••••••• (4 خانات فأكثر)'}
                  className="w-full pr-9 pl-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Branch Assignment and Cross-branch Access */}
          <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100 space-y-3">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>الفرع التابع له وإمكانية رؤية باقي الفروع</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الفرع التابع له الموظف <span className="text-rose-500">*</span>
                </label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  disabled={loadingBranches}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-800"
                >
                  {branchesList.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                  {branchesList.length === 0 && (
                    <option value="">جاري تحميل الفروع...</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  صلاحية الفرع الافتراضية
                </label>
                <div className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs flex items-center gap-2">
                  {selectedBranch?.canViewOtherBranches ? (
                    <>
                      <Eye className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-800 font-semibold">
                        هذا الفرع مسموح له رؤية باقي الفروع
                      </span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-4 h-4 text-amber-600" />
                      <span className="text-amber-800 font-semibold">
                        هذا الفرع مقيد ببياناته فقط
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Cross-branch visibility override toggle by main admin */}
            {role !== 'admin' && (
              <div className="pt-2 border-t border-emerald-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    استثناء مخصص: السماح لهذا الموظف برؤية الفروع الأخرى
                  </span>
                  <span className="text-[11px] text-slate-500">
                    تحديد مباشر من مدير النظام الرئيسي ليتجاوز قيد الفرع
                  </span>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canViewOtherBranchesOverride}
                    onChange={(e) => setCanViewOtherBranchesOverride(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            )}
          </div>

          {/* Section 3: Role Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              نوع الحساب والدور الوظيفي <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleRoleChange('agent')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center gap-1 ${
                  role === 'agent'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-xs ring-1 ring-emerald-500'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <UserIcon className="w-4 h-4 text-emerald-600" />
                <span>موظف / محصل</span>
                <span className="text-[10px] font-normal text-slate-400">مهام محددة للفرع</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('branch_manager')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center gap-1 ${
                  role === 'branch_manager'
                    ? 'bg-indigo-50 border-indigo-400 text-indigo-900 shadow-xs ring-1 ring-indigo-500'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>مدير فرع</span>
                <span className="text-[10px] font-normal text-slate-400">إشراف على الفرع</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('admin')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center gap-1 ${
                  role === 'admin'
                    ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs ring-1 ring-blue-500'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>مدير نظام رئيسي</span>
                <span className="text-[10px] font-normal text-slate-400">كافة الصلاحيات والفروع</span>
              </button>
            </div>
          </div>

          {/* Account Status Switch */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-800 block">حالة الحساب</span>
              <span className="text-[11px] text-slate-500">
                {isActive ? 'الحساب نشط ويمكنه تسجيل الدخول' : 'الحساب معطل وموقوف عن الدخول'}
              </span>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Detailed Permissions Section */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                <span>تحديد صلاحيات الموظف بالتفصيل:</span>
              </span>
              <span className="text-[11px] text-slate-500">اختر المهام المسموحة له</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {permissionItems.map((item) => {
                const Icon = item.icon;
                const isChecked = !!permissions[item.key as keyof UserPermissions];

                return (
                  <label
                    key={item.key}
                    className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                      isChecked ? 'bg-white border border-emerald-200 shadow-xs' : 'hover:bg-slate-100 opacity-80'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={role === 'admin'}
                      onChange={() => togglePermission(item.key as keyof UserPermissions)}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <div>
                      <div className="font-semibold text-slate-800 flex items-center gap-1">
                        <Icon className="w-3 h-3 text-slate-500" />
                        <span>{item.label}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{item.desc}</p>
                    </div>
                  </label>
                );
              })}
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
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isEditMode ? 'حفظ التعديلات والصلاحيات' : 'حفظ وإنشاء الحساب'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
