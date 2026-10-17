import {
  User,
  Client,
  Appointment,
  QueueStats,
  Installment,
  Payment,
  AppNotification,
  AppSettings,
  DashboardStats,
  ReportSummary,
  Branch,
  Guarantor,
  PostponementRecord,
} from '../types';

const TOKEN_KEY = 'aqsat_auth_token';
const USER_KEY = 'aqsat_auth_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredAuth(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'حدث خطأ غير متوقع أثناء معالجة الطلب');
  }

  return data as T;
}

export const api = {
  // Auth
  async login(identifier: string, password: string): Promise<{ token: string; user: User }> {
    const res = await request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    setStoredAuth(res.token, res.user);
    return res;
  },

  async getMe(): Promise<{ user: User }> {
    return request<{ user: User }>('/api/auth/me');
  },

  // Calls & Follow-ups (متابعة الاتصالات ومواعيد السداد)
  async recordCall(
    clientId: string,
    data: {
      result: string;
      promisedDate?: string;
      promisedAmount?: number;
      notes?: string;
    }
  ): Promise<{ message: string; call: any }> {
    return request(`/api/clients/${clientId}/calls`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getClientCalls(clientId: string): Promise<{ calls: any[] }> {
    return request(`/api/clients/${clientId}/calls`);
  },

  async getAllCalls(): Promise<{ calls: any[] }> {
    return request('/api/calls');
  },

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    return request<DashboardStats>('/api/dashboard/stats');
  },

  // Clients
  async getClients(search?: string): Promise<{ clients: Client[]; currency: string }> {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return request<{ clients: Client[]; currency: string }>(`/api/clients${q}`);
  },

  async getClientById(id: string): Promise<{
    client: Client;
    installments: Installment[];
    payments: Payment[];
    calls?: any[];
    summary: { totalAmount: number; totalPaid: number; totalRemaining: number; currency: string };
  }> {
    return request(`/api/clients/${id}`);
  },

  async createClient(data: Partial<Client> & { totalDebt?: number; initialDueDate?: string }): Promise<{ client: Client; message: string }> {
    return request('/api/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateClient(id: string, data: Partial<Client>): Promise<{ client: Client; message: string }> {
    return request(`/api/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteClient(id: string): Promise<{ message: string }> {
    return request(`/api/clients/${id}`, {
      method: 'DELETE',
    });
  },

  // Installments
  async getInstallments(params?: {
    status?: string;
    clientId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ installments: Installment[]; currency: string }> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.clientId) query.set('clientId', params.clientId);
    if (params?.search) query.set('search', params.search);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);

    const qs = query.toString();
    return request(`/api/installments${qs ? '?' + qs : ''}`);
  },

  // ================= APPOINTMENTS QUEUE (طابور المواعيد) =================
  async getAppointments(params?: {
    search?: string;
    status?: string;
    priority?: string;
    date?: string;
    branchId?: string;
  }): Promise<{ appointments: Appointment[]; queueStats: QueueStats; currency: string }> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.priority && params.priority !== 'all') query.set('priority', params.priority);
    if (params?.date) query.set('date', params.date);
    if (params?.branchId && params.branchId !== 'all') query.set('branchId', params.branchId);

    const qs = query.toString();
    return request(`/api/appointments${qs ? '?' + qs : ''}`);
  },

  async createAppointment(data: {
    clientName: string;
    clientPhone: string;
    guarantorName: string;
    guarantorPhone: string;
    requiredAmount: number;
    appointmentDate?: string;
    appointmentTime?: string;
    priority?: 'normal' | 'important' | 'urgent';
    notes?: string;
    branchId?: string;
    scheduledAlert?: any;
  }): Promise<{ appointment: Appointment; message: string }> {
    return request('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateAppointment(
    id: string,
    data: Partial<Appointment>
  ): Promise<{ appointment: Appointment; message: string }> {
    return request(`/api/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async updateAppointmentStatus(
    id: string,
    data: {
      status: string;
      notes?: string;
      newAppointmentDate?: string;
      newAppointmentTime?: string;
      scheduledAlert?: any;
    }
  ): Promise<{ appointment: Appointment; message: string }> {
    return request(`/api/appointments/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async postponeAppointment(
    id: string,
    data: {
      newDate: string;
      newTime?: string;
      reason?: string;
      logCall?: boolean;
      updateScheduledAlert?: boolean;
    }
  ): Promise<{ appointment: Appointment; call?: any; message: string }> {
    return request(`/api/appointments/${id}/postpone`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getAppointmentHistory(id: string): Promise<{
    appointment: Appointment;
    originalAppointmentDate: string;
    postponementCount: number;
    postponementHistory: PostponementRecord[];
    calls: any[];
  }> {
    return request(`/api/appointments/${id}/history`);
  },

  async getGuarantors(search?: string): Promise<{ guarantors: Guarantor[] }> {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return request<{ guarantors: Guarantor[] }>(`/api/guarantors${q}`);
  },

  async saveGuarantor(data: {
    name: string;
    phone: string;
    relation?: string;
    address?: string;
    nationalId?: string;
    notes?: string;
  }): Promise<{ guarantor: Guarantor; message: string }> {
    return request('/api/guarantors', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async payAppointment(
    id: string,
    data: {
      amount: number;
      paymentDate?: string;
      paymentMethod?: string;
      referenceNo?: string;
      notes?: string;
    }
  ): Promise<{ message: string; payment: Payment; remainingAmount: number; status: string }> {
    return request(`/api/appointments/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async scheduleAppointmentAlert(
    id: string,
    data: {
      scheduledAt: string;
      reminderType?: string;
      customDate?: string;
      customTime?: string;
      note?: string;
      notifyGuarantor?: boolean;
    }
  ): Promise<{ appointment: Appointment; message: string }> {
    return request(`/api/appointments/${id}/schedule-alert`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async triggerAppointmentAlert(id: string): Promise<{ message: string }> {
    return request(`/api/appointments/${id}/trigger-alert`, {
      method: 'POST',
    });
  },

  async deleteAppointment(id: string): Promise<{ message: string }> {
    return request(`/api/appointments/${id}`, {
      method: 'DELETE',
    });
  },

  async getScheduledAlerts(): Promise<{ alerts: Appointment[]; currency: string }> {
    return request('/api/appointments/scheduled-alerts');
  },

  async reorderAppointments(orderedIds: string[]): Promise<{ message: string }> {
    return request('/api/appointments/reorder', {
      method: 'POST',
      body: JSON.stringify({ orderedIds }),
    });
  },

  async createInstallment(data: {
    clientId?: string;
    clientName?: string;
    clientPhone?: string;
    amount: number;
    dueDate: string;
    notes?: string;
    status?: string;
  }): Promise<{ installment: Installment; message: string }> {
    return request('/api/installments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateInstallment(id: string, data: Partial<Installment>): Promise<{ installment: Installment; message: string }> {
    return request(`/api/installments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async updateInstallmentStatus(
    id: string,
    data: { status: string; notes?: string; promisedDate?: string }
  ): Promise<{ installment: Installment; message: string }> {
    return request(`/api/installments/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteInstallment(id: string): Promise<{ message: string }> {
    return request(`/api/installments/${id}`, {
      method: 'DELETE',
    });
  },

  async payInstallment(
    id: string,
    data: {
      amount: number;
      paymentDate?: string;
      paymentMethod?: string;
      referenceNo?: string;
      notes?: string;
    }
  ): Promise<{ message: string; payment: Payment; remainingAmount: number; status: string }> {
    return request(`/api/installments/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Notifications
  async getNotifications(params?: { category?: string; unreadOnly?: boolean }): Promise<{
    notifications: AppNotification[];
    unreadCount: number;
    counts: { dueToday: number; overdue: number; upcoming: number };
    settings: AppSettings;
  }> {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.unreadOnly) query.set('unreadOnly', 'true');
    const qs = query.toString();
    return request(`/api/notifications${qs ? '?' + qs : ''}`);
  },

  async markNotificationRead(id: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/notifications/${id}/read`, {
      method: 'PUT',
    });
  },

  async markAllNotificationsRead(): Promise<{ success: boolean; message: string }> {
    return request('/api/notifications/read-all', {
      method: 'PUT',
    });
  },

  async runCronCheck(): Promise<{ success: boolean; message: string; result: any }> {
    return request('/api/notifications/run-cron', {
      method: 'POST',
    });
  },

  // Settings
  async getSettings(): Promise<{ settings: AppSettings }> {
    return request('/api/settings');
  },

  async updateSettings(settings: Partial<AppSettings>): Promise<{ settings: AppSettings; message: string }> {
    return request('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  async addCustomStatus(name: string): Promise<{ customStatuses: string[]; message: string }> {
    return request('/api/settings/custom-status', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  async deleteCustomStatus(name: string): Promise<{ customStatuses: string[]; message: string }> {
    return request(`/api/settings/custom-status/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
  },

  // Reports
  async getReports(params?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    clientId?: string;
  }): Promise<{
    installments: Installment[];
    payments: Payment[];
    summary: ReportSummary;
  }> {
    const query = new URLSearchParams();
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    if (params?.status) query.set('status', params.status);
    if (params?.clientId) query.set('clientId', params.clientId);

    const qs = query.toString();
    return request(`/api/reports${qs ? '?' + qs : ''}`);
  },

  // ================= BRANCHES MANAGEMENT (إدارة الفروع) =================
  async getBranches(): Promise<{ branches: Branch[] }> {
    return request('/api/branches');
  },

  async createBranch(data: {
    name: string;
    code?: string;
    address?: string;
    phone?: string;
    managerName?: string;
    canViewOtherBranches?: boolean;
    notes?: string;
  }): Promise<{ branch: Branch; message: string }> {
    return request('/api/branches', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateBranch(
    id: string,
    data: Partial<Branch>
  ): Promise<{ branch: Branch; message: string }> {
    return request(`/api/branches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async toggleBranchVisibility(id: string): Promise<{ branch: Branch; message: string }> {
    return request(`/api/branches/${id}/toggle-visibility`, {
      method: 'PATCH',
    });
  },

  async deleteBranch(id: string): Promise<{ message: string }> {
    return request(`/api/branches/${id}`, {
      method: 'DELETE',
    });
  },

  // ================= USERS & EMPLOYEES MANAGEMENT (إدارة الموظفين) =================
  async getUsers(): Promise<{ users: User[] }> {
    return request('/api/users');
  },

  async createUser(data: {
    name: string;
    username: string;
    email: string;
    password?: string;
    role: 'admin' | 'agent' | 'branch_manager';
    branchId?: string;
    phone?: string;
    canViewOtherBranchesOverride?: boolean;
    permissions?: any;
  }): Promise<{ user: User; message: string }> {
    return request('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateUser(
    id: string,
    data: {
      name?: string;
      role?: 'admin' | 'agent' | 'branch_manager';
      password?: string;
      branchId?: string;
      phone?: string;
      isActive?: boolean;
      canViewOtherBranchesOverride?: boolean;
      permissions?: any;
    }
  ): Promise<{ user: User; message: string }> {
    return request(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteUser(id: string): Promise<{ message: string }> {
    return request(`/api/users/${id}`, {
      method: 'DELETE',
    });
  },

  // ================= DATABASE & SCHEMA MIGRATION (نقل الجداول) =================
  async getDatabaseOverview(): Promise<{
    tables: { name: string; arabicName: string; count: number; description: string }[];
    schemaFile: string;
    guideFile: string;
    totalTables: number;
    totalRecords: number;
  }> {
    return request('/api/database/overview');
  },

  async downloadSchemaSql(): Promise<void> {
    const token = localStorage.getItem('aqsat_auth_token');
    const res = await fetch('/api/database/schema-sql', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('فشل تحميل ملف مخطط قواعد البيانات');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'database_schema.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  async downloadExportSql(): Promise<void> {
    const token = localStorage.getItem('aqsat_auth_token');
    const res = await fetch('/api/database/export-sql', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('فشل تفريغ قاعدة البيانات');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `database_dump_${dateStr}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  async downloadBackupJson(): Promise<void> {
    const token = localStorage.getItem('aqsat_auth_token');
    const res = await fetch('/api/database/export-json', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('فشل تحميل النسخة الاحتياطية JSON');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `database_backup_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

// Utilities for Arabic formatting
export function formatCurrency(amount: number | undefined | null, currency: string = 'د.ع'): string {
  const val = Number(amount) || 0;
  return `${val.toLocaleString('ar-SA')} ${currency}`;
}

export function formatDateArabic(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  // Add UTF-8 BOM so Excel opens Arabic correctly
  const BOM = '\uFEFF';
  const csvContent =
    BOM +
    headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(',') +
    '\n' +
    rows
      .map((row) =>
        row
          .map((cell) => {
            const str = String(cell ?? '');
            return `"${str.replace(/"/g, '""')}"`;
          })
          .join(',')
      )
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
