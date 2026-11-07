# VillaCorz Team Setup

This repository contains the React frontend and a Laravel backend. Install
dependencies separately in each directory that has a package manifest.

## Requirements

- Node.js 20.19+ or 22.12+ with npm
- PHP 8.2+
- Composer

## Dependencies

Versions below are the ranges declared by the project manifests. Lockfiles
pin the installed versions where present.

### Repository root (`package.json`)

Runtime dependencies:

- `leaflet` (`^1.9.4`) — interactive maps
- `react-leaflet` (`^5.0.0`) — React components for Leaflet

Development dependencies:

- `@tailwindcss/vite` (`^4.3.3`)
- `@types/leaflet` (`^1.9.22`)
- `tailwindcss` (`^4.3.3`)

### Frontend (`VillaCorz/package.json`)

Runtime dependencies:

- `axios` (`^1.20.0`) — HTTP requests
- `gsap` (`^3.15.0`) — animation
- `lenis` (`^1.3.27`) — smooth scrolling
- `lucide-react` (`^1.55.0`) — icons
- `react` (`^19.2.8`)
- `react-dom` (`^19.2.8`)
- `react-router-dom` (`^7.18.4`) — client-side routing

Development dependencies:

- `@babel/core` (`^7.29.7`)
- `@eslint/js` (`^10.0.1`)
- `@rolldown/plugin-babel` (`^0.2.3`)
- `@tailwindcss/vite` (`^4.3.3`)
- `@types/babel__core` (`^7.20.5`)
- `@types/node` (`^24.13.3`)
- `@types/react` (`^19.2.18`)
- `@types/react-dom` (`^19.2.7`)
- `@vitejs/plugin-react` (`^6.1.1`)
- `babel-plugin-react-compiler` (`^1.0.0`)
- `eslint` (`^10.10.0`)
- `eslint-plugin-react-hooks` (`^7.1.1`)
- `eslint-plugin-react-refresh` (`^0.5.6`)
- `globals` (`^17.12.0`)
- `tailwindcss` (`^4.3.3`)
- `typescript` (`~6.0.2`)
- `typescript-eslint` (`^8.69.0`)
- `vite` (`^8.3.0`)

### Laravel asset tooling (`VillaCorz/backend/package.json`)

Development dependencies:

- `@tailwindcss/vite` (`^4.0.0`)
- `axios` (`^1.11.0`)
- `concurrently` (`^9.0.1`)
- `laravel-vite-plugin` (`^2.0.0`)
- `tailwindcss` (`^4.0.0`)
- `vite` (`^7.0.7`)

### Laravel backend (`VillaCorz/backend/composer.json`)

Production dependencies:

- `laravel/framework` (`^12.0`)
- `laravel/sanctum` (`^4.0`)
- `laravel/tinker` (`^2.10.1`)
- `symfony/brevo-mailer` (`^7.4`)
- `symfony/http-client` (`^7.4`)

Development dependencies:

- `fakerphp/faker` (`^1.23`)
- `laravel/pail` (`^1.2.2`)
- `laravel/pint` (`^1.24`)
- `laravel/sail` (`^1.41`)
- `mockery/mockery` (`^1.6`)
- `nunomaduro/collision` (`^8.6`)
- `phpunit/phpunit` (`^11.5.50`)

## Install

Run the all-in-one installer from the repository root:

```bash
bash ./install-dependencies.sh
```

On Windows, run this from Git Bash. The script uses the npm lockfiles in all
three JavaScript project directories and installs Composer dependencies from
the Laravel lockfile.

Stop any running Vite development servers before running the installer.
On Windows, `npm ci` replaces installed packages and can fail if a running
Vite process has a native package loaded.

## Configure and run locally

From `VillaCorz/backend`, create a local environment file from the example:

```sh
cp .env.example .env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

Then, still in `VillaCorz/backend`, generate the application key and prepare
the database:

```sh
php artisan key:generate
php artisan migrate
```

The example environment uses SQLite. For email verification and the contact
form, configure a valid Brevo API key and sender in your private `.env`, or
configure a local mail catcher. Set `CONTACT_MAIL_TO` to the inbox that should
receive contact-form messages. Do not commit or share `.env` files or API keys.

Manage Offers uploads service photos to Cloudinary. Set
`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in
`VillaCorz/backend/.env`. `CLOUDINARY_UPLOAD_FOLDER` defaults to
`villacorz/services`. Offers can still be created without images when these
values are not configured.

Start the backend from `VillaCorz/backend`:

```sh
php artisan serve
```

In another terminal, start the frontend from `VillaCorz`:

```sh
npm run dev
```

The frontend currently sends API and Sanctum CSRF requests to
`http://localhost:8000`.

## Useful frontend commands

Run from `VillaCorz`:

```sh
npm run lint
npm run build
```

## Team notes

- Install dependencies from each package directory; do not copy `node_modules`
  between machines.
- Keep each `package-lock.json` and `composer.lock` committed when updating
  dependencies.
- Keep personal environment files and credentials out of Git.
- New user registrations receive the `customer` role. Do not make public
  registration accept an admin role.
