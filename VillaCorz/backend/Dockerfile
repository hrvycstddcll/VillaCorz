FROM php:8.3-fpm-alpine

RUN apk add --no-cache \
        nginx \
        supervisor \
        git \
        unzip \
        build-base \
        autoconf \
        libpq-dev \
        libzip-dev \
        icu-dev \
    && docker-php-ext-install pdo_pgsql pdo_mysql zip intl bcmath opcache

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY composer.json composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader --no-scripts

COPY . .
RUN composer dump-autoload --optimize --no-dev \
    && mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

COPY docker/nginx.conf /etc/nginx/http.d/default.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 10000

CMD ["sh", "-c", "php artisan migrate --force --database=pgsql_migrations && exec supervisord -c /etc/supervisor/conf.d/supervisord.conf"]
