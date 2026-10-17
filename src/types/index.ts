export type AppointmentStatus =
  | 'waiting'             // بانتظار الموعد في الطابور
  | 'today'               // حان موعده اليوم
  | 'overdue'             // متأخر عن الموعد
  | 'paid'                // تم السداد بالكامل
  | 'partially_paid'      // مسدد جزئياً
  | 'postponed'           // تم تأجيل الموعد
  | 'no_answer'           // لم يرد على الاتصال
  | 'phone_off'           // مغلق أو خارج التغطية
  | 'referred_to_guarantor' // محال إلى الكفيل
  | 'refused'             // ممتنع عن السداد
  | 'disputed';           // متنازع عليه

export interface ScheduledAlertInfo {
  scheduledAt: string; // ISO string تاريخ ووقت التنبيه
  reminderType: 'at_appointment' | '15m_before' | '1h_before' | '1d_before' | 'custom';
  customDate?: string;
  customTime?: string;
  note?: string;
  notifyGuarantor: boolean;
  isTriggered: boolean;
  triggeredAt?: string;
}

export interface PostponementRecord {
  id: string;
  previousDate: string;        // التاريخ السابق للموعد (YYYY-MM-DD)
  previousTime?: string;       // الوقت السابق (HH:MM)
  newDate: string;             // التاريخ الجديد بعد التأجيل (YYYY-MM-DD)
  newTime?: string;            // الوقت الجديد (HH:MM)
  postponedAt: string;         // تاريخ ووقت تسجيل التأجيل
  postponedBy?: string;        // اسم الموظف الذي قام بالتأجيل
  reason?: string;             // سبب التأجيل أو ملاحظات الاتصال
  callResult?: string;         // نتيجة الاتصال
}

export interface Guarantor {
  id: string;
  name: string;                // اسم الكفيل الضامن
  phone: string;               // رقم هاتف الكفيل
  nationalId?: string;         // الرقم الوطني / الهوية
  address?: string;            // العنوان / السكن
  relation?: string;           // صلة القرابة (أب، أخ، صديق...)
  notes?: string;              // ملاحظات
  createdAt: string;
  updatedAt?: string;
}

export interface Appointment {
  id: string;
  queueNumber: number;        // رقم الدور في الطابور (1, 2, 3...)
  clientName: string;         // الاسم
  clientPhone: string;        // رقم الهاتف
  guarantorName: string;      // اسم الكفيل
  guarantorPhone: string;     // رقم هاتف الكفيل
  requiredAmount: number;     // المبلغ المطلوب للدفع (د.ع)
  paidAmount: number;         // المبلغ المدفوع
  remainingAmount: number;    // المبلغ المتبقي
  appointmentDate: string;    // YYYY-MM-DD
  appointmentTime?: string;   // HH:MM
  status: AppointmentStatus;
  priority: 'normal' | 'important' | 'urgent'; // عادي | مهم | عاجل
  notes?: string;
  clientId?: string;
  branchId?: string;           // الفرع
  branchName?: string;         // اسم الفرع
  scheduledAlert?: ScheduledAlertInfo; // جدولة الإشعار والتنبيه
  originalAppointmentDate?: string;    // تاريخ الموعد الأصلي عند الإنشاء
  postponementCount?: number;          // عدد مرات التأجيل
  postponementHistory?: PostponementRecord[]; // سجل جميع التأجيلات والمواعيد السابقة
  createdAt: string;
  updatedAt: string;
}

export interface QueueStats {
  total: number;
  todayCount: number;
  waitingCount: number;
  overdueCount: number;
  paidCount: number;
  totalRequired: number;
  totalPaid: number;
  totalRemaining: number;
}

export type InstallmentStatus =
  | 'promised'
  | 'unpaid'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'broken_promise'
  | 'no_answer'
  | 'phone_off'
  | 'postponed'
  | 'in_followup'
  | 'refused'
  | 'referred_to_guarantor'
  | 'disputed'
  | 'legal_action';

export interface Branch {
  id: string;
  name: string;             // اسم الفرع (مثال: الفرع الرئيسي - بغداد)
  code: string;             // كود الفرع (مثال: BGD-01)
  address?: string;         // عنوان الفرع
  phone?: string;           // رقم هاتف الفرع
  managerName?: string;     // اسم مدير الفرع
  managerId?: string;       // معرف المدير
  canViewOtherBranches: boolean; // هل يحق لموظفي هذا الفرع رؤية الفروع الأخرى؟ تحدد بواسطة مدير النظام الرئيسي!
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  // Stats calculated on server
  employeesCount?: number;
  appointmentsCount?: number;
  clientsCount?: number;
}

