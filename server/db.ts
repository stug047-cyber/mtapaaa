import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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

export interface Branch {
  id: string;
  name: string;             // اسم الفرع (مثال: الفرع الرئيسي - بغداد)
  code: string;             // كود الفرع (مثال: BGD-01)
  address?: string;         // عنوان الفرع
  phone?: string;           // هاتف الفرع
  managerName?: string;     // اسم مدير الفرع
  managerId?: string;       // معرف المدير
  canViewOtherBranches: boolean; // هل يحق لموظفي هذا الفرع رؤية الفروع الأخرى؟ تحدد بواسطة مدير النظام الرئيسي!
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'admin' | 'agent' | 'branch_manager';
  branchId?: string;                     // الفرع التابع له الموظف
  branchName?: string;                   // اسم الفرع
  phone?: string;                        // رقم هاتف الموظف
  isActive?: boolean;
  canViewOtherBranchesOverride?: boolean; // استثناء خاص بالموظف من مدير النظام
  permissions?: UserPermissions;
  createdAt: string;
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
  // Guarantor / الكفيل الضامن
  guarantorName?: string;
  guarantorPhone?: string;
  guarantorRelation?: string;
  guarantorNationalId?: string;
  guarantorAddress?: string;
  // Follow-up & promises summary
  lastCallDate?: string;
  lastCallResult?: string;
  nextPromiseDate?: string; // YYYY-MM-DD تاريخ الوعد بالسداد
  promiseAmount?: number;
  totalDebt?: number;
  createdAt: string;
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
  promisedDate?: string; // YYYY-MM-DD
  promisedAmount?: number;
  notes?: string;
  status: 'pending' | 'fulfilled' | 'broken';
  createdAt: string;
}

// ================= APPOINTMENTS QUEUE & SCHEDULED ALERTS =================

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
  scheduledAt: string; // ISO String (تاريخ ووقت إطلاق التنبيه)
  reminderType: 'at_appointment' | '15m_before' | '1h_before' | '1d_before' | 'custom';
  customDate?: string; // YYYY-MM-DD
  customTime?: string; // HH:MM
  note?: string;
  notifyGuarantor: boolean; // إشعار الكفيل أيضاً
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
  clientName: string;         // الاسم (الاسم المطلوب)
  clientPhone: string;        // رقم الهاتف
  guarantorName: string;      // اسم الكفيل
  guarantorPhone: string;     // رقم هاتف الكفيل
  requiredAmount: number;     // المبلغ المطلوب للدفع
  paidAmount: number;         // المبلغ المدفوع
  remainingAmount: number;    // المبلغ المتبقي
  appointmentDate: string;    // تاريخ الموعد YYYY-MM-DD
  appointmentTime?: string;   // وقت الموعد HH:MM
  status: AppointmentStatus;
  priority: 'normal' | 'important' | 'urgent'; // عادي | مهم | عاجل
  notes?: string;
  clientId?: string;
  branchId?: string;           // معرف الفرع
  branchName?: string;         // اسم الفرع
  scheduledAlert?: ScheduledAlertInfo; // جدولة الإشعار والتنبيه
  originalAppointmentDate?: string;    // تاريخ الموعد الأصلي عند الإنشاء
  postponementCount?: number;          // عدد مرات التأجيل
  postponementHistory?: PostponementRecord[]; // سجل جميع التأجيلات والمواعيد السابقة
  createdAt: string;
  updatedAt: string;
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

export interface Installment {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  guarantorName?: string;
  guarantorPhone?: string;
  amount: number;
  paidAmount: number;
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
  notifyDaysBefore: number[]; // e.g. [1, 3, 7]
  autoCheckIntervalMinutes: number;
  lastCronCheck?: string;
  customStatuses?: string[];
  soundEnabled?: boolean;
  defaultBranchId?: string;
  enforceBranchIsolation?: boolean;
}

export interface DatabaseSchema {
  users: User[];
  clients: Client[];
  appointments: Appointment[];
  installments: Installment[];
  payments: Payment[];
  calls: CallLog[];
  notifications: AppNotification[];
  settings: AppSettings;
  guarantors?: Guarantor[];
  branches?: Branch[];
}

