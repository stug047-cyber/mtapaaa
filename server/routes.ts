import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import {
  db,
  hashPassword,
  verifyPassword,
  createAuthToken,
  verifyAuthToken,
  Client,
  Appointment,
  AppointmentStatus,
  ScheduledAlertInfo,
  Installment,
  Payment,
  User,
  UserPermissions,
  CallLog,
  CallResultType,
  InstallmentStatus,
  Guarantor,
  PostponementRecord,
  upsertGuarantor,
  Branch,
} from './db.ts';
import { runScheduledNotificationJob } from './cron.ts';

export const apiRouter = express.Router();

// Middleware for authentication
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    name?: string;
    email: string;
    username: string;
    role: string;
    branchId?: string;
    branchName?: string;
    canViewOtherBranchesOverride?: boolean;
    permissions?: UserPermissions;
  };
}

export function canUserViewOtherBranches(user: AuthRequest['user'], database: any): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.canViewOtherBranchesOverride === true) return true;
  if (!user.branchId) return true;
  const userBranch = (database.branches || []).find((b: any) => b.id === user.branchId);
  return userBranch ? !!userBranch.canViewOtherBranches : false;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'غير مصرح بالدخول، يرجى تسجيل الدخول أولاً' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyAuthToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً' });
  }

  req.user = decoded;
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'عذراً، هذه الخاصية مخصصة لمدير النظام فقط' });
  }
  next();
}

export function requirePermission(permission: keyof UserPermissions) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'غير مصرح بالدخول' });
    }
    if (req.user.role === 'admin') {
      return next();
    }
    const perms = req.user.permissions;
    if (!perms || !perms[permission]) {
      return res.status(403).json({ error: 'عذراً، لا تمتلك الصلاحية الكافية لإتمام هذه العملية' });
    }
    next();
  };
}

// ================= AUTH ROUTES =================

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'يرجى إدخال اسم المستخدم أو البريد الإلكتروني وكلمة المرور' });
  }

  const data = db.get();
  const trimmed = identifier.trim().toLowerCase();
  const user = data.users.find(
    (u) => u.email.toLowerCase() === trimmed || u.username.toLowerCase() === trimmed
  );

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'بيانات تسجيل الدخول غير صحيحة، تأكد من اسم المستخدم وكلمة المرور' });
  }

  const token = createAuthToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      branchId: user.branchId,
      branchName: user.branchName,
      phone: user.phone,
      canViewOtherBranchesOverride: user.canViewOtherBranchesOverride,
      permissions: user.permissions || {
        canRecordCalls: true,
        canRecordPayments: true,
        canEditClients: true,
        canDeleteClients: user.role === 'admin',
        canViewReports: true,
        canExportData: true,
        canManageBranches: user.role === 'admin',
      },
    },
  });
});

apiRouter.get('/auth/me', requireAuth, (req: AuthRequest, res: Response) => {
  const data = db.get();
  const user = data.users.find((u) => u.id === req.user?.userId);
  if (!user) {
    return res.status(404).json({ error: 'المستخدم غير موجود' });
  }

  // Get user's branch info
  const userBranch = (data.branches || []).find((b) => b.id === user.branchId);

  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      branchId: user.branchId,
      branchName: userBranch ? userBranch.name : user.branchName,
      phone: user.phone,
      canViewOtherBranchesOverride: user.canViewOtherBranchesOverride,
      canViewOtherBranches: canUserViewOtherBranches(user as any, data),
      permissions: user.permissions || {
        canRecordCalls: true,
        canRecordPayments: true,
        canEditClients: true,
        canDeleteClients: user.role === 'admin',
        canViewReports: true,
        canExportData: true,
        canManageBranches: user.role === 'admin',
      },
    },
  });
});

// ================= BRANCHES MANAGEMENT (إدارة الفروع) =================

apiRouter.get('/branches', requireAuth, (_req: AuthRequest, res: Response) => {
  const data = db.get();
  const branches = data.branches || [];

  const enriched = branches.map((b) => {
    const employeesCount = (data.users || []).filter((u) => u.branchId === b.id).length;
    const appointmentsCount = (data.appointments || []).filter((a) => a.branchId === b.id).length;
    const clientsCount = (data.clients || []).filter((c) => c.branchId === b.id).length;
    return {
      ...b,
      employeesCount,
      appointmentsCount,
      clientsCount,
    };
  });

  res.json({ branches: enriched });
});

