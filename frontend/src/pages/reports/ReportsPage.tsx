import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  CreditCard,
  Banknote,
  Calendar,
  Download,
  Printer,
  ShoppingBag,
  Users,
  AlertOctagon,
  Percent,
  Layers,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { api, API_BASE_URL } from '../../api';
import { Header } from '../../components/layout/Header';

export const ReportsPage: React.FC = () => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'ALL'>('MONTH');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      let params: any = {};

      if (timeRange === 'TODAY') {
        const todayStr = new Date().toISOString().slice(0, 10);
        params.startDate = todayStr;
        params.endDate = todayStr;
      } else if (timeRange === 'WEEK') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        params.startDate = d.toISOString().slice(0, 10);
        params.endDate = new Date().toISOString().slice(0, 10);
      } else if (timeRange === 'MONTH') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        params.startDate = d.toISOString().slice(0, 10);
        params.endDate = new Date().toISOString().slice(0, 10);
      } else if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const res: any = await api.get('/reports/analytics', { params });
      if (res.success) {
        setData(res);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const handleExportCSV = () => {
    window.open(`${API_BASE_URL}/reports/export-csv`, '_blank');
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
      <Header
        title="Maliyyə və Satış Analitikası"
        subtitle="Dövriyyə, nağd/kart bölgüsü, ən çox satılanlar, masalar və personal üzrə gəlirlər"
      />

      {/* Tarix filtri və İxrac */}
      <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {[
            { id: 'TODAY', label: 'Bugün' },
            { id: 'WEEK', label: 'Son 7 Gün' },
            { id: 'MONTH', label: 'Son 30 Gün' },
            { id: 'ALL', label: 'Bütün Dövr' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTimeRange(t.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                timeRange === t.id
                  ? 'bg-primary-500 text-white shadow'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
          >
            <Download className="w-4 h-4" /> Excel/CSV İxrac
          </button>
          <button
            onClick={handlePrintReport}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
          >
            <Printer className="w-4 h-4" /> Çap Vərəqi
          </button>
        </div>
      </div>

      {/* ƏSAS HESABATLAR */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {data && (
          <>
            {/* 1. STATİSTİKA KARTLARI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Ümumi Gəlir */}
              <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ümumi Gəlir</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {data.summary.totalRevenue.toFixed(2)} AZN
                  </div>
                  <div className="text-[11px] text-emerald-500 font-semibold mt-1 flex items-center gap-0.5">
                    <TrendingUp className="w-3.5 h-3.5" /> {data.summary.completedOrdersCount} tamamlanmış sifariş
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-950 text-primary-600 flex items-center justify-center font-bold">
                  ₼
                </div>
              </div>

              {/* Nağd Ödənişlər */}
              <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nağd Satışlar</div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {data.summary.totalCash.toFixed(2)} AZN
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {data.summary.totalRevenue > 0
                      ? `${((data.summary.totalCash / data.summary.totalRevenue) * 100).toFixed(1)}% pay`
                      : '0%'}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                  <Banknote className="w-6 h-6" />
                </div>
              </div>

              {/* POS Terminal Kart Ödənişləri */}
              <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bank Kartı (POS)</div>
                  <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                    {data.summary.totalCard.toFixed(2)} AZN
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {data.summary.totalRevenue > 0
                      ? `${((data.summary.totalCard / data.summary.totalRevenue) * 100).toFixed(1)}% pay`
                      : '0%'}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                  <CreditCard className="w-6 h-6" />
                </div>
              </div>

              {/* Anbar Dəyəri və Qalıqlar */}
              <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Anbar Qalıq Dəyəri</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {data.summary.totalInventoryValuation.toFixed(2)} AZN
                  </div>
                  <div className="text-[11px] text-amber-500 font-semibold mt-1">
                    {data.summary.lowStockCount} kritik ərzaq qalıb
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
                  <Layers className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* 2. ƏN ÇOX VƏ ƏN AZ SATILAN YEMƏKLƏR */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Ən Çox Satılanlar */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ArrowUp className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-base">
                    Ən Çox Satılan Yeməklər (Top 8)
                  </h3>
                </div>
                <div className="space-y-3">
                  {data.topSellingProducts.length === 0 ? (
                    <div className="text-xs text-slate-400 italic py-4 text-center">Məlumat yoxdur</div>
                  ) : (
                    data.topSellingProducts.map((p: any, idx: number) => (
                      <div key={p.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-slate-500">{p.quantity} porsiya</span>
                          <span className="font-extrabold text-primary-600 dark:text-primary-400 w-20 text-right">
                            {p.revenue.toFixed(2)} AZN
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Ən Az Satılanlar */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ArrowDown className="w-5 h-5 text-amber-500" />
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-base">
                    Ən Az Satılan Yeməklər
                  </h3>
                </div>
                <div className="space-y-3">
                  {data.leastSellingProducts.length === 0 ? (
                    <div className="text-xs text-slate-400 italic py-4 text-center">Məlumat yoxdur</div>
                  ) : (
                    data.leastSellingProducts.map((p: any, idx: number) => (
                      <div key={p.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-slate-500">{p.quantity} porsiya</span>
                          <span className="font-extrabold text-slate-700 dark:text-slate-300 w-20 text-right">
                            {p.revenue.toFixed(2)} AZN
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* 3. MASALAR VƏ İŞÇİLƏR ÜZRƏ SATIŞLAR */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Masalar üzrə */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingBag className="w-5 h-5 text-blue-500" />
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-base">
                    Masalar Üzrə Satış və Gəlir
                  </h3>
                </div>
                <div className="space-y-3">
                  {data.tableSales.map((t: any) => (
                    <div key={t.tableNumber} className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{t.tableNumber}</span>
                        <span className="text-slate-400 text-[10px] ml-2">({t.section})</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-slate-500">{t.ordersCount} çek</span>
                        <span className="font-black text-slate-900 dark:text-white w-20 text-right">
                          {t.totalAmount.toFixed(2)} AZN
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* İşçilər üzrə */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-purple-500" />
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-base">
                    İşçi Heyəti Üzrə Xidmət və Satışlar
                  </h3>
                </div>
                <div className="space-y-3">
                  {data.staffSales.length === 0 ? (
                    <div className="text-xs text-slate-400 italic py-4 text-center">Məlumat yoxdur</div>
                  ) : (
                    data.staffSales.map((s: any) => (
                      <div key={s.name} className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{s.name}</span>
                          <span className="text-slate-400 text-[10px] ml-2">({s.role})</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-slate-500">{s.ordersCount} sifariş</span>
                          <span className="font-black text-slate-900 dark:text-white w-20 text-right">
                            {s.totalAmount.toFixed(2)} AZN
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* 4. LƏĞV EDİLMİŞ SİFARİŞLƏR CƏDVƏLİ */}
            {data.cancelledOrders && data.cancelledOrders.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertOctagon className="w-5 h-5 text-rose-500" />
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-base">
                    Ləğv Edilmiş Sifarişlər
                  </h3>
                </div>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b text-slate-400 font-bold uppercase pb-2">
                      <th className="py-2">Sifariş №</th>
                      <th className="py-2">Masa</th>
                      <th className="py-2">Tarix</th>
                      <th className="py-2">Ləğv Səbəbi</th>
                      <th className="py-2 text-right">Məbləğ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.cancelledOrders.map((co: any) => (
                      <tr key={co.id}>
                        <td className="py-2 font-mono font-bold text-slate-800 dark:text-slate-200">{co.orderNumber}</td>
                        <td className="py-2">{co.tableNumber}</td>
                        <td className="py-2 text-slate-500">{new Date(co.createdAt).toLocaleString('az-AZ')}</td>
                        <td className="py-2 text-rose-600 dark:text-rose-400">{co.reason}</td>
                        <td className="py-2 text-right font-bold">{co.totalAmount.toFixed(2)} AZN</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