export function upsertGuarantor(
  database: DatabaseSchema,
  data: {
    name: string;
    phone: string;
    relation?: string;
    address?: string;
    nationalId?: string;
    notes?: string;
  }
): Guarantor {
  database.guarantors = database.guarantors || [];
  const cleanName = data.name.trim();
  const cleanPhone = data.phone.trim();
  if (!cleanName) {
    throw new Error('اسم الكفيل مطلوب');
  }

  const existing = database.guarantors.find(
    (g) => g.name.trim().toLowerCase() === cleanName.toLowerCase() || (cleanPhone && g.phone.trim() === cleanPhone)
  );

  if (existing) {
    existing.name = cleanName;
    if (cleanPhone) existing.phone = cleanPhone;
    if (data.relation) existing.relation = data.relation.trim();
    if (data.address) existing.address = data.address.trim();
    if (data.nationalId) existing.nationalId = data.nationalId.trim();
    if (data.notes) existing.notes = data.notes.trim();
    existing.updatedAt = new Date().toISOString();
    return existing;
  }

  const newG: Guarantor = {
    id: `g_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    name: cleanName,
    phone: cleanPhone || '',
    relation: data.relation?.trim(),
    address: data.address?.trim(),
    nationalId: data.nationalId?.trim(),
    notes: data.notes?.trim(),
    createdAt: new Date().toISOString(),
  };
  database.guarantors.push(newG);
  return newG;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Password hashing utilities using Node.js crypto
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, combinedHash: string): boolean {
  try {
    const [salt, key] = combinedHash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

// Generate simple secure session tokens
export function createAuthToken(user: User): string {
  const payload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    role: user.role,
    branchId: user.branchId,
    branchName: user.branchName,
    canViewOtherBranchesOverride: user.canViewOtherBranchesOverride,
    permissions: user.permissions || {
      canRecordCalls: true,
      canRecordPayments: true,
      canEditClients: true,
      canDeleteClients: user.role === 'admin',
      canChangeStatus: true,
      canAddAppointment: true,
      canEditAppointment: true,
      canDeleteAppointment: user.role === 'admin',
      canScheduleAlerts: true,
      canViewReports: true,
      canExportData: true,
      canManageBranches: user.role === 'admin',
    },
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  const json = JSON.stringify(payload);
  const base64 = Buffer.from(json).toString('base64url');
  const signature = crypto.createHmac('sha256', 'aqsat-secret-key-system-2026').update(base64).digest('base64url');
  return `${base64}.${signature}`;
}

export function verifyAuthToken(token: string): {
  userId: string;
  name?: string;
  email: string;
  username: string;
  role: string;
  branchId?: string;
  branchName?: string;
  canViewOtherBranchesOverride?: boolean;
  permissions?: UserPermissions;
} | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [base64, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', 'aqsat-secret-key-system-2026').update(base64).digest('base64url');
    if (signature !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(base64, 'base64url').toString('utf8'));
    if (Date.now() > payload.expiresAt) return null;
    return payload;
  } catch {
    return null;
  }
}

function getInitialData(): DatabaseSchema {
  // Compute realistic dates relative to current date (Oct 2026)
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const inTenDays = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const inTwentyDays = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const defaultAdmin: User = {
    id: 'user_admin_1',
    username: 'admin',
    email: 'admin@aqsat.com',
    passwordHash: hashPassword('admin123'),
    name: 'مدير النظام',
    role: 'admin',
    createdAt: new Date().toISOString(),
  };

  const clients: Client[] = [
    {
      id: 'client_1',
      name: 'محمد أحمد المنصوري',
      phone: '0501234567',
      nationalId: '1029384756',
      email: 'm.mansoori@example.com',
      address: 'الرياض - حي النرجس',
      notes: 'عميل ملتزم بالسداد دائماً',
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'client_2',
      name: 'فاطمة إبراهيم الشمري',
      phone: '0559876543',
      nationalId: '1083746251',
      email: 'fatimah.sh@example.com',
      address: 'الدمام - حي الشاطئ',
      notes: 'قسط سيارة عائلية',
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'client_3',
      name: 'عبدالله خالد العتيبي',
      phone: '0543219876',
      nationalId: '1047291845',
      email: 'a.otibi@example.com',
      address: 'جدة - حي الروضة',
      notes: 'تم التواصل معه ووعد بالسداد نهاية الأسبوع',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'client_4',
      name: 'سارة محمود الزهراني',
      phone: '0567891234',
      nationalId: '1092837465',
      email: 'sara.zahrani@example.com',
      address: 'مكة المكرمة - حي بطحاء قريش',
      notes: 'قسط أجهزة إلكترونية',
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'client_5',
      name: 'يوسف سلطان الدوسري',
      phone: '0512349876',
      nationalId: '1065432198',
      email: 'yousuf.d@example.com',
      address: 'الخبر - حي العقربية',
      notes: 'حساب جديد',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const installments: Installment[] = [
    {
      id: 'inst_1',
      clientId: 'client_1',
      clientName: 'محمد أحمد المنصوري',
      clientPhone: '0501234567',
      amount: 2500,
      paidAmount: 2500,
      dueDate: yesterday,
      status: 'paid',
      notes: 'قسط شهر سبتمبر تم سداده كاملاً',
      createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: yesterday,
    },
    {
      id: 'inst_2',
      clientId: 'client_1',
      clientName: 'محمد أحمد المنصوري',
      clientPhone: '0501234567',
      amount: 2500,
      paidAmount: 0,
      dueDate: inTwentyDays,
      status: 'unpaid',
      notes: 'قسط شهر نوفمبر القادم',
      createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'inst_3',
      clientId: 'client_2',
      clientName: 'فاطمة إبراهيم الشمري',
      clientPhone: '0559876543',
      amount: 1800,
      paidAmount: 0,
      dueDate: today,
      status: 'unpaid',
      notes: 'قسط مستحق اليوم - يرجى إرسال رسالة تذكير',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'inst_4',
      clientId: 'client_3',
      clientName: 'عبدالله خالد العتيبي',
      clientPhone: '0543219876',
      amount: 3200,
      paidAmount: 1000,
      dueDate: twoDaysAgo,
      status: 'overdue',
      notes: 'دفعة جزئية وباقي 2200 متأخرة منذ يومين',
      createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: twoDaysAgo,
    },
    {
      id: 'inst_5',
      clientId: 'client_4',
      clientName: 'سارة محمود الزهراني',
      clientPhone: '0567891234',
      amount: 1200,
      paidAmount: 0,
      dueDate: inThreeDays,
      status: 'unpaid',
      notes: 'قسط يقترب موعده بعد 3 أيام',
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'inst_6',
      clientId: 'client_5',
      clientName: 'يوسف سلطان الدوسري',
      clientPhone: '0512349876',
      amount: 4500,
      paidAmount: 0,
      dueDate: inTenDays,
      status: 'unpaid',
      notes: 'القسط الأول من عقد التمويل',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const payments: Payment[] = [
    {
      id: 'pay_1',
      installmentId: 'inst_1',
      clientId: 'client_1',
      clientName: 'محمد أحمد المنصوري',
      amount: 2500,
      paymentDate: yesterday,
      paymentMethod: 'bank_transfer',
      referenceNo: 'TRX-9821034',
      notes: 'تحويل عبر تطبيق الراجحي',
      createdAt: yesterday,
    },
    {
      id: 'pay_2',
      installmentId: 'inst_4',
      clientId: 'client_3',
      clientName: 'عبدالله خالد العتيبي',
      amount: 1000,
      paymentDate: twoDaysAgo,
      paymentMethod: 'cash',
      referenceNo: 'REC-00124',
      notes: 'دفعة نقدية بالفرع',
      createdAt: twoDaysAgo,
    },
  ];

  const notifications: AppNotification[] = [
    {
      id: 'notif_1',
      type: 'due_today',
      installmentId: 'inst_3',
      clientId: 'client_2',
      clientName: 'فاطمة إبراهيم الشمري',
      clientPhone: '0559876543',
      amount: 1800,
      dueDate: today,
      title: 'قسط مستحق اليوم!',
      message: 'القسط المستحق على الأستاذة فاطمة إبراهيم الشمري بمبلغ 1,800 ر.س يحل موعده اليوم.',
      isRead: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'notif_2',
      type: 'overdue',
      installmentId: 'inst_4',
      clientId: 'client_3',
      clientName: 'عبدالله خالد العتيبي',
      clientPhone: '0543219876',
      amount: 2200,
      dueDate: twoDaysAgo,
      title: 'تنبيه: قسط متأخر',
      message: 'القسط المستحق على الأخ عبدالله خالد العتيبي متأخر، المتبقي: 2,200 ر.س منذ تاريخ ' + twoDaysAgo,
      isRead: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'notif_3',
      type: 'upcoming',
      installmentId: 'inst_5',
      clientId: 'client_4',
      clientName: 'سارة محمود الزهراني',
      clientPhone: '0567891234',
      amount: 1200,
      dueDate: inThreeDays,
      title: 'قسط يقترب موعد استحقاقه',
      message: 'قسط مستحق بعد 3 أيام للأستاذة سارة محمود الزهراني بمبلغ 1,200 ر.س.',
      isRead: true,
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const settings: AppSettings = {
    businessName: 'نظام طابور المواعيد والتحصيل',
    currency: 'د.ع',
    notifyDaysBefore: [1, 3, 7],
    autoCheckIntervalMinutes: 10,
    lastCronCheck: new Date().toISOString(),
    soundEnabled: true,
  };

  const sampleAppointments: Appointment[] = [
    {
      id: 'apt_1',
      queueNumber: 1,
      clientName: 'علي حيدر الزبيدي',
      clientPhone: '07701234567',
      guarantorName: 'حسين علي الزبيدي',
      guarantorPhone: '07809876543',
      requiredAmount: 450000,
      paidAmount: 0,
      remainingAmount: 450000,
      appointmentDate: today,
      appointmentTime: '11:00',
      status: 'today',
      priority: 'urgent',
      notes: 'موعد تسديد دفعة لشهر تشرين الأول، وعد بالحضور قبل الظهر',
      clientId: 'client_1',
      scheduledAlert: {
        scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        reminderType: '1h_before',
        note: 'تذكير موعد علي حيدر الزبيدي للدفع',
        notifyGuarantor: true,
        isTriggered: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'apt_2',
      queueNumber: 2,
      clientName: 'عمر فاضل الجبوري',
      clientPhone: '07718765432',
      guarantorName: 'ليث فاضل الجبوري',
      guarantorPhone: '07812345678',
      requiredAmount: 750000,
      paidAmount: 250000,
      remainingAmount: 500000,
      appointmentDate: inTwoDays,
      appointmentTime: '10:30',
      status: 'waiting',
      priority: 'important',
      notes: 'تم دفع 250 ألف والمتبقي 500 ألف في الموعد القادم',
      clientId: 'client_2',
      scheduledAlert: {
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        reminderType: '1d_before',
        note: 'تذكير قبل الموعد بيوم لعمر فاضل والكفيل ليث',
        notifyGuarantor: true,
        isTriggered: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'apt_3',
      queueNumber: 3,
      clientName: 'كرار حميد الخفاجي',
      clientPhone: '07503456789',
      guarantorName: 'سلام حميد الخفاجي',
      guarantorPhone: '07721239876',
      requiredAmount: 320000,
      paidAmount: 0,
      remainingAmount: 320000,
      appointmentDate: twoDaysAgo,
      appointmentTime: '14:00',
      status: 'overdue',
      priority: 'urgent',
      notes: 'متأخر عن الموعد يومين، تم الاتصال ووعد بالدفع اليوم عصراً',
      clientId: 'client_3',
      scheduledAlert: {
        scheduledAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reminderType: 'custom',
        note: 'متابعة عاجلة مع الكفيل سلام',
        notifyGuarantor: true,
        isTriggered: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'apt_4',
      queueNumber: 4,
      clientName: 'سيف مهدي الموسوي',
      clientPhone: '07823456712',
      guarantorName: 'أحمد مهدي الموسوي',
      guarantorPhone: '07705544332',
      requiredAmount: 1200000,
      paidAmount: 1200000,
      remainingAmount: 0,
      appointmentDate: yesterday,
      appointmentTime: '16:00',
      status: 'paid',
      priority: 'normal',
      notes: 'تم سداد المبلغ المطلوب بالكامل عبر زين كاش',
      clientId: 'client_4',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'apt_5',
      queueNumber: 5,
      clientName: 'ياسين طه السعدي',
      clientPhone: '07739988776',
      guarantorName: 'وسام طه السعدي',
      guarantorPhone: '07831122334',
      requiredAmount: 600000,
      paidAmount: 0,
      remainingAmount: 600000,
      appointmentDate: inThreeDays,
      appointmentTime: '12:00',
      status: 'waiting',
      priority: 'normal',
      notes: 'موعد منتظم',
      clientId: 'client_5',
      scheduledAlert: {
        scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        reminderType: '1d_before',
        note: 'تنبيه موعد السعدي',
        notifyGuarantor: false,
        isTriggered: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  return {
    users: [defaultAdmin],
    clients,
    appointments: sampleAppointments,
    installments,
    payments,
    calls: [],
    notifications,
    settings,
    guarantors: [],
    branches: [
      {
        id: 'branch_main',
        name: 'الفرع الرئيسي - بغداد',
        code: 'BGD-01',
        address: 'بغداد - المنصور',
        phone: '07801234567',
        managerName: 'مدير النظام',
        canViewOtherBranches: true,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'branch_basra',
        name: 'فرع البصرة',
        code: 'BSR-02',
        address: 'البصرة - شارع الجزائر',
        phone: '07709876543',
        managerName: 'علي حسن',
        canViewOtherBranches: false,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'branch_erbil',
        name: 'فرع أربيل',
        code: 'ERB-03',
        address: 'أربيل - شارع 60 متري',
        phone: '07501122334',
        managerName: 'كاروان أحمد',
        canViewOtherBranches: false,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDirectory();
    this.data = this.readFromDisk();
  }

  private ensureDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private readFromDisk(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        parsed.calls = parsed.calls || [];
        parsed.users = parsed.users || [];
        parsed.clients = parsed.clients || [];
        parsed.payments = parsed.payments || [];
        parsed.notifications = parsed.notifications || [];
        parsed.installments = parsed.installments || [];

        // Ensure appointments array exists and is populated
        if (!parsed.appointments || parsed.appointments.length === 0) {
          if (parsed.installments && parsed.installments.length > 0) {
            // Migrate from installments to appointments queue
            parsed.appointments = parsed.installments.map((inst: any, index: number) => {
              const matchedClient = parsed.clients.find((c: any) => c.id === inst.clientId);
              const gName = inst.guarantorName || matchedClient?.guarantorName || 'كفيل ضامن';
              const gPhone = inst.guarantorPhone || matchedClient?.guarantorPhone || '07800000000';
              const rem = Math.max(0, (inst.amount || 0) - (inst.paidAmount || 0));
              let status: AppointmentStatus = 'waiting';
              const todayStr = new Date().toISOString().split('T')[0];
              if (rem <= 0) status = 'paid';
              else if (inst.dueDate === todayStr) status = 'today';
              else if (inst.dueDate < todayStr) status = 'overdue';
              else if (inst.status === 'promised') status = 'waiting';
              else if (inst.status === 'postponed') status = 'postponed';
              else if (inst.status === 'no_answer') status = 'no_answer';

              return {
                id: `apt_${inst.id}`,
                queueNumber: index + 1,
                clientName: inst.clientName,
                clientPhone: inst.clientPhone,
                guarantorName: gName,
                guarantorPhone: gPhone,
                requiredAmount: inst.amount,
                paidAmount: inst.paidAmount || 0,
                remainingAmount: rem,
                appointmentDate: inst.dueDate,
                appointmentTime: '10:00',
                status,
                priority: rem > 1000000 ? 'urgent' : rem > 500000 ? 'important' : 'normal',
                notes: inst.notes || 'موعد في الطابور',
                clientId: inst.clientId,
                scheduledAlert: {
                  scheduledAt: new Date(new Date(inst.dueDate).getTime() - 2 * 60 * 60 * 1000).toISOString(),
                  reminderType: '1h_before',
                  note: `تذكير بموعد ${inst.clientName}`,
                  notifyGuarantor: true,
                  isTriggered: false,
                },
                createdAt: inst.createdAt || new Date().toISOString(),
                updatedAt: inst.updatedAt || new Date().toISOString(),
              };
            });
          } else {
            // Seed sample appointments
            const initial = getInitialData();
            parsed.appointments = initial.appointments;
          }
          this.saveToDisk(parsed);
        }

        // Ensure guarantors collection is initialized and populated
        parsed.guarantors = parsed.guarantors || [];
        const existingGNames = new Set(parsed.guarantors.map((g: any) => g.name.trim().toLowerCase()));

        (parsed.appointments || []).forEach((apt: any) => {
          if (apt.guarantorName && apt.guarantorPhone) {
            const key = apt.guarantorName.trim().toLowerCase();
            if (!existingGNames.has(key)) {
              existingGNames.add(key);
              parsed.guarantors.push({
                id: `g_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                name: apt.guarantorName.trim(),
                phone: apt.guarantorPhone.trim(),
                createdAt: apt.createdAt || new Date().toISOString(),
              });
            }
          }
        });

        (parsed.clients || []).forEach((c: any) => {
          if (c.guarantorName && c.guarantorPhone) {
            const key = c.guarantorName.trim().toLowerCase();
            if (!existingGNames.has(key)) {
              existingGNames.add(key);
              parsed.guarantors.push({
                id: `g_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                name: c.guarantorName.trim(),
                phone: c.guarantorPhone.trim(),
                relation: c.guarantorRelation,
                address: c.guarantorAddress,
                nationalId: c.guarantorNationalId,
                createdAt: c.createdAt || new Date().toISOString(),
              });
            }
          }
        });

        // Ensure branches collection is initialized and populated
        parsed.branches = parsed.branches || [];
        if (parsed.branches.length === 0) {
          parsed.branches = [
            {
              id: 'branch_main',
              name: 'الفرع الرئيسي - بغداد',
              code: 'BGD-01',
              address: 'بغداد - المنصور',
              phone: '07801234567',
              managerName: 'مدير النظام',
              canViewOtherBranches: true, // الفرع الرئيسي يرى كافة الفروع
              isActive: true,
              createdAt: new Date().toISOString(),
            },
            {
              id: 'branch_basra',
              name: 'فرع البصرة',
              code: 'BSR-02',
              address: 'البصرة - شارع الجزائر',
              phone: '07709876543',
              managerName: 'علي حسن',
              canViewOtherBranches: false, // لا يرى الفروع الأخرى
              isActive: true,
              createdAt: new Date().toISOString(),
            },
            {
              id: 'branch_erbil',
              name: 'فرع أربيل',
              code: 'ERB-03',
              address: 'أربيل - شارع 60 متري',
              phone: '07501122334',
              managerName: 'كاروان أحمد',
              canViewOtherBranches: false, // لا يرى الفروع الأخرى
              isActive: true,
              createdAt: new Date().toISOString(),
            },
          ];
        }

        const defaultBranch = parsed.branches[0];

        // Ensure users have branchId
        (parsed.users || []).forEach((u: any) => {
          if (!u.branchId) {
            u.branchId = defaultBranch.id;
            u.branchName = defaultBranch.name;
          }
        });

        // Ensure clients have branchId
        (parsed.clients || []).forEach((c: any) => {
          if (!c.branchId) {
            c.branchId = defaultBranch.id;
            c.branchName = defaultBranch.name;
          }
        });

        // Ensure appointments have branchId
        (parsed.appointments || []).forEach((apt: any) => {
          if (!apt.branchId) {
            apt.branchId = defaultBranch.id;
            apt.branchName = defaultBranch.name;
          }
        });

        // Ensure currency is Iraqi Dinar
        if (parsed.settings) {
          parsed.settings.currency = 'د.ع';
          if (!parsed.settings.defaultBranchId) {
            parsed.settings.defaultBranchId = defaultBranch.id;
          }
          if (!parsed.settings.businessName || parsed.settings.businessName.includes('الأقساط')) {
            parsed.settings.businessName = 'نظام طابور المواعيد والتحصيل';
          }
        }

        return parsed;
      }
    } catch (err) {
      console.error('Error reading database file, initializing fresh:', err);
    }

    const initial = getInitialData();
    this.saveToDisk(initial);
    return initial;
  }

  private saveToDisk(dataToSave: DatabaseSchema) {
    try {
      this.ensureDirectory();
      const tempPath = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(dataToSave, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Error writing database to disk:', err);
    }
  }

  public get(): DatabaseSchema {
    return this.data;
  }

  public update(updater: (db: DatabaseSchema) => void): DatabaseSchema {
    updater(this.data);
    this.saveToDisk(this.data);
    return this.data;
  }
}

export const db = new Database();
