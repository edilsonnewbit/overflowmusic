# AGENTS.md

Este arquivo define como agentes de IA devem operar neste repositório para manter continuidade entre diferentes LLMs com baixo custo de contexto.

## 1. Objetivo Operacional
- Permitir que qualquer LLM continue o trabalho sem perder contexto.
- Evitar respostas longas e repetição de histórico.
- Garantir rastreabilidade de decisões técnicas.

## 2. Regras Gerais para Agentes
- Sempre ler, nesta ordem:
  1. `PROJETO_OVERFLOW_MUSIC.md`
  2. `docs/LLM_WORKFLOW.md`
  3. `docs/DEV_LOG.md` (última entrada)
- Nunca assumir contexto fora do repositório.
- Não reescrever seções antigas do log; apenas anexar nova entrada.
- Toda mudança técnica deve registrar: objetivo, arquivos afetados, status.
- Em caso de dúvida de escopo, registrar pergunta em `docs/OPEN_QUESTIONS.md`.

## 3. Saída Padrão (curta)
Toda entrega deve conter:
- `Resumo`: 2-5 linhas.
- `Arquivos alterados`: lista direta.
- `Pendências`: bullets curtos.
- `Próximo passo`: 1 ação concreta.

## 4. Limite de Tokens e Contexto
- Preferir referências por arquivo/linha ao invés de colar conteúdo grande.
- Ao retomar trabalho, usar no máximo:
  - última entrada de `docs/DEV_LOG.md`
  - seção relevante do arquivo atual
- Proibido repetir roadmap completo em cada resposta.

## 5. Convenção de Branch/Commit (quando iniciar código)
- Branch: `feat/<tema-curto>` ou `fix/<tema-curto>`
- Commits curtos e semânticos:
  - `feat(auth): adiciona fluxo de aprovação admin`
  - `chore(devops): adiciona compose de produção`

## 6. Definição de Pronto por Tarefa
Uma tarefa só está pronta quando:
- código/config está aplicado
- validação mínima executada (build/test/lint ou justificativa)
- entrada de handoff adicionada em `docs/DEV_LOG.md`
