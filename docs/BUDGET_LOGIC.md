# Lógica do Budget Mensal

> Especificação das regras de negócio do Budget Mensal e da integração com Metas. A implementação está planejada em [`sprints/SPRINT_01_BUDGET.md`](./sprints/SPRINT_01_BUDGET.md). Se a implementação divergir deste documento, atualize-o e registre o desvio no Log da sprint.

## 1. Conceito

O usuário define um **valor de budget (Y)** e um **dia de virada (D)**. A cada período de D a D−1, o app soma as despesas que caem nele e mostra **X de Y**. Na virada, tudo recomeça do zero: não há acúmulo de sobra nem de estouro.

Metas podem **reservar** parte do budget (Z). O que efetivamente se pode gastar é o **Y efetivo = Y − ΣZ**. O app compara sempre **Receita × Despesas × Metas** para dizer se o plano é viável e, na virada, estima quanto foi guardado (**economia inferida**) para sugerir os aportes nas metas.

O budget é **independente do forecast**:

| | Forecast (`forecastCalculator.ts`) | Budget (`utils/budget/`) |
|---|---|---|
| Unidade de tempo | Mês-calendário | Período do usuário (D → D−1) |
| Recorrentes | Média mensal (weekly ×4,33, etc.) | **Ocorrências reais por dia** |
| Cartão de crédito | Mês da fatura (`dueDate`) | **Data da compra** (`purchaseDate`) |
| Quarterly/yearly | Diluído (÷3, ÷12) | Valor cheio na data real |

## 2. Período

- `rolloverDay` (D) é um inteiro de 1 a 31.
- O início do período "do mês M" é `min(D, últimoDia(M))`. O fim é o dia anterior ao início do período do mês M+1.
- Os dois extremos são inclusivos. Uma data `d` pertence ao período do mês M se `início(M) ≤ d < início(M+1)`.

| D | Exemplos de período |
|---|---|
| 1 | 01 nov – 30 nov |
| 20 | 20 nov – 19 dez · 20 dez – 19 jan |
| 31 | 31 jan – 27 fev · 28 fev – 30 mar · 31 mar – 29 abr (2027, não bissexto) |

- Rótulo: `"20 nov – 19 dez"`. Se os anos dos extremos forem diferentes do ano atual, acrescentar o ano: `"20 dez 2026 – 19 jan 2027"`.
- **Mudar D** reinterpreta todos os períodos, inclusive os do histórico. Os fechamentos já gravados guardam os próprios `periodStart`/`periodEnd` e não são reescritos.

## 3. Ocorrências de despesas

Só despesas com `isActive = true`.

### 3.1 Data de budget

```
getBudgetDate(expense) =
  expense.purchaseDate
  ?? (expense.paymentMethod === "credit_card" ? dataLocal(expense.createdAt) : undefined)
  ?? expense.dueDate
```

- Para métodos que não são cartão, o formulário grava `purchaseDate = dueDate`.
- Para cartão, a `purchaseDate` é a data informada no formulário. O `dueDate` continua sendo o vencimento da fatura, usado pelo forecast.
- Despesas de cartão antigas recebem `purchaseDate = data(createdAt)` no backfill (decisão D4).

### 3.2 Regras por tipo

Seja `A = getBudgetDate(expense)` a âncora.

| Tipo | Condição | Ocorrências | Valor de cada uma |
|---|---|---|---|
| Avulsa | `!recurring && !isInstallment` | `A` | `amount` |
| Parcelada no cartão | `isInstallment && !recurring && credit_card` | `A + (k−1) meses` (com clamp), k = 1..`installmentMonths` | `amount / installmentMonths` |
| Parcelada fora do cartão | `isInstallment && !recurring && !credit_card` | mês `installmentStartMonth + (k−1)`, no dia de `dueDate` (com clamp) | `amount / installmentMonths` |
| Recorrente `daily` | | todo dia a partir de `A` | `amount` |
| Recorrente `weekly` | | `A + n × 7 × (recurringWeeksInterval ?? 1)` dias | `amount` |
| Recorrente `biweekly` | | `A + n × 14` dias | `amount` |
| Recorrente `monthly` | | dia de `A` em cada mês a partir de `A` (com clamp) | `amount` |
| Recorrente `quarterly` | | `A + 3n meses` (com clamp) | `amount` (cheio) |
| Recorrente `yearly` | | `A + 12n meses` (com clamp) | `amount` (cheio) |
| Recorrente + parcelada | `recurring && isInstallment` (hoje só weekly com interval > 1) | cada ciclo recorrente em `C` inicia uma série de parcelas mensais `C + (k−1) meses` | `amount / installmentMonths` |

