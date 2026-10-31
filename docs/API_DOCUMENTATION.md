# REST API Sənədi - Restoran İdarəetmə Sistemi (RMS)

Baza URL: `http://localhost:5000/api/v1`

---

## 1. Autentifikasiya və İstifadəçilər

### `POST /auth/login`
- **Təsvir:** Sistemə daxilolma və JWT token alınması.
- **Body:** `{ "username": "admin", "password": "admin123" }`
- **Cavab:** `{ "success": true, "token": "...", "user": { ... } }`

### `GET /auth/me`
- **Headers:** `Authorization: Bearer <token>`
- **Təsvir:** Cari istifadəçi məlumatları.

### `GET /auth/users`
- **İcazə:** `SUPER_ADMIN`, `RESTAURANT_ADMIN`
- **Təsvir:** Bütün işçilərin siyahısı.

### `POST /auth/users`
- **Body:** `{ "username": "...", "password": "...", "fullName": "...", "role": "WAITER", "phone": "..." }`

---

## 2. Masalar və QR Kodlar

### `GET /tables`
- **Təsvir:** Bütün masalar, onların real-vaxt doluluq statusları və QR kod DataURL-ləri.

### `GET /tables/token/:token`
- **Təsvir:** Müştəri QR menyusu üçün masa məlumatı və aktiv sifariş. Açıq endpointdir.

### `POST /tables`
- **İcazə:** Admin
- **Body:** `{ "tableNumber": "Masa 10", "capacity": 4, "section": "Teras" }`

### `POST /tables/:id/regenerate-token`
- **Təsvir:** Masa üçün yeni təhlükəsiz kriptoqrafik QR kod generasiya edir.

---

## 3. Menyu və Reseptlər

### `GET /menu`
- **Təsvir:** Kateqoriyalara bölünmüş aktiv menyu.

### `POST /menu`
- **İcazə:** Admin
- **Body:**
  ```json
  {
    "name": "Pizza Funghi",
    "categoryId": "...",
    "price": 16.50,
    "description": "Göbələk və pendir ilə",
    "preparationTimeMinutes": 15,
    "recipes": [
      { "ingredientId": "...", "quantityNeeded": 0.25 },
      { "ingredientId": "...", "quantityNeeded": 0.15 }
    ]
  }
  ```

### `PATCH /menu/:id/toggle-availability`
- **Body:** `{ "isAvailable": false }`

---

## 4. Sifarişlər (Orders)

### `POST /orders`
- **Təsvir:** Yeni sifariş yaratma (Müştəri QR menyusu, Kassa və ya Ofisiant tərəfindən).
- **Body:**
  ```json
  {
    "tableToken": "sec_zal_tbl_01_a8f9",
    "items": [
      { "menuItemId": "...", "quantity": 2, "specialInstructions": "Pendirli" }
    ],
    "notes": "Tələsirik",
    "source": "QR_CODE"
  }
  ```

### `PATCH /orders/:id/status`
- **Statuslar:** `PENDING`, `CONFIRMED`, `PREPARING`, `READY`, `SERVED`, `COMPLETED`, `CANCELLED`
- **Xüsusiyyət:** `PREPARING` olduqda resept üzrə ərzaqlar avtomatik anbardan çıxılır; `CANCELLED` olduqda anbara geri qaytarılır!

### `POST /orders/:id/items`
- **Təsvir:** Sifarişə yeni məhsul əlavə etmək.

### `DELETE /orders/:id/items/:itemId`
- **Təsvir:** Sifarişdən məhsul çıxarmaq.

---

## 5. Ödənişlər və Kassa (Payments & POS)

### `POST /payments/:orderId/apply-discount`
- **Body:** `{ "discountPercent": 10, "reason": "Daimi müştəri" }`

### `POST /payments/:orderId/process`
- **Body (Nağd):**
  ```json
  { "method": "CASH", "cashGiven": 50.0 }
  ```
- **Body (Bank POS):**
  ```json
  { "method": "CARD_TERMINAL" }
  ```
- **Body (Bölünmüş):**
  ```json
  {
    "method": "SPLIT",
    "payments": [
      { "method": "CASH", "amount": 20.0, "cashGiven": 20.0 },
      { "method": "CARD_TERMINAL", "amount": 11.5 }
    ]
  }
  ```

### `GET /payments/:orderId/receipt`
- **Təsvir:** Termo printer üçün qəbzin mətni və detalları.

### `GET /payments/daily-report`
- **Təsvir:** Gündəlik Z-Hesabatı (Nağd, kart, ümumi gəlir və çek sayı).

---

## 6. Anbar və Ərzaqlar (Inventory)

### `GET /inventory`
- **Təsvir:** Ərzaqlar, mövcud qalıq və minimum hədd xəbərdarlıqları.

### `POST /inventory/purchase`
- **Təsvir:** Qaimə ilə ərzaq alışı qeydiyyatı.

### `POST /inventory/adjust`
- **Təsvir:** İnventarizasiya düzəlişi.

### `GET /inventory/transactions`
- **Təsvir:** Bütün daxilolma və çıxış hərəkətlərinin audit jurnalı.

---

## 7. Hesabatlar (Reports)

### `GET /reports/analytics`
- **Query:** `?startDate=2026-10-01&endDate=2026-10-31`
- **Təsvir:** Gəlir, nağd/kart bölgüsü, ən çox/az satılan yeməklər, masalar və işçilər üzrə satışlar.

### `GET /reports/export-csv`
- **Təsvir:** Satış məlumatlarının CSV faylı kimi yüklənməsi.

---

## 8. Ofisiant Çağırışları

### `POST /waiter-calls`
- **Body:** `{ "tableToken": "sec_zal_tbl_01_a8f9", "callType": "ASSISTANCE" }`

### `PATCH /waiter-calls/:id/resolve`
- **Body:** `{ "status": "RESOLVED" }`
