import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  CreditCard,
  ChefHat,
  LayoutGrid,
  Users2,
  UtensilsCrossed,
  Package,
  BarChart3,
  QrCode,
  ShieldCheck,
  Flame
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { hasRole, user } = useAuth();

  const navItems = [
    {
      to: '/pos',
      label: 'Kassa və POS',
      icon: CreditCard,
      roles: ['SUPER_ADMIN', 'RESTAURANT_ADMIN', 'CASHIER']
    },
    {
      to: '/kitchen',
      label: 'Mətbəx Ekranı (KDS)',
      icon: ChefHat,
      roles: ['SUPER_ADMIN', 'RESTAURANT_ADMIN', 'KITCHEN_STAFF']
    },
    {
      to: '/tables',
      label: 'Masalar və QR',
      icon: LayoutGrid,
      roles: ['SUPER_ADMIN', 'RESTAURANT_ADMIN', 'CASHIER', 'WAITER']
    },
    {
      to: '/waiter',
      label: 'Ofisiant Paneli',
      icon: Users2,
      roles: ['SUPER_ADMIN', 'RESTAURANT_ADMIN', 'WAITER']
    },
    {
      to: '/menu',
      label: 'Menyu və Resept',
      icon: UtensilsCrossed,
      roles: ['SUPER_ADMIN', 'RESTAURANT_ADMIN']
    },
    {
      to: '/inventory',
      label: 'Anbar və Ərzaq',
      icon: Package,
      roles: ['SUPER_ADMIN', 'RESTAURANT_ADMIN', 'STOCK_MANAGER']
    },
    {
      to: '/reports',
      label: 'Hesabatlar',
      icon: BarChart3,
      roles: ['SUPER_ADMIN', 'RESTAURANT_ADMIN']
    },
    {
      to: '/staff',
      label: 'İşçi Heyəti',
      icon: ShieldCheck,
      roles: ['SUPER_ADMIN', 'RESTAURANT_ADMIN']
    }
  ];

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen shrink-0 transition-colors">
      {/* Brend loqo */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-primary-500/30">
          <Flame className="w-5 h-5 fill-current" />
        </div>
        <div>
          <span className="font-extrabold text-base tracking-tight text-slate-800 dark:text-white">
            Naxçıvan <span className="text-primary-500">RMS</span>
          </span>
          <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Restoran Sistemi</p>
        </div>
      </div>

      {/* Naviqasiya menyusu */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2">
          Əsas Modullar
        </div>
        {navItems
          .filter((item) => hasRole(...item.roles))
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-primary-500 text-white shadow-md shadow-primary-500/25'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

        <div className="pt-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2">
          Müştəri İnterfeysi
        </div>
        <a
          href="/order/sec_zal_tbl_01_a8f9"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition border border-emerald-200 dark:border-emerald-800"
        >
          <QrCode className="w-5 h-5 shrink-0" />
          <span>Masa 1 QR Menyu</span>
        </a>
      </nav>

      {/* Aşağı hissə: cari istifadəçi */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          İstifadəçi: <span className="font-bold text-slate-800 dark:text-slate-200">{user?.fullName}</span>
        </div>
        <div className="text-[11px] text-primary-600 dark:text-primary-400 font-semibold mt-0.5">
          {user?.role}
        </div>
      </div>
    </aside>
  );
};
