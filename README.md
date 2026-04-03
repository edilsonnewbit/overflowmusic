# Overflow Music App

Base inicial do projeto com foco em:
- estrutura monorepo
- deploy Docker na Hostinger
- pipeline CI/CD com GHCR + Hostinger VPS
- autenticação base com aprovação administrativa

## Estrutura
- `apps/api`: API HTTP inicial (placeholder funcional)
- `apps/web`: Web app inicial (placeholder funcional)
- `apps/mobile`: App mobile base (Expo + React Native)
- `apps/worker`: Worker inicial (placeholder funcional)
- `docker-compose.yml`: stack de produção
- `nginx/conf.d/app.conf`: proxy reverso e TLS
- `.github/workflows/deploy-hostinger.yml`: pipeline de deploy

## Endpoints atuais da API
- `GET /health`
- `GET /api/health`
- `GET /api/admin/auth/check` (Bearer `ADMIN_API_KEY`)
- `POST /api/auth/google` (payload base: `email`, `name`, `googleSub`)
- `GET /api/auth/me` (Bearer access token)
- `GET /api/admin/users/pending` (Bearer `ADMIN_API_KEY`)
- `POST /api/admin/users/:userId/approve` (Bearer `ADMIN_API_KEY`)
- `POST /api/admin/users/:userId/reject` (Bearer `ADMIN_API_KEY`)
- `GET /api/events`
- `GET /api/events/:id`
- `POST /api/events` (Bearer `ADMIN_API_KEY`)
- `PATCH /api/events/:id` (Bearer `ADMIN_API_KEY`)
- `DELETE /api/events/:id` (Bearer `ADMIN_API_KEY`)
- `GET /api/events/:eventId/setlist`
- `PUT /api/events/:eventId/setlist` (Bearer `ADMIN_API_KEY`)
- `POST /api/events/:eventId/setlist/items` (Bearer `ADMIN_API_KEY`)
- `PATCH /api/events/:eventId/setlist/items/:itemId` (Bearer `ADMIN_API_KEY`)
- `DELETE /api/events/:eventId/setlist/items/:itemId` (Bearer `ADMIN_API_KEY`)
- `POST /api/events/:eventId/setlist/reorder` (Bearer `ADMIN_API_KEY`)
- `GET /api/songs`
- `GET /api/songs/:id`
- `GET /api/songs/:id/charts`
- `POST /api/songs` (Bearer `ADMIN_API_KEY` ou token de usuário `LEADER|ADMIN|SUPER_ADMIN`)
- `PATCH /api/songs/:id` (Bearer `ADMIN_API_KEY` ou token de usuário `LEADER|ADMIN|SUPER_ADMIN`)
- `DELETE /api/songs/:id` (Bearer `ADMIN_API_KEY` ou token de usuário `LEADER|ADMIN|SUPER_ADMIN`)
- `POST /api/songs/import/txt` (Bearer `ADMIN_API_KEY` ou token de usuário `LEADER|ADMIN|SUPER_ADMIN`)
- `POST /api/songs/import/txt/file` (multipart, campo `file`, Bearer `ADMIN_API_KEY` ou token de usuário `LEADER|ADMIN|SUPER_ADMIN`)
- `POST /api/songs/import/txt/preview` (Bearer `ADMIN_API_KEY` ou token de usuário `LEADER|ADMIN|SUPER_ADMIN`)
- `POST /api/songs/import/txt/file/preview` (multipart, campo `file`, Bearer `ADMIN_API_KEY` ou token de usuário `LEADER|ADMIN|SUPER_ADMIN`)
- `GET /api/checklists/templates`
- `POST /api/checklists/templates` (Bearer `ADMIN_API_KEY` ou token de usuário `LEADER|ADMIN|SUPER_ADMIN`)
- `PATCH /api/checklists/templates/:id` (Bearer `ADMIN_API_KEY` ou token de usuário `LEADER|ADMIN|SUPER_ADMIN`)
- `DELETE /api/checklists/templates/:id` (Bearer `ADMIN_API_KEY` ou token de usuário `LEADER|ADMIN|SUPER_ADMIN`)
- `GET /api/events/:eventId/checklist`
- `PUT /api/events/:eventId/checklist` (Bearer `ADMIN_API_KEY` ou token de usuário `LEADER|ADMIN|SUPER_ADMIN`)
- `PATCH /api/events/:eventId/checklist/items/:itemId` (Bearer `ADMIN_API_KEY` ou token de usuário `LEADER|ADMIN|SUPER_ADMIN`)

