# Build: frontend

FROM node:24-alpine AS ui

WORKDIR /build/ui

COPY ui/package.json ui/package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY ui/ .
RUN npm run build

FROM php:8.5-apache AS build

WORKDIR /build

RUN apt-get update \
    && apt-get install -y --no-install-recommends unzip git \
    && rm -rf /var/lib/apt/lists/*

COPY php php/
COPY composer.json composer.lock ./

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
RUN composer install --prefer-dist --no-dev --no-autoloader --no-scripts --no-progress \
    && composer dump-autoload --classmap-authoritative --no-dev \
    && composer clear-cache

# Runtime

FROM php:8.5-apache

WORKDIR /var/www/html

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev \
    && docker-php-ext-install pgsql \
    && rm -rf /var/lib/apt/lists/* \
    && a2enmod rewrite

RUN echo "ServerName picodata-admin" > /etc/apache2/conf-enabled/server-name.conf
RUN sed -i 's~DocumentRoot.*$~DocumentRoot /var/www/html/public~' /etc/apache2/sites-available/000-default.conf

ARG CI_COMMIT_TAG=unknown
ARG CI_COMMIT_REF_NAME=unknown
ARG CI_COMMIT_SHA=unknown
ARG CI_COMMIT_SHORT_SHA=unknown
RUN mkdir -p var \
    && echo "<?php return ['tag' => '$CI_COMMIT_TAG', 'sha' => '$CI_COMMIT_SHA', 'short_sha' => '$CI_COMMIT_SHORT_SHA','ref_name'=>'$CI_COMMIT_REF_NAME'];" > var/version.php \
    && chown -R www-data var

COPY php php/
COPY public public/
COPY composer.json composer.lock ./
COPY --from=build /build/vendor vendor/

COPY --from=ui /build/public/assets public/assets/
COPY --from=ui /build/public/index.html public/index.html
