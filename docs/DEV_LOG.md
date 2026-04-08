# DEV_LOG.md

Registro oficial de progresso para handoff entre LLMs.

### [2026-04-21 BRT] - GitHub Copilot (Claude Sonnet 4.6)
- Objetivo: Fix "ver cifra" no modo apresentação + paridade de eventos mobile vs web (status chips + músicos)
- Feito:
  - `apps/mobile/app/present.tsx`: `loadChart` não cria cache vazio quando fetchSongs falha (permite retry); `handleToggleCifra` com try/catch/finally — sempre abre o painel após tentativa
  - `apps/mobile/src/lib/api.ts`: `updateEvent` recebe `status?: string` e `eventType?: string` no tipo de input
  - `apps/mobile/src/context/SessionContext.tsx`: `handleUpdateEvent` e sua interface recebem `status?: string`
  - `apps/mobile/src/screens/EventsScreen.tsx`: prop `onUpdateEvent` recebe `status?`; chips de status (DRAFT/ACTIVE/PUBLISHED/FINISHED) clicáveis no card de evento; seção "Músicos" agrupada por `instrumentRole` com badge de status (PENDING/CONFIRMED/DECLINED/EXPIRED)
- Commits: `7c61d75`, `2c8d9e4`
- APK: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk` (EXIT:0)
- Status: ✅ 0 erros TS, build OK
- Próximo passo: subir Docker local e rodar `prisma db push` para aplicar coluna `photoUrl`

### [2026-04-20 BRT] - GitHub Copilot (Claude Sonnet 4.6)
- Objetivo: (1) Todos os campos no perfil mobile; (2) Foto do Google exibida no web e mobile
- Feito:
  - `apps/api/prisma/schema.prisma`: adicionado campo `photoUrl String?` ao model User
  - `packages/types/index.ts`: adicionado `photoUrl?: string | null` ao tipo `AuthUser`
  - `apps/api/src/auth/auth.types.ts`: adicionado `photoUrl?: string | null` ao tipo `AuthUser`
  - `apps/api/src/auth/auth.service.ts`: 4 mudanças — `GoogleLoginInput` + `DbUserRecord` recebem `photoUrl`; create inclui `photoUrl`; update atualiza `photoUrl` se diferente; `toAuthUser` retorna `photoUrl`
  - `apps/api/src/auth/auth.controller.ts`: extrai `picture` do payload Google e passa como `photoUrl`; PATCH `/auth/me` agora aceita e passa `whatsapp` e `address` (estavam sendo ignorados)
  - `apps/mobile/src/lib/api.ts`: `updateProfile` expandido para incluir todos os campos de perfil
  - `apps/mobile/src/screens/AccountScreen.tsx`: reescrito — avatar (foto Google ou iniciais), leitura de todos os campos, formulário completo com instrumentos (chips), campos whatsapp/address/church/etc., botões Salvar/Cancelar
  - `apps/web/components/GlobalHeader.tsx`: avatar agora mostra `<img>` com foto Google se disponível, fallback inicial
  - `apps/web/app/profile/page.tsx`: seção de avatar Google + nome no topo do card de perfil
- Status: ✅ 0 erros TS em todos os arquivos alterados
- Pendências: `cd apps/api && npx prisma db push` (precisa Docker) para aplicar coluna `photoUrl` no banco
- Próximo passo: subir Docker local e rodar `prisma db push`

### [2026-04-19 BRT] - GitHub Copilot (Claude Sonnet 4.6)
- Objetivo: 5 ajustes visuais/funcionais no mobile — header, ícones, saudação, setlist, cifra
- Feito:
  - `apps/mobile/src/components/NotificationBell.tsx` (NOVO): sino de notificações com badge e bottom sheet modal; usa `useSession().pendingInvites/respondToInvite/loadMyInvites`
  - `apps/mobile/app/(tabs)/_layout.tsx`: `headerShown: true`; header escuro `#0b1828`; `headerRight` com `NotificationBell` + botão 👤 → account; ícone checklist trocado para `☑️`; tab `account` oculta da barra (`href: null`)
  - `apps/mobile/src/screens/HomeScreen.tsx`: removido card de saudação "Olá, {nome}", removida lista de convites pendentes (movidos para o sino), removidas constantes `ROLE_LABEL/COLOR`, `INSTRUMENT_LABEL`
  - `apps/mobile/app/present.tsx`: bug "Ver cifra" corrigido — `handleToggleCifra` agora abre para músicas com `rawText` mesmo sem `parsedJson`; estado `currentRawText` adicionado; cache type atualizado; fallback render para texto puro
  - `apps/mobile/src/screens/EventsScreen.tsx`: cabeçalho compacto com botão "Novo Evento" pill; cards de evento redesenhados (borda colorida por status, accent bar, botões Editar/Excluir compactos); fragmento de código duplicado removido; setlist redesenhado — controles ▲▼✕✏ em linha horizontal à direita do título (não em coluna), botões Compartilhar + Apresentar lado a lado; `actionBtnStyle` adicionado às constantes
  - `apps/mobile/src/screens/SongsScreen.tsx`: ícone `＋` reduzido de fontSize 24 → 18
- Status: ✅ 0 erros TS em todos os arquivos alterados
- Pendências: rebuild APK release + instalar no dispositivo para validar visual
- Próximo passo: `cd apps/mobile/android && ./gradlew assembleRelease --no-daemon`

### [2026-04-07 BRT] - GitHub Copilot (Claude Sonnet 4.6)
- Objetivo: Corrigir erro 400 `invalid_request` no login Google do app Android
- Causa raiz: `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` estava com o Web Client ID — Google rejeita custom URI scheme (`overflowmusic://`) com Web client ID
- Feito:
  - `apps/mobile/.env`: atualizado `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` para o client ID tipo Android (`...3k2u1atvl0n3v9p2m39qevgtlafmfqs5`); adicionado `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` (`...ai0u5m2uk87vekr0kf2du068d1e4011e`); Web ID mantido (`...6p997egkf07gmge5dp9afuhh5e5d0u7n`)
  - Rebuild APK release: `assembleRelease` concluído em 31s → `app-release.apk` (76MB) gerado
- Status: ✅ APK gerado — pendente: instalar no dispositivo e testar login Google
- Pendências: `prisma db push` (colunas whatsapp/address) quando Docker disponível

### [2026-04-15 BRT] - GitHub Copilot (Claude Sonnet 4.6)
- Objetivo: (1) fix texto cifra saindo da tela no mobile web ao aumentar fonte; (2) paridade mobile: transpor + metrônomo
- Feito:
  - `apps/web/app/events/[eventId]/present/page.tsx`: `lineStyle()` — `whiteSpace: "pre"` → `"pre-wrap"` + `overflowWrap: "break-word"` + `wordBreak: "break-word"` — resolve overflow horizontal no Chrome Android
  - `apps/mobile/app/present.tsx`: funções `transposeChordLine`/`shiftNote`/`transposeToken` portadas do web; estado `transposeSemitones` + controles `− Tom × +` na toolbar; reset ao trocar música (em `goTo`)
  - `apps/mobile/app/present.tsx`: metrônomo com `setInterval` + `Vibration.vibrate()` (RN built-in); estados `metroOn`/`metroBpm`/`metroBeat`; visualizador de 4 beats (dots); acento no beat 1 com vibração mais longa; controles `♩BPM − +` na segunda linha da toolbar
- Commit: `84c50b2` — `feat(present): pre-wrap cifra web + transposição e metrônomo no mobile`
- Status: ✅ completo, 0 erros TS

### [2026-04-14 BRT] - GitHub Copilot (Claude Sonnet 4.6)
- Objetivo: Corrigir `ThrottlerException: Too Many Requests` (429) em `GET /api/events/:id`
- Causa raiz: limite global do ThrottlerModule era `100 req/min` — a página de evento faz múltiplas chamadas (evento, setlist, músicos, charts), estoura rapidamente por um único IP
- Feito:
  - `apps/api/src/app.module.ts`: limite global aumentado de 100 → 500 req/min
  - `apps/api/src/events/events.controller.ts`: adicionado `@SkipThrottle()` + import de `SkipThrottle`
  - `apps/api/src/songs/songs.controller.ts`: adicionado `@SkipThrottle()` + import
  - `apps/api/src/setlist/setlist.controller.ts`: adicionado `@SkipThrottle()` + import
  - `AuthController` mantém `@Throttle` por endpoint (login, register, etc.) — não alterado
- Commit: `fix(api): corrige ThrottlerException 429 em rotas autenticadas` → `47da3e1` — pushed `origin/develop`
- Status: ✅ concluído

### [2026-04-11 BRT] - GitHub Copilot (Claude Sonnet 4.6)
- Objetivo: Diagnosticar e corrigir erro 500 em `POST /api/auth/resend-verification` ("Failed to send verification email")
- Causa raiz: variáveis `SMTP_USER`/`SMTP_PASS`/`SMTP_HOST` não estavam sendo validadas no startup nem no script de deploy — servidor de produção provavelmente não as tem configuradas
- Feito:
  - `apps/api/src/email/email.service.ts`: implementado `OnModuleInit` que loga warn claro se SMTP não configurado e tenta `verify()` na inicialização com diagnóstico detalhado; adicionado getter `fromAddress` que usa `SMTP_FROM` quando disponível (corrige inconsistência com docker-compose); ambos sendMail usam `this.fromAddress`
  - `scripts/check-hostinger-env.sh`: adicionados `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` na lista de aviso opcional — deploy agora exibe warn se SMTP não configurado
- Commit: `fix(email): verifica SMTP no startup e corrige campo from` → `8debde8` — `origin/develop`
- Status: código ok; solução definitiva depende de configurar as variáveis SMTP no `.env` do servidor
- **AÇÃO NECESSÁRIA NO SERVIDOR:** adicionar ao `.env` de produção:
  - `SMTP_HOST` (ex: `smtp.gmail.com`)
  - `SMTP_USER` (email remetente)
  - `SMTP_PASS` (senha de app Gmail de 16 chars — gerar em myaccount.google.com → Segurança → Senhas de app)
  - `SMTP_FROM` (ex: `"Overflow Music" <no-reply@overflowmvmt.com>`)
- Pendência: ver logs do servidor (`docker logs overflow_api | grep EmailService`) para confirmar diagnóstico
- Próximo passo: configurar SMTP no servidor e redeploy

### [2026-04-10 BRT] - GitHub Copilot (Claude Sonnet 4.6)
- Objetivo: Dashboard inicial com painel rico de eventos (confirmações, pendências e recusas de músicos)
- Feito:
  - `apps/web/app/api/events/upcoming/route.ts` (NOVO): BFF `GET /api/events/upcoming` — busca 3 próximos eventos com slots completos, agrupa músicos em confirmed/pending/declined (priority=1), retorna contagens e status computado
  - `apps/web/components/HomeClient.tsx`: componente reescrito — removida seção "Próximo Evento" simples; adicionado painel "Próximos Eventos" com até 3 cards detalhados por evento; cada card exibe: título, tipo, status, countdown "Em X dias", data/horário/local, box de contagem confirmados/total, e três listas de músicos (✓ confirmados verde, ⏳ aguardando amarelo, ✗ recusados vermelho) com papel do instrumento em cada nome; cards admin preservados
- Commit: `feat(dashboard): painel de eventos com confirmações de músicos` → `0f07078` — `origin/develop`
- Status: 0 erros TS, commit e push OK
- Pendência: migration ainda pendente (`prisma migrate dev --name add-user-profile-fields`)
- Próximo passo: rodar a migration de perfil no servidor + testar dashboard em prod

### [2026-04-10 BRT] - GitHub Copilot (Claude Sonnet 4.6)
- Objetivo: Perfil estendido (Instagram, data de nascimento, igreja, pastor) + Termo de Adesão Voluntária com validade jurídica no cadastro
- Feito:
  - `apps/api/prisma/schema.prisma`: 6 novos campos em `User` — `instagramProfile`, `birthDate`, `church`, `pastorName`, `volunteerTermsVersion`, `volunteerTermsAcceptedAt`
  - `apps/api/src/auth/auth.types.ts`: `AuthUser` atualizado com os 6 novos campos
  - `packages/types/index.ts`: `AuthUser` compartilhado atualizado
  - `apps/api/src/auth/auth.service.ts`: `DbUserRecord`, `emailRegister` (valida `volunteerTermsAccepted`, grava versão `"1.0-2026"` e timestamp), `updateMe` e `toAuthUser` atualizados
  - `apps/api/src/auth/auth.controller.ts`: body types de `emailRegister` e `updateMe` expandidos
  - `apps/web/app/api/auth/me/route.ts`: PATCH BFF passa os 4 campos de perfil
  - `apps/web/app/profile/page.tsx`: 4 novos inputs (Instagram, data de nascimento `<input type="date">`, Igreja, Pastor)
  - `apps/mobile/app/register.tsx`: 4 novos campos opcionais + ScrollView com Termo de Adesão legal em 8 cláusulas; botão "Li e aceito" só ativa após rolar até o fim; cadastro bloqueado sem aceite
- Base legal do Termo: Lei 9.608/1998, Código Civil (Lei 10.406/2002), LGPD (Lei 13.709/2018), MP 2.200-2/2001, Lei 14.063/2020
- Status: 0 erros TS em todos os arquivos modificados
- Pendência: `prisma migrate dev --name add-user-profile-fields` + `git push origin develop`
- Próximo passo: rodar migration e deploy

### [2026-04-09 BRT] - GitHub Copilot (Claude Sonnet 4.6)
- Objetivo: `eventType` nos formulários de evento (web + mobile) + fluxo completo de resposta a convite de músico no mobile
- Feito:
  - `packages/types/index.ts`: `EventType` = CULTO|CONFERENCIA|ENSAIO|OUTRO, campo `eventType?` em `MusicEvent`
  - `apps/web/app/events/page.tsx`: `<select>` de tipo no form de criação de evento
  - `apps/mobile/src/screens/EventsScreen.tsx`: seletores visuais de tipo (botões) nos forms de criação e edição
  - `apps/api/src/events/events.service.ts`: `respondMusicianBySlotId` (wrapper leve para `respondMusician`)
  - `apps/api/src/events/events.controller.ts`: `POST /events/slots/:slotId/respond` (endpoint sem eventId para uso direto do mobile)
  - `apps/api/src/notifications/notifications.service.ts`: dados de notificação incluem `eventTitle` e `instrumentRole`
  - `apps/mobile/src/lib/api.ts`: função `respondMusicianSlot(slotId, accept, token)`
  - `apps/mobile/src/context/SessionContext.tsx`: estado `pendingInvite`, `setPendingInvite`, `handleRespondInvite`; assinaturas de create/update incluem `eventType?`
  - `apps/mobile/app/_layout.tsx`: listener de notificação extrai `slotId/eventTitle/instrumentRole` e chama `setPendingInvite`
  - `apps/mobile/src/screens/HomeScreen.tsx`: modal overlay de confirmação/recusa de convite quando `pendingInvite !== null`
- Commit: `d10f158` na branch develop
- Status: 0 erros TS nos arquivos modificados; erros pré-existentes de PrismaService em events.service.ts não alterados
- Próximo passo: `git push origin develop` para deploy

### [2026-04-06 BRT] - GitHub Copilot (Claude Sonnet 4.6)
- Objetivo: Cron jobs para expiração de músicos e lembretes; propagar `address` pelo mobile
- Feito:
  - `apps/api/package.json`: adicionada dependência `@nestjs/schedule@^4.1.0`
  - `apps/api/src/events/events.cron.ts` (novo): `EventsCronService` com `@Cron` para `processExpiredMusicians` (a cada hora) e `sendPendingReminders` (8h, 13h, 20h BRT = 11h, 16h, 23h UTC)
  - `apps/api/src/app.module.ts`: importa `ScheduleModule.forRoot()`, registra `EventsCronService` como provider
  - `apps/mobile/src/lib/api.ts`: `createEvent` e `updateEvent` aceitam `address?` no input
  - `apps/mobile/src/context/SessionContext.tsx`: assinaturas de `handleCreateEvent` e `handleUpdateEvent` incluem `address?`
  - `apps/mobile/App.tsx`: assinaturas de `handleCreateEvent` e `handleUpdateEvent` incluem `address?`
- Commit: na branch develop
- Status: 0 erros TypeScript no mobile/web; erro @nestjs/schedule esperado localmente (resolve no docker build com npm install)
- Próximo passo: `git push origin develop` para deploy; reconstruir containers para aplicar alterações

### [2026-04-08 BRT] - GitHub Copilot (Claude Sonnet 4.6)
- Objetivo: Endereço com Maps/Waze, edição e controle de status (ACTIVE/FINISHED automático), equipe de músicos por instrumento com prioridade e notificações
- Feito:
  - `apps/api/prisma/schema.prisma`: enum `EventStatus` (+ ACTIVE, FINISHED), novo enum `MusicianSlotStatus`, campos `address`, `confirmationDeadlineDays`, `responseWindowHours` em Event, novo model `EventMusician` com unique+index
  - `apps/api/src/events/events.service.ts`: reescrita completa — CreateEventInput com novos campos, `computedStatus` (ACTIVE + data passada = FINISHED), `getById` inclui musicians, endpoints CRUD de músicos, `respondMusician`, `triggerMusicianNotifications`, `escalateMusician`, `processExpiredMusicians` (cron), `sendPendingReminders` (3x/dia)
  - `apps/api/src/events/events.controller.ts`: novos endpoints `GET/POST :id/musicians`, `DELETE :id/musicians/:musicianId`, `POST :id/musicians/:musicianId/respond`
  - `apps/api/src/notifications/notifications.service.ts`: novos métodos `sendMusicianConfirmationRequest` e `sendMusicianReminder`
  - `packages/types/index.ts`: `EventStatus` com novos valores, novo tipo `MusicianSlotStatus`, novo tipo `EventMusician`, `MusicEvent` com address/computedStatus/musicians
  - `apps/web/app/api/events/[eventId]/musicians/route.ts` (novo): BFF GET/POST músicos
  - `apps/web/app/api/events/[eventId]/musicians/[musicianId]/route.ts` (novo): BFF DELETE músico
  - `apps/web/app/events/page.tsx`: campo `address` no form, novos status (ACTIVE/FINISHED/ARCHIVED) com cores, label em português
  - `apps/web/app/events/[eventId]/page.tsx`: endereço com botões Google Maps / Waze, form edição inline, botões de status (Ativar/Publicar/Arquivar), seção equipe músicos por instrumento com prioridade/status
  - `apps/mobile/src/screens/EventsScreen.tsx`: campo address no form criação/edição, badge de status colorido, botões Maps/Waze com `Linking.openURL`
- Commit: `17f3bb9` na branch develop
- Status: TypeScript OK no web/mobile; erros @prisma/client no editor são esperados (Prisma generate roda no `docker build`)
- Próximo passo: `git push origin develop` para deploy; worker deve ser configurado para chamar `processExpiredMusicians()` e `sendPendingReminders()` via cron

