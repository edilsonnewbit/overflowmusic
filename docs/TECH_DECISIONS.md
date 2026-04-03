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