O parser de `.txt` já extrai metadados quando presentes (`Tom/Key`, `BPM`, `Capo`) e retorna no `parsed`.
No import de nova música sem `songId`, `defaultKey` é preenchido automaticamente com `Tom/Key` detectado.

## Status da autenticação Google
`POST /api/auth/google` já valida `idToken` Google no backend (`google-auth-library`).
Para suportar Web + iOS + Android, a API aceita:
- `GOOGLE_CLIENT_ID` (valor único, compatibilidade)
- `GOOGLE_CLIENT_IDS` (lista separada por vírgula; recomendado em produção)
Fallback bootstrap pode ser habilitado apenas para desenvolvimento com `AUTH_BOOTSTRAP_MODE=true` (recebendo `email`, `name`, `googleSub`).
`GOOGLE_ALLOWED_DOMAIN` pode ser definido para restringir login por domínio de e-mail.

## Persistência (API)
- Prisma ORM configurado em `apps/api/prisma/schema.prisma`.
- Modelo inicial criado: `User` (com status e role para aprovação).
- Scripts úteis (em `apps/api`):
  - `npm run prisma:generate`
  - `npm run prisma:push`
  - `npm test`

## Observação
- `apps/api` e `apps/web` já estão migrados para NestJS e Next.js.
- O `apps/worker` permanece em modo bootstrap até entrar a fila real (Redis/BullMQ) na próxima fase.

## Deploy Hardening (Hostinger)
- Validação local/CI de variáveis obrigatórias antes do deploy:
  - `npm run check:deploy-env`
- Script usado pelo CI:
  - `scripts/check-hostinger-env.sh`
- Checklist operacional completo:
  - `docs/DEPLOY_CHECKLIST.md`
- Regra Google:
  - exigir `GOOGLE_CLIENT_IDS` (recomendado) ou `GOOGLE_CLIENT_ID` (compatibilidade).
- Validações de formato incluídas:
  - booleans (`AUTH_BOOTSTRAP_MODE`, `WEB_LOGIN_FALLBACK_ENABLED`)
  - porta SMTP (`1-65535`)
  - domínio permitido Google (`GOOGLE_ALLOWED_DOMAIN`)

## Mobile (Expo)
- App inicial em `apps/mobile` com:
  - login Google nativo (AuthSession) + fallback bootstrap controlado por ambiente
  - leitura e atualização de checklist por evento (itens)
  - preview e import persistente de cifra `.txt` com token de usuário autorizado (`LEADER|ADMIN|SUPER_ADMIN`)
  - seleção de arquivo `.txt` no dispositivo para preencher/importar cifra
- Variáveis úteis para o app mobile:
  - `EXPO_PUBLIC_API_URL` (ex.: `https://music.overflowmvmt.com/api`)
  - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
  - `EXPO_PUBLIC_GOOGLE_CLIENT_ID` (fallback único)
  - `EXPO_PUBLIC_ADMIN_API_KEY` (opcional, fallback legado para preview em ambientes de bootstrap)
- Script raiz:
  - `npm run start:mobile`

## Web (BFF interno)
- O `apps/web` possui rotas internas em `app/api/...` para consumir a API com segredo no servidor (sem expor no browser).
- Para isso, o container web precisa de:
  - `NEXT_PUBLIC_API_URL` (ex.: `https://music.overflowmvmt.com/api`)
  - `ADMIN_API_KEY` (mesmo segredo usado na API para endpoints administrativos)
  - `GOOGLE_CLIENT_ID` (usado pela rota `/api/auth/google/config` para inicializar Google Identity Services no frontend)
  - `AUTH_BOOTSTRAP_MODE` (lido para fallback de login em ambiente não-produção)
  - `WEB_LOGIN_FALLBACK_ENABLED` (opcional, força exibição do fallback manual no `/login`; padrão seguro `false` em produção)
