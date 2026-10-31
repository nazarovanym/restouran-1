import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Plus,
  User,
  Phone,
  Lock,
  CheckCircle2,
  XCircle,
  Key,
  ShieldAlert
} from 'lucide-react';
import { api } from '../../api';
import { Header } from '../../components/layout/Header';

export const StaffPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Yeni işçi formu
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('WAITER');
  const [phone, setPhone] = useState('');

  const fetchUsers = async () => {
    try {
      const res: any = await api.get('/auth/users');
      if (res.success) {
        setUsers(res.users);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/auth/users', {
        username,
        password,
        fullName,
        role,
        phone
      });
      setShowAddModal(false);
      setUsername('');
      setPassword('');
      setFullName('');
      setPhone('');
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const roleLabels: any = {
    SUPER_ADMIN: { label: 'Sistem Administratoru', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
    RESTAURANT_ADMIN: { label: 'Restoran Direktoru', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
    CASHIER: { label: 'Kassir', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
    WAITER: { label: 'Ofisiant', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
    KITCHEN_STAFF: { label: 'Mətbəx / Baş Aşpaz', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
    STOCK_MANAGER: { label: 'Anbar İdarəçisi', color: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200' }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
      <Header
        title="İşçi Heyəti və Giriş Səlahiyyətləri"
        subtitle="Rollar, icazələr, yeni işçi qeydiyyatı və təhlükəsizlik qaydaları"
      />

      <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-500">
          Qeydiyyatdan keçmiş işçi sayı: <span className="font-bold text-slate-800 dark:text-slate-200">{users.length}</span>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
        >
          <Plus className="w-4 h-4" /> Yeni İşçi Əlavə Et
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* İşçilər Cədvəli */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-bold uppercase border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4">Ad və Soyad</th>
                <th className="p-4">İstifadəçi Adı</th>
                <th className="p-4">Təyin Edilmiş Rol</th>
                <th className="p-4">Əlaqə Nömrəsi</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((u) => {
                const roleBadge = roleLabels[u.role] || { label: u.role, color: 'bg-slate-100 text-slate-800' };
                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="p-4 font-bold text-slate-800 dark:text-white text-sm">
                      {u.fullName}
                    </td>
                    <td className="p-4 font-mono text-slate-500">@{u.username}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${roleBadge.color}`}>
                        {roleBadge.label}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500">{u.phone || 'Göstərilməyib'}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4" /> Aktiv
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Rol İcazələri İzah Matrisi */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
          <h3 className="font-extrabold text-base text-slate-800 dark:text-white mb-3">
            Sistem Səlahiyyət Qaydaları (RBAC Matrisi)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
              <div className="font-bold text-slate-800 dark:text-white">Kassir Səlahiyyəti:</div>
              <p className="text-slate-500 dark:text-slate-400">
                Sifarişləri qəbul edir, hesabı bağlayır (nağd/kart/split), endirim tətbiq edir, qəbz çap edir. Anbar və maliyyə hesabatlarına dəyişiklik edə bilməz.
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
              <div className="font-bold text-slate-800 dark:text-white">Mətbəx / Aşpaz:</div>
              <p className="text-slate-500 dark:text-slate-400">
                Yalnız KDS ekranını görür, yeməklərin hazırlanma statusunu dəyişir. Maliyyə məlumatlarını və kassa qalıqlarını görə bilməz.
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
              <div className="font-bold text-slate-800 dark:text-white">Ofisiant:</div>
              <p className="text-slate-500 dark:text-slate-400">
                Müştəri çağırışlarına cavab verir, masaya sifariş əlavə edir, hesabı təqdim edir. Qiymətləri dəyişə və ya hesabatlara baxa bilməz.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODAL: YENİ İŞÇİ ================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateUser}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4"
          >
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Yeni İşçi Qeydiyyatı</h3>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Ad və Soyad:</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">İstifadəçi Adı (Login):</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Şifrə:</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Rolu:</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold text-slate-800 dark:text-white"
              >
                <option value="RESTAURANT_ADMIN">Restoran Direktoru</option>
                <option value="CASHIER">Kassir</option>
                <option value="WAITER">Ofisiant</option>
                <option value="KITCHEN_STAFF">Mətbəx / Aşpaz</option>
                <option value="STOCK_MANAGER">Anbar İdarəçisi</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Əlaqə Telefonu:</label>
              <input
                type="text"
                placeholder="+994 50 000 00 00"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2 border rounded-xl text-xs font-semibold"
              >
                Ləğv
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold"
              >
                Yadda Saxla
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
