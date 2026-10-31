import React, { useState } from 'react';
import { Sun, Moon, Volume2, VolumeX, Wifi, WifiOff, User as UserIcon, LogOut } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { soundService } from '../../services/soundService';

export const Header: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => {
  const { theme, toggleTheme } = useTheme();
  const { isConnected } = useSocket();
  const { user, logout } = useAuth();
  const [soundOn, setSoundOn] = useState(soundService.enabled);

  const toggleSound = () => {
    soundService.enabled = !soundService.enabled;
    setSoundOn(soundService.enabled);
  };

  return (
    <header className="h-16 px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-40 transition-colors">
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Real-time status badge */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
            isConnected
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
          }`}
        >
          {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          <span>{isConnected ? 'Canlı Sinxron' : 'Bağlantı kəsildi'}</span>
        </div>

        {/* Səs rejimi dəyişdirici */}
        <button
          onClick={toggleSound}
          title={soundOn ? 'Səs aktivdir' : 'Səs səssizdir'}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          {soundOn ? <Volume2 className="w-4 h-4 text-primary-500" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
        </button>

        {/* Dark/Light mode toggle */}
        <button
          onClick={toggleTheme}
          title="Gecə/Gündüz rejimi"
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* İstifadəçi və Çıxış */}
        {user && (
          <div className="flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-xs">
              {user.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                {user.fullName.split(' ')[0]}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {user.role}
              </div>
            </div>
            <button
              onClick={logout}
              title="Sistemdən çıx"
              className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
