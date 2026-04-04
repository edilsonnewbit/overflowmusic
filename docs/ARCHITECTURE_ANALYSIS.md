# Análise Completa de Arquitetura — OverflowMusic

> Data: 2026-04-04  
> Agente: GitHub Copilot / Claude Opus 4.6  
> Escopo: Mobile + Web + API — integração, gaps, roadmap

---

## 1. Visão Geral da Arquitetura Atual

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Mobile App  │     │     Web App      │     │  API Backend │
│  (Expo/RN)   │────▶│  (Next.js 16)    │────▶│  (NestJS 10) │
│  Port: N/A   │     │  Port: 3000      │     │  Port: 3001  │
│              │     │  BFF Proxy Layer  │     │              │
└──────┬───────┘     └──────┬───────────┘     └──────┬───────┘
       │                    │                        │
       │   HTTP direto      │   HTTP via BFF         │
       └────────────────────┴────────────────────────┘
                                                     │
                                              ┌──────▼───────┐
                                              │  PostgreSQL  │
                                              │  (Prisma)    │
                                              └──────────────┘
```

### Stack
| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Mobile | Expo SDK 55, React Native 0.82, React 19.1 | apps/mobile/ |
| Web | Next.js 16.2.2, React 19.0 | apps/web/ |
| API | NestJS 10.4.8, Prisma 5.22 | apps/api/ |
| BD | PostgreSQL (via Prisma) | docker-compose.yml |
| Worker | Node.js placeholder | apps/worker/ |
| Infra | Docker Compose, Nginx, Certbot | deploy.sh |

---

## 2. Problemas de Integração Identificados

### 2.1 — AUTH: Dois fluxos OAuth incompatíveis

| Aspecto | Mobile | Web |
|---------|--------|-----|
| Lib OAuth | `expo-auth-session` | Google Identity Services (GIS) |
| Fluxo | Redirect (scheme `overflowmusic://`) | Popup |
| Token obtido | `id_token` via response type | `credential` via GIS callback |
| PKCE | Desabilitado (`usePKCE: false`) | N/A |
| Envio ao backend | POST `/api/auth/google` `{idToken}` | POST `/api/auth/google` `{idToken}` |

**Problema:** O mobile envia o `id_token` extraído do fragment da URL, que é diferente de um `credential` do GIS. O backend precisa validar ambos com `google-auth-library` — funciona, mas o Client ID usado deve ser o mesmo (tipo Web) ou ambos devem estar em `GOOGLE_CLIENT_IDS`.

**Status:** ⚠️ Funcional mas frágil. Se o Google Client ID do mobile for tipo Android (não Web), a validação do backend pode falhar porque `verifyIdToken` exige que o audience (aud) corresponda a um dos `GOOGLE_CLIENT_IDS` configurados.

### 2.2 — AUTH: Token inconsistente (JWT vs ADMIN_API_KEY)

**Mobile** envia `Bearer <JWT>` do usuário logado para chamadas autenticadas, com fallback para `ADMIN_API_KEY`.

**Web (BFF)** usa quase sempre `authMode: "admin"` → `Bearer <ADMIN_API_KEY>` para server-side calls, ignorando o JWT do usuário para a maioria das operações.

**Backend** tem dois modos de auth:
- `ADMIN_API_KEY`: Header direto, valida string — para endpoints de escrita (Events, Setlist, Organizations)
- JWT verificado por `assertCanManageContent()` — para Songs e Checklists

**Impacto:**
- Mobile LEADER com JWT pode criar songs ✅ mas NÃO pode criar events ❌ (requer ADMIN_API_KEY)
- Web bypassa isso porque o BFF usa ADMIN_API_KEY — qualquer admin logado no web pode tudo
- **Inconsistência de permissão**: mesma ação (criar evento) funciona no web mas não no mobile para roles ADMIN/LEADER

### 2.3 — AUTH: Cookies vs AsyncStorage

| Aspecto | Mobile | Web |
|---------|--------|-----|
| Armazenamento | AsyncStorage (`overflow_mobile_access_token`) | Cookie httpOnly (`overflow_access_token`) |
| TTL | Sem expiração (manual logout) | 12 horas (cookie TTL) |
| Refresh | Nenhum | Nenhum |
| Revogação | Nenhuma (token válido até expirar) | Nenhuma |