Observações:
- Recorrentes não têm data de fim no modelo atual, então se repetem indefinidamente a partir de `A`. Nunca geram ocorrências antes de `A`.
- `one_time` como frequência de uma despesa marcada `recurring` é tratada como avulsa.
- **Clamp** significa que, se o mês não tem o dia, usa o último dia do mês. A série monthly guarda o **dia original** da âncora: 31/jan → 28/fev → 31/mar, e não 28/mar.

## 4. Receita do período

A mesma lógica de ocorrências é aplicada a `Income`:
- âncora `startDate`;
- sem ocorrências depois de `endDate`, quando existir;
- `frequency` segue a tabela 3.2;
- `one_time` gera uma única ocorrência em `startDate`;
- só `isActive`.

`Receita do período = Σ ocorrências de renda dentro do período`.

## 5. Valor do budget (Y) com histórico

- `budget.amountHistory` é uma lista `{ amount, effectiveFrom }` em que `effectiveFrom` é o **início de um período**.
- `Y(período) =` o `amount` da última entrada com `effectiveFrom ≤ período.start`. Sem entrada, Y = 0 e o budget é tratado como não configurado.
- Salvar um Y novo:
  - se já existe uma entrada com `effectiveFrom = início do período atual`, ela é **substituída**;
  - senão, uma entrada nova é **adicionada** com `effectiveFrom = início do período atual`.
- Os períodos passados mantêm o Y da época (decisão D7).

## 6. Metas × Budget

### 6.1 Opt-in

Só metas com `isActive && reserveFromBudget` reservam.

### 6.2 Z de uma meta (por período)

```
restante = max(0, targetAmount − currentAmount)
se restante = 0                        → Z = 0
se budgetReserveOverride != null       → Z = budgetReserveOverride
se goalType = "open_ended"             → Z = 0   (UI exige override quando opt-in ligado)
n = nº de períodos do período atual até o período que contém targetDate (inclusive), mínimo 1
                                        (targetDate no passado → n = 1)
Z sugerido = restante / n
```

- **Não** aplica o multiplicador de prioridade usado por `calculateGoalContribution` no forecast.
- Z é recalculado a cada período. Se o usuário aporta mais ou menos, o Z sugerido se ajusta sozinho.

### 6.3 Y efetivo

```
ΣZ        = Σ Z das metas com opt-in
Y efetivo = max(0, Y − ΣZ)
```

### 6.4 Viabilidade

```
viável      = (ReceitaPeríodo − ΣZ) ≥ Y
sugestão Y  = max(0, ReceitaPeríodo − ΣZ)
gap         = Y − sugestão Y
```

Se o plano for inviável, a UI mostra um alerta e oferece o botão "Ajustar budget para R$ {sugestão}".

## 7. Status do período

Para um período P e a data de hoje T:

| Campo | Fórmula |
|---|---|
| `spent` (X gasto) | Σ ocorrências em P com data ≤ T |
| `committed` (X comprometido) | Σ ocorrências em P com data > T |
| `projectedTotal` | `spent + committed` |
| `percentSpent` | `spent / Yefetivo` (Yefetivo = 0 → `spent > 0 ? ∞ : 0`) |
| `percentProjected` | `projectedTotal / Yefetivo` |
| `level` | `percentSpent < 0,8` → ok (verde) · `< 1,0` → warning (âmbar) · `≥ 1,0` → over (vermelho) |
| `daysRemaining` | dias de T até `P.end`, inclusive (0 se P já passou) |
| `dailyAllowance` | `max(0, Yefetivo − projectedTotal) / max(1, daysRemaining)` |
| `income` | receita do período (seção 4) |
| `inferredSavings` | `income − projectedTotal` |