apiRouter.post('/branches', requireAuth, requireAdmin, (req: AuthRequest, res: Response) => {
  const { name, code, address, phone, managerName, canViewOtherBranches, notes } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'يرجى إدخال اسم الفرع' });
  }

  const cleanName = name.trim();
  const cleanCode = (code || `BR-${Date.now().toString().slice(-4)}`).trim().toUpperCase();

  const data = db.get();
  const exists = (data.branches || []).some(
    (b) => b.name.toLowerCase() === cleanName.toLowerCase() || b.code === cleanCode
  );

  if (exists) {
    return res.status(400).json({ error: 'اسم الفرع أو الكود مسجل مسبقاً' });
  }

  const newBranch: Branch = {
    id: `branch_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    name: cleanName,
    code: cleanCode,
    address: address?.trim(),
    phone: phone?.trim(),
    managerName: managerName?.trim(),
    canViewOtherBranches: !!canViewOtherBranches,
    isActive: true,
    notes: notes?.trim(),
    createdAt: new Date().toISOString(),
  };

  db.update((database) => {
    database.branches = database.branches || [];
    database.branches.push(newBranch);
  });

  res.status(201).json({
    branch: newBranch,
    message: `تم إنشاء الفرع (${cleanName}) بنجاح`,
  });
});

apiRouter.put('/branches/:id', requireAuth, requireAdmin, (req: AuthRequest, res: Response) => {
  const targetId = req.params.id;
  const { name, code, address, phone, managerName, canViewOtherBranches, isActive, notes } = req.body;

  let updatedBranch: Branch | null = null;
  db.update((database) => {
    database.branches = database.branches || [];
    const idx = database.branches.findIndex((b) => b.id === targetId);
    if (idx === -1) return;

    const b = database.branches[idx];
    const oldName = b.name;
    if (name) b.name = name.trim();
    if (code) b.code = code.trim().toUpperCase();
    if (address !== undefined) b.address = address.trim();
    if (phone !== undefined) b.phone = phone.trim();
    if (managerName !== undefined) b.managerName = managerName.trim();
    if (canViewOtherBranches !== undefined) b.canViewOtherBranches = !!canViewOtherBranches;
    if (isActive !== undefined) b.isActive = !!isActive;
    if (notes !== undefined) b.notes = notes.trim();
    b.updatedAt = new Date().toISOString();
    updatedBranch = b;

    // If branch name changed, update across all associated records
    if (name && oldName !== b.name) {
      (database.users || []).forEach((u) => {
        if (u.branchId === b.id) u.branchName = b.name;
      });
      (database.appointments || []).forEach((apt) => {
        if (apt.branchId === b.id) apt.branchName = b.name;
      });
      (database.clients || []).forEach((c) => {
        if (c.branchId === b.id) c.branchName = b.name;
      });
    }
  });

  if (!updatedBranch) {
    return res.status(404).json({ error: 'الفرع غير موجود' });
  }

  res.json({
    branch: updatedBranch,
    message: 'تم تحديث بيانات الفرع وصلاحياته بنجاح',
  });
});

apiRouter.patch('/branches/:id/toggle-visibility', requireAuth, requireAdmin, (req: AuthRequest, res: Response) => {
  let updatedBranch: Branch | null = null;
  db.update((database) => {
    database.branches = database.branches || [];
    const b = database.branches.find((br) => br.id === req.params.id);
    if (!b) return;
    b.canViewOtherBranches = !b.canViewOtherBranches;
    b.updatedAt = new Date().toISOString();
    updatedBranch = b;
  });

  if (!updatedBranch) {
    return res.status(404).json({ error: 'الفرع غير موجود' });
  }

  const safeBranch = updatedBranch as Branch;
  res.json({
    branch: safeBranch,
    message: safeBranch.canViewOtherBranches
      ? `تم السماح لموظفي (${safeBranch.name}) برؤية الفروع الأخرى`
      : `تم إلغاء رؤية الفروع وتقييد موظفي (${safeBranch.name}) ببيانات فرعهم فقط`,
  });
});

apiRouter.delete('/branches/:id', requireAuth, requireAdmin, (req: AuthRequest, res: Response) => {
  const targetId = req.params.id;
  const data = db.get();
  const branches = data.branches || [];

  if (branches.length <= 1) {
    return res.status(400).json({ error: 'لا يمكن حذف الفرع الوحيد في النظام' });
  }

  const target = branches.find((b) => b.id === targetId);
  if (!target) {
    return res.status(404).json({ error: 'الفرع غير موجود' });
  }

  const otherBranch = branches.find((b) => b.id !== target.id)!;

  db.update((database) => {
    database.branches = (database.branches || []).filter((b) => b.id !== targetId);
    // Reassign records
    (database.users || []).forEach((u) => {
      if (u.branchId === targetId) {
        u.branchId = otherBranch.id;
        u.branchName = otherBranch.name;
      }
    });
    (database.appointments || []).forEach((a) => {
      if (a.branchId === targetId) {
        a.branchId = otherBranch.id;
        a.branchName = otherBranch.name;
      }
    });
    (database.clients || []).forEach((c) => {
      if (c.branchId === targetId) {
        c.branchId = otherBranch.id;
        c.branchName = otherBranch.name;
      }
    });
  });

  res.json({
    message: `تم حذف (${target.name}) وإعادة توجيه البيانات المرتبطة إلى (${otherBranch.name})`,
  });
});

// ================= EMPLOYEE / USER MANAGEMENT (ADMIN ONLY) =================

apiRouter.get('/users', requireAuth, requireAdmin, (_req: AuthRequest, res: Response) => {
  const data = db.get();
  const users = data.users.map((u) => {
    const branch = (data.branches || []).find((b) => b.id === u.branchId);
    return {
      id: u.id,
      username: u.username,
      email: u.email,
      name: u.name,
      role: u.role,
      branchId: u.branchId,
      branchName: branch ? branch.name : u.branchName,
      phone: u.phone,
      isActive: u.isActive !== false,
      canViewOtherBranchesOverride: u.canViewOtherBranchesOverride,
      permissions: u.permissions || {
        canRecordCalls: true,
        canRecordPayments: true,
        canEditClients: true,
        canDeleteClients: u.role === 'admin',
        canChangeStatus: true,
        canViewReports: true,
        canExportData: true,
      },
      createdAt: u.createdAt,
    };
  });
  res.json({ users });
});

apiRouter.post('/users', requireAuth, requireAdmin, (req: AuthRequest, res: Response) => {
  const { username, email, password, name, role, permissions, branchId, phone, canViewOtherBranchesOverride } = req.body;
  if (!username || !email || !password || !name) {
    return res.status(400).json({ error: 'يرجى تعبئة كافة الحقول المطلوبة للموظف' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: 'كلمة المرور يجب أن لا تقل عن 4 خانات' });
  }

  const data = db.get();
  const exists = data.users.some(
    (u) =>
      u.email.toLowerCase() === email.trim().toLowerCase() ||
      u.username.toLowerCase() === username.trim().toLowerCase()
  );

  if (exists) {
    return res.status(400).json({ error: 'اسم المستخدم أو البريد الإلكتروني مسجل مسبقاً لموظف آخر' });
  }

  const assignedBranch = (data.branches || []).find((b) => b.id === branchId) || data.branches?.[0];

  const defaultPerms: UserPermissions = {
    canRecordCalls: permissions?.canRecordCalls !== false,
    canRecordPayments: permissions?.canRecordPayments !== false,
    canEditClients: permissions?.canEditClients !== false,
    canDeleteClients: permissions?.canDeleteClients === true || role === 'admin',
    canChangeStatus: permissions?.canChangeStatus !== false,
    canAddAppointment: permissions?.canAddAppointment !== false,
    canEditAppointment: permissions?.canEditAppointment !== false,
    canDeleteAppointment: permissions?.canDeleteAppointment === true || role === 'admin',
    canScheduleAlerts: permissions?.canScheduleAlerts !== false,
    canViewReports: permissions?.canViewReports !== false,
    canExportData: permissions?.canExportData !== false,
    canManageBranches: role === 'admin',
  };

  const newEmployee: User = {
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    username: username.trim(),
    email: email.trim(),
    passwordHash: hashPassword(password),
    name: name.trim(),
    role: role === 'admin' ? 'admin' : (role === 'branch_manager' ? 'branch_manager' : 'agent'),
    branchId: assignedBranch?.id,
    branchName: assignedBranch?.name,
    phone: phone?.trim(),
    isActive: true,
    canViewOtherBranchesOverride: canViewOtherBranchesOverride !== undefined ? !!canViewOtherBranchesOverride : undefined,
    permissions: defaultPerms,
    createdAt: new Date().toISOString(),
  };

  db.update((database) => {
    database.users.push(newEmployee);
  });

  res.status(201).json({
    message: 'تم إنشاء حساب الموظف وتحديد فرعه وصلاحياته بنجاح',
    user: {
      id: newEmployee.id,
      username: newEmployee.username,
      email: newEmployee.email,
      name: newEmployee.name,
      role: newEmployee.role,
      branchId: newEmployee.branchId,
      branchName: newEmployee.branchName,
      phone: newEmployee.phone,
      permissions: newEmployee.permissions,
      createdAt: newEmployee.createdAt,
    },
  });
});

apiRouter.put('/users/:id', requireAuth, requireAdmin, (req: AuthRequest, res: Response) => {
  const targetId = req.params.id;
  const { name, role, permissions, password, branchId, phone, isActive, canViewOtherBranchesOverride } = req.body;

  let updatedUser: User | null = null;
  db.update((database) => {
    const idx = database.users.findIndex((u) => u.id === targetId);
    if (idx === -1) return;

    const u = database.users[idx];
    if (name) u.name = name.trim();
    if (role && (role === 'admin' || role === 'agent' || role === 'branch_manager')) u.role = role;
    if (phone !== undefined) u.phone = phone.trim();
    if (isActive !== undefined) u.isActive = !!isActive;
    if (canViewOtherBranchesOverride !== undefined) u.canViewOtherBranchesOverride = !!canViewOtherBranchesOverride;

    if (branchId) {
      const b = (database.branches || []).find((br) => br.id === branchId);
      if (b) {
        u.branchId = b.id;
        u.branchName = b.name;
      }
    }

    if (permissions) {
      u.permissions = {
        canRecordCalls: permissions.canRecordCalls !== undefined ? !!permissions.canRecordCalls : true,
        canRecordPayments: permissions.canRecordPayments !== undefined ? !!permissions.canRecordPayments : true,
        canEditClients: permissions.canEditClients !== undefined ? !!permissions.canEditClients : true,
        canDeleteClients: permissions.canDeleteClients !== undefined ? !!permissions.canDeleteClients : false,
        canChangeStatus: permissions.canChangeStatus !== undefined ? !!permissions.canChangeStatus : true,
        canAddAppointment: permissions.canAddAppointment !== undefined ? !!permissions.canAddAppointment : true,
        canEditAppointment: permissions.canEditAppointment !== undefined ? !!permissions.canEditAppointment : true,
        canDeleteAppointment: permissions.canDeleteAppointment !== undefined ? !!permissions.canDeleteAppointment : false,
        canScheduleAlerts: permissions.canScheduleAlerts !== undefined ? !!permissions.canScheduleAlerts : true,
        canViewReports: permissions.canViewReports !== undefined ? !!permissions.canViewReports : true,
        canExportData: permissions.canExportData !== undefined ? !!permissions.canExportData : true,
        canManageBranches: permissions.canManageBranches !== undefined ? !!permissions.canManageBranches : (u.role === 'admin'),
      };
    }
    if (password && password.length >= 4) {
      u.passwordHash = hashPassword(password);
    }
    updatedUser = u;
  });

  if (!updatedUser) {
    return res.status(404).json({ error: 'المستخدم غير موجود' });
  }

  const safeUser = updatedUser as User;
  res.json({
    message: 'تم تحديث بيانات وصلاحيات الموظف وفرعه بنجاح',
    user: {
      id: safeUser.id,
      username: safeUser.username,
      email: safeUser.email,
      name: safeUser.name,
      role: safeUser.role,
      branchId: safeUser.branchId,
      branchName: safeUser.branchName,
      phone: safeUser.phone,
      isActive: safeUser.isActive,
      canViewOtherBranchesOverride: safeUser.canViewOtherBranchesOverride,
      permissions: safeUser.permissions,
    },
  });
});

apiRouter.delete('/users/:id', requireAuth, requireAdmin, (req: AuthRequest, res: Response) => {
  const targetId = req.params.id;
  if (targetId === req.user?.userId) {
    return res.status(400).json({ error: 'لا يمكنك حذف حسابك الحالي الذي تستخدمه لتسجيل الدخول' });
  }

  const data = db.get();
  const targetUser = data.users.find((u) => u.id === targetId);
  if (!targetUser) {
    return res.status(404).json({ error: 'حساب الموظف غير موجود' });
  }

  db.update((database) => {
    database.users = database.users.filter((u) => u.id !== targetId);
  });

  res.json({ message: `تم حذف حساب الموظف (${targetUser.name}) بنجاح` });
});

// ================= DASHBOARD & STATS =================

apiRouter.get('/dashboard/stats', requireAuth, (req: AuthRequest, res: Response) => {
  const data = db.get();
  const today = new Date().toISOString().split('T')[0];
  const canViewAll = canUserViewOtherBranches(req.user, data);
  const branchFilter = (req.query.branchId as string) || '';

  let appointments = data.appointments || [];
  let clientsList = data.clients || [];

  if (!canViewAll && req.user?.branchId) {
    appointments = appointments.filter((apt) => !apt.branchId || apt.branchId === req.user?.branchId);
    clientsList = clientsList.filter((c) => !c.branchId || c.branchId === req.user?.branchId);
  } else if (branchFilter && branchFilter !== 'all') {
    appointments = appointments.filter((apt) => apt.branchId === branchFilter);
    clientsList = clientsList.filter((c) => c.branchId === branchFilter);
  }

  let totalDue = 0;
  let totalPaid = 0;
  let dueTodayCount = 0;
  let overdueCount = 0;
  let waitingCount = 0;
  let paidCount = 0;

  appointments.forEach((apt) => {
    totalDue += apt.requiredAmount;
    totalPaid += (apt.paidAmount || 0);

    const remaining = Math.max(0, apt.requiredAmount - (apt.paidAmount || 0));
    if (remaining <= 0 || apt.status === 'paid') {
      paidCount++;
    } else if (apt.appointmentDate === today || apt.status === 'today') {
      dueTodayCount++;
    } else if (apt.appointmentDate < today || apt.status === 'overdue') {
      overdueCount++;
    } else {
      waitingCount++;
    }
  });

  const totalRemaining = Math.max(0, totalDue - totalPaid);

  // Today's appointments for immediate collection queue
  const todayAppointments = appointments
    .filter((apt) => apt.appointmentDate === today && (apt.requiredAmount - (apt.paidAmount || 0)) > 0)
    .sort((a, b) => (a.queueNumber || 0) - (b.queueNumber || 0));

  // Upcoming appointments in queue
  const upcomingAppointments = appointments
    .filter((apt) => (apt.requiredAmount - (apt.paidAmount || 0)) > 0)
    .sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate))
    .slice(0, 8);

  // Scheduled alerts count
  const scheduledAlertsCount = appointments.filter(
    (a) => a.scheduledAlert && !a.scheduledAlert.isTriggered
  ).length;

  // Recent 5 payments
  const recentPayments = [...data.payments]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  const unreadNotificationsCount = data.notifications.filter((n) => !n.isRead).length;

  res.json({
    totalDue,
    totalPaid,
    totalRemaining,
    collectionRate: totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0,
    dueTodayCount,
    overdueCount,
    waitingCount,
    paidCount,
    totalAppointmentsCount: appointments.length,
    totalClientsCount: clientsList.length,
    unreadNotificationsCount,
    scheduledAlertsCount,
    todayAppointments,
    upcomingPayments: upcomingAppointments.map((apt) => ({
      id: apt.id,
      clientId: apt.clientId || apt.id,
      clientName: apt.clientName,
      clientPhone: apt.clientPhone,
      guarantorName: apt.guarantorName,
      guarantorPhone: apt.guarantorPhone,
      amount: apt.requiredAmount,
      paidAmount: apt.paidAmount,
      dueDate: apt.appointmentDate,
      status: apt.status as any,
      notes: apt.notes,
      createdAt: apt.createdAt,
      updatedAt: apt.updatedAt,
    })),
    upcomingAppointments,
    recentPayments,
    currency: data.settings.currency || 'د.ع',
  });
});

// ================= CLIENTS (أصحاب المواعيد) =================

apiRouter.get('/clients', requireAuth, (req: AuthRequest, res: Response) => {
  const data = db.get();
  const search = ((req.query.search as string) || '').trim().toLowerCase();
  const branchFilter = (req.query.branchId as string) || '';
  const canViewAll = canUserViewOtherBranches(req.user, data);
  const today = new Date().toISOString().split('T')[0];

  let rawClients = data.clients || [];
  if (!canViewAll && req.user?.branchId) {
    rawClients = rawClients.filter((c) => !c.branchId || c.branchId === req.user?.branchId);
  } else if (branchFilter && branchFilter !== 'all') {
    rawClients = rawClients.filter((c) => c.branchId === branchFilter);
  }

  let clients = rawClients.map((client) => {
    const clientInstallments = data.installments.filter((inst) => inst.clientId === client.id);
    let totalInstallments = 0;
    let paidAmount = 0;
    let hasOverdue = false;

    // Find next due date among unpaid
    const upcomingUnpaid = clientInstallments
      .filter((inst) => inst.amount - (inst.paidAmount || 0) > 0)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    clientInstallments.forEach((inst) => {
      totalInstallments += inst.amount;
      paidAmount += (inst.paidAmount || 0);
      if (inst.amount - (inst.paidAmount || 0) > 0 && (inst.dueDate < today || inst.status === 'overdue')) {
        hasOverdue = true;
      }
    });

    const remainingAmount = Math.max(0, totalInstallments - paidAmount);
    let status: 'completed' | 'active' | 'overdue' = 'active';

    if (clientInstallments.length === 0) {
      status = 'active';
    } else if (remainingAmount === 0) {
      status = 'completed';
    } else if (hasOverdue) {
      status = 'overdue';
    } else {
      status = 'active';
    }

    const nextDueDate = upcomingUnpaid.length > 0 ? upcomingUnpaid[0].dueDate : null;

    return {
      ...client,
      totalInstallments,
      paidAmount,
      remainingAmount,
      nextDueDate,
      installmentsCount: clientInstallments.length,
      status,
    };
  });

  if (search) {
    clients = clients.filter(
      (c) =>
        c.name.toLowerCase().includes(search) ||
        c.phone.includes(search) ||
        (c.nationalId && c.nationalId.includes(search))
    );
  }

  // Sort by name
  clients.sort((a, b) => a.name.localeCompare(b.name, 'ar'));

  res.json({ clients, currency: data.settings.currency });
});

apiRouter.get('/clients/:id', requireAuth, (req: AuthRequest, res: Response) => {
  const data = db.get();
  const client = data.clients.find((c) => c.id === req.params.id);
  if (!client) {
    return res.status(404).json({ error: 'صاحب الموعد غير موجود' });
  }

  const clientInstallments = data.installments
    .filter((inst) => inst.clientId === client.id)
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate));

  const clientPayments = data.payments
    .filter((p) => p.clientId === client.id)
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

  const clientCalls = (data.calls || [])
    .filter((call) => call.clientId === client.id)
    .sort((a, b) => b.callDate.localeCompare(a.callDate));

  let totalAmount = 0;
  let totalPaid = 0;
  clientInstallments.forEach((inst) => {
    totalAmount += inst.amount;
    totalPaid += (inst.paidAmount || 0);
  });

  res.json({
    client,
    installments: clientInstallments,
    payments: clientPayments,
    calls: clientCalls,
    summary: {
      totalAmount,
      totalPaid,
      totalRemaining: Math.max(0, totalAmount - totalPaid),
      currency: data.settings.currency,
    },
  });
});

apiRouter.post('/clients', requireAuth, requirePermission('canEditClients'), (req: AuthRequest, res: Response) => {
  const {
    name,
    phone,
    nationalId,
    email,
    address,
    notes,
    guarantorName,
    guarantorPhone,
    guarantorRelation,
    guarantorNationalId,
    guarantorAddress,
    totalDebt,
    initialDueDate,
  } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'يرجى إدخال اسم صاحب الموعد ورقم هاتفه' });
  }

  const data = db.get();
  const existingPhone = data.clients.find((c) => c.phone.trim() === phone.trim());
  if (existingPhone) {
    return res.status(400).json({
      error: 'رقم الهاتف مسجل بالفعل لصاحب الموعد: ' + existingPhone.name,
      existingClient: existingPhone,
    });
  }

  const parsedDebt = Number(totalDebt) || 0;
  const today = new Date().toISOString().split('T')[0];
  const dueDate = initialDueDate || today;

  const newClient: Client = {
    id: `client_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    name: name.trim(),
    phone: phone.trim(),
    nationalId: nationalId ? nationalId.trim() : undefined,
    email: email ? email.trim() : undefined,
    address: address ? address.trim() : undefined,
    notes: notes ? notes.trim() : undefined,
    guarantorName: guarantorName ? guarantorName.trim() : undefined,
    guarantorPhone: guarantorPhone ? guarantorPhone.trim() : undefined,
    guarantorRelation: guarantorRelation ? guarantorRelation.trim() : undefined,
    guarantorNationalId: guarantorNationalId ? guarantorNationalId.trim() : undefined,
    guarantorAddress: guarantorAddress ? guarantorAddress.trim() : undefined,
    totalDebt: parsedDebt,
    createdAt: new Date().toISOString(),
  };

  db.update((database) => {
    database.clients.push(newClient);

    // Automatically store and index guarantor info
    if (newClient.guarantorName) {
      upsertGuarantor(database, {
        name: newClient.guarantorName,
        phone: newClient.guarantorPhone || '',
        relation: newClient.guarantorRelation,
        address: newClient.guarantorAddress,
        nationalId: newClient.guarantorNationalId,
      });
    }

    // If debt amount was entered with client, automatically initialize installment
    if (parsedDebt > 0) {
      const initialInstallment: Installment = {
        id: `inst_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        clientId: newClient.id,
        clientName: newClient.name,
        clientPhone: newClient.phone,
        guarantorName: newClient.guarantorName,
        guarantorPhone: newClient.guarantorPhone,
        amount: parsedDebt,
        paidAmount: 0,
        dueDate,
        status: dueDate < today ? 'overdue' : 'unpaid',
        notes: 'تم تسجيل المبلغ عند فتح ملف الزبون والكفيل',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      database.installments.push(initialInstallment);
    }
  });

  runScheduledNotificationJob();

  res.status(201).json({ client: newClient, message: 'تم حفظ بيانات الزبون والكفيل بنجاح' });
});

apiRouter.put('/clients/:id', requireAuth, requirePermission('canEditClients'), (req: AuthRequest, res: Response) => {
  const {
    name,
    phone,
    nationalId,
    email,
    address,
    notes,
    guarantorName,
    guarantorPhone,
    guarantorRelation,
    guarantorNationalId,
    guarantorAddress,
  } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'يرجى إدخال الاسم ورقم الهاتف' });
  }

  let updatedClient: Client | null = null;

  db.update((database) => {
    const idx = database.clients.findIndex((c) => c.id === req.params.id);
    if (idx === -1) return;

    database.clients[idx] = {
      ...database.clients[idx],
      name: name.trim(),
      phone: phone.trim(),
      nationalId: nationalId ? nationalId.trim() : undefined,
      email: email ? email.trim() : undefined,
      address: address ? address.trim() : undefined,
      notes: notes ? notes.trim() : undefined,
      guarantorName: guarantorName ? guarantorName.trim() : undefined,
      guarantorPhone: guarantorPhone ? guarantorPhone.trim() : undefined,
      guarantorRelation: guarantorRelation ? guarantorRelation.trim() : undefined,
      guarantorNationalId: guarantorNationalId ? guarantorNationalId.trim() : undefined,
      guarantorAddress: guarantorAddress ? guarantorAddress.trim() : undefined,
    };
    updatedClient = database.clients[idx];

    // Automatically store and index guarantor info
    if (guarantorName && guarantorName.trim()) {
      upsertGuarantor(database, {
        name: guarantorName.trim(),
        phone: (guarantorPhone || '').trim(),
        relation: guarantorRelation ? guarantorRelation.trim() : undefined,
        address: guarantorAddress ? guarantorAddress.trim() : undefined,
        nationalId: guarantorNationalId ? guarantorNationalId.trim() : undefined,
      });
    }

    // Sync client name, phone and guarantor to appointments
    (database.appointments || []).forEach((apt) => {
      if (apt.clientId === req.params.id || apt.clientPhone === phone.trim()) {
        apt.clientName = name.trim();
        apt.clientPhone = phone.trim();
        if (guarantorName) apt.guarantorName = guarantorName.trim();
        if (guarantorPhone) apt.guarantorPhone = guarantorPhone.trim();
      }
    });

    // Sync client name, phone and guarantor to installments & payments & calls
    database.installments.forEach((inst) => {
      if (inst.clientId === req.params.id) {
        inst.clientName = name.trim();
        inst.clientPhone = phone.trim();
        inst.guarantorName = guarantorName ? guarantorName.trim() : undefined;
        inst.guarantorPhone = guarantorPhone ? guarantorPhone.trim() : undefined;
      }
    });

    database.payments.forEach((p) => {
      if (p.clientId === req.params.id) {
        p.clientName = name.trim();
      }
    });

    if (database.calls) {
      database.calls.forEach((c) => {
        if (c.clientId === req.params.id) {
          c.clientName = name.trim();
          c.clientPhone = phone.trim();
          c.guarantorName = guarantorName ? guarantorName.trim() : undefined;
          c.guarantorPhone = guarantorPhone ? guarantorPhone.trim() : undefined;
        }
      });
    }
  });

  if (!updatedClient) {
    return res.status(404).json({ error: 'صاحب الموعد غير موجود' });
  }

  res.json({ client: updatedClient, message: 'تم تحديث بيانات الزبون والكفيل بنجاح' });
});

apiRouter.delete('/clients/:id', requireAuth, requirePermission('canDeleteClients'), (req: AuthRequest, res: Response) => {
  const data = db.get();
  const client = data.clients.find((c) => c.id === req.params.id);
  if (!client) {
    return res.status(404).json({ error: 'صاحب الموعد غير موجود' });
  }

  db.update((database) => {
    database.clients = database.clients.filter((c) => c.id !== req.params.id);
    database.installments = database.installments.filter((inst) => inst.clientId !== req.params.id);
    database.payments = database.payments.filter((p) => p.clientId !== req.params.id);
    database.notifications = database.notifications.filter((n) => n.clientId !== req.params.id);
    if (database.calls) {
      database.calls = database.calls.filter((c) => c.clientId !== req.params.id);
    }
  });

  res.json({ message: 'تم حذف صاحب الموعد وكافة سجلات الاتصالات والمدفوعات المرتبطة به بنجاح' });
});

// ================= CALL FOLLOW-UPS & PROMISES (متابعة الاتصالات ومواعيد السداد) =================

apiRouter.get('/clients/:id/calls', requireAuth, (req: AuthRequest, res: Response) => {
  const data = db.get();
  const clientCalls = (data.calls || [])
    .filter((c) => c.clientId === req.params.id)
    .sort((a, b) => b.callDate.localeCompare(a.callDate));
  res.json({ calls: clientCalls });
});

apiRouter.post('/clients/:id/calls', requireAuth, requirePermission('canRecordCalls'), (req: AuthRequest, res: Response) => {
  const { result, promisedDate, promisedAmount, notes } = req.body;
  if (!result) {
    return res.status(400).json({ error: 'يرجى تحديد نتيجة الاتصال' });
  }

  const data = db.get();
  const client = data.clients.find((c) => c.id === req.params.id);
  if (!client) {
    return res.status(404).json({ error: 'صاحب الموعد غير موجود' });
  }

  const resultLabels: Record<string, string> = {
    promised: 'وعد بالسداد (انطاني موعد)',
    no_answer: 'لا يرد',
    phone_off: 'الهاتف مغلق / خارج التغطية',
    wrong_number: 'الرقم غير صحيح',
    asked_to_call_later: 'طلب الاتصال لاحقاً',
    postponed: 'تم تأجيل الموعد',
    excuse: 'لديه عذر / ظرف',
    refused: 'ممتنع / رافض للدفع',
    referred_to_guarantor: 'محال إلى الكفيل',
    paid_already: 'يدعي السداد',
    other: 'أخرى',
  };

  const newCall: CallLog = {
    id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    clientId: client.id,
    clientName: client.name,
    clientPhone: client.phone,
    guarantorName: client.guarantorName,
    guarantorPhone: client.guarantorPhone,
    callerUserId: req.user?.userId || 'unknown',
    callerName: req.user?.name || req.user?.username || 'الموظف',
    callDate: new Date().toISOString(),
    result: result as CallResultType,
    resultLabel: resultLabels[result] || result,
    promisedDate: promisedDate || undefined,
    promisedAmount: promisedAmount ? Number(promisedAmount) : undefined,
    notes: notes ? notes.trim() : undefined,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  db.update((database) => {
    database.calls = database.calls || [];
    database.calls.unshift(newCall);

    // Update client follow-up summary
    const clientIdx = database.clients.findIndex((c) => c.id === client.id);
    if (clientIdx !== -1) {
      database.clients[clientIdx].lastCallDate = newCall.callDate;
      database.clients[clientIdx].lastCallResult = newCall.resultLabel;
      if (promisedDate) {
        database.clients[clientIdx].nextPromiseDate = promisedDate;
        database.clients[clientIdx].promiseAmount = Number(promisedAmount) || undefined;
      }
    }

    // Update the nearest unpaid installment's status based on call result
    const clientInsts = database.installments
      .filter((i) => i.clientId === client.id && (i.amount - (i.paidAmount || 0)) > 0)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    if (clientInsts.length > 0) {
      const targetInst = clientInsts[0];
      if (result === 'promised') {
        targetInst.status = 'promised';
        if (promisedDate) {
          targetInst.dueDate = promisedDate;
          targetInst.promisedDate = promisedDate;
        }
      } else if (result === 'no_answer' || result === 'phone_off') {
        targetInst.status = 'no_answer';
      } else if (result === 'postponed') {
        targetInst.status = 'postponed';
        if (promisedDate) {
          targetInst.dueDate = promisedDate;
          targetInst.promisedDate = promisedDate;
        }
      } else if (result === 'refused') {
        targetInst.status = 'refused';
      } else if (result === 'referred_to_guarantor') {
        targetInst.status = 'referred_to_guarantor';
      }
      targetInst.updatedAt = new Date().toISOString();
    }

    // Update active appointments in queue: record postponement history & new date
    const clientApts = (database.appointments || []).filter(
      (a) => (a.clientId === client.id || a.clientPhone === client.phone) && a.status !== 'paid'
    ).sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate));

    if (clientApts.length > 0) {
      const targetApt = clientApts[0];
      if (result === 'postponed' && promisedDate) {
        const prevDate = targetApt.appointmentDate;
        const prevTime = targetApt.appointmentTime || '10:00';
        if (!targetApt.originalAppointmentDate) {
          targetApt.originalAppointmentDate = prevDate;
        }
        targetApt.postponementHistory = targetApt.postponementHistory || [];
        targetApt.postponementHistory.push({
          id: `postpone_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          previousDate: prevDate,
          previousTime: prevTime,
          newDate: promisedDate,
          newTime: prevTime,
          postponedAt: new Date().toISOString(),
          postponedBy: req.user?.name || req.user?.username || 'الموظف',
          reason: notes ? notes.trim() : 'تم تأجيل الموعد أثناء الاتصال الهاتفي بالزبون',
          callResult: 'تم تأجيل الموعد',
        });
        targetApt.postponementCount = (targetApt.postponementCount || 0) + 1;
        targetApt.appointmentDate = promisedDate;
        targetApt.status = 'postponed';
        targetApt.updatedAt = new Date().toISOString();
      } else if (result === 'promised' && promisedDate) {
        targetApt.appointmentDate = promisedDate;
        targetApt.updatedAt = new Date().toISOString();
      } else if (result === 'no_answer' || result === 'phone_off') {
        targetApt.status = result;
        targetApt.updatedAt = new Date().toISOString();
      } else if (result === 'referred_to_guarantor') {
        targetApt.status = 'referred_to_guarantor';
        targetApt.updatedAt = new Date().toISOString();
      } else if (result === 'refused') {
        targetApt.status = 'refused';
        targetApt.updatedAt = new Date().toISOString();
      }
    }

    // If promise date set, create a reminder notification
    if (result === 'promised' && promisedDate) {
      database.notifications.unshift({
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        type: 'promise_due',
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        amount: Number(promisedAmount) || 0,
        dueDate: promisedDate,
        title: 'موعد سداد متفق عليه (وعد سداد)',
        message: `تم الاتفاق في اتصال هاتفي مع ${client.name} على موعد سداد بتاريخ ${promisedDate}.`,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }
  });

  runScheduledNotificationJob();

  res.status(201).json({
    message: 'تم تسجيل تفاصيل الاتصال وموعد السداد بنجاح',
    call: newCall,
  });
});