**Problema:** O token JWT expira em 12h mas o mobile nunca faz refresh — após 12h o usuário é deslogado silenciosamente na próxima chamada `fetchMe()`.

### 2.4 — API: Endpoints sem auth consistente

| Endpoint | Auth no Backend | Mobile usa | Web usa |
|----------|----------------|------------|---------|
| `GET /api/events` | Nenhuma | Nenhuma | admin key (BFF) |
| `POST /api/events` | ADMIN_API_KEY | Bearer JWT + fallback ADMIN_KEY | admin key (BFF) |
| `POST /api/songs/import/txt` | JWT (ADMIN/LEADER) | Bearer JWT + fallback ADMIN_KEY | admin key (BFF) |
| `PATCH /api/events/:id/checklist/items/:itemId` | JWT (ADMIN/LEADER) | Bearer JWT + fallback ADMIN_KEY | admin key (BFF) |

**Problema:** O mobile usa `ADMIN_API_KEY` como fallback quando o JWT do user está vazio — mas essa key está hardcoded no build. Qualquer pessoa com o APK pode descompilar e pegar a key.

### 2.5 — DADOS: Tipos do Mobile vs Schema do Backend

| Campo | Mobile `types.ts` | Backend Prisma | Web | Status |
|-------|-------------------|----------------|-----|--------|
| `Event.eventType` | ❌ Não existe | ✅ CULTO/CONFERENCIA/ENSAIO/OUTRO | ❌ Não usado | ⚠️ Gap |
| `Event.description` | ✅ `string \| null` | ✅ `String?` | ✅ | ✅ |
| `SetlistItem.songId` | ❌ Não existe | ❌ Não existe (usa songTitle) | ✅ | ⚠️ Gap |
| `Song.chordCharts[].structuredContent` | ✅ `ParsedChart` | ✅ `parsedJson Json?` | ✅ | ✅ |
| `Organization` | ❌ Não existe | ✅ Full model | ✅ | ⚠️ Mobile falta |
| `AuditLog` | ❌ | ✅ Full model | ❌ | ok (backend only) |
| `PushToken` | ✅ (via notifications) | ✅ | ❌ | ✅ |
| `User.avatarUrl` | ❌ | ❌ | ❌ | ⚠️ Requisito não impl. |

### 2.6 — NAVIGATION: Web vs Mobile feature parity

| Feature | Web | Mobile | Gap |
|---------|-----|--------|-----|
| Login Google | ✅ GIS popup | ✅ AuthSession redirect | ✅ |
| Listar eventos | ✅ | ✅ | ✅ |
| Criar evento | ✅ | ✅ | ✅ |
| Editar evento | ✅ | ✅ | ✅ |
| Deletar evento | ✅ | ✅ | ✅ |
| Setlist CRUD | ✅ com drag-and-drop | ✅ com botões ↑↓ | ✅ |
| Editar item setlist | ✅ | ✅ | ✅ |
| Buscar músicas | ✅ | ✅ | ✅ |
| Importar cifra TXT | ✅ | ✅ | ✅ |
| Checklist templates | ✅ CRUD | ✅ read-only | ⚠️ Mobile não cria |
| Checklist toggle | ✅ | ✅ | ✅ |
| Aprovação de usuários | ✅ /admin/users | ❌ | ok (admin=web) |
| Dashboard admin | ✅ /admin | ❌ | ok (admin=web) |
| Organizações | ✅ /admin/organizations | ❌ | ⚠️ |
| Gestão de equipe | ✅ /admin/team | ❌ | ok (admin=web) |
| Push notifications | ❌ | ✅ | ⚠️ Web não suporta |
| Perfil/conta | ❌ (só header) | ✅ AccountScreen | ⚠️ |
| Modo apresentação | ✅ (keyboard nav) | ❌ | ⚠️ |
| Offline cache | ❌ | ✅ (AsyncStorage) | ⚠️ |
| eventType (culto, ensaio) | ❌ UI | ❌ UI | ⚠️ Schema existe |

---

## 3. Problemas de Segurança

