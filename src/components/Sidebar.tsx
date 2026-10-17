import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Bell,
  BarChart3,
  Settings,
  LogOut,
  Wallet,
  ShieldCheck,
  X,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { activePage, setActivePage, unreadCount, businessName } = useApp();
  const { user, logout } = useAuth();

  const navItems = [
    {
      id: 'dashboard',
      label: 'لوحة التحكم',
      icon: LayoutDashboard,
    },
    {
      id: 'queue',
      label: 'طابور المواعيد',
      icon: CalendarClock,
    },
    {
      id: 'alerts',
      label: 'التنبيهات المجدولة',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      id: 'clients',
      label: 'سجل الزبائن والكفلاء',
      icon: Users,
    },
    {
      id: 'reports',
      label: 'التقارير المالية',
      icon: BarChart3,
    },
    {
      id: 'settings',
      label: 'الإعدادات والموظفين',
      icon: Settings,
    },
  ];

  const handleNavClick = (id: any) => {
    setActivePage(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 right-0 z-50 w-72 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-200 border-l border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header / Brand */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base text-white tracking-wide leading-tight">
                {businessName || 'نظام متابعة الأقساط'}
              </h1>
              <p className="text-xs text-emerald-400 font-medium mt-0.5">إدارة ومتابعة التحصيل</p>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-600/25 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-5 h-5 transition-transform duration-200 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                      isActive
                        ? 'bg-white text-emerald-800'
                        : 'bg-rose-500 text-white shadow-xs shadow-rose-500/40 animate-pulse'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold flex items-center justify-center shrink-0">
                {user?.name ? user.name[0] : 'م'}
              </div>
              <div className="truncate">
                <div className="font-semibold text-sm text-white truncate">{user?.name || 'المدير'}</div>
                <div className="text-xs text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>{user?.role === 'admin' ? 'مدير النظام' : 'محصل'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title="تسجيل الخروج"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
