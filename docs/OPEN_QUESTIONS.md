# OPEN_QUESTIONS.md

## Q-001
- Assunto: Escopo do MVP na primeira entrega (autenticação + setlist + upload de cifra?)
- Impacto: Define priorização do sprint 1.
- Dono: Produto
- Status: Aberta

## Q-002
- Assunto: No MVP, a validação do login Google será estritamente por `idToken` validado no backend ou pode iniciar com modo bootstrap controlado por ambiente?
- Impacto: Define prioridade de segurança e esforço técnico da autenticação.
- Dono: Produto/Backend
- Status: Parcialmente resolvida (implementado: validação `idToken` + bootstrap opcional por `AUTH_BOOTSTRAP_MODE`)

## Q-003
- Assunto: Auth mobile — JWT ou ADMIN_API_KEY? Atualmente o mobile usa ADMIN_API_KEY como fallback, expondo a key no APK.
- Impacto: Segurança crítica. Qualquer pessoa pode descompilar o APK e obter acesso admin.
- Dono: Backend/Mobile
- Status: **Resolvida** — `apps/mobile/src/lib/api.ts` usa apenas JWT (`accessToken` do usuário autenticado). `apps/mobile/src/lib/config.ts` não exporta `ADMIN_API_KEY`. Backend aceita JWT via `assertAdminKeyOrContentManager` em todos os controllers de escrita. Rebuild do APK pendente para refletir na distribuição.

## Q-004
- Assunto: Refresh token — implementar ou estender TTL do JWT?
- Impacto: UX mobile (logout inesperado a cada 12h).
- Dono: Backend
- Status: **Resolvida** — `POST /api/auth/refresh` implementado (aceita JWT válido, emite novo com TTL 7d). Mobile intercepta 401 com retry automático via `authFetch`; `bootstrapSession` faz refresh proativo se token expira em < 2 dias.

## Q-005
- Assunto: Google Client ID — tipo Web ou tipo Android para o mobile?
- Impacto: Login Google funciona se client ID type=Web, mas para Play Store pode ser necessário type=Android com SHA-1 fingerprint.
- Dono: DevOps/Mobile
- Status: Aberta — atualmente usando type=Web para ambas as plataformas.

## Q-006
- Assunto: Packages compartilhados (`packages/types/`, `packages/parser/`) — popular agora ou pós-MVP?
- Impacto: Manutenibilidade, redução de tipos duplicados, reuso do parser.
- Dono: Tech Lead
- Status: **Resolvida** — `packages/types` já existia com tipos de domínio. `packages/parser` criado com `parseChordTxt` extraído do API usando tipos de `@overflow/types`. API usa re-export barrel. Mobile pode consumir `@overflow/parser` diretamente quando precisar renderizar cifras localmente.

## Q-007
- Assunto: Migração de navegação mobile — `expo-router` vs `@react-navigation/native`?
- Impacto: Deep linking, back button, UX geral, stack navigation para detail pages.
- Dono: Mobile
- Status: Aberta

## Q-008
- Assunto: Worker real — BullMQ/Redis para processamento async (push batch, imports), ou manter simplificado?
- Impacto: Performance e UX quando base de usuários crescer.
- Dono: Backend
- Status: Aberta — worker placeholder existe mas não processa nada.
