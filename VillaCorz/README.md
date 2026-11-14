# VillaCorz

Beach-house booking, payment, and admin demo (Laravel API + React/Vite frontend).

## Stack
- Backend: Laravel 11 (PHP 8.3), MySQL, Sanctum
- Frontend: React 19, TypeScript, Vite, Tailwind CSS v4

## Local setup

### Backend
```bash
cd VillaCorz/backend
composer install
cp .env.example .env
php artisan key:generate
# configure DB_* in .env (default: villacorz_db on 127.0.0.1)
php artisan migrate
php artisan storage:link
php artisan db:seed
```

### Frontend
```bash
cd VillaCorz
npm install
npm run dev   # http://localhost:5173
```

## Demo run
Start both servers for phone demos:
```bash
cd VillaCorz/backend
php artisan demo:serve   # rewrites PAYMENT_PUBLIC_URL to the LAN IP
cd VillaCorz
npm run dev -- --host
```
React runs at `http://localhost:5173`, Laravel at the LAN IP on port 8000.
Set `FRONTEND_URL` in `.env` to the LAN IP when testing the phone "Return to VillaCorz" link.

## Tests
```bash
cd VillaCorz/backend && php artisan test
cd VillaCorz && npm run test          # vitest
cd VillaCorz && npm run build         # tsc + vite
cd VillaCorz && npm run lint
```

## Security notes
- `storage:link` is required for cancellation proof uploads.
- HSTS is only sent over HTTPS; the demo runs over HTTP on the LAN.
- Admin routes are gated by the `admin` middleware.
