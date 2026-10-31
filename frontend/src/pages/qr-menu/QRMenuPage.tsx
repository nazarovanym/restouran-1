import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  ShoppingBag,
  Bell,
  Search,
  Plus,
  Minus,
  Check,
  Clock,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Utensils,
  ChevronRight,
  Flame,
  X
} from 'lucide-react';
import { api } from '../../api';
import { io } from 'socket.io-client';

export const QRMenuPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [table, setTable] = useState<any | null>(null);
  const [restaurant, setRestaurant] = useState<any | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Səbət
  const [cart, setCart] = useState<{ menuItem: any; quantity: number; notes: string }[]>([]);
  const [showCartModal, setShowCartModal] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Canlı sifariş izləməsi
  const [activeOrder, setActiveOrder] = useState<any | null>(null);

  // Ofisiant Çağırışı Bildirişi
  const [callStatusMessage, setCallStatusMessage] = useState('');

  // Məlumatları yüklə
  const fetchData = async () => {
    try {
      const [tableRes, menuRes]: any = await Promise.all([
        api.get(`/tables/token/${token}`),
        api.get('/menu')
      ]);

      if (tableRes.success) {
        setTable(tableRes.table);
        setRestaurant(tableRes.restaurant);
        if (tableRes.table.activeOrder) {
          setActiveOrder(tableRes.table.activeOrder);
        }
      } else {
        setError('Keçərsiz masa və ya QR kod');
      }

      if (menuRes.success) {
        setCategories(menuRes.categories);
      }
    } catch (e: any) {
      setError(e.message || 'Məlumatları yükləmək mümkün olmadı');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // WebSocket ilə bu masaya aid sifariş statusunu canlı izləmək
  useEffect(() => {
    if (!token) return;
    const socket = io('http://localhost:5000');
    socket.emit('join_room', `table:${token}`);

    socket.on('table:order_update', (order: any) => {
      setActiveOrder(order);
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  // Səbətə əlavə et
  const handleAddToCart = (item: any) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { menuItem: item, quantity: 1, notes: '' }];
    });
  };

  const handleUpdateQty = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.menuItem.id === itemId) {
            const newQty = c.quantity + delta;
            return newQty > 0 ? { ...c, quantity: newQty } : null;
          }
          return c;
        })
        .filter(Boolean) as any
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Sifarişi göndər
  const handleSubmitOrder = async () => {
    if (cart.length === 0 || !table) return;
    setIsSubmitting(true);
    try {
      const itemsPayload = cart.map((c) => ({
        menuItemId: c.menuItem.id,
        quantity: c.quantity,
        specialInstructions: c.notes || undefined
      }));

      const res: any = await api.post('/orders', {
        tableToken: token,
        items: itemsPayload,
        notes: orderNotes,
        source: 'QR_CODE'
      });

      if (res.success) {
        setActiveOrder(res.order);
        setCart([]);
        setShowCartModal(false);
        setOrderNotes('');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ofisiant Çağırışı
  const handleCallWaiter = async (callType: 'ASSISTANCE' | 'BILL_REQUEST') => {
    try {
      const res: any = await api.post('/waiter-calls', { tableToken: token, callType });
      setCallStatusMessage(res.message);
      setTimeout(() => setCallStatusMessage(''), 6000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Status vizual təsviri
  const renderOrderStatus = () => {
    if (!activeOrder) return null;
    let text = 'Sifarişiniz mətbəxə çatdırıldı, təsdiqlənir...';
    let color = 'bg-amber-500';

    if (activeOrder.status === 'PREPARING') {
      text = 'Aşpaz sifarişinizi hazırlayır 🍳';
      color = 'bg-blue-600';
    } else if (activeOrder.status === 'READY') {
      text = 'Sifarişiniz hazırdır! Ofisiant masanıza gətirir 🍽️';
      color = 'bg-purple-600';
    } else if (activeOrder.status === 'SERVED') {
      text = 'Nuş olsun! Sifariş masanıza təhvil verildi ✨';
      color = 'bg-emerald-600';
    } else if (activeOrder.status === 'COMPLETED') {
      text = 'Hesab ödənildi. Bizi seçdiyiniz üçün təşəkkür edirik! 😊';
      color = 'bg-emerald-700';
    }

    return (
      <div className={`p-3 text-white text-xs font-bold rounded-2xl shadow-lg flex items-center justify-between ${color} transition-all`}>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 animate-spin" />
          <span>{text}</span>
        </div>
        <span className="font-mono text-[10px] bg-black/20 px-2 py-0.5 rounded">
          #{activeOrder.orderNumber.slice(-4)}
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary-500 border-t-transparent animate-spin mb-3"></div>
        <div className="font-bold text-slate-700 text-sm">Menyu yüklənir...</div>
      </div>
    );
  }

  if (error || !table) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-16 h-16 text-rose-500 mb-3" />
        <h2 className="font-extrabold text-xl text-slate-900 mb-1">Masa Tapılmadı</h2>
        <p className="text-sm text-slate-500 max-w-sm mb-4">
          QR kod keçərsizdir və ya masa aktiv deyil. Zəhmət olmasa restoran heyəti ilə əlaqə saxlayın.
        </p>
      </div>
    );
  }

  // Bütün yeməklər
  const allItems = categories.flatMap((c) => c.items);
  const displayedItems =
    activeCategory === 'ALL'
      ? allItems
      : categories.find((c) => c.id === activeCategory)?.items || [];

  const searchFilteredItems = displayedItems.filter((i: any) =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28 max-w-md mx-auto shadow-2xl relative font-['Plus_Jakarta_Sans',sans-serif]">
      {/* ÜST BREND BAŞLIĞI */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 rounded-b-3xl shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-amber-500 flex items-center justify-center shadow-md">
              <Flame className="w-5 h-5 fill-current text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight leading-tight">
                {restaurant?.name || 'Naxçıvan Restoran & Lounge'}
              </h1>
              <div className="flex items-center gap-1.5 text-xs text-primary-400 font-bold">
                <span>{table.tableNumber}</span>
                <span>•</span>
                <span>{table.section}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCallWaiter('ASSISTANCE')}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-white/10 shadow"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" /> Ofisiant
            </button>
            <button
              onClick={() => handleCallWaiter('BILL_REQUEST')}
              className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition shadow"
            >
              <Receipt className="w-3.5 h-3.5" /> Hesab
            </button>
          </div>
        </div>

        {/* Canlı Çağırış Bildirişi */}
        {callStatusMessage && (
          <div className="mb-3 p-2.5 bg-amber-500 text-white rounded-xl text-xs font-bold shadow-lg animate-pulse">
            ✓ {callStatusMessage}
          </div>
        )}

        {/* Canlı Sifariş İzləməsi */}
        {renderOrderStatus()}

        {/* Axtarış */}
        <div className="relative mt-4">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Yemək və ya içki axtar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* KATEQORİYA ÇUBUĞU */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar sticky top-0 bg-slate-50/95 backdrop-blur-md z-20 border-b border-slate-200/60">
        <button
          onClick={() => setActiveCategory('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
            activeCategory === 'ALL'
              ? 'bg-primary-500 text-white shadow-primary-500/25'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          Hamısı
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
              activeCategory === c.id
                ? 'bg-primary-500 text-white shadow-primary-500/25'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* YEMƏKLƏR SİYAHISI */}
      <div className="p-4 space-y-4">
        {searchFilteredItems.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            Axtarışa uyğun yemək tapılmadı
          </div>
        ) : (
          searchFilteredItems.map((item: any) => {
            const inCart = cart.find((c) => c.menuItem.id === item.id);
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-sm flex gap-3.5 hover:shadow-md transition"
              >
                <img
                  src={item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80'}
                  alt={item.name}
                  className="w-24 h-24 rounded-xl object-cover shrink-0 bg-slate-100"
                />

                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm leading-snug">
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                    <span className="font-black text-slate-900 text-base">
                      {item.price.toFixed(2)} AZN
                    </span>

                    {inCart ? (
                      <div className="flex items-center gap-2 bg-primary-50 rounded-xl p-1 border border-primary-200">
                        <button
                          onClick={() => handleUpdateQty(item.id, -1)}
                          className="w-6 h-6 rounded-lg bg-white text-primary-600 flex items-center justify-center font-bold text-xs shadow-sm hover:bg-primary-100"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-extrabold text-xs text-primary-700 px-1">
                          {inCart.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQty(item.id, 1)}
                          className="w-6 h-6 rounded-lg bg-primary-500 text-white flex items-center justify-center font-bold text-xs shadow-sm hover:bg-primary-600"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAddToCart(item)}
                        className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md shadow-primary-500/20 transition active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" /> Səbətə
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* AŞAĞI SƏBƏT DÜYMƏSİ (FLOAT BANNER) */}
      {cartCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-40">
          <button
            onClick={() => setShowCartModal(true)}
            className="w-full py-3.5 px-5 bg-gradient-to-r from-primary-600 to-amber-500 text-white rounded-2xl shadow-xl flex items-center justify-between font-extrabold text-sm active:scale-[0.98] transition"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center text-xs font-black">
                {cartCount}
              </span>
              <span>Səbətə Bax</span>
            </div>
            <div className="flex items-center gap-1">
              <span>{cartTotal.toFixed(2)} AZN</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* ================= MODAL: SƏBƏT VƏ SİFARİŞİN TƏSDİQİ ================= */}
      {showCartModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Səbətiniz - {table.tableNumber}
                </h3>
                <p className="text-xs text-slate-400">Sifariş avtomatik kassa və mətbəxə ötürüləcək</p>
              </div>
              <button
                onClick={() => setShowCartModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Səbət Məhsulları */}
            <div className="flex-1 overflow-y-auto space-y-3 py-1">
              {cart.map((item) => (
                <div key={item.menuItem.id} className="p-3 bg-slate-50 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-800">{item.menuItem.name}</div>
                      <div className="text-[11px] text-slate-400">{item.menuItem.price.toFixed(2)} AZN</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateQty(item.menuItem.id, -1)}
                        className="w-6 h-6 rounded bg-white border text-slate-600 flex items-center justify-center font-bold text-xs"
                      >
                        -
                      </button>
                      <span className="font-bold text-xs">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQty(item.menuItem.id, 1)}
                        className="w-6 h-6 rounded bg-primary-500 text-white flex items-center justify-center font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder="Xüsusi qeyd (məs: az duzlu, acısız)..."
                    value={item.notes}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCart((prev) =>
                        prev.map((c) =>
                          c.menuItem.id === item.menuItem.id ? { ...c, notes: val } : c
                        )
                      );
                    }}
                    className="w-full px-2.5 py-1 text-[11px] bg-white border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              ))}
            </div>

            {/* Ümumi Qeyd */}
            <div>
              <label className="text-xs font-bold text-slate-600">Sifariş üçün ümumi qeyd:</label>
              <input
                type="text"
                placeholder="məs: Bütün yeməklər eyni vaxtda gəlsin"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border rounded-xl text-xs"
              />
            </div>

            {/* Yekun məbləğ */}
            <div className="pt-3 border-t space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Cəmi məbləğ:</span>
                <span>{cartTotal.toFixed(2)} AZN</span>
              </div>
              <div className="flex justify-between font-black text-base text-slate-900 pt-1">
                <span>YEKUN ÖDƏNİLƏCƏK:</span>
                <span className="text-primary-600">{cartTotal.toFixed(2)} AZN</span>
              </div>
            </div>

            <button
              onClick={handleSubmitOrder}
              disabled={isSubmitting}
              className="w-full py-3.5 bg-primary-500 hover:bg-primary-600 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-primary-500/30 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Sifariş göndərilir...' : 'Sifarişi Təsdiqlə və Göndər'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