- Em períodos **passados**, `committed = 0` e tudo é `spent`.
- Em períodos **futuros**, `spent = 0` e tudo é `committed`.

Exibição: "R$ {spent} de R$ {Yefetivo}", com o segmento secundário "+ R$ {committed} previstos".

## 8. Alertas

Ao adicionar, editar ou excluir uma despesa:
- calcula-se o status do período atual antes e depois;
- se algum limiar (0,8 ou 1,0) for **cruzado para cima**, mostra-se um toast: 80% gera `warning`, 100% gera `error`.

A métrica comparada (definida na fase 1.7, `utils/budget/alerts.ts`):
- `percentSpent`, se algum lançamento afetado (versão antiga ou nova) tem ocorrência de hoje ou anterior dentro do período atual;
- `percentProjected`, só quando **todas** as ocorrências afetadas são futuras.

O alerta só dispara com o budget ativo, Y > 0 e pelo menos uma ocorrência afetada no período atual. Se a mudança cruzar 80% e 100% de uma vez, vale o estouro. Sem cruzamento, o toast é de sucesso ("Despesa salva · budget em 65%").

## 9. Histórico

- Os últimos N períodos (padrão 12) são calculados sob demanda a partir das despesas atuais, sem snapshot.
- Cada item tem: período, Y da época, ΣZ **atual** (aproximação; o ΣZ histórico não é guardado), gasto, se ficou dentro ou estourou, e o fechamento (confirmado com valor, pulado ou pendente).
- Editar uma despesa antiga altera o histórico, e isso é aceito.

## 10. Fechamento do período e aporte

**Pendência**

```
ultimoFechado = max(periodClosures[].periodEnd) ?? (enabledAt − 1 dia)
pendentes     = períodos P com P.end < hoje e P.start > ultimoFechado
                (e P.start ≥ início do período que contém enabledAt)
```

- Se houver pendentes, o modal pergunta **só o mais recente**. Os outros são gravados como `skipped` junto com a resposta.

**Sugestão de aporte**

```
economia = inferredSavings(P)
se economia ≤ 0                → todas as alocações = 0
se economia ≥ ΣZ               → alocação(meta) = Z(meta)
senão                          → alocação(meta) = economia × Z(meta) / ΣZ    (proporcional)
```

- Os valores são editáveis pelo usuário.
- **Confirmar:** grava `{ status: "confirmed", income, spent, budgetAmount, allocations, closedAt }` e soma cada `allocation.amount` em `goal.currentAmount`, no mesmo update de estado.
- **Pular:** grava `{ status: "skipped", allocations: [] }`.
- **Fechar no X:** não grava nada e pergunta de novo no próximo carregamento.

## 11. Persistência

- `UserPlan.budget: BudgetSettings`, com `enabled`, `rolloverDay`, `enabledAt`, `amountHistory[]` e `periodClosures[]`.
- Tabelas: `budget_settings`, `budget_amount_history`, `budget_period_closures` (com `allocations` em JSON).
- Novos campos: `expenses.purchase_date`, `goals.reserve_from_budget` e `goals.budget_reserve_override`.
- As tabelas de budget **não** têm FK para `goals`, porque o `POST /api/plan` apaga e reinsere as metas a cada save.

## 12. Decisões e desvios da implementação (Sprint 1)

O que foi decidido ao implementar e que não estava (ou estava diferente) na spec acima. Nenhum item altera as decisões de produto D1 a D16.