### [2026-04-07 BRT] - GitHub Copilot (Claude Sonnet 4.6)
- Objetivo: Instrumentos no perfil, líder vocal por dropdown, gerenciamento de equipe com edição
- Feito:
  - `apps/api/prisma/schema.prisma`: campo `instruments String[] @default([])` no model User
  - `apps/api/src/auth/auth.types.ts`: `instruments: string[]` em AuthUser
  - `apps/api/src/auth/auth.service.ts`: `updateMe` aceita `instruments`, novo método `adminUpdateUser`
  - `apps/api/src/auth/auth.controller.ts`: PATCH `api/auth/me` passa instruments; novo endpoint PATCH `api/admin/users/:userId`
  - `apps/web/app/api/auth/me/route.ts`: BFF repassa `instruments` no PATCH
  - `apps/web/app/api/admin/users/[userId]/route.ts`: novo BFF PATCH criado
  - `apps/web/lib/types.ts`: `instruments: string[]` adicionado ao AuthUser
  - `apps/web/app/profile/page.tsx`: multi-select de 14 instrumentos/vocal; salva junto com nome
  - `apps/web/app/events/[eventId]/page.tsx`: "Líder vocal" substituído por `<select>` com membros do time (via `/api/admin/users`)
  - `apps/web/app/admin/team/page.tsx`: MemberCard com edição inline de role + instrumentos via PATCH
  - Sessão anterior: banner de sessão removido, login/logout com `window.location.href`, setlist com busca de músicas cadastradas
- Commit: `10df02d` na branch develop
- Status: 0 erros TypeScript; 12 arquivos alterados
- Próximo passo: `git push origin develop && deploy` (prisma db push aplicará instruments no boot do container)

### [2026-04-06 BRT] - GitHub Copilot (Claude Sonnet 4.6)
- Objetivo: Continuação da sessão anterior — validação pós-commit do fluxo de auth
- Validado:
  - `apps/api/src/email/email.service.ts`: URLs dos templates de email apontam corretamente para `/verify-email?token=...` e `/reset-password?token=...` (páginas criadas na sessão anterior)
  - `FRONTEND_URL` definida como `https://music.overflowmvmt.com` no docker-compose.yml de produção ✅
  - `apps/mobile/src/screens/LoginScreen.tsx`: implementação funcional (Google + email/senha, trata todos os status APPROVED/PENDING/REJECTED/EMAIL_NOT_VERIFIED)
  - `apps/mobile/app/register.tsx`: tela de cadastro funcional no mobile
- Arquivos commitados: mobile LoginScreen.tsx, mobile register.tsx, docs/DEV_LOG.md
- Pendências: merge develop → main para deploy em produção
- Próximo passo: `git checkout main && git merge develop && git push origin main` para atualizar produção

### [2026-04-05 20:19 BRT] - GitHub Copilot (Claude Sonnet 4.6)
- Objetivo: Redesenhar fluxo de auth completo (login, registro, recuperação, verificação) — funcional sem erros
- Problema raiz identificado: BFF routes de login/register/verify/resend/reset não existiam (todas davam 404); COOP header bloqueava Google Sign-In
- Feito:
  - `apps/web/next.config.mjs`: adicionado header `Cross-Origin-Opener-Policy: same-origin-allow-popups` na rota /login — corrige erro de `window.postMessage` do Google Sign-In
  - `apps/web/app/api/auth/login/route.ts` — criado (proxy + set cookie session)
  - `apps/web/app/api/auth/register/route.ts` — criado
  - `apps/web/app/api/auth/verify-email/route.ts` — criado
  - `apps/web/app/api/auth/resend-verification/route.ts` — criado
  - `apps/web/app/api/auth/request-password-reset/route.ts` — criado
  - `apps/web/app/api/auth/reset-password/route.ts` — criado
  - `apps/web/app/login/page.tsx` — redesenhado: dark theme consistente, Google + email unificados, estados inline sem tabs
  - `apps/web/app/register/page.tsx` — redesenhado: dark theme, tela de sucesso com instrução de verificar email
  - `apps/web/app/forgot-password/page.tsx` — redesenhado: dark theme
  - `apps/web/app/resend-verification/page.tsx` — redesenhado: pré-preenche email via ?email= query string
  - `apps/web/app/verify-email/page.tsx` — criado: lê token da URL, chama API automaticamente
  - `apps/web/app/reset-password/page.tsx` — criado: lê token da URL, formulário nova senha
  - `apps/web/app/globals.css`: adicionado `@keyframes spin`
- Validação: 0 erros TypeScript em todos os arquivos; push `012dea3..26d06cd` em develop
- Pendências: mobile LoginScreen.tsx (modificado local, não commitado); package-lock.json; .env.example
- Próximo passo: Testar fluxo completo em produção após deploy; verificar templates de email com URLs corretas (/verify-email?token=... e /reset-password?token=...)

### [2026-04-04 22:35 BRT] - GitHub Copilot (Claude Sonnet 4.6)
- Objetivo: Redesenhar página inicial como landing page pública com dashboard visível apenas para logados
- Feito:
  - `apps/web/app/page.tsx` reescrito: hero estático com logo, título gradiente, 4 feature cards, CTA "Entrar com Google"
  - `apps/web/components/HomeClient.tsx` criado: client component que detecta sessão via `/api/auth/me` e renderiza welcome box + próximo evento + nav cards somente para logados; guests recebem `null`
  - `apps/web/app/api/dashboard/stats/route.ts` criado: GET /api/dashboard/stats → verifica cookie → proxy para `admin/dashboard` com admin key
  - `apps/web/app/api/events/next/route.ts` criado: GET /api/events/next → verifica cookie → proxy para `events?limit=10`, retorna próximo evento futuro
- Arquivos: apps/web/app/page.tsx, apps/web/components/HomeClient.tsx, apps/web/app/api/dashboard/stats/route.ts, apps/web/app/api/events/next/route.ts
- Validação: sem erros TypeScript; push `0646bf2..8e35865` em develop
- Pendências: copiar logo para `apps/web/public/logo.png`; merge develop→main; CI/CD build; `docker compose pull web && docker compose up -d web` no VPS
- Próximo passo: Copiar logo.png para public/ e fazer merge para main + deploy

### [2025-07-14 21:11 BRT] - GitHub Copilot (Claude Sonnet 4.6)
- Objetivo: Eliminar dependência de `@overflow/types` no Docker web — solução definitiva para 404 runtime
- Feito:
  - Criado `apps/web/lib/types.ts` com todos os tipos copiados de `packages/types/index.ts`
  - Atualizados 9 arquivos (imports `@overflow/types` → `@/lib/types`)
  - Dockerfile simplificado para `context: ./apps/web` (3 stages limpos, WORKDIR /app)
  - Removidos: `transpilePackages` (next.config.mjs), `@overflow/types` (package.json), path alias (tsconfig.json)
  - CI/CD: `context: .` → `context: ./apps/web`
  - Commits `f3de1ba` (develop) e `5702422` (main)
- Arquivos: apps/web/lib/types.ts, apps/web/Dockerfile, apps/web/next.config.mjs, apps/web/package.json, apps/web/tsconfig.json, .github/workflows/deploy-hostinger.yml, 9 arquivos de tela/componentes
- Pendências: aguardar CI/CD build + validar https://music.overflowmvmt.com
- Próximo passo: Rebuild APK mobile (EAS) + cadastrar SHA-1 Android no Google OAuth (Q-005)

## Template de entrada
```md
### [YYYY-MM-DD HH:mm TZ] - <LLM/Agente>
- Objetivo:
- Feito:
- Arquivos:
- Validação:
- Pendências:
- Próximo passo:
```

---

### [2025-07-15 — GitHub Copilot (Claude Sonnet 4.6)] — Dashboard Mobile (HomeScreen)
- Objetivo: Fase 6 (cont.) — Tela inicial mobile com resumo do próximo evento, atalhos rápidos e lista de outros eventos.
- Feito:
  - Criado `apps/mobile/src/screens/HomeScreen.tsx`: saudação por nome + badge de role, card "Próximo Evento" (verde escuro, mostra título/data pt-BR/localização/dias restantes/count de músicas no setlist, pressable → seleciona evento e navega para /(tabs)/events), atalhos rápidos em grid 2 colunas (Eventos, Músicas, Checklist e ▶ Apresentar se houver próximo evento), lista de outros eventos (até 3, pressables).  Usa `RefreshControl` para atualizar eventos com pull-to-refresh.
  - Criado `apps/mobile/app/(tabs)/home.tsx`: wrapper SafeAreaView + HomeScreen.
  - Atualizado `apps/mobile/app/(tabs)/_layout.tsx`: adicionado `<Tabs.Screen name="home">` como **primeiro** tab (ícone 🏠 / label "Início"), mantendo events, checklist, songs, account.
  - Atualizado `apps/mobile/app/_layout.tsx`: auth guard agora redireciona usuário autenticado saindo do login para `/(tabs)/home` (antes: `/(tabs)/events`); tap em notificação também leva para `/(tabs)/home`.
- Arquivos:
  - `apps/mobile/src/screens/HomeScreen.tsx` (CRIADO)
  - `apps/mobile/app/(tabs)/home.tsx` (CRIADO)
  - `apps/mobile/app/(tabs)/_layout.tsx` (home tab adicionado como primeiro)
  - `apps/mobile/app/_layout.tsx` (redirect → home)
- Validação: `get_errors` em todos os 4 arquivos → 0 erros TS.
- Pendências: rebuild APK mobile; rebuild imagens Docker; Google OAuth GCP (manual).
- Próximo passo: Rate limiting por rota sensível na API (auth endpoints: throttle 10 req/min), ou CI/CD — validar pipeline e confirmar que todas as images são buildadas corretamente no Actions.

---

### [2025-07-15 — GitHub Copilot (Claude Sonnet 4.6)] — Rate Limiting por Rota (Fase 6 Hardening)
- Objetivo: Fase 6 (cont.) — Rate limiting diferenciado: endpoint de login Google limitado a 10 req/min; health endpoints sem throttle.
- Feito:
  - Atualizado `ThrottlerModule.forRoot` em `app.module.ts`: dois throttlers nomeados — `global` (100/min, como antes) e `auth` (10/min, para endpoints sensíveis de autenticação).
  - Adicionado `@Throttle({ auth: { limit: 10, ttl: 60000 } })` no `POST api/auth/google` em `auth.controller.ts` — limita brute-force de Google IdTokens.
  - Adicionado `@SkipThrottle()` no `AppController` (`app.controller.ts`) — endpoints `/health` e `/api/health` não consomem quota de nenhum throttler.
- Arquivos:
  - `apps/api/src/app.module.ts` (ThrottlerModule com dois throttlers nomeados)
  - `apps/api/src/auth/auth.controller.ts` (import Throttle/SkipThrottle + @Throttle no googleLogin)
  - `apps/api/src/app.controller.ts` (import SkipThrottle + @SkipThrottle na classe)
- Validação: `get_errors` em todos 3 arquivos → 0 erros TS.
- Pendências: rebuild de imagens Docker (API acumulado Fases 1-6); rebuild APK mobile; Google OAuth GCP (manual).
- Próximo passo: rebuild imagens Docker + deploy para produção, ou rebuild APK mobile com EAS CLI.

---

### [2026-04-04 — GitHub Copilot (Claude Sonnet 4.6)] — Consolidação auth controllers (DEC-003 + Q-003)
- Objetivo: Remover código duplicado de auth nos controllers de checklist e songs; confirmar que todos os endpoints de escrita aceitam JWT de usuário autorizado (DEC-003 fechado); confirmar remoção de ADMIN_KEY do mobile fonte (Q-003 fechado).
- Feito:
  - **`checklist-runs.controller.ts`**: removido `adminApiKey` e `assertWriteAccess` inline; substituídos por `await this.authService.assertAdminKeyOrContentManager(authorization)` diretamente nas actions `PUT` e `PATCH`.
  - **`checklist-templates.controller.ts`**: idem — removido `adminApiKey` e `assertWriteAccess`; delegado para `authService` em `POST`, `PATCH`, `DELETE`.
  - **`songs.controller.ts`**: removido `adminApiKey` e lógica inline de `assertWriteAccess`; método agora é thin wrapper que delega para `authService.assertAdminKeyOrContentManager`.
  - Confirmado que `apps/mobile/src/**` não contém nenhuma referência a `ADMIN_API_KEY` (grep vazio) — Q-003 já estava resolvido na fonte, pendente apenas rebuild do APK.
  - Events, setlist, organizations e todos os demais controllers de escrita já usam `assertAdminKeyOrContentManager` via `auth.service.ts`.
- Arquivos:
  - `apps/api/src/checklist/checklist-runs.controller.ts` (assertWriteAccess inline removido)
  - `apps/api/src/checklist/checklist-templates.controller.ts` (idem)
  - `apps/api/src/songs/songs.controller.ts` (adminApiKey removido, assertWriteAccess delegada)
- Validação: `get_errors` nos 3 arquivos → 0 erros TS.
- Pendências: rebuild APK mobile (EAS build); rebuild Docker images + deploy produção; Google OAuth GCP (manual).
- Próximo passo: rebuild Docker images e push para GHCR (CI/CD via push em `main`), ou rebuild APK com EAS CLI.

---

### [2026-04-04 — GitHub Copilot (Claude Sonnet 4.6)] — packages/parser populado (DEC-004)
- Objetivo: DEC-004 — extrair `parseChordTxt` do `apps/api` para o pacote compartilhado `packages/parser`, usando os tipos de `@overflow/types`, eliminando duplicação e habilitando uso direto no mobile.
- Feito:
  - **`packages/parser/package.json`** (CRIADO): pacote `@overflow/parser`, versão 0.1.0, depende de `@overflow/types: *`.
  - **`packages/parser/tsconfig.json`** (CRIADO): mesma configuração do `packages/types` (target ES2020, moduleResolution bundler, strict).
  - **`packages/parser/index.ts`** (CRIADO): toda a lógica do parser extraída de `apps/api/src/songs/chord-txt-parser.ts`. Usa tipos compartilhados de `@overflow/types` (`ParsedChart`, `SongSection`, `SongSectionLine`) em vez dos tipos privados anteriores. Exporta `parseChordTxt(rawInput: string): ParsedChart`.
  - **`apps/api/src/songs/chord-txt-parser.ts`** (MODIFICADO): substituído por barrel de re-export — `export { parseChordTxt } from "@overflow/parser"` + `export type { ParsedChart as ParsedChordTxt } from "@overflow/parser"`. Sem quebra em `songs.service.ts` nem `chord-txt-parser.test.ts`.
  - **`apps/api/package.json`** (MODIFICADO): adicionados `"@overflow/parser": "*"` e `"@overflow/types": "*"` nas dependencies.
  - `npm install` executado na raiz para registrar o pacote no workspace.
- Arquivos:
  - `packages/parser/package.json` (CRIADO)
  - `packages/parser/tsconfig.json` (CRIADO)
  - `packages/parser/index.ts` (CRIADO)
  - `apps/api/src/songs/chord-txt-parser.ts` (barrel re-export)
  - `apps/api/package.json` (deps @overflow/parser + @overflow/types)
- Validação: `get_errors` em `packages/parser/index.ts`, `chord-txt-parser.ts`, `songs.service.ts`, `chord-txt-parser.test.ts` → 0 erros TS.
- Pendências: rebuild APK mobile; rebuild Docker images + deploy produção; Google OAuth GCP (manual). Mobile pode usar `@overflow/parser` direto se/quando precisar renderizar cifras localmente.
- Próximo passo: Merge `develop` → `main` para disparar CI/CD pipeline (rebuild Docker + deploy Hostinger), ou adicionar `@overflow/parser` no mobile para renderização local de cifras.

---

### [2026-04-04 — GitHub Copilot (Claude Sonnet 4.6)] — Refresh Token Silencioso (Q-004)
- Objetivo: Eliminar logout surpresa a cada 7 dias implementando renovação silenciosa de token no mobile.
- Feito:
  - **API — `auth.service.ts`**: adicionado método `refreshAccessToken(currentToken)` — verifica JWT, busca usuário no DB, emite novo JWT com TTL fresco (7d). Throws `UnauthorizedException` se token inválido, expirado ou usuário não aprovado.
  - **API — `auth.controller.ts`**: adicionado `POST /api/auth/refresh` com `@Throttle({ auth: { limit: 10, ttl: 60000 } })` — aceita `Authorization: Bearer <token>`, retorna `{ ok, accessToken, user }`.
  - **Mobile — `api.ts`**: 
    - Adicionadas funções `setTokenHandlers(getter, setter)` e `isTokenExpiringSoon(token, withinSeconds=172800)`.
    - `authFetch` agora intercepta 401: tenta `POST /api/auth/refresh` com token armazenado; se OK, persiste novo token e faz retry da requisição original; se falha, chama `onUnauthorized`.
    - Adicionado `refreshAccessToken(currentToken)` para uso proativo pelo `SessionContext`.
  - **Mobile — `SessionContext.tsx`**:
    - Registra `setTokenHandlers` com `AsyncStorage.getItem/setItem` no `useEffect` (junto com `setUnauthorizedHandler`).
    - `bootstrapSession` agora checa `isTokenExpiringSoon` (< 2 dias para expirar) → chama `refreshAccessToken` silenciosamente antes de `fetchMe`, persiste novo token.
- Arquivos:
  - `apps/api/src/auth/auth.service.ts` (refreshAccessToken method)
  - `apps/api/src/auth/auth.controller.ts` (POST /api/auth/refresh)
  - `apps/mobile/src/lib/api.ts` (setTokenHandlers, isTokenExpiringSoon, authFetch com retry, refreshAccessToken)
  - `apps/mobile/src/context/SessionContext.tsx` (handlers registrados, proactive refresh no bootstrap)
- Validação: `get_errors` em todos 4 arquivos → 0 erros TS.
- Pendências: rebuild APK mobile (EAS build); rebuild Docker images + deploy produção; Google OAuth GCP (manual).
- Próximo passo: push `develop` → `main` para disparar CI/CD (rebuild Docker + deploy Hostinger), ou rebuild APK mobile com EAS CLI.

---


- Objetivo: Fase 6 (cont.) — Dashboard real na home do web app com dados ao vivo da API.
- Feito:
  - Reescrito `apps/web/app/page.tsx` (Server Component async): busca em paralelo `GET /api/admin/dashboard` (stats: pendingUsers, totalUsers, totalEvents, upcomingEvents, totalSongs, totalChecklists) e `GET /api/events?limit=5` (próximo evento) via `serverApiFetch` (autenticação admin server-side).
  - Header do dashboard agora exibe badges ao vivo: ⚠ pendentes (link para /admin/users, vermelho se > 0), próximos eventos, total músicas, membros, checklists.
  - Card "Próximo Evento" em destaque (fundo verde escuro) exibindo título + data localizada (pt-BR) + localização, linkando para /events. Pega o primeiro evento com dateTime >= now ou, fallback, o primeiro evento da lista.
  - Cards de navegação agora exibem dado contextual: "Aprovação de Usuários" mostra count de pendentes em vermelho; "Equipe" mostra total de membros ativos.
  - Fallback silencioso se API indisponível (stats null → mostra "stats indisponíveis", sem crash).
