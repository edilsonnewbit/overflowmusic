#!/bin/bash
set -euo pipefail

REQUIRED_VARS=(
  "HOSTINGER_API_KEY"
  "HOSTINGER_VM_ID"
  "POSTGRES_PASSWORD"
  "REDIS_PASSWORD"
  "ADMIN_API_KEY"
  "JWT_SECRET"
  "FRONTEND_URL"
  "NEXT_PUBLIC_API_URL"
  "AUTH_BOOTSTRAP_MODE"
  "WEB_LOGIN_FALLBACK_ENABLED"
)

OPTIONAL_WARN_VARS=(
  "GOOGLE_CLIENT_ID"
  "GOOGLE_CLIENT_IDS"
  "GOOGLE_CLIENT_SECRET"
  "GOOGLE_ALLOWED_DOMAIN"
)

missing_required=()

for var_name in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var_name:-}" ]; then
    missing_required+=("$var_name")
  fi
done

if [ -z "${GOOGLE_CLIENT_ID:-}" ] && [ -z "${GOOGLE_CLIENT_IDS:-}" ]; then
  missing_required+=("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_IDS")
fi

if [ "${#missing_required[@]}" -gt 0 ]; then
  echo "[deploy-check] Variaveis obrigatorias ausentes:"
  for item in "${missing_required[@]}"; do
    echo " - $item"
  done
  exit 1
fi

echo "[deploy-check] Variaveis obrigatorias: OK"

for var_name in "${OPTIONAL_WARN_VARS[@]}"; do
  if [ -z "${!var_name:-}" ]; then
    echo "[deploy-check][warn] Variavel vazia: $var_name"
  fi
done

if [ "${AUTH_BOOTSTRAP_MODE}" != "true" ] && [ "${AUTH_BOOTSTRAP_MODE}" != "false" ]; then
  echo "[deploy-check] AUTH_BOOTSTRAP_MODE deve ser 'true' ou 'false'."
  exit 1
fi

if [ "${WEB_LOGIN_FALLBACK_ENABLED}" != "true" ] && [ "${WEB_LOGIN_FALLBACK_ENABLED}" != "false" ]; then
  echo "[deploy-check] WEB_LOGIN_FALLBACK_ENABLED deve ser 'true' ou 'false'."
  exit 1
fi

if [ -n "${GOOGLE_ALLOWED_DOMAIN:-}" ] && ! [[ "${GOOGLE_ALLOWED_DOMAIN}" =~ ^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
  echo "[deploy-check] GOOGLE_ALLOWED_DOMAIN invalido (ex.: overflowmvmt.com)."
  exit 1
fi

echo "[deploy-check] Checklist de ambiente concluido."
