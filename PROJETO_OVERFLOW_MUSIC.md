# Projeto de Software — Overflow Music Platform

## 1. Objetivo do Produto
Construir uma plataforma **multiplataforma (Web + Android + iOS)** para gestão de eventos musicais, setlists, cifras e equipes de louvor, com experiência moderna, colaborativa e segura.

O produto deve permitir:
- Uso completo em **Web e Mobile**.
- Gestão de dados e conteúdo em **ambas as plataformas**.
- Login com **Google OAuth** e **aprovação por administradores**.
- Cadastro de músicas e cifras via **upload de arquivos `.txt`** no padrão do arquivo anexo.
- Operação em produção via **Docker na Hostinger VPS**, com domínio oficial `https://music.overflowmvmt.com`.

---

## 2. Análise do HTML de Referência (base funcional atual)
A página `overflow_10abril_apresentacao.html` demonstra um MVP estático com foco em apresentação de evento/setlist. Funções identificadas:

### 2.1 Estrutura de navegação
- Abas principais:
  - Jornada
  - Setlist
  - Equipe
  - Momentos
  - Checklist
- Navegação por tab com troca de conteúdo (`showTab`).

### 2.2 Setlist e músicas
- Cards expansíveis por música (`toggleSong`).
- Exibição de:
  - Nome da música
  - Tom
  - Voz principal
  - Zona litúrgica/energia
- Letra resumida + expansão para letra completa (`toggleLetra`).
- Indicadores de momento especial (ex.: clímax, transição, encerramento).

### 2.3 Jornada espiritual/fluxo do evento
- Mapa visual com sequência da apresentação.
- Classificação por zonas (Z1..Z4/5).
- Destaques de transições e clímax.

### 2.4 Equipe
- Lista de funções e responsáveis.
- Estado de confirmação visual.

### 2.5 Checklist
- Checklist interativo por etapa (pré-evento, no local, pós-evento).
- Marcação de itens (`toggleCheck`).

### 2.6 Limitações do modelo atual
- Conteúdo hardcoded (sem banco de dados).
- Sem autenticação/autorização.
- Sem edição colaborativa.
- Sem persistência de checklist/setlist por usuário/evento.
- Sem importação estruturada de cifra por arquivo.

---

## 3. Requisitos Funcionais (Produto alvo)

## 3.1 Autenticação e Acesso
- Login via Google (OAuth 2.0 / OpenID Connect).
- Primeiro acesso cria usuário com status `PENDING_APPROVAL`.
- Apenas usuários aprovados por admin podem entrar no app.
- Perfis:
  - `SUPER_ADMIN`
  - `ADMIN`
  - `LEADER`
  - `MEMBER`
- Controle granular por organização/equipe.

## 3.2 Gestão de Organizações e Equipes
- Criar organização (igreja/ministério).
- Convidar membros.
- Definir funções (vocal, guitarra, teclado, etc).
- Ativar/desativar membros.

## 3.3 Gestão de Eventos
- Criar evento com:
  - Nome, data/hora, local, descrição
  - Tipo (culto, conferência, ensaio)
- Associar equipe ao evento.
- Definir “momentos especiais” (pregação, oração, transição).

## 3.4 Setlist
- Criar/editar setlist por evento.
- Reordenar músicas (drag-and-drop).
- Definir tom, líder vocal, tags de zona (Z1..Z5), notas de transição.
- Visualização em modo apresentação (sem distrações).

## 3.5 Músicas e Cifras
- Cadastro manual de música.
- Upload de cifra por `.txt` no padrão observado:
  - Título
  - Seções (`[Intro]`, `[Refrão]`, `[Ponte]` etc.)
  - Linhas de cifra sobre a letra
  - Tablaturas (`[Tab - Solo]`)
  - Bloco de acordes finais
- Parser automático com preview antes de salvar.
- Edição pós-importação.
- Busca por título, tom, tema, ministro, tags.

## 3.6 Checklist Operacional
- Templates de checklist por tipo de evento.
- Checklist por evento com status por item.
- Histórico de conclusão e responsável.

## 3.7 Dashboard e Gestão
- Painel administrativo:
  - Solicitações pendentes de aprovação
  - Próximos eventos
  - Setlists recentes
  - Indicadores de uso