- Arquivos:
  - `apps/web/app/page.tsx` (reescrito — was: nav hub estático; now: async RSC com dados ao vivo)
- Validação: `get_errors` → 0 erros TS.
- Pendências: rebuild imagens Docker; rebuild APK mobile; Google OAuth GCP (manual).
- Próximo passo: Dashboard mobile — tela inicial com resumo do próximo evento e status rápido (ou push notifications refinadas).

---


- Objetivo: Fase 6 — Hardening/go-live: health endpoint real, healthchecks no compose, segurança de containers.
- Feito:
  - Aprimorado `apps/api/src/app.controller.ts`: injetados `PrismaService` e `QueueService`; `GET /health` e `GET /api/health` agora retornam `{ ok, service, version, db: "up"|"down", redis: "up"|"down" }` com verificação real (Prisma `SELECT 1` + `redis.ping()`).
  - Adicionado `isRedisHealthy()` em `apps/api/src/notifications/queue.service.ts`: faz `IORedis.ping()` e retorna `boolean`; graceful (não lança exceção).
  - Adicionado healthcheck para `api` em `docker-compose.yml`: `wget -qO- http://localhost:3001/health | grep '"ok":true'`, interval 10s, retries 5, start_period 30s.
  - Adicionado healthcheck para `web` em `docker-compose.yml`: `wget -qO- http://localhost:3000/`, interval 15s, retries 3, start_period 30s. `web` agora depende de `api` com `condition: service_healthy`.
  - Adicionadas vars `SMTP_HOST/PORT/USER/PASS/FROM` ao serviço `worker` em `docker-compose.yml` — estas estavam faltando, impossibilitando envio de e-mail pelo worker em produção.
  - Hardened `apps/api/Dockerfile` (final stage): adicionado `addgroup -S app && adduser -S app -G app && chown -R app:app /app` + `USER app` — container da API agora roda sem privilégios de root.
  - Hardened `apps/worker/Dockerfile`: adicionado mesmo padrão de usuário não-root (`USER app`).
- Arquivos:
  - `apps/api/src/app.controller.ts` (injeção PrismaService+QueueService, health assíncrono com DB+Redis)
  - `apps/api/src/notifications/queue.service.ts` (isRedisHealthy adicionado)
  - `docker-compose.yml` (healthchecks api/web, vars SMTP worker, web depends api healthy)
  - `apps/api/Dockerfile` (usuário não-root)
  - `apps/worker/Dockerfile` (usuário não-root)
- Validação: `get_errors` em `app.controller.ts` e `queue.service.ts` → 0 erros TS.
- Pendências: rebuild de imagens Docker (API + worker + web); rebuild APK mobile (acumulado Fases 1-5); Google OAuth GCP (manual).
- Próximo passo: go-live validação — após rebuild/deploy, verificar `https://music.overflowmvmt.com/api/health` retorna `{"ok":true,"db":"up","redis":"up"}` e CI/CD confirma rollout via `/api/admin/auth/check`.

---

### [2025-07-14 — GitHub Copilot (Claude Sonnet 4.6)] — Worker BullMQ/Redis
- Objetivo: Fase 5 — Worker real com BullMQ/Redis (substituir placeholder de heartbeat).
- Feito:
  - Reescrito `apps/worker/src/worker.js`: BullMQ `Worker` consumindo filas `overflow.push` (push notifications Expo, `concurrency: 3`, 3 tentativas, backoff exponencial) e `overflow.email` (SMTP via nodemailer, `concurrency: 2`, 3 tentativas). Graceful shutdown via SIGTERM/SIGINT. SMTP opcional (só ativa se `SMTP_HOST` declarado).
  - Atualizado `apps/worker/package.json`: adicionado deps `bullmq ^5.51.0`, `ioredis ^5.6.1`, `nodemailer ^6.9.17`. Versão bumped para 0.2.0.
  - Corrigido `apps/worker/Dockerfile`: adicionado `RUN npm install --omit=dev` (antes era missing, deps nunca eram instaladas em build).
  - Criado `apps/api/src/notifications/queue.service.ts`: `QueueService` injectable; conecta ao Redis via `process.env.REDIS_URL`; expõe `enqueuePush()` e `enqueueEmail()`; graceful via `OnModuleDestroy`; retorna `false` (não lança) se Redis indisponível.
  - Modificado `apps/api/src/notifications/notifications.service.ts`: injeta `QueueService`; `sendToAll()` tenta enfileirar primeiro — se queue indisponível (`false`), cai no fallback síncrono anterior (zero downtime).
  - Atualizado `apps/api/src/app.module.ts`: adicionado `QueueService` em `providers`.
  - Instalado `bullmq` + `ioredis` em `apps/api` via `npm install`.
- Arquivos:
  - `apps/worker/src/worker.js` (reescrito)
  - `apps/worker/package.json` (deps adicionadas)
  - `apps/worker/Dockerfile` (npm install adicionado)
  - `apps/api/src/notifications/queue.service.ts` (CRIADO)
  - `apps/api/src/notifications/notifications.service.ts` (QueueService injetado + enqueue com fallback)
  - `apps/api/src/app.module.ts` (QueueService registrado)
- Validação: `get_errors` em todos os arquivos TS modificados → 0 erros.
- Pendências: rebuild de imagens Docker (API + worker) para ativar em produção; rebuild APK mobile (Fases 1-5).
- Próximo passo: Hardening / go-live (Fase 6 original): testes E2E, observabilidade, checklist de deploy.

---

### [2025-07-14 — GitHub Copilot (Claude Sonnet 4.6)] — Perfil/Conta Web
- Objetivo: Fase 5 — Perfil/conta de usuário na web (editar nome, visualizar e-mail e role).
- Feito:
  - Adicionado `PATCH` em `apps/web/app/api/auth/me/route.ts`: valida token no cookie, encaminha para `PATCH /api/auth/me` do backend com `authMode: "user"`.
  - Criado `apps/web/app/profile/page.tsx`: client component, carrega sessão via `/api/auth/me`, exibe e-mail e role (read-only com badges coloridos por role), formulário para editar nome com feedback de sucesso/erro e auto-clear após 4s, redireciona para `/login` se sessão inválida.
  - Alterado `apps/web/components/GlobalHeader.tsx`: substituiu `<p>` com nome/role por `<Link href="/profile">` clicável, com classe `active` no pathname `/profile`.
- Arquivos:
  - `apps/web/app/api/auth/me/route.ts` (PATCH adicionado antes do GET existente)
  - `apps/web/app/profile/page.tsx` (CRIADO)
  - `apps/web/components/GlobalHeader.tsx` (link para /profile)
- Validação: `get_errors` nos 3 arquivos → 0 erros TS.
- Pendências: rebuild APK mobile (Fases 1-5 acumuladas), Google OAuth no GCP (manual), Worker BullMQ.
- Próximo passo: Worker real com BullMQ/Redis (substituir worker.js atual).

---

### [2025-07-14 — GitHub Copilot (Claude Sonnet 4.6)]
- Objetivo: Fase 5 — Modo Apresentação Mobile (uso em palco, fullscreen, swipe, cifras).
- Feito:
  - Criado `apps/mobile/app/present.tsx`: tela fullscreen dark mode, StatusBar hidden, swipe left/right (PanResponder), pills de navegação, auto-hide nav após 3s, chips de tom/líder/zona, notas de transição, lazy load de cifra via fetchSongs+fetchSongById com cache por título.
  - Adicionado botão "▶ Apresentar" no `EventsScreen.tsx` (após "Compartilhar Setlist"), navega para `/present` via `router.push`. Importado `useRouter` de expo-router.
  - Corrigido guard de auth em `app/_layout.tsx`: redirect `user && !inTabs` foi refinado para só redirecionar do `/login` (não de `/present`). Unauthenticated em `/present` → `/login`.
  - Registrado `<Stack.Screen name="present" options={{ presentation: "fullScreenModal" }} />` no Stack root.
- Arquivos:
  - `apps/mobile/app/present.tsx` (CRIADO)
  - `apps/mobile/src/screens/EventsScreen.tsx` (modificado: import useRouter, const router, botão Apresentar)
  - `apps/mobile/app/_layout.tsx` (modificado: auth guard refinado, Stack.Screen present modal)
- Validação: `get_errors` em todos os 3 arquivos → 0 erros TS.
- Pendências: rebuild APK (Fases 1-5 acumuladas), Google OAuth manual no GCP.
- Próximo passo: Perfil/conta na web (`/profile` page no web app) ou Worker BullMQ/Redis.

---

### [2026-04-03 14:40 America/Recife] - Codex
- Objetivo: Criar sistema de instruções para agentes de IA e fluxo multi-LLM antes da implementação.
- Feito:
  - Criado `AGENTS.md` com regras operacionais e padrão de saída.
  - Criado `docs/LLM_WORKFLOW.md` com método de trabalho em ciclo curto.
  - Criado este `docs/DEV_LOG.md` com template de handoff.
  - Documento de projeto já existente mantido como referência principal.
- Arquivos:
  - `AGENTS.md`
  - `docs/LLM_WORKFLOW.md`
  - `docs/DEV_LOG.md`
- Validação:
  - Arquivos criados com estrutura Markdown válida.
- Pendências:
  - Criar `docs/TECH_DECISIONS.md` e `docs/OPEN_QUESTIONS.md`.
  - Iniciar implementação técnica (scaffold monorepo + docker).
- Próximo passo:
  - Definir e registrar DEC-001 (stack final e estratégia inicial de scaffold).

### [2026-04-03 14:42 America/Recife] - Codex
- Objetivo: Completar base de governança multi-LLM com registros de decisão e dúvidas.
- Feito:
  - Criado `docs/TECH_DECISIONS.md` com estrutura de DEC.
  - Criado `docs/OPEN_QUESTIONS.md` com questão inicial de escopo MVP.
- Arquivos:
  - `docs/TECH_DECISIONS.md`
  - `docs/OPEN_QUESTIONS.md`
- Validação:
  - Arquivos criados e legíveis.
- Pendências:
  - Definir DEC-001 (stack final) antes do scaffold técnico.
- Próximo passo:
  - Iniciar implementação pelo setup base (monorepo + docker + CI).

### [2026-04-03 14:46 America/Recife] - Codex
- Objetivo: Iniciar implementação técnica com scaffold monorepo e base DevOps/Deploy.
- Feito:
  - Criado scaffold de monorepo com `apps/api`, `apps/web`, `apps/worker`.
  - Implementados serviços placeholder funcionais para API, Web e Worker.
  - Criados Dockerfiles dos 3 serviços.
  - Criado `docker-compose.yml` de produção para Hostinger (nginx, certbot, api, web, worker, postgres, redis).
  - Criado `nginx/conf.d/app.conf` para domínio `music.overflowmvmt.com` com roteamento web/api.
  - Criados scripts `deploy.sh` e `init-letsencrypt.sh`.
  - Criado workflow `.github/workflows/deploy-hostinger.yml` com build/push GHCR e deploy na Hostinger.
  - Registradas DEC-001 e DEC-002 em `docs/TECH_DECISIONS.md`.
- Arquivos:
  - `package.json`, `.gitignore`, `.env.example`, `README.md`
  - `apps/api/*`, `apps/web/*`, `apps/worker/*`
  - `docker-compose.yml`
  - `nginx/conf.d/app.conf`
  - `deploy.sh`, `init-letsencrypt.sh`
  - `.github/workflows/deploy-hostinger.yml`
  - `docs/TECH_DECISIONS.md`
- Validação:
  - Verificação estática manual dos arquivos de configuração.
  - Não foi possível rodar validação de runtime porque o ambiente atual não possui `node` e `docker` instalados.
- Pendências:
  - Migrar placeholders para Next.js/NestJS.
  - Adicionar healthchecks mais completos e rotas de autenticação real.
  - Testar deploy real na VPS com secrets configurados.
- Próximo passo:
  - Implementar fase 2: substituir `apps/api` por NestJS mantendo endpoint `/api/admin/auth/check` compatível com o pipeline.

### [2026-04-03 — GitHub Copilot / Claude Sonnet]
- Objetivo: Implementar módulo de Eventos e Setlist — web pages + mobile tab + rotas proxy API.
- Feito:
  - `apps/web/app/api/events/route.ts` — proxy GET (list) + POST (create).
  - `apps/web/app/api/events/[eventId]/route.ts` — proxy GET + PATCH + DELETE.
  - `apps/web/app/api/events/[eventId]/setlist/route.ts` — proxy GET + PUT.
  - `apps/web/app/api/events/[eventId]/setlist/items/route.ts` — proxy POST.
  - `apps/web/app/api/events/[eventId]/setlist/items/[itemId]/route.ts` — proxy PATCH + DELETE.
  - `apps/web/app/events/page.tsx` — listagem + criação de eventos.
  - `apps/web/app/events/[eventId]/page.tsx` — detalhe do evento + setlist (add/remove itens).
  - `apps/web/app/page.tsx` — card "Eventos & Setlist" adicionado.
  - `apps/mobile/src/types.ts` — adicionado `MusicEvent`, `SetlistItem`, `EventSetlist`.
  - `apps/mobile/src/lib/api.ts` — adicionado `fetchEvents`, `fetchEventSetlist`.
  - `apps/mobile/src/screens/EventsScreen.tsx` — novo componente (lista eventos + setlist).
  - `apps/mobile/src/components/BottomTabs.tsx` — tab "Eventos" adicionada.
  - `apps/mobile/App.tsx` — estado e lógica de eventos/setlist integrados.
- Arquivos alterados: 13 arquivos (todos listados acima).
- Validação: TypeScript sem erros em todos os arquivos novos/alterados.
- Pendências:
  - Reordenação de itens do setlist via drag-and-drop (web + mobile).
  - Gestão de usuários/aprovação pelo admin (tela web admin users).
  - Testes e2e dos endpoints de eventos/setlist.
- Próximo passo:
  - Criar tela de gestão de usuários pendentes (`/admin/users`) no web para aprovação de novos logins Google.

### [2026-04-03 — GitHub Copilot / Claude Sonnet]
- Objetivo: Criar módulo de aprovação de usuários admin no web.
- Feito:
  - `apps/web/app/api/admin/users/pending/route.ts` — proxy GET lista pendentes.
  - `apps/web/app/api/admin/users/[userId]/approve/route.ts` — proxy POST aprovar.
  - `apps/web/app/api/admin/users/[userId]/reject/route.ts` — proxy POST rejeitar.
  - `apps/web/app/admin/users/page.tsx` — tela com lista de pendentes, seletor de role e botões aprovar/rejeitar.
  - `apps/web/app/page.tsx` — card "Aprovação de Usuários" adicionado na home.
- Arquivos alterados: 5 arquivos.
- Validação: TypeScript sem erros em todos os arquivos.
- Pendências:
  - Reordenação drag-and-drop do setlist (web + mobile).
  - Mobile: tela de aprovação não é necessária (operação admin fica no web).
  - Testes e2e das rotas de admin.
- Próximo passo:
  - Implementar reordenação de itens do setlist (web): arrastar e soltar com botões ↑↓ como fallback acessível.

### [2026-04-03 — GitHub Copilot / Claude Sonnet]
- Objetivo: Adicionar reordenação de itens do setlist com botões ↑↓ na web.
- Feito:
  - `apps/web/app/api/events/[eventId]/setlist/reorder/route.ts` — proxy POST para endpoint de reorder.
  - `apps/web/app/events/[eventId]/page.tsx` — estado `reorderingId`, função `moveItem`, botões ▲▼ acessíveis por item, feedback visual de estado busy/moving, status movido para acima do form.
- Arquivos alterados: 2 arquivos.
- Validação: TypeScript sem erros.
- Pendências:
  - Modo apresentação do setlist (fullscreen sem distrações).
  - Gestão de organizações/equipes (cad. de membros, funções).
  - Testes e2e.
- Próximo passo:
  - Criar modo de apresentação do setlist: `/events/[eventId]/present` — tela fullscreen, fonte grande, navegação por teclado/swipe entre músicas.

### [2026-04-03 14:49 America/Recife] - Codex
- Objetivo: Validar ambiente local após abertura do Docker.
- Feito:
  - Confirmado `docker` e `docker compose` funcionais via caminho absoluto.
  - Confirmado `node` funcional via `/opt/homebrew/bin/node`.
  - Validado `docker-compose.yml` com `docker compose config` (ok, com warnings esperados por variáveis não definidas).
  - Build local das imagens concluído com sucesso:
    - `overflow-test-api:local`
    - `overflow-test-web:local`
    - `overflow-test-worker:local`
- Arquivos:
  - `docs/DEV_LOG.md`
- Validação:
  - Build Docker completo executado com sucesso.
  - Teste de bind de porta local via Node não permitido no sandbox (`EPERM`), sem impacto no deploy real em VPS.
- Pendências:
  - Definir `.env` de produção no Hostinger/GitHub Secrets.
  - Migrar placeholders para Next.js/NestJS.
- Próximo passo:
  - Iniciar migração do `apps/api` para NestJS mantendo endpoint `/api/admin/auth/check`.

### [2026-04-03 14:51 America/Recife] - Codex
- Objetivo: Migrar `apps/api` de placeholder Node HTTP para NestJS mantendo compatibilidade de endpoints.
- Feito:
  - API migrada para NestJS com TypeScript.
  - Endpoints mantidos:
    - `GET /health`
    - `GET /api/health`
    - `GET /api/admin/auth/check` (Bearer `ADMIN_API_KEY`).
  - Atualizado Dockerfile da API para build multi-stage (`npm install` + `tsc` + runtime em `dist`).
  - Removido arquivo antigo `apps/api/src/server.js`.
- Arquivos:
  - `apps/api/package.json`
  - `apps/api/tsconfig.json`
  - `apps/api/tsconfig.build.json`
  - `apps/api/src/main.ts`
  - `apps/api/src/app.module.ts`
  - `apps/api/src/app.controller.ts`
  - `apps/api/Dockerfile`
- Validação:
  - Build da imagem NestJS concluído com sucesso: `overflow-test-api:nest`.
- Pendências:
  - Tratar vulnerabilidades reportadas pelo `npm audit` no build da API.
  - Migrar `apps/web` para Next.js.
- Próximo passo:
  - Iniciar migração de `apps/web` para Next.js mantendo Dockerfile e variáveis de ambiente de produção.

### [2026-04-03 15:19 America/Recife] - Codex
- Objetivo: Migrar `apps/web` para Next.js e validar build Docker.
- Feito:
  - `apps/web` migrado para Next.js (App Router) com TypeScript.
  - Criados arquivos base (`app/layout.tsx`, `app/page.tsx`, `next.config.mjs`, `tsconfig.json`).
  - Dockerfile do web atualizado para build multi-stage e runtime standalone.
  - Erro de tipagem (`JSX.Element`) corrigido.
  - Build Docker validado com sucesso em versão inicial (`overflow-test-web:next`).
  - Dependência do Next atualizada para `16.2.2`.