- **Viabilidade sem receita**: se o período não tem receita (ou o Y é 0), `checkFeasibility` devolve `feasible: true` com `evaluable: false` e a UI não alerta. Sem renda cadastrada todo budget seria "inviável". Com receita, vale a fórmula da seção 6.4.
- **Meta open-ended com override**: o Z é o override mesmo que `alvo - guardado` seja 0 (a seção 6.2 checa "restante = 0" antes, o que anularia o override de uma meta sem valor final). Para metas de valor fixo a ordem da seção 6.2 vale.
- **Pendência de fechamento**: sem nenhum fechamento gravado, o primeiro período pendente é o que **contém** `enabledAt` (se a ativação acontece no meio dele, ele também é perguntado quando encerrar). Com fechamentos, pendente é `P.end < hoje` e `P.start > maior periodEnd` já gravado. Reativar o budget depois de desligá-lo mantém o `enabledAt` original.
- **ΣZ nos números**: o status e o histórico usam o ΣZ **atual** (calculado a partir do período em curso e do `currentAmount` de hoje) mesmo para períodos passados/futuros; o resumo/aporte do fechamento calcula o Z relativo ao próprio período fechado.
- **Y e mudança do dia de virada**: ao mudar `rolloverDay` com budget ativo e um Y vigente, o Y vigente é regravado em `amountHistory` ancorado no início do novo período atual (senão o Y do período atual viraria 0, porque o histórico fica ancorado nos períodos antigos).
- **Parcelas fora do cartão**: a k-ésima parcela cai no mês `installmentStartMonth + k`, no dia de `dueDate`, com clamp feito sempre a partir do dia original (31 em fev = 28, volta ao 31 em março). Sem `installmentStartMonth`, parte do `dueDate`.
- **Rótulo do período**: `formatPeriodLabel(p, todayISO?)` acrescenta o ano quando os extremos estão em anos diferentes e, se `todayISO` for passado, também quando o ano não é o atual.
- **Infinity**: `percentSpent` e `percentProjected` valem `Infinity` quando o Y efetivo é 0 e há gasto; a UI mostra ">100%".
- **Fechamentos `skipped` automáticos** (períodos mais antigos pulados junto com a resposta) guardam receita, gasto e Y calculados no momento, só para o histórico.
- **Export/import**: o JSON preserva o `budget`; o CSV **não** exporta budget nem `purchaseDate`/`reserveFromBudget` (o import de CSV recebe os defaults e o backfill D4 para cartão).
- **Persistência**: além da migração `budget_migration.sql`, `ensureBudgetSchema()` (em `plan.ts`) cria colunas e tabelas na primeira requisição. Um `POST /api/plan` sem `budget` no payload não mexe nas tabelas de budget.

## 12. Decisões e desvios da implementação (Sprint 1)

O que foi decidido ao implementar e que não estava (ou estava diferente) na spec acima. Nenhum item altera as decisões de produto D1 a D16.

- **Viabilidade sem receita**: se o período não tem receita (ou o Y é 0), `checkFeasibility` devolve `feasible: true` com `evaluable: false` e a UI não alerta. Sem renda cadastrada todo budget seria "inviável". Com receita, vale a fórmula da seção 6.4.
- **Meta open-ended com override**: o Z é o override mesmo que `alvo - guardado` seja 0 (a seção 6.2 checa "restante = 0" antes, o que anularia o override de uma meta sem valor final). Para metas de valor fixo a ordem da seção 6.2 vale.
- **Pendência de fechamento**: sem nenhum fechamento gravado, o primeiro período pendente é o que **contém** `enabledAt` (se a ativação acontece no meio dele, ele também é perguntado quando encerrar). Com fechamentos, pendente é `P.end < hoje` e `P.start > maior periodEnd` já gravado. Reativar o budget depois de desligá-lo mantém o `enabledAt` original.
- **ΣZ nos números**: o status e o histórico usam o ΣZ **atual** (calculado a partir do período em curso e do `currentAmount` de hoje) mesmo para períodos passados/futuros; o resumo/aporte do fechamento calcula o Z relativo ao próprio período fechado.
- **Y e mudança do dia de virada**: ao mudar `rolloverDay` com budget ativo e um Y vigente, o Y vigente é regravado em `amountHistory` ancorado no início do novo período atual (senão o Y do período atual viraria 0, porque o histórico fica ancorado nos períodos antigos).
- **Parcelas fora do cartão**: a k-ésima parcela cai no mês `installmentStartMonth + k`, no dia de `dueDate` com clamp feito sempre a partir do dia original (31 em fev = 28, volta ao 31 em março). Sem `installmentStartMonth`, parte do `dueDate`.
- **Rótulo do período**: `formatPeriodLabel(p, todayISO?)` acrescenta o ano quando os extremos estão em anos diferentes e, se `todayISO` for passado, também quando o ano não é o atual.
- **Infinity**: `percentSpent`/`percentProjected` valem `Infinity` quando o Y efetivo é 0 e há gasto; a UI mostra ">100