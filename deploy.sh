#!/bin/bash
set -euo pipefail

echo "[deploy] Iniciando deploy..."

docker compose down
docker compose pull
docker compose up -d

echo "[deploy] Aguardando serviços..."
sleep 15

docker compose ps

echo "[deploy] Concluído. URL: https://music.overflowmvmt.com"
