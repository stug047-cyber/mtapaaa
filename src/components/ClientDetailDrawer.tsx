import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api, formatCurrency, formatDateArabic } from '../services/api';
import { Client, Installment, Payment, CallLog } from '../types';
import {
  X,
  Phone,
  MessageCircle,
  IdCard,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Edit,
  Wallet,
  Receipt,
  ArrowUpRight,
  Loader2,
  PhoneCall,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

export const ClientDetailDrawer: React.FC = () => {
  const {
    selectedClientId,
    closeClientDetail,
    openEditClientModal,
    openCallModal,
    openPaymentModal,
    hasPermission,
    dataRefreshKey,
    showToast,
  } = useApp();

  const [clientData, setClientData] = useState<{
    client: Client;
    installments: Installment[];
    payments: Payment[];
    summary: { totalAmount: number; totalPaid: number; totalRemaining: number; currency: string };
  } | null>(null);

  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'installments' | 'calls' | 'payments' | 'info'>('installments');

  useEffect(() => {
    if (!selectedClientId) {
      setClientData(null);
      setCalls([]);
      return;
    }

    let isMounted = true;
    setLoading(true);

    Promise.all([
      api.getClientById(selectedClientId),
      api.getClientCalls(selectedClientId),
    ])
      .then(([resClient, resCalls]) => {
        if (isMounted) {
          setClientData(resClient);
          setCalls(resCalls.calls || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching client details:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedClientId, dataRefreshKey]);

  if (!selectedClientId) return null;

  const client = clientData?.client;
  const installments = clientData?.installments || [];
  const payments = clientData?.payments || [];
  const summary = clientData?.summary;
  const currency = summary?.currency || 'د.ع';

  const cleanPhone = (p?: string) => (p || '').replace(/\D/g, '');
  const toWhatsAppUrl = (phone?: string, text?: string) => {
    if (!phone) return '#';
    let p = cleanPhone(phone);
    if (p.startsWith('0')) {
      p = '964' + p.substring(1);
    }
    const msg = encodeURIComponent(text || 'السلام عليكم، تذكير بموعد سداد القسط المستحق.');
    return `https://wa.me/${p}?text=${msg}`;
  };

  const statusLabels: Record<string, { label: string; bg: string }> = {
    promised: { label: 'وعد بالسداد (انطاني موعد)', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    unpaid: { label: 'غير مسدد (مستحق)', bg: 'bg-slate-100 text-slate-800 border-slate-300' },
    partially_paid: { label: 'مسدد جزئياً', bg: 'bg-blue-100 text-blue-800 border-blue-300' },
    paid: { label: 'مسدد بالكامل', bg: 'bg-teal-100 text-teal-800 border-teal-300' },
    overdue: { label: 'متأخر عن الموعد', bg: 'bg-rose-100 text-rose-800 border-rose-300' },
    broken_promise: { label: 'أخلف بالموعد', bg: 'bg-amber-100 text-amber-800 border-amber-300' },
    no_answer: { label: 'تم الاتصال ولا يرد', bg: 'bg-orange-100 text-orange-800 border-orange-300' },
    phone_off: { label: 'الهاتف مغلق / خارج التغطية', bg: 'bg-zinc-100 text-zinc-800 border-zinc-300' },
    postponed: { label: 'تم تأجيل الموعد', bg: 'bg-purple-100 text-purple-800 border-purple-300' },
    in_followup: { label: 'قيد المتابعة والاتصال', bg: 'bg-sky-100 text-sky-800 border-sky-300' },
    refused: { label: 'ممتنع / رافض للدفع', bg: 'bg-red-100 text-red-800 border-red-300' },
    referred_to_guarantor: { label: 'محال إلى الكفيل', bg: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  };

  const methodLabels: Record<string, string> = {
    cash: 'نقداً (كاش)',
    bank_transfer: 'تحويل بنكي / إلكتروني',
    cheque: 'شيك مصدّق',
    card: 'بطاقة دفع',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-y-0 left-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl border-r border-slate-200 flex flex-col">
          {/* Header */}
          <div className="p-6 bg-slate-900 text-white relative">
            <button
              onClick={closeClientDetail}
              className="absolute left-5 top-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {loading ? (
              <div className="flex items-center gap-3 py-6">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                <span className="text-slate-300 text-sm">جاري تحميل بيانات الزبون والكفيل...</span>
              </div>
            ) : client ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4 pl-10">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-2">
                      سجل الزبون والكفيل
                    </span>
                    <h2 className="text-2xl font-bold text-white tracking-tight">{client.name}</h2>
                    <div className="flex items-center gap-2 text-sm text-slate-300 mt-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span dir="ltr">{client.phone}</span>
                    </div>
                  </div>

                  {hasPermission('canEditClients') && (
                    <button
                      onClick={() => openEditClientModal(client)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>تعديل البيانات</span>
                    </button>
                  )}
                </div>

                {/* Guarantor Highlight in Banner */}
                {client.guarantorName && (
                  <div className="p-3 bg-slate-800/90 rounded-2xl border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <span className="text-[10px] text-amber-400 font-bold block">الكفيل الضامن:</span>
                      <span className="text-sm font-bold text-white">{client.guarantorName}</span>
                      {client.guarantorRelation && (
                        <span className="text-xs text-slate-400 mr-2">({client.guarantorRelation})</span>
                      )}
                      {client.guarantorPhone && (
                        <span className="text-xs text-emerald-400 block mt-0.5 font-mono" dir="ltr">
                          {client.guarantorPhone}
                        </span>
                      )}
                    </div>

                    {client.guarantorPhone && (
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={`tel:${client.guarantorPhone}`}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-amber-300 text-xs font-bold inline-flex items-center gap-1.5 transition-colors border border-slate-600"
                          title="اتصال بالكفيل الضامن"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>اتصال بالكفيل</span>
                        </a>
                        <a
                          href={toWhatsAppUrl(
                            client.guarantorPhone,
                            `السلام عليكم أستاذ ${client.guarantorName}، نود التواصل معكم بخصوص كفالتكم للزبون ${client.name} وموعد سداد المبلغ المطلوب.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                          title="واتساب الكفيل الضامن"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>واتساب الكفيل</span>
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Contact & Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <a
                    href={toWhatsAppUrl(client.phone, `السلام عليكم أستاذ ${client.name}، نود تذكيرك بموعد الحضور ودفع المبلغ المستحق المطلوب.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-xs"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>مراسلة واتساب</span>
                  </a>

                  <a
                    href={`tel:${client.phone}`}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>اتصال بالزبون</span>
                  </a>

                  {/* Log Call & Payment Promise */}
                  {hasPermission('canRecordCalls') && (
                    <button
                      onClick={() => openCallModal(client)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 transition-all mr-auto shadow-md"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>تسجيل اتصال وموعد سداد</span>
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Quick Financial Summary */}
          {summary && (
            <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 divide-x divide-x-reverse divide-slate-200 text-center py-3.5 px-4">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">إجمالي المستحق</span>
                <span className="text-base font-bold text-slate-900 mt-0.5 block">
                  {formatCurrency(summary.totalAmount, currency)}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-emerald-600 block">إجمالي المدفوع</span>
                <span className="text-base font-bold text-emerald-700 mt-0.5 block">
                  {formatCurrency(summary.totalPaid, currency)}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-rose-600 block">المبلغ المتبقي</span>
                <span className="text-base font-bold text-rose-700 mt-0.5 block">
                  {formatCurrency(summary.totalRemaining, currency)}
                </span>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 px-6 bg-white gap-4 sm:gap-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('installments')}
              className={`py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'installments'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>مواعيد السداد في الطابور ({installments.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('calls')}
              className={`py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'calls'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <PhoneCall className="w-4 h-4 text-amber-600" />
              <span>سجل الاتصالات والمواعيد ({calls.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('payments')}
              className={`py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'payments'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>سجل المدفوعات ({payments.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('info')}
              className={`py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'info'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <IdCard className="w-4 h-4" />
              <span>البيانات والكفيل</span>
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {loading ? (
              <div className="text-center py-12 text-slate-400">جاري تحميل البيانات...</div>
            ) : activeTab === 'installments' ? (
              installments.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">لا توجد مواعيد سداد مسجلة حالياً</p>
                  <p className="text-xs text-slate-500 mt-1">
                    يمكنك الاتصال بالزبون وتسجيل موعد سداد متفق عليه
                  </p>
                  {hasPermission('canRecordCalls') && (
                    <button
                      onClick={() => openCallModal(client)}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                    >
                      <PhoneCall className="w-4 h-4" />
                      <span>تسجيل اتصال وموعد سداد</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {installments.map((inst) => {
                    const remaining = Math.max(0, inst.amount - (inst.paidAmount || 0));
                    const isPaid = inst.status === 'paid' || remaining === 0;
                    const st = statusLabels[inst.status] || { label: inst.status, bg: 'bg-slate-100 text-slate-700 border-slate-200' };

                    return (
                      <div
                        key={inst.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isPaid
                            ? 'bg-emerald-50/40 border-emerald-200/80'
                            : inst.status === 'overdue' || inst.status === 'broken_promise'
                            ? 'bg-rose-50/40 border-rose-200/80'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${st.bg}`}>
                                {st.label}
                              </span>
                              <span className="text-xs font-semibold text-slate-500">
                                استحقاق: {formatDateArabic(inst.dueDate)}
                              </span>
                            </div>

                            <div className="mt-2 text-lg font-bold text-slate-900">
                              {formatCurrency(inst.amount, currency)}
                            </div>

                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                              <span>المدفوع: {formatCurrency(inst.paidAmount || 0, currency)}</span>
                              <span>المتبقي: {formatCurrency(remaining, currency)}</span>
                            </div>

                            {inst.notes && (
                              <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                {inst.notes}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-2 shrink-0">
                            {!isPaid && hasPermission('canRecordPayments') && (
                              <button
                                onClick={() => openPaymentModal(inst)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
                              >
                                <Wallet className="w-3.5 h-3.5" />
                                <span>تسجيل سداد</span>
                              </button>
                            )}

                            {hasPermission('canRecordCalls') && (
                              <button
                                onClick={() => openCallModal(client)}
                                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1"
                              >
                                <PhoneCall className="w-3 h-3" />
                                <span>مكالمة جديدة</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : activeTab === 'calls' ? (
              /* Calls Log Tab */
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2">
                  <h4 className="text-xs font-bold text-slate-700">سجل الاتصالات والمواعيد المتفق عليها</h4>
                  {hasPermission('canRecordCalls') && (
                    <button
                      onClick={() => openCallModal(client)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>+ تسجيل مكالمة جديدة</span>
                    </button>
                  )}
                </div>

                {calls.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <PhoneCall className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">لا توجد اتصالات مسجلة مع هذا الزبون</p>
                    <p className="text-xs text-slate-500 mt-1">ابدأ بالاتصال وتثبيت نتيجة المكالمة وموعد السداد</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {calls.map((c) => (
                      <div key={c.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {c.resultLabel || c.result}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {formatDateArabic(c.callDate)}
                          </span>
                        </div>

                        {c.promisedDate && (
                          <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 font-semibold flex items-center justify-between">
                            <span>موعد السداد المتفق عليه: {formatDateArabic(c.promisedDate)}</span>
                            {c.promisedAmount && (
                              <span>المبلغ الموعود: {formatCurrency(c.promisedAmount, currency)}</span>
                            )}
                          </div>
                        )}

                        {c.notes && (
                          <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
                            {c.notes}
                          </p>
                        )}

                        <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-1 border-t border-slate-100">
                          <span>الموظف المتصل: {c.callerName || 'غير محدد'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeTab === 'payments' ? (
              /* Payments Tab */
              payments.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">لا توجد مدفوعات مسجلة حتى الآن</p>
                  <p className="text-xs text-slate-500 mt-1">عند استلام دفعة، يمكنك تسجيلها لتحديث الرصيد</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((p) => (
                    <div key={p.id} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-emerald-700">
                              + {formatCurrency(p.amount, currency)}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                              {methodLabels[p.paymentMethod] || p.paymentMethod}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                            <span>التاريخ: {formatDateArabic(p.paymentDate)}</span>
                            {p.referenceNo && (
                              <span className="text-slate-400">| رقم الإيصال: {p.referenceNo}</span>
                            )}
                          </div>
                          {p.notes && <p className="text-xs text-slate-600 mt-1.5">{p.notes}</p>}
                        </div>

                        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                          <ArrowUpRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Info Tab */
              <div className="space-y-4">
                {/* Guarantor Card Highlight */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-2xl p-5 border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-amber-700" />
                      <h4 className="font-bold text-amber-950 text-sm">بيانات الكفيل الضامن</h4>
                    </div>
                    {client?.guarantorPhone && (
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`tel:${client.guarantorPhone}`}
                          className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold inline-flex items-center gap-1"
                        >
                          <PhoneCall className="w-3 h-3" />
                          <span>اتصال</span>
                        </a>
                        <a
                          href={toWhatsAppUrl(
                            client.guarantorPhone,
                            `السلام عليكم أستاذ ${client.guarantorName}، بخصوص كفالتكم للزبون ${client.name}.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>واتساب</span>
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-amber-800/80 font-bold block mb-0.5">اسم الكفيل الضامن:</span>
                      <p className="font-bold text-slate-900 text-sm">{client?.guarantorName || 'غير مسجل'}</p>
                    </div>

                    <div>
                      <span className="text-amber-800/80 font-bold block mb-0.5">رقم هاتف الكفيل:</span>
                      <p className="font-bold text-slate-900 font-mono" dir="ltr">{client?.guarantorPhone || '—'}</p>
                    </div>

                    {client?.guarantorRelation && (
                      <div>
                        <span className="text-amber-800/80 font-bold block mb-0.5">صلة القرابة:</span>
                        <p className="font-medium text-slate-800">{client.guarantorRelation}</p>
                      </div>
                    )}

                    {client?.guarantorAddress && (
                      <div>
                        <span className="text-amber-800/80 font-bold block mb-0.5">عنوان الكفيل:</span>
                        <p className="font-medium text-slate-800">{client.guarantorAddress}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Debtor Profile Card */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3.5">
                  <h4 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-2">بيانات الزبون صاحب القسط</h4>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block mb-0.5">الاسم الكامل</span>
                    <p className="text-sm font-bold text-slate-800">{client?.name}</p>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-slate-400 block mb-0.5">رقم الهاتف</span>
                    <p className="text-sm font-bold text-slate-800 font-mono" dir="ltr">{client?.phone}</p>
                  </div>

                  {client?.nationalId && (
                    <div>
                      <span className="text-xs font-semibold text-slate-400 block mb-0.5">رقم الهوية الوطنية / البطاقة الموحدة</span>
                      <p className="text-sm font-bold text-slate-800 font-mono" dir="ltr">{client.nationalId}</p>
                    </div>
                  )}

                  {client?.address && (
                    <div>
                      <span className="text-xs font-semibold text-slate-400 block mb-0.5">العنوان ومكان السكن</span>
                      <p className="text-sm font-semibold text-slate-800">{client.address}</p>
                    </div>
                  )}

                  {client?.notes && (
                    <div>
                      <span className="text-xs font-semibold text-slate-400 block mb-0.5">ملاحظات الزبون</span>
                      <p className="text-sm text-slate-700 bg-white p-3 rounded-xl border border-slate-200">
                        {client.notes}
                      </p>
                    </div>
                  )}

                  <div>
                    <span className="text-xs font-semibold text-slate-400 block mb-0.5">تاريخ فتح الملف</span>
                    <p className="text-xs font-medium text-slate-600">{formatDateArabic(client?.createdAt)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
