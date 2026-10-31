import React, { useState, useEffect } from 'react';
import {
  LayoutGrid,
  Plus,
  QrCode,
  RefreshCw,
  Printer,
  Users,
  ExternalLink,
  Receipt,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { api } from '../../api';
import { useSocket } from '../../context/SocketContext';
import { Header } from '../../components/layout/Header';

export const TablesPage: React.FC = () => {
  const { socket } = useSocket();
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<any | null>(null);

  // Modallar
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [activeQRTable, setActiveQRTable] = useState<any | null>(null);

  // Yeni masa formu
  const [tableNumber, setTableNumber] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [section, setSection] = useState('Əsas Zal');

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  // WebSocket dinləyicisi
  useEffect(() => {
    if (!socket) return;

    socket.on('table:status_change', () => {
      fetchTables();
    });

    return () => {
      socket.off('table:status_change');
    };
  }, [socket]);

  // Yeni masa yarat
  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res: any = await api.post('/tables', { tableNumber, capacity, section });
      if (res.success) {
        setShowAddTableModal(false);
        setTableNumber('');
        fetchTables();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Yeni təhlükəsiz QR token generasiyası
  const handleRegenerateToken = async (tableId: string) => {
    if (!confirm('Bu masa üçün yeni təhlükəsiz QR kod generasiya edilsin? Əvvəlki QR kod keçərsiz olacaq.')) return;
    try {
      const res: any = await api.post(`/tables/${tableId}/regenerate-token`);
      if (res.success) {
        fetchTables();
        if (activeQRTable?.id === tableId) {
          setActiveQRTable(res.table);
        }
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // QR kodu çap etmək
  const handlePrintQR = (table: any) => {
    const printWindow = window.open('', '_blank', 'width=500,height=650');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>QR Kod - ${table.tableNumber}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 40px;
                margin: 0;
              }
              .card {
                border: 2px dashed #000;
                border-radius: 20px;
                padding: 30px;
                display: inline-block;
              }
              h1 { margin: 0 0 5px 0; font-size: 28px; }
              p { margin: 0 0 20px 0; color: #555; }
              img { width: 240px; height: 240px; }
              .instruction { font-size: 14px; font-weight: bold; margin-top: 15px; color: #333; }
              @media print {
                body { padding: 10px; }
              }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>${table.tableNumber}</h1>
              <p>${table.section} | Naxçıvan Restoran & Lounge</p>
              <img src="${table.qrCodeUrl}" alt="QR Kod" />
              <div class="instruction">
                Mobil telefonunuzun kamerası ilə skan edərək<br/>menyuya baxın və sifariş edin!
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  // Status vizual rəngləri
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'EMPTY':
        return { label: 'Boş', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300' };
      case 'ORDER_PENDING':
        return { label: 'Sifariş Gözləyir', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 animate-pulse' };
      case 'ORDER_PREPARING':
        return { label: 'Hazırlanır', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300' };
      case 'SERVICE_PENDING':
        return { label: 'Servis Gözləyir', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300' };
      case 'BILL_PENDING':
        return { label: 'Hesab Gözləyir', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 font-bold' };
      case 'PAID':
        return { label: 'Ödənilib', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300' };
      default:
        return { label: status, color: 'bg-slate-100 text-slate-700' };
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
      <Header
        title="Masaların Vizual İdarə Edilməsi və QR Kodlar"
        subtitle="Masa planı, real-vaxt doluluq vəziyyəti və hər masa üçün unikal QR kod generasiyası"
      />

      <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-700"></span> Boş
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span> Sifariş Gözləyir
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span> Hazırlanır
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-purple-500"></span> Servis Gözləyir
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500"></span> Hesab İstənilib
          </div>
        </div>

        <button
          onClick={() => setShowAddTableModal(true)}
          className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
        >
          <Plus className="w-4 h-4" /> Yeni Masa Əlavə Et
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden p-6 gap-6">
        {/* MASALAR QRİDİ */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tables.map((table) => {
              const statusStyle = getStatusBadge(table.status);
              const isSelected = selectedTable?.id === table.id;

              return (
                <div
                  key={table.id}
                  onClick={() => setSelectedTable(table)}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between h-48 bg-white dark:bg-slate-900 ${
                    isSelected
                      ? 'border-primary-500 shadow-xl ring-2 ring-primary-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-extrabold text-xl text-slate-900 dark:text-white">
                          {table.tableNumber}
                        </h3>
                        <p className="text-xs text-slate-400 font-medium">{table.section}</p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveQRTable(table);
                          setShowQRModal(true);
                        }}
                        className="p-2 bg-slate-100 hover:bg-primary-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary-600 rounded-xl transition"
                        title="QR Kodu Göstər və Çap Et"
                      >
                        <QrCode className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 dark:text-slate-400">
                      <Users className="w-3.5 h-3.5" />
                      <span>{table.capacity} nəfərlik</span>
                    </div>
                  </div>

                  {/* Alt hissə: status və aktiv sifariş məbləği */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusStyle.color}`}>
                      {statusStyle.label}
                    </span>

                    {table.activeOrder && (
                      <span className="font-black text-sm text-slate-900 dark:text-white">
                        {table.activeOrder.totalAmount.toFixed(2)} ₼
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SAĞ PANEL: SEÇİLMİŞ MASANIN SİFARİŞİ VƏ ƏMƏLİYYATLAR */}
        <div className="w-80 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 flex flex-col justify-between">
          {selectedTable ? (
            <div className="flex flex-col h-full">
              <div>
                <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
                  <div>
                    <h3 className="font-black text-lg text-slate-900 dark:text-white">
                      {selectedTable.tableNumber}
                    </h3>
                    <p className="text-xs text-slate-400">{selectedTable.section}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadge(selectedTable.status).color}`}>
                    {getStatusBadge(selectedTable.status).label}
                  </span>
                </div>

                <div className="py-4 space-y-3">
                  <div className="text-xs">
                    <span className="text-slate-400">Təhlükəsiz Token:</span>
                    <div className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 p-1.5 rounded mt-0.5 truncate">
                      {selectedTable.token}
                    </div>
                  </div>

                  {selectedTable.activeOrder ? (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span>Aktiv Sifariş:</span>
                        <span className="font-mono text-primary-500">#{selectedTable.activeOrder.orderNumber}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        Məhsul sayı: {selectedTable.activeOrder.items?.length || 0}
                      </div>
                      <div className="text-sm font-black text-slate-900 dark:text-white flex justify-between pt-1 border-t dark:border-slate-700">
                        <span>Cəmi:</span>
                        <span>{selectedTable.activeOrder.totalAmount.toFixed(2)} AZN</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic text-center py-4">
                      Hal-hazırda masada aktiv sifariş yoxdur
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    setActiveQRTable(selectedTable);
                    setShowQRModal(true);
                  }}
                  className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow"
                >
                  <QrCode className="w-4 h-4" /> QR Kodu Gör və Çap Et
                </button>

                <a
                  href={`/order/${selectedTable.token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Müştəri Menyu Səhifəsini Aç
                </a>

                <button
                  onClick={() => handleRegenerateToken(selectedTable.id)}
                  className="w-full py-2 text-slate-400 hover:text-amber-500 text-[11px] font-semibold flex items-center justify-center gap-1 transition"
                >
                  <RefreshCw className="w-3 h-3" /> Tokeni Yenilə
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center text-xs">
              <LayoutGrid className="w-12 h-12 mb-2 opacity-30" />
              Detallara baxmaq üçün masanın üzərinə klik edin
            </div>
          )}
        </div>
      </div>

      {/* ================= MODAL: QR KOD VƏ ÇAP ================= */}
      {showQRModal && activeQRTable && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="flex justify-between items-center border-b pb-3 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                {activeQRTable.tableNumber} - QR Menyu
              </h3>
              <button onClick={() => setShowQRModal(false)} className="text-slate-400">✕</button>
            </div>

            <div className="p-4 bg-white rounded-xl inline-block shadow-inner border">
              <img
                src={activeQRTable.qrCodeUrl}
                alt="QR Kod"
                className="w-56 h-56 mx-auto object-contain"
              />
            </div>

            <p className="text-xs text-slate-500">
              Müştəri bu QR kodu skan edərək avtomatik {activeQRTable.tableNumber} masasına qoşulacaq və menyunu sifariş edə biləcək.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setShowQRModal(false)}
                className="flex-1 py-2 border rounded-xl text-xs font-semibold"
              >
                Bağla
              </button>
              <button
                onClick={() => handlePrintQR(activeQRTable)}
                className="flex-1 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow"
              >
                <Printer className="w-4 h-4" /> Masaya Çap Et
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: YENİ MASA ƏLAVƏ ET ================= */}
      {showAddTableModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateTable}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4"
          >
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Yeni Masa Əlavə Et</h3>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Masa Adı / Nömrəsi:</label>
              <input
                type="text"
                placeholder="məs: Masa 10 və ya VIP 3"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                required
                className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Nəfər Tutumu:</label>
              <input
                type="number"
                min="1"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Restoran Bölməsi:</label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold text-slate-800 dark:text-white"
              >
                <option value="Əsas Zal">Əsas Zal</option>
                <option value="Teras">Teras</option>
                <option value="VIP Otaq">VIP Otaq</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddTableModal(false)}
                className="flex-1 py-2 border rounded-xl text-xs font-semibold"
              >
                Ləğv
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold"
              >
                Yarat
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
