import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  RotateCcw,
  History,
  Search,
  ShoppingCart,
  FileText,
  Sliders
} from 'lucide-react';
import { api } from '../../api';
import { Header } from '../../components/layout/Header';

export const InventoryPage: React.FC = () => {
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'STOCK' | 'TRANSACTIONS'>('STOCK');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modallar
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  // Ərzaq formu
  const [ingName, setIngName] = useState('');
  const [ingUnit, setIngUnit] = useState('KG');
  const [ingMinStock, setIngMinStock] = useState('5');
  const [ingPrice, setIngPrice] = useState('0');
  const [ingInitial, setIngInitial] = useState('0');

  // Alış formu (Qaimə)
  const [selectedIngId, setSelectedIngId] = useState('');
  const [purchaseQty, setPurchaseQty] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [supplier, setSupplier] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseNote, setPurchaseNote] = useState('');

  // İnventarizasiya (əl ilə düzəliş)
  const [adjustIngId, setAdjustIngId] = useState('');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustNote, setAdjustNote] = useState('İnventarizasiya nəticəsi');

  const fetchInventoryData = async () => {
    try {
      const [ingRes, txRes]: any = await Promise.all([
        api.get('/inventory'),
        api.get('/inventory/transactions')
      ]);

      if (ingRes.success) {
        setIngredients(ingRes.ingredients);
        if (ingRes.ingredients.length > 0) {
          setSelectedIngId(ingRes.ingredients[0].id);
          setAdjustIngId(ingRes.ingredients[0].id);
        }
      }
      if (txRes.success) {
        setTransactions(txRes.transactions);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  // Yeni ərzaq yarat
  const handleCreateIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/inventory', {
        name: ingName,
        unit: ingUnit,
        minStockThreshold: parseFloat(ingMinStock),
        purchasePricePerUnit: parseFloat(ingPrice),
        initialStock: parseFloat(ingInitial)
      });
      setShowAddModal(false);
      setIngName('');
      fetchInventoryData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Alış qeyd et (Purchase)
  const handleRecordPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/inventory/purchase', {
        ingredientId: selectedIngId,
        quantity: parseFloat(purchaseQty),
        unitCost: parseFloat(purchaseCost) || undefined,
        supplier,
        invoiceNumber,
        note: purchaseNote
      });
      setShowPurchaseModal(false);
      setPurchaseQty('');
      fetchInventoryData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // İnventarizasiya düzəlişi
  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/inventory/adjust', {
        ingredientId: adjustIngId,
        newQuantity: parseFloat(adjustQty),
        note: adjustNote
      });
      setShowAdjustModal(false);
      setAdjustQty('');
      fetchInventoryData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredIngredients = ingredients.filter((i) =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockCount = ingredients.filter((i) => i.currentStock <= i.minStockThreshold).length;

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
      <Header
        title="Anbar və Ərzaq Ehtiyatları"
        subtitle="Ərzaq qalıqları, kritik hədd xəbərdarlıqları, daxilolma qaimələri və resept sərfi jurnalı"
      />

      {/* Əməliyyat və Statistika paneli */}
      <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('STOCK')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'STOCK'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Mövcud Qalıqlar ({ingredients.length})
            </button>
            <button
              onClick={() => setActiveTab('TRANSACTIONS')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'TRANSACTIONS'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Hərəkət Jurnalı ({transactions.length})
            </button>
          </div>

          {lowStockCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold">
              <AlertTriangle className="w-4 h-4" />
              <span>{lowStockCount} ərzaq kritik həddədir!</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPurchaseModal(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
          >
            <ShoppingCart className="w-4 h-4" /> Alış Qeydiyyatı (Qaimə)
          </button>
          <button
            onClick={() => setShowAdjustModal(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Sliders className="w-4 h-4" /> İnventarizasiya
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
          >
            <Plus className="w-4 h-4" /> Yeni Ərzaq
          </button>
        </div>
      </div>

      {/* ƏSAS MƏZMUN */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'STOCK' ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 dark:text-white text-base">
                Anbardakı Ərzaqlar və Qalıq Miqdarları
              </h3>
              <div className="relative w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ərzaq axtar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">Ərzaq Adı</th>
                  <th className="p-3.5">Ölçü Vahidi</th>
                  <th className="p-3.5 text-right">Alış Qiyməti</th>
                  <th className="p-3.5 text-right">Minimum Hədd</th>
                  <th className="p-3.5 text-right">Mövcud Qalıq</th>
                  <th className="p-3.5 text-center">Vəziyyət</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredIngredients.map((ing) => {
                  const isLow = ing.currentStock <= ing.minStockThreshold;
                  return (
                    <tr key={ing.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-bold text-slate-800 dark:text-white text-sm">
                        {ing.name}
                      </td>
                      <td className="p-3.5 text-slate-500 font-semibold">{ing.unit}</td>
                      <td className="p-3.5 text-right text-slate-600 dark:text-slate-300">
                        {ing.purchasePricePerUnit.toFixed(2)} AZN
                      </td>
                      <td className="p-3.5 text-right text-slate-400">
                        {ing.minStockThreshold} {ing.unit}
                      </td>
                      <td className="p-3.5 text-right">
                        <span
                          className={`font-black text-sm ${
                            isLow ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {ing.currentStock.toFixed(2)} {ing.unit}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        {isLow ? (
                          <span className="px-2.5 py-1 bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 rounded-full font-bold text-[10px]">
                            Kritik Qalıq
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full font-bold text-[10px]">
                            Kifayətdir
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ANBAR HƏRƏKƏT JURNALI */
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-800 dark:text-white text-base">
                Anbar Hərəkətləri Tarixçəsi (Audit Log)
              </h3>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">Tarix</th>
                  <th className="p-3.5">Ərzaq</th>
                  <th className="p-3.5">Hərəkət Növü</th>
                  <th className="p-3.5 text-right">Miqdar</th>
                  <th className="p-3.5 text-right">Əvvəl / Sonra</th>
                  <th className="p-3.5">Qeyd / Səbəb</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3.5 text-slate-500 whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleString('az-AZ')}
                    </td>
                    <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">
                      {tx.ingredient?.name}
                    </td>
                    <td className="p-3.5">
                      {tx.type === 'INCOMING' && (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                          <ArrowDownRight className="w-3.5 h-3.5" /> Daxilolma (Alış)
                        </span>
                      )}
                      {tx.type === 'OUTGOING_USAGE' && (
                        <span className="inline-flex items-center gap-1 text-primary-500 font-bold">
                          <ArrowUpRight className="w-3.5 h-3.5" /> Resept Sərfi
                        </span>
                      )}
                      {tx.type === 'RETURN_REVERSAL' && (
                        <span className="inline-flex items-center gap-1 text-blue-500 font-bold">
                          <RotateCcw className="w-3.5 h-3.5" /> Geri Qaytarma
                        </span>
                      )}
                      {tx.type === 'MANUAL_CORRECTION' && (
                        <span className="inline-flex items-center gap-1 text-slate-500 font-bold">
                          <Sliders className="w-3.5 h-3.5" /> Düzəliş
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right font-extrabold text-slate-900 dark:text-white">
                      {tx.quantity.toFixed(2)} {tx.ingredient?.unit}
                    </td>
                    <td className="p-3.5 text-right text-slate-400">
                      {tx.previousStock.toFixed(2)} ➔ {tx.newStock.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">
                      {tx.note || tx.supplier || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODAL: YENİ ƏRZAQ ================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateIngredient}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4"
          >
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Yeni Ərzaq Qeydiyyatı</h3>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Ərzaq Adı:</label>
              <input
                type="text"
                required
                placeholder="məs: Mozzarella pendiri, Kartof..."
                value={ingName}
                onChange={(e) => setIngName(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Ölçü Vahidi:</label>
                <select
                  value={ingUnit}
                  onChange={(e) => setIngUnit(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                >
                  <option value="KG">Kiloqram (KG)</option>
                  <option value="G">Qram (G)</option>
                  <option value="L">Litr (L)</option>
                  <option value="ML">Millilitr (ML)</option>
                  <option value="PIECE">Ədəd (PIECE)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Min. Hədd:</label>
                <input
                  type="number"
                  step="0.1"
                  value={ingMinStock}
                  onChange={(e) => setIngMinStock(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Alış Qiyməti (AZN):</label>
                <input
                  type="number"
                  step="0.01"
                  value={ingPrice}
                  onChange={(e) => setIngPrice(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">İlkin Qalıq:</label>
                <input
                  type="number"
                  step="0.1"
                  value={ingInitial}
                  onChange={(e) => setIngInitial(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                />
              </div>
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
                Qeyd Et
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL: ALIŞ DAXİLOLMASI (PURCHASE) ================= */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleRecordPurchase}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4"
          >
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Anbara Ərzaq Alışı (Qaimə)</h3>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Ərzaq:</label>
              <select
                value={selectedIngId}
                onChange={(e) => setSelectedIngId(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold text-slate-800 dark:text-white"
              >
                {ingredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Gələn Miqdar:</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={purchaseQty}
                  onChange={(e) => setPurchaseQty(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Vahid Qiyməti:</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="AZN"
                  value={purchaseCost}
                  onChange={(e) => setPurchaseCost(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Təchizatçı / Qaimə №:</label>
              <input
                type="text"
                placeholder="məs: Baku Agro MMC / Q-8821"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPurchaseModal(false)}
                className="flex-1 py-2 border rounded-xl text-xs font-semibold"
              >
                Ləğv
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
              >
                Anbara Daxil Et
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL: İNVENTARİZASİYA ================= */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAdjustStock}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4"
          >
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">İnventarizasiya (Faktiki Qalıq)</h3>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Ərzaq:</label>
              <select
                value={adjustIngId}
                onChange={(e) => setAdjustIngId(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
              >
                {ingredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>{ing.name} (Hazırda: {ing.currentStock} {ing.unit})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Faktiki Yeni Miqdar:</label>
              <input
                type="number"
                step="0.01"
                required
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Düzəliş Səbəbi:</label>
              <input
                type="text"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="flex-1 py-2 border rounded-xl text-xs font-semibold"
              >
                Ləğv
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold"
              >
                Düzəlişi Saxla
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