## 3.8 Sincronização Web/Mobile
- Mesmos dados e permissões nas duas plataformas.
- Cache offline no mobile (últimos eventos/setlists acessados).
- Sincronização ao reconectar.

---

## 4. Requisitos Não Funcionais

## 4.1 UX/UI
- Interface moderna, visualmente forte, com foco em legibilidade de cifra/letra.
- Design system único para Web e Mobile.
- Acessibilidade: contraste AA, tamanho mínimo de fonte, foco visível.
- Navegação rápida entre música atual/anterior/próxima no modo apresentação.

## 4.2 Segurança
- OAuth Google com validação de ID Token no backend.
- RBAC no backend e frontend.
- Aprovação de usuários somente por admins.
- Criptografia em trânsito (HTTPS/TLS).
- Rate limiting e proteção contra abuso.
- Validação de upload e parser seguro de `.txt` (sem execução de conteúdo).
- Logs de auditoria para ações críticas.

## 4.3 Performance
- API com paginação e cache.
- Lazy loading de listas e componentes pesados.
- Render otimizado da tela de setlist/letra.
- Meta de tempo:
  - TTFB API < 300ms (p95 em cargas normais)
  - Tela principal < 2s em 4G

## 4.4 Confiabilidade
- Observabilidade com logs estruturados, métricas e alertas.
- Backups automáticos diários do banco.
- SLO inicial: 99.5% de disponibilidade.

---

## 5. Arquitetura Recomendada (Docker + Hostinger)

## 5.1 Stack sugerida (monorepo)
- `apps/web`: Next.js (React + TypeScript)
- `apps/mobile`: React Native com Expo
- `apps/api`: NestJS (ou Fastify + TypeScript)
- `apps/worker`: worker de jobs assíncronos (fila)
- `packages/ui`: Design system compartilhado
- `packages/types`: Tipos e contratos
- `packages/parser`: Parser de cifra `.txt`