| # | Severidade | Problema | Arquivo | Recomendação |
|---|-----------|---------|---------|-------------|
| S1 | 🔴 ALTA | `ADMIN_API_KEY` pode vazar no APK mobile (env var no bundle) | mobile/src/lib/config.ts | Remover ADMIN_API_KEY do mobile. Usar só JWT. |
| S2 | 🔴 ALTA | JWT_SECRET default `"dev_secret_change_me"` | api/src/auth/auth.service.ts | Rejeitar startup se não configurado em prod |
| S3 | 🟡 MÉDIA | `AUTH_BOOTSTRAP_MODE=true` aceita qualquer payload sem Google | api/src/auth/auth.controller.ts | Desabilitar em produção via validação |
| S4 | 🟡 MÉDIA | Sem rate limit específico no `/api/auth/google` | api/src/app.module.ts | Rate limit especial para auth (5 req/min) |
| S5 | 🟡 MÉDIA | Token JWT sem refresh — 12h fixo | api/src/auth/auth.service.ts | Implementar refresh token |
| S6 | 🟢 BAIXA | Sem token revocation (multi-device logout) | - | Blacklist de tokens em Redis |
| S7 | 🟢 BAIXA | Cascading hard deletes sem soft delete | prisma/schema.prisma | Adicionar `deletedAt` para audit trail |

---

## 4. Problemas de Arquitetura

### 4.1 — Mobile: App.tsx monolítico (700+ linhas)
Todo o state management está em um único arquivo. Cada tela recebe 5-10 props.

**Recomendação:** Extrair para Context API ou hooks customizados (`useEvents`, `useSetlist`, `useAuth`, `useSongs`).

### 4.2 — Web: BFF proxy manual (30+ route files)
Cada endpoint do backend tem um `route.ts` correspondente no Next.js que faz proxy manual com `serverApiFetch`.

**Recomendação:** Manter (é seguro — esconde ADMIN_API_KEY do client). Mas padronizar error handling e response format.

### 4.3 — Mobile: Sem React Navigation
Navigation é via `activeTab` state + renderização condicional. Sem stack, sem deep linking real, sem back button handling.

**Recomendação:** Migrar para `expo-router` ou `@react-navigation/native` para:
- Deep linking real
- Back button nativo Android
- Stack para song detail, event detail
- Melhor UX de navegação

### 4.4 — Sem shared types entre mobile/web/api
`types.ts` no mobile, tipos inline no web, Prisma types no backend. Nenhum compartilhamento.

**Recomendação:** Usar o pacote `packages/types/` que já existe na estrutura mas está vazio. Exportar interfaces compartilhadas.

### 4.5 — Worker placeholder
`apps/worker/` ainda é placeholder. Não processa nenhuma fila.

**Recomendação:** Usar para: envio de push notifications em batch, processamento de importação de cifras em background, limpeza de tokens expirados.

### 4.6 — Packages vazios
`packages/parser/`, `packages/types/`, `packages/ui/` existem mas estão vazios.

**Recomendação:**
- `packages/types/` → tipos compartilhados mobile/web/api
- `packages/parser/` → mover `chord-txt-parser.ts` para cá (usado no API e poderia ser usado no mobile)
- `packages/ui/` → componentes compartilhados web (se aplicável)

---

## 5. Priorização (Roadmap de Correções)

### Fase 1 — Segurança (URGENTE)
1. Remover `ADMIN_API_KEY` do mobile — todas as chamadas autenticadas usam JWT
2. Backend: unificar auth — Events/Setlist/Orgs aceitam JWT (ADMIN/LEADER) além de ADMIN_API_KEY
3. Validar `JWT_SECRET` em produção (rejeitar default)
4. Desabilitar `AUTH_BOOTSTRAP_MODE` em produção

### Fase 2 — Auth Consistency
5. Implementar refresh token (ou estender TTL para 7d no mobile)
6. Mobile: tratar token expirado → redirect para LoginScreen com mensagem
7. Garantir Google Client IDs corretos para cada plataforma no backend (`GOOGLE_CLIENT_IDS` CSV)

### Fase 3 — Shared Types & Packages
8. Popular `packages/types/` com interfaces de `User`, `Event`, `Song`, `Setlist`, `Checklist`
9. Mover `chord-txt-parser` para `packages/parser/`
10. Atualizar imports no API, web e mobile

