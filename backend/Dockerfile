FROM php:8.2-apache

RUN apt-get update && apt-get install -y --no-install-recommends \
        git unzip libicu-dev libzip-dev curl \
    && docker-php-ext-install intl pdo_mysql zip opcache \
    && a2enmod rewrite \
    && rm -rf /var/lib/apt/lists/* \
    && mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
    && sed -ri -e 's/^variables_order = .*/variables_order = "EGPCS"/' "$PHP_INI_DIR/php.ini" \
    && sed -ri -e 's/^memory_limit = .*/memory_limit = 512M/' "$PHP_INI_DIR/php.ini" \
    && curl -L -o /usr/local/bin/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
    && chmod +x /usr/local/bin/cloudflared

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

ENV APP_ENV=prod
ENV PORT=10000

WORKDIR /app

COPY . /app

RUN composer install --no-dev --optimize-autoloader --no-interaction --no-scripts \
    && mkdir -p var/cache var/log uploads \
    && chmod -R 777 var uploads

RUN sed -ri -e 's!DocumentRoot /var/www/html!DocumentRoot /app/public!g' /etc/apache2/sites-available/*.conf \
    && printf '<Directory /app/public>\n    AllowOverride All\n    Require all granted\n</Directory>\n' >> /etc/apache2/apache2.conf \
    && sed -ri -e 's!Listen 80!Listen ${PORT}!g' /etc/apache2/ports.conf \
    && sed -ri -e 's!:80>!:${PORT}>!g' /etc/apache2/sites-available/*.conf

# cache:clear/schema sync need the real DATABASE_URL, which only exists at runtime (not during
# this Docker build), and the free tier has no shell/pre-deploy-command access - so both run on
# every boot instead. The existing migration history is incomplete (it's missing the table the
# very first migration depends on), so schema:update --force syncs straight from the entity
# mappings instead of replaying migrations; it's idempotent, safe to run on every boot.
# NOTE: intentionally NOT --complete - that flag drops any table/column not in the entity
# mappings, which would wipe out the bulk-import staging tables on every container restart.
# DATABASE_URL points at 127.0.0.1:3307 in this container. cloudflared-access proxies that
# local port through the Cloudflare Tunnel to the real MySQL server (which sits behind CGNAT
# with no reachable public IP) - this replaces the ngrok tunnel, which started refusing
# connections specifically from Render's cloud IP range after sustained use.
CMD ["sh", "-c", "cloudflared access tcp --hostname mysql.esenlikic.xyz --url 127.0.0.1:3307 & sleep 5; php bin/console cache:clear --env=prod --no-debug; php bin/console doctrine:schema:update --force --no-interaction; apache2-foreground"]