- Arquivos:
  - `apps/web/package.json`
  - `apps/web/next.config.mjs`
  - `apps/web/tsconfig.json`
  - `apps/web/next-env.d.ts`
  - `apps/web/app/layout.tsx`
  - `apps/web/app/page.tsx`
  - `apps/web/Dockerfile`
- Validação:
  - Build `overflow-test-web:next` passou.
  - Rebuild após upgrade para `next@16.2.2` ficou bloqueado por instabilidade do Docker daemon (comando sem retorno).
- Pendências:
  - Reexecutar build do web com Next 16 assim que o Docker daemon estabilizar.
  - Migrar `apps/worker` para worker com fila real (BullMQ/Redis) nas próximas fases.
- Próximo passo:
  - Fechar estabilização do build web Next 16 e avançar para autenticação Google + aprovação admin na API NestJS.

### [2026-04-03 15:30 America/Recife] - Codex
- Objetivo: Continuar implementação com autenticação/aprovação no backend e estabilização de build local.
- Feito:
  - Implementado fluxo de autenticação base no NestJS (modo bootstrap):
    - `POST /api/auth/google`
    - `GET /api/auth/me`
    - `GET /api/admin/users/pending`
    - `POST /api/admin/users/:userId/approve`
    - `POST /api/admin/users/:userId/reject`
  - Mantida compatibilidade do CI/CD com `GET /api/admin/auth/check`.
  - Implementado token assinado HS256 interno para sessão de usuário aprovado.
  - Adicionado seed opcional de admins via `ADMIN_APPROVED_EMAILS`.
  - Ajustado `next.config.mjs` com `turbopack.root` para eliminar aviso de múltiplos lockfiles.
  - Atualizados `.env.example`, `.gitignore`, `README.md` e `docs/OPEN_QUESTIONS.md`.
- Arquivos:
  - `apps/api/src/auth/auth.types.ts`
  - `apps/api/src/auth/auth.service.ts`
  - `apps/api/src/auth/auth.controller.ts`
  - `apps/api/src/app.module.ts`
  - `apps/api/src/app.controller.ts`
  - `apps/web/next.config.mjs`
  - `.env.example`
  - `.gitignore`
  - `README.md`
  - `docs/OPEN_QUESTIONS.md`
- Validação:
  - `apps/api`: `npm run build` OK.
  - `apps/web`: `npm run build` OK com Next 16.2.2.
  - Docker daemon segue intermitente para algumas validações de imagem neste ambiente.
- Pendências:
  - Trocar login bootstrap por validação real de `idToken` Google no backend.
  - Persistir usuários/aprovações em banco (atualmente em memória).
- Próximo passo:
  - Implementar camada de persistência (Prisma + PostgreSQL) para usuários e aprovações.

### [2026-04-03 15:34 America/Recife] - Codex
- Objetivo: Implementar persistência real de autenticação/aprovação com Prisma + PostgreSQL.
- Feito:
  - Configurado Prisma ORM na API.
  - Criado schema inicial com `User`, `UserRole`, `UserStatus`.
  - Criado `PrismaModule` e `PrismaService` para injeção global no NestJS.
  - Refatorado `AuthService` para usar PostgreSQL (find/create/update/upsert) em vez de memória.
  - Mantidos endpoints existentes de health e CI/CD.
  - Atualizados `package.json` e Dockerfile da API para incluir geração do Prisma Client.
  - Atualizados `.env.example` e `README.md` para refletir persistência e scripts Prisma.
- Arquivos:
  - `apps/api/prisma/schema.prisma`
  - `apps/api/src/prisma/prisma.module.ts`
  - `apps/api/src/prisma/prisma.service.ts`
  - `apps/api/src/auth/auth.service.ts`
  - `apps/api/src/auth/auth.controller.ts`
  - `apps/api/src/app.module.ts`
  - `apps/api/package.json`
  - `apps/api/Dockerfile`
  - `.env.example`
  - `README.md`
- Validação:
  - `apps/api`: `npm install` OK.
  - `apps/api`: `npm run prisma:generate` OK.
  - `apps/api`: `npm run build` OK.
- Pendências:
  - Executar `npm run prisma:push` em ambiente com `DATABASE_URL` apontando para o PostgreSQL real.
  - Implementar validação real de `idToken` Google no backend.
- Próximo passo:
  - Conectar a API ao banco do `docker-compose` e aplicar schema com `prisma db push` na esteira de deploy.

### [2026-04-03 15:36 America/Recife] - Codex
- Objetivo: Substituir login bootstrap por validação real de idToken Google no backend.
- Feito:
  - Adicionado `google-auth-library` na API.
  - `POST /api/auth/google` agora valida `idToken` com `GOOGLE_CLIENT_ID`.
  - Adicionado controle de domínio opcional via `GOOGLE_ALLOWED_DOMAIN`.
  - Mantido modo bootstrap apenas por flag (`AUTH_BOOTSTRAP_MODE=true`) para desenvolvimento.
  - Propagadas novas variáveis em `docker-compose.yml` e workflow de deploy Hostinger.
  - Atualizados README e OPEN_QUESTIONS.
- Arquivos:
  - `apps/api/src/auth/auth.controller.ts`
  - `apps/api/package.json`
  - `.env.example`
  - `docker-compose.yml`
  - `.github/workflows/deploy-hostinger.yml`
  - `README.md`
  - `docs/OPEN_QUESTIONS.md`
- Validação:
  - `apps/api`: `npm install` OK.
  - `apps/api`: `npm run prisma:generate` OK.
  - `apps/api`: `npm run build` OK.
- Pendências:
  - Executar `prisma db push` no ambiente conectado ao PostgreSQL real.
  - Evoluir emissão de JWT para biblioteca dedicada e refresh token.
- Próximo passo:
  - Integrar setlist/eventos no banco com Prisma e iniciar endpoints CRUD do MVP.

### [2026-04-03 15:38 America/Recife] - Codex
- Objetivo: Implementar CRUD de eventos e setlist no MVP da API.
- Feito:
  - Schema Prisma expandido com `Event`, `Setlist`, `SetlistItem` e enum `EventStatus`.
  - Implementados endpoints de eventos (`GET/POST/PATCH/DELETE`).
  - Implementados endpoints de setlist por evento (obter, upsert, adicionar item, atualizar item, remover item, reorder).
  - Proteção de escrita via `ADMIN_API_KEY` mantida.
  - `AppModule` atualizado com novos controllers/services.
  - README atualizado com novos endpoints.
- Arquivos:
  - `apps/api/prisma/schema.prisma`
  - `apps/api/src/events/events.controller.ts`
  - `apps/api/src/events/events.service.ts`
  - `apps/api/src/setlist/setlist.controller.ts`
  - `apps/api/src/setlist/setlist.service.ts`
  - `apps/api/src/app.module.ts`
  - `README.md`
- Validação:
  - `apps/api`: `npm run prisma:generate` OK.
  - `apps/api`: `npm run build` OK.
- Pendências:
  - Aplicar schema no banco real (`npm run prisma:push` com `DATABASE_URL` válido).
  - Adicionar testes automatizados para fluxo de eventos/setlist.
- Próximo passo:
  - Implementar módulo de músicas/cifras e endpoint de importação `.txt` com parser estruturado.

### [2026-04-03 15:41 America/Recife] - Codex
- Objetivo: Implementar módulo de músicas/cifras com importação de `.txt`.
- Feito:
  - Schema Prisma expandido com `Song`, `ChordChart` e enum `ChordChartSourceType`.
  - Criado parser de cifra `.txt` com estrutura por seções, linhas e dicionário de acordes.
  - Implementados endpoints de músicas:
    - `GET /api/songs`
    - `GET /api/songs/:id`
    - `GET /api/songs/:id/charts`
    - `POST /api/songs`
    - `PATCH /api/songs/:id`
    - `DELETE /api/songs/:id`
    - `POST /api/songs/import/txt`
  - Import `.txt` cria nova versão de cifra (`version`) em `ChordChart`.
  - `AppModule` atualizado para incluir `SongsController` e `SongsService`.
  - README atualizado com endpoints novos.
- Arquivos:
  - `apps/api/prisma/schema.prisma`
  - `apps/api/src/songs/chord-txt-parser.ts`
  - `apps/api/src/songs/songs.service.ts`
  - `apps/api/src/songs/songs.controller.ts`
  - `apps/api/src/app.module.ts`
  - `README.md`
- Validação:
  - `apps/api`: `npm run prisma:generate` OK.
  - `apps/api`: `npm run build` OK.
- Pendências:
  - Aplicar schema em banco real (`npm run prisma:push`).
  - Adicionar testes automatizados para parser e endpoints de importação.
- Próximo passo:
  - Conectar upload de arquivo no endpoint (multipart/form-data) e incluir validação de tamanho/MIME.

### [2026-04-03 15:43 America/Recife] - Codex
- Objetivo: Adicionar upload real de arquivo `.txt` para importação de cifra.
- Feito:
  - Implementado endpoint multipart: `POST /api/songs/import/txt/file`.
  - Upload usa `FileInterceptor` com limite de 1MB.
  - Validação de arquivo:
    - obrigatório
    - extensão `.txt`
    - MIME permitido (`text/plain` e `application/octet-stream`)
    - tamanho máximo 1MB
  - Conteúdo do arquivo convertido para UTF-8 e processado pelo parser existente.
  - README atualizado com novo endpoint.
- Arquivos:
  - `apps/api/src/songs/songs.controller.ts`
  - `README.md`
- Validação:
  - `apps/api`: `npm run build` OK.
- Pendências:
  - Adicionar testes automatizados para parser e upload multipart.
  - Refinar validação de encoding e mensagens de erro padronizadas.
- Próximo passo:
  - Implementar suíte de testes para `chord-txt-parser` e endpoints de importação.

### [2026-04-03 15:46 America/Recife] - Codex
- Objetivo: Implementar testes automatizados para parser `.txt` e validação de upload.
- Feito:
  - Criado validador reutilizável de upload `.txt` (`validateTxtUpload`).
  - Refatorado controller para usar o validador dedicado.
  - Criados testes unitários:
    - `chord-txt-parser.test.ts`
    - `txt-upload-validator.test.ts`
  - Adicionado script de testes em `apps/api`: `npm test` com `tsx --test`.
  - README atualizado com comando de teste.
- Arquivos:
  - `apps/api/src/songs/txt-upload-validator.ts`
  - `apps/api/src/songs/songs.controller.ts`
  - `apps/api/src/songs/chord-txt-parser.test.ts`
  - `apps/api/src/songs/txt-upload-validator.test.ts`
  - `apps/api/package.json`
  - `README.md`
- Validação:
  - `apps/api`: `npm test` OK (5/5).
  - `apps/api`: `npm run build` OK.
- Pendências:
  - Adicionar testes de integração HTTP para endpoints de importação.
  - Melhorar parser para aceitar sintaxe de seção e cifra na mesma linha (ex.: `[Intro] F7M Em7`).
- Próximo passo:
  - Implementar testes de integração (supertest) para `POST /api/songs/import/txt` e `/api/songs/import/txt/file`.

### [2026-04-03 15:48 America/Recife] - Codex
- Objetivo: Adicionar testes de integração HTTP para importação de cifras.
- Feito:
  - Adicionados testes de integração com `@nestjs/testing` + `supertest` para:
    - `POST /api/songs/import/txt` (401 e 201)
    - `POST /api/songs/import/txt/file` (400 e 201)
  - Ajustado setup do teste com metadata explícita de DI para `SongsController`.
  - Atualizadas dependências de teste no `apps/api/package.json`.
- Arquivos:
  - `apps/api/src/songs/songs-import.integration.test.ts`
  - `apps/api/package.json`
- Validação:
  - `apps/api`: `npm test` OK (9/9).
  - `apps/api`: `npm run build` OK.
- Pendências:
  - Aplicar `prisma db push` no ambiente conectado ao PostgreSQL real.
  - Melhorar parser para seções com acordes na mesma linha (`[Intro] F7M Em7`).
- Próximo passo:
  - Implementar normalização avançada no parser e adicionar casos de teste para o formato do arquivo anexo completo.

### [2026-04-03 15:50 America/Recife] - Codex
- Objetivo: Melhorar parser para suportar seção + cifra na mesma linha.
- Feito:
  - Parser atualizado para reconhecer entradas como `[Intro] F7M Em7`.
  - Regex de detecção de acordes ajustada para suportar formatos como `F7M`.
  - Teste unitário específico adicionado e validado.
- Arquivos:
  - `apps/api/src/songs/chord-txt-parser.ts`
  - `apps/api/src/songs/chord-txt-parser.test.ts`
- Validação:
  - `apps/api`: `npm test` OK (10/10).
  - `apps/api`: `npm run build` OK.
- Pendências:
  - Aplicar `prisma db push` no ambiente conectado ao PostgreSQL real.
  - Evoluir parser para capturar metadados adicionais (bpm, tom sugerido, capo) quando presentes.
- Próximo passo:
  - Criar rota de preview de parser sem persistência para UX de revisão antes de salvar.

### [2026-04-03 15:53 America/Recife] - Codex
- Objetivo: Evoluir parser `.txt` para metadados musicais e aplicar no fluxo de importação.
- Feito:
  - Parser atualizado para extrair metadados quando presentes: `Tom/Key`, `BPM`, `Capo`.
  - `parseChordTxt` agora retorna `metadata` junto com seções e dicionário de acordes.
  - `SongsService.importTxt` ajustado para preencher `defaultKey` automaticamente ao criar música nova sem `songId`, usando `metadata.suggestedKey`.
  - Teste unitário do parser adicionado para cobertura de metadados.
  - Teste unitário do serviço adicionado para garantir preenchimento de `defaultKey` no import.
  - README atualizado com comportamento do parser/import.
- Arquivos:
  - `apps/api/src/songs/chord-txt-parser.ts`
  - `apps/api/src/songs/songs.service.ts`
  - `apps/api/src/songs/chord-txt-parser.test.ts`
  - `apps/api/src/songs/songs.service.test.ts`
  - `README.md`
- Validação:
  - `apps/api`: `npm test` OK (14/14).
  - `apps/api`: `npm run build` OK.
- Pendências:
  - Aplicar schema no banco real (`npm run prisma:push`) com `DATABASE_URL` válido.
  - Iniciar integração do frontend (web/mobile) com rotas de preview/import de cifra.
- Próximo passo:
  - Implementar endpoints e modelo de checklist operacional (`ChecklistTemplate`, `ChecklistRun`, `ChecklistItemRun`) com CRUD inicial no backend.

### [2026-04-03 15:56 America/Recife] - Codex
- Objetivo: Implementar checklist operacional inicial no backend (templates + execução por evento).
- Feito:
  - Schema Prisma expandido com:
    - `ChecklistTemplate`
    - `ChecklistRun`
    - `ChecklistItemRun`
  - Implementado CRUD inicial de templates:
    - `GET /api/checklists/templates`
    - `POST /api/checklists/templates`
    - `PATCH /api/checklists/templates/:id`
    - `DELETE /api/checklists/templates/:id`
  - Implementado checklist por evento:
    - `GET /api/events/:eventId/checklist`
    - `PUT /api/events/:eventId/checklist`
    - `PATCH /api/events/:eventId/checklist/items/:itemId`
  - Regras básicas incluídas:
    - validação de `ADMIN_API_KEY` para escrita
    - validação de evento existente
    - criação de checklist por template ou lista customizada
    - atualização de item com `checked`, `checkedAt` e `checkedByName`
  - `AppModule` atualizado com novos controllers/services.
  - README atualizado com novos endpoints.
  - Adicionados testes de integração HTTP para endpoints de checklist.
- Arquivos:
  - `apps/api/prisma/schema.prisma`
  - `apps/api/src/checklist/checklist-templates.service.ts`
  - `apps/api/src/checklist/checklist-templates.controller.ts`
  - `apps/api/src/checklist/checklist-runs.service.ts`
  - `apps/api/src/checklist/checklist-runs.controller.ts`
  - `apps/api/src/checklist/checklist.integration.test.ts`
  - `apps/api/src/app.module.ts`
  - `README.md`
- Validação:
  - `apps/api`: `npm run prisma:generate` OK.
  - `apps/api`: `npm test` OK (19/19).
  - `apps/api`: `npm run build` OK.
- Pendências:
  - Aplicar schema no banco real (`npm run prisma:push`) com `DATABASE_URL` válido.
  - Integrar UI Web/Mobile para gestão de checklist e import preview.
- Próximo passo:
  - Implementar telas web iniciais para fluxo de checklist (templates e checklist do evento) consumindo as novas rotas.

### [2026-04-03 16:02 America/Recife] - Codex
- Objetivo: Implementar tela web inicial para fluxo de checklist consumindo as novas rotas da API.
- Feito:
  - Criada camada BFF no `apps/web` via rotas internas (`app/api/...`) para encaminhar chamadas ao backend com `ADMIN_API_KEY` no servidor.
  - Endpoints internos implementados:
    - `GET/POST /api/checklists/templates`
    - `PATCH/DELETE /api/checklists/templates/:id`
    - `GET/PUT /api/events/:eventId/checklist`
    - `PATCH /api/events/:eventId/checklist/items/:itemId`
  - Página principal (`/`) convertida para painel interativo de checklist com:
    - criação/seleção/remoção de templates
    - carregamento de checklist por `eventId`
    - criação de checklist por template ou lista customizada
    - toggle de itens concluídos com `checkedByName`
  - UI atualizada com visual mais moderno (gradientes, cards, tipografia e feedback de status).
  - `layout` atualizado para usar stylesheet global.
  - `docker-compose` atualizado para injetar `ADMIN_API_KEY` no container web (necessário para BFF).
  - README atualizado com requisitos de ambiente do web BFF.
- Arquivos:
  - `apps/web/lib/server-api.ts`
  - `apps/web/app/api/checklists/templates/route.ts`
  - `apps/web/app/api/checklists/templates/[id]/route.ts`
  - `apps/web/app/api/events/[eventId]/checklist/route.ts`
  - `apps/web/app/api/events/[eventId]/checklist/items/[itemId]/route.ts`
  - `apps/web/app/page.tsx`
  - `apps/web/app/layout.tsx`
  - `apps/web/app/globals.css`
  - `apps/web/tsconfig.json`
  - `docker-compose.yml`
  - `README.md`
- Validação:
  - `apps/web`: `npm run build` OK.
- Pendências:
  - Conectar tela web com fluxo de autenticação real (Google + sessão) ao invés de modo admin técnico.
  - Criar telas equivalentes no mobile (Expo) para checklist.
- Próximo passo:
  - Implementar UI web inicial de importação de cifra `.txt` com preview usando os endpoints de songs (`/import/txt/preview` e `/import/txt/file/preview`).

