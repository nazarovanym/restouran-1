# Quraşdırma və İstehsalata Buraxılış (Deployment) Təlimatı

## 1. Mühit Tələbləri

- **Node.js:** v18.0 və ya daha yüksək (v20+ LTS tövsiyə olunur).
- **Verilənlər Bazası:**
  - *İlkin/Yerli quraşdırma:* SQLite (fayl əsaslı, əlavə server quraşdırması tələb etmir, birbaşa işləyir).
  - *Böyük restoran şəbəkəsi üçün:* PostgreSQL (Prisma vasitəsilə 1 dəqiqəyə keçid mümkündür).
- **Şəbəkə:** Restoran daxili Wi-Fi şəbəkəsi (kassa, mətbəx və ofisiant planşetlərinin serverə qoşulması üçün).

---

## 2. Server və Backend Quraşdırılması

```bash
# 1. Backend qovluğuna keçid
cd backend

# 2. Asılılıqların quraşdırılması
npm install

# 3. Mühit dəyişənlərinin tənzimlənməsi (.env)
# .env.example faylını .env kimi kopyalayın
cp .env.example .env

# 4. Verilənlər bazasının strukturunun sinxronlaşdırılması
npx prisma db push

# 5. İlkin menyu, masalar və istifadəçilərin doldurulması
npx ts-node prisma/seed.ts

# 6. TypeScript kodunun istehsala kompayl olunması
npm run build

# 7. Backend serverin PM2 və ya Node ilə başladılması
node dist/server.js
```

---

## 3. Web İnterfeysinin Quraşdırılması (Frontend)

```bash
cd frontend

# Asılılıqları quraşdırın
npm install

# İstehsal üçün optimize edilmiş bundle yaradın
npm run build

# dist/ qovluğundakı statik faylları Nginx və ya birbaşa Node server ilə xidmətə verin
```

### Nginx Nümunə Konfiqurasiyası:
```nginx
server {
    listen 80;
    server_name restoran.local;

    # Frontend statik fayllar
    location / {
        root /var/www/restaurant-rms/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend REST API
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket Real-Time
    location /socket.io/ {
        proxy_pass http://localhost:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

---

## 4. SQLite-dən PostgreSQL-ə Keçid

Əgər bir neçə kassa və filial üçün PostgreSQL istifadə etmək istəyirsinizsə:

1. `backend/prisma/schema.prisma` faylında `datasource db` blokunu dəyişin:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. `backend/.env` faylında PostgreSQL URL-ni təyin edin:
   ```env
   DATABASE_URL="postgresql://postgres:parol@localhost:5432/restoran_rms?schema=public"
   ```
3. Miqrasiyanı başladın:
   ```bash
   npx prisma db push
   npx ts-node prisma/seed.ts
   ```

---

## 5. Windows Desktop Proqramının İstehsal Paketi (Installer)

Electron tətbiqini Windows üçün `.exe` quraşdırıcısı halına gətirmək üçün:
```bash
cd desktop
npm install
npm install electron-builder --save-dev
npx electron-builder --win
```
Bu əməliyyatdan sonra `desktop/dist/` qovluğunda Windows üçün quraşdırma faylı (`.exe`) yaranacaq.

---

## 6. Ehtiyat Nüsxələmə (Backup) və Təhlükəsizlik

- **Verilənlər Bazası:** `backend/prisma/dev.db` faylı hər gecə avtomatik arxiv qovluğuna kopyalana bilər.
- **İnternet kəsildikdə:** Sistem restoranın lokal Wi-Fi şəbəkəsində işləyir. Xarici internet kəsilsə belə, lokal kassa, mətbəx və masalar daxili IP vasitəsilə kəsintisiz işləməyə davam edir.
