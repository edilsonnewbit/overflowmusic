#!/bin/bash
set -euo pipefail

DOMAIN="music.overflowmvmt.com"
EMAIL="edilsonsilvapro@gmail.com"
STAGING=0

echo ">>> Criando diretórios necessários..."
mkdir -p ./certbot/conf ./certbot/www ./nginx/conf.d

echo ">>> Subindo nginx em modo HTTP para validação..."
docker compose up -d nginx
sleep 3

STAGING_ARG=""
if [ "$STAGING" = "1" ]; then
  STAGING_ARG="--staging"
fi

echo ">>> Emitindo certificado para $DOMAIN..."
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  $STAGING_ARG \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN"

echo ">>> Reiniciando nginx com SSL..."
docker compose restart nginx

echo "✅ SSL ativo em https://$DOMAIN"