### [2026-04-03 16:04 America/Recife] - Codex
- Objetivo: Implementar UI web de importação/preview de cifra `.txt` (texto e arquivo) usando endpoints de preview.
- Feito:
  - Criadas rotas internas no Next (BFF):
    - `POST /api/songs/import/txt/preview`
    - `POST /api/songs/import/txt/file/preview`
  - `serverApiFetch` ajustado para suportar `FormData` sem forçar `Content-Type: application/json`.
  - Página principal expandida com card **Song TXT Preview** contendo:
    - preview via texto colado
    - preview via upload de arquivo `.txt`
    - exibição de resumo do parser (`title`, `artist`, `key`, `bpm`, `capo`, quantidade de seções e acordes)
  - Fluxo mantém segredo no servidor web via `ADMIN_API_KEY` (sem expor no browser).
- Arquivos:
  - `apps/web/lib/server-api.ts`
  - `apps/web/app/api/songs/import/txt/preview/route.ts`
  - `apps/web/app/api/songs/import/txt/file/preview/route.ts`
  - `apps/web/app/page.tsx`
- Validação:
  - `apps/web`: `npm run build` OK.
- Pendências:
  - Adicionar ação de persistência final da cifra (`POST /api/songs/import/txt` e `.../file`) após aprovação do preview.
  - Conectar autenticação real de usuário/admin no web.
- Próximo passo:
  - Implementar no web o fluxo completo de importação com botão **Salvar cifra** após preview (opcionalmente escolhendo `songId`).

### [2026-04-03 16:06 America/Recife] - Codex
- Objetivo: Implementar fluxo web completo de importação de cifra com botão **Salvar cifra** após preview.
- Feito:
  - Adicionadas rotas internas no Next (BFF) para persistência final:
    - `POST /api/songs/import/txt`
    - `POST /api/songs/import/txt/file`
  - UI do card **Song TXT Preview** evoluída com:
    - campo opcional `songId` para salvar nova versão em música existente
    - ação `Salvar cifra` usando a fonte do último preview (`text` ou `file`)
    - status de último salvamento (`songId` e versão da cifra)
  - Fluxo completo agora cobre:
    - preview por texto/arquivo
    - persistência por texto/arquivo
  - Mantido padrão de segurança: chamadas autenticadas no servidor web via `ADMIN_API_KEY` (sem exposição no client).
- Arquivos:
  - `apps/web/app/api/songs/import/txt/route.ts`
  - `apps/web/app/api/songs/import/txt/file/route.ts`
  - `apps/web/app/page.tsx`
- Validação:
  - `apps/web`: `npm run build` OK.
- Pendências:
  - Conectar autenticação real de usuário/admin no web (substituir modo técnico baseado em `ADMIN_API_KEY`).
  - Criar versão mobile desse fluxo de preview/import.
- Próximo passo:
  - Implementar listagem de músicas no web para seleção assistida de `songId` (evitar input manual), integrada a `GET /api/songs`.

### [2026-04-03 16:08 America/Recife] - Codex
- Objetivo: Implementar seleção assistida de `songId` no web para importação de cifra.
- Feito:
  - Criada rota interna `GET /api/songs` no Next (BFF), proxy para API backend.
  - UI do card **Song TXT Preview** atualizada:
    - `songId` agora pode ser escolhido via `<select>` com lista de músicas reais.
    - opção padrão para criar nova música automaticamente (sem `songId`).
    - botão de atualização da lista de músicas com contador.
  - Página passou a carregar lista de músicas na inicialização.
  - Após `Salvar cifra`, a lista de músicas é recarregada automaticamente.
- Arquivos:
  - `apps/web/app/api/songs/route.ts`
  - `apps/web/app/page.tsx`
- Validação:
  - `apps/web`: `npm run build` OK.
- Pendências:
  - Conectar autenticação real Google/admin no web.
  - Implementar tela mobile equivalente de preview/import.
- Próximo passo:
  - Refatorar a home web em seções/rotas dedicadas (checklist e músicas) para reduzir complexidade e preparar integração de auth.

### [2026-04-03 16:11 America/Recife] - Codex
- Objetivo: Refatorar web em rotas dedicadas para reduzir complexidade da home e preparar integração de autenticação.
- Feito:
  - Home (`/`) convertida para **hub** com navegação para módulos operacionais.
  - Nova página `GET /checklists` criada com toda a gestão de checklist:
    - templates (listar/criar/remover)
    - checklist por evento (carregar/criar via template/lista custom)
    - atualização de itens
  - Nova página `GET /songs/import` criada com fluxo completo de músicas:
    - preview `.txt` por texto/arquivo
    - seleção assistida de `songId`
    - salvamento final da cifra e feedback de versão
  - Mantidas rotas internas BFF existentes (sem exposição de segredo no browser).
- Arquivos:
  - `apps/web/app/page.tsx`
  - `apps/web/app/checklists/page.tsx`
  - `apps/web/app/songs/import/page.tsx`
- Validação:
  - `apps/web`: `npm run build` OK.
- Pendências:
  - Integrar autenticação real Google no web e proteção de rotas por sessão/perfil.
  - Replicar os fluxos principais no mobile.
- Próximo passo:
  - Implementar base de autenticação web (login Google + estado de usuário/aprovação) e bloquear páginas operacionais para não-admin/aprovado.

### [2026-04-03 16:15 America/Recife] - Codex
- Objetivo: Implementar base de autenticação web e bloquear páginas operacionais para usuários não autenticados/não-admin.
- Feito:
  - Adicionadas rotas internas de auth no Next (BFF):
    - `POST /api/auth/google`
    - `GET /api/auth/me`
    - `POST /api/auth/logout`
  - Login aprovado agora persiste sessão em cookie HTTP-only (`overflow_access_token`).
  - `serverApiFetch` evoluído para múltiplos modos de autenticação:
    - `admin` (padrão)
    - `user` (Bearer do cookie)
    - `none`
  - Criada página `GET /login` com fluxo base de autenticação:
    - `idToken` Google (principal)
    - fallback bootstrap (quando backend permite)
    - tratamento de estados `APPROVED`, `PENDING_APPROVAL`, `REJECTED`
  - Criado `AuthGate` client-side para validar sessão/perfil em páginas operacionais (`ADMIN`/`SUPER_ADMIN`).
  - Proteção de rotas no edge via `proxy.ts` para redirecionar para `/login` sem cookie.
  - Páginas `/checklists` e `/songs/import` integradas com `AuthGate`.
  - Hub (`/`) atualizado com link para login.
- Arquivos:
  - `apps/web/lib/server-api.ts`
  - `apps/web/lib/auth-cookie.ts`
  - `apps/web/app/api/auth/google/route.ts`
  - `apps/web/app/api/auth/me/route.ts`
  - `apps/web/app/api/auth/logout/route.ts`
  - `apps/web/app/login/page.tsx`
  - `apps/web/components/AuthGate.tsx`
  - `apps/web/proxy.ts`
  - `apps/web/app/checklists/page.tsx`
  - `apps/web/app/songs/import/page.tsx`
  - `apps/web/app/page.tsx`
  - `apps/web/middleware.ts` (removido; substituído por `proxy.ts`)
- Validação:
  - `apps/web`: `npm run build` OK.
- Pendências:
  - Integrar botão/login Google real no frontend (Google Identity Services) para obter `idToken` sem input manual.
  - Ajustar UX de sessão (ex.: botão sair global e página de acesso negado dedicada).
  - Replicar autenticação e proteção de fluxo no mobile.
- Próximo passo:
  - Implementar login Google real no web (GIS) e substituir o campo manual de `idToken` por fluxo de autenticação visual.

### [2026-04-03 16:18 America/Recife] - Codex
- Objetivo: Implementar login Google real no web (GIS) substituindo fluxo manual de `idToken` como caminho principal.
- Feito:
  - Criada rota `GET /api/auth/google/config` no Next para fornecer `GOOGLE_CLIENT_ID` ao frontend.
  - Página `/login` migrada para Google Identity Services:
    - carrega script `https://accounts.google.com/gsi/client`
    - renderiza botão oficial Google
    - recebe `credential` e envia para `POST /api/auth/google`
    - mantém fallback manual em `<details>` para debug/bootstrap
  - Ajustado cookie de sessão na rota `POST /api/auth/google`:
    - `secure` agora é condicional (`NODE_ENV === "production"`) para funcionar em dev local.
  - `docker-compose.yml` atualizado para injetar `GOOGLE_CLIENT_ID` também no serviço `web`.
  - README atualizado com requisito de `GOOGLE_CLIENT_ID` no web BFF.
- Arquivos:
  - `apps/web/app/api/auth/google/config/route.ts`
  - `apps/web/app/login/page.tsx`
  - `apps/web/app/api/auth/google/route.ts`
  - `docker-compose.yml`
  - `README.md`
- Validação:
  - `apps/web`: `npm run build` OK.
- Pendências:
  - Adicionar botão global de logout e estado de sessão visível no hub.
  - Implementar página dedicada de acesso negado (não-admin) em vez de aviso inline.
  - Levar autenticação equivalente para mobile.
- Próximo passo:
  - Implementar header global com estado de usuário (`/api/auth/me`) + ação de logout (`/api/auth/logout`) em todas as páginas web.

### [2026-04-03 16:20 America/Recife] - Codex
- Objetivo: Implementar header global com estado de sessão e logout em todas as páginas web.
- Feito:
  - Criado componente `GlobalHeader` (client-side) com:
    - leitura de sessão via `GET /api/auth/me`
    - navegação global (`Hub`, `Checklists`, `Songs`)
    - exibição do usuário logado (nome + role)
    - ação de logout via `POST /api/auth/logout`
  - `RootLayout` atualizado para renderizar o header global em toda a aplicação.
  - CSS global expandido com estilos do header e ajuste de espaçamento (`.app-shell`) para conteúdo abaixo da barra fixa.
- Arquivos:
  - `apps/web/components/GlobalHeader.tsx`
  - `apps/web/app/layout.tsx`
  - `apps/web/app/globals.css`
- Validação:
  - `apps/web`: `npm run build` OK.
- Pendências:
  - Criar página dedicada para acesso negado (não-admin) e substituir aviso inline do `AuthGate`.
  - Ajustar UX do login para remover fallback manual fora de ambientes de desenvolvimento.
  - Replicar padrão de sessão/autenticação no mobile.
- Próximo passo:
  - Implementar página `/forbidden` e atualizar `AuthGate` para redirecionar perfis sem permissão para essa rota.

### [2026-04-03 16:22 America/Recife] - Codex
- Objetivo: Implementar página dedicada de acesso negado e ajustar `AuthGate` para redirecionamento por perfil.
- Feito:
  - Nova rota `GET /forbidden` criada com mensagem de acesso negado e ações de navegação (`Hub` / `Trocar conta`).
  - `AuthGate` refatorado:
    - remove aviso inline
    - redireciona para `/forbidden` quando usuário autenticado não é `ADMIN`/`SUPER_ADMIN`
    - mantém redirecionamento para `/login` quando não autenticado/erro de sessão
- Arquivos:
  - `apps/web/app/forbidden/page.tsx`
  - `apps/web/components/AuthGate.tsx`
- Validação:
  - `apps/web`: `npm run build` OK.
- Pendências:
  - Restringir fallback manual de login para ambiente de desenvolvimento apenas.
  - Replicar padrão de autorização e experiência de acesso negado no mobile.
- Próximo passo:
  - Ajustar página `/login` para exibir fallback manual somente quando `NODE_ENV !== "production"` (ou flag explícita), reduzindo superfície em produção.

### [2026-04-03 16:23 America/Recife] - Codex
- Objetivo: Restringir fallback manual de login para ambientes controlados (dev/flag), reduzindo exposição em produção.
- Feito:
  - `GET /api/auth/google/config` passou a retornar `fallbackEnabled` com regra:
    - `true` se `WEB_LOGIN_FALLBACK_ENABLED=true`
    - ou em não-produção quando `AUTH_BOOTSTRAP_MODE=true`
  - Página `/login` ajustada para:
    - exibir fallback manual somente quando `fallbackEnabled=true`
    - manter botão Google como fluxo padrão
  - `docker-compose.yml` atualizado com variáveis para o web:
    - `AUTH_BOOTSTRAP_MODE`
    - `WEB_LOGIN_FALLBACK_ENABLED` (default `false`)
  - Workflow de deploy atualizado para propagar `WEB_LOGIN_FALLBACK_ENABLED`.
  - README atualizado com documentação das variáveis de fallback.
- Arquivos:
  - `apps/web/app/api/auth/google/config/route.ts`
  - `apps/web/app/login/page.tsx`
  - `docker-compose.yml`
  - `.github/workflows/deploy-hostinger.yml`
  - `README.md`
- Validação:
  - `apps/web`: `npm run build` OK.
- Pendências:
  - Definir em produção o valor de `WEB_LOGIN_FALLBACK_ENABLED` (recomendado: `false`).
  - Implementar experiência equivalente de auth no mobile.
- Próximo passo:
  - Adicionar endpoint/status de sessão no hub para indicar claramente quando o usuário está pendente/rejeitado e guiar ação.

### [2026-04-03 16:26 America/Recife] - Codex
- Objetivo: Exibir status de sessão no Hub para orientar contas pendentes/rejeitadas após login.
- Feito:
  - Sistema de `statusHint` adicionado via cookie:
    - login `PENDING_APPROVAL`/`REJECTED` grava `overflow_login_status_hint`
    - login `APPROVED` limpa hint e mantém sessão ativa
  - `GET /api/auth/me` atualizado para retornar `statusHint` quando não autenticado por token.
  - `POST /api/auth/logout` atualizado para limpar também o `statusHint`.
  - Novo componente `SessionStatusBanner` no Hub (`/`) com estados:
    - sessão ativa (aprovado)
    - aguardando aprovação
    - acesso rejeitado (com link para `/login`)
- Arquivos:
  - `apps/web/lib/auth-cookie.ts`
  - `apps/web/app/api/auth/google/route.ts`
  - `apps/web/app/api/auth/me/route.ts`
  - `apps/web/app/api/auth/logout/route.ts`
  - `apps/web/components/SessionStatusBanner.tsx`
  - `apps/web/app/page.tsx`
- Validação:
  - `apps/web`: `npm run build` OK.
- Pendências:
  - Espelhar esse comportamento de status e feedback no app mobile.
  - Opcional: expirar/invalidar `statusHint` após mudança de conta sem novo login.
- Próximo passo:
  - Iniciar implementação do mobile com base nos fluxos já estáveis de web (auth + checklists + import preview).

### [2026-04-03 16:31 America/Recife] - Codex
- Objetivo: Iniciar implementação mobile com base nos fluxos web já estáveis (auth + checklist + preview).
- Feito:
  - Criado `apps/mobile` com bootstrap Expo/React Native:
    - `package.json`, `app.json`, `tsconfig.json`, `babel.config.js`
    - `App.tsx` com MVP funcional
  - Fluxos implementados no app mobile:
    - login (`idToken` ou fallback bootstrap)
    - sessão local via `AsyncStorage` + validação em `/auth/me`
    - leitura de templates e checklist por evento (`GET`)
    - preview de cifra `.txt` (requer `EXPO_PUBLIC_ADMIN_API_KEY`)
  - Workspace raiz atualizado com script `start:mobile`.
  - `.env.example` expandido com variáveis mobile e fallback web.
  - README raiz atualizado com seção mobile.
  - Adicionado `apps/mobile/README.md` para handoff rápido.
  - Dependências do workspace mobile instaladas.
- Arquivos:
  - `apps/mobile/package.json`
  - `apps/mobile/app.json`
  - `apps/mobile/tsconfig.json`
  - `apps/mobile/babel.config.js`
  - `apps/mobile/App.tsx`
  - `apps/mobile/README.md`
  - `apps/mobile/assets/.gitkeep`
  - `package.json`
  - `.env.example`
  - `README.md`
- Validação:
  - `npm install --workspace apps/mobile` OK (com warnings de engine em Node `20.19.2`, sem bloquear instalação).
  - `npm --workspace apps/mobile exec tsc --noEmit` OK.
- Pendências:
  - Integrar autenticação Google nativa no mobile (sem input manual de idToken).
  - Implementar escrita de checklist/import no backend com autenticação por usuário (hoje endpoints de escrita dependem de `ADMIN_API_KEY`).
  - Estruturar navegação mobile em telas separadas (login/checklist/songs) e não apenas tela única.
- Próximo passo:
  - Implementar navegação mobile (stack/tabs) e separar a UI em telas dedicadas, mantendo o estado de sessão compartilhado.

### [2026-04-03 16:35 America/Recife] - Codex
- Objetivo: Estruturar navegação mobile em telas separadas com estado de sessão compartilhado.
- Feito:
  - `App.tsx` refatorado para shell de estado + roteamento por abas (Checklist, Cifras, Conta).
  - Camada de tipos e API extraída para `src/types.ts` e `src/lib/api.ts`.
  - Config central de ambiente/token em `src/lib/config.ts`.
  - UI modularizada em componentes/telas:
    - `BottomTabs`
    - `LoginScreen`
    - `ChecklistScreen`
    - `SongsScreen`
    - `AccountScreen`
  - Estilos compartilhados extraídos para `src/styles.ts`.
- Arquivos:
  - `apps/mobile/App.tsx`
  - `apps/mobile/src/types.ts`
  - `apps/mobile/src/lib/config.ts`
  - `apps/mobile/src/lib/api.ts`
  - `apps/mobile/src/styles.ts`
  - `apps/mobile/src/components/BottomTabs.tsx`
  - `apps/mobile/src/screens/LoginScreen.tsx`
  - `apps/mobile/src/screens/ChecklistScreen.tsx`
  - `apps/mobile/src/screens/SongsScreen.tsx`
  - `apps/mobile/src/screens/AccountScreen.tsx`
- Validação:
  - `npm --workspace apps/mobile exec tsc --noEmit` OK.
- Pendências:
  - Integrar login Google nativo no mobile (sem input manual de `idToken`).
  - Implementar endpoints de escrita/autorização por usuário para checklist e import de cifra (sem depender de `ADMIN_API_KEY` no app).
- Próximo passo:
  - Implementar fluxo de autenticação Google nativo no Expo e remover o formulário manual de `idToken` do app mobile.

### [2026-04-03 16:38 America/Recife] - Codex
- Objetivo: Iniciar autenticação Google nativa no app mobile e reduzir dependência do input manual de `idToken`.
- Feito:
  - Adicionadas dependências mobile para OAuth:
    - `expo-auth-session`
    - `expo-web-browser`
  - `LoginScreen` refatorada para fluxo Google nativo (OpenID):
    - botão `Entrar com Google`
    - captura de `id_token` retornado pelo Google
    - envio automático para endpoint existente de login
  - Fallback manual de login mantido apenas em dev/flag:
    - `EXPO_PUBLIC_MOBILE_LOGIN_FALLBACK_ENABLED=true` ou `__DEV__`
  - `app.json` atualizado com `scheme` para redirect (`overflowmusic`).
  - Documentação e env atualizados para novo fluxo.
- Arquivos:
  - `apps/mobile/src/screens/LoginScreen.tsx`
  - `apps/mobile/src/styles.ts`
  - `apps/mobile/app.json`
  - `apps/mobile/package.json`
  - `.env.example`
  - `apps/mobile/README.md`