### Fase 4 — Mobile UX
11. Migrar navegação para `expo-router` ou React Navigation
12. Extrair state do App.tsx para hooks/contexts
13. Adicionar `eventType` no UI mobile (criar evento)
14. Tela de organizações no mobile (read-only pelo menos)

### Fase 5 — Features Missing
15. Push notifications na web (Web Push API ou apenas in-app)
16. Modo apresentação no mobile
17. Perfil/conta na web
18. Worker real com BullMQ/Redis

---

## 6. Mapa de Endpoints — Incompatibilidades

### Endpoints que o mobile chama mas podem falhar:

| Endpoint | Mobile envia | Backend espera | Problema |
|----------|-------------|----------------|---------|
| `POST /api/events` | `Bearer <JWT>` | `Bearer <ADMIN_API_KEY>` | ❌ ADMIN_API_KEY fallback expõe key no APK |
| `PATCH /api/events/:id` | `Bearer <JWT>` | `Bearer <ADMIN_API_KEY>` | ❌ Mesmo problema |
| `DELETE /api/events/:id` | `Bearer <JWT>` | `Bearer <ADMIN_API_KEY>` | ❌ Mesmo problema |
| `POST /api/events/:id/setlist/items` | `Bearer <JWT>` | `Bearer <ADMIN_API_KEY>` | ❌ Mesmo problema |
| `POST /api/events/:id/setlist/reorder` | `Bearer <JWT>` | `Bearer <ADMIN_API_KEY>` | ❌ Mesmo problema |

### Solução: No backend, aceitar JWT de ADMIN/LEADER para esses endpoints (não só ADMIN_API_KEY).

---

## 7. Variáveis de Ambiente — Mapa Completo

### API (.env)
```bash
PORT=3001
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=<strong-secret-required>       # ⚠️ Obrigatório em prod
ADMIN_API_KEY=<bearer-token>              # Server-to-server
GOOGLE_CLIENT_ID=<web-client-id>          # Ou GOOGLE_CLIENT_IDS (CSV)
GOOGLE_ALLOWED_DOMAIN=                    # Opcional
AUTH_BOOTSTRAP_MODE=false                 # ⚠️ false em prod
ADMIN_APPROVED_EMAILS=admin@domain.com    # Seed
IMAGE_TAG=latest
```

### Web (.env)
```bash
API_INTERNAL_URL=http://api:3001/api      # Docker
NEXT_PUBLIC_API_URL=https://music.overflowmvmt.com/api
ADMIN_API_KEY=<mesma-key-do-api>          # BFF proxy
GOOGLE_CLIENT_ID=<web-client-id>
WEB_LOGIN_FALLBACK_ENABLED=false
NODE_ENV=production
```

### Mobile (.env)
```bash
EXPO_PUBLIC_API_URL=https://music.overflowmvmt.com/api
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<android-or-web-client-id>
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web-client-id>
EXPO_PUBLIC_MOBILE_LOGIN_FALLBACK_ENABLED=false
# ⚠️ NÃO incluir ADMIN_API_KEY no mobile
```

---

## 8. Database Schema Status

- **13 models** todos implementados no Prisma
- `prisma db push` necessário para aplicar últimas mudanças (EventType, Organization, AuditLog)
- Sem migrations versionadas — usando `db push` (ok para MVP, migrar para `prisma migrate` em produção)

---

## 9. Resumo Executivo

| Área | Estado | Score |
|------|--------|-------|
| **API Backend** | Funcional, 48 endpoints, testes parciais | 🟢 80% |
| **Web App** | Funcional, BFF proxy, auth + admin | 🟢 85% |
| **Mobile App** | Funcional, login Google em progresso | 🟡 65% |
| **Integração Auth** | Inconsistente (JWT vs ADMIN_KEY) | 🔴 40% |
| **Segurança** | Gaps críticos (API key no mobile, JWT secret) | 🔴 35% |
| **Shared Code** | Packages vazios, tipos duplicados | 🟡 20% |
| **DevOps** | Docker + Nginx + CI configurado | 🟢 75% |
| **Testes** | ~30-40% coverage API, 0% web/mobile | 🟡 30% |
