import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Guarantor } from '../types';
import { User, Phone, ShieldAlert, CheckCircle2, ChevronDown, Sparkles } from 'lucide-react';

interface GuarantorAutocompleteInputProps {
  guarantorName: string;
  onNameChange: (name: string) => void;
  guarantorPhone: string;
  onPhoneChange: (phone: string) => void;
  errorName?: string;
  errorPhone?: string;
  disabled?: boolean;
}

export const GuarantorAutocompleteInput: React.FC<GuarantorAutocompleteInputProps> = ({
  guarantorName,
  onNameChange,
  guarantorPhone,
  onPhoneChange,
  errorName,
  errorPhone,
  disabled = false,
}) => {
  const [guarantors, setGuarantors] = useState<Guarantor[]>([]);
  const [filtered, setFiltered] = useState<Guarantor[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [justSelected, setJustSelected] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load existing guarantors from backend
  useEffect(() => {
    let isMounted = true;
    api.getGuarantors()
      .then((res) => {
        if (isMounted) {
          setGuarantors(res.guarantors || []);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch guarantors list:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter list as user types in guarantor name
  useEffect(() => {
    const query = guarantorName.trim().toLowerCase();
    if (!query) {
      setFiltered([]);
      setIsOpen(false);
      return;
    }

    const matches = guarantors.filter(
      (g) =>
        g.name.toLowerCase().includes(query) ||
        (g.phone && g.phone.includes(query)) ||
        (g.relation && g.relation.toLowerCase().includes(query))
    );

    setFiltered(matches);
    setIsOpen(matches.length > 0);
    setHighlightedIndex(-1);
  }, [guarantorName, guarantors]);

  // Handle clicking outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // When a guarantor is picked from suggestions
  const selectGuarantor = (g: Guarantor) => {
    onNameChange(g.name);
    if (g.phone) {
      onPhoneChange(g.phone);
    }
    setIsOpen(false);
    setJustSelected(true);
    setTimeout(() => setJustSelected(false), 3000);
  };

  // Auto-save new guarantor when both name and phone are filled
  const handlePhoneBlur = () => {
    const trimmedName = guarantorName.trim();
    const trimmedPhone = guarantorPhone.trim();
    if (trimmedName.length >= 2 && trimmedPhone.length >= 7) {
      api.saveGuarantor({
        name: trimmedName,
        phone: trimmedPhone,
      }).then((res) => {
        if (res.guarantor) {
          setGuarantors((prev) => {
            const exists = prev.some(
              (item) => item.name.toLowerCase() === trimmedName.toLowerCase() || item.phone === trimmedPhone
            );
            if (!exists) {
              return [...prev, res.guarantor];
            }
            return prev.map((item) =>
              item.name.toLowerCase() === trimmedName.toLowerCase() ? res.guarantor : item
            );
          });
        }
      }).catch((err) => console.warn('Could not auto-save guarantor:', err));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filtered.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
        e.preventDefault();
        selectGuarantor(filtered[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 space-y-3" ref={containerRef}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 space-x-reverse text-amber-900 font-bold text-sm">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <span>معلومات الكفيل الضامن</span>
          <span className="text-[11px] font-normal text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
            تخزين واقتراح تلقائي
          </span>
        </div>

        {justSelected && (
          <span className="inline-flex items-center space-x-1 space-x-reverse text-xs text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full font-bold animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>تم استيراد رقم الكفيل تلقائياً</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
        {/* Guarantor Name Input with Autocomplete */}
        <div className="relative">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            اسم الكفيل <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              disabled={disabled}
              value={guarantorName}
              onChange={(e) => onNameChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (guarantorName.trim() && filtered.length > 0) setIsOpen(true);
              }}
              placeholder="اكتب اسم الكفيل (سيتم جلب واقتراح الكفلاء تلقائياً)..."
              autoComplete="off"
              className={`w-full pr-9 pl-8 py-2 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 ${
                errorName
                  ? 'border-rose-400 focus:ring-rose-200'
                  : 'border-amber-300 focus:border-amber-500 focus:ring-amber-200'
              }`}
            />
            <User className="w-4 h-4 text-amber-500 absolute right-3 top-2.5 pointer-events-none" />

            {/* Quick dropdown arrow if results exist */}
            {filtered.length > 0 && (
              <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className="absolute left-2.5 top-2.5 text-amber-600 hover:text-amber-800 p-0.5"
                title="عرض اقتراحات الكفلاء"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>

          {errorName && (
            <p className="text-xs text-rose-500 mt-1">{errorName}</p>
          )}

          {/* Autocomplete Dropdown List */}
          {isOpen && filtered.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-amber-300 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
              <div className="p-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-[11px] font-bold text-amber-900">
                <span className="flex items-center space-x-1 space-x-reverse">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>اختر كفيل مسجل مسبقاً لجلب هاتفه تلقائياً:</span>
                </span>
                <span className="bg-amber-200/80 px-1.5 py-0.2 rounded text-[10px]">
                  {filtered.length} مطابق
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {filtered.map((g, index) => (
                  <button
                    key={g.id || index}
                    type="button"
                    onClick={() => selectGuarantor(g)}
                    className={`w-full text-right p-2.5 text-xs transition-colors flex items-center justify-between ${
                      highlightedIndex === index
                        ? 'bg-amber-100/90 text-amber-950 font-bold'
                        : 'hover:bg-amber-50/70 text-slate-800'
                    }`}
                  >
                    <div>
                      <span className="font-bold block text-slate-900">{g.name}</span>
                      {g.relation && (
                        <span className="text-[10px] text-slate-500">صلة القرابة: {g.relation}</span>
                      )}
                    </div>

                    <div className="text-left font-mono text-[11px] bg-slate-100 px-2 py-1 rounded text-slate-700" dir="ltr">
                      <span className="flex items-center space-x-1 space-x-reverse">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{g.phone || 'بدون هاتف'}</span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Guarantor Phone Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            رقم هاتف الكفيل <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="tel"
              dir="ltr"
              disabled={disabled}
              value={guarantorPhone}
              onChange={(e) => onPhoneChange(e.target.value)}
              onBlur={handlePhoneBlur}
              placeholder="07809876543 (يُحفظ تلقائياً)"
              className={`w-full pr-9 pl-3 py-2 text-sm rounded-lg border bg-white text-right focus:outline-none focus:ring-2 ${
                errorPhone
                  ? 'border-rose-400 focus:ring-rose-200'
                  : 'border-amber-300 focus:border-amber-500 focus:ring-amber-200'
              }`}
            />
            <Phone className="w-4 h-4 text-amber-500 absolute right-3 top-2.5 pointer-events-none" />
          </div>
          {errorPhone && (
            <p className="text-xs text-rose-500 mt-1">{errorPhone}</p>
          )}
        </div>
      </div>
    </div>
  );
};