- Validação:
  - `npm install --workspace apps/mobile expo-auth-session expo-web-browser` OK (com warnings de engine já conhecidos).
  - `npm --workspace apps/mobile exec tsc --noEmit` OK.
- Pendências:
  - Backend atualmente valida um único `GOOGLE_CLIENT_ID`; para mobile nativo pode ser necessário aceitar múltiplas audiências (`web/ios/android`).
  - Substituir endpoint de preview de cifra para fluxo autenticado por usuário (sem `ADMIN_API_KEY` no app).
- Próximo passo:
  - Ajustar backend de autenticação para aceitar lista de Google Client IDs válidos e fechar compatibilidade completa do login mobile nativo.

### [2026-04-03 16:41 America/Recife] - Codex
- Objetivo: Ajustar backend de autenticação para aceitar múltiplos Google Client IDs (web/ios/android).
- Feito:
  - `AuthController` atualizado para resolver audiências válidas por configuração:
    - `GOOGLE_CLIENT_IDS` (lista CSV)
    - fallback com `GOOGLE_CLIENT_ID` (compatibilidade)
  - Validação de `idToken` agora usa lista consolidada de audiências.
  - Propagada nova variável de ambiente na esteira de deploy:
    - `.env.example`
    - `docker-compose.yml` (serviço `api`)
    - `.github/workflows/deploy-hostinger.yml` (ambos deploys)
  - README atualizado com orientação de uso de `GOOGLE_CLIENT_IDS` em produção.
- Arquivos:
  - `apps/api/src/auth/auth.controller.ts`
  - `.env.example`
  - `docker-compose.yml`
  - `.github/workflows/deploy-hostinger.yml`
  - `README.md`
- Validação:
  - `npm --workspace apps/api run build` OK.
- Pendências:
  - Configurar segredo `GOOGLE_CLIENT_IDS` no GitHub/Hostinger com IDs reais de web/ios/android.
  - Revisar se o app mobile deve usar client ID específico por plataforma em runtime.
- Próximo passo:
  - Parametrizar o mobile para usar `expo-auth-session` com client IDs por plataforma e alinhar com `GOOGLE_CLIENT_IDS` configurado na API.

### [2026-04-03 16:42 America/Recife] - Codex
- Objetivo: Alinhar autenticação mobile com múltiplos client IDs por plataforma após ajuste de audiências na API.
- Feito:
  - Login mobile atualizado para escolher client ID por plataforma:
    - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
    - `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
    - `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
    - fallback `EXPO_PUBLIC_GOOGLE_CLIENT_ID`
  - Mensagem de erro de configuração do login atualizada para refletir variáveis por plataforma.
  - `.env.example` expandido com variáveis Google do mobile por plataforma.
  - README (raiz e mobile) atualizado com novas variáveis de OAuth.
- Arquivos:
  - `apps/mobile/src/screens/LoginScreen.tsx`
  - `.env.example`
  - `apps/mobile/README.md`
  - `README.md`
- Validação:
  - `npm --workspace apps/api run build` OK.
  - `npm --workspace apps/mobile exec tsc --noEmit` OK.
- Pendências:
  - Configurar IDs reais por plataforma nos ambientes (GitHub/Hostinger/local Expo).
  - Migrar endpoints de escrita (checklist/import) para autenticação de usuário no backend.
- Próximo passo:
  - Implementar autorização por token de usuário nos endpoints de escrita de checklist e preview/import de cifra para remover dependência de `ADMIN_API_KEY` no mobile.

### [2026-04-03 16:44 America/Recife] - Codex
- Objetivo: Remover dependência exclusiva de `ADMIN_API_KEY` para escrita e permitir gestão por usuário autenticado no mobile/web.
- Feito:
  - API: adicionado controle de permissão por token de usuário aprovado (`LEADER|ADMIN|SUPER_ADMIN`):
    - `AuthService.assertCanManageContent(accessToken)`.
  - Endpoints de escrita atualizados para aceitar:
    - `Bearer ADMIN_API_KEY` (compatibilidade)
    - ou token de usuário autorizado.
  - Controladores atualizados:
    - `SongsController`
    - `ChecklistTemplatesController`
    - `ChecklistRunsController`
  - Mobile: preview de cifra agora usa token de sessão do usuário por padrão; `EXPO_PUBLIC_ADMIN_API_KEY` virou fallback.
  - Documentação atualizada (README raiz e mobile) para refletir o novo modelo de autorização.
- Arquivos:
  - `apps/api/src/auth/auth.service.ts`
  - `apps/api/src/songs/songs.controller.ts`
  - `apps/api/src/checklist/checklist-templates.controller.ts`
  - `apps/api/src/checklist/checklist-runs.controller.ts`
  - `apps/mobile/src/lib/api.ts`
  - `apps/mobile/App.tsx`
  - `apps/mobile/src/screens/SongsScreen.tsx`
  - `README.md`
  - `apps/mobile/README.md`
- Validação:
  - `npm --workspace apps/api run build` OK.
  - `npm --workspace apps/api test` OK (executado fora do sandbox devido `EPERM` de IPC local no `tsx`).
  - `npm --workspace apps/mobile exec tsc --noEmit` OK.
- Pendências:
  - Adicionar testes específicos cobrindo escrita com token de usuário (`LEADER/ADMIN`) e bloqueio de `MEMBER`.
  - Criar UI mobile para operações de escrita de checklist/import (hoje apenas leitura + preview).
- Próximo passo:
  - Implementar testes de autorização por papel nos endpoints de escrita (songs/checklists) para evitar regressão de segurança.

### [2026-04-03 16:46 America/Recife] - Codex
- Objetivo: Cobrir com testes a nova autorização de escrita por token de usuário.
- Feito:
  - Atualizados testes de integração de checklist para injetar `AuthService` mockado e validar:
    - escrita com token de usuário autorizado
    - bloqueio com token sem permissão
  - Atualizados testes de integração de songs import para validar os mesmos cenários de autorização por token de usuário.
  - Ajustado metadata de injeção nos testes para refletir construtores atualizados dos controllers.
- Arquivos:
  - `apps/api/src/checklist/checklist.integration.test.ts`
  - `apps/api/src/songs/songs-import.integration.test.ts`
- Validação:
  - `npm --workspace apps/api run build` OK.
  - `npm --workspace apps/api test` OK (23 testes, 23 passando).
- Pendências:
  - Implementar operações de escrita de checklist no app mobile (atualmente leitura + preview).
  - Implementar import real de cifra no mobile (além do preview).
- Próximo passo:
  - Adicionar no mobile ações de atualização de checklist (`PATCH item`) usando token de usuário autenticado.

### [2026-04-03 16:47 America/Recife] - Codex
- Objetivo: Adicionar operação de escrita de checklist no mobile usando token autenticado.
- Feito:
  - Implementada chamada `PATCH /api/events/:eventId/checklist/items/:itemId` no client mobile (`updateChecklistItem`).
  - `ChecklistScreen` evoluída para:
    - controlar `eventId` vindo do estado global
    - permitir toggle de itens com ação de escrita.
  - `App.tsx` atualizado com fluxo de atualização:
    - envio de `checked` + `checkedByName`
    - recarga do checklist após patch
    - feedback de status ao usuário.
  - Documentação mobile e README raiz atualizadas com suporte a atualização de checklist.
- Arquivos:
  - `apps/mobile/src/lib/api.ts`
  - `apps/mobile/src/screens/ChecklistScreen.tsx`
  - `apps/mobile/src/styles.ts`
  - `apps/mobile/App.tsx`
  - `apps/mobile/README.md`
  - `README.md`
- Validação:
  - `npm --workspace apps/mobile exec tsc --noEmit` OK.
  - `npm --workspace apps/api run build` OK.
- Pendências:
  - Implementar import real de cifra no mobile (persistência, não apenas preview).
  - Adicionar feedback visual por item durante atualização (loading por linha).
- Próximo passo:
  - Implementar fluxo mobile de import de cifra `.txt` com upload/persistência usando token de usuário autorizado.

### [2026-04-03 16:49 America/Recife] - Codex
- Objetivo: Implementar import persistente de cifra `.txt` no mobile com token autenticado.
- Feito:
  - Mobile API client atualizado com `importSongTxt(content, accessToken)` para `POST /api/songs/import/txt`.
  - Novos tipos mobile para resultado de import (`songId`, `songTitle`, `chartVersion`).
  - Aba de cifras (`SongsScreen`) evoluída com ação `Salvar cifra` além de `Gerar preview`.
  - `App.tsx` conectado ao novo fluxo de persistência:
    - valida conteúdo
    - envia import com token de sessão
    - exibe retorno da música/versão importada.
  - README mobile e raiz atualizados para refletir preview + import persistente.
- Arquivos:
  - `apps/mobile/src/lib/api.ts`
  - `apps/mobile/src/types.ts`
  - `apps/mobile/src/screens/SongsScreen.tsx`
  - `apps/mobile/App.tsx`
  - `apps/mobile/README.md`
  - `README.md`
- Validação:
  - `npm --workspace apps/mobile exec tsc --noEmit` OK.
- Pendências:
  - Adicionar fluxo de upload de arquivo `.txt` no mobile (além de colar texto).
  - Melhorar feedback visual de loading durante preview/import.
- Próximo passo:
  - Implementar seleção/upload de arquivo `.txt` no mobile para import/preview sem necessidade de colar manualmente.

### [2026-04-03 16:50 America/Recife] - Codex
- Objetivo: Permitir seleção de arquivo `.txt` no mobile para alimentar preview/import de cifra.
- Feito:
  - Instaladas dependências Expo no app mobile:
    - `expo-document-picker`
    - `expo-file-system`
  - `SongsScreen` atualizada com fluxo de arquivo:
    - botão `Selecionar arquivo .txt`
    - leitura do conteúdo do arquivo selecionado
    - preenchimento automático do campo de texto da cifra
    - feedback de status (arquivo carregado/erro)
  - README mobile e raiz atualizados com suporte a seleção de arquivo no dispositivo.
- Arquivos:
  - `apps/mobile/src/screens/SongsScreen.tsx`
  - `apps/mobile/package.json`
  - `apps/mobile/README.md`
  - `README.md`
- Validação:
  - `npm --workspace apps/mobile exec tsc --noEmit` OK.
- Pendências:
  - Validar manualmente o fluxo de seleção em Android/iOS real (permissões e providers de arquivo).
  - Melhorar UX de loading nos botões de preview/import e no upload de arquivo.
- Próximo passo:
  - Adicionar estados de carregamento e bloqueio de ações simultâneas na aba de cifras para evitar cliques duplicados.

### [2026-04-03 17:15 America/Recife] - Codex
- Objetivo: Evitar ações duplicadas na aba de cifras com estados de carregamento e bloqueio de interação.
- Feito:
  - `App.tsx` atualizado com estados de operação:
    - `loadingSongPreview`
    - `loadingSongImport`
  - Guardas lógicas adicionadas para impedir disparo simultâneo de preview/import.
  - `SongsScreen` atualizada com:
    - estado local `loadingFilePick`
    - desabilitação de botões/input durante operações
    - labels dinâmicos (`Lendo arquivo...`, `Gerando preview...`, `Salvando cifra...`).
- Arquivos:
  - `apps/mobile/App.tsx`
  - `apps/mobile/src/screens/SongsScreen.tsx`
- Validação:
  - `npm --workspace apps/mobile exec tsc --noEmit` OK.
- Pendências:
  - Validar UX em dispositivo real (latência/retry) para confirmar feedback adequado.
  - Opcional: adicionar debounce/cancelamento de requests de preview.
- Próximo passo:
  - Implementar feedback visual por item na aba de checklist durante atualização (`PATCH`) para consistência de UX com a aba de cifras.

### [2026-04-03 17:16 America/Recife] - Codex
- Objetivo: Melhorar UX de concorrência no mobile com feedback de carregamento em cifras e checklist.
- Feito:
  - Aba de cifras:
    - `App.tsx` com estados `loadingSongPreview` e `loadingSongImport`.
    - Guardas para bloquear preview/import simultâneos.
    - `SongsScreen` com `loadingFilePick`, botões/input desabilitados durante operação e labels dinâmicos.
  - Aba de checklist:
    - `App.tsx` com `loadingChecklist` e `updatingChecklistItemId`.
    - `ChecklistScreen` com:
      - botão de carregar checklist com estado `Carregando...`
      - desabilitação de input/itens durante update
      - indicação por item (`atualizando...`) no item em processamento.
  - README mobile atualizado com feedback de loading no checklist.
- Arquivos:
  - `apps/mobile/App.tsx`
  - `apps/mobile/src/screens/SongsScreen.tsx`
  - `apps/mobile/src/screens/ChecklistScreen.tsx`
  - `apps/mobile/README.md`
- Validação:
  - `npm --workspace apps/mobile exec tsc --noEmit` OK.
- Pendências:
  - Validar UX em dispositivo real para confirmar comportamento em redes lentas.
  - Opcional: adicionar retry e timeout explícito para operações de rede no mobile.
- Próximo passo:
  - Iniciar hardening do deploy: checklist de segredos/variáveis para Hostinger + script de validação pré-deploy.

### [2026-04-03 17:20 America/Recife] - Codex
- Objetivo: Iniciar hardening de deploy com validação prévia de segredos/variáveis para Hostinger.
- Feito:
  - Criado script `scripts/check-hostinger-env.sh` com validação de variáveis obrigatórias de deploy.
  - Regra de Google aplicada no script:
    - exige `GOOGLE_CLIENT_IDS` ou `GOOGLE_CLIENT_ID`.
  - `package.json` atualizado com comando:
    - `npm run check:deploy-env`
  - Workflow de deploy atualizado com etapa explícita de validação antes de publicar na VPS.
  - README atualizado com seção `Deploy Hardening (Hostinger)`.
- Arquivos:
  - `scripts/check-hostinger-env.sh`
  - `package.json`
  - `.github/workflows/deploy-hostinger.yml`
  - `README.md`
- Validação:
  - Execução local do script com envs de teste: OK.
- Pendências:
  - Popular todas as variáveis obrigatórias no GitHub Secrets/Vars do projeto.
  - Opcional: incluir verificação de formato para algumas variáveis sensíveis (ex.: domínio, portas numéricas).
- Próximo passo:
  - Adicionar validações de formato no script (domínio, booleanos e portas) para reduzir erro humano de configuração.

### [2026-04-03 17:21 America/Recife] - Codex
- Objetivo: Fortalecer script de pre-deploy com validação de formato para reduzir erro de configuração.
- Feito:
  - `scripts/check-hostinger-env.sh` atualizado com validações adicionais:
    - `AUTH_BOOTSTRAP_MODE` e `WEB_LOGIN_FALLBACK_ENABLED` devem ser `true/false`
    - `SMTP_PORT` numérico e na faixa `1-65535`
    - `GOOGLE_ALLOWED_DOMAIN` com formato de domínio válido
    - `FRONTEND_URL` e `NEXT_PUBLIC_API_URL` incluídos como obrigatórios
  - Workflow atualizado para fornecer `FRONTEND_URL` e `NEXT_PUBLIC_API_URL` na etapa de validação.
  - README atualizado com resumo das validações de formato.
- Arquivos:
  - `scripts/check-hostinger-env.sh`
  - `.github/workflows/deploy-hostinger.yml`
  - `README.md`
- Validação:
  - Execução local do script com envs de teste: OK.
- Pendências:
  - Opcional: validar também formato de URL para `FRONTEND_URL` e `NEXT_PUBLIC_API_URL` no script.
- Próximo passo:
  - Criar `docs/DEPLOY_CHECKLIST.md` com passo a passo operacional (secrets, DNS, SSL, rollout check) para handoff de operação.

### [2026-04-03 17:21 America/Recife] - Codex
- Objetivo: Criar checklist operacional de deploy para handoff rápido de operação.
- Feito:
  - Criado `docs/DEPLOY_CHECKLIST.md` com fluxo ponta-a-ponta:
    - pré-requisitos de VPS/DNS
    - secrets obrigatórios
    - validação pré-deploy
    - emissão SSL
    - deploy e pós-deploy
    - rollback rápido
    - boas práticas de segurança operacional
  - README atualizado com referência para o checklist operacional.
- Arquivos:
  - `docs/DEPLOY_CHECKLIST.md`
  - `README.md`
- Validação:
  - Verificação estática do conteúdo e comandos de operação.
- Pendências:
  - Executar checklist em ambiente real para confirmar tempos/ajustes finos operacionais.
- Próximo passo:
  - Rodar um dry-run operacional com secrets reais e registrar resultados no `docs/DEV_LOG.md`.

### [2025-07-16 — GitHub Copilot / Claude Sonnet 4.6]
- Objetivo: Criar modo de apresentação fullscreen do setlist (web).
- Feito:
  - Criado `apps/web/app/events/[eventId]/present/page.tsx`:
    - Fullscreen darkmode (`min-height: 100dvh`, background `#080f1a`)
    - Navegação por teclado: ArrowRight/ArrowLeft/Space avança/retrocede, Escape volta, H togla nav
    - Exibe: contador (N/Total), título (fonte responsiva até 96px), chips de tom/líder/zona, notas de transição
    - Pills de navegação rápida por índice
    - Nav bar e bottom bar com auto-hide após 3s de inatividade (click toggle)
  - Atualizado `apps/web/app/events/[eventId]/page.tsx`:
    - Adicionado botão "▶ Apresentar" ao lado do título do Setlist (visível somente quando há itens)
- Arquivos:
  - `apps/web/app/events/[eventId]/present/page.tsx` (criado)
  - `apps/web/app/events/[eventId]/page.tsx` (link adicionado)
- Validação:
  - Checagem estática de tipos: sem erros aparentes.
- Pendências:
  - Testar em browser para validar navegação por teclado e layout fullscreen.
  - Mobile: reorder de setlist ainda não implementado no app mobile.
  - Gestão de organizações/equipes não iniciada.
- Próximo passo:
  - Implementar tela de configurações/perfil completa no mobile (nome, foto, alterar senha social).

### [2026-04-03 — GitHub Copilot / Claude Sonnet 4.6]
- Objetivo: Implementar tela de perfil/conta completa no mobile com edição de nome.
- Feito:
  - API: adicionado `PATCH api/auth/me` (auth.controller.ts + auth.service.ts) — atualiza `name` do usuário autenticado via JWT.
  - Mobile `apps/mobile/src/lib/api.ts`: adicionada função `updateProfile(accessToken, { name })`.
  - Mobile `apps/mobile/src/screens/AccountScreen.tsx`: reescrita com:
    - Avatar circular com iniciais do nome
    - Badge de role colorido (SUPER_ADMIN, ADMIN, LEADER, MEMBER)
    - Email exibido (somente leitura)
    - Campo de edição de nome inline com botões Salvar/Cancelar
    - Botão "Sair da conta" com loading state
  - Mobile `apps/mobile/App.tsx`: atualizado para passar `accessToken` e `onUserUpdate` ao AccountScreen.
- Arquivos:
  - `apps/api/src/auth/auth.service.ts`
  - `apps/api/src/auth/auth.controller.ts`
  - `apps/mobile/src/lib/api.ts`
  - `apps/mobile/src/screens/AccountScreen.tsx`
  - `apps/mobile/App.tsx`
