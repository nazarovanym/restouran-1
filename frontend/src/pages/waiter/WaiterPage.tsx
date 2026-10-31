import React, { useState, useEffect } from 'react';
import {
  Users2,
  Bell,
  CheckCircle2,
  Plus,
  Receipt,
  Clock,
  Utensils,
  Check,
  Send,
  Printer
} from 'lucide-react';
import { api } from '../../api';
import { useSocket } from '../../context/SocketContext';
import { Header } from '../../components/layout/Header';
import { ReceiptModal } from '../../components/common/ReceiptModal';

export const WaiterPage: React.FC = () => {
  const { socket, activeCalls, dismissCall } = useSocket();
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<any | null>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>('');
  const [addQty, setAddQty] = useState(1);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptContent, setReceiptContent] = useState('');

  const fetchTables = async () => {
    try {
      const res: any = await api.get('/tables');
      if (res.success) {
        setTables(res.tables);
        if (selectedTable) {
          const updated = res.tables.find((t: any) => t.id === selectedTable.id);
          setSelectedTable(updated || null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMenu = async () => {
    try {
      const res: any = await api.get('/menu/all');
      if (res.success && res.items.length > 0) {
        setMenuItems(res.items);
        setSelectedMenuItemId(res.items[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTables();
    fetchMenu();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('table:status_change', fetchTables);
    socket.on('order:status_change', fetchTables);
    socket.on('order:new', fetchTables);

    return () => {
      socket.off('table:status_change', fetchTables);
      socket.off('order:status_change', fetchTables);
      socket.off('order:new', fetchTables);
    };
  }, [socket]);

  // Çağırışı təsdiqləmək (Yaxınlaşdım)
  const handleResolveCall = async (callId: string) => {
    try {
      await api.patch(`/waiter-calls/${callId}/resolve`, { status: 'RESOLVED' });
      dismissCall(callId);
    } catch (e) {
      dismissCall(callId);
    }
  };

  // Masaya sifariş əlavə etmək
  const handleAddItemToTable = async () => {
    if (!selectedTable) return;

    try {
      if (selectedTable.activeOrder) {
        // Mövcud sifarişə əlavə et
        await api.post(`/orders/${selectedTable.activeOrder.id}/items`, {
          menuItemId: selectedMenuItemId,
          quantity: addQty
        });
      } else {
        // Yeni sifariş yarat
        await api.post('/orders', {
          tableId: selectedTable.id,
          source: 'WAITER_APP',
          items: [{ menuItemId: selectedMenuItemId, quantity: addQty }]
        });
      }
      setShowAddItemModal(false);
      fetchTables();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Hesabı müştəriyə təqdim etmək üçün qəbz almaq
  const handleShowBill = async () => {
    if (!selectedTable?.activeOrder) return;
    try {
      const res: any = await api.get(`/payments/${selectedTable.activeOrder.id}/receipt`);
      if (res.success) {
        setReceiptContent(res.receiptText);
        setShowReceiptModal(true);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
      <Header
        title="Ofisiant Paneli"
        subtitle="Masa xidməti, müştəri çağırışları, sifariş əlavə edilməsi və hesab təqdimatı"
      />

      <div className="flex-1 flex overflow-hidden p-6 gap-6">
        {/* SOL TƏRƏF: AKTİV ÇAĞIRIŞLAR VƏ MASALAR */}
        <div className="w-7/12 flex flex-col gap-6 overflow-y-auto">
          {/* Aktiv Müştəri Çağırışları Kartı */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500 animate-bounce" />
                <h3 className="font-extrabold text-base text-slate-800 dark:text-white">
                  Gözləyən Müştəri Çağırışları
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                {activeCalls.length} aktiv
              </span>
            </div>

            {activeCalls.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs italic">
                Hal-hazırda heç bir masadan çağırış yoxdur. Müştəri QR menyudan çağırdıqda burada səsli bildirişlə görünəcək.
              </div>
            ) : (
              <div className="space-y-2">
                {activeCalls.map((call) => (
                  <div
                    key={call.id}
                    className="flex items-center justify-between p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl"
                  >
                    <div>
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {call.table?.tableNumber} - {call.callType === 'BILL_REQUEST' ? 'Hesab Tələb Edir' : 'Ofisiant Köməyi'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {call.table?.section} | {new Date(call.createdAt).toLocaleTimeString('az-AZ')}
                      </div>
                    </div>
                    <button
                      onClick={() => handleResolveCall(call.id)}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Yaxınlaşdım
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Masalar Siyahısı */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex-1">
            <h3 className="font-extrabold text-base text-slate-800 dark:text-white mb-4">
              Restoran Masaları
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {tables.map((table) => {
                const isSelected = selectedTable?.id === table.id;
                const hasOrder = !!table.activeOrder;

                return (
                  <div
                    key={table.id}
                    onClick={() => setSelectedTable(table)}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50/30 dark:bg-primary-950/20'
                        : hasOrder
                        ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/20'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="font-black text-sm text-slate-800 dark:text-white">
                      {table.tableNumber}
                    </div>
                    <div className="text-[11px] text-slate-400">{table.section}</div>
                    <div className="mt-2 text-xs font-bold text-primary-600 dark:text-primary-400">
                      {hasOrder ? `${table.activeOrder.totalAmount.toFixed(2)} AZN` : 'Boş'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* SAĞ TƏRƏF: SEÇİLMİŞ MASANIN XİDMƏT DETALLARI */}
        <div className="w-5/12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 flex flex-col justify-between">
          {selectedTable ? (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white">
                    {selectedTable.tableNumber}
                  </h3>
                  <p className="text-xs text-slate-400">{selectedTable.section}</p>
                </div>
                <button
                  onClick={() => setShowAddItemModal(true)}
                  className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow"
                >
                  <Plus className="w-3.5 h-3.5" /> Sifariş Əlavə Et
                </button>
              </div>

              {/* Sifariş Məhsulları */}
              <div className="flex-1 overflow-y-auto py-4 space-y-2">
                {selectedTable.activeOrder ? (
                  <>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Sifariş: #{selectedTable.activeOrder.orderNumber}
                    </div>
                    {selectedTable.activeOrder.items?.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {item.menuItem.name}
                          </div>
                          <div className="text-slate-400">{item.unitPrice.toFixed(2)} AZN</div>
                        </div>
                        <div className="font-black text-primary-500">
                          x{item.quantity} ({item.totalPrice.toFixed(2)} AZN)
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs text-center">
                    <Utensils className="w-10 h-10 mb-2 opacity-30" />
                    Bu masada aktiv sifariş yoxdur. "Sifariş Əlavə Et" düyməsi ilə yemək əlavə edə bilərsiniz.
                  </div>
                )}
              </div>

              {/* Yekun məbləğ və Hesab təqdimatı */}
              {selectedTable.activeOrder && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex justify-between font-black text-base text-slate-900 dark:text-white">
                    <span>Yekun Məbləğ:</span>
                    <span className="text-primary-500">
                      {selectedTable.activeOrder.totalAmount.toFixed(2)} AZN
                    </span>
                  </div>
                  <button
                    onClick={handleShowBill}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow"
                  >
                    <Receipt className="w-4 h-4" /> Müştəriyə Hesab Təqdim Et (Qəbz Çapı)
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center text-xs">
              <Users2 className="w-12 h-12 mb-2 opacity-30" />
              Xidmət etmək üçün sol tərəfdən masa seçin
            </div>
          )}
        </div>
      </div>

      {/* Sifariş Əlavə Et Modalı */}
      {showAddItemModal && selectedTable && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
              {selectedTable.tableNumber} - Yemək Əlavə Et
            </h3>
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
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Porsiya Sayı:</label>
              <input
                type="number"
                min="1"
                value={addQty}
                onChange={(e) => setAddQty(Math.max(1, parseInt(e.target.value) || 1))}
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
                onClick={handleAddItemToTable}
                className="flex-1 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold"
              >
                Sifarişə Yaz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Qəbz Modalı */}
      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        receiptText={receiptContent}
        orderNumber={selectedTable?.activeOrder?.orderNumber}
      />
    </div>
  );
};
