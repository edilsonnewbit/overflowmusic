# DEPLOY_CHECKLIST.md

Checklist operacional para deploy em `https://music.overflowmvmt.com` (Hostinger VPS).

## 1. Pré-requisitos
- VPS criada na Hostinger e `HOSTINGER_VM_ID` configurado em GitHub `Variables`.
- `HOSTINGER_API_KEY` configurada em GitHub `Secrets`.
- DNS `music.overflowmvmt.com` apontando para IP da VPS.
- Registro GHCR disponível para pull das imagens.

## 2. Secrets/Vars obrigatórios (GitHub)
- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD`
- `ADMIN_API_KEY`
- `JWT_SECRET`
- `GOOGLE_CLIENT_IDS` — incluir **Web, Android e iOS** separados por vírgula: `web-id,android-id,ios-id`
  - O backend aceita tokens de qualquer Client ID listado aqui
  - Android: OAuth client type "Android" (package `com.overflowmusic.app`, SHA-1 do keystore)
  - iOS: OAuth client type "iOS" (bundle ID `com.overflowmusic.app`)
  - Web: OAuth client type "Web" (authorized redirect URIs inclui domínio)
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_ALLOWED_DOMAIN`
- `AUTH_BOOTSTRAP_MODE` — DEVE ser `false` em produção
- `WEB_LOGIN_FALLBACK_ENABLED` — `false` em produção
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

## 3. Validação local/CI
- Rodar:
```bash
npm run check:deploy-env
```
- O workflow executa essa validação antes do deploy (`scripts/check-hostinger-env.sh`).

## 4. SSL/TLS inicial
- Executar uma vez na VPS:
```bash
bash ./init-letsencrypt.sh
```
- Confirmar certificado ativo:
  - `https://music.overflowmvmt.com`

## 5. Deploy
- Deploy automático por push na branch `main`:
  - workflow: `.github/workflows/deploy-hostinger.yml`
- Deploy manual opcional:
```bash
bash ./deploy.sh
```

## 6. Pós-deploy
- Verificar serviços:
```bash
docker compose ps
```
- Verificar API:
```bash
curl -H "Authorization: Bearer <ADMIN_API_KEY>" https://music.overflowmvmt.com/api/admin/auth/check
```
- Esperado:
  - `"ok": true`
  - `"version"` igual ao commit do rollout

## 7. Rollback (rápido)
- Reexecutar workflow com `IMAGE_TAG` de release anterior (via GHCR tag).
- Confirmar `version` no endpoint de check.

## 8. Segurança operacional
- Manter `WEB_LOGIN_FALLBACK_ENABLED=false` em produção.
- Manter `AUTH_BOOTSTRAP_MODE=false` em produção.
- Rotacionar `ADMIN_API_KEY`, `JWT_SECRET` e senhas periodicamente.
