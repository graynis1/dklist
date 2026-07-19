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