apiRouter.get('/calls', requireAuth, (_req: AuthRequest, res: Response) => {
  const data = db.get();
  const calls = (data.calls || []).sort((a, b) => b.callDate.localeCompare(a.callDate));
  res.json({ calls });
});

// ================= APPOINTMENTS QUEUE (طابور المواعيد وجدولة التنبيهات) =================

apiRouter.get('/appointments', requireAuth, (req: AuthRequest, res: Response) => {
  const data = db.get();
  const search = ((req.query.search as string) || '').trim().toLowerCase();
  const status = (req.query.status as string) || 'all';
  const priority = (req.query.priority as string) || 'all';
  const date = (req.query.date as string) || '';
  const today = new Date().toISOString().split('T')[0];
  const canViewAll = canUserViewOtherBranches(req.user, data);
  const branchFilter = (req.query.branchId as string) || '';

  let rawAppointments = data.appointments || [];
  if (!canViewAll && req.user?.branchId) {
    rawAppointments = rawAppointments.filter((apt) => !apt.branchId || apt.branchId === req.user?.branchId);
  } else if (branchFilter && branchFilter !== 'all') {
    rawAppointments = rawAppointments.filter((apt) => apt.branchId === branchFilter);
  }

  let list = rawAppointments.map((apt) => {
    const remaining = Math.max(0, apt.requiredAmount - (apt.paidAmount || 0));
    let currentStatus = apt.status;

    if (remaining <= 0) {
      currentStatus = 'paid';
    } else if (
      currentStatus !== 'postponed' &&
      currentStatus !== 'no_answer' &&
      currentStatus !== 'phone_off' &&
      currentStatus !== 'refused' &&
      currentStatus !== 'referred_to_guarantor'
    ) {
      if (apt.appointmentDate < today) {
        currentStatus = 'overdue';
      } else if (apt.appointmentDate === today) {
        currentStatus = 'today';
      } else {
        currentStatus = 'waiting';
      }
    }

    return {
      ...apt,
      status: currentStatus,
      remainingAmount: remaining,
    };
  });

  // Calculate overall stats before filters
  let totalRequired = 0;
  let totalPaid = 0;
  let todayCount = 0;
  let overdueCount = 0;
  let waitingCount = 0;
  let paidCount = 0;

  list.forEach((apt) => {
    totalRequired += apt.requiredAmount;
    totalPaid += (apt.paidAmount || 0);
    if (apt.status === 'paid') paidCount++;
    else if (apt.status === 'today') todayCount++;
    else if (apt.status === 'overdue') overdueCount++;
    else waitingCount++;
  });

  // Apply filters
  if (status && status !== 'all') {
    list = list.filter((apt) => apt.status === status);
  }

  if (priority && priority !== 'all') {
    list = list.filter((apt) => apt.priority === priority);
  }

  if (date) {
    list = list.filter((apt) => apt.appointmentDate === date);
  }

  if (search) {
    list = list.filter(
      (apt) =>
        apt.clientName.toLowerCase().includes(search) ||
        apt.clientPhone.includes(search) ||
        (apt.guarantorName && apt.guarantorName.toLowerCase().includes(search)) ||
        (apt.guarantorPhone && apt.guarantorPhone.includes(search)) ||
        (apt.notes && apt.notes.toLowerCase().includes(search))
    );
  }

  // Sort: Today first, then overdue, waiting, paid; or by queueNumber
  list.sort((a, b) => {
    // If filtering by specific status, sort by queueNumber or appointmentDate
    return (a.queueNumber || 9999) - (b.queueNumber || 9999);
  });

  res.json({
    appointments: list,
    queueStats: {
      total: rawAppointments.length,
      todayCount,
      waitingCount,
      overdueCount,
      paidCount,
      totalRequired,
      totalPaid,
      totalRemaining: Math.max(0, totalRequired - totalPaid),
    },
    currency: data.settings.currency || 'د.ع',
  });
});

