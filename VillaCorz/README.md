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

### Forecasting service
The admin dashboard requires the Python SARIMAX forecasting service. Start it
in a separate PowerShell terminal before opening the dashboard:
```powershell
cd VillaCorz\forecasting-service
.\start.ps1
```
Keep it running on `127.0.0.1:8001` while using Laravel locally.

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

## Production deployment (MySQL)

1. Configure `VillaCorz/backend/.env` with MySQL credentials:
   ```env
   APP_ENV=production
   APP_DEBUG=false
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=villacorz
   DB_USERNAME=villacorz
   DB_PASSWORD=change-me
   ```
2. Install and build:
   ```bash
   cd VillaCorz/backend && composer install --no-dev --optimize-autoloader
   cd VillaCorz && npm ci && npm run build
   ```
3. Run migrations and seed presentation data:
   ```bash
   cd VillaCorz/backend
   php artisan migrate --force
   php artisan db:seed --force
   ```
4. Serve `VillaCorz/backend/public` as the web root and point the frontend build at the production API origin.
5. Keep `QUEUE_CONNECTION=database` or `redis` in production and run a queue worker for emails and scheduled reports.
6. Deploy `VillaCorz/forecasting-service` with its `requirements.txt`, run it
   under a process manager, and set `FORECAST_SERVICE_URL` in the backend
   environment to its private address. The admin dashboard requires this
   SARIMAX service to be reachable.
