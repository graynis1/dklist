FROM php:8.2-apache

RUN apt-get update && apt-get install -y --no-install-recommends \
        git unzip libicu-dev libzip-dev \
    && docker-php-ext-install intl pdo_mysql zip opcache \
    && a2enmod rewrite \
    && rm -rf /var/lib/apt/lists/* \
    && mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
    && sed -ri -e 's/^variables_order = .*/variables_order = "EGPCS"/' "$PHP_INI_DIR/php.ini"

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
CMD ["sh", "-c", "php bin/console cache:clear --env=prod --no-debug; php bin/console doctrine:schema:update --force --no-interaction; apache2-foreground"]