- Validação:
  - Checagem estática de tipos: sem erros aparentes.
- Pendências:
  - Testar endpoint PATCH em ambiente real.
  - Mobile: reorder do setlist ainda não implementado (somente leitura).
  - Gestão de organizações/equipes não iniciada.
- Próximo passo:
  - Implementar gestão de equipes/membros (listar usuários aprovados, ver papéis) no web ou mobile.

### [2026-04-03 — GitHub Copilot / Claude Sonnet 4.6]
- Objetivo: Gestão de equipe — listar membros aprovados agrupados por função.
- Feito:
  - API: adicionado `listApprovedUsers` em `auth.service.ts` (filtra `status=APPROVED`, ordena por role+nome).
  - API: adicionado `GET api/admin/users` em `auth.controller.ts` (protegido por `ADMIN_API_KEY`).
  - Web proxy: criado `apps/web/app/api/admin/users/route.ts` → `GET admin/users`.
  - Web page: criado `apps/web/app/admin/team/page.tsx`:
    - Protegido por `AuthGate`
    - Busca por nome/email
    - Membros agrupados por role (SUPER_ADMIN → ADMIN → LEADER → MEMBER)
    - Avatar com iniciais e cor por role
    - Link para `/admin/users` (aprovação de pendentes)
  - Home: adicionado card "Equipe" → `/admin/team`.
- Arquivos:
  - `apps/api/src/auth/auth.service.ts`
  - `apps/api/src/auth/auth.controller.ts`
  - `apps/web/app/api/admin/users/route.ts` (criado)
  - `apps/web/app/admin/team/page.tsx` (criado)
  - `apps/web/app/page.tsx`
- Validação:
  - Checagem estática de tipos: sem erros aparentes.
- Pendências:
  - Reorder do setlist no mobile (somente leitura por ora).
  - Testes e2e não iniciados.
- Próximo passo:
  - Implementar reorder do setlist no mobile (swipe ou botões ▲▼ + PATCH endpoint).

### [2026-04-03 — GitHub Copilot / Claude Sonnet 4.6]
- Objetivo: Reorder do setlist no mobile com botões ▲▼.
- Feito:
  - `apps/mobile/src/lib/api.ts`: adicionada `reorderSetlist(eventId, items, accessToken)` → POST `/events/:id/setlist/reorder`.
  - `apps/mobile/src/screens/EventsScreen.tsx`: reescrita para:
    - Aceitar props `reorderingId: string|null` e `onMoveItem(item, direction, sorted)`.
    - Exibir botões ▲▼ por item do setlist (desabilitados quando `isBusy`, `isFirst` ou `isLast`).
    - Feedback visual: opacidade reduzida no item em movimento.
  - `apps/mobile/App.tsx`:
    - Importado `reorderSetlist` e tipo `SetlistItem`.
    - Adicionado estado `reorderingId`.
    - Implementada `moveSetlistItem(item, direction, sorted)`: calcula swap de orders, chama `reorderSetlist`, faz refresh do setlist.
    - Passadas novas props ao `EventsScreen`.
- Arquivos:
  - `apps/mobile/src/lib/api.ts`
  - `apps/mobile/src/screens/EventsScreen.tsx`
  - `apps/mobile/App.tsx`
- Validação:
  - Checagem estática de tipos: sem erros aparentes.
- Pendências:
  - Testes e2e não iniciados.
  - Sem tela de criação/edição de evento no mobile (somente leitura).
- Próximo passo:
  - Avaliar testes e2e com Detox/Jest ou iniciar módulo de notificações/push.

### [2026-04-03 — GitHub Copilot / Claude Sonnet 4.6]
- Objetivo: Adicionar cobertura de testes unitários para auth.service e setlist.service.
- Feito:
  - Criado `apps/api/src/auth/auth.service.test.ts` (6 testes):
    - `updateMe`: atualiza nome, rejeita nome vazio, rejeita token inválido
    - `listApprovedUsers`: filtra corretamente por status APPROVED
    - `googleLogin`: cria usuário PENDING_APPROVAL, retorna accessToken para APPROVED
  - Criado `apps/api/src/setlist/setlist.service.test.ts` (6 testes):
    - `reorder`: reordena itens, rejeita items[], rejeita item de outro setlist
    - `addItem`: order auto-incrementado, rejeita songTitle vazio
    - `getByEvent`: retorna null quando setlist não existe
  - Todos os 20 testes passando (tsx --test, sem instalar deps extras):
    - `chord-txt-parser.test.ts` — 4 ✔
    - `txt-upload-validator.test.ts` — 3 ✔
    - `songs.service.test.ts` — 1 ✔
    - `auth.service.test.ts` — 6 ✔ (novo)
    - `setlist.service.test.ts` — 6 ✔ (novo)
- Arquivos:
  - `apps/api/src/auth/auth.service.test.ts` (criado)
  - `apps/api/src/setlist/setlist.service.test.ts` (criado)
- Validação:
  - `tsx --test` via node_modules raiz: 20 pass, 0 fail.
  - Comando: `node_modules/.bin/tsx --test apps/api/src/**/*.test.ts`
- Pendências:
  - Testes de integração para auth.controller (PATCH /auth/me, GET /admin/users).
  - Testes e2e (Cypress/Playwright na web).
  - Mobile sem testes unitários.
- Próximo passo:
  - Adicionar testes de integração para auth.controller usando NestJS Testing + supertest.

### [2026-04-03 — GitHub Copilot / Claude Sonnet 4.6]
- Objetivo: Adicionar testes de integração para auth.controller (NestJS Testing + supertest).
- Feito:
  - Criado `apps/api/src/auth/auth.controller.integration.test.ts` (14 testes):
    - `POST /api/auth/google`: 400 sem body, 201 em bootstrap mode
    - `GET /api/auth/me`: 401 sem token, 200 com token
    - `PATCH /api/auth/me`: 401 sem token, 200 com nome atualizado
    - `GET /api/admin/users`: 401 sem admin key, 200 com admin key
    - `GET /api/admin/users/pending`: 401 sem admin key, 200 com admin key
    - `POST /api/admin/users/:id/approve`: 401 sem admin key, 201 com admin key
    - `POST /api/admin/users/:id/reject`: 401 sem admin key, 201 com admin key
  - Suíte completa: **34/34 passando** (todos os arquivos de teste da API).
  - Descoberto: tsx precisa de `--tsconfig apps/api/tsconfig.json` ao rodar da raiz do monorepo (esbuild não lê tsconfig aninhado automaticamente).
- Arquivos:
  - `apps/api/src/auth/auth.controller.integration.test.ts` (criado)
  - `docs/DEV_LOG.md`
- Validação:
  - `node_modules/.bin/tsx --tsconfig apps/api/tsconfig.json --test <todos os arquivos>`: 34 pass, 0 fail.
- Pendências:
  - Testes e2e (Cypress/Playwright na web).
  - Mobile sem testes unitários.
  - `songs-import.integration.test.ts` não incluso no último run (verificar).
- Próximo passo:
  - Definir próxima feature com o time (push notifications, filtros de setlist, exportação PDF).

### [2026-04-03 — GitHub Copilot / Claude Sonnet 4.6]
- Objetivo: Implementar biblioteca de músicas no web (lista + visualizador de cifra).
- Feito:
  - Confirmado `songs-import.integration.test.ts` passando (8/8) com `--tsconfig` flag.
  - Suíte completa agora: **42 testes** (34 anteriores + 8 songs-import).
  - `apps/web/app/api/songs/[songId]/route.ts` — proxy GET song by ID.
  - `apps/web/app/songs/page.tsx` — biblioteca: grid com busca por título/artista, pills de tom e nº de cifras, link para detalhe.
  - `apps/web/app/songs/[songId]/page.tsx` — visualizador de cifra: metadata (tom, BPM, capo), seletor de versão, seções com acordes em verde/letras em branco/tab em azul, dicionário de acordes, link para importar nova versão.
  - `apps/web/app/page.tsx` — card "Song TXT Import" substituído por "Biblioteca de Músicas" → `/songs`.
- Arquivos:
  - `apps/web/app/api/songs/[songId]/route.ts` (criado)
  - `apps/web/app/songs/page.tsx` (criado)
  - `apps/web/app/songs/[songId]/page.tsx` (criado)
  - `apps/web/app/page.tsx` (alterado)
  - `docs/DEV_LOG.md`
- Validação:
  - TypeScript: 0 erros em todos os arquivos novos/alterados.
  - Testes: 42/42 passando (inclui songs-import.integration).
- Pendências:
  - Mobile: SongsScreen ainda é só importação, sem browsing da biblioteca.
  - Testes e2e web (Playwright/Cypress).
- Próximo passo:
  - Adicionar aba "Browse" na SongsScreen mobile para listar e visualizar cifras.

### [2026-04-03 — GitHub Copilot / Claude Sonnet 4.6]
- Objetivo: Adicionar biblioteca de músicas (Browse) na aba Songs do mobile.
- Feito:
  - `apps/mobile/src/types.ts` — adicionados `Song`, `SongChordChart`, `ParsedChart`, `SongSection`, `SongSectionLine`.
  - `apps/mobile/src/lib/api.ts` — adicionados `fetchSongs()` e `fetchSongById(id)`.
  - `apps/mobile/src/screens/SongsScreen.tsx` — reescrito com duas abas internas:
    - **Biblioteca**: lista com busca por título/artista, pills de tom e nº de cifras, detalhe com seções (acordes em verde, letras em branco, tab em azul), seletor de versão, dicionário de acordes, botão "← Músicas".
    - **Importar TXT**: conteúdo original (seletor de arquivo, textarea, preview, salvar) movido para segunda aba.
- Arquivos:
  - `apps/mobile/src/types.ts`
  - `apps/mobile/src/lib/api.ts`
  - `apps/mobile/src/screens/SongsScreen.tsx`
  - `docs/DEV_LOG.md`
- Validação:
  - TypeScript: 0 erros em todos os arquivos afetados.
- Pendências:
  - Testes e2e mobile/web.
  - Filtros avançados (por tom, tag).
- Próximo passo:
  - Avaliar próxima feature: notificações push, exportação PDF do setlist ou modo offline.

### [2026-04-03 — GitHub Copilot / Claude Sonnet 4.6]
- Objetivo: Corrigir bug de duplicata em EventsScreen.tsx e implementar compartilhamento/impressão do setlist.
- Feito:
  - `apps/mobile/src/screens/EventsScreen.tsx`: removida definição duplicada de `Props`, `formatDate` e `EventsScreen` (versão antiga sem suporte a reorder havia sido appendada por engano).
  - `apps/mobile/src/screens/EventsScreen.tsx`: adicionado import `Share` do react-native e botão "Compartilhar Setlist":
    - Aparece abaixo dos itens do setlist quando há itens.
    - Gera mensagem formatada: `Setlist — <título>\n\n1. Música (Tom) — Líder\n2. ...`.
    - Usa `Share.share()` nativo do react-native.
  - `apps/web/app/events/[eventId]/page.tsx`: adicionado botão "🖨 Imprimir" ao lado do link "▶ Apresentar":
    - Chama `window.print()`.
    - Estilo neutro compatível com a UI existente.
- Arquivos:
  - `apps/mobile/src/screens/EventsScreen.tsx`
  - `apps/web/app/events/[eventId]/page.tsx`
- Validação:
  - TypeScript: 0 erros em todos os arquivos alterados.
  - Testes: 42/42 passando (sem regressão).
- Pendências:
  - Testes e2e mobile/web.
  - Estilo `@media print` na web para ocultar UI desnecessária na impressão.
- Próximo passo:
  - Avaliar próxima feature: notificações push, exportação PDF do setlist, modo offline ou filtros de biblioteca.

---

### [2025-07-14 19:30 America/Recife] - GitHub Copilot (Claude Sonnet 4.6)
- Objetivo: Criar eventos no mobile (mobile era somente leitura para eventos).
- Feito:
  - `createEvent()` adicionado em `apps/mobile/src/lib/api.ts` (POST /api/events com ADMIN_API_KEY Bearer).
  - Formulário colapsável "＋ Novo Evento" em `apps/mobile/src/screens/EventsScreen.tsx` (título, data/hora ISO, local opcional + validação local).
  - Handler `handleCreateEvent` e estado `creatingEvent` adicionados em `apps/mobile/App.tsx`.
  - Props `onCreateEvent` e `creatingEvent` passadas de `App.tsx` → `EventsScreen`.
- Arquivos:
  - `apps/mobile/src/lib/api.ts`
  - `apps/mobile/src/screens/EventsScreen.tsx`
  - `apps/mobile/App.tsx`
- Validação:
  - TypeScript: 0 erros nos 3 arquivos.
  - Commit: `7f7f43a feat(mobile): criar novo evento no mobile` → pushed origin/develop.
- Pendências:
  - Testes e2e mobile/web.
  - Validação de formato de data no server (já ocorre, mas UI pode guiar melhor com datepicker nativo).
- Próximo passo:
  - Avaliar próxima feature: notificações push, exportação PDF do setlist ou edição de eventos no mobile/web.

---

### [2026-04-03 19:56 America/Recife] - GitHub Copilot (Claude Sonnet 4.6)
- Objetivo: Notificações push no mobile via Expo + backend.
- Feito:
  - Prisma: modelo `PushToken` (userId, token único, platform, timestamps, relação com User).
  - API: `NotificationsService` (registerToken, sendToAll, sendNewEventNotification via Expo push API).
  - API: `NotificationsController` → `POST /api/notifications/register` (requer JWT Bearer).
  - API: `EventsService.create()` chama `sendNewEventNotification` após criar evento.
  - API: `AppModule` registra NotificationsController e NotificationsService.
  - Mobile: `expo-notifications` ~55.0.16 + `expo-device` ~55.0.12 instalados via `npx expo install`.
  - Mobile: `src/lib/notifications.ts` com `registerForPushNotificationsAsync` (solicita permissão, canal Android, obtém ExpoPushToken, registra no backend).
  - Mobile: `App.tsx` registra token no login/bootstrap, adiciona listener de notificação (tap → navega para aba events).
  - `app.json`: permissões Android de notificação adicionadas.
- Arquivos:
  - `apps/api/prisma/schema.prisma`
  - `apps/api/src/notifications/notifications.service.ts` (novo)
  - `apps/api/src/notifications/notifications.controller.ts` (novo)
  - `apps/api/src/events/events.service.ts`
  - `apps/api/src/app.module.ts`
  - `apps/mobile/package.json`
  - `apps/mobile/app.json`
  - `apps/mobile/src/lib/notifications.ts` (novo)
  - `apps/mobile/App.tsx`
- Validação:
  - `tsc --noEmit` sem erros no módulo de notificações.
  - Mobile: 0 erros TypeScript nos arquivos alterados.
  - Commit: `f05d13f feat(notifications): push notifications com Expo (mobile + API)` → pushed origin/develop.
- Pendências:
  - `prisma db push` em produção (sem DB local).
  - Configurar FCM/APNs credentials no EAS para builds standalone (tokens Expo funcionam no Expo Go).
  - Adicionar `googleServicesFile` (google-services.json) para Android nativo.
- Próximo passo:
  - Exportação PDF do setlist, edição de eventos no mobile/web, ou deploy e testes em produção.

---

### [2026-04-04 — GitHub Copilot / Claude Sonnet 4.6]
- Objetivo: Adicionar músicas ao setlist a partir da biblioteca de músicas no mobile, e remover itens do setlist.
- Feito:
  - `api.ts`: adicionadas `addSetlistItem()` (`POST /api/events/:id/setlist/items`) e `removeSetlistItem()` (`DELETE /api/events/:id/setlist/items/:itemId`)
  - `SongsScreen.tsx`: props `activeEventId` + `onAddToSetlist` adicionadas; `BrowseTab` atualizado para receber props; cada linha de música exibe botão "＋" (verde) quando há evento ativo — aciona `onAddToSetlist`
  - `EventsScreen.tsx`: prop `onRemoveItem` adicionada; botão "✕" (vermelho) adicionado em cada item do setlist ao lado dos botões ▲▼
  - `App.tsx`: importados `addSetlistItem` e `removeSetlistItem`; handlers `handleAddToSetlist` + `handleRemoveSetlistItem` implementados (refresh de setlist + cache); props passadas a `SongsScreen` e `EventsScreen`
- Arquivos: `apps/mobile/src/lib/api.ts`, `apps/mobile/src/screens/SongsScreen.tsx`, `apps/mobile/src/screens/EventsScreen.tsx`, `apps/mobile/App.tsx`
- Validação: 0 erros TypeScript em todos os 4 arquivos
- Commit: `122180d feat(mobile): adicionar e remover músicas do setlist pela biblioteca` (develop)
- Pendências:
  - Testes end-to-end no dispositivo fisico/simulador.
  - Próximas features: exportação PDF do setlist, edição de eventos no mobile/web.
- Próximo passo:
  - Exportação PDF/compartilhamento do setlist completo, ou deploy em produção.

---

### [2026-04-04 — GitHub Copilot / Claude Sonnet 4.6]
- Objetivo: Editar e excluir eventos no mobile.
- Feito:
  - `api.ts`: adicionadas `updateEvent()` (`PATCH /api/events/:id`) e `deleteEvent()` (`DELETE /api/events/:id`)
  - `EventsScreen.tsx`: props `onUpdateEvent` + `onDeleteEvent`; ícone ✏ em cada card abre formulário inline pré-preenchido; ícone 🗑 dispara `Alert.alert` de confirmação antes de excluir; formulário inline de edição com validação de campos
  - `App.tsx`: handlers `handleUpdateEvent` + `handleDeleteEvent` (refresh lista + limpeza de activeEventId/setlist ao excluir evento ativo); props passadas a `EventsScreen`
- Arquivos: `apps/mobile/src/lib/api.ts`, `apps/mobile/src/screens/EventsScreen.tsx`, `apps/mobile/App.tsx`
- Validação: 0 erros TypeScript
- Commit: `9772b00 feat(mobile): editar e excluir eventos` (develop)
- Pendências: nenhuma bloqueante.
- Próximo passo:
  - Exportação/compartilhamento do setlist em PDF ou texto formatado, ou deploy em produção.

---

### [2026-04-04 — GitHub Copilot / Claude Sonnet 4.6]
- Objetivo: Editar itens do setlist inline no mobile (tom, líder, zona, notas de transição).
- Feito:
  - `api.ts`: adicionada `updateSetlistItem()` (`PATCH /api/events/:eventId/setlist/items/:itemId`)
  - `EventsScreen.tsx`: prop `onUpdateSetlistItem`; botão ✏ em cada item abre formulário inline pré-preenchido com key/leaderName/zone/transitionNotes; ✕ fecha sem salvar
  - `App.tsx`: handler `handleUpdateSetlistItem` (atualiza via API → refresh setlist + cache); prop passada a `EventsScreen`
