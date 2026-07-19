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

RUN composer install --no-dev --optimize-autoloader --no-interaction \
    && mkdir -p var/cache var/log uploads \
    && chmod -R 777 var uploads

# Free tier has no shell/pre-deploy-command access, so migrations run on every boot.
# --allow-no-migration keeps this a no-op once the schema is already up to date.
ENTRYPOINT []
CMD ["sh", "-c", "php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration; frankenphp run"]
