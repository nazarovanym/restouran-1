import React, { useState, useEffect } from 'react';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  AlertCircle,
  Flame,
  Utensils,
  Play,
  Check,
  Send,
  Filter
} from 'lucide-react';
import { api } from '../../api';
import { useSocket } from '../../context/SocketContext';
import { Header } from '../../components/layout/Header';
import { soundService } from '../../services/soundService';

export const KitchenPage: React.FC = () => {
  const { socket, joinRoom } = useSocket();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSection, setFilterSection] = useState<string>('ALL');

  const fetchKitchenOrders = async () => {
    try {
      const res: any = await api.get('/orders/kitchen');
      if (res.success) {
        setOrders(res.orders);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKitchenOrders();
    joinRoom('kitchen');
  }, []);

  // WebSocket real-time güncəlləmələr
  useEffect(() => {
    if (!socket) return;

    socket.on('kitchen:new_order', (newOrder: any) => {
      soundService.playNewOrderSound();
      setOrders((prev) => {
        const exists = prev.some((o) => o.id === newOrder.id);
        if (exists) return prev;
        return [...prev, newOrder];
      });
    });

    socket.on('kitchen:order_update', (updated: any) => {
      setOrders((prev) => {
        // Əgər tamamlanıbsa və ya ləğv edilibsə mətbəxdən yığışdırırıq
        if (updated.status === 'COMPLETED' || updated.status === 'CANCELLED' || updated.status === 'SERVED') {
          return prev.filter((o) => o.id !== updated.id);
        }
        const exists = prev.some((o) => o.id === updated.id);
        if (exists) {
          return prev.map((o) => (o.id === updated.id ? updated : o));
        }
        return [...prev, updated];
      });
    });

    return () => {
      socket.off('kitchen:new_order');
      socket.off('kitchen:order_update');
    };
  }, [socket]);

  // Status dəyişmə
  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      const res: any = await api.patch(`/orders/${orderId}/status`, { status });
      if (res.success) {
        if (status === 'SERVED' || status === 'COMPLETED') {
          setOrders((prev) => prev.filter((o) => o.id !== orderId));
        } else {
          setOrders((prev) => prev.map((o) => (o.id === orderId ? res.order : o)));
        }
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (filterSection === 'ALL') return true;
    return o.table.section === filterSection;
  });

  // Hazırlanma vaxtı fərqini hesablayır (dəqiqələrlə)
  const getElapsedMinutes = (createdAt: string) => {
    const elapsedMs = Date.now() - new Date(createdAt).getTime();
    return Math.floor(elapsedMs / (1000 * 60));
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-900 text-slate-100">
      <Header
        title="Mətbəx Ekranı (KDS - Kitchen Display System)"
        subtitle="Sifarişlərin real-vaxt hazırlanma mərhələləri və aşpaz idarəetməsi"
      />

      {/* Üst Filtr Paneli */}
      <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
            <Filter className="w-4 h-4 text-primary-500" /> Bölmə:
          </div>
          {['ALL', 'Əsas Zal', 'Teras', 'VIP Otaq'].map((sec) => (
            <button
              key={sec}
              onClick={() => setFilterSection(sec)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                filterSection === sec
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {sec === 'ALL' ? 'Bütün Zallar' : sec}
            </button>
          ))}
        </div>

        <div className="text-xs font-semibold text-slate-400">
          Aktiv Mətbəx Sifarişləri: <span className="font-extrabold text-primary-400 text-sm">{filteredOrders.length}</span>
        </div>
      </div>

      {/* SİFARİŞ KARTLARI QRİDİ */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredOrders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <ChefHat className="w-20 h-20 mb-3 opacity-30" />
            <h3 className="text-lg font-bold">Mətbəx sifarişi yoxdur</h3>
            <p className="text-xs text-slate-500 mt-1">Yeni sifariş daxil olduqda burada səsli bildirişlə görünəcək</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredOrders.map((order) => {
              const elapsed = getElapsedMinutes(order.createdAt);
              const isUrgent = elapsed >= 15;

              return (
                <div
                  key={order.id}
                  className={`flex flex-col bg-slate-800 rounded-2xl border overflow-hidden shadow-xl transition-all ${
                    isUrgent
                      ? 'border-rose-500 ring-2 ring-rose-500/30'
                      : order.status === 'PREPARING'
                      ? 'border-amber-500'
                      : order.status === 'READY'
                      ? 'border-emerald-500'
                      : 'border-slate-700'
                  }`}
                >
                  {/* Kart Başlığı */}
                  <div
                    className={`p-3.5 flex items-center justify-between border-b ${
                      order.status === 'READY'
                        ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                        : order.status === 'PREPARING'
                        ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                        : 'bg-slate-900 border-slate-700 text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="font-black text-lg text-white flex items-center gap-2">
                        {order.table.tableNumber}
                        <span className="text-xs font-normal text-slate-400">({order.table.section})</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        #{order.orderNumber}
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black ${
                          isUrgent ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        {elapsed} dəq
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(order.createdAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  {/* Müştəri qeydi varsa */}
                  {order.notes && (
                    <div className="bg-amber-500/10 border-b border-amber-500/20 px-3.5 py-2 text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Qeyd: {order.notes}</span>
                    </div>
                  )}

                  {/* Yeməklər Siyahısı */}
                  <div className="flex-1 p-3.5 space-y-2.5 overflow-y-auto max-h-64">
                    {order.items.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between pb-2 border-b border-slate-700/60 last:border-0"
                      >
                        <div>
                          <div className="font-bold text-sm text-white">
                            {item.menuItem.name}
                          </div>
                          {item.specialInstructions && (
                            <div className="text-xs text-amber-400 font-medium italic mt-0.5">
                              * {item.specialInstructions}
                            </div>
                          )}
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center font-extrabold text-base text-primary-400 shrink-0 ml-2">
                          x{item.quantity}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Aşpaz Status Düymələri */}
                  <div className="p-3 bg-slate-900 border-t border-slate-700 flex gap-2">
                    {order.status === 'PENDING' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'CONFIRMED')}
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow transition"
                      >
                        <Check className="w-4 h-4" /> Təsdiq Et
                      </button>
                    )}

                    {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                        className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow transition"
                      >
                        <Play className="w-4 h-4" /> Hazırlanır
                      </button>
                    )}

                    {order.status === 'PREPARING' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'READY')}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 transition"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Hazırdır!
                      </button>
                    )}

                    {order.status === 'READY' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'SERVED')}
                        className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-lg shadow-purple-600/30 transition"
                      >
                        <Send className="w-4 h-4" /> Təslim Edildi (Servis)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
