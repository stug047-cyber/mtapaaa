import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  variant?: 'emerald' | 'navy' | 'amber' | 'rose' | 'slate';
  badge?: string;
  badgeType?: 'warning' | 'danger' | 'success' | 'info';
  onClick?: () => void;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  variant = 'slate',
  badge,
  badgeType = 'info',
  onClick,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'emerald':
        return {
          bg: 'bg-white hover:border-emerald-300',
          iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
          accent: 'text-emerald-700',
        };
      case 'navy':
        return {
          bg: 'bg-white hover:border-blue-300',
          iconBg: 'bg-blue-50 text-blue-700 border border-blue-100',
          accent: 'text-slate-900',
        };
      case 'amber':
        return {
          bg: 'bg-white hover:border-amber-300',
          iconBg: 'bg-amber-50 text-amber-600 border border-amber-100',
          accent: 'text-amber-700',
        };
      case 'rose':
        return {
          bg: 'bg-white hover:border-rose-300',
          iconBg: 'bg-rose-50 text-rose-600 border border-rose-100',
          accent: 'text-rose-600',
        };
      default:
        return {
          bg: 'bg-white hover:border-slate-300',
          iconBg: 'bg-slate-100 text-slate-700 border border-slate-200',
          accent: 'text-slate-900',
        };
    }
  };

  const getBadgeStyles = () => {
    switch (badgeType) {
      case 'danger':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const styles = getVariantStyles();

  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-2xl border border-slate-200/90 shadow-xs transition-all duration-200 ${
        styles.bg
      } ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <h3 className={`text-2xl font-bold mt-1.5 tracking-tight ${styles.accent}`}>
            {value}
          </h3>

          {subtext && (
            <p className="text-xs text-slate-500 font-medium mt-1.5 flex items-center gap-1.5">
              {subtext}
            </p>
          )}
        </div>

        <div className={`p-3 rounded-xl ${styles.iconBg} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {badge && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getBadgeStyles()}`}>
            {badge}
          </span>
        </div>
      )}
    </div>
  );
};
