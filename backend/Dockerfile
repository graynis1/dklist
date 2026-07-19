FROM dunglas/frankenphp:1-php8.2

RUN install-php-extensions \
    pdo_mysql \
    intl \
    zip \
    opcache \
    apcu

WORKDIR /app

ENV APP_ENV=prod

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY . /app

RUN composer install --no-dev --optimize-autoloader --no-interaction --no-scripts \
    && mkdir -p var/cache var/log uploads \
    && chmod -R 777 var uploads

# cache:clear/migrations need the real DATABASE_URL, which only exists at runtime (not during
# this Docker build), and the free tier has no shell/pre-deploy-command access - so both run on
# every boot instead. --allow-no-migration keeps the migrate step a no-op once schema is current.
ENTRYPOINT []
CMD ["sh", "-c", "php bin/console cache:clear --env=prod --no-debug; php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration; frankenphp run"]
