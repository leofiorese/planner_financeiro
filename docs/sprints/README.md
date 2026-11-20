# Sprints — Roadmap de implementação

Este diretório guarda o plano de implementação dividido em sprints. Cada sprint tem N fases sequenciais, e cada fase deve caber em um PR revisável.

| Sprint | Arquivo | Objetivo | Status |
|---|---|---|---|
| 1 | [SPRINT_01_BUDGET.md](./SPRINT_01_BUDGET.md) | Budget Mensal com dia de virada configurável, integração Metas × Budget, alertas e fechamento de período com aporte | ⬜ Não iniciada |
| 2 | [SPRINT_02_UI_UX.md](./SPRINT_02_UI_UX.md) | Redesign UI/UX desktop-first: shadcn/ui, sidebar, só pt-BR, refactor das páginas gigantes, limpeza e acessibilidade | ⬜ Não iniciada |

**Ordem:** a Sprint 1 vem antes da Sprint 2. A Sprint 1 é construída sobre a UI atual. Os componentes de budget devem ficar isolados em `frontend/components/budget/` para que a Sprint 2 só precise reestilizá-los.

Regras de negócio do budget: [`../BUDGET_LOGIC.md`](../BUDGET_LOGIC.md). Contexto geral do repo: [`../../CLAUDE.md`](../../CLAUDE.md).

---

## Protocolo de progresso (como os agentes se comunicam)

Cada arquivo de sprint termina com uma seção **📋 Progresso**, que é a única fonte de verdade sobre o andamento. Ela tem estas partes:

1. **Tabela de status por fase:** fase, status, responsável (agente/sessão), branch/PR e datas.
2. **Checklist da fase:** os itens `- [ ]` de cada fase, que são marcados `- [x]` à medida que são concluídos.
3. **Log do agente:** entradas datadas, mais novas no topo.
4. **Handoff:** o que o próximo agente precisa saber para continuar.
5. **Bloqueios / perguntas ao usuário:** o que depende de uma decisão humana.

### Legenda de status

| Ícone | Significado |
|---|---|
| ⬜ | Pendente |
| 🟡 | Em andamento (alguém pegou a fase) |
| 🔍 | Em revisão (PR aberto) |
| ✅ | Concluída (critérios de aceite verificados e PR mergeado) |
| ⛔ | Bloqueada (ver "Bloqueios") |

### Regras

1. **Antes de começar** uma fase: leia a fase inteira, o Handoff mais recente e os Bloqueios. Marque a fase como 🟡 com seu identificador e a data.
2. **Uma fase por vez por agente.** Não comece a fase N+1 antes de a fase N estar ao menos 🔍, a menos que a tabela diga que elas são independentes.
3. **Branch por fase:** `feat/s1-f1.2-budget-engine`, `refactor/s2-f2.4-expenses`, e assim por diante. Commits em Conventional Commits pt-BR.
4. **Desvios do plano** (mudança de abordagem, arquivo diferente, escopo cortado) são registrados no Log com o motivo. Se o desvio muda uma regra de negócio, ele vai para **Bloqueios** e espera o usuário.
5. **Nunca marque ✅** sem rodar e passar os **Critérios de aceite** da fase e os checks padrão:
   - `frontend`: `npm run typecheck && npm run lint && npm test && npm run build`
   - `backend`: `npm run typecheck && npm test`
6. **Ao terminar** (ou ao parar no meio), escreva uma entrada no Log e atualize o Handoff, mesmo que a fase não esteja completa.
7. Não remova funcionalidades inteiras sem confirmação do usuário. Liste as candidatas em Bloqueios.

### Modelo de entrada no Log

```markdown
#### 2026-11-21 — Fase 1.2 — <agente/sessão>
- **Feito:** criou utils/budget/period.ts e occurrences.ts; 34 testes passando.
- **Decisões:** recorrência `daily` gera uma ocorrência por dia (não média).
- **Desvios:** nenhum. / <o que mudou e por quê>
- **Arquivos:** frontend/utils/budget/*.ts, frontend/tests/budget/*.test.ts
- **Próximo passo:** fase 1.3 pode começar.
```

---

## Glossário

| Termo | Definição |
|---|---|
| **Dia de virada (D)** | `budget.rolloverDay` (1–31), definido em Configurações. É o dia em que um novo período de budget começa |
| **Período** | De D do mês M até D−1 do mês M+1, ambos inclusive. Se o mês não tem o dia D, usa o último dia do mês |
| **Y** | Valor do budget do período, vindo de `budget.amountHistory` (vigente no início do período) |
| **Z** | Reserva de uma meta por período: automática `(alvo − guardado) / períodos restantes`, ou um override manual |
| **ΣZ** | Soma de Z de todas as metas com `reserveFromBudget = true` |
| **Y efetivo** | `max(0, Y − ΣZ)`: o quanto realmente se pode gastar no período |
| **X gasto** | Soma das ocorrências de despesa do período com data ≤ hoje |
| **X comprometido** | Soma das ocorrências de despesa do período com data > hoje (já previstas) |
| **Receita do período** | Soma das ocorrências de renda dentro do período |
| **Economia inferida** | `Receita do período − (X gasto + X comprometido)`. É o que provavelmente foi guardado, e não "o que sobrou do budget" |
| **Data de budget** | A data que define em qual período uma despesa cai: `purchaseDate` → (cartão: `createdAt`) → `dueDate` |
| **Fechamento** | O registro em `budget.periodClosures` criado quando o usuário confirma ou pula o aporte de um período encerrado |
| **Viabilidade** | O plano é viável se `Receita do período − ΣZ ≥ Y` |
