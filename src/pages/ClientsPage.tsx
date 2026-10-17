import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api, formatCurrency, formatDateArabic } from '../services/api';
import { Client } from '../types';
import {
  Users,
  Search,
  UserPlus,
  Phone,
  MessageCircle,
  Eye,
  Edit,
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  PlusCircle,
  Loader2,
} from 'lucide-react';

export const ClientsPage: React.FC = () => {
  const {
    openAddClientModal,
    openEditClientModal,
    openClientDetail,
    openAddAppointmentModal,
    openDeleteModal,
    dataRefreshKey,
    showToast,
    currency,
  } = useApp();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'overdue' | 'completed'>('all');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api
      .getClients(searchTerm)
      .then((res) => {
        if (isMounted) {
          setClients(res.clients);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error loading clients:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [searchTerm, dataRefreshKey]);

  const filteredClients = clients.filter((c) => {
    if (statusFilter === 'all') return true;
    return c.status === statusFilter;
  });

  const handleDeleteClient = (client: Client) => {
    openDeleteModal(
      'تأكيد حذف صاحب الموعد',
      `هل أنت متأكد من حذف العميل (${client.name})؟ سيؤدي ذلك أيضاً إلى حذف كافة الأقساط وسجلات السداد المرتبطة به بشكل نهائي.`,
      async () => {
        await api.deleteClient(client.id);
        showToast('تم حذف صاحب الموعد وسجلاته بنجاح', 'success');
      }
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            سجل الزبائن والكفلاء
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            إدارة بيانات الزبائن وأرقام الكفلاء الضامنين، ومتابعة المبالغ المطلوبة ومواعيد السداد
          </p>
        </div>

        <button
          onClick={openAddClientModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>إضافة زبون / كفيل جديد</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالاسم الكامل أو رقم الهاتف أو رقم الهوية..."
            className="w-full pr-10 pl-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            الكل ({clients.length})
          </button>

          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              statusFilter === 'active'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            نشط
          </button>

          <button
            onClick={() => setStatusFilter('overdue')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              statusFilter === 'overdue'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            لديه متأخرات
          </button>

          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              statusFilter === 'completed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            مكتمل السداد
          </button>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            <span>جاري تحميل بيانات أصحاب المواعيد...</span>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="p-12 text-center bg-slate-50">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-700 text-base">لا يوجد أصحاب مواعيد مطابقين</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              لم نجد أي عملاء مطابقين لمعايير البحث أو الفلتر المحددة.
            </p>
            <button
              onClick={openAddClientModal}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة صاحب موعد جديد</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">العميل (صاحب الموعد)</th>
                  <th className="py-3.5 px-4">رقم الهاتف</th>
                  <th className="py-3.5 px-4">الكفيل الضامن</th>
                  <th className="py-3.5 px-4">المبلغ المطلوب</th>
                  <th className="py-3.5 px-4">المسدد</th>
                  <th className="py-3.5 px-4">المتبقي</th>
                  <th className="py-3.5 px-4">الموعد القادم</th>
                  <th className="py-3.5 px-4">حالة الحساب</th>
                  <th className="py-3.5 px-4 sm:px-6 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredClients.map((client) => {
                  let cleanClientPhone = client.phone.replace(/\D/g, '');
                  if (cleanClientPhone.startsWith('07')) cleanClientPhone = '964' + cleanClientPhone.slice(1);
                  else if (cleanClientPhone.startsWith('0')) cleanClientPhone = '964' + cleanClientPhone.slice(1);
                  else if (!cleanClientPhone.startsWith('964')) cleanClientPhone = '964' + cleanClientPhone;

                  let cleanGuarantorPhone = (client.guarantorPhone || '').replace(/\D/g, '');
                  if (cleanGuarantorPhone.startsWith('07')) cleanGuarantorPhone = '964' + cleanGuarantorPhone.slice(1);
                  else if (cleanGuarantorPhone.startsWith('0')) cleanGuarantorPhone = '964' + cleanGuarantorPhone.slice(1);
                  else if (cleanGuarantorPhone && !cleanGuarantorPhone.startsWith('964')) cleanGuarantorPhone = '964' + cleanGuarantorPhone;

                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Name - clickable to open details */}
                      <td className="py-4 px-4 sm:px-6">
                        <button
                          onClick={() => openClientDetail(client.id)}
                          className="font-bold text-slate-900 hover:text-emerald-700 transition-colors text-right block group-hover:underline"
                        >
                          {client.name}
                        </button>
                        {client.nationalId && (
                          <span className="text-[11px] text-slate-400 block mt-0.5" dir="ltr">
                            هوية: {client.nationalId}
                          </span>
                        )}
                      </td>

                      {/* Phone with WhatsApp and call */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-700" dir="ltr">
                            {client.phone}
                          </span>
                          <a
                            href={`https://wa.me/${cleanClientPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50"
                            title="مراسلة العميل عبر واتساب"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        </div>
                      </td>

                      {/* Guarantor Details */}
                      <td className="py-4 px-4">
                        {client.guarantorName ? (
                          <div>
                            <span className="font-semibold text-slate-800 text-xs block">
                              {client.guarantorName}
                            </span>
                            {client.guarantorPhone ? (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[11px] text-slate-500 font-mono" dir="ltr">
                                  {client.guarantorPhone}
                                </span>
                                <a
                                  href={`https://wa.me/${cleanGuarantorPhone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-600 hover:text-emerald-700"
                                  title="مراسلة الكفيل عبر واتساب"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400">لا يوجد رقم كفيل</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">غير مسجل</span>
                        )}
                      </td>

                      {/* Total Required */}
                      <td className="py-4 px-4 font-bold text-slate-900">
                        {formatCurrency(client.totalInstallments, currency)}
                      </td>

                      {/* Paid Amount */}
                      <td className="py-4 px-4 font-bold text-emerald-700">
                        {formatCurrency(client.paidAmount, currency)}
                      </td>

                      {/* Remaining Amount */}
                      <td className="py-4 px-4 font-bold text-rose-600">
                        {formatCurrency(client.remainingAmount, currency)}
                      </td>

                      {/* Next Due Date */}
                      <td className="py-4 px-4">
                        {client.nextDueDate ? (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                            <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{formatDateArabic(client.nextDueDate)}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">—</span>
                        )}
                      </td>

                      {/* Account Status */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                            client.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : client.status === 'overdue'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {client.status === 'completed' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>مكتمل</span>
                            </>
                          ) : client.status === 'overdue' ? (
                            <>
                              <AlertCircle className="w-3 h-3" />
                              <span>متأخر</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>نشط</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Action Buttons: View, Edit, Delete */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Quick Add Appointment */}
                          <button
                            onClick={() =>
                              openAddAppointmentModal({
                                clientName: client.name,
                                clientPhone: client.phone,
                                guarantorName: client.guarantorName,
                                guarantorPhone: client.guarantorPhone,
                              })
                            }
                            title="إضافة موعد جديد في الطابور لهذا الزبون"
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>

                          {/* View details */}
                          <button
                            onClick={() => openClientDetail(client.id)}
                            title="عرض البطاقة التفصيلية"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => openEditClientModal(client)}
                            title="تعديل بيانات صاحب الموعد"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteClient(client)}
                            title="حذف صاحب الموعد"
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
