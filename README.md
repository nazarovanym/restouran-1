# Naxçıvan RMS - İnteqrasiya Olunmuş Restoran İdarəetmə Sistemi

Bu layihə restoran biznesi üçün Windows Desktop, Web İdarəetmə Paneli, Mobil QR Menyu, Kassa/POS, Ofisiant və Mətbəx Ekranını (KDS) vahid verilənlər bazası və real-vaxt (WebSocket) backend ilə birləşdirən tam funksional və müasir proqram təminatıdır.

---

## 🌟 Əsas Funksionallıqlar

1. **Müştərilər üçün Mobil QR Menyu (`/order/:token`):**
   - Hər masa üçün unikal və təxmin edilməsi qeyri-mümkün olan kriptoqrafik tokenlər.
   - Telefon kamerası ilə skan edildikdə avtomatik masanın müəyyən olunması.
   - Kateqoriyalar, axtarış, şəkillər, qiymət, tərkib, xüsusi qeydlər ("acı olmasın", "az duzlu").
   - Canlı sifariş izləməsi ("Mətbəx hazırlayır", "Hazırdır", "Servis edildi").
   - Sürətli **"Ofisiantı çağır"** və **"Hesabı istə"** düymələri.

2. **Kassa və POS Sistemi (`/pos`):**
   - Yeni, hazırlanan, hazır, tamamlanmış və ləğv edilmiş sifarişlər.
   - Sifarişə yemək əlavə etmə və silmə.
   - Faiz və ya sabit məbləğlə endirim tətbiqi.
   - Çoxşaxəli ödəniş növləri: **Nağd** (qalıq hesablanması), **Bank Kartı** (POS terminal inteqrasiyası ilə RRN kodu), **Bölünmüş (Split)** ödəniş.
   - Termo qəbz formatında çap çıxışı (80mm qəbz).
   - Gündəlik Kassa **Z-Hesabatı** (Günlük nağd, kart və ümumi dövriyyə).

3. **Mətbəx Ekranı (KDS - Kitchen Display System) (`/kitchen`):**
   - Kartlar şəklində sifarişlər, porsiya sayları, müştəri qeydləri.
   - Yeni sifariş gəldikdə real-vaxt səsli bildiriş (Web Audio chime).
   - Hazırlanma vaxtının canlı taymeri və gecikmə xəbərdarlığı.
   - Status axını: *Təsdiqləndi* $\rightarrow$ *Hazırlanır* $\rightarrow$ *Hazırdır* $\rightarrow$ *Təslim edildi*.

4. **Masaların İdarə Edilməsi (`/tables`):**
   - Masaların vizual doluluq xəritəsi (Boş, Sifariş gözləyir, Hazırlanır, Servis gözləyir, Hesab gözləyir).
   - Hər masa üçün unikal QR kodun ekranda göstərilməsi, masaya çap edilməsi və yenilənməsi.
   - Masaya klik etdikdə aktiv sifariş və hesabın açılması.

5. **Ofisiant Paneli (`/waiter`):**
   - Müştəri çağırışlarının səsli və vizual qəbulu ("Yaxınlaşdım" düyməsi).
   - Masalara birbaşa sifariş yazılması.
   - Müştəriyə hesab təqdimatı üçün qəbz çapı.

6. **Menyu və Resept İdarəetməsi (`/menu`):**
   - Kateqoriyalar və məhsulların idarəsi, şəkillər, qiymət, aktivlik statusu.
   - **Avtomatik Anbar Resepti Bağlaması:** Hər yemək üçün tələb olunan ərzaq miqdarının təyin edilməsi. Yemək hazırlandıqda ərzaq avtomatik anbardan çıxılır; sifariş ləğv edildikdə anbara geri qaytarılır!

7. **Anbar və Ərzaq İdarəetməsi (`/inventory`):**
   - Ərzaq qalıqları, ölçü vahidləri (kq, qr, litr, ml, ədəd), minimum hədd xəbərdarlıqları.
   - Qaimə üzrə alış daxilolmaları.
   - İnventarizasiya (əl ilə faktiki qalıq düzəlişi).
   - Bütün anbar hərəkətlərinin dəqiq tarixçəsi (Daxilolma, Resept sərfi, Geri qaytarma).

8. **Hesabatlar və Analitika (`/reports`):**
   - Günlük, həftəlik, aylıq və sərbəst tarix aralıqları.
   - Nağd və kart satışlarının faiz bölgüsü.
   - Ən çox və ən az satılan 8 məhsul.
   - Masalar və işçilər üzrə gəlirlər.
   - Excel/CSV və Çap formatında ixrac.

9. **İşçi Rolları və Təhlükəsizlik (`/staff`):**
   - Rol əsaslı giriş (RBAC): Super Admin, Restoran Direktoru, Kassir, Ofisiant, Mətbəx, Anbar.
   - Həssas məlumatların (məs: kassirin anbarı dəyişə bilməməsi, aşpazın maliyyəni görməməsi) backend səviyyəsində qorunması.
   - Şifrələrin bcrypt ilə hash edilməsi və JWT təhlükəsizliyi.

10. **Windows Desktop Electron Tətbiqi (`/desktop`):**
    - Windows kompüterlərində müstəqil pəncərə kimi işləmə imkanı.
    - Avtomatik server qoşulması və şəbəkə kəsildikdə xəbərdarlıq ekranı.

---

## 🛠 Texnologiya Yığını

- **Backend:** Node.js, Express, TypeScript, Socket.IO, Prisma ORM, SQLite / PostgreSQL, JWT, Bcrypt.
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Web Audio API.
- **Desktop:** Electron, IPC Bridge.

---

## 🚀 Başlama və Quraşdırma Təlimatı

### 1. Backend-in İşə Salınması
```bash
cd backend
npm install
npx prisma db push
npx ts-node prisma/seed.ts
npm run dev
```
Backend `http://localhost:5000` ünvanında fəaliyyətə başlayacaq.

### 2. Frontend-in İşə Salınması
```bash
cd frontend
npm install
npm run dev
```
Frontend `http://localhost:5173` ünvanında açılacaq.

### 3. Windows Desktop Proqramının Başladılması
```bash
cd desktop
npm install
npm start
```

---

## 🔑 Test İstifadəçi Hesabları

| Rol | İstifadəçi Adı | Şifrə |
|---|---|---|
| **Restoran Direktoru** | `admin` | `admin123` |
| **Kassir** | `kassir1` | `kassa123` |
| **Mətbəx / Baş Aşpaz** | `metbex1` | `chef123` |
| **Ofisiant** | `ofisiant1` | `waiter123` |
| **Anbar İdarəçisi** | `anbar1` | `stock123` |
| **Super Admin** | `superadmin` | `admin123` |

Müştəri Mobil QR menyusunu birbaşa `http://localhost:5173/order/sec_zal_tbl_01_a8f9` linki ilə sınaqdan keçirə bilərsiniz.