## 5.2 Infra de produção (VPS Hostinger)
- Orquestração: `docker compose`
- Reverse proxy: `nginx` (80/443)
- SSL: `certbot` (Let's Encrypt)
- Serviços:
  - `web` (Next.js)
  - `api` (backend)
  - `worker` (jobs)
  - `postgres` (banco)
  - `redis` (cache/fila)
  - `nginx` (proxy)
  - `certbot` (renovação TLS)

## 5.3 Domínios e rotas
- Produção principal: `https://music.overflowmvmt.com`
- Regras:
  - `/` e páginas web -> serviço `web`
  - `/api` -> serviço `api`
- URL pública da API para frontend: `https://music.overflowmvmt.com/api`

## 5.4 Comunicação
- REST API (fase 1), com possível evolução para GraphQL.
- WebSocket opcional para colaboração em tempo real.

---

## 6. Modelo de Dados (alto nível)

### Entidades principais
- `User`
  - id, name, email, googleSub, status, role, createdAt
- `Organization`
  - id, name, slug
- `OrganizationMember`
  - userId, organizationId, role
- `ApprovalRequest`
  - id, userId, organizationId, status, reviewedBy, reviewedAt
- `Event`
  - id, organizationId, title, dateTime, location, description, status
- `Setlist`
  - id, eventId, title, notes
- `SetlistItem`
  - id, setlistId, songId, order, key, zone, leaderId, transitionNotes
- `Song`
  - id, organizationId, title, artist, bpm, defaultKey, tags
- `ChordChart`
  - id, songId, sourceType(txt/manual), rawText, parsedJson, version
- `ChecklistTemplate`
  - id, organizationId, name, items
- `ChecklistRun`
  - id, eventId, templateId
- `ChecklistItemRun`
  - id, checklistRunId, label, checked, checkedBy, checkedAt
- `AuditLog`
  - id, actorId, action, resourceType, resourceId, metadata, createdAt

---

## 7. Fluxos Críticos

## 7.1 Login Google + Aprovação Admin
1. Usuário entra com Google.
2. Backend valida token e cria usuário `PENDING_APPROVAL` (se novo).
3. Admin recebe item pendente no painel.
4. Admin aprova ou rejeita.
5. Usuário aprovado recebe acesso conforme role.

## 7.2 Importação de cifra `.txt`
1. Usuário seleciona arquivo `.txt`.
2. Backend valida tipo/tamanho/encoding.
3. Parser converte para estrutura:
   - metadados
   - seções
   - linhas com cifra/letra
   - tablaturas
   - acordes
4. Tela de preview para correção.
5. Usuário salva versão final da cifra.

## 7.3 Gestão do setlist em evento
1. Criar evento.
2. Adicionar músicas do catálogo.
3. Reordenar itens e definir tons/líder/transições.
4. Publicar setlist.
5. Equipe visualiza no app web/mobile.

---

## 8. Especificação do Parser `.txt` (baseado no anexo)

## 8.1 Formato esperado
- Primeira linha: `Artista - Música`.
- Seções entre colchetes: `[Intro]`, `[Refrão]`, `[Ponte]`, `[Tab - Solo]`, etc.
- Cifras em linha própria, geralmente acima da letra.
- Bloco de acordes ao final (`Am = X 0 2 2 1 0`).

## 8.2 Estratégia de parsing
- Normalizar quebra de linha e encoding UTF-8.
- Segmentar por seções (`/^\[.*\]$/`).
- Detectar linhas de cifra por regex de acordes.
- Preservar blocos de tablatura como `tab_block`.
- Capturar bloco final de acordes como dicionário.

## 8.3 Regras de validação
- Arquivo máximo: 1MB (ajustável).
- Extensão permitida: `.txt`.
- Bloquear arquivos binários.
- Sanitizar conteúdo para exibição segura.

## 8.4 Saída JSON alvo (resumo)
- `title`
- `artist`
- `sections[]`:
  - `name`
  - `lines[]` (`chords`, `lyrics`, `type`)
- `tabs[]`
- `chordDictionary{}`

---

## 9. UX/UI — Diretrizes de Produto

## 9.1 Princípios
- “Uso em palco”: leitura rápida, contraste alto, interação com poucos toques.
- “1 tarefa por tela”: evitar poluição visual.
- Consistência Web/Mobile com adaptações nativas.

## 9.2 Telas essenciais
- Login / aguardando aprovação
- Dashboard
- Eventos
- Setlist (edição)
- Setlist (apresentação)
- Músicas / Cifras
- Upload + preview de cifra
- Equipe
- Checklist
- Painel de aprovação (admin)

## 9.3 Boas práticas de interação
- Auto-save em formulários longos.
- Undo para ações críticas (ex.: remover item setlist).
- Feedback claro de status (salvando, publicado, offline).

---

## 10. Segurança — Plano de Implementação

## 10.1 Controles técnicos
- JWT curto + refresh token rotativo.
- Verificação server-side de permissões em todas as rotas.
- Helmet/CORS estrito/CSRF (onde aplicável).
- Upload scanning básico e validação MIME real.
- Secrets em GitHub Secrets/Hostinger Secrets (não em repositório).

## 10.2 Controles de processo
- Revisão de código obrigatória.
- Dependabot/SCA para vulnerabilidades.
- Testes de autorização por role.
- Auditoria de ações administrativas.

## 10.3 Hardening de containers
- `restart: always` em produção.
- Healthchecks em `postgres` e `redis`.
- `pull_policy: always` para garantir atualização por tag.
- Usuário não-root nas imagens da aplicação.

---

## 11. Performance — Plano de Implementação

## 11.1 Backend
- Índices em colunas de busca frequente.
- Query profiling e paginação obrigatória.
- Cache de leitura para eventos/setlists.

## 11.2 Frontend
- Code splitting e lazy loading.
- Virtualização de listas longas.
- Cache de dados com React Query.

## 11.3 Mobile
- Estratégia offline-first para dados de leitura.
- Pré-carregamento de setlist do evento do dia.
- Redução de re-render em tela de cifra.

---

## 12. DevOps e Deploy (Hostinger)

## 12.1 Estrutura de diretórios de deploy
```text
.
├── docker-compose.yml
├── .env
├── nginx/
│   ├── conf.d/
│   │   └── app.conf
│   └── www/
├── certbot/
│   ├── conf/
│   └── www/
├── deploy.sh
└── init-letsencrypt.sh
```

## 12.2 Estrutura de serviços no `docker-compose.yml`
- `nginx`: expõe `80/443`, roteia para web/api.
- `certbot`: renovação automática de certificados.
- `web`: app web Next.js.
- `api`: backend principal.
- `worker`: processamento assíncrono.
- `postgres`: banco relacional.
- `redis`: cache/fila.

## 12.3 Variáveis de ambiente mínimas (produção)
- `IMAGE_TAG`
- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD`
- `ADMIN_API_KEY`
- `FRONTEND_URL=https://music.overflowmvmt.com`
- `NEXT_PUBLIC_API_URL=https://music.overflowmvmt.com/api`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `JWT_SECRET`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

## 12.4 SSL Let's Encrypt (primeira emissão)
- Script base: `init-letsencrypt.sh`.
- Ajustes obrigatórios para este projeto:
  - `DOMAIN="music.overflowmvmt.com"`
  - email operacional válido.
- O `certbot` em container renova automaticamente os certificados.

## 12.5 Deploy script no servidor
- Script base: `deploy.sh`.
- Fluxo recomendado:
  - `docker compose down`
  - `docker compose pull`
  - `docker compose up -d`
  - validação de saúde dos serviços

---

## 13. CI/CD (GitHub Actions + GHCR + Hostinger)

## 13.1 Estratégia
- Trigger: `push` na `main` + `workflow_dispatch`.
- Build e push das imagens para `ghcr.io`:
  - `music-overflow-api`
  - `music-overflow-worker`
  - `music-overflow-web`
- Deploy com `hostinger/deploy-on-vps@v2`.
- Segundo deploy opcional para forçar restart (como no projeto de referência).
- Verificação de rollout por endpoint autenticado (`/api/admin/auth/check`).

## 13.2 Convenções de imagem
- `IMAGE_PREFIX=ghcr.io/<org>/music-overflow`
- tags publicadas:
  - `:latest`
  - `:${{ github.sha }}`

## 13.3 Exemplo de workflow adaptado
```yaml
name: Deploy to Hostinger

on:
  push:
    branches: [ main ]
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_PREFIX: ghcr.io/edilsonnewbit/music-overflow
  IMAGE_TAG: ${{ github.sha }}

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push API image
        uses: docker/build-push-action@v5
        with:
          context: ./apps/api
          file: ./apps/api/Dockerfile
          push: true
          tags: |
            ${{ env.IMAGE_PREFIX }}-api:latest
            ${{ env.IMAGE_PREFIX }}-api:${{ env.IMAGE_TAG }}

      - name: Build and push Worker image
        uses: docker/build-push-action@v5
        with:
          context: ./apps/worker
          file: ./apps/worker/Dockerfile
          push: true
          tags: |
            ${{ env.IMAGE_PREFIX }}-worker:latest
            ${{ env.IMAGE_PREFIX }}-worker:${{ env.IMAGE_TAG }}

      - name: Build and push Web image
        uses: docker/build-push-action@v5
        with:
          context: ./apps/web
          file: ./apps/web/Dockerfile
          push: true
          tags: |
            ${{ env.IMAGE_PREFIX }}-web:latest
            ${{ env.IMAGE_PREFIX }}-web:${{ env.IMAGE_TAG }}
          build-args: |
            NEXT_PUBLIC_API_URL=https://music.overflowmvmt.com/api

      - name: Deploy on Hostinger VPS
        uses: hostinger/deploy-on-vps@v2
        with:
          api-key: ${{ secrets.HOSTINGER_API_KEY }}
          virtual-machine: ${{ vars.HOSTINGER_VM_ID }}
          project-name: music-overflow
          docker-compose-path: docker-compose.yml
          environment-variables: |
            IMAGE_TAG=${{ env.IMAGE_TAG }}
            POSTGRES_PASSWORD=${{ secrets.POSTGRES_PASSWORD }}
            REDIS_PASSWORD=${{ secrets.REDIS_PASSWORD }}
            ADMIN_API_KEY=${{ secrets.ADMIN_API_KEY }}
            FRONTEND_URL=https://music.overflowmvmt.com
            NEXT_PUBLIC_API_URL=https://music.overflowmvmt.com/api
            GOOGLE_CLIENT_ID=${{ secrets.GOOGLE_CLIENT_ID }}
            GOOGLE_CLIENT_SECRET=${{ secrets.GOOGLE_CLIENT_SECRET }}
            JWT_SECRET=${{ secrets.JWT_SECRET }}

      - name: Verify API rollout version
        run: |
          set -euo pipefail
          sleep 30
          for i in 1 2 3 4 5 6 7 8 9 10; do
            RESPONSE=$(curl -sS -H "Authorization: Bearer ${{ secrets.ADMIN_API_KEY }}" https://music.overflowmvmt.com/api/admin/auth/check || true)
            echo "Tentativa $i/10: $RESPONSE"
            if echo "$RESPONSE" | grep -q '"ok":true' && echo "$RESPONSE" | grep -q '"version":"${{ env.IMAGE_TAG }}"'; then
              echo "Rollout confirmado"
              exit 0
            fi
            sleep 10
          done
          echo "Falha no rollout"
          exit 1
```

---

## 14. Roadmap de Implementação (fases)

## Fase 0 — Descoberta e Design (1-2 semanas)
- Levantamento detalhado com líderes/ministros.
- Wireframes e protótipo navegável.
- Definição do design system.

## Fase 1 — Fundação técnica (2 semanas)
- Monorepo, Dockerfiles e `docker-compose` de produção.
- Estrutura base API + Web + Mobile + Worker.
- Autenticação Google e gestão de sessão.

## Fase 2 — Core funcional (3-4 semanas)
- Usuários, roles e aprovação admin.
- CRUD de organização, equipe, eventos.
- Setlist básico + visualização web/mobile.

## Fase 3 — Cifras e parser (2-3 semanas)
- Upload `.txt` com parser.
- Preview e edição de cifra.
- Biblioteca de músicas com busca/filtro.

## Fase 4 — Checklist e modo apresentação (2 semanas)
- Checklist por evento com histórico.
- Tela de apresentação otimizada para palco.
- Ajustes de UX e acessibilidade.

## Fase 5 — Hardening e lançamento (2 semanas)
- Testes E2E, carga e segurança.
- Observabilidade e alertas.
- SSL definitivo, validação de domínio e go-live em `music.overflowmvmt.com`.

---

## 15. Estratégia de Qualidade

## 15.1 Testes
- Unitários: parser, regras de negócio, autorização.
- Integração: API + banco + auth.
- E2E: login, aprovação admin, criação de evento, upload de cifra.
- Teste de regressão visual (componentes críticos).

## 15.2 Critérios de aceite (exemplos)
- Usuário não aprovado não acessa dados internos.
- Admin aprova usuário e acesso é liberado imediatamente.
- Upload de `.txt` no padrão anexo gera preview correto.
- Setlist criado no web aparece no mobile em segundos.
- Deploy no Hostinger atualiza versão e endpoint de health retorna `ok`.

---

## 16. Backlog Inicial (MVP)
- Autenticação Google + aprovação admin.
- Cadastro de organização/equipe.
- CRUD de eventos.
- CRUD de músicas.
- Upload e parse de cifra `.txt`.
- Setlist com ordenação e notas.
- Checklist por evento.
- Dashboard com pendências e próximos eventos.
- Pipeline CI/CD com deploy automático Hostinger.

---

## 17. Riscos e Mitigações
- Qualidade variável dos `.txt`: criar preview + editor pós-parse.
- Complexidade de permissões: começar com RBAC simples e expandir.
- Adoção da equipe: onboarding com tutorial rápido in-app.
- Uso offline mobile: definir escopo offline por etapas.
- Falha de renovação SSL: alertas de expiração + rotina de verificação.

---

## 18. Entregáveis de Projeto
- Documento de requisitos e arquitetura (este arquivo).
- Protótipo UX/UI navegável.
- Repositório monorepo com apps web/mobile/api/worker.
- `docker-compose.yml` de produção.
- Configuração `nginx` + `certbot` para TLS.
- Workflow CI/CD GitHub Actions para Hostinger.
- Plano de operação e suporte pós-lançamento.

---

## 19. Próximos Passos Recomendados
1. Confirmar no DNS o apontamento de `music.overflowmvmt.com` para a VPS.
2. Ajustar `init-letsencrypt.sh` para o domínio novo e emitir certificado inicial.
3. Criar secrets no GitHub (`HOSTINGER_API_KEY`, `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `GOOGLE_CLIENT_*`, etc.).
4. Subir primeira versão via workflow e validar `/api/admin/auth/check`.
5. Fechar checklist de segurança (headers, CORS, rate limit, backup e rotação de senha).
