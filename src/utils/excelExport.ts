import * as XLSX from 'xlsx';
import { Appointment } from '../types';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

const statusArabicMap: Record<string, string> = {
  today: 'مستحق اليوم',
  waiting: 'بانتظار الموعد',
  overdue: 'متأخر عن الموعد',
  paid: 'مسدد بالكامل',
  referred_to_guarantor: 'محال للكفيل الضامن',
  postponed: 'مؤجل',
  no_answer: 'لا يوجد رد',
  phone_off: 'مغلق / لا يمكن الوصول',
  refused: 'ممتنع عن السداد',
};

const priorityArabicMap: Record<string, string> = {
  urgent: 'عاجل جداً',
  important: 'مهم',
  normal: 'عادي',
};

export function exportAppointmentsToExcel(
  appointments: Appointment[],
  currency: string = 'د.ع',
  filename?: string
) {
  // Format rows for Excel
  const data = appointments.map((apt, index) => {
    const remaining = Math.max(0, apt.requiredAmount - (apt.paidAmount || 0));
    const statusText = statusArabicMap[apt.status] || apt.status;
    const priorityText = priorityArabicMap[apt.priority] || apt.priority;

    let alertText = 'بدون تنبيه';
    if (apt.scheduledAlert) {
      alertText = apt.scheduledAlert.isTriggered ? 'تم إطلاق التنبيه' : 'مجدول ونشط';
    }

    return {
      'ت': index + 1,
      'رقم الطابور': apt.queueNumber || index + 1,
      'اسم الزبون (العميل)': apt.clientName || '—',
      'رقم هاتف الزبون': apt.clientPhone || '—',
      'اسم الكفيل الضامن': apt.guarantorName || '—',
      'رقم هاتف الكفيل': apt.guarantorPhone || '—',
      'الفرع': apt.branchName || 'الفرع الرئيسي',
      'المبلغ المطلوب': apt.requiredAmount,
      'المبلغ المسدد': apt.paidAmount || 0,
      'المبلغ المتبقي': remaining,
      'العملة': currency,
      'تاريخ الموعد': apt.appointmentDate || '—',
      'وقت الموعد': apt.appointmentTime || '—',
      'حالة الموعد': statusText,
      'الأولوية': priorityText,
      'تاريخ الموعد الأصلي': apt.originalAppointmentDate || apt.appointmentDate || '—',
      'عدد مرات التأجيل': apt.postponementCount || 0,
      'حالة التنبيه المجدول': alertText,
      'ملاحظات': apt.notes || '—',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 5 },  // ت
    { wch: 12 }, // رقم الطابور
    { wch: 25 }, // اسم الزبون
    { wch: 16 }, // هاتف الزبون
    { wch: 25 }, // اسم الكفيل
    { wch: 16 }, // هاتف الكفيل
    { wch: 20 }, // الفرع
    { wch: 15 }, // المبلغ المطلوب
    { wch: 15 }, // المبلغ المسدد
    { wch: 15 }, // المبلغ المتبقي
    { wch: 8 },  // العملة
    { wch: 14 }, // تاريخ الموعد
    { wch: 10 }, // وقت الموعد
    { wch: 18 }, // الحالة
    { wch: 12 }, // الأولوية
    { wch: 16 }, // الموعد الأصلي
    { wch: 14 }, // مرات التأجيل
    { wch: 18 }, // التنبيه المجدول
    { wch: 35 }, // ملاحظات
  ];

  // Set RTL direction on sheet view if supported
  if (!worksheet['!views']) {
    worksheet['!views'] = [{ RTL: true }];
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'طابور المواعيد');

  const dateStr = new Date().toISOString().split('T')[0];
  const finalFileName = filename || `طابور_المواعيد_والتحصيل_${dateStr}.xlsx`;

  XLSX.writeFile(workbook, finalFileName);
}

export function exportBranchesToExcel(branches: any[], filename?: string) {
  const data = branches.map((b, idx) => ({
    'ت': idx + 1,
    'اسم الفرع': b.name,
    'رمز الفرع': b.code,
    'مدير الفرع': b.managerName || '—',
    'هاتف الفرع': b.phone || '—',
    'عنوان الفرع': b.address || '—',
    'صلاحية رؤية الفروع الأخرى': b.canViewOtherBranches ? 'مفعلة (يرى الكل)' : 'معطلة (فرع مستقل)',
    'ملاحظات': b.notes || '—',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 5 },
    { wch: 25 },
    { wch: 12 },
    { wch: 20 },
    { wch: 16 },
    { wch: 30 },
    { wch: 26 },
    { wch: 30 },
  ];
  if (!worksheet['!views']) {
    worksheet['!views'] = [{ RTL: true }];
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'قائمة الفروع');
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, filename || `دليل_الفروع_${dateStr}.xlsx`);
}

export function exportStaffToExcel(staffList: any[], filename?: string) {
  const roleMap: Record<string, string> = {
    admin: 'مدير نظام عام',
    branch_manager: 'مدير فرع',
    agent: 'موظف / محصل',
  };

  const data = staffList.map((u, idx) => ({
    'ت': idx + 1,
    'اسم الموظف': u.name,
    'اسم المستخدم': u.username,
    'البريد الإلكتروني': u.email || '—',
    'رقم الهاتف': u.phone || '—',
    'الدور الوظيفي': roleMap[u.role] || u.role,
    'الفرع التابع له': u.branchName || 'الفرع الرئيسي',
    'استثناء رؤية الفروع الأخرى': u.canViewOtherBranchesOverride === true
      ? 'ممنوح استثناء (يرى الكل)'
      : u.canViewOtherBranchesOverride === false
      ? 'مقيد (حسب إعداد الفرع)'
      : 'تلقائي حسب الفرع',
    'حالة الحساب': u.isActive === false ? 'معطل' : 'نشط',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 5 },
    { wch: 24 },
    { wch: 18 },
    { wch: 25 },
    { wch: 16 },
    { wch: 18 },
    { wch: 22 },
    { wch: 26 },
    { wch: 14 },
  ];
  if (!worksheet['!views']) {
    worksheet['!views'] = [{ RTL: true }];
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'حسابات الموظفين');
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, filename || `سجل_الموظفين_${dateStr}.xlsx`);
}