export interface UserPermissions {
  canRecordCalls: boolean;
  canRecordPayments: boolean;
  canEditClients: boolean;
  canDeleteClients: boolean;
  canChangeStatus: boolean;
  canAddAppointment: boolean;
  canEditAppointment: boolean;
  canDeleteAppointment: boolean;
  canScheduleAlerts: boolean;
  canViewReports: boolean;
  canExportData: boolean;
  canManageBranches?: boolean;
}

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: 'admin' | 'agent' | 'branch_manager';
  branchId?: string;                     // معرف الفرع التابع له الموظف
  branchName?: string;                   // اسم الفرع
  phone?: string;                        // رقم هاتف الموظف
  isActive?: boolean;
  canViewOtherBranchesOverride?: boolean; // استثناء خاص بالموظف من مدير النظام
  canViewOtherBranches?: boolean;         // القيمة المحسوبة لصلاحية رؤية باقي الفروع
  permissions?: UserPermissions;
  createdAt?: string;
  updatedAt?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  nationalId?: string;
  email?: string;
  address?: string;
  notes?: string;
  branchId?: string;                     // الفرع التابع له الزبون
  branchName?: string;                   // اسم الفرع
  // Guarantor (الكفيل الضامن)
  guarantorName?: string;
  guarantorPhone?: string;
  guarantorRelation?: string;
  guarantorNationalId?: string;
  guarantorAddress?: string;
  // Follow-up & calls
  lastCallDate?: string;
  lastCallResult?: string;
  nextPromiseDate?: string;
  promiseAmount?: number;
  totalDebt?: number;
  createdAt: string;
  totalInstallments?: number;
  paidAmount?: number;
  remainingAmount?: number;
  nextDueDate?: string | null;
  installmentsCount?: number;
  status?: 'active' | 'completed' | 'overdue' | 'promised' | 'broken_promise';
}

export type CallResultType =
  | 'promised'            // وعد بالسداد (انطاني موعد)
  | 'no_answer'           // تم الاتصال ولا يرد
  | 'phone_off'           // الهاتف مغلق أو خارج التغطية
  | 'wrong_number'        // الرقم غير صحيح
  | 'asked_to_call_later' // طلب معاودة الاتصال لاحقاً
  | 'postponed'           // تم تأجيل الموعد
  | 'excuse'              // ظرف خاص / عذر
  | 'refused'             // ممتنع / رافض للدفع
  | 'referred_to_guarantor' // محال إلى الكفيل
  | 'paid_already'        // تم السداد بالفعل
  | 'other';              // أخرى

export interface CallLog {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  guarantorName?: string;
  guarantorPhone?: string;
  callerUserId: string;
  callerName: string;
  callDate: string;
  result: CallResultType;
  resultLabel: string;
  promisedDate?: string;
  promisedAmount?: number;
  notes?: string;
  status: 'pending' | 'fulfilled' | 'broken';
  createdAt: string;
}

export interface Installment {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  guarantorName?: string;
  guarantorPhone?: string;
  amount: number;
  paidAmount: number;
  remainingAmount?: number;
  dueDate: string; // YYYY-MM-DD
  status: InstallmentStatus;
  notes?: string;
  promisedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  appointmentId?: string;
  installmentId?: string;
  clientId: string;
  clientName: string;
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'card' | 'zain_cash' | 'qi_card';
  referenceNo?: string;
  notes?: string;
  recordedBy?: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  type: 'due_today' | 'upcoming' | 'overdue' | 'payment_received' | 'promise_due' | 'promise_broken' | 'scheduled_alert';
  appointmentId?: string;
  installmentId?: string;
  clientId?: string;
  clientName: string;
  clientPhone: string;
  guarantorName?: string;
  guarantorPhone?: string;
  amount: number;
  dueDate: string;
  title: string;
  message: string;
  isRead: boolean;
  scheduledFor?: string;
  createdAt: string;
}

export interface AppSettings {
  businessName: string;
  currency: string;
  notifyDaysBefore: number[];
  autoCheckIntervalMinutes: number;
  lastCronCheck?: string;
  customStatuses?: string[];
  soundEnabled?: boolean;
  defaultBranchId?: string;
  enforceBranchIsolation?: boolean; // عزل الفروع تلقائياً
}

export interface DashboardStats {
  totalDue: number;
  totalPaid: number;
  totalRemaining: number;
  collectionRate: number;
  dueTodayCount: number;
  overdueCount: number;
  waitingCount: number;
  paidCount: number;
  totalAppointmentsCount: number;
  totalClientsCount: number;
  unreadNotificationsCount: number;
  scheduledAlertsCount: number;
  todayAppointments: Appointment[];
  upcomingAppointments: Appointment[];
  upcomingPayments?: Installment[];
  recentPayments: Payment[];
  currency: string;
}

export interface ReportSummary {
  totalDue: number;
  totalPaid: number;
  totalRemaining: number;
  collectionRate: number;
  totalCount: number;
  paidCount: number;
  unpaidCount: number;
  overdueCount: number;
  currency: string;
  businessName: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
}
