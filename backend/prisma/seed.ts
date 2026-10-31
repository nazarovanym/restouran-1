import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- RESTORAN VERİLƏNLƏR BAZASININ İLKİN DOLDURULMASI (SEEDING) BAŞLADI ---');

  // 1. Təmizləmə (əgər mövcuddursa)
  await prisma.auditLog.deleteMany();
  await prisma.waiterCall.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.stockTransaction.deleteMany();
  await prisma.recipeItem.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.table.deleteMany();
  await prisma.user.deleteMany();
  await prisma.restaurantSetting.deleteMany();

  // 2. Restoran Parametrləri
  await prisma.restaurantSetting.create({
    data: {
      id: 'default-settings',
      name: 'Naxçıvan Restoran & Lounge',
      address: 'Bakı şəhəri, Nizami küçəsi 42 / Fəvvarələr Meydanı',
      phone: '+994 (12) 498-88-99',
      tin: '1402394821',
      currency: 'AZN',
      vatPercentage: 0,
      serviceFeePercentage: 5,
      terminalType: 'SIMULATED_POS',
      terminalConfig: JSON.stringify({
        bank: 'Paşa Bank & ABB Gateway',
        terminalId: 'TRM-994-01-AZ',
        merchantId: 'MRC-BAKU-887',
        isSimulationMode: true,
      })
    }
  });
  console.log('✓ Restoran tənzimləmələri yaradıldı.');

  // 3. İstifadəçilər (Hər rol üçün)
  const defaultPassword = await bcrypt.hash('admin123', 10);
  const kassaPassword = await bcrypt.hash('kassa123', 10);
  const waiterPassword = await bcrypt.hash('waiter123', 10);
  const kitchenPassword = await bcrypt.hash('chef123', 10);
  const stockPassword = await bcrypt.hash('stock123', 10);

  const users = [
    {
      username: 'superadmin',
      fullName: 'Elmir Qasımov (Sistem Administratoru)',
      passwordHash: defaultPassword,
      role: 'SUPER_ADMIN',
      phone: '+994 50 111 22 33'
    },
    {
      username: 'admin',
      fullName: 'Rəşad Əliyev (Restoran Direktoru)',
      passwordHash: defaultPassword,
      role: 'RESTAURANT_ADMIN',
      phone: '+994 50 222 33 44'
    },
    {
      username: 'kassir1',
      fullName: 'Aysel Məmmədova (Baş Kassir)',
      passwordHash: kassaPassword,
      role: 'CASHIER',
      phone: '+994 55 333 44 55'
    },
    {
      username: 'ofisiant1',
      fullName: 'Tural Həsənov (Ofisiant)',
      passwordHash: waiterPassword,
      role: 'WAITER',
      phone: '+994 70 444 55 66'
    },
    {
      username: 'metbex1',
      fullName: 'Şef Əhməd İsmayılov (Baş Aşpaz)',
      passwordHash: kitchenPassword,
      role: 'KITCHEN_STAFF',
      phone: '+994 77 555 66 77'
    },
    {
      username: 'anbar1',
      fullName: 'Vüqar Nəbiyev (Anbar İdarəçisi)',
      passwordHash: stockPassword,
      role: 'STOCK_MANAGER',
      phone: '+994 51 666 77 88'
    }
  ];

  for (const u of users) {
    await prisma.user.create({ data: u });
  }
  console.log(`✓ ${users.length} ədəd istifadəçi və rollar yaradıldı.`);

  // 4. Masalar (Unikal təhlükəsiz tokenlərlə)
  const tablesData = [
    { tableNumber: 'Masa 1', capacity: 2, section: 'Əsas Zal', token: 'sec_zal_tbl_01_a8f9' },
    { tableNumber: 'Masa 2', capacity: 4, section: 'Əsas Zal', token: 'sec_zal_tbl_02_c4d2' },
    { tableNumber: 'Masa 3', capacity: 4, section: 'Əsas Zal', token: 'sec_zal_tbl_03_e7b1' },
    { tableNumber: 'Masa 4', capacity: 6, section: 'Əsas Zal', token: 'sec_zal_tbl_04_99fa' },
    { tableNumber: 'Masa 5', capacity: 4, section: 'Teras', token: 'sec_ter_tbl_05_11bb' },
    { tableNumber: 'Masa 6', capacity: 6, section: 'Teras', token: 'sec_ter_tbl_06_22cc' },
    { tableNumber: 'Masa 7', capacity: 2, section: 'Teras', token: 'sec_ter_tbl_07_33dd' },
    { tableNumber: 'VIP 1', capacity: 8, section: 'VIP Otaq', token: 'sec_vip_tbl_08_88ee' },
    { tableNumber: 'VIP 2', capacity: 12, section: 'VIP Otaq', token: 'sec_vip_tbl_09_99ff' }
  ];

  for (const t of tablesData) {
    await prisma.table.create({ data: t });
  }
  console.log(`✓ ${tablesData.length} ədəd masa yaradıldı.`);

  // 5. Anbar Ərzaqları (Ingredients)
  const ingredientsData = [
    { name: 'Əla Növ Buğda Unu', unit: 'KG', currentStock: 50.0, minStockThreshold: 10.0, purchasePricePerUnit: 1.40 },
    { name: 'Mozzarella Pendiri', unit: 'KG', currentStock: 25.0, minStockThreshold: 5.0, purchasePricePerUnit: 12.50 },
    { name: 'Təbii Pomidor Sousu', unit: 'L', currentStock: 30.0, minStockThreshold: 5.0, purchasePricePerUnit: 4.00 },
    { name: 'Təzə Dana Əti (Can əti)', unit: 'KG', currentStock: 40.0, minStockThreshold: 8.0, purchasePricePerUnit: 17.50 },
    { name: 'Təzə Toyuq Filesi', unit: 'KG', currentStock: 35.0, minStockThreshold: 7.0, purchasePricePerUnit: 8.00 },
    { name: 'Aysberq Kahı', unit: 'KG', currentStock: 15.0, minStockThreshold: 3.0, purchasePricePerUnit: 4.50 },
    { name: 'Parmezan Pendiri', unit: 'KG', currentStock: 10.0, minStockThreshold: 2.0, purchasePricePerUnit: 24.00 },
    { name: 'Sezar Sousu', unit: 'L', currentStock: 8.0, minStockThreshold: 2.0, purchasePricePerUnit: 9.00 },
    { name: 'Qırmızı Mərci', unit: 'KG', currentStock: 20.0, minStockThreshold: 4.0, purchasePricePerUnit: 3.20 },
    { name: 'Kərə Yağı (Təbii)', unit: 'KG', currentStock: 18.0, minStockThreshold: 3.0, purchasePricePerUnit: 16.00 },
    { name: 'Limon', unit: 'PIECE', currentStock: 100, minStockThreshold: 20, purchasePricePerUnit: 0.40 },
    { name: 'Burger Bulkası', unit: 'PIECE', currentStock: 60, minStockThreshold: 15, purchasePricePerUnit: 0.80 },
    { name: 'Çeddar Pendiri', unit: 'KG', currentStock: 12.0, minStockThreshold: 2.5, purchasePricePerUnit: 14.00 },
    { name: 'Dondurulmuş Kartof Fri', unit: 'KG', currentStock: 45.0, minStockThreshold: 10.0, purchasePricePerUnit: 3.80 },
    { name: 'Lənkəran Qara Çayı', unit: 'KG', currentStock: 10.0, minStockThreshold: 2.0, purchasePricePerUnit: 22.00 },
    { name: 'Təbii Dağ Kəklikotu', unit: 'KG', currentStock: 5.0, minStockThreshold: 1.0, purchasePricePerUnit: 30.00 },
    { name: 'Təbii Bal', unit: 'KG', currentStock: 12.0, minStockThreshold: 2.0, purchasePricePerUnit: 18.00 },
    { name: 'Qoz Ləpəsi', unit: 'KG', currentStock: 15.0, minStockThreshold: 3.0, purchasePricePerUnit: 16.00 }
  ];

  const ingredientMap = new Map<string, string>();
  for (const ing of ingredientsData) {
    const created = await prisma.ingredient.create({ data: ing });
    ingredientMap.set(created.name, created.id);

    // İlk daxilolma qeydiyyatı
    await prisma.stockTransaction.create({
      data: {
        ingredientId: created.id,
        type: 'INCOMING',
        quantity: created.currentStock,
        previousStock: 0,
        newStock: created.currentStock,
        unitCost: created.purchasePricePerUnit,
        totalCost: created.currentStock * created.purchasePricePerUnit,
        supplier: 'Baku Agro & Food Supply MMC',
        invoiceNumber: 'INV-2026-INIT-' + Math.floor(1000 + Math.random() * 9000),
        note: 'Sistem ilkin anbar ehtiyatı açılışı'
      }
    });
  }
  console.log(`✓ ${ingredientsData.length} ədəd ərzaq və daxilolma qeydi yaradıldı.`);

  // 6. Kateqoriyalar
  const categories = [
    { name: 'Səhər yeməkləri', icon: 'Sun', displayOrder: 1 },
    { name: 'Şorbalar', icon: 'Soup', displayOrder: 2 },
    { name: 'Salatlar', icon: 'Salad', displayOrder: 3 },
    { name: 'Əsas yeməklər', icon: 'Utensils', displayOrder: 4 },
    { name: 'Pizza', icon: 'Pizza', displayOrder: 5 },
    { name: 'Fast Food', icon: 'Sandwich', displayOrder: 6 },
    { name: 'Şirniyyatlar', icon: 'Cake', displayOrder: 7 },
    { name: 'İçkilər', icon: 'Coffee', displayOrder: 8 }
  ];

  const categoryMap = new Map<string, string>();
  for (const c of categories) {
    const cat = await prisma.category.create({ data: c });
    categoryMap.set(cat.name, cat.id);
  }
  console.log(`✓ ${categories.length} ədəd menyu kateqoriyası yaradıldı.`);

  // 7. Menyu Məhsulları və Reseptləri
  const menuItems = [
    {
      category: 'Səhər yeməkləri',
      name: 'Naxçıvan Qayğanağı və Pendir Boğçası',
      description: 'Kənd yumurtası, nehrə yağı, Naxçıvan motal pendiri, bal və təndir çörəyi ilə',
      price: 12.00,
      imageUrl: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600&auto=format&fit=crop&q=80',
      preparationTimeMinutes: 12,
      displayOrder: 1,
      recipes: [
        { ingredientName: 'Kərə Yağı (Təbii)', quantityNeeded: 0.05 },
        { ingredientName: 'Təbii Bal', quantityNeeded: 0.03 }
      ]
    },
    {
      category: 'Şorbalar',
      name: 'Ənənəvi Mərci Şorbası',
      description: 'Qırmızı mərci, kərə yağı, qızardılmış çörək suxarisi və limon dilimi ilə',
      price: 6.50,
      imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&auto=format&fit=crop&q=80',
      preparationTimeMinutes: 10,
      displayOrder: 2,
      recipes: [
        { ingredientName: 'Qırmızı Mərci', quantityNeeded: 0.08 },
        { ingredientName: 'Kərə Yağı (Təbii)', quantityNeeded: 0.02 },
        { ingredientName: 'Limon', quantityNeeded: 0.5 }
      ]
    },
    {
      category: 'Salatlar',
      name: 'Toyuqlu Sezar Salatı',
      description: 'Qrildə bişmiş toyuq filesi, aysberq kahı, parmezan yonqarları, krutonlar və xüsusi sezar sousu',
      price: 13.50,
      imageUrl: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=600&auto=format&fit=crop&q=80',
      preparationTimeMinutes: 15,
      displayOrder: 3,
      recipes: [
        { ingredientName: 'Təzə Toyuq Filesi', quantityNeeded: 0.15 },
        { ingredientName: 'Aysberq Kahı', quantityNeeded: 0.12 },
        { ingredientName: 'Parmezan Pendiri', quantityNeeded: 0.03 },
        { ingredientName: 'Sezar Sousu', quantityNeeded: 0.04 }
      ]
    },
    {
      category: 'Əsas yeməklər',
      name: 'Dana Basdırma Kabab',
      description: 'Xüsusi marinad olunmuş dana can əti, közlənmiş pomidor, bibər və lavaş ilə',
      price: 19.00,
      imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80',
      preparationTimeMinutes: 20,
      displayOrder: 4,
      recipes: [
        { ingredientName: 'Təzə Dana Əti (Can əti)', quantityNeeded: 0.28 },
        { ingredientName: 'Kərə Yağı (Təbii)', quantityNeeded: 0.01 }
      ]
    },
    {
      category: 'Pizza',
      name: 'Klassik Pizza Margherita',
      description: 'İtalyan incə xəmiri, təbii pomidor sousu, bol Mozzarella pendiri və təzə reyhan yarpaqları',
      price: 15.00,
      imageUrl: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=600&auto=format&fit=crop&q=80',
      preparationTimeMinutes: 15,
      displayOrder: 5,
      recipes: [
        { ingredientName: 'Əla Növ Buğda Unu', quantityNeeded: 0.22 },
        { ingredientName: 'Mozzarella Pendiri', quantityNeeded: 0.16 },
        { ingredientName: 'Təbii Pomidor Sousu', quantityNeeded: 0.08 }
      ]
    },
    {
      category: 'Fast Food',
      name: 'Premium Qara Ət Burger & Fri',
      description: '180 qr şirəli dana kotleti, əridilmiş çeddar, karamelizə soğan və qızılı kartof fri ilə',
      price: 14.50,
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
      preparationTimeMinutes: 14,
      displayOrder: 6,
      recipes: [
        { ingredientName: 'Burger Bulkası', quantityNeeded: 1 },
        { ingredientName: 'Təzə Dana Əti (Can əti)', quantityNeeded: 0.18 },
        { ingredientName: 'Çeddar Pendiri', quantityNeeded: 0.04 },
        { ingredientName: 'Dondurulmuş Kartof Fri', quantityNeeded: 0.15 }
      ]
    },
    {
      category: 'Şirniyyatlar',
      name: 'Klassik Ballı Tort (Medovik)',
      description: 'Təbii dağ balı ilə bişirilmiş incə korjlar və zərif qaymaqlı krem',
      price: 8.50,
      imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80',
      preparationTimeMinutes: 5,
      displayOrder: 7,
      recipes: [
        { ingredientName: 'Təbii Bal', quantityNeeded: 0.04 },
        { ingredientName: 'Əla Növ Buğda Unu', quantityNeeded: 0.08 },
        { ingredientName: 'Qoz Ləpəsi', quantityNeeded: 0.03 }
      ]
    },
    {
      category: 'İçkilər',
      name: 'Lənkəran Kəklikotulu Çay Dəstgahı',
      description: 'Zərif Lənkəran çayı, kəklikotu, mürəbbə, limon və paxlava dilimləri ilə',
      price: 9.00,
      imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80',
      preparationTimeMinutes: 6,
      displayOrder: 8,
      recipes: [
        { ingredientName: 'Lənkəran Qara Çayı', quantityNeeded: 0.02 },
        { ingredientName: 'Təbii Dağ Kəklikotu', quantityNeeded: 0.01 },
        { ingredientName: 'Limon', quantityNeeded: 1 }
      ]
    }
  ];

  for (const item of menuItems) {
    const categoryId = categoryMap.get(item.category)!;
    const createdItem = await prisma.menuItem.create({
      data: {
        categoryId,
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: item.imageUrl,
        preparationTimeMinutes: item.preparationTimeMinutes,
        displayOrder: item.displayOrder,
        isAvailable: true
      }
    });

    for (const r of item.recipes) {
      const ingId = ingredientMap.get(r.ingredientName);
      if (ingId) {
        await prisma.recipeItem.create({
          data: {
            menuItemId: createdItem.id,
            ingredientId: ingId,
            quantityNeeded: r.quantityNeeded
          }
        });
      }
    }
  }
  console.log(`✓ ${menuItems.length} ədəd menyu məhsulu və resept bağlamaları yaradıldı.`);

  console.log('--- VERİLƏNLƏR BAZASI UĞURLA DOLDURULDU (SEED COMPLETE) ---');
}

main()
  .catch((e) => {
    console.error('Seed xətası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
