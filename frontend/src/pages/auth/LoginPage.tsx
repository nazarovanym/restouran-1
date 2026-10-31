import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res: any = await api.post('/auth/login', { username, password });
      if (res.success) {
        login(res.token, res.user);
        // Uyğun başlanğıc səhifəsinə yönləndiririk
        if (res.user.role === 'KITCHEN_STAFF') navigate('/kitchen');
        else if (res.user.role === 'WAITER') navigate('/waiter');
        else if (res.user.role === 'STOCK_MANAGER') navigate('/inventory');
        else navigate('/pos');
      }
    } catch (err: any) {
      setError(err.message || 'Giriş uğursuz oldu');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (userVal: string, passVal: string) => {
    setUsername(userVal);
    setPassword(passVal);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-8">
        {/* Loqo & Başlıq */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary-600 to-amber-500 items-center justify-center text-white shadow-xl shadow-primary-500/30 mb-4">
            <Flame className="w-9 h-9 fill-current" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Naxçıvan <span className="text-primary-500">RMS</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            İnteqrasiya Olunmuş Restoran İdarəetmə Sisteminə Giriş
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              İstifadəçi Adı
            </label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                placeholder="İstifadəçi adı daxil edin"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Şifrə
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary-500/30 flex items-center justify-center gap-2 transition disabled:opacity-50 mt-6"
          >
            {loading ? 'Daxil olunur...' : 'Sistemə Daxil Ol'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Rollar Seçimi */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center mb-3">
            Sürətli Giriş (Test Hesabları)
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => handleQuickDemo('admin', 'admin123')}
              className="p-2 text-left rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-primary-950/40 text-slate-700 dark:text-slate-300 hover:text-primary-600 transition border border-slate-200 dark:border-slate-700"
            >
              <div className="font-bold">Restoran Direktoru</div>
              <div className="text-[10px] text-slate-400">admin / admin123</div>
            </button>
            <button
              onClick={() => handleQuickDemo('kassir1', 'kassa123')}
              className="p-2 text-left rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-primary-950/40 text-slate-700 dark:text-slate-300 hover:text-primary-600 transition border border-slate-200 dark:border-slate-700"
            >
              <div className="font-bold">Kassir</div>
              <div className="text-[10px] text-slate-400">kassir1 / kassa123</div>
            </button>
            <button
              onClick={() => handleQuickDemo('metbex1', 'chef123')}
              className="p-2 text-left rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-primary-950/40 text-slate-700 dark:text-slate-300 hover:text-primary-600 transition border border-slate-200 dark:border-slate-700"
            >
              <div className="font-bold">Mətbəx / Aşpaz</div>
              <div className="text-[10px] text-slate-400">metbex1 / chef123</div>
            </button>
            <button
              onClick={() => handleQuickDemo('ofisiant1', 'waiter123')}
              className="p-2 text-left rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-primary-950/40 text-slate-700 dark:text-slate-300 hover:text-primary-600 transition border border-slate-200 dark:border-slate-700"
            >
              <div className="font-bold">Ofisiant</div>
              <div className="text-[10px] text-slate-400">ofisiant1 / waiter123</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
