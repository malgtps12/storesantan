# Backend KelapaTuaBangCut

## Jalankan
```powershell
cd backend
npm install
copy .env.example .env
# edit JWT_SECRET jadi random panjang
npm run init-db
npm run dev
```

## API
- `POST /api/auth/login` { password }
- `POST /api/orders` FormData { items, total, proof }
- `GET /api/orders` (Bearer token)
- `PATCH /api/orders/:id/status` { status: approved|rejected }
- `GET /api/stats/summary?period=hari_ini|7_hari|30_hari|1_tahun` (Bearer)
- `GET /uploads/<file>` static proof

## Keamanan
- Bcrypt 12, JWT 30m, Rate-limit, Helmet, CSP, multer 2MB, enum validasi, session expiry.
