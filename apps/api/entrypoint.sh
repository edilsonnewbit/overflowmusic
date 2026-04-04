#!/bin/sh
set -e

echo "[entrypoint] Executando prisma db push..."
node node_modules/.bin/prisma db push --skip-generate

echo "[entrypoint] Iniciando API..."
exec node dist/main.js
