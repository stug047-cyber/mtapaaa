import React from 'react';
import { useApp } from '../context/AppContext';
import { AlertTriangle, Loader2 } from 'lucide-react';

export const DeleteConfirmModal: React.FC = () => {
  const { deleteModal, closeDeleteModal, confirmDelete } = useApp();

  if (!deleteModal.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">{deleteModal.title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">يرجى التأكيد قبل المتابعة</p>
          </div>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
          {deleteModal.message}
        </p>

        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={closeDeleteModal}
            disabled={deleteModal.isProcessing}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={confirmDelete}
            disabled={deleteModal.isProcessing}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-md shadow-rose-600/20 transition-all disabled:opacity-50"
          >
            {deleteModal.isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>نعم، حذف نهائي</span>
          </button>
        </div>
      </div>
    </div>
  );
};
