FROM php:8.1-apache AS builder

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libpq-dev \
        libssl-dev \
        zip \
        unzip \
        git \
    && docker-php-ext-install pdo pdo_mysql pdo_pgsql \
    && pecl install mongodb \
    && docker-php-ext-enable mongodb \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# 👇 CHANGE: Copy ONLY the contents of your app folder into the workdir
COPY secure-wep-apex/ .

# Optional Composer install if composer.json exists
RUN if [ -f composer.json ]; then \
        curl -sS https://getcomposer.org/installer | php && php composer.phar install --no-dev --optimize-autoloader; \
    fi

RUN chown -R www-data:www-data /usr/src/app \
    && find /usr/src/app -type d -exec chmod 755 {} \; \
    && find /usr/src/app -type f -exec chmod 644 {} \;

# Stage 2: runtime stage uses the prepared builder image and copies final app files
FROM builder AS runner
WORKDIR /var/www/html
COPY --from=builder /usr/src/app /var/www/html

ENV PORT=80
EXPOSE 80
CMD ["apache2-foreground"]