apiRouter.post('/appointments', requireAuth, (req: AuthRequest, res: Response) => {
  const {
    clientName,
    clientPhone,
    guarantorName,
    guarantorPhone,
    requiredAmount,
    appointmentDate,
    appointmentTime,
    priority,
    notes,
    branchId,
    scheduledAlert,
  } = req.body;

  // Validation according to user request:
  // "يطلب الاسم رقم الهاتف اسم الكفيل رقم هاتف الكفيل المبلغ المطلوب للدفع"
  if (!clientName || !clientName.trim()) {
    return res.status(400).json({ error: 'يرجى إدخال اسم العميل (الاسم)' });
  }
  if (!clientPhone || !clientPhone.trim()) {
    return res.status(400).json({ error: 'يرجى إدخال رقم هاتف العميل' });
  }
  if (!guarantorName || !guarantorName.trim()) {
    return res.status(400).json({ error: 'يرجى إدخال اسم الكفيل' });
  }
  if (!guarantorPhone || !guarantorPhone.trim()) {
    return res.status(400).json({ error: 'يرجى إدخال رقم هاتف الكفيل' });
  }
  if (requiredAmount === undefined || Number(requiredAmount) <= 0) {
    return res.status(400).json({ error: 'يرجى إدخال المبلغ المطلوب للدفع بشكل صحيح' });
  }

  const parsedAmount = Number(requiredAmount);
  const aptDate = appointmentDate ? appointmentDate.trim() : new Date().toISOString().split('T')[0];
  const aptTime = appointmentTime ? appointmentTime.trim() : '10:00';
  const aptPriority = priority && ['normal', 'important', 'urgent'].includes(priority) ? priority : 'normal';
  const today = new Date().toISOString().split('T')[0];

  let initialStatus: AppointmentStatus = 'waiting';
  if (aptDate === today) initialStatus = 'today';
  else if (aptDate < today) initialStatus = 'overdue';

  const data = db.get();
  let createdApt: Appointment | null = null;

  db.update((database) => {
    const chosenBranchId = branchId || req.user?.branchId || database.settings?.defaultBranchId || database.branches?.[0]?.id;
    const chosenBranch = (database.branches || []).find((b: any) => b.id === chosenBranchId) || database.branches?.[0];

    // 1. Link or create client and store guarantor
    let client = database.clients.find(
      (c) => c.phone.trim() === clientPhone.trim() || c.name.trim() === clientName.trim()
    );

    if (!client) {
      client = {
        id: `client_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: clientName.trim(),
        phone: clientPhone.trim(),
        guarantorName: guarantorName.trim(),
        guarantorPhone: guarantorPhone.trim(),
        branchId: chosenBranch?.id,
        branchName: chosenBranch?.name,
        notes: notes ? notes.trim() : 'تم إنشاؤه عبر إضافة موعد جديد للطابور',
        createdAt: new Date().toISOString(),
      };
      database.clients.push(client);
    } else {
      // Update guarantor details if empty
      if (!client.guarantorName) client.guarantorName = guarantorName.trim();
      if (!client.guarantorPhone) client.guarantorPhone = guarantorPhone.trim();
      if (!client.branchId && chosenBranch) {
        client.branchId = chosenBranch.id;
        client.branchName = chosenBranch.name;
      }
    }

    // Automatically store and index guarantor info for autocomplete and future reuse
    if (guarantorName && guarantorName.trim()) {
      upsertGuarantor(database, {
        name: guarantorName.trim(),
        phone: (guarantorPhone || '').trim(),
      });
    }

    // 2. Next queue number
    const maxQueue = (database.appointments || []).reduce(
      (max, a) => Math.max(max, a.queueNumber || 0),
      0
    );
    const newQueueNumber = maxQueue + 1;

    // 3. Process Scheduled Alert if provided
    let alertInfo: ScheduledAlertInfo | undefined = undefined;
    if (scheduledAlert && scheduledAlert.scheduledAt) {
      alertInfo = {
        scheduledAt: scheduledAlert.scheduledAt,
        reminderType: scheduledAlert.reminderType || '1h_before',
        customDate: scheduledAlert.customDate,
        customTime: scheduledAlert.customTime,
        note: scheduledAlert.note || `تذكير بموعد ${clientName.trim()}`,
        notifyGuarantor: !!scheduledAlert.notifyGuarantor,
        isTriggered: false,
      };
    }

    createdApt = {
      id: `apt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      queueNumber: newQueueNumber,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      guarantorName: guarantorName.trim(),
      guarantorPhone: guarantorPhone.trim(),
      requiredAmount: parsedAmount,
      paidAmount: 0,
      remainingAmount: parsedAmount,
      appointmentDate: aptDate,
      appointmentTime: aptTime,
      status: initialStatus,
      priority: aptPriority,
      notes: notes ? notes.trim() : undefined,
      clientId: client.id,
      branchId: chosenBranch?.id,
      branchName: chosenBranch?.name,
      scheduledAlert: alertInfo,
      originalAppointmentDate: aptDate,
      postponementCount: 0,
      postponementHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    database.appointments = database.appointments || [];
    database.appointments.push(createdApt);

    // Also mirror into installments for backward compatibility if any old view references it
    database.installments.push({
      id: `inst_${createdApt.id}`,
      clientId: client.id,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      guarantorName: guarantorName.trim(),
      guarantorPhone: guarantorPhone.trim(),
      amount: parsedAmount,
      paidAmount: 0,
      dueDate: aptDate,
      status: initialStatus === 'today' || initialStatus === 'waiting' ? 'unpaid' : (initialStatus as any),
      notes: notes ? notes.trim() : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Add alert notification if scheduled alert is due soon or today
    if (alertInfo) {
      database.notifications.unshift({
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        type: 'scheduled_alert',
        appointmentId: createdApt.id,
        clientId: client.id,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        guarantorName: guarantorName.trim(),
        guarantorPhone: guarantorPhone.trim(),
        amount: parsedAmount,
        dueDate: aptDate,
        title: `تمت جدولة إشعار تنبيه للموعد`,
        message: `تمت جدولة تنبيه للموعد الخاص بـ ${clientName.trim()} والمبلغ المطلوب: ${parsedAmount.toLocaleString()} ${database.settings.currency}. موعد التنبيه: ${new Date(alertInfo.scheduledAt).toLocaleString('ar-IQ')}`,
        isRead: false,
        scheduledFor: alertInfo.scheduledAt,
        createdAt: new Date().toISOString(),
      });
    }
  });

  runScheduledNotificationJob();

  res.status(201).json({
    appointment: createdApt,
    message: 'تمت إضافة الموعد إلى الطابور وجدولة التنبيه بنجاح',
  });
});

apiRouter.put('/appointments/:id', requireAuth, (req: AuthRequest, res: Response) => {
  const {
    clientName,
    clientPhone,
    guarantorName,
    guarantorPhone,
    requiredAmount,
    appointmentDate,
    appointmentTime,
    priority,
    notes,
    scheduledAlert,
    queueNumber,
  } = req.body;

  let updatedApt: Appointment | null = null;

  db.update((database) => {
    const idx = (database.appointments || []).findIndex((a) => a.id === req.params.id);
    if (idx === -1) return;

    const current = database.appointments[idx];

    if (clientName !== undefined) current.clientName = clientName.trim();
    if (clientPhone !== undefined) current.clientPhone = clientPhone.trim();
    if (guarantorName !== undefined) current.guarantorName = guarantorName.trim();
    if (guarantorPhone !== undefined) current.guarantorPhone = guarantorPhone.trim();
    if (requiredAmount !== undefined) {
      current.requiredAmount = Number(requiredAmount);
      current.remainingAmount = Math.max(0, current.requiredAmount - (current.paidAmount || 0));
    }

    // Check if appointment date is changing -> Record postponement history!
    if (appointmentDate !== undefined && appointmentDate.trim() && appointmentDate.trim() !== current.appointmentDate) {
      const prevDate = current.appointmentDate;
      const prevTime = current.appointmentTime || '10:00';
      const newDate = appointmentDate.trim();
      const newTime = appointmentTime !== undefined ? appointmentTime.trim() : prevTime;

      if (!current.originalAppointmentDate) {
        current.originalAppointmentDate = prevDate;
      }
      current.postponementHistory = current.postponementHistory || [];
      current.postponementHistory.push({
        id: `postpone_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        previousDate: prevDate,
        previousTime: prevTime,
        newDate: newDate,
        newTime: newTime,
        postponedAt: new Date().toISOString(),
        postponedBy: req.user?.name || req.user?.username || 'الموظف',
        reason: notes ? notes.trim() : 'تم تعديل تاريخ الموعد',
        callResult: 'تعديل / تأجيل الموعد',
      });
      current.postponementCount = (current.postponementCount || 0) + 1;
      current.appointmentDate = newDate;
      current.status = 'postponed';
    } else if (appointmentDate !== undefined) {
      current.appointmentDate = appointmentDate.trim();
    }

    if (appointmentTime !== undefined) current.appointmentTime = appointmentTime.trim();
    if (priority !== undefined) current.priority = priority;
    if (notes !== undefined) current.notes = notes.trim();
    if (queueNumber !== undefined) current.queueNumber = Number(queueNumber);

    if (scheduledAlert !== undefined) {
      current.scheduledAlert = scheduledAlert
        ? {
            scheduledAt: scheduledAlert.scheduledAt,
            reminderType: scheduledAlert.reminderType || '1h_before',
            customDate: scheduledAlert.customDate,
            customTime: scheduledAlert.customTime,
            note: scheduledAlert.note,
            notifyGuarantor: !!scheduledAlert.notifyGuarantor,
            isTriggered: scheduledAlert.isTriggered || false,
          }
        : undefined;
    }

    if (req.body.branchId !== undefined) {
      const b = (database.branches || []).find((br: any) => br.id === req.body.branchId);
      if (b) {
        current.branchId = b.id;
        current.branchName = b.name;
      }
    }

    current.updatedAt = new Date().toISOString();
    updatedApt = current;

    // Automatically store and index guarantor info
    if (current.guarantorName && current.guarantorName.trim()) {
      upsertGuarantor(database, {
        name: current.guarantorName.trim(),
        phone: (current.guarantorPhone || '').trim(),
      });
    }

    // Sync client record if exists
    if (current.clientId) {
      const client = database.clients.find((c) => c.id === current.clientId);
      if (client) {
        if (clientName) client.name = clientName.trim();
        if (clientPhone) client.phone = clientPhone.trim();
        if (guarantorName) client.guarantorName = guarantorName.trim();
        if (guarantorPhone) client.guarantorPhone = guarantorPhone.trim();
      }
    }
  });

  if (!updatedApt) {
    return res.status(404).json({ error: 'الموعد غير موجود في الطابور' });
  }

  runScheduledNotificationJob();
  res.json({ appointment: updatedApt, message: 'تم تحديث بيانات الموعد بنجاح' });
});

// Explicit Postpone appointment endpoint with previous date audit trail
apiRouter.post('/appointments/:id/postpone', requireAuth, (req: AuthRequest, res: Response) => {
  const { newDate, newTime, reason, logCall, updateScheduledAlert } = req.body;
  if (!newDate) {
    return res.status(400).json({ error: 'يرجى تحديد تاريخ الموعد الجديد بعد التأجيل' });
  }

  let updatedApt: Appointment | null = null;
  let newCallLog: CallLog | null = null;

  db.update((database) => {
    const idx = (database.appointments || []).findIndex((a) => a.id === req.params.id);
    if (idx === -1) return;

    const current = database.appointments[idx];
    const prevDate = current.appointmentDate;
    const prevTime = current.appointmentTime || '10:00';
    const targetDate = newDate.trim();
    const targetTime = newTime ? newTime.trim() : prevTime;

    if (!current.originalAppointmentDate) {
      current.originalAppointmentDate = prevDate;
    }

    const postponementRecord: PostponementRecord = {
      id: `postpone_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      previousDate: prevDate,
      previousTime: prevTime,
      newDate: targetDate,
      newTime: targetTime,
      postponedAt: new Date().toISOString(),
      postponedBy: req.user?.name || req.user?.username || 'الموظف',
      reason: reason ? reason.trim() : 'تم الاتصال بالزبون وتأجيل الموعد مرة أخرى',
      callResult: 'تم تأجيل الموعد مرة أخرى',
    };

    current.postponementHistory = current.postponementHistory || [];
    current.postponementHistory.push(postponementRecord);
    current.postponementCount = (current.postponementCount || 0) + 1;

    current.appointmentDate = targetDate;
    current.appointmentTime = targetTime;
    current.status = 'postponed';
    if (reason) {
      current.notes = (current.notes ? current.notes + ' | ' : '') + `تأجيل (${current.postponementCount}): ${reason.trim()}`;
    }
    current.updatedAt = new Date().toISOString();
    updatedApt = current;

    // Log call if requested
    if (logCall !== false) {
      newCallLog = {
        id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        clientId: current.clientId || current.id,
        clientName: current.clientName,
        clientPhone: current.clientPhone,
        guarantorName: current.guarantorName,
        guarantorPhone: current.guarantorPhone,
        callerUserId: req.user?.userId || 'unknown',
        callerName: req.user?.name || req.user?.username || 'الموظف',
        callDate: new Date().toISOString(),
        result: 'postponed',
        resultLabel: 'تم تأجيل الموعد مرة أخرى',
        promisedDate: targetDate,
        promisedAmount: current.remainingAmount || current.requiredAmount,
        notes: reason ? reason.trim() : `تم الاتصال وتأجيل الموعد من ${prevDate} إلى ${targetDate}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      database.calls = database.calls || [];
      database.calls.unshift(newCallLog);
    }

    // Re-schedule alert if requested and scheduledAlert exists
    if (updateScheduledAlert !== false && current.scheduledAlert) {
      try {
        const [year, month, day] = targetDate.split('-').map(Number);
        const [hours, minutes] = targetTime.split(':').map(Number);
        const aptDateTime = new Date(year, month - 1, day, hours, minutes);
        current.scheduledAlert.scheduledAt = new Date(aptDateTime.getTime() - 60 * 60 * 1000).toISOString();
        current.scheduledAlert.isTriggered = false;
      } catch {
        // keep existing scheduledAt if parse fails
      }
    }

    // Sync client
    if (current.clientId) {
      const client = database.clients.find((c) => c.id === current.clientId);
      if (client) {
        client.lastCallDate = new Date().toISOString();
        client.lastCallResult = 'تم تأجيل الموعد مرة أخرى';
        client.nextPromiseDate = targetDate;
      }
    }

    // Add notification
    database.notifications.unshift({
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type: 'scheduled_alert',
      appointmentId: current.id,
      clientName: current.clientName,
      clientPhone: current.clientPhone,
      guarantorName: current.guarantorName,
      guarantorPhone: current.guarantorPhone,
      amount: current.remainingAmount || current.requiredAmount,
      dueDate: targetDate,
      title: `تم تأجيل موعد (${current.clientName})`,
      message: `تم تأجيل الموعد من ${prevDate} إلى ${targetDate}. عدد مرات التأجيل: ${current.postponementCount}.`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  });

  const aptResult = updatedApt as Appointment | null;
  if (!aptResult) {
    return res.status(404).json({ error: 'الموعد غير موجود' });
  }

  runScheduledNotificationJob();
  res.json({
    appointment: aptResult,
    call: newCallLog,
    message: `تم تأجيل الموعد بنجاح وحفظ الموعد السابق في السجل. (تأجيل رقم ${aptResult.postponementCount || 1})`,
  });
});

// Full Appointment History endpoint (past appointments, postponements, and call logs)
apiRouter.get('/appointments/:id/history', requireAuth, (req: AuthRequest, res: Response) => {
  const data = db.get();
  const apt = (data.appointments || []).find((a) => a.id === req.params.id);
  if (!apt) {
    return res.status(404).json({ error: 'الموعد غير موجود' });
  }

  // Related calls
  const relatedCalls = (data.calls || []).filter(
    (c) =>
      (apt.clientId && c.clientId === apt.clientId) ||
      c.clientPhone === apt.clientPhone ||
      c.clientName === apt.clientName
  );

  res.json({
    appointment: apt,
    originalAppointmentDate: apt.originalAppointmentDate || apt.appointmentDate,
    postponementCount: apt.postponementCount || (apt.postponementHistory?.length || 0),
    postponementHistory: apt.postponementHistory || [],
    calls: relatedCalls,
  });
});

// Guarantors Search & Storage endpoints (يجلبلي اسماء الكفلاء عن الكتابة وتلقائي يخزن معلوات الكفيل)
apiRouter.get('/guarantors', requireAuth, (req: AuthRequest, res: Response) => {
  const data = db.get();
  const search = ((req.query.search as string) || '').trim().toLowerCase();
  let list = data.guarantors || [];

  if (search) {
    list = list.filter(
      (g) =>
        g.name.toLowerCase().includes(search) ||
        g.phone.includes(search) ||
        (g.notes && g.notes.toLowerCase().includes(search))
    );
  }

  // Sort alphabetically
  list.sort((a, b) => a.name.localeCompare(b.name));

  res.json({ guarantors: list });
});

apiRouter.post('/guarantors', requireAuth, (req: AuthRequest, res: Response) => {
  const { name, phone, relation, address, nationalId, notes } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'يرجى إدخال اسم الكفيل' });
  }

  let savedGuarantor: Guarantor | null = null;
  db.update((database) => {
    savedGuarantor = upsertGuarantor(database, {
      name,
      phone: phone || '',
      relation,
      address,
      nationalId,
      notes,
    });
  });

  res.status(201).json({
    guarantor: savedGuarantor,
    message: 'تم حفظ وتحديث بيانات الكفيل بنجاح',
  });
});

apiRouter.put('/appointments/:id/status', requireAuth, requirePermission('canChangeStatus'), (req: AuthRequest, res: Response) => {
  const { status, notes, newAppointmentDate, newAppointmentTime, scheduledAlert } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'يرجى تحديد حالة الموعد' });
  }

  let updatedApt: Appointment | null = null;

  db.update((database) => {
    const idx = (database.appointments || []).findIndex((a) => a.id === req.params.id);
    if (idx === -1) return;

    const apt = database.appointments[idx];
    const prevDate = apt.appointmentDate;
    const prevTime = apt.appointmentTime || '10:00';

    // If status is postponed or date changed: record postponement history!
    if ((status === 'postponed' || newAppointmentDate) && newAppointmentDate && newAppointmentDate.trim() !== prevDate) {
      const targetDate = newAppointmentDate.trim();
      const targetTime = newAppointmentTime ? newAppointmentTime.trim() : prevTime;

      if (!apt.originalAppointmentDate) {
        apt.originalAppointmentDate = prevDate;
      }
      apt.postponementHistory = apt.postponementHistory || [];
      apt.postponementHistory.push({
        id: `postpone_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        previousDate: prevDate,
        previousTime: prevTime,
        newDate: targetDate,
        newTime: targetTime,
        postponedAt: new Date().toISOString(),
        postponedBy: req.user?.name || req.user?.username || 'الموظف',
        reason: notes ? notes.trim() : 'تم تغيير الحالة وتأجيل الموعد',
        callResult: 'تم تأجيل الموعد',
      });
      apt.postponementCount = (apt.postponementCount || 0) + 1;
      apt.appointmentDate = targetDate;
      apt.appointmentTime = targetTime;
    }

    apt.status = status as AppointmentStatus;
    if (notes !== undefined) {
      apt.notes = notes;
    }

    // Merged alert scheduling
    if (scheduledAlert !== undefined) {
      if (scheduledAlert && scheduledAlert.scheduledAt) {
        apt.scheduledAlert = {
          scheduledAt: scheduledAlert.scheduledAt,
          reminderType: scheduledAlert.reminderType || '1h_before',
          customDate: scheduledAlert.customDate,
          customTime: scheduledAlert.customTime,
          note: scheduledAlert.note || `تذكير بموعد ${apt.clientName}`,
          notifyGuarantor: !!scheduledAlert.notifyGuarantor,
          isTriggered: false,
        };

        // Add notification
        database.notifications.unshift({
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          type: 'scheduled_alert',
          appointmentId: apt.id,
          clientName: apt.clientName,
          clientPhone: apt.clientPhone,
          guarantorName: apt.guarantorName,
          guarantorPhone: apt.guarantorPhone,
          amount: apt.remainingAmount,
          dueDate: apt.appointmentDate,
          title: 'تم تحديث حالة الموعد وجدولة التنبيه',
          message: `تم تحديث حالة موعد ${apt.clientName} وجدولة تنبيه بتاريخ ${new Date(scheduledAlert.scheduledAt).toLocaleString('ar-IQ')}`,
          isRead: false,
          scheduledFor: scheduledAlert.scheduledAt,
          createdAt: new Date().toISOString(),
        });
      } else if (scheduledAlert === null) {
        apt.scheduledAlert = undefined;
      }
    }

    apt.updatedAt = new Date().toISOString();
    updatedApt = apt;
  });

  if (!updatedApt) {
    return res.status(404).json({ error: 'الموعد غير موجود' });
  }

  runScheduledNotificationJob();
  res.json({ appointment: updatedApt, message: 'تم تحديث حالة الموعد وجدولة التنبيه بنجاح' });
});

apiRouter.post('/appointments/:id/pay', requireAuth, requirePermission('canRecordPayments'), (req: AuthRequest, res: Response) => {
  const { amount, paymentDate, paymentMethod, referenceNo, notes } = req.body;
  const payAmount = Number(amount);

  if (!payAmount || payAmount <= 0) {
    return res.status(400).json({ error: 'يرجى إدخال مبلغ دفع صالح وأكبر من صفر' });
  }

  const data = db.get();
  const apt = (data.appointments || []).find((a) => a.id === req.params.id);
  if (!apt) {
    return res.status(404).json({ error: 'الموعد غير موجود' });
  }

  const currentPaid = apt.paidAmount || 0;
  const remainingBefore = apt.requiredAmount - currentPaid;

  if (payAmount > remainingBefore) {
    return res.status(400).json({
      error: `المبلغ المدخل (${payAmount.toLocaleString()}) يتجاوز المبلغ المتبقي على هذا الموعد (${remainingBefore.toLocaleString()})`,
    });
  }

  const newTotalPaid = currentPaid + payAmount;
  const isFullyPaid = newTotalPaid >= apt.requiredAmount;
  const finalStatus: AppointmentStatus = isFullyPaid ? 'paid' : 'partially_paid';

  const newPayment: Payment = {
    id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    appointmentId: apt.id,
    clientId: apt.clientId || apt.id,
    clientName: apt.clientName,
    amount: payAmount,
    paymentDate: paymentDate || new Date().toISOString().split('T')[0],
    paymentMethod: paymentMethod || 'cash',
    referenceNo: referenceNo ? referenceNo.trim() : undefined,
    notes: notes ? notes.trim() : undefined,
    recordedBy: req.user?.username,
    createdAt: new Date().toISOString(),
  };

  db.update((database) => {
    const idx = (database.appointments || []).findIndex((a) => a.id === req.params.id);
    if (idx !== -1) {
      database.appointments[idx].paidAmount = newTotalPaid;
      database.appointments[idx].remainingAmount = Math.max(0, apt.requiredAmount - newTotalPaid);
      database.appointments[idx].status = finalStatus;
      database.appointments[idx].updatedAt = new Date().toISOString();
    }

    database.payments.push(newPayment);

    // Notification
    database.notifications.unshift({
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type: 'payment_received',
      appointmentId: apt.id,
      clientName: apt.clientName,
      clientPhone: apt.clientPhone,
      guarantorName: apt.guarantorName,
      guarantorPhone: apt.guarantorPhone,
      amount: payAmount,
      dueDate: apt.appointmentDate,
      title: 'تم تسجيل دفعة تسديد',
      message: `تم تسجيل سداد بمبلغ ${payAmount.toLocaleString()} ${database.settings.currency} لصالح ${apt.clientName}. ${isFullyPaid ? 'تم سداد المبلغ المطلوب بالكامل!' : `المتبقي: ${(apt.requiredAmount - newTotalPaid).toLocaleString()} ${database.settings.currency}`}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  });

  res.json({
    message: isFullyPaid ? 'تم سداد الموعد بالكامل بنجاح' : 'تم تسجيل الدفعة بنجاح',
    payment: newPayment,
    remainingAmount: Math.max(0, apt.requiredAmount - newTotalPaid),
    status: finalStatus,
  });
});

apiRouter.post('/appointments/:id/schedule-alert', requireAuth, requirePermission('canScheduleAlerts'), (req: AuthRequest, res: Response) => {
  const { scheduledAt, reminderType, customDate, customTime, note, notifyGuarantor } = req.body;

  if (!scheduledAt) {
    return res.status(400).json({ error: 'يرجى تحديد وقت وتاريخ إطلاق التنبيه المجدول' });
  }

  let updatedApt: Appointment | null = null;

  db.update((database) => {
    const idx = (database.appointments || []).findIndex((a) => a.id === req.params.id);
    if (idx === -1) return;

    const apt = database.appointments[idx];
    apt.scheduledAlert = {
      scheduledAt,
      reminderType: reminderType || 'custom',
      customDate,
      customTime,
      note: note || `تنبيه موعد ${apt.clientName}`,
      notifyGuarantor: !!notifyGuarantor,
      isTriggered: false,
    };
    apt.updatedAt = new Date().toISOString();
    updatedApt = apt;

    // Add scheduled notification
    database.notifications.unshift({
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type: 'scheduled_alert',
      appointmentId: apt.id,
      clientName: apt.clientName,
      clientPhone: apt.clientPhone,
      guarantorName: apt.guarantorName,
      guarantorPhone: apt.guarantorPhone,
      amount: apt.remainingAmount,
      dueDate: apt.appointmentDate,
      title: 'تمت جدولة إشعار تنبيه جديد',
      message: `تم ضبط تنبيه لموعد ${apt.clientName} بتاريخ ${new Date(scheduledAt).toLocaleString('ar-IQ')}. ${notifyGuarantor ? `(مع إشعار الكفيل: ${apt.guarantorName})` : ''}`,
      isRead: false,
      scheduledFor: scheduledAt,
      createdAt: new Date().toISOString(),
    });
  });

  if (!updatedApt) {
    return res.status(404).json({ error: 'الموعد غير موجود' });
  }

  runScheduledNotificationJob();
  res.json({
    appointment: updatedApt,
    message: 'تمت جدولة إشعار التنبيه بنجاح',
  });
});

apiRouter.post('/appointments/:id/trigger-alert', requireAuth, (req: AuthRequest, res: Response) => {
  const data = db.get();
  const apt = (data.appointments || []).find((a) => a.id === req.params.id);
  if (!apt) {
    return res.status(404).json({ error: 'الموعد غير موجود' });
  }

  db.update((database) => {
    const idx = (database.appointments || []).findIndex((a) => a.id === req.params.id);
    if (idx !== -1 && database.appointments[idx].scheduledAlert) {
      database.appointments[idx].scheduledAlert!.isTriggered = true;
      database.appointments[idx].scheduledAlert!.triggeredAt = new Date().toISOString();
    }

    database.notifications.unshift({
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type: 'scheduled_alert',
      appointmentId: apt.id,
      clientName: apt.clientName,
      clientPhone: apt.clientPhone,
      guarantorName: apt.guarantorName,
      guarantorPhone: apt.guarantorPhone,
      amount: apt.remainingAmount,
      dueDate: apt.appointmentDate,
      title: `🔔 تنبيه فوري: موعد ${apt.clientName}`,
      message: `تنبيه عاجل لموعد ${apt.clientName}. المبلغ المطلوب: ${apt.requiredAmount.toLocaleString()} ${database.settings.currency}. الكفيل: ${apt.guarantorName} (${apt.guarantorPhone}).`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  });

  res.json({ message: 'تم إطلاق التنبيه الفوري بنجاح' });
});

apiRouter.delete('/appointments/:id', requireAuth, requirePermission('canDeleteClients'), (req: AuthRequest, res: Response) => {
  db.update((database) => {
    database.appointments = (database.appointments || []).filter((a) => a.id !== req.params.id);
    database.notifications = database.notifications.filter((n) => n.appointmentId !== req.params.id);
  });

  res.json({ message: 'تم حذف الموعد من الطابور بنجاح' });
});

apiRouter.get('/appointments/scheduled-alerts', requireAuth, (_req: AuthRequest, res: Response) => {
  const data = db.get();
  const list = (data.appointments || [])
    .filter((a) => !!a.scheduledAlert)
    .sort((a, b) => (a.scheduledAlert?.scheduledAt || '').localeCompare(b.scheduledAlert?.scheduledAt || ''));

  res.json({ alerts: list, currency: data.settings.currency || 'د.ع' });
});

apiRouter.post('/appointments/reorder', requireAuth, (req: AuthRequest, res: Response) => {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ error: 'الترتيب غير صحيح' });
  }

  db.update((database) => {
    orderedIds.forEach((id: string, index: number) => {
      const apt = (database.appointments || []).find((a) => a.id === id);
      if (apt) {
        apt.queueNumber = index + 1;
      }
    });
  });

  res.json({ message: 'تم حفظ ترتيب الطابور بنجاح' });
});

// ================= INSTALLMENTS (Backward compatibility) =================

apiRouter.get('/installments', requireAuth, (req: AuthRequest, res: Response) => {
  const data = db.get();
  const search = ((req.query.search as string) || '').trim().toLowerCase();
  const status = (req.query.status as string) || 'all';
  const clientId = req.query.clientId as string;
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;
  const today = new Date().toISOString().split('T')[0];

  let list = data.installments.map((inst) => {
    // dynamically ensure overdue status is up to date
    const remaining = inst.amount - (inst.paidAmount || 0);
    let currentStatus = inst.status;
    if (remaining <= 0) {
      currentStatus = 'paid';
    } else if (inst.dueDate < today) {
      currentStatus = 'overdue';
    }
    return {
      ...inst,
      status: currentStatus,
      remainingAmount: Math.max(0, remaining),
    };
  });

  if (clientId) {
    list = list.filter((inst) => inst.clientId === clientId);
  }

  if (status && status !== 'all') {
    if (status === 'due_today') {
      list = list.filter((inst) => inst.dueDate === today && inst.remainingAmount > 0);
    } else {
      list = list.filter((inst) => inst.status === status);
    }
  }

  if (startDate) {
    list = list.filter((inst) => inst.dueDate >= startDate);
  }
  if (endDate) {
    list = list.filter((inst) => inst.dueDate <= endDate);
  }

  if (search) {
    list = list.filter(
      (inst) =>
        inst.clientName.toLowerCase().includes(search) ||
        inst.clientPhone.includes(search) ||
        (inst.notes && inst.notes.toLowerCase().includes(search))
    );
  }

  // Sort by due date
  list.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  res.json({ installments: list, currency: data.settings.currency });
});

apiRouter.post('/installments', requireAuth, (req: AuthRequest, res: Response) => {
  let { clientId, clientName, clientPhone, amount, dueDate, notes, status } = req.body;

  if (!amount || Number(amount) <= 0 || !dueDate) {
    return res.status(400).json({ error: 'يرجى إدخال مبلغ صحيح وتاريخ استحقاق القسط' });
  }

  const parsedAmount = Number(amount);
  const data = db.get();

  // If clientId is provided, verify it exists
  let targetClient: Client | undefined;
  if (clientId) {
    targetClient = data.clients.find((c) => c.id === clientId);
  }

  // If no clientId but clientPhone or clientName is provided, check if matching client already exists
  if (!targetClient && clientPhone) {
    targetClient = data.clients.find((c) => c.phone.trim() === clientPhone.trim());
  }

  // If client doesn't exist, create a new one automatically
  if (!targetClient) {
    if (!clientName || !clientPhone) {
      return res.status(400).json({ error: 'يرجى تحديد صاحب الموعد أو إدخال الاسم ورقم الهاتف لإنشاء ملف جديد' });
    }

    targetClient = {
      id: `client_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: clientName.trim(),
      phone: clientPhone.trim(),
      notes: 'تمت إضافته تلقائياً عند تسجيل القسط',
      createdAt: new Date().toISOString(),
    };

    db.update((database) => {
      database.clients.push(targetClient!);
    });
  }

  const today = new Date().toISOString().split('T')[0];
  let calculatedStatus: InstallmentStatus = 'unpaid';
  if (status === 'paid') {
    calculatedStatus = 'paid';
  } else if (dueDate < today) {
    calculatedStatus = 'overdue';
  }

  const newInstallment: Installment = {
    id: `inst_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    clientId: targetClient.id,
    clientName: targetClient.name,
    clientPhone: targetClient.phone,
    amount: parsedAmount,
    paidAmount: calculatedStatus === 'paid' ? parsedAmount : 0,
    dueDate,
    status: calculatedStatus,
    notes: notes ? notes.trim() : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.update((database) => {
    database.installments.push(newInstallment);

    // If marked as paid upfront, record payment
    if (calculatedStatus === 'paid') {
      database.payments.push({
        id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        installmentId: newInstallment.id,
        clientId: targetClient!.id,
        clientName: targetClient!.name,
        amount: parsedAmount,
        paymentDate: dueDate,
        paymentMethod: 'cash',
        notes: 'تم السداد بالكامل عند الإنشاء',
        createdAt: new Date().toISOString(),
      });
    }
  });

  // Re-run notification scan
  runScheduledNotificationJob();

  res.status(201).json({ installment: newInstallment, message: 'تم حفظ القسط وموعد الدفع بنجاح' });
});

apiRouter.put('/installments/:id', requireAuth, (req: AuthRequest, res: Response) => {
  const { amount, dueDate, notes, status, clientId } = req.body;
  if (!amount || Number(amount) <= 0 || !dueDate) {
    return res.status(400).json({ error: 'يرجى إدخال مبلغ صحيح وتاريخ استحقاق' });
  }

  let updatedInst: Installment | null = null;
  const parsedAmount = Number(amount);

  db.update((database) => {
    const idx = database.installments.findIndex((i) => i.id === req.params.id);
    if (idx === -1) return;

    const current = database.installments[idx];
    let targetClientId = current.clientId;
    let targetClientName = current.clientName;
    let targetClientPhone = current.clientPhone;

    if (clientId && clientId !== current.clientId) {
      const client = database.clients.find((c) => c.id === clientId);
      if (client) {
        targetClientId = client.id;
        targetClientName = client.name;
        targetClientPhone = client.phone;
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const paid = current.paidAmount || 0;
    let finalStatus: InstallmentStatus = status || current.status;

    if (paid >= parsedAmount) {
      finalStatus = 'paid';
    } else if (paid > 0) {
      finalStatus = 'partially_paid';
    } else if (dueDate < today) {
      finalStatus = 'overdue';
    } else {
      finalStatus = 'unpaid';
    }

    database.installments[idx] = {
      ...current,
      clientId: targetClientId,
      clientName: targetClientName,
      clientPhone: targetClientPhone,
      amount: parsedAmount,
      dueDate,
      status: finalStatus,
      notes: notes !== undefined ? notes.trim() : current.notes,
      updatedAt: new Date().toISOString(),
    };

    updatedInst = database.installments[idx];
  });

  if (!updatedInst) {
    return res.status(404).json({ error: 'القسط غير موجود' });
  }

  res.json({ installment: updatedInst, message: 'تم تحديث القسط بنجاح' });
});

apiRouter.put('/installments/:id/status', requireAuth, requirePermission('canChangeStatus'), (req: AuthRequest, res: Response) => {
  const { status, notes, promisedDate } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'يرجى تحديد الحالة الجديدة للقسط' });
  }

  let updatedInst: Installment | null = null;
  db.update((database) => {
    const idx = database.installments.findIndex((i) => i.id === req.params.id);
    if (idx === -1) return;

    database.installments[idx].status = status as InstallmentStatus;
    if (notes !== undefined) {
      database.installments[idx].notes = notes.trim();
    }
    if (promisedDate) {
      database.installments[idx].promisedDate = promisedDate;
      database.installments[idx].dueDate = promisedDate;
    }
    database.installments[idx].updatedAt = new Date().toISOString();
    updatedInst = database.installments[idx];

    // Also update client's nextPromiseDate if status is promised
    if (status === 'promised' && promisedDate) {
      const clientIdx = database.clients.findIndex((c) => c.id === updatedInst?.clientId);
      if (clientIdx !== -1) {
        database.clients[clientIdx].nextPromiseDate = promisedDate;
      }
    }
  });

  if (!updatedInst) {
    return res.status(404).json({ error: 'القسط غير موجود' });
  }

  runScheduledNotificationJob();
  res.json({ installment: updatedInst, message: 'تم تحديث حالة القسط بنجاح' });
});

apiRouter.delete('/installments/:id', requireAuth, requirePermission('canDeleteClients'), (req: AuthRequest, res: Response) => {
  const data = db.get();
  const inst = data.installments.find((i) => i.id === req.params.id);
  if (!inst) {
    return res.status(404).json({ error: 'القسط غير موجود' });
  }

  db.update((database) => {
    database.installments = database.installments.filter((i) => i.id !== req.params.id);
    database.payments = database.payments.filter((p) => p.installmentId !== req.params.id);
    database.notifications = database.notifications.filter((n) => n.installmentId !== req.params.id);
  });

  res.json({ message: 'تم حذف القسط وسجلاته المرتبطة بنجاح' });
});

// ================= PAYMENTS (تسجيل الدفع دون تكرار أو ازدواجية) =================

apiRouter.post('/installments/:id/pay', requireAuth, requirePermission('canRecordPayments'), (req: AuthRequest, res: Response) => {
  const { amount, paymentDate, paymentMethod, referenceNo, notes } = req.body;
  const payAmount = Number(amount);

  if (!payAmount || payAmount <= 0) {
    return res.status(400).json({ error: 'يرجى إدخال مبلغ دفع صالح وأكبر من صفر' });
  }

  const data = db.get();
  const inst = data.installments.find((i) => i.id === req.params.id);
  if (!inst) {
    return res.status(404).json({ error: 'القسط غير موجود' });
  }

  const currentPaid = inst.paidAmount || 0;
  const remainingBefore = inst.amount - currentPaid;

  if (payAmount > remainingBefore) {
    return res.status(400).json({
      error: `المبلغ المدخل (${payAmount}) يتجاوز المبلغ المتبقي على هذا القسط (${remainingBefore})`,
    });
  }

  const newTotalPaid = currentPaid + payAmount;
  const isFullyPaid = newTotalPaid >= inst.amount;
  const finalStatus: InstallmentStatus = isFullyPaid ? 'paid' : 'partially_paid';

  const newPayment: Payment = {
    id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    installmentId: inst.id,
    clientId: inst.clientId,
    clientName: inst.clientName,
    amount: payAmount,
    paymentDate: paymentDate || new Date().toISOString().split('T')[0],
    paymentMethod: paymentMethod || 'cash',
    referenceNo: referenceNo ? referenceNo.trim() : undefined,
    notes: notes ? notes.trim() : undefined,
    createdAt: new Date().toISOString(),
  };

  db.update((database) => {
    const idx = database.installments.findIndex((i) => i.id === req.params.id);
    if (idx !== -1) {
      database.installments[idx].paidAmount = newTotalPaid;
      database.installments[idx].status = finalStatus;
      database.installments[idx].updatedAt = new Date().toISOString();
    }

    database.payments.push(newPayment);

    // If fully paid, mark related overdue/due notifications as read
    if (isFullyPaid) {
      database.notifications.forEach((n) => {
        if (n.installmentId === inst.id) {
          n.isRead = true;
        }
      });
    }

    // Add payment received notification
    database.notifications.unshift({
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type: 'payment_received',
      installmentId: inst.id,
      clientId: inst.clientId,
      clientName: inst.clientName,
      clientPhone: inst.clientPhone,
      amount: payAmount,
      dueDate: inst.dueDate,
      title: 'تم تسجيل دفعة جديدة',
      message: `تم تسجيل سداد بمبلغ ${payAmount.toLocaleString()} ${database.settings.currency} لصالح ${inst.clientName}. ${isFullyPaid ? 'تم سداد القسط بالكامل!' : `المتبقي: ${(inst.amount - newTotalPaid).toLocaleString()} ${database.settings.currency}`}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  });

  res.json({
    message: isFullyPaid ? 'تم سداد القسط بالكامل بنجاح' : 'تم تسجيل الدفعة بنجاح',
    payment: newPayment,
    remainingAmount: Math.max(0, inst.amount - newTotalPaid),
    status: finalStatus,
  });
});

// ================= NOTIFICATIONS (الإشعارات والتنبيهات التلقائية) =================

apiRouter.get('/notifications', requireAuth, (req: AuthRequest, res: Response) => {
  const data = db.get();
  const category = (req.query.category as string) || 'all';
  const unreadOnly = req.query.unreadOnly === 'true';

  let list = [...data.notifications];

  if (category && category !== 'all') {
    list = list.filter((n) => n.type === category);
  }

  if (unreadOnly) {
    list = list.filter((n) => !n.isRead);
  }

  // Sort by newest
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const unreadCount = data.notifications.filter((n) => !n.isRead).length;
  const dueTodayCount = data.notifications.filter((n) => n.type === 'due_today').length;
  const overdueCount = data.notifications.filter((n) => n.type === 'overdue').length;
  const upcomingCount = data.notifications.filter((n) => n.type === 'upcoming').length;

  res.json({
    notifications: list,
    unreadCount,
    counts: {
      dueToday: dueTodayCount,
      overdue: overdueCount,
      upcoming: upcomingCount,
    },
    settings: data.settings,
  });
});

apiRouter.put('/notifications/:id/read', requireAuth, (req: AuthRequest, res: Response) => {
  db.update((database) => {
    const notif = database.notifications.find((n) => n.id === req.params.id);
    if (notif) {
      notif.isRead = true;
    }
  });
  res.json({ success: true, message: 'تم تحديد الإشعار كمقروء' });
});

apiRouter.put('/notifications/read-all', requireAuth, (_req: AuthRequest, res: Response) => {
  db.update((database) => {
    database.notifications.forEach((n) => {
      n.isRead = true;
    });
  });
  res.json({ success: true, message: 'تم تحديد كافة الإشعارات كمقروءة' });
});

// Trigger server cron check on demand
apiRouter.post('/notifications/run-cron', requireAuth, (_req: AuthRequest, res: Response) => {
  const result = runScheduledNotificationJob();
  res.json({
    success: true,
    message: `تم فحص الأقساط بنجاح (إشعارات جديدة: ${result.generated}، أقساط محدثة: ${result.updatedStatusCount})`,
    result,
  });
});

// ================= SETTINGS (الإعدادات) =================

apiRouter.get('/settings', requireAuth, (_req: AuthRequest, res: Response) => {
  const data = db.get();
  res.json({ settings: data.settings });
});

apiRouter.put('/settings', requireAuth, (req: AuthRequest, res: Response) => {
  const { businessName, currency, notifyDaysBefore, autoCheckIntervalMinutes } = req.body;

  let updatedSettings = null;
  db.update((database) => {
    if (businessName) database.settings.businessName = businessName.trim();
    if (currency) database.settings.currency = currency.trim();
    if (Array.isArray(notifyDaysBefore)) {
      database.settings.notifyDaysBefore = notifyDaysBefore.map(Number).filter((n) => n > 0);
    }
    if (autoCheckIntervalMinutes) {
      database.settings.autoCheckIntervalMinutes = Number(autoCheckIntervalMinutes);
    }
    updatedSettings = database.settings;
  });

  // Re-run cron with updated settings
  runScheduledNotificationJob();

  res.json({ settings: updatedSettings, message: 'تم حفظ الإعدادات بنجاح' });
});

apiRouter.post('/settings/custom-status', requireAuth, requireAdmin, (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'يرجى إدخال اسم الحالة' });
  }

  const trimmed = name.trim();
  let updatedList: string[] = [];
  db.update((database) => {
    database.settings.customStatuses = database.settings.customStatuses || [];
    if (!database.settings.customStatuses.includes(trimmed)) {
      database.settings.customStatuses.push(trimmed);
    }
    updatedList = database.settings.customStatuses;
  });

  res.json({ customStatuses: updatedList, message: 'تمت إضافة الحالة بنجاح' });
});

apiRouter.delete('/settings/custom-status/:name', requireAuth, requireAdmin, (req: AuthRequest, res: Response) => {
  const target = decodeURIComponent(req.params.name).trim();
  let updatedList: string[] = [];
  db.update((database) => {
    database.settings.customStatuses = (database.settings.customStatuses || []).filter((s) => s !== target);
    updatedList = database.settings.customStatuses;
  });

  res.json({ customStatuses: updatedList, message: 'تم حذف الحالة بنجاح' });
});

// ================= REPORTS (التقارير المالية والتحليلات) =================

apiRouter.get('/reports', requireAuth, (req: AuthRequest, res: Response) => {
  const data = db.get();
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;
  const status = req.query.status as string;
  const clientId = req.query.clientId as string;
  const today = new Date().toISOString().split('T')[0];

  let filtered = data.installments.map((inst) => {
    const remaining = Math.max(0, inst.amount - (inst.paidAmount || 0));
    let s = inst.status;
    if (remaining === 0) s = 'paid';
    else if (inst.dueDate < today) s = 'overdue';
    return {
      ...inst,
      remaining,
      status: s,
    };
  });

  if (startDate) {
    filtered = filtered.filter((i) => i.dueDate >= startDate);
  }
  if (endDate) {
    filtered = filtered.filter((i) => i.dueDate <= endDate);
  }
  if (status && status !== 'all') {
    filtered = filtered.filter((i) => i.status === status);
  }
  if (clientId) {
    filtered = filtered.filter((i) => i.clientId === clientId);
  }

  let totalDue = 0;
  let totalPaid = 0;
  let totalRemaining = 0;
  let paidCount = 0;
  let unpaidCount = 0;
  let overdueCount = 0;

  filtered.forEach((i) => {
    totalDue += i.amount;
    totalPaid += (i.paidAmount || 0);
    totalRemaining += i.remaining;
    if (i.status === 'paid') paidCount++;
    else if (i.status === 'overdue') overdueCount++;
    else unpaidCount++;
  });

  // Payments in period
  let periodPayments = [...data.payments];
  if (startDate) periodPayments = periodPayments.filter((p) => p.paymentDate >= startDate);
  if (endDate) periodPayments = periodPayments.filter((p) => p.paymentDate <= endDate);
  if (clientId) periodPayments = periodPayments.filter((p) => p.clientId === clientId);

  res.json({
    installments: filtered,
    payments: periodPayments,
    summary: {
      totalDue,
      totalPaid,
      totalRemaining,
      collectionRate: totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0,
      totalCount: filtered.length,
      paidCount,
      unpaidCount,
      overdueCount,
      currency: data.settings.currency,
      businessName: data.settings.businessName,
    },
  });
});

// ================= DATABASE TABLES & SCHEMA MIGRATION API =================

apiRouter.get('/database/overview', requireAuth, (_req: AuthRequest, res: Response) => {
  const data = db.get();
  const tables = [
    { name: 'branches', arabicName: 'الفروع', count: (data.branches || []).length, description: 'شبكة الفروع وصلاحيات الرؤية المتبادلة' },
    { name: 'users', arabicName: 'المستخدمين والموظفين', count: (data.users || []).length, description: 'حسابات المدراء والمحصلين والصلاحيات' },
    { name: 'clients', arabicName: 'العملاء وأصحاب الأقساط', count: (data.clients || []).length, description: 'سجلات الزبائن والكفلاء والديون الكلية' },
    { name: 'guarantors', arabicName: 'دليل الكفلاء الضامنين', count: (data.guarantors || []).length, description: 'أرشيف الكفلاء الضامنين لسرعة الربط والاقتراح' },
    { name: 'appointments', arabicName: 'طابور المواعيد والتحصيل', count: (data.appointments || []).length, description: 'المواعيد المستحقة والتنبيهات المجدولة ومبالغ الدفع' },
    { name: 'appointment_postponements', arabicName: 'سجل تأجيل المواعيد', count: (data.appointments || []).reduce((acc, a) => acc + (a.postponementHistory?.length || 0), 0), description: 'أرشفة المواعيد السابقة وأسباب التأجيل' },
    { name: 'installments', arabicName: 'الأقساط المجدولة', count: (data.installments || []).length, description: 'الأقساط الشهرية وحالات السداد ومواعيد الاستحقاق' },
    { name: 'payments', arabicName: 'سندات القبض والمدفوعات', count: (data.payments || []).length, description: 'عمليات السداد النقدية والتحويلات المالية' },
    { name: 'call_logs', arabicName: 'سجل الاتصالات والمتابعات', count: (data.calls || []).length, description: 'نتائج المكالمات الهاتفية والوعود بالسداد' },
    { name: 'notifications', arabicName: 'الإشعارات والتنبيهات', count: (data.notifications || []).length, description: 'التنبيهات اليومية وإشعارات الخادم' },
    { name: 'app_settings', arabicName: 'إعدادات النظام العامة', count: 1, description: 'اسم المنشأة، العملة، وفترات الفحص الآلي' },
  ];

  res.json({
    tables,
    schemaFile: 'database_schema.sql',
    guideFile: 'DATABASE_MIGRATION_GUIDE.md',
    totalTables: tables.length,
    totalRecords: tables.reduce((acc, t) => acc + t.count, 0),
  });
});

apiRouter.get('/database/schema-sql', requireAuth, (_req: AuthRequest, res: Response) => {
  const schemaPath = path.resolve(process.cwd(), 'database_schema.sql');
  if (fs.existsSync(schemaPath)) {
    res.setHeader('Content-Type', 'application/sql; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="database_schema.sql"');
    return res.sendFile(schemaPath);
  }
  res.status(404).json({ error: 'ملف المخطط database_schema.sql غير موجود' });
});

apiRouter.get('/database/export-sql', requireAuth, (_req: AuthRequest, res: Response) => {
  const data = db.get();
  const schemaPath = path.resolve(process.cwd(), 'database_schema.sql');
  let schemaContent = '';
  if (fs.existsSync(schemaPath)) {
    schemaContent = fs.readFileSync(schemaPath, 'utf8');
  }

  // Generate SQL dump with CREATE TABLE + current live data
  let dump = `-- =====================================================================\n`;
  dump += `-- تفريغ قاعدة البيانات للنقل والترحيل (Full Database SQL Migration Dump)\n`;
  dump += `-- تاريخ التصدير: ${new Date().toISOString()}\n`;
  dump += `-- =====================================================================\n\n`;

  dump += schemaContent + `\n\n`;
  dump += `-- =====================================================================\n`;
  dump += `-- البيانات الحالية للنظام (Live Data Records)\n`;
  dump += `-- =====================================================================\n\n`;

  const escapeSql = (val: any) => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return val;
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
    return `'${String(val).replace(/'/g, "''")}'`;
  };

  // Branches
  if (data.branches && data.branches.length > 0) {
    dump += `-- جدول الفروع (${data.branches.length} سجل)\n`;
    data.branches.forEach((b) => {
      dump += `INSERT INTO branches (id, name, code, address, phone, manager_name, can_view_other_branches, is_active, notes) VALUES (${escapeSql(b.id)}, ${escapeSql(b.name)}, ${escapeSql(b.code)}, ${escapeSql(b.address)}, ${escapeSql(b.phone)}, ${escapeSql(b.managerName)}, ${escapeSql(b.canViewOtherBranches)}, ${escapeSql(b.isActive !== false)}, ${escapeSql(b.notes)}) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;\n`;
    });
    dump += `\n`;
  }

  // Users
  if (data.users && data.users.length > 0) {
    dump += `-- جدول المستخدمين (${data.users.length} سجل)\n`;
    data.users.forEach((u) => {
      dump += `INSERT INTO users (id, username, email, password_hash, name, role, branch_id, branch_name, phone, is_active, can_view_other_branches_override, permissions) VALUES (${escapeSql(u.id)}, ${escapeSql(u.username)}, ${escapeSql(u.email)}, ${escapeSql(u.passwordHash)}, ${escapeSql(u.name)}, ${escapeSql(u.role)}, ${escapeSql(u.branchId)}, ${escapeSql(u.branchName)}, ${escapeSql(u.phone)}, ${escapeSql(u.isActive !== false)}, ${escapeSql(u.canViewOtherBranchesOverride)}, ${escapeSql(u.permissions)}) ON CONFLICT (id) DO NOTHING;\n`;
    });
    dump += `\n`;
  }

  // Clients
  if (data.clients && data.clients.length > 0) {
    dump += `-- جدول العملاء (${data.clients.length} سجل)\n`;
    data.clients.forEach((c) => {
      dump += `INSERT INTO clients (id, name, phone, national_id, email, address, notes, branch_id, branch_name, guarantor_name, guarantor_phone, guarantor_relation, last_call_date, last_call_result, next_promise_date, promise_amount, total_debt) VALUES (${escapeSql(c.id)}, ${escapeSql(c.name)}, ${escapeSql(c.phone)}, ${escapeSql(c.nationalId)}, ${escapeSql(c.email)}, ${escapeSql(c.address)}, ${escapeSql(c.notes)}, ${escapeSql(c.branchId)}, ${escapeSql(c.branchName)}, ${escapeSql(c.guarantorName)}, ${escapeSql(c.guarantorPhone)}, ${escapeSql(c.guarantorRelation)}, ${escapeSql(c.lastCallDate)}, ${escapeSql(c.lastCallResult)}, ${escapeSql(c.nextPromiseDate)}, ${escapeSql(c.promiseAmount || 0)}, ${escapeSql(c.totalDebt || 0)}) ON CONFLICT (id) DO NOTHING;\n`;
    });
    dump += `\n`;
  }

  // Appointments
  if (data.appointments && data.appointments.length > 0) {
    dump += `-- جدول المواعيد والتحصيل (${data.appointments.length} سجل)\n`;
    data.appointments.forEach((a) => {
      dump += `INSERT INTO appointments (id, queue_number, client_name, client_phone, guarantor_name, guarantor_phone, required_amount, paid_amount, remaining_amount, appointment_date, appointment_time, status, priority, notes, client_id, branch_id, branch_name, original_appointment_date, postponement_count) VALUES (${escapeSql(a.id)}, ${escapeSql(a.queueNumber)}, ${escapeSql(a.clientName)}, ${escapeSql(a.clientPhone)}, ${escapeSql(a.guarantorName)}, ${escapeSql(a.guarantorPhone)}, ${escapeSql(a.requiredAmount)}, ${escapeSql(a.paidAmount || 0)}, ${escapeSql(a.remainingAmount || 0)}, ${escapeSql(a.appointmentDate)}, ${escapeSql(a.appointmentTime)}, ${escapeSql(a.status)}, ${escapeSql(a.priority)}, ${escapeSql(a.notes)}, ${escapeSql(a.clientId)}, ${escapeSql(a.branchId)}, ${escapeSql(a.branchName)}, ${escapeSql(a.originalAppointmentDate)}, ${escapeSql(a.postponementCount || 0)}) ON CONFLICT (id) DO NOTHING;\n`;
    });
    dump += `\n`;
  }

  // Installments
  if (data.installments && data.installments.length > 0) {
    dump += `-- جدول الأقساط (${data.installments.length} سجل)\n`;
    data.installments.forEach((i) => {
      dump += `INSERT INTO installments (id, client_id, client_name, client_phone, guarantor_name, guarantor_phone, amount, paid_amount, due_date, status, notes, promised_date) VALUES (${escapeSql(i.id)}, ${escapeSql(i.clientId)}, ${escapeSql(i.clientName)}, ${escapeSql(i.clientPhone)}, ${escapeSql(i.guarantorName)}, ${escapeSql(i.guarantorPhone)}, ${escapeSql(i.amount)}, ${escapeSql(i.paidAmount || 0)}, ${escapeSql(i.dueDate)}, ${escapeSql(i.status)}, ${escapeSql(i.notes)}, ${escapeSql(i.promisedDate)}) ON CONFLICT (id) DO NOTHING;\n`;
    });
    dump += `\n`;
  }

  // Payments
  if (data.payments && data.payments.length > 0) {
    dump += `-- جدول المدفوعات (${data.payments.length} سجل)\n`;
    data.payments.forEach((p) => {
      dump += `INSERT INTO payments (id, appointment_id, installment_id, client_id, client_name, amount, payment_date, payment_method, reference_no, notes, recorded_by) VALUES (${escapeSql(p.id)}, ${escapeSql(p.appointmentId)}, ${escapeSql(p.installmentId)}, ${escapeSql(p.clientId)}, ${escapeSql(p.clientName)}, ${escapeSql(p.amount)}, ${escapeSql(p.paymentDate)}, ${escapeSql(p.paymentMethod)}, ${escapeSql(p.referenceNo)}, ${escapeSql(p.notes)}, ${escapeSql(p.recordedBy)}) ON CONFLICT (id) DO NOTHING;\n`;
    });
    dump += `\n`;
  }

  const dateStr = new Date().toISOString().split('T')[0];
  res.setHeader('Content-Type', 'application/sql; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="database_dump_${dateStr}.sql"`);
  res.send(dump);
});

apiRouter.get('/database/export-json', requireAuth, (_req: AuthRequest, res: Response) => {
  const data = db.get();
  const dateStr = new Date().toISOString().split('T')[0];
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="database_backup_${dateStr}.json"`);
  res.send(JSON.stringify(data, null, 2));
});

