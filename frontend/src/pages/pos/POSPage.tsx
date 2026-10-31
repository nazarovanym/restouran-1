import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Banknote,
  Percent,
  Plus,
  Trash2,
  Printer,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  Receipt,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { api } from '../../api';
import { useSocket } from '../../context/SocketContext';
import { soundService } from '../../services/soundService';
import { Header } from '../../components/layout/Header';
import { ReceiptModal } from '../../components/common/ReceiptModal';

export const POSPage: React.FC = () => {
  const { socket } = useSocket();
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<string>('ALL'); // ALL, PENDING, PREPARING, READY, COMPLETED, CANCELLED
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modallar
  const [showPayModal, setShowPayModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showZReportModal, setShowZReportModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptContent, setReceiptContent] = useState('');

  // Ödəniş Forması
  const [payMethod, setPayMethod] = useState<'CASH' | 'CARD_TERMINAL' | 'SPLIT'>('CASH');
  const [cashGiven, setCashGiven] = useState<string>('');
  const [splitCash, setSplitCash] = useState<string>('');
  const [splitCard, setSplitCard] = useState<string>('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Endirim Forması
  const [discountPercent, setDiscountPercent] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<string>('');
  const [discountReason, setDiscountReason] = useState<string>('Kassa endirimi');

  // Menyu Məhsulları (Məhsul əlavə etmək üçün)
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>('');
  const [addItemQty, setAddItemQty] = useState<number>(1);

  // Z-Hesabat məlumatları
  const [zReportData, setZReportData] = useState<any | null>(null);

  // Sifarişləri yüklə
  const fetchOrders = async () => {
    try {
      const res: any = await api.get('/orders');
      if (res.success) {
        setOrders(res.orders);
        if (selectedOrder) {
          const updated = res.orders.find((o: any) => o.id === selectedOrder.id);
          setSelectedOrder(updated || null);
        } else if (res.orders.length > 0) {
          setSelectedOrder(res.orders[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenu = async () => {
    try {
      const res: any = await api.get('/menu/all');
      if (res.success) {
        setMenuItems(res.items);
        if (res.items.length > 0) {
          setSelectedMenuItemId(res.items[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchMenu();
  }, []);

  // WebSocket dinləyiciləri
  useEffect(() => {
    if (!socket) return;

    socket.on('order:new', (newOrder: any) => {
      setOrders((prev) => [newOrder, ...prev]);
      soundService.playNewOrderSound();
    });

    socket.on('order:status_change', (updatedOrder: any) => {
      setOrders((prev) => prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)));
      setSelectedOrder((prev: any) => (prev?.id === updatedOrder.id ? updatedOrder : prev));
    });

    return () => {
      socket.off('order:new');
      socket.off('order:status_change');
    };
  }, [socket]);

  // Status dəyişmə
  const handleUpdateStatus = async (status: string, reason?: string) => {
    if (!selectedOrder) return;
    try {
      const res: any = await api.patch(`/orders/${selectedOrder.id}/status`, { status, cancelReason: reason });
      if (res.success) {
        setSelectedOrder(res.order);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Məhsul əlavə etmə
  const handleAddItem = async () => {
    if (!selectedOrder || !selectedMenuItemId) return;
    try {
      const res: any = await api.post(`/orders/${selectedOrder.id}/items`, {
        menuItemId: selectedMenuItemId,
        quantity: addItemQty
      });
      if (res.success) {
        setSelectedOrder(res.order);
        setShowAddItemModal(false);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Məhsul silmə
  const handleRemoveItem = async (itemId: string) => {
    if (!selectedOrder) return;
    if (!confirm('Bu məhsulu sifarişdən silmək istədiyinizə əminsiniz?')) return;
    try {
      const res: any = await api.delete(`/orders/${selectedOrder.id}/items/${itemId}`);
      if (res.success) {
        setSelectedOrder(res.order);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Endirim tətbiq etmə
  const handleApplyDiscount = async () => {
    if (!selectedOrder) return;
    try {
      const res: any = await api.post(`/payments/${selectedOrder.id}/apply-discount`, {
        discountPercent: discountPercent ? parseFloat(discountPercent) : undefined,
        discountAmount: discountAmount ? parseFloat(discountAmount) : undefined,
        reason: discountReason
      });
      if (res.success) {
        setSelectedOrder(res.order);
        setShowDiscountModal(false);
        setDiscountPercent('');
        setDiscountAmount('');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Ödəniş etmə
  const handleProcessPayment = async () => {
    if (!selectedOrder) return;
    setPaymentError('');
    setIsProcessingPayment(true);

    try {
      let body: any = { method: payMethod };

      if (payMethod === 'CASH') {
        body.cashGiven = parseFloat(cashGiven || selectedOrder.totalAmount.toString());
      } else if (payMethod === 'SPLIT') {
        const cashPart = parseFloat(splitCash) || 0;
        const cardPart = parseFloat(splitCard) || 0;
        body.payments = [
          { method: 'CASH', amount: cashPart, cashGiven: cashPart },
          { method: 'CARD_TERMINAL', amount: cardPart }
        ];
      }

      const res: any = await api.post(`/payments/${selectedOrder.id}/process`, body);
      if (res.success) {
        soundService.playPaymentSuccess();
        setSelectedOrder(res.order);
        setReceiptContent(res.receiptText);
        setShowPayModal(false);
        setShowReceiptModal(true);
      }
    } catch (err: any) {
      setPaymentError(err.message || 'Ödəniş zamanı xəta baş verdi');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Qəbz önbaxışı
  const handleViewReceipt = async () => {
    if (!selectedOrder) return;
    try {
      const res: any = await api.get(`/payments/${selectedOrder.id}/receipt`);
      if (res.success) {
        setReceiptContent(res.receiptText);
        setShowReceiptModal(true);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Z-Hesabat aç
  const handleOpenZReport = async () => {
    try {
      const res: any = await api.get('/payments/daily-report');
      if (res.success) {
        setZReportData(res);
        setShowZReportModal(true);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filtrlənmiş sifarişlər
  const filteredOrders = orders.filter((o) => {
    const matchesTab =
      activeTab === 'ALL' ||
      (activeTab === 'PENDING' && (o.status === 'PENDING' || o.status === 'CONFIRMED')) ||
      (activeTab === 'PREPARING' && o.status === 'PREPARING') ||
      (activeTab === 'READY' && o.status === 'READY') ||
      (activeTab === 'COMPLETED' && o.status === 'COMPLETED') ||
      (activeTab === 'CANCELLED' && o.status === 'CANCELLED');

    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.table.tableNumber.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
      <Header
        title="Kassa və POS Terminal İnterfeysi"
        subtitle="Sifarişlərin idarə edilməsi, ödəniş, qəbz çapı və gündəlik kassa hesabatı"
      />

      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* SOL TƏRƏF: SİFARİŞLƏR SİYAHISI */}
        <div className="w-5/12 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Axtarış və Əməliyyat alətləri */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Sifariş və ya masa axtar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <button
                onClick={handleOpenZReport}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Z-Hesabat
              </button>
            </div>

            {/* Status Tabları */}
            <div className="flex gap-1 overflow-x-auto pb-1 text-xs font-semibold">
              {[
                { id: 'ALL', label: 'Bütün' },
                { id: 'PENDING', label: 'Yeni' },
                { id: 'PREPARING', label: 'Hazırlanır' },
                { id: 'READY', label: 'Hazır' },
                { id: 'COMPLETED', label: 'Tamamlandı' },
                { id: 'CANCELLED', label: 'Ləğv' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                    activeTab === tab.id
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sifariş Kartları */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredOrders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center text-sm">
                <Receipt className="w-12 h-12 mb-2 opacity-40" />
                Sifariş tapılmadı
              </div>
            ) : (
              filteredOrders.map((order) => {
                const isSelected = selectedOrder?.id === order.id;
                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50/40 dark:bg-primary-950/20 shadow-md ring-1 ring-primary-500'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-800 dark:text-white">
                          {order.table.tableNumber}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {order.orderNumber}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          order.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : order.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            : order.status === 'PREPARING'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : order.status === 'READY'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {order.status === 'PENDING'
                          ? 'Yeni Sifariş'
                          : order.status === 'CONFIRMED'
                          ? 'Təsdiqləndi'
                          : order.status === 'PREPARING'
                          ? 'Hazırlanır'
                          : order.status === 'READY'
                          ? 'Mətbəx Hazırdır'
                          : order.status === 'COMPLETED'
                          ? 'Ödənildi'
                          : 'Ləğv edildi'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(order.createdAt).toLocaleTimeString('az-AZ', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        <span className="mx-1">•</span>
                        <span>{order.items.length} çeşid</span>
                      </div>
                      <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                        {order.totalAmount.toFixed(2)} AZN
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* SAĞ TƏRƏF: SEÇİLMİŞ SİFARİŞ DETALLARI VƏ ƏMƏLİYYATLAR */}
        <div className="w-7/12 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {selectedOrder ? (
            <div className="flex-1 flex flex-col h-full">
              {/* Sifariş Başlığı */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">
                      {selectedOrder.table.tableNumber}
                    </h2>
                    <span className="text-xs px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-slate-700 dark:text-slate-300 font-medium">
                      {selectedOrder.table.section}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      #{selectedOrder.orderNumber}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Mənbə: {selectedOrder.source === 'QR_CODE' ? 'Müştəri QR Menyu' : 'Kassa / Ofisiant'} | Vaxt: {new Date(selectedOrder.createdAt).toLocaleString('az-AZ')}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'CANCELLED' && (
                    <button
                      onClick={() => setShowAddItemModal(true)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> Məhsul Əlavə Et
                    </button>
                  )}
                  <button
                    onClick={handleViewReceipt}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                  >
                    <Printer className="w-3.5 h-3.5" /> Qəbz
                  </button>
                </div>
              </div>

              {/* Məhsullar Siyahısı Cədvəli */}
              <div className="flex-1 overflow-y-auto p-4">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase pb-2">
                      <th className="py-2">Yemək / Məhsul</th>
                      <th className="text-center py-2">Say</th>
                      <th className="text-right py-2">Qiymət</th>
                      <th className="text-right py-2">Məbləğ</th>
                      {selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'CANCELLED' && (
                        <th className="text-center py-2 w-8"></th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedOrder.items.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-2.5">
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {item.menuItem.name}
                          </div>
                          {item.specialInstructions && (
                            <div className="text-[11px] text-amber-600 dark:text-amber-400 italic">
                              Qeyd: {item.specialInstructions}
                            </div>
                          )}
                        </td>
                        <td className="text-center font-bold text-slate-700 dark:text-slate-300">
                          {item.quantity}
                        </td>
                        <td className="text-right text-slate-500 dark:text-slate-400">
                          {item.unitPrice.toFixed(2)} ₼
                        </td>
                        <td className="text-right font-extrabold text-slate-900 dark:text-white">
                          {item.totalPrice.toFixed(2)} ₼
                        </td>
                        {selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'CANCELLED' && (
                          <td className="text-center">
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-slate-400 hover:text-rose-500 transition p-1"
                              title="Sil"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Maliyyə Hesabatı və Düymələr Paneli */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Məhsulların cəmi:</span>
                    <span>{selectedOrder.subtotal.toFixed(2)} AZN</span>
                  </div>
                  {selectedOrder.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span>Endirim ({selectedOrder.discountReason || 'Xüsusi'}):</span>
                      <span>-{selectedOrder.discountAmount.toFixed(2)} AZN</span>
                    </div>
                  )}
                  {selectedOrder.serviceFee > 0 && (
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Xidmət haqqı:</span>
                      <span>+{selectedOrder.serviceFee.toFixed(2)} AZN</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span>YEKUN HESAB:</span>
                    <span className="text-primary-600 dark:text-primary-400">
                      {selectedOrder.totalAmount.toFixed(2)} AZN
                    </span>
                  </div>
                </div>

                {/* Sifariş Əməliyyat Düymələri */}
                <div className="flex items-center gap-2 pt-2">
                  {selectedOrder.status === 'PENDING' && (
                    <button
                      onClick={() => handleUpdateStatus('CONFIRMED')}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow transition"
                    >
                      <CheckCircle className="w-4 h-4" /> Sifarişi Təsdiqlə
                    </button>
                  )}

                  {selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'CANCELLED' && (
                    <>
                      <button
                        onClick={() => setShowDiscountModal(true)}
                        className="px-3 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                      >
                        <Percent className="w-3.5 h-3.5" /> Endirim
                      </button>

                      <button
                        onClick={() => {
                          setCashGiven(selectedOrder.totalAmount.toString());
                          setSplitCash((selectedOrder.totalAmount / 2).toFixed(2));
                          setSplitCard((selectedOrder.totalAmount / 2).toFixed(2));
                          setShowPayModal(true);
                        }}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/25 transition"
                      >
                        <CreditCard className="w-4 h-4" /> Hesabı Bağla ({selectedOrder.totalAmount.toFixed(2)} ₼)
                      </button>

                      <button
                        onClick={() => {
                          const r = prompt('Ləğv etmə səbəbini qeyd edin:');
                          if (r) handleUpdateStatus('CANCELLED', r);
                        }}
                        className="p-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                        title="Sifarişi Ləğv Et"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </>
                  )}

                  {selectedOrder.status === 'COMPLETED' && (
                    <div className="flex-1 py-2 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold text-center">
                      ✓ Bu sifariş ödənilib və tamamlanıb
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
              <Receipt className="w-16 h-16 mb-3 opacity-30" />
              <div className="font-bold text-base">Sifariş seçilməyib</div>
              <p className="text-xs text-slate-500 mt-1">
                Detallara və ödənişə baxmaq üçün sol siyahıdan sifariş seçin
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ================= MODAL: ÖDƏNİŞ VƏ HESAB BAĞLAMA ================= */}
      {showPayModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                Hesabı Bağla - {selectedOrder.table.tableNumber}
              </h3>
              <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            {paymentError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {paymentError}
              </div>
            )}

            <div className="text-center py-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Ödəniləcək Məbləğ</div>
              <div className="text-3xl font-black text-primary-600 dark:text-primary-400">
                {selectedOrder.totalAmount.toFixed(2)} AZN
              </div>
            </div>

            {/* Ödəniş üsulu seçimi */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPayMethod('CASH')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition ${
                  payMethod === 'CASH'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-600'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Banknote className="w-5 h-5" /> Nağd
              </button>
              <button
                type="button"
                onClick={() => setPayMethod('CARD_TERMINAL')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition ${
                  payMethod === 'CARD_TERMINAL'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-600'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <CreditCard className="w-5 h-5" /> Bank Kartı (POS)
              </button>
              <button
                type="button"
                onClick={() => setPayMethod('SPLIT')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition ${
                  payMethod === 'SPLIT'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-600'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Percent className="w-5 h-5" /> Bölünmüş
              </button>
            </div>

            {/* Nağd Sahəsi */}
            {payMethod === 'CASH' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Müştərinin verdiyi nağd məbləğ (AZN):
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={cashGiven}
                  onChange={(e) => setCashGiven(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-base font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                />
                {parseFloat(cashGiven) >= selectedOrder.totalAmount && (
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg">
                    Qaytarılacaq qalıq: {(parseFloat(cashGiven) - selectedOrder.totalAmount).toFixed(2)} AZN
                  </div>
                )}
              </div>
            )}

            {/* Bank POS Sahəsi */}
            {payMethod === 'CARD_TERMINAL' && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-blue-800 dark:text-blue-300">
                POS Terminala {selectedOrder.totalAmount.toFixed(2)} AZN sorğu göndəriləcək və RRN təsdiq kodu alınacaq.
              </div>
            )}

            {/* Bölünmüş Sahə */}
            {payMethod === 'SPLIT' && (
              <div className="space-y-2 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Nağd Hissə (AZN):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={splitCash}
                    onChange={(e) => {
                      setSplitCash(e.target.value);
                      const rem = selectedOrder.totalAmount - (parseFloat(e.target.value) || 0);
                      setSplitCard(rem > 0 ? rem.toFixed(2) : '0');
                    }}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">POS Kart Hissə (AZN):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={splitCard}
                    onChange={(e) => setSplitCard(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                className="flex-1 py-2.5 border rounded-xl font-semibold text-xs text-slate-600 dark:text-slate-300"
              >
                İmtina
              </button>
              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={handleProcessPayment}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-lg transition disabled:opacity-50"
              >
                {isProcessingPayment ? 'Ödəniş aparılır...' : 'Ödənişi Təsdiqlə'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ENDİRİM ================= */}
      {showDiscountModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Endirim Tətbiq Et</h3>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Faizlə (%):</label>
              <input
                type="number"
                placeholder="məs: 10"
                value={discountPercent}
                onChange={(e) => {
                  setDiscountPercent(e.target.value);
                  setDiscountAmount('');
                }}
                className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">və ya Sabit Məbləğ (AZN):</label>
              <input
                type="number"
                placeholder="məs: 5.00"
                value={discountAmount}
                onChange={(e) => {
                  setDiscountAmount(e.target.value);
                  setDiscountPercent('');
                }}
                className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Endirim Səbəbi:</label>
              <input
                type="text"
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowDiscountModal(false)}
                className="flex-1 py-2 border rounded-xl text-xs font-semibold"
              >
                Ləğv
              </button>
              <button
                onClick={handleApplyDiscount}
                className="flex-1 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold"
              >
                Tətbiq Et
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: MƏHSUL ƏLAVƏ ET ================= */}
      {showAddItemModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Sifarişə Yemək Əlavə Et</h3>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Yemək Seçin:</label>
              <select
                value={selectedMenuItemId}
                onChange={(e) => setSelectedMenuItemId(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold text-slate-800 dark:text-white"
              >
                {menuItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} - {item.price.toFixed(2)} AZN
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Miqdar (Porsiya):</label>
              <input
                type="number"
                min="1"
                value={addItemQty}
                onChange={(e) => setAddItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowAddItemModal(false)}
                className="flex-1 py-2 border rounded-xl text-xs font-semibold"
              >
                Bağla
              </button>
              <button
                onClick={handleAddItem}
                className="flex-1 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold"
              >
                Əlavə Et
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: Z-HESABAT ================= */}
      {showZReportModal && zReportData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                Gündəlik Kassa Z-Hesabatı ({zReportData.date})
              </h3>
              <button onClick={() => setShowZReportModal(false)} className="text-slate-400">✕</button>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className="text-[11px] text-slate-400 font-bold uppercase">Ümumi Kassa</div>
                <div className="text-xl font-black text-slate-900 dark:text-white">{zReportData.totalRevenue.toFixed(2)} ₼</div>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl">
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">Nağd Gəlir</div>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{zReportData.totalCash.toFixed(2)} ₼</div>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl">
                <div className="text-[11px] text-blue-600 dark:text-blue-400 font-bold uppercase">POS Terminal</div>
                <div className="text-xl font-black text-blue-600 dark:text-blue-400">{zReportData.totalCard.toFixed(2)} ₼</div>
              </div>
            </div>
            <div className="text-xs text-slate-500">
              Bu gün bağlanmış ümumi çek sayı: <span className="font-bold text-slate-800 dark:text-slate-200">{zReportData.totalOrdersPaid}</span>
            </div>
            <button
              onClick={() => setShowZReportModal(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
            >
              Bağla
            </button>
          </div>
        </div>
      )}

      {/* Termo Qəbz Modalı */}
      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        receiptText={receiptContent}
        orderNumber={selectedOrder?.orderNumber}
      />
    </div>
  );
};