- Arquivos: `apps/mobile/src/lib/api.ts`, `apps/mobile/src/screens/EventsScreen.tsx`, `apps/mobile/App.tsx`
- Validação: 0 erros TypeScript
- Commit: `ec93858 feat(mobile): editar itens do setlist (tom, líder, zona, notas)` (develop)
- Pendências: nenhuma bloqueante.
- Próximo passo:
  - Deploy em produção (push develop → main, docker-compose na VPS), ou exportação avançada do setlist.

### [2025-01-26 — GitHub Copilot / Claude Sonnet 4.6]
- Objetivo: Implementar todas as features faltantes identificadas na avaliação (~70% → ~95%).
- Feito:
  - Drag-and-drop no setlist web (`events/[eventId]/page.tsx`): `draggedId/dragOverId` state, `dropReorder()`, handlers `onDragStart/Over/Drop/End`, feedback visual (opacidade + borda verde).
  - Rate limiting: `@nestjs/throttler` no `AppModule` (100 req/60s por IP).
  - Paginação na API: `limit/offset` nos endpoints `/api/events` e `/api/songs` com metadata `{total, limit, offset}`.
  - Campo `eventType`: enum `EventType {CULTO, CONFERENCIA, ENSAIO, OUTRO}` no schema + service + controller.
  - Edição pós-importação de cifra: `PATCH /api/songs/:id/charts/:chartId`, proxies Next.js, página `/songs/[songId]/charts/[chartId]/edit`.
  - Dashboard Admin: `GET /api/admin/dashboard` (6 métricas), página `/admin` com StatCards.
  - Modo Apresentação completo: exibe cifra (shortcut `C`), lazy loading de chord charts, coloração de acordes/letras.
  - Gestão de Organizações: modelos `Organization` + `OrganizationMember` no schema, módulo `OrganizationsController/Service`, proxies Next.js, página `/admin/organizations`.
  - AuditLog: modelo `AuditLog` no schema, `AuditService` (fire-and-forget), integrado em aprovação/rejeição de usuários e criação/remoção de eventos.
- Arquivos: 27 arquivos alterados/criados (commit `54dcb0a` na branch `develop`).
- Validação: 0 erros TypeScript em todos os arquivos modificados. `prisma db push` pendente (requer DB disponível).
- Pendências:
  - `prisma db push` / migração para aplicar: `EventType`, `Organization`, `OrganizationMember`, `AuditLog`.
  - Push do commit para `origin/develop`.
  - Mobile: tela de Organizações (opcional).
- Próximo passo:
  - `git push origin develop` e deploy na VPS com `docker-compose up`.

---

### [2026-04-04 — GitHub Copilot / Claude Sonnet 4.6]
- Objetivo: Corrigir erros TypeScript TS2339 no build do CI (branch `main`).
- Feito:
  - Identificado: CI falhou com `tsc -p tsconfig.build.json` compilando arquivos de teste.
  - Causa: `prisma as never` nos test files propagava tipo `never` para variáveis de resultado, causando TS2339 ao acessar propriedades.
  - Corrigido `as never` → `as any` em todos os arquivos de teste afetados.
  - `tsconfig.build.json` local já tinha excludes corretos (`**/*.test.ts`, `**/*.spec.ts`) — mantido.
- Arquivos:
  - `apps/api/src/auth/auth.service.test.ts` (7 ocorrências corrigidas)
  - `apps/api/src/setlist/setlist.service.test.ts` (4 ocorrências corrigidas)
  - `apps/api/src/songs/songs.service.test.ts` (1 ocorrência corrigida)
- Validação:
  - Correções aplicadas. Build local não executado (terminal com problema de subprocess). Verificar via `npm --workspace apps/api run build` após commit.
- Pendências:
  - Verificar se `develop` tem todas as alterações prontas para merge em `main`.
  - Executar CI após push para confirmar que build passa com as correções.
- Próximo passo:
  - `git add` + `git commit` + `git push origin develop` e abrir PR para `main`.

---

### [2026-04-04 — GitHub Copilot / Claude Opus 4.6]
- Objetivo: Análise completa de arquitetura e integração (mobile + web + API) com documentação para agentes de IA.
- Feito:
  - Análise profunda de ~50 arquivos em 3 apps (mobile, web, api).
  - Criado `docs/ARCHITECTURE_ANALYSIS.md` com:
    - Mapa completo de endpoints e incompatibilidades de auth (JWT vs ADMIN_API_KEY)
    - 7 problemas de segurança priorizados (S1-S7)
    - 6 problemas de arquitetura (monolito App.tsx, packages vazios, navigation)
    - Feature parity matrix Mobile vs Web (16 features)
    - Mapa de variáveis de ambiente por app
    - Roadmap priorizado em 5 fases
  - Atualizado `docs/OPEN_QUESTIONS.md` com Q-003 a Q-008.
  - Atualizado `docs/TECH_DECISIONS.md` com DEC-003 a DEC-005.
  - APK Android gerado com fix PKCE (`usePKCE: false`) + Google Client ID embutido (59MB).
- Arquivos:
  - `docs/ARCHITECTURE_ANALYSIS.md` (novo — 300+ linhas)
  - `docs/OPEN_QUESTIONS.md` (atualizado)
  - `docs/TECH_DECISIONS.md` (atualizado)
  - `docs/DEV_LOG.md` (esta entrada)
- Validação:
  - Análise cruzada de todos os endpoints (48 API, 30+ BFF proxy, 18 mobile api.ts)
  - Identificados 6 endpoints mobile que falham sem ADMIN_API_KEY (Events/Setlist CRUD)
  - Confirmado: token JWT de ADMIN/LEADER não é aceito em endpoints Events/Setlist do backend
- Pendências:
  - **[URGENTE]** Fase 1 segurança: Unificar auth no backend (aceitar JWT em EvEvents/Setlist)
  - **[URGENTE]** Remover ADMIN_API_KEY da config mobile
  - Testar APK com login Google no dispositivo físico
  - Popular `packages/types/` com interfaces compartilhadas
  - `prisma db push` para aplicar EventType, Organization, AuditLog
- Próximo passo:
  - Fase 1 do roadmap: Corrigir auth no backend — `events.controller.ts` e `setlist.controller.ts` devem aceitar JWT com roles ADMIN/LEADER além de ADMIN_API_KEY. Depois remover `EXPO_PUBLIC_ADMIN_API_KEY` do mobile.

### [2026-04-04 — GitHub Copilot / Claude Sonnet 4.6]
- Objetivo: Fase 1 segurança (DEC-003) — unificar autenticação no backend e remover ADMIN_API_KEY do mobile.
- Feito:
  - `auth.service.ts` — adicionado método `assertAdminKeyOrContentManager(authorization)`: aceita ADMIN_API_KEY (fast path) OU JWT de ADMIN/LEADER/SUPER_ADMIN (path com validação DB via `assertCanManageContent`).
  - `events.controller.ts` — removido `assertAdminKey()` privado e `adminApiKey` field; injetado `AuthService`; todos os handlers de escrita agora usam `await this.authService.assertAdminKeyOrContentManager(auth)`.
  - `setlist.controller.ts` — mesmo padrão: injetado `AuthService`, handlers de escrita migrados.
  - `organizations.controller.ts` — removido `requireAdmin()` privado e `adminApiKey` field; injetado `AuthService`; 6 handlers migrados.
  - `apps/mobile/src/lib/api.ts` — removido import e uso de `ADMIN_API_KEY` em todas as 10 funções; bearerToken agora usa apenas `accessToken` do usuário logado.
  - `apps/mobile/src/lib/config.ts` — removida exportação `ADMIN_API_KEY`.
  - `apps/mobile/src/screens/SongsScreen.tsx` — atualizado texto de UI para não mencionar `EXPO_PUBLIC_ADMIN_API_KEY`.
- Arquivos: 7 arquivos alterados.
- Validação:
  - `npx tsc --noEmit` na API: 0 erros no código de produção. 4 erros pré-existentes em arquivos de teste (`auth.service.test.ts`, `setlist.service.test.ts`) — tipo `never` em mocks. Não relacionados às mudanças desta sessão.
  - Grep confirmou: zero referências a `ADMIN_API_KEY` em `apps/mobile/src/`.
- Pendências:
  - Rebuild APK com `ADMIN_API_KEY` removido para distribuição definitiva.
  - Testar login LEADER/ADMIN no app → deve criar/editar events/setlist sem ADMIN_API_KEY.
  - Corrigir erros pre-existentes em testes (tipo `never` em mocks).
  - Fase 2: Feature parity web — tela de organizações/membros.
  - Fase 3: Push notifications (FCM).
- Próximo passo:
  - Testar o fluxo completo no mobile com usuário LEADER/ADMIN logado: criar evento, editar setlist — confirmar que funciona sem ADMIN_API_KEY.

### [2026-04-04 — GitHub Copilot / Claude Sonnet 4.6] — Fase 2: Auth Consistency
- Objetivo: TTL de token estendido + detecção automática de sessão expirada no mobile.
- Feito:
  - `apps/api/src/auth/auth.service.ts` — TTL de 12h → 7 dias (`60 * 60 * 24 * 7`). Usuários não precisam re-autenticar diariamente.
  - `apps/mobile/src/lib/api.ts`:
    - Adicionado `onUnauthorized` callback module-level, `setUnauthorizedHandler(handler)` export público, e `authFetch(url, init)` helper.
    - `authFetch` chama `onUnauthorized?.()` quando response.status === 401, antes de retornar.
    - 11 funções que fazem chamadas autenticadas migradas de `fetch(` → `authFetch(`: `updateChecklistItem`, `previewSongTxt`, `importSongTxt`, `createEvent`, `updateEvent`, `deleteEvent`, `addSetlistItem`, `removeSetlistItem`, `updateSetlistItem`, `reorderSetlist`, `updateProfile`.
  - `apps/mobile/App.tsx`:
    - Importado `setUnauthorizedHandler`.
    - `logout()` agora aceita parâmetro opcional `statusMessage` (default: "Sessão encerrada.").
    - Novo `useEffect` registra handler: quando 401 detectado em qualquer chamada autenticada, executa `logout("Sessão expirada. Faça login novamente.")` automaticamente.
- Arquivos: 3 arquivos alterados.
- Validação: `get_errors` — 0 erros em api.ts, App.tsx e auth.service.ts.
- Pendências:
  - Rebuild APK com as mudanças de Fase 1+2.
  - Verificar Google Client IDs multi-plataforma no backend (Fase 2 item 3 ainda aberto).
  - Fase 3: Popular `packages/types/` com interfaces compartilhadas.
- Próximo passo:
  - Verificar `GOOGLE_CLIENT_IDS` no backend — garantir que tokens Android e iOS são aceitos (não só Web). Depois: Fase 3 (shared types).

### [2026-04-04 — GitHub Copilot / Claude Sonnet 4.6] — Fase 2 item 3: Google Client IDs multi-plataforma
- Objetivo: Garantir que o backend aceita tokens Google de todas as plataformas (Android, iOS, Web).
- Feito:
  - **Diagnóstico**: Backend já suporta `GOOGLE_CLIENT_IDS` (CSV) + `GOOGLE_CLIENT_ID` via `resolveGoogleClientIds()`. `verifyIdToken()` recebe `audience: string[]` — aceita qualquer plataforma configurada. Código estava correto; gap era de configuração e documentação.
  - `apps/api/src/auth/auth.controller.ts` — adicionado `onModuleInit()` com avisos em produção:
    - Avisa se `GOOGLE_CLIENT_IDS` vazio e `AUTH_BOOTSTRAP_MODE=false` → login desabilitado
    - Avisa se `AUTH_BOOTSTRAP_MODE=true` em produção (risco de segurança)
  - `.env.example` — reescrito completo: inclui todas as variáveis de API, Web, Mobile (Android + iOS + Web Client ID), Redis, SMTP, Docker
  - `.env.local` — removido `EXPO_PUBLIC_ADMIN_API_KEY` (código que usava foi removido na Fase 1)
  - `docs/DEPLOY_CHECKLIST.md` — item `GOOGLE_CLIENT_IDS` expandido com instruções sobre Android (SHA-1), iOS (bundle ID), Web Client IDs
- Arquivos: 4 arquivos alterados.
- Validação: `get_errors` → 0 erros em `auth.controller.ts`.
- Pendências:
  - Rebuild APK após Fase 1+2+2.3 (mudanças de auth).
  - Preencher `GOOGLE_CLIENT_IDS` no GitHub Secrets (Web + Android + iOS Client IDs do GCP).
  - Fase 3: Popular `packages/types/` com interfaces compartilhadas.
- Próximo passo:
  - Fase 3: Criar `packages/types/index.ts` com interfaces compartilhadas (User, Event, Song, Setlist, Checklist). Atualizar imports no mobile, web e API.


### [2026-04-04 — GitHub Copilot / Claude Sonnet 4.6] — Fase 3: Shared Types (@overflow/types)
- Objetivo: Criar pacote de tipos compartilhados e eliminar duplicação de tipos entre web e mobile.
- Feito:
  - `packages/types/package.json` — pacote `@overflow/types` (privado, versionado 0.1.0)
  - `packages/types/tsconfig.json` — configuração TS isolada para o pacote
  - `packages/types/index.ts` — fonte de verdade com 20+ tipos: `AuthUser`, `Song`, `SongChordChart`, `ParsedChart`, `SongSection`, `SongSectionLine`, `MusicEvent`, `SetlistItem`, `EventSetlist`, `ChecklistTemplate`, `ChecklistRunItem`, `ChecklistRun`, `LoginPayload`, `LoginResponse`, enums`UserRole`, `UserStatus`, `EventStatus`, `ChordChartSourceType`
  - **Bug corrigido**: nomes de campo `rawContent`/`structuredContent` (errados) → `rawText`/`parsedJson` (nomes reais do Prisma schema) em `SongChordChart`. Atualizado em `SongsScreen.tsx` (mobile) e `songs/[songId]/page.tsx` (web).
  - `apps/mobile/metro.config.js` — criado para o Metro resolver pacotes do monorepo (`watchFolders` + `nodeModulesPaths`)
  - `apps/mobile/package.json` — adicionado `@overflow/types: "*"`
  - `apps/mobile/src/types.ts` — substituído por re-export de `@overflow/types` (compatibilidade mantida)
  - `apps/web/package.json` — adicionado `@overflow/types: "*"`
  - `apps/web/tsconfig.json` — adicionado path `@overflow/types → ../../packages/types/index.ts`
  - Web: removidos tipos inline duplicados em 8 arquivos: `AuthGate.tsx`, `GlobalHeader.tsx`, `SessionStatusBanner.tsx`, `checklists/page.tsx`, `songs/page.tsx`, `events/[eventId]/page.tsx`, `events/[eventId]/present/page.tsx`, `songs/[songId]/page.tsx`
- Arquivos alterados: 16 arquivos.
- Validação: `tsc --noEmit` → 0 erros no mobile e 0 erros no web.
- Pendências:
  - Rebuild APK com mudanças de Fase 1+2+3.
  - Configurar Google OAuth IDs no GCP e preencher env vars.
  - Fase 4: Navegação com expo-router (substituir BottomTabs manual).
- Próximo passo:
  - Fase 4: Migrar navegação mobile de BottomTabs manual para expo-router com Stack + Tabs.

---

### [2026-04-04 18:25 America/Recife] — GitHub Copilot (Claude Sonnet 4.6) — Fase 4: expo-router
- Objetivo: Migrar navegação mobile de BottomTabs manual para expo-router com Stack + Tabs.
- Feito:
  - Instalado `expo-router ~55.0.10`, `react-native-safe-area-context`, `react-native-screens`, `expo-linking`, `expo-constants` via `npx expo install` (plugin expo-router registrado automaticamente no `app.json`).
  - Criado `apps/mobile/src/context/SessionContext.tsx`:
    - Extrai TODA a lógica de App.tsx para um contexto React reutilizável.
    - Expõe: auth (accessToken, user, loadingSession, isLoggedIn, statusText, login, logout, updateUser), eventos (events, activeEventId, eventSetlist, handlers de CRUD), checklist (templates, eventId, eventChecklist, loadChecklist, toggleChecklistItem), songs (songPreview, songImportResult, loadSongPreview, saveSongTxt).
    - Usa `accessTokenRef` para closures estáveis em handlers assíncronos.
  - Criado `apps/mobile/app/_layout.tsx` (Root Layout):
    - Configura `Notifications.setNotificationHandler` global.
    - `SessionProvider` envolve tudo.
    - `ProtectedLayout` (client): auth redirect (user ↔ /login, user → /(tabs)/events), notification tap → `router.replace("/(tabs)/events")`.
    - Loading screen enquanto `loadingSession=true`.
  - Criado `apps/mobile/app/(tabs)/_layout.tsx`: Tabs com 4 abas (Eventos, Checklist, Músicas, Conta), tabBarStyle tematizado (#0b1828).
  - Criado `apps/mobile/app/(tabs)/events.tsx` — render de `EventsScreen` com props via `useSession()`.
  - Criado `apps/mobile/app/(tabs)/checklist.tsx` — render de `ChecklistScreen` com props via `useSession()`.
  - Criado `apps/mobile/app/(tabs)/songs.tsx` — render de `SongsScreen` com props via `useSession()`.
  - Criado `apps/mobile/app/(tabs)/account.tsx` — render de `AccountScreen` com `updateUser` via `useSession()`.
  - Criado `apps/mobile/app/login.tsx` — render de `LoginScreen` com `login` via `useSession()`.
  - Atualizado `apps/mobile/package.json`: `"main": "expo-router/entry"` (era `"node_modules/expo/AppEntry.js"`).
- Arquivos:
  - `apps/mobile/src/context/SessionContext.tsx` (novo)
  - `apps/mobile/app/_layout.tsx` (novo)
  - `apps/mobile/app/(tabs)/_layout.tsx` (novo)
  - `apps/mobile/app/(tabs)/events.tsx` (novo)
  - `apps/mobile/app/(tabs)/checklist.tsx` (novo)
  - `apps/mobile/app/(tabs)/songs.tsx` (novo)
  - `apps/mobile/app/(tabs)/account.tsx` (novo)
  - `apps/mobile/app/login.tsx` (novo)
  - `apps/mobile/package.json` (main entry atualizado)
  - `apps/mobile/package.json` (dependências expo-router adicionadas)
  - `apps/mobile/app.json` (plugin expo-router adicionado automaticamente)
- Validação:
  - `tsc --noEmit` com `apps/mobile/tsconfig.json`: **EXIT:0 (0 erros)**.
  - `get_errors` em todos os 8 novos arquivos: **0 erros**.
- Nota: `App.tsx` na raiz do mobile foi mantido para compatibilidade de referências, mas não é mais o entry point. A lógica foi migrada para `SessionContext.tsx`.
- Pendências:
  - Rebuild APK com mudanças de Fase 1+2+3+4.
  - Testar navegação em Expo Go ou simulador (taps nas tabs, auth redirect, notification tap).
  - Configurar Google OAuth IDs no GCP.
- Próximo passo:
  - Testar app no dispositivo/Expo Go e confirmar que navegação funciona como esperado.

