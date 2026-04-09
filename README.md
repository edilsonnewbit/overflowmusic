# Overflow Music App

Base inicial do projeto com foco em:
- estrutura monorepo
- deploy Docker na Hostinger
- pipeline CI/CD com GHCR + Hostinger VPS
- autenticação base com aprovação administrativa

## Estrutura
- `apps/api`: API NestJS + Prisma (PostgreSQL)
- `apps/web`: Web app Next.js (BFF interno)
- `apps/mobile`: App mobile (Expo + React Native)
- `apps/worker`: Worker BullMQ (notificações, crons)
- `docker-compose.yml`: stack de produção
- `nginx/conf.d/app.conf`: proxy reverso e TLS
- `.github/workflows/deploy-hostinger.yml`: pipeline de deploy

---

## Roles e Permissões

### Roles disponíveis

| Role | Descrição |
|---|---|
| `SUPER_ADMIN` | Controle total do sistema — único com poderes destrutivos e de governança |
| `ADMIN` | Administrador operacional — gerencia conteúdo e equipe, sem poder de exclusão |
| `LEADER` | Líder musical / regente — cria e conduz eventos, gerencia setlist e escalas |
| `MEMBER` | Membro da equipe — participa de eventos, responde convites, vê conteúdo |

### Status de aprovação

| Status | Descrição |
|---|---|
| `PENDING_APPROVAL` | Novo cadastro aguardando aprovação |
| `APPROVED` | Ativo e com acesso ao sistema |
| `REJECTED` | Acesso negado pelo administrador |

---

### Matriz de permissões

```
Funcionalidade                      SUPER_ADMIN   ADMIN   LEADER   MEMBER
───────────────────────────────────────────────────────────────────────────
Aprovar / rejeitar usuários               ✅        ❌       ❌       ❌
Alterar role / deletar usuário            ✅        ❌       ❌       ❌
Painel /admin                             ✅        ✅       ❌       ❌
Criar / editar evento                     ✅        ✅       ✅       ❌
Deletar evento                            ✅        ❌       ❌       ❌
Publicar / arquivar evento                ✅        ✅       ✅       ❌
Escalar músicos e voluntários             ✅        ✅       ✅       ❌
Editar setlist                            ✅        ✅       ✅       ❌
Ver setlist                               ✅        ✅       ✅       ✅
Criar música no catálogo                  ✅        ✅       ✅       ❌
Deletar música do catálogo                ✅        ❌       ❌       ❌
Ver cifras                                ✅        ✅       ✅       ✅
Criar template de checklist               ✅        ✅       ❌       ❌
Executar checklist (marcar itens)         ✅        ✅       ✅       ❌
Ver audições                              ✅        ✅       👁        ❌
Aprovar / reprovar audições               ✅        ✅       ❌       ❌
Ver decisões de eventos                   ✅        ✅       👁        ❌
Exportar decisões CSV                     ✅        ✅       ❌       ❌
Gerenciar organizações                    ✅        ✅       ❌       ❌
Responder convite (confirmar/recusar)     ✅        ✅       ✅       ✅
Chat do evento                            ✅        ✅       ✅       ✅
Editar próprio perfil                     ✅        ✅       ✅       ✅
```
*(👁 = somente leitura)*

---

### Detalhamento por role

#### `SUPER_ADMIN`
Controle irrestrito. Único que pode excluir recursos permanentemente ou alterar a estrutura de acesso de outros usuários.

- Tudo que ADMIN pode fazer
- Aprovar / rejeitar cadastros de usuários
- Alterar role de qualquer usuário
- Deletar eventos permanentemente
- Deletar músicas do catálogo permanentemente
- Visualizar logs de auditoria completos

#### `ADMIN`
Operação do dia a dia. Gerencia todo o conteúdo e a equipe, mas não pode excluir recursos nem promover/rebaixar usuários.

- Criar, editar e publicar eventos
- Escalar músicos e voluntários
- Criar e editar setlist
- Criar e editar músicas no catálogo
- Criar templates de checklist e executar checklists
- Gerenciar audições (ver + aprovar/reprovar)
- Ver e exportar decisões de eventos
- Gerenciar organizações e membros
- Acesso ao painel `/admin/*`

#### `LEADER`
Foco musical. Prepara e conduz eventos; não gerencia pessoas nem exclui conteúdo.

- Criar e editar eventos
- Escalar músicos e voluntários nos eventos
- Criar e editar setlist
- Adicionar e editar músicas no catálogo
- Executar checklists (não cria templates)
- Criar e vincular ensaios a eventos
- Ver audições e decisões de eventos (somente leitura)
- Sem acesso ao painel `/admin/*`

#### `MEMBER`
Participa — não gerencia nada. Acesso somente às funcionalidades de que precisa para atuar na equipe.

