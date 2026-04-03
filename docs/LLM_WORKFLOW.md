# Workflow Multi-LLM (baixo consumo de tokens)

## 1. Estrutura de trabalho recomendada
Use papéis fixos para evitar confusão:
- LLM 1 (Planner): quebra o trabalho em tarefas pequenas.
- LLM 2 (Implementer): executa apenas a tarefa atual.
- LLM 3 (Reviewer): revisa risco/regressão e valida critérios.

Se estiver usando apenas 2 LLMs:
- LLM A: Planner + Reviewer
- LLM B: Implementer

## 2. Ciclo padrão (loop curto)
1. Ler última entrada de `docs/DEV_LOG.md`.
2. Escolher 1 tarefa atômica (até 2h de trabalho).
3. Implementar.
4. Validar.
5. Registrar handoff em `docs/DEV_LOG.md`.
6. Encerrar com próximo passo explícito.

## 3. Regra anti-perda de contexto
Cada LLM deve trabalhar com este pacote mínimo:
- `Contexto atual`: 1 parágrafo
- `Tarefa atual`: 1 item
- `Restrições`: 3-5 bullets
- `Saída esperada`: arquivos + critério de aceite

Não carregar conversas antigas completas se o log está atualizado.

## 4. Formato de handoff obrigatório
Adicionar no `docs/DEV_LOG.md`:
- `Data/Hora`
- `LLM/Agente`
- `Objetivo`
- `Feito`
- `Arquivos`
- `Validação`
- `Pendências`
- `Próximo passo`

## 5. Estratégia para reduzir tokens
- Referenciar decisões por ID (`DEC-001`, `DEC-002`) ao invés de repetir explicações.
- Manter decisões em `docs/TECH_DECISIONS.md` com no máximo 10 linhas cada.
- Cada entrada do log com máximo de 20-30 linhas.

## 6. Escalonamento de conflito entre LLMs
Se houver respostas divergentes:
1. Registrar conflito em `docs/OPEN_QUESTIONS.md`.
2. Comparar impacto em segurança, custo e prazo.
3. Escolher opção e registrar decisão em `docs/TECH_DECISIONS.md`.

## 7. Critério de continuidade
A próxima LLM deve conseguir continuar em menos de 5 minutos apenas lendo:
- `docs/DEV_LOG.md` (última entrada)
- `docs/OPEN_QUESTIONS.md`
- arquivos alterados na última entrada
