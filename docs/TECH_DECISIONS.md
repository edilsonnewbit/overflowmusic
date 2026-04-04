# TECH_DECISIONS.md

## DEC-001
- Tema: Stack inicial e estrutura base do repositório.
- Opções:
  - A) Next + Nest + Expo + Worker + Docker Compose
  - B) Next + Fastify + Expo + Docker Compose
- Decisão: A) Next + Nest + Expo + Worker + Docker Compose.
- Motivo: melhor alinhamento com o documento de produto e separação clara entre camadas de frontend, backend e jobs.
- Impacto: curva inicial um pouco maior, mas melhor organização para crescer com múltiplos módulos e times.

## DEC-002
- Tema: Estratégia de bootstrap do repositório para iniciar DevOps sem bloquear no framework.
- Opções:
  - A) Esperar scaffold completo Next/Nest antes de configurar deploy.
  - B) Criar apps placeholder executáveis e manter contrato de infraestrutura.
- Decisão: B) apps placeholder executáveis neste primeiro ciclo.
- Motivo: habilita pipeline, imagens e deploy na Hostinger imediatamente, reduzindo risco de integração tardia.
- Impacto: próxima iteração deve migrar placeholders para Next/Nest mantendo paths, imagens e fluxo de CI/CD já estáveis.

## DEC-003
- Tema: Estratégia de auth para endpoints de escrita (Events, Setlist, Organizations).
- Opções:
  - A) Apenas ADMIN_API_KEY (server-to-server).
  - B) JWT (ADMIN/LEADER) OU ADMIN_API_KEY.
  - C) Migrar todo para JWT, remover ADMIN_API_KEY.
- Decisão: B) aceitar JWT (ADMIN/LEADER) OU ADMIN_API_KEY.
- Motivo: permite que o mobile opere com JWT sem expor ADMIN_API_KEY no APK; web BFF continua usando ADMIN_API_KEY no servidor; backward compatible.
- Impacto: backend precisa refatorar guards em events.controller.ts, setlist.controller.ts e organizations.controller.ts.
- Status: Pendente implementação.

## DEC-004
- Tema: Pacotes compartilhados no monorepo (`packages/types`, `packages/parser`).
- Opções:
  - A) Popular packages com tipos e parser compartilhados agora.
  - B) Adiar para pós-MVP.
- Decisão: A) Popular agora com escopo mínimo (só interfaces de domínio e parser).
- Motivo: tipos duplicados entre mobile/web/api já causam inconsistências (ex: eventType existe no schema mas não no mobile). Parser duplicado é desnecessário.
- Impacto: 2-4h de trabalho, reduz drift entre plataformas.

## DEC-005
- Tema: Navegação mobile — abordagem atual (tabs manuais) vs library dedicada.
- Opções:
  - A) Manter tabs manuais (simples, funcional).
  - B) Migrar para `expo-router` (file-based routing).
  - C) Migrar para `@react-navigation/native` (stack + tabs).
- Decisão: Adiar para pós-Google-Auth-funcional. Tabs manuais são suficientes até o MVP funcionar end-to-end.
- Motivo: prioridade é estabilizar auth e segurança antes de refatorar UX.
- Impacto: deep linking e back button não funcionam nativamente; aceitável para MVP.
