import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  Plus,
  Edit2,
  CheckCircle,
  XCircle,
  Search,
  Layers,
  Sparkles,
  Tag,
  Link,
  Flame,
  Clock
} from 'lucide-react';
import { api } from '../../api';
import { Header } from '../../components/layout/Header';

export const MenuPage: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modallar
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Məhsul Forması
  const [itemName, setItemName] = useState('');
  const [itemCategoryId, setItemCategoryId] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemImg, setItemImg] = useState('');
  const [prepTime, setPrepTime] = useState('15');
  const [itemRecipes, setItemRecipes] = useState<{ ingredientId: string; quantityNeeded: number }[]>([]);

  // Kateqoriya Forması
  const [newCatName, setNewCatName] = useState('');

  const fetchMenuData = async () => {
    try {
      const [catRes, itemRes, ingRes]: any = await Promise.all([
        api.get('/categories'),
        api.get('/menu/all'),
        api.get('/inventory')
      ]);

      if (catRes.success) setCategories(catRes.categories);
      if (itemRes.success) setMenuItems(itemRes.items);
      if (ingRes.success) setIngredients(ingRes.ingredients);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuData();
  }, []);

  const handleOpenCreateItem = () => {
    setEditingItem(null);
    setItemName('');
    setItemCategoryId(categories[0]?.id || '');
    setItemPrice('');
    setItemDesc('');
    setItemImg('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80');
    setPrepTime('15');
    setItemRecipes([]);
    setShowItemModal(true);
  };

  const handleOpenEditItem = (item: any) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemCategoryId(item.categoryId);
    setItemPrice(item.price.toString());
    setItemDesc(item.description || '');
    setItemImg(item.imageUrl || '');
    setPrepTime(item.preparationTimeMinutes?.toString() || '15');
    setItemRecipes(
      item.recipeItems?.map((r: any) => ({
        ingredientId: r.ingredientId,
        quantityNeeded: r.quantityNeeded
      })) || []
    );
    setShowItemModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: itemName,
      categoryId: itemCategoryId,
      price: parseFloat(itemPrice),
      description: itemDesc,
      imageUrl: itemImg,
      preparationTimeMinutes: parseInt(prepTime, 10),
      recipes: itemRecipes
    };

    try {
      if (editingItem) {
        await api.put(`/menu/${editingItem.id}`, payload);
      } else {
        await api.post('/menu', payload);
      }
      setShowItemModal(false);
      fetchMenuData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleAvailability = async (id: string, isAvailable: boolean) => {
    try {
      await api.patch(`/menu/${id}/toggle-availability`, { isAvailable: !isAvailable });
      fetchMenuData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;
    try {
      await api.post('/categories', { name: newCatName });
      setNewCatName('');
      setShowCategoryModal(false);
      fetchMenuData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Resept üçün ərzaq əlavə et
  const handleAddRecipeRow = () => {
    if (ingredients.length === 0) return;
    setItemRecipes([...itemRecipes, { ingredientId: ingredients[0].id, quantityNeeded: 0.1 }]);
  };

  const handleRemoveRecipeRow = (index: number) => {
    setItemRecipes(itemRecipes.filter((_, idx) => idx !== index));
  };

  const handleUpdateRecipeRow = (index: number, field: string, value: any) => {
    const updated = [...itemRecipes];
    updated[index] = { ...updated[index], [field]: value };
    setItemRecipes(updated);
  };

  const filteredItems = menuItems.filter((item) => {
    const matchesCat = selectedCategoryId === 'ALL' || item.categoryId === selectedCategoryId;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
      <Header
        title="Menyu və Resept İdarəetməsi"
        subtitle="Yeməklər, qiymətlər, kateqoriyalar, aktivlik və avtomatik anbar çıxışı üçün resept bağlamaları"
      />

      <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
        {/* Axtarış */}
        <div className="relative w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Yemək adı ilə axtar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl"
          />
        </div>

        {/* Düymələr */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Layers className="w-4 h-4" /> Yeni Kateqoriya
          </button>
          <button
            onClick={handleOpenCreateItem}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
          >
            <Plus className="w-4 h-4" /> Yeni Yemək Əlavə Et
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* SOL: KATEQORİYALAR */}
        <div className="w-60 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 overflow-y-auto space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
            Kateqoriyalar
          </div>
          <button
            onClick={() => setSelectedCategoryId('ALL')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between ${
              selectedCategoryId === 'ALL'
                ? 'bg-primary-500 text-white shadow'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>Bütün Yeməklər</span>
            <span className="text-[10px] opacity-80">{menuItems.length}</span>
          </button>
          {categories.map((c) => {
            const count = menuItems.filter((i) => i.categoryId === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCategoryId(c.id)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                  selectedCategoryId === c.id
                    ? 'bg-primary-500 text-white shadow'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{c.name}</span>
                <span className="text-[10px] opacity-80">{count}</span>
              </button>
            );
          })}
        </div>

        {/* SAĞ: YEMƏKLƏR QRİDİ */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col justify-between hover:border-slate-300 transition"
              >
                <div>
                  <div className="h-44 w-full relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src={item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80'}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2.5 right-2.5 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-xs font-black shadow">
                      {item.price.toFixed(2)} AZN
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-center justify-between text-[11px] text-primary-500 font-bold mb-1">
                      <span>{item.category?.name}</span>
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {item.preparationTimeMinutes || 15} dəq
                      </span>
                    </div>

                    <h4 className="font-extrabold text-slate-800 dark:text-white text-base leading-snug">
                      {item.name}
                    </h4>

                    {item.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    {/* Resept Ərzaqları xülasəsi */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                      <span className="font-bold text-slate-700 dark:text-slate-300">Resept sərfi: </span>
                      {item.recipeItems && item.recipeItems.length > 0 ? (
                        <span>{item.recipeItems.length} ərzaq bağlıdır</span>
                      ) : (
                        <span className="text-amber-500">Resept təyin edilməyib</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => handleToggleAvailability(item.id, item.isAvailable)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      item.isAvailable
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {item.isAvailable ? 'Satışda Var' : 'Satışdan Çıxarılıb'}
                  </button>

                  <button
                    onClick={() => handleOpenEditItem(item)}
                    className="p-1.5 text-slate-500 hover:text-primary-600 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    title="Redaktə Et və Resepti Dəyiş"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ================= MODAL: YEMƏK VƏ RESEPT REDAKTƏSİ ================= */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveItem}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b pb-3 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                {editingItem ? 'Yeməyi Redaktə Et' : 'Yeni Yemək Əlavə Et'}
              </h3>
              <button type="button" onClick={() => setShowItemModal(false)} className="text-slate-400">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Yemək Adı:</label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Kateqoriya:</label>
                <select
                  value={itemCategoryId}
                  onChange={(e) => setItemCategoryId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Qiymət (AZN):</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Hazırlanma Vaxtı (dəq):</label>
                <input
                  type="number"
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Şəkil URL:</label>
              <input
                type="text"
                value={itemImg}
                onChange={(e) => setItemImg(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Təsvir və Tərkibi:</label>
              <textarea
                rows={2}
                value={itemDesc}
                onChange={(e) => setItemDesc(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
              />
            </div>

            {/* RESEPT BÖLMƏSİ (ANBAR AVTOMATİK ÇIXIŞI ÜÇÜN) */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-primary-500" /> Resept və Ərzaq Sərfi (Avtomatik Anbar)
                </span>
                <button
                  type="button"
                  onClick={handleAddRecipeRow}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold rounded-lg flex items-center gap-1 text-primary-600"
                >
                  <Plus className="w-3.5 h-3.5" /> Ərzaq Bağla
                </button>
              </div>

              {itemRecipes.length === 0 ? (
                <div className="text-xs text-slate-400 italic p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  Hələ heç bir ərzaq bağlanmayıb. Yemək satıldıqda anbardan avtomatik çıxılması üçün ərzaqlar əlavə edin.
                </div>
              ) : (
                <div className="space-y-2">
                  {itemRecipes.map((r, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <select
                        value={r.ingredientId}
                        onChange={(e) => handleUpdateRecipeRow(idx, 'ingredientId', e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg font-bold"
                      >
                        {ingredients.map((ing) => (
                          <option key={ing.id} value={ing.id}>
                            {ing.name} ({ing.unit})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.001"
                        placeholder="Miqdar"
                        value={r.quantityNeeded}
                        onChange={(e) => handleUpdateRecipeRow(idx, 'quantityNeeded', parseFloat(e.target.value) || 0)}
                        className="w-24 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg font-bold text-center"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipeRow(idx)}
                        className="p-1 text-slate-400 hover:text-rose-500"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-3">
              <button
                type="button"
                onClick={() => setShowItemModal(false)}
                className="flex-1 py-2.5 border rounded-xl text-xs font-semibold"
              >
                Ləğv
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold"
              >
                Yadda Saxla
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL: KATEQORİYA ================= */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateCategory}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4"
          >
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Yeni Kateqoriya Yarat</h3>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Kateqoriya Adı:</label>
              <input
                type="text"
                placeholder="məs: Əsas yeməklər, Salatlar..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                required
                className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="flex-1 py-2 border rounded-xl text-xs font-semibold"
              >
                Ləğv
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold"
              >
                Əlavə Et
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