- Ver eventos publicados
- Ver setlist e cifras
- Responder convites (confirmar / recusar)
- Chat do evento
- Editar o próprio perfil (instrumentos, whatsapp, foto)

---

## Fluxo de autenticação

```
1. Login (Google OAuth ou Email/Password)
2. Backend valida credenciais
3. Se email não verificado → EMAIL_NOT_VERIFIED
4. Se status PENDING_APPROVAL → aguardando aprovação
5. Se status REJECTED → acesso negado
6. Se status APPROVED → JWT gerado (TTL 7 dias, HS256)
7. Frontend armazena token em memória
8. Requisições enviadas com: Authorization: Bearer <token>
9. Backend valida: assinatura, expiração, status APPROVED, role
```

---

## Endpoints da API

### Autenticação (`/api/auth/`)

| Método | Endpoint | Proteção |
|---|---|---|
| POST | `/auth/google` | Pública |
| POST | `/auth/register` | Pública |
| POST | `/auth/login` | Pública |
| POST | `/auth/verify-email` | Pública |
| POST | `/auth/resend-verification` | Pública |
| POST | `/auth/request-password-reset` | Pública |
| POST | `/auth/reset-password` | Pública |
| GET | `/auth/me` | JWT obrigatório |
| POST | `/auth/refresh` | JWT obrigatório |
| PATCH | `/auth/me` | JWT obrigatório |

### Admin (`/api/admin/`)

| Método | Endpoint | Proteção |
|---|---|---|
| GET | `/admin/users` | ADMIN+ |
| GET | `/admin/users/pending` | ADMIN+ |
| GET | `/admin/dashboard` | ADMIN+ |
| POST | `/admin/users/:id/approve` | **SUPER_ADMIN** |
| POST | `/admin/users/:id/reject` | **SUPER_ADMIN** |
| PATCH | `/admin/users/:id` (role/status) | **SUPER_ADMIN** |

### Eventos (`/api/events/`)

| Método | Endpoint | Proteção |
|---|---|---|
| GET | `/events` | JWT obrigatório |
| GET | `/events/:id` | JWT obrigatório |
| POST | `/events` | LEADER+ |
| PATCH | `/events/:id` | LEADER+ |
| DELETE | `/events/:id` | **SUPER_ADMIN** |
| POST | `/events/:id/musicians` | LEADER+ |
| DELETE | `/events/:id/musicians/:id` | LEADER+ |
| POST | `/events/slots/:id/respond` | JWT obrigatório |
| POST | `/events/:id/setlist/items` | LEADER+ |
| DELETE | `/events/:id/setlist/items/:id` | LEADER+ |

### Músicas (`/api/songs/`)

| Método | Endpoint | Proteção |
|---|---|---|
| GET | `/songs` | JWT obrigatório |
| GET | `/songs/:id` | JWT obrigatório |
| POST | `/songs` | LEADER+ |
| PATCH | `/songs/:id` | LEADER+ |
| DELETE | `/songs/:id` | **SUPER_ADMIN** |

---

## Deploy Hardening (Hostinger)

- Validação local/CI de variáveis obrigatórias antes do deploy:
  - `npm run check:deploy-env`
- Script usado pelo CI:
  - `scripts/check-hostinger-env.sh`
- Checklist operacional completo:
  - `docs/DEPLOY_CHECKLIST.md`

### Variáveis obrigatórias (API)

```
JWT_SECRET
ADMIN_API_KEY
DATABASE_URL
REDIS_URL
GOOGLE_CLIENT_IDS
SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM
FRONTEND_URL
```

### Variáveis opcionais (API)

```
ADMIN_APPROVED_EMAILS   # emails separados por vírgula, auto-aprovados como ADMIN
GOOGLE_ALLOWED_DOMAIN   # restringe login por domínio
AUTH_BOOTSTRAP_MODE     # desenvolvimento apenas
TZ=America/Recife
```

### Variáveis (Web)

```
NEXT_PUBLIC_API_URL
ADMIN_API_KEY
GOOGLE_CLIENT_ID
AUTH_BOOTSTRAP_MODE
WEB_LOGIN_FALLBACK_ENABLED
TZ=America/Recife
```

---

## Mobile (Expo)

App em `apps/mobile` com login Google nativo (AuthSession), resposta a convites, visualização de cifras e checklists.

```
EXPO_PUBLIC_API_URL
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
```

---

## Persistência

- ORM: Prisma (`apps/api/prisma/schema.prisma`)
- Migrations: `prisma db push` (entrypoint automático no deploy)
- Scripts úteis (em `apps/api`):
  - `npm run prisma:generate`
  - `npm run prisma:push`
  - `npm test`
