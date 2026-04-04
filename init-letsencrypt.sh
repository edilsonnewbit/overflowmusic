#!/bin/bash
set -euo pipefail

DOMAIN="music.overflowmvmt.com"
EMAIL="edilsonsilvapro@gmail.com"
STAGING=0

echo ">>> Criando diretórios necessários..."
mkdir -p ./certbot/conf/live/$DOMAIN ./certbot/www ./nginx/conf.d

echo ">>> Criando certificado dummy para o nginx conseguir iniciar..."
openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
  -keyout ./certbot/conf/live/$DOMAIN/privkey.pem \
  -out ./certbot/conf/live/$DOMAIN/fullchain.pem \
  -subj "/CN=$DOMAIN" 2>/dev/null
cp ./certbot/conf/live/$DOMAIN/fullchain.pem ./certbot/conf/live/$DOMAIN/chain.pem

echo ">>> Subindo nginx com cert dummy para validação HTTP..."
docker compose up -d nginx
sleep 5

STAGING_ARG=""
if [ "$STAGING" = "1" ]; then
  STAGING_ARG="--staging"
fi

echo ">>> Removendo cert dummy antes de emitir o real..."
rm -rf ./certbot/conf/live/$DOMAIN

echo ">>> Emitindo certificado real para $DOMAIN..."
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  $STAGING_ARG \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN"

echo ">>> Reiniciando nginx com SSL real..."
docker compose exec nginx nginx -s reload || docker compose restart nginx

echo "✅ SSL ativo em https://$DOMAIN"
