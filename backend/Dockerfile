FROM php:8.2-apache

RUN apt-get update && apt-get install -y --no-install-recommends \
        git unzip libicu-dev libzip-dev \
    && docker-php-ext-install intl pdo_mysql zip opcache \
    && a2enmod rewrite \
    && rm -rf /var/lib/apt/lists/* \
    && mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
    && sed -ri -e 's/^variables_order = .*/variables_order = "EGPCS"/' "$PHP_INI_DIR/php.ini" \
    && sed -ri -e 's/^memory_limit = .*/memory_limit = 1536M/' "$PHP_INI_DIR/php.ini"

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

ENV APP_ENV=prod
ENV PORT=10000

WORKDIR /app

COPY . /app

RUN composer install --no-dev --optimize-autoloader --no-interaction --no-scripts \
    && mkdir -p var/cache var/log var/app_cache uploads \
    && chmod -R 777 var uploads

RUN sed -ri -e 's!DocumentRoot /var/www/html!DocumentRoot /app/public!g' /etc/apache2/sites-available/*.conf \
    && printf '<Directory /app/public>\n    AllowOverride All\n    Require all granted\n</Directory>\n' >> /etc/apache2/apache2.conf \
    && sed -ri -e 's!Listen 80!Listen ${PORT}!g' /etc/apache2/ports.conf \
    && sed -ri -e 's!:80>!:${PORT}>!g' /etc/apache2/sites-available/*.conf

# REMOVED 2026-08-24: `doctrine:schema:update --force` on every boot was a live
# production incident, not a theoretical risk - v2 (a separate app sharing this
# same database) added real columns to tables Doctrine also maps here (user,
# read, chat, marketplace_settings, notice, advertisement) via hand-written
# ALTER TABLE migrations. `--force` alone (even without `--complete`) still
# drops any column present in the DB but absent from Doctrine's own entity
# mappings - the very next container restart after v2's migrations landed
# silently wiped every one of those columns back out, with no error for most
# tables (it only surfaced when it hit `book` and failed loudly trying to drop
# `idx_book_work`, an FK-protected index it didn't recognize either). This is
# exactly the failure class this whole rewrite project was started to get away
# from - see PLAN.md's opening paragraph. If v1's own PHP code ever needs a
# genuinely new column again, add it with an explicit, reviewed `ALTER TABLE`
# run once by hand - never let a boot script auto-sync a shared production
# schema again.
CMD ["sh", "-c", "php bin/console cache:clear --env=prod --no-debug; apache2-foreground"]
