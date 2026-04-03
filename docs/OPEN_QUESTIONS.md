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
