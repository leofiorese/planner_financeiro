# Sprint 1 — Budget Mensal + integração com Metas

> **Objetivo:** permitir que o usuário defina um budget mensal Y com dia de virada personalizado. O app mostra "X de Y" (gasto até hoje + comprometido), reserva parte do budget para metas opt-in (Z), compara receita × despesas × metas, avisa quando o limite se aproxima e, na virada, sugere o aporte nas metas a partir da economia inferida.
>
> **Base:** UI atual (antes do redesign da Sprint 2). Componentes novos ficam isolados em `frontend/components/budget/` para facilitar a reestilização depois.
>
> **Regras de negócio completas:** [`docs/BUDGET_LOGIC.md`](../BUDGET_LOGIC.md). **Protocolo de progresso:** [`README.md`](./README.md).

---

## Sumário

- [Decisões do produto](#decisões-do-produto)
- [Visão geral das fases](#visão-geral-das-fases)
- [Fase 1.0 — Fundação de datas](#fase-10--fundação-de-datas)
- [Fase 1.1 — Modelo de dados e persistência](#fase-11--modelo-de-dados-e-persistência)
- [Fase 1.2 — Engine de budget](#fase-12--engine-de-budget)
- [Fase 1.3 — Estado e contexto](#fase-13--estado-e-contexto)
- [Fase 1.4 — Configurações: seção Budget Mensal](#fase-14--configurações-seção-budget-mensal)
- [Fase 1.5 — Metas: reserva do budget](#fase-15--metas-reserva-do-budget)
- [Fase 1.6 — Superfícies do budget](#fase-16--superfícies-do-budget)
- [Fase 1.7 — Alertas](#fase-17--alertas)
- [Fase 1.8 — Fechamento do período e aporte](#fase-18--fechamento-do-período-e-aporte)
- [Fase 1.9 — Documentação e QA](#fase-19--documentação-e-qa)
- [Riscos e pontos de atenção](#riscos-e-pontos-de-atenção)
- [📋 Progresso](#-progresso)

---

## Decisões do produto

Decisões fechadas com o usuário em 20/11/2026. **Não altere sem registrar em Bloqueios e obter confirmação.**

| # | Tema | Decisão |
|---|---|---|
| D1 | Tipo de budget | **Global único**: um só valor Y, sem limites por categoria |
| D2 | O que soma em X | **Todas as despesas ativas**: recorrentes, parcelas e avulsas |
| D3 | Cartão de crédito | Conta pela **data da compra** (`purchaseDate`), não pelo vencimento da fatura |
| D4 | Backfill | Despesas de cartão existentes sem `purchaseDate` usam a data do `createdAt` |
| D5 | O que X mostra | **Os dois**: gasto até hoje (barra principal) e comprometido (segmento secundário) |
| D6 | Parcelas | **Cada parcela no seu período** |
| D7 | Valor Y | **Fixo com histórico**: alterar Y vale a partir do período atual, e os períodos passados mantêm o valor da época |
| D8 | Virada | **Reset limpo**: sobra e estouro não passam para o próximo período, ficam só no histórico |
| D9 | Exibição | Card no Dashboard + banner em Despesas + indicador no header + página `/budget` |
| D10 | Alertas | Cores (<80% verde, 80–100% âmbar, >100% vermelho) + toast ao cruzar 80% e 100% num lançamento |
| D11 | Histórico | Gráfico + lista dos últimos 6–12 períodos, calculado a partir das despesas (sem snapshot) |
| D12 | Metas × budget | **Opt-in por meta** (toggle "Reservar do budget") |
| D13 | Cálculo de Z | **Automático e editável**: `(alvo − guardado) / períodos até a data-alvo`, com override manual. Meta open-ended exige valor manual |
| D14 | Efeito no budget | **Y efetivo = Y − ΣZ**, com checagem de viabilidade (`Receita − ΣZ < Y` gera alerta e sugere um Y realista) |
| D15 | Economia | **Inferida** cruzando receita × gasto do período. O que não foi gasto do budget não é, por si só, o que foi guardado |
| D16 | Aporte na virada | **Confirmar aporte**: o app sugere o valor por meta (editável) e, ao confirmar, soma em `goal.currentAmount` |

---

## Visão geral das fases

| Fase | Nome | Depende de | Tamanho | Paralelizável com |
|---|---|---|---|---|
| 1.0 | Fundação de datas | — | M | — |
| 1.1 | Modelo de dados e persistência | 1.0 | M | 1.2 (parcial) |
| 1.2 | Engine de budget (pura + testes) | 1.0 (helpers de data); tipos da 1.1 | G | 1.1 |
| 1.3 | Estado e contexto | 1.1, 1.2 | P | — |
| 1.4 | Configurações: seção Budget | 1.3 | P | 1.5 |
| 1.5 | Metas: reserva do budget | 1.3 | P | 1.4 |
| 1.6 | Superfícies (card, banner, header, `/budget`) | 1.3 | G | — |
| 1.7 | Alertas (toasts) | 1.6 (`BudgetProgress`) | P | 1.8 |
| 1.8 | Fechamento do período e aporte | 1.3, 1.5 | M | 1.7 |
| 1.9 | Documentação e QA | todas | P | — |

**Sugestão de PRs:** um PR por fase. A 1.1 e a 1.2 podem ir juntas se os tipos forem combinados primeiro.

---

## Fase 1.0 — Fundação de datas

**Por quê:** o budget depende de datas exatas por dia. Hoje há vários bugs de fuso (o usuário está em UTC-3):

- `new Date("YYYY-MM-DD")` é interpretado como meia-noite UTC e, lido com `getDate()`/`getMonth()` locais, vira o dia anterior.
  - Exemplo: uma despesa avulsa que vence no dia 1 aparece no mês anterior (`utils/expenseOperations.ts:503-505`).
- `new Date().toISOString().split("T")[0]` devolve a data UTC, que depois das 21h é "amanhã" (`app/expenses/page.tsx:321, 389`).
- O formulário de despesa faz `new Date(purchaseDate)` (`app/expenses/page.tsx:309, 315, 331, 337, 1549, 1588`). Com isso, uma compra feita exatamente um dia depois do fechamento é tratada como "até o fechamento" e cai na fatura errada.
- Comparações em UTC: `utils/installmentCalculator.ts:139-150` e `utils/forecastCalculator.ts:214-230, 717-737`.
- Existe um parser seguro, `parseDateSafe` (`utils/dateFormatting.ts:23`), mas ele não é exportado nem usado nos cálculos.

### Tarefas

- [x] Criar `frontend/utils/dates.ts` com funções puras, sem dependências:
  - `parseLocalDate(iso: string): Date`: `"YYYY-MM-DD"` vira `new Date(y, m-1, d)` local. Também aceita `"YYYY-MM"` (dia 1) e strings ISO completas (usa só a parte da data).
  - `toLocalISODate(d: Date): string`: devolve `YYYY-MM-DD` usando getters locais.
  - `todayLocalISO(): string`.
  - `daysInMonth(year, monthIndex): number`.
  - `clampDay(year, monthIndex, day): Date`: `day > daysInMonth` vira o último dia.
  - `addMonthsClamped(date, n): Date`: mantém o dia, com clamp (31/jan + 1 = 28 ou 29/fev).
  - `addDays(date, n): Date`, `diffInDays(a, b): number` (ignorando horário de verão: usar meio-dia ou UTC dos componentes locais).
  - `compareISO(a, b)`, `isWithinISO(date, start, end)`: comparação lexicográfica de `YYYY-MM-DD`, que é segura e rápida.
- [x] `utils/dateFormatting.ts`: fazer o `parseDateSafe` delegar para `parseLocalDate` (sem mudar a assinatura pública).
- [x] Substituir os parses UTC nos arquivos listados acima por `parseLocalDate` / `todayLocalISO`.
- [x] Adicionar `tsx` como devDependency do frontend e o script `"test": "tsx --test tests/**/*.test.ts"`.
  - O glob no Windows: se o `tsx --test` não expandir o glob, listar os arquivos ou usar `node --import tsx --test`. Registrar no Log o que funcionou.
  - Avaliar mover `tests/forecastCalculator.test.ts`, que é um script sem asserts, para `tests/manual/` ou convertê-lo. **Não apague** sem registrar.
- [x] `frontend/tests/dates.test.ts` com `node:test` + `node:assert/strict`:
  - parse de `2026-12-01` dá dia 1 / mês 11 local;
  - clamp de 31 em fevereiro, em ano bissexto e não bissexto;
  - `addMonthsClamped(2026-01-31, 1)` dá `2026-02-28`;
  - virada de ano (`2026-12-15` + 1 mês);
  - rodar com `TZ=America/Sao_Paulo`. No Windows, documentar a forma equivalente ou garantir que os testes não dependam do TZ do host.

### Critérios de aceite

- `npm test` existe no frontend e passa.
- Uma despesa avulsa com `dueDate = "2026-12-01"` aparece em dezembro no calendário e no forecast.
- No formulário, uma compra no cartão no dia `closingDay + 1` vai para a fatura do mês seguinte.
- Nenhum `new Date("YYYY-MM-DD")` restante nos arquivos tocados (`grep -n 'new Date(' utils/expenseOperations.ts utils/creditCardRules.ts ...` revisado).

---

## Fase 1.1 — Modelo de dados e persistência

### Tipos (alterar **os dois** arquivos: `frontend/types/index.ts` e `backend/src/types/index.ts`)

```ts
// Expense (adição)
purchaseDate?: string; // "YYYY-MM-DD" — data real da compra/gasto. Para cartão, ≠ dueDate.

// Goal (adições)
reserveFromBudget?: boolean;            // opt-in: esta meta reserva Z do budget
budgetReserveOverride?: number | null;  // Z manual por período; null/undefined = automático

// Novos tipos
export interface BudgetAmountEntry {
  amount: number;
  effectiveFrom: string; // "YYYY-MM-DD" = início do período a partir do qual vale
}

export interface BudgetGoalAllocation {
  goalId: string;
  amount: number;
}

export interface BudgetPeriodClosure {
  periodStart: string;     // "YYYY-MM-DD"
  periodEnd: string;       // "YYYY-MM-DD" (inclusive)
  status: "confirmed" | "skipped";
  income: number;          // receita do período no momento do fechamento
  spent: number;           // gasto total do período
  budgetAmount: number;    // Y vigente
  allocations: BudgetGoalAllocation[]; // vazio se skipped
  closedAt: string;        // ISO datetime
}

export interface BudgetSettings {
  enabled: boolean;
  rolloverDay: number;     // 1–31
  enabledAt: string;       // "YYYY-MM-DD" — primeira ativação; não pergunta fechamento de períodos anteriores
  amountHistory: BudgetAmountEntry[];   // ordenado por effectiveFrom asc
  periodClosures: BudgetPeriodClosure[];
}

// UserPlan (adição)
budget?: BudgetSettings;
```

### Banco de dados

- [x] Criar `backend/database/migrations/budget_migration.sql`, **seguro para rodar de novo**. O MySQL 8 não tem `ADD COLUMN IF NOT EXISTS`, então use um procedure temporário com `information_schema.COLUMNS` ou blocos condicionais via `PREPARE`:
  - `expenses.purchase_date VARCHAR(10) NULL` (depois de `due_date`).
  - `goals.reserve_from_budget TINYINT(1) NOT NULL DEFAULT 0`.
  - `goals.budget_reserve_override DECIMAL(12,2) NULL`.
  - `CREATE TABLE IF NOT EXISTS budget_settings` com `user_plan_id VARCHAR PK` (mesmo tipo de `user_plans.id`), `enabled TINYINT(1)`, `rollover_day INT`, `enabled_at VARCHAR(10)`, `updated_at DATETIME` e FK para `user_plans(id)` ON DELETE CASCADE.
  - `CREATE TABLE IF NOT EXISTS budget_amount_history` com `id INT AUTO_INCREMENT PK`, `user_plan_id`, `amount DECIMAL(12,2)`, `effective_from VARCHAR(10)` e FK com cascade.
  - `CREATE TABLE IF NOT EXISTS budget_period_closures` com `id INT AUTO_INCREMENT PK`, `user_plan_id`, `period_start VARCHAR(10)`, `period_end VARCHAR(10)`, `status VARCHAR(16)`, `income DECIMAL(12,2)`, `spent DECIMAL(12,2)`, `budget_amount DECIMAL(12,2)`, `allocations JSON`, `closed_at DATETIME`, FK com cascade e `UNIQUE(user_plan_id, period_start)`.
  - **Não** criar uma FK de `allocations`/closures para `goals`: o `POST /api/plan` apaga e reinsere as metas a cada save.
  - Backfill: `UPDATE expenses SET purchase_date = DATE_FORMAT(created_at, '%Y-%m-%d') WHERE payment_method = 'credit_card' AND (purchase_date IS NULL OR purchase_date = '');`
- [x] Refletir tudo em `backend/database/schema.sql`.
- [x] `backend/src/routes/plan.ts`:
  - Garantir as tabelas e colunas em runtime seguindo o padrão `ensureCategoriesTable` (`plan.ts:9-24`), para quem não rodou a migração. Isso evita quebrar o GET/POST.
  - GET: ler `budget_settings`, `budget_amount_history` (ORDER BY `effective_from`) e `budget_period_closures`, e montar `userPlan.budget`. Quando não houver linha em `budget_settings`, devolver `budget` indefinido; o frontend aplica o default.
  - GET: converter `reserve_from_budget` e `enabled` para booleanos (helper em `:50-61`), `budget_reserve_override` e os valores decimais para `number`, e fazer o parse de `allocations`, que pode vir como string ou objeto dependendo do driver.
  - POST: incluir `purchase_date` no INSERT de expenses e `reserve_from_budget`/`budget_reserve_override` no de goals (`:179-247`). Fazer upsert de `budget_settings` e delete+reinsert de `budget_amount_history` e `budget_period_closures`, dentro da mesma transação. Datas via `toDbDate`.
- [x] Teste de backend (`backend/tests/`): se possível, extrair as funções de mapeamento linha → objeto para uma função pura e testá-la. Integração com o banco não é obrigatória.

### Frontend

- [x] `context/initialState.ts`: default `budget = { enabled: false, rolloverDay: 1, enabledAt: "", amountHistory: [], periodClosures: [] }`.
- [x] `context/storage.ts` → `migrateUserPlan` (`:207-244`):
  - garantir `budget` com os defaults;
  - para despesas `credit_card` sem `purchaseDate`, usar `createdAt.slice(0,10)`, convertido para data local se o `createdAt` tiver horário;
  - metas sem `reserveFromBudget` ficam com `false`.
- [x] `isValidUserPlan` (`:249-274`): aceitar `budget` opcional.
- [x] Import/export: `utils/dataImport.ts` → `sanitizeUserPlan` (`:535-566`) com os defaults do budget; `utils/dataExport.ts` serializa `budget` no JSON. No CSV, decidir se entra uma seção nova (registrar a decisão no Log).
- [x] `app/expenses/page.tsx`:
  - Persistir `purchaseDate` no objeto salvo. Para métodos que não são cartão, `purchaseDate = dueDate`; para cartão, a data informada no formulário.
  - Ao editar (`:431`), preencher `purchaseDate` com `expense.purchaseDate ?? expense.dueDate`, em vez de "hoje".
  - Na lista e no calendário, mostrar "Compra: dd/mm" para itens de cartão (opcional, pequeno).

### Critérios de aceite

- Typecheck passa nos dois projetos.
- Round-trip: `curl localhost:3001/api/plan` antes e depois de salvar uma despesa com `purchaseDate`, uma meta com `reserveFromBudget=true` e um budget ativo, com os campos preservados.
- A migração roda duas vezes seguidas sem erro num dump de `backend/database/seeds/local/`.
- O backfill preenche `purchase_date` nas despesas de cartão existentes.

---

## Fase 1.2 — Engine de budget

Funções **puras** (sem React, sem `Date.now()` implícito: recebem `today` como parâmetro) em `frontend/utils/budget/`. As regras detalhadas estão em [`BUDGET_LOGIC.md`](../BUDGET_LOGIC.md).

### `period.ts`

```ts
export interface BudgetPeriod { start: string; end: string; } // YYYY-MM-DD, ambos inclusivos

getPeriodForDate(dateISO: string, rolloverDay: number): BudgetPeriod
getPeriodByOffset(dateISO: string, rolloverDay: number, offset: number): BudgetPeriod // -1 = anterior
listPeriods(endingAtISO: string, rolloverDay: number, count: number): BudgetPeriod[]   // mais antigo → mais novo
countPeriodsBetween(fromPeriod: BudgetPeriod, toDateISO: string, rolloverDay: number): number // inclusive
formatPeriodLabel(p: BudgetPeriod): string // "20 nov – 19 dez" (pt-BR, mês abreviado minúsculo sem ponto)
getDaysRemaining(p: BudgetPeriod, todayISO: string): number // inclui hoje
```

- O início do período no mês M é `clampDay(M, D)`. O fim é o dia anterior ao início do período seguinte.
  - Exemplo com D=31: os períodos começam em 31/jan, 28/fev, 31/mar... e o período de fevereiro vai de 28/fev a 30/mar.
- Uma data pertence ao período do mês M se `start(M) ≤ data < start(M+1)`. Se `data < start(M)`, pertence ao período de M−1.

### `occurrences.ts`

```ts
export interface Occurrence { date: string; amount: number; sourceId: string; installment?: { index: number; total: number } }

getBudgetDate(expense: Expense): string
getExpenseOccurrences(expense: Expense, range: { start: string; end: string }): Occurrence[]
getIncomeOccurrences(income: Income, range: { start: string; end: string }): Occurrence[]
```

- Regras por tipo (avulsa, recorrente por frequência, parcelada no cartão e fora dele, recorrente+parcelada) em `BUDGET_LOGIC.md`, seção 3.
- Gerar as ocorrências só dentro do range. Para recorrências longas, avançar a âncora até perto do `range.start` com aritmética, sem iterar desde 2020.
- `isActive = false` gera `[]`.

### `goalReservation.ts`

```ts
getSuggestedGoalReserve(goal: Goal, current: BudgetPeriod, rolloverDay: number): number
getGoalReserve(goal: Goal, current: BudgetPeriod, rolloverDay: number): number // override ?? sugerido; 0 se não opt-in
getTotalReserve(goals: Goal[], current: BudgetPeriod, rolloverDay: number): { total: number; byGoal: { goalId: string; amount: number; isManual: boolean }[] }
```

### `budgetCalculator.ts`

```ts
getBudgetAmountForPeriod(history: BudgetAmountEntry[], period: BudgetPeriod): number
computeBudgetStatus(plan: UserPlan, todayISO: string, offset = 0): BudgetStatus
computePeriodHistory(plan: UserPlan, todayISO: string, count: number): BudgetHistoryItem[]
computeCategoryBreakdown(plan: UserPlan, period: BudgetPeriod): { categoryId: string; amount: number; share: number }[]
checkFeasibility(status: BudgetStatus): { feasible: boolean; suggestedBudget: number; gap: number }
getPendingClosure(plan: UserPlan, todayISO: string): { period: BudgetPeriod; olderToSkip: BudgetPeriod[] } | null
suggestClosureAllocations(plan: UserPlan, period: BudgetPeriod): { inferredSavings: number; allocations: BudgetGoalAllocation[] }
```

`BudgetStatus` contém:
- `period`, `label`
- `budgetAmount` (Y), `reserveTotal` (ΣZ), `reserves` (por meta), `effectiveBudget` (Y efetivo)
- `spent` (X gasto), `committed` (X comprometido), `projectedTotal` (gasto + comprometido)
- `percentSpent`, `percentProjected`
- `level`: `"ok" | "warning" | "over"` (limiares 0,8 e 1,0 sobre `percentSpent`)
- `daysRemaining`, `dailyAllowance = max(0, effectiveBudget − projectedTotal) / daysRemaining`
- `income`, `inferredSavings`
- `isCurrent`, `isPast`

### Testes (`frontend/tests/budget/*.test.ts`)

- [x] Períodos: D=1, D=20, D=29/30/31 em fevereiro (bissexto e não), virada de ano, data igual ao início, data igual ao fim, offset −1 e +1, `listPeriods(12)`.
- [x] Ocorrências:
  - avulsa dentro e fora do range;
  - monthly com D=31 em fevereiro;
  - weekly com interval 1 e 3;
  - biweekly; daily (contagem exata de dias);
  - quarterly e yearly cheios na data real;
  - parcelada no cartão 6x a partir da `purchaseDate`;
  - parcelada fora do cartão a partir de `installmentStartMonth`;
  - recorrente+parcelada weekly interval 4;
  - `isActive=false`.
- [x] `getBudgetDate`: cartão com `purchaseDate`, cartão sem ela (usa `createdAt`), pix (usa `dueDate`).
- [x] Receita: monthly com `endDate` no meio do período; one_time.
- [x] Y: histórico com troca no meio (períodos anteriores mantêm o valor antigo); sem histórico dá 0.
- [x] Z: meta com prazo em 4 períodos dá restante/4; prazo vencido dá restante (1 período); concluída dá 0; open-ended sem override dá 0 (e a UI exige override); override prevalece.
- [x] Status: gasto vs comprometido em relação a `today`; limiares 79,9% / 80% / 100% / 100,1%; `dailyAllowance` nunca negativa.
- [x] Viabilidade: receita 6000, Y 5000, ΣZ 1500 dá inviável com sugestão 4500.
- [x] Fechamento:
  - nenhum pendente antes de `enabledAt`;
  - um pendente;
  - três pendentes (só o mais recente é mostrado; os outros vão para `olderToSkip`);
  - já fechado não volta;
  - economia < ΣZ é distribuída proporcionalmente aos Z;
  - economia ≤ 0 dá todas as alocações 0.

### Critérios de aceite

- Todos os testes passam com `npm test`. Cobertura dos casos acima marcada no checklist.
- Nenhuma função lê o relógio implicitamente (`today` é sempre um parâmetro).

---

## Fase 1.3 — Estado e contexto

Seguir o padrão existente: tipos de action em `context/types.ts:85-146`, criadores em `context/actions.ts`, cases em `context/reducer.ts` (via `updateStateWithUserPlan`, `:142-156`), funções em `context/FinancialProvider.tsx` (convenience `:177-634`, export `:640-663`, `useFinancialActions` `:681-727`).

- [x] Actions:
  - `SET_BUDGET_SETTINGS`, com `{ enabled, rolloverDay }`. Na primeira ativação, define `enabledAt = todayLocalISO()`.
  - `SET_BUDGET_AMOUNT`, com `{ amount }`. Calcula o período atual: se já existe uma entrada com `effectiveFrom === period.start`, substitui; senão, adiciona `{ amount, effectiveFrom: period.start }`.
  - `CLOSE_BUDGET_PERIOD`, com `{ closure, skipped: BudgetPeriod[] }`. Adiciona o closure e os registros `skipped` e, se `status === "confirmed"`, soma `allocation.amount` em `goal.currentAmount` (atualizando `updatedAt`) **no mesmo update de estado**.
- [x] Funções no contexto: `setBudgetSettings`, `setBudgetAmount`, `closeBudgetPeriod`.
- [x] Hook `frontend/hooks/useBudget.ts` (ou `context/useBudget.ts`, conforme o padrão do repo):
  - `useBudget(offset = 0)` devolve `{ enabled, status, history, feasibility, breakdown }`, com `useMemo` sobre `state.userPlan` e `todayISO`;
  - `todayISO` é recalculado quando a aba volta ao foco (`visibilitychange`), para virar o dia sem reload.
- [x] O auto-save existente já persiste: confirmar que o `budget` vai no POST.

### Critérios de aceite

- Alterar Y e o dia em Configurações (fase 1.4) persiste após reload.
- Confirmar um fechamento atualiza `currentAmount` das metas e persiste.

---

## Fase 1.4 — Configurações: seção Budget Mensal

Arquivo: `frontend/app/settings/page.tsx`. Adicionar `"budget"` ao `SectionKey` (`:43`) e criar a seção **como a primeira** da página, no mesmo padrão de accordion das outras (`:559`).

> Para não engordar a página de 1546 linhas, implemente o conteúdo em `frontend/components/budget/BudgetSettingsSection.tsx` e só monte o accordion na página.

- [x] Cabeçalho do accordion: ícone, título "Budget Mensal" e badge com "R$ 5.000 · vira dia 20" ou "Desativado".
- [x] Conteúdo:
  - toggle "Ativar budget mensal";
  - campo "Valor do budget (Y)": numérico, moeda via `useCurrency().formatCurrency` no preview, > 0;
  - campo "Dia de virada": 1–31, com a nota "Se o mês não tiver esse dia, a virada acontece no último dia do mês";
  - preview: "Período atual: 20 nov – 19 dez · faltam 30 dias";
  - preview de reservas: "Metas reservando: R$ 800 → disponível para gastar: R$ 4.200", com link para Metas;
  - histórico de Y: lista "a partir de 20 out 2026: R$ 4.500";
  - botão Salvar: chama `setBudgetSettings` + `setBudgetAmount` (só se o valor mudou), com feedback inline (os toasts entram na 1.7; se a 1.7 já estiver pronta, use toast).
- [x] Validação: Y > 0 para ativar; dia inteiro entre 1 e 31.

### Critérios de aceite

- Ativar, salvar e recarregar mantém os valores.
- Mudar Y cria uma entrada nova no histórico (ou substitui a do período atual).
- Mudar o dia de virada atualiza o preview na hora.

---

## Fase 1.5 — Metas: reserva do budget

Arquivo: `frontend/app/goals/page.tsx` (formulário `:363-509`, lista `:520-680`).

- [x] No formulário:
  - toggle "Reservar do budget mensal" (`reserveFromBudget`);
  - quando ligado e a meta tem prazo: "Reserva sugerida: R$ 412/período (faltam 6 períodos)", calculado com `getSuggestedGoalReserve`, e um link "Definir valor manualmente" que mostra o input do override, com a opção "voltar ao automático";
  - quando ligado e a meta é `open_ended`: o input manual é obrigatório (validação);
  - se o budget estiver desativado: aviso "Ative o budget em Configurações para usar a reserva", com link. O toggle continua permitido.
- [x] Na lista: badge "🎯 Reserva R$ 412/período" (ou "manual") nas metas com opt-in.
- [x] Na página: um resumo "Total reservado do budget: R$ 800/período", no header ou acima da lista.

### Critérios de aceite

- Ligar e desligar o opt-in muda o Y efetivo mostrado nas superfícies (1.6).
- O override persiste e prevalece sobre o sugerido.
- Uma meta open-ended sem valor não salva com o opt-in ligado.

---

## Fase 1.6 — Superfícies do budget

Todos os componentes ficam em `frontend/components/budget/`, recebem `BudgetStatus` por props (apresentacionais) e são alimentados por `useBudget()`.

- [x] **`BudgetProgress.tsx`**:
  - barra com dois segmentos: **gasto** (cor sólida por nível: emerald/amber/rose) e **comprometido** (mesma cor com transparência ou listrado);
  - acima de 100%, a barra fica cheia em vermelho e mostra "+R$ 350 acima";
  - textos: "R$ 3.250 de R$ 4.200" (Y efetivo), "+ R$ 600 previstos", "faltam 12 dias · R$ 29/dia";
  - variantes `size="lg" | "md" | "sm"`;
  - acessibilidade: `role="progressbar"`, `aria-valuenow/min/max` e um `aria-label` descritivo.
- [x] **Card no Dashboard** (`app/page.tsx`, logo abaixo do header `:188` e antes dos KPIs `:333`): `BudgetCard` com `BudgetProgress lg`, rótulo do período, linha "Budget R$ 5.000 − Metas R$ 800 = R$ 4.200" e link "Ver detalhes" para `/budget`. Desativado: um card discreto "Defina um budget mensal" com CTA para Configurações.
- [x] **Banner em Despesas** (`app/expenses/page.tsx`, abaixo do header `:934-1003`): `BudgetBanner` compacto (uma linha, com `BudgetProgress sm`) e link para `/budget`. Não aparece se o budget estiver desativado.
- [x] **Indicador no header** (`app/layout.tsx`, controles à direita `:93-105`):
  - `BudgetHeaderIndicator`, um pill com mini barra e "65%";
  - tooltip/title com "R$ 3.250 de R$ 4.200";
  - clicável para `/budget`; escondido quando desativado;
  - no mobile, só o pill com o percentual.
  - Precisa ser client component, porque o layout é server: crie um wrapper.
- [x] **Página `app/budget/page.tsx`**:
  1. Header: "Budget Mensal" + rótulo do período + navegação ← → (`offset`, com limite de −11 até +1) + "Período atual".
  2. `BudgetProgress lg` + KPIs: Y, ΣZ, Y efetivo, gasto, comprometido, disponível/dia.
  3. **Painel Receita × Despesas × Metas** (`BudgetFlowPanel`): três barras horizontais ou uma barra empilhada comparando receita do período vs (gasto + comprometido) vs ΣZ, com a economia inferida. Se `checkFeasibility` der inviável: um alerta âmbar "Sua receita do período (R$ 6.000) menos as metas (R$ 1.500) não cobre o budget de R$ 5.000. Budget realista: R$ 4.500", com o botão "Ajustar budget para R$ 4.500" chamando `setBudgetAmount`.
  4. **Breakdown por categoria**: lista ordenada com emoji/cor (`getCategoryInfo`), valor e % do total, mais uma barra fina.
  5. **Metas que reservam**: lista com Z, automático/manual e progresso da meta.
  6. **Histórico**: gráfico de barras Recharts com os 12 últimos períodos (barra = gasto total; linha ou marcador = Y efetivo; cor por estouro) e a lista abaixo, "20 out – 19 nov · R$ 4.380 de R$ 4.500 · ✅ dentro" / "❌ +R$ 230" · aporte confirmado R$ X.
  7. **Lançamentos do período** (opcional, colapsável): as ocorrências que compõem X.
  - Estado vazio (budget desativado): explicação curta + CTA para Configurações.
- [x] **Navegação** (`components/Navigation.tsx` `navItems :14-62`): adicionar **Dashboard** (`/`, que hoje não existe no menu) e **Budget** (`/budget`). As chaves i18n existentes `nav.dashboard` (e `nav.budget`, a ser adicionada) vêm antes de a Sprint 2 remover o i18n. Aceite um texto pt-BR direto se preferir, mas mantenha os dois idiomas funcionando nesta sprint.

### Critérios de aceite

- As quatro superfícies mostram números consistentes entre si para o mesmo instante.
- Navegar entre períodos na `/budget` mostra o histórico correto: um Y antigo em período antigo.
- O layout não quebra em 1440, 1024 e 390px.

---

## Fase 1.7 — Alertas

- [x] Adicionar `sonner` ao frontend e montar `<Toaster richColors position="top-right" />` dentro dos providers em `app/layout.tsx`. A Sprint 2 reaproveita a mesma lib através do shadcn.
- [x] No `FinancialProvider` (`addExpense :255`, `updateExpense :281`, `deleteExpense :313`):
  - antes do dispatch, calcular `computeBudgetStatus(planAntes, today).percentSpent` e `percentProjected`;
  - depois, calcular sobre o plano resultante;
  - ao **cruzar** 0,8 ou 1,0 (antes < limiar ≤ depois), usar `percentProjected` quando a despesa nova é futura e `percentSpent` quando é de hoje ou anterior; decida e registre a regra no Log;
  - toasts: `toast.warning("Você atingiu 80% do budget: R$ 3.400 de R$ 4.200")` e `toast.error("Budget estourado: R$ 4.350 de R$ 4.200")`;
  - só disparar se o budget estiver ativo e a ocorrência cair no período atual.
- [x] Toast de sucesso opcional ao salvar uma despesa: "Despesa salva · budget em 65%".
- [x] Extrair a lógica de cruzamento para uma função pura `detectThresholdCrossing(before, after)` e testá-la.

### Critérios de aceite

- Uma despesa que leva de 75% a 85% dispara um único toast de 80%.
- De 95% a 110% dispara o toast de estouro.
- Editar sem mudar o valor não dispara nada.

---

## Fase 1.8 — Fechamento do período e aporte

- [x] `frontend/components/budget/PeriodClosureModal.tsx`, montado globalmente (num client component dentro do layout, junto do Toaster):
  - depois que o `LOAD_SUCCESS` termina, chama `getPendingClosure(plan, today)`;
  - se houver pendência, abre o modal: "Período 20 out – 19 nov encerrado";
  - resumo: Receita R$ 6.000 · Gasto R$ 4.380 · **Economia inferida R$ 1.620** · Budget R$ 4.500 (✅ dentro / ❌ estourou);
  - lista de metas com opt-in e input do aporte sugerido (`suggestClosureAllocations`), editável, com o total;
  - se a economia for menor que ΣZ: a nota "A economia estimada não cobre todas as reservas; os valores foram distribuídos proporcionalmente";
  - ações: **Confirmar aporte** (`closeBudgetPeriod` com `confirmed` + `olderToSkip` como `skipped`) e **Pular este período** (`skipped`);
  - fechar no X equivale a "lembrar depois": não grava nada e pergunta de novo no próximo load;
  - acessibilidade: `role="dialog"`, `aria-modal`, foco inicial no primeiro input, Esc fecha.
- [x] Na `/budget`, o histórico mostra o status do fechamento por período: "Aporte confirmado R$ 1.200", "Pulado" ou "Pendente". Um período pendente tem o botão "Registrar aporte", que abre o mesmo modal.
- [x] Sem metas com opt-in: o modal mostra só o resumo e um botão "Ok" (grava `confirmed` com `allocations: []`), ou nem abre. Decidir e registrar no Log. Sugestão: mostrar, porque o resumo do período tem valor.

### Critérios de aceite

- Com `rolloverDay` ajustado para que o período anterior tenha terminado, o modal aparece uma vez.
- Confirmar soma nas metas e não pergunta de novo após o reload.
- Com três períodos pendentes, só o mais recente é perguntado, e os outros ficam `skipped`.

---

## Fase 1.9 — Documentação e QA

- [ ] Revisar o `docs/BUDGET_LOGIC.md` (já existe como spec) para refletir as decisões tomadas durante a implementação. Listar os desvios.
- [ ] Atualizar o `docs/EXPENSES_LOGIC.md`: `purchaseDate`, a data de budget e a diferença entre o mês de budget e o mês de fatura.
- [ ] Atualizar o `docs/GOALS_LOGIC.md`: a reserva do budget e o aporte na virada.
- [ ] README: a feature de Budget na lista e o comando da migração `npm run db:migrate -- budget_migration.sql`.
- [ ] `CLAUDE.md`: a seção sobre `utils/budget/` e `utils/dates.ts`.
- [ ] **Roteiro de QA manual** (registrar o resultado no Log):
  1. Aplicar a migração num banco com os dados reais (dump local) e conferir o backfill.
  2. Ativar o budget com R$ 5.000, dia 20.
  3. Lançar: avulsa via pix hoje; avulsa futura no período; cartão com compra hoje (fatura no mês seguinte, mas no budget conta hoje); parcelada 6x no cartão; recorrente mensal; recorrente semanal a cada 2 semanas; anual.
  4. Conferir que X gasto e X comprometido batem com uma soma manual.
  5. Cruzar 80% e 100% e ver os toasts.
  6. Mudar Y para R$ 4.500 e conferir que o período anterior na `/budget` ainda mostra R$ 5.000.
  7. Ligar a reserva em uma meta com prazo e em uma open-ended (manual), e conferir o Y efetivo e o alerta de viabilidade.
  8. Simular a virada: mudar `rolloverDay` para um dia que faça o período anterior estar encerrado, ou ajustar o `enabledAt` no banco. Confirmar o aporte e verificar o `currentAmount`.
  9. Export JSON → import → o budget é preservado.
  10. Telas 1440 / 1024 / 390px.

---

## Riscos e pontos de atenção

| Risco | Mitigação |
|---|---|
| O `POST /api/plan` apaga e reinsere todos os filhos, e uma FK para `goals` apagaria os fechamentos | Sem FK para `goals`; as alocações ficam em JSON com `goalId` |
| Dois motores de cálculo (forecast com média mensal vs budget por ocorrência) dão números diferentes para "o mês" | É intencional e documentado. O budget mede o **período** do usuário; o forecast mede o mês-calendário. Mostrar o rótulo do período sempre |
| Timezone UTC-3 | A fase 1.0 vem primeiro; a engine só usa strings `YYYY-MM-DD` e `parseLocalDate` |
| Backfill impreciso (`createdAt` ≠ data real da compra) | Decisão do usuário (D4). O formulário passa a pedir e salvar a data da compra |
| Mudar o dia de virada reinterpreta o histórico | Aceito: os fechamentos são guardados com `periodStart`/`periodEnd` e `getPendingClosure` usa o maior `periodEnd` fechado, então não repergunta |
| `settings/page.tsx` e `expenses/page.tsx` são enormes e a Sprint 2 vai reescrevê-los | Mudanças mínimas nessas páginas; a lógica vai para `components/budget/` e `utils/budget/` |
| Desempenho: calcular ocorrências de todas as despesas a cada render | Usar `useMemo` por `userPlan` + `todayISO`; o histórico de 12 períodos é calculado num único range e agrupado |

---

## 📋 Progresso

> Siga o protocolo de [`README.md`](./README.md#protocolo-de-progresso-como-os-agentes-se-comunicam). Entradas do Log ficam em ordem decrescente (mais novas no topo).

### Status por fase

| Fase | Status | Responsável | Branch / PR | Início | Fim |
|---|---|---|---|---|---|
| 1.0 Fundação de datas | 🟡 | Claude (agente sprint-1) | feat/sprint-1-budget | 2026-11-20 | — |
| 1.1 Modelo de dados e persistência | 🔍 | Claude (agente sprint-1) | feat/sprint-1-budget | 2026-11-20 | 2026-11-20 (falta validar no dump real, ver Bloqueios) |
| 1.2 Engine de budget | ✅ | Claude (agente sprint-1) | feat/sprint-1-budget | 2026-11-20 | 2026-11-20 |
| 1.3 Estado e contexto | ✅ | Claude (agente sprint-1) | feat/sprint-1-budget | 2026-11-20 | 2026-11-20 |
| 1.4 Configurações: Budget | 🔍 | Claude (agente sprint-1) | feat/sprint-1-budget | 2026-11-20 | 2026-11-20 (falta QA manual no navegador) |
| 1.5 Metas: reserva | 🔍 | Claude (agente sprint-1) | feat/sprint-1-budget | 2026-11-20 | 2026-11-20 (falta QA manual no navegador) |
| 1.6 Superfícies | 🔍 | Claude (agente sprint-1) | feat/sprint-1-budget | 2026-11-20 | 2026-11-20 (falta QA manual/visual: 1440/1024/390px) |
| 1.7 Alertas | 🔍 | Claude (agente sprint-1) | feat/sprint-1-budget | 2026-11-20 | 2026-11-20 (lógica testada; toasts na tela falta QA manual) |
| 1.8 Fechamento e aporte | 🔍 | Claude (agente sprint-1) | feat/sprint-1-budget | 2026-11-20 | 2026-11-20 (lógica testada; modal na tela falta QA manual) |
| 1.9 Docs e QA | ⬜ | — | — | — | — |

### Log do agente

#### 2026-11-20 — Fase 1.8 — Claude (agente sprint-1)
- **Feito:** `components/budget/PeriodClosureModal.tsx` (apresentacional: título "Período 20 out – 19 nov encerrado", resumo Receita / Gasto / Economia inferida / Budget com ✅ dentro ou ❌ estourou, input editável de aporte por meta com opt-in preenchido por `suggestClosureAllocations`, total, nota "A economia estimada não cobre todas as reservas; os valores foram distribuídos proporcionalmente.", aviso de quantos períodos mais antigos serão marcados como pulados, botões **Confirmar aporte** / **Pular este período**; a11y: `role="dialog"`, `aria-modal`, `aria-labelledby/describedby`, foco inicial no primeiro input, trap de Tab, Esc e ✕ fecham sem gravar, foco devolvido ao fechar) e `PeriodClosureManager.tsx` (montado no `app/layout.tsx` ao lado do Toaster: espera o plano carregar — `loading.isLoading === false` e `userPlan.id !== "default-plan"` —, chama `getPendingClosure`, e ao responder dispara `closeBudgetPeriod(closure, olderToSkip)` + toast). Na `/budget`, o histórico já mostra "Aporte confirmado R$ X" / "Pulado" / "Pendente" e o botão "Registrar aporte" abre o mesmo modal via evento `budget:open-closure` (`openPeriodClosure(period)`).
- **Decisões:** (1) **Sem metas com opt-in o modal abre**, mostra só o resumo e o botão **Ok**, que grava `confirmed` com `allocations: []` (sugestão do plano: o resumo do período tem valor). (2) Fechar no X/Esc não grava nada; o período fica numa lista de dispensados da sessão, então não reabre até o próximo carregamento. (3) "Registrar aporte" para um período pendente mais antigo fecha só aquele (sem `olderToSkip`). (4) Os fechamentos `skipped` automáticos guardam receita/gasto/Y calculados, para o histórico.
- **Desvios:** nenhum.
- **Verificação:** typecheck, lint, 149 testes e build passam. Cobertos por teste: SSR do modal (dialog/aria, valores sugeridos, nota proporcional, caso sem metas), fluxo "três pendentes → só o mais recente → os outros `skipped` → nada volta depois de JSON + `normalizeBudget` (simula o reload) e `currentAmount` somado" (`planUpdates.test.ts`), idempotência do fechamento. **Não verificado em navegador:** a abertura do modal no carregamento real, foco/Esc/Tab com teclado e o toast.
- **Arquivos:** frontend/components/budget/{PeriodClosureModal,PeriodClosureManager}.tsx, frontend/app/layout.tsx, frontend/app/budget/page.tsx, frontend/tests/budget/{components.test.tsx,planUpdates.test.ts}
- **Próximo passo:** fase 1.9.

#### 2026-11-20 — Fase 1.7 — Claude (agente sprint-1)
- **Feito:** `sonner@^2.0.8` adicionado ao frontend e `<Toaster richColors position="top-right" />` montado em `app/layout.tsx` (dentro dos providers). Lógica pura em `utils/budget/alerts.ts`: `detectThresholdCrossing(before, after)` (80% → `warning`, 100% → `over`; se cruzar os dois vale o mais grave), `evaluateExpenseChange(planBefore, planAfter, todayISO, changes)` e `formatBudgetAlertMessage` (14 testes em `tests/budget/alerts.test.ts`). No `FinancialProvider`, `addExpense`/`updateExpense`/`deleteExpense` chamam `notifyBudgetChange` **antes** do dispatch, comparando o plano do `planRef` (último estado) com o plano resultante: `toast.warning("Você atingiu 80% do budget: R$ 3.400 de R$ 4.200")`, `toast.error("Budget estourado: R$ 4.350 de R$ 4.200")` e, sem cruzamento, `toast.success("Despesa salva · budget em 65%")` (só em add/update).
- **Decisões (regra da métrica pedida pelo plano):** compara-se `percentSpent` quando algum lançamento afetado (versão antiga ou nova) tem ocorrência de **hoje ou anterior** dentro do período atual; só quando **todas** as ocorrências afetadas são futuras compara-se `percentProjected`. Só dispara com o budget ativo, Y > 0 e pelo menos uma ocorrência afetada no período atual. O alerta é best-effort (try/catch): nunca impede salvar a despesa. Para despesas recorrentes, "afetada" vale se qualquer ocorrência cair no período atual.
- **Desvios:** nenhum. Registro que o toast de sucesso opcional foi implementado.
- **Verificação:** typecheck, lint, 145 testes e build passam. Critérios: "75% → 85% dispara um único toast de 80%", "95% → 110% dispara o estouro" e "editar sem mudar o valor não dispara" estão cobertos em `alerts.test.ts` (lógica pura); a aparição real dos toasts na tela não foi vista num navegador.
- **Arquivos:** frontend/utils/budget/alerts.ts, frontend/tests/budget/alerts.test.ts, frontend/context/FinancialProvider.tsx, frontend/app/layout.tsx, frontend/package.json, frontend/package-lock.json
- **Próximo passo:** fase 1.8.

#### 2026-11-20 — Fase 1.6 — Claude (agente sprint-1)
- **Feito:** componentes em `frontend/components/budget/`: `BudgetProgress` (lg/md/sm; gasto sólido + comprometido listrado; `role="progressbar"`, `aria-valuenow/min/max` e `aria-label` descritivo; acima de 100% enche em vermelho e mostra "+R$ X acima"; textos "R$ gasto de R$ Y efetivo", "+ R$ previstos", "faltam N dias · R$/dia"), `BudgetCard` (Dashboard; estado desativado "Defina um budget mensal" com CTA para `/settings`), `BudgetBanner` (Despesas), `BudgetHeaderIndicator` (pill com mini barra e %, `title` com "R$ x de R$ y", só o % no mobile, escondido se desativado), `BudgetFlowPanel`, `BudgetCategoryBreakdown`, `BudgetGoalsPanel`, `BudgetHistory` (Recharts `ComposedChart`: barras do gasto total com cor por estouro + linha do Y efetivo; lista dos 12 períodos com "✅ dentro"/"❌ +R$", status do fechamento e botão "Registrar aporte" quando há `onRegisterClosure`), `BudgetPeriodItems` (lançamentos do período, colapsável). Página `app/budget/page.tsx` (header com ← → limitado a −11..+1 e "Período atual", progresso + 6 KPIs, painel de fluxo com alerta de viabilidade e botão "Ajustar budget para R$ X" no período atual, categorias, metas, histórico, lançamentos, estado vazio quando desativado). Lógica de apresentação pura em `utils/budget/display.ts` (`getProgressSegments`, `LEVEL_STYLES`). Navegação: itens **Dashboard** (`/`) e **Budget** (`/budget`) em `components/Navigation.tsx`, mais a chave i18n `nav.budget` (en/pt = "Budget"). Integrações mínimas: `app/page.tsx` (+2 linhas: import e `<BudgetCard />` antes da grade de KPIs, só para usuário que não é de primeira vez), `app/expenses/page.tsx` (+2 linhas: import e `<BudgetBanner />` abaixo do header), `app/layout.tsx` (+3 linhas: import e `<BudgetHeaderIndicator />` nos controles desktop e mobile).
- **Decisões:** o indicador de header ficou antes do botão de configurações. Os componentes são client components que se alimentam por `useBudget()`, e o `BudgetProgress` é puramente apresentacional (recebe `BudgetStatus`). Para `percentSpent = Infinity` (Y efetivo 0 com gasto) o rótulo é ">100%". Períodos passados não mostram "disponível/dia" (traço). O botão "Ajustar budget" só aparece no período atual (o `setBudgetAmount` vale a partir do período atual).
- **Desvios:** o `BudgetCard` não aparece na tela de boas-vindas (usuário de primeira viagem); aparece assim que há dados. O `BudgetHistory` já aceita `onRegisterClosure`, mas a página só o liga na fase 1.8.
- **Verificação:** typecheck, lint, 131 testes (inclui `components.test.tsx`: SSR de `BudgetProgress` com aria/estourado/sm e `display.test.ts`) e build passam. `next start` em porta 3101: `/`, `/budget/`, `/settings/`, `/goals/`, `/expenses/` respondem 200 e `/budget/` renderiza "Budget Mensal" no SSR; servidor encerrado. **Não verificado:** comportamento em navegador (dados reais, navegação ← →, gráfico) e layout em 1440/1024/390 px; ver Bloqueios.
- **Arquivos:** frontend/components/budget/*.tsx, frontend/app/budget/page.tsx, frontend/utils/budget/display.ts, frontend/tests/budget/{display.test.ts,components.test.tsx}, frontend/components/Navigation.tsx, frontend/context/LanguageContext.tsx, frontend/app/{layout,page}.tsx, frontend/app/expenses/page.tsx, frontend/package.json (glob de testes inclui `.test.tsx`)
- **Próximo passo:** fases 1.7 e 1.8.

#### 2026-11-20 — Fase 1.5 — Claude (agente sprint-1)
- **Feito:** `frontend/components/budget/GoalBudgetFields.tsx` com três peças: `GoalBudgetFields` (toggle "Reservar do budget mensal"; com prazo mostra "Reserva sugerida: R$ X/período (faltam N períodos)" via `getSuggestedGoalReserve` e o link "Definir valor manualmente", que abre o input de override com "Voltar ao automático"; aviso com link para `/settings` se o budget estiver desativado, sem bloquear o toggle), `GoalBudgetBadge` ("🎯 Reserva R$ 412/período", com "(manual)") e `GoalsBudgetSummary` ("Total reservado do budget: R$ 800/período"). Validação pura em `utils/budget/goalForm.ts` (`getGoalBudgetFormError`, 3 testes): meta open-ended com opt-in ligado e sem valor manual não salva. `app/goals/page.tsx` recebeu só: imports, 1 estado de erro, validação no início do `handleSubmit`, `reserveFromBudget`/`budgetReserveOverride` no `handleEdit`, o `<GoalBudgetFields key=... />` antes dos botões do form, o badge ao lado da categoria e o `<GoalsBudgetSummary />` entre a linha de KPIs e a barra de filtros.
- **Decisões:** o resumo fica acima da barra de filtros (não no header) para não tocar no layout do header que a Sprint 2 reescreve. O formulário de metas hoje nunca cria meta `open_ended` (o `goalType` é sempre `fixed_amount`); a regra de open-ended está implementada e testada, mas só é alcançável por meta importada. O estado local do componente (modo manual) é reiniciado pela `key` (id da meta em edição).
- **Desvios:** nenhum.
- **Verificação:** typecheck, lint, 124 testes e build passam. Critérios de aceite em tela (ligar/desligar muda o Y efetivo nas superfícies — as superfícies vêm na 1.6 —, override persiste e prevalece, open-ended sem valor não salva) não foram exercitados num navegador; a lógica está coberta por testes unitários (`goalReservation`, `goalForm`, `planUpdates`).
- **Arquivos:** frontend/components/budget/GoalBudgetFields.tsx, frontend/utils/budget/goalForm.ts, frontend/tests/budget/goalForm.test.ts, frontend/app/goals/page.tsx
- **Próximo passo:** fase 1.6.

#### 2026-11-20 — Fase 1.4 — Claude (agente sprint-1)
- **Feito:** `frontend/components/budget/BudgetSettingsSection.tsx` (accordion completo: cabeçalho com badge "R$ 5.000 · vira dia 20"/"Desativado", toggle, valor Y, dia de virada, preview do período e dos dias restantes, preview de reservas com link para `/goals`, histórico de Y, botão Salvar com feedback inline `role="status"`). Na página `app/settings/page.tsx` só 4 linhas: import, `"budget"` no `SectionKey`, `budget: false` no estado e `<BudgetSettingsSection ... />` antes da seção de categorias (primeira da página). Novo helper `formatShortDate` em `utils/budget/period.ts`.
- **Decisões:** o texto é pt-BR literal (sem `t()`/`isEn`), conforme o CLAUDE.md. O rascunho do formulário re-sincroniza quando o valor salvo muda (o plano carrega assíncrono). Salvar chama `setBudgetSettings` e, se o valor mudou (ou o histórico estava vazio), `setBudgetAmount`; ao desativar não exige Y. Os previews usam o rascunho do dia de virada (mudar o dia atualiza o período na hora, sem salvar). Toasts entram na 1.7; aqui o feedback é inline.
- **Desvios:** nenhum.
- **Verificação:** typecheck, lint e build passam. Os critérios de aceite são de comportamento em tela (ativar/salvar/recarregar; mudar Y cria entrada; mudar dia atualiza preview): a lógica por trás está coberta por testes (`planUpdates.test.ts`), mas **não foi exercitada num navegador** por este agente (ver Bloqueios).
- **Arquivos:** frontend/components/budget/BudgetSettingsSection.tsx, frontend/app/settings/page.tsx, frontend/utils/budget/period.ts
- **Próximo passo:** fase 1.5.

#### 2026-11-20 — Fase 1.3 — Claude (agente sprint-1)
- **Feito:** actions `SET_BUDGET_SETTINGS`, `SET_BUDGET_AMOUNT`, `CLOSE_BUDGET_PERIOD` (`context/types.ts`, `actions.ts`, `reducer.ts`); funções `setBudgetSettings`, `setBudgetAmount`, `closeBudgetPeriod` no `FinancialProvider` (contexto e `useFinancialActions`); hooks `frontend/hooks/useTodayISO.ts` (re-lê o dia no `visibilitychange`, no `focus` e a cada 60 s) e `frontend/hooks/useBudget.ts`. A lógica de transição ficou em funções puras `utils/budget/planUpdates.ts` (`applyBudgetSettings/Amount/Closure`), testadas em `tests/budget/planUpdates.test.ts` (14 testes, incluindo o reducer). O auto-save existente já manda `budget` no POST (o `saveUserPlan` envia o `UserPlan` inteiro) e o round-trip da 1.1 provou que ele volta no GET.
- **Decisões:**
  - Para manter o reducer puro, as actions carregam `todayISO`/`nowISO` carimbados por quem despacha (o provider usa `todayLocalISO()`/`new Date().toISOString()`).
  - `useBudget(offset = 0, { historyCount = 0 })` devolve `{ enabled, todayISO, status, history, feasibility, breakdown }`. O histórico só é calculado quando se pede `historyCount` (a `/budget` pede 12); header/card/banner não pagam esse custo. É o único desvio da assinatura do plano.
  - Reativar o budget depois de desligado mantém o `enabledAt` original (1ª ativação), então os períodos encerrados nesse intervalo aparecem como pendentes (só o mais recente é perguntado; os demais viram `skipped`).
  - Trocar o dia de virada com um Y vigente regrava esse Y ancorado no início do novo período atual (ver alerta da 1.2). Sem isso o Y do período atual viraria 0.
  - `CLOSE_BUDGET_PERIOD` é idempotente por `periodStart` (não aporta duas vezes se despachado de novo) e grava os `skipped` com receita/gasto/Y calculados para fins de histórico.
- **Desvios:** nenhum além do `historyCount`. Limitação herdada: o auto-save só roda quando o plano tem dados "reais" (`hasRealData`); um usuário 100% novo que só ligar o budget, sem nenhuma despesa/meta/renda, não persiste até lançar algo (comportamento pré-existente do provider; não alterado).
- **Verificação:** a UI que dispara essas actions vem na 1.4/1.8; aqui os critérios foram cobertos por teste de reducer e pelo round-trip da API (1.1). "Persiste após reload" na tela fica para o QA manual.
- **Arquivos:** frontend/context/{types,actions,reducer,FinancialProvider}.ts(x), frontend/utils/budget/planUpdates.ts, frontend/hooks/{useBudget,useTodayISO}.ts, frontend/tests/budget/planUpdates.test.ts
- **Próximo passo:** fases 1.4 e 1.5 (independentes entre si).

#### 2026-11-20 — Fase 1.2 — Claude (agente sprint-1)
- **Feito:** `frontend/utils/budget/{period,occurrences,goalReservation,budgetCalculator}.ts` com a API do plano (`getPeriodForDate/ByOffset`, `listPeriods`, `countPeriodsBetween`, `formatPeriodLabel`, `getDaysRemaining`; `getBudgetDate`, `getExpenseOccurrences`, `getIncomeOccurrences`; `getSuggestedGoalReserve`, `getGoalReserve`, `getTotalReserve`; `getBudgetAmountForPeriod`, `computeBudgetStatus`, `computePeriodHistory`, `computeCategoryBreakdown`, `checkFeasibility`, `getPendingClosure`, `suggestClosureAllocations`). 107 testes no total do frontend passam (os de budget: `tests/budget/{period,occurrences,goalReservation,budgetCalculator,normalize}.test.ts`), também com `TZ=America/Sao_Paulo`. Nenhuma função da engine lê o relógio (`today` é parâmetro; `grep` por `new Date()`/`Date.now` em `utils/budget/` vazio).
- **Decisões / extras além da assinatura do plano:**
  - `formatPeriodLabel(p, todayISO?)`: sem `todayISO` só acrescenta o ano quando os extremos estão em anos diferentes; com `todayISO` também quando não é o ano atual.
  - `countPeriodsBetween` devolve 0 quando a data-alvo cai antes do período; `getSuggestedGoalReserve` aplica `max(1, n)`.
  - ΣZ do status é sempre o **atual** (relativo ao período em curso e ao `currentAmount` de hoje), inclusive em períodos passados/futuros e no histórico (conforme BUDGET_LOGIC §9). No resumo/aporte de fechamento o ΣZ é relativo ao próprio período fechado.
  - `getSuggestedGoalReserve` ignora opt-in e override (serve de pré-visualização no formulário da fase 1.5); `getTotalReserve` lista metas ativas com opt-in mesmo com Z = 0 (a UI precisa mostrar "informe o valor manual").
  - `percentSpent`/`percentProjected` = `Infinity` quando o Y efetivo é 0 e há gasto (como na spec); a UI deve tratar.
  - Extras: `computeClosureSummary(plan, period, todayISO?)` (receita, gasto, Y efetivo, economia e dentro/estourou, para o modal da 1.8), `getPeriodExpenseOccurrences`/`getPeriodIncomeOccurrences` (para a lista "Lançamentos do período"), campos `closureState` (`confirmed|skipped|pending|none`) e `overBy`/`withinBudget` no histórico, `enabled` no `BudgetStatus`, `evaluable` no resultado de `checkFeasibility`.
- **Desvios (pequenos; nenhum altera regra D1–D16):**
  1. `checkFeasibility`: sem receita no período (ou Y = 0) devolve `feasible: true, evaluable: false` em vez de acusar inviabilidade — sem renda cadastrada todo budget seria "inviável" e o alerta seria ruído. A fórmula da spec vale quando há receita.
  2. Meta **open-ended** com override: Z = override mesmo que `targetAmount − currentAmount` seja 0 (a spec checa "restante = 0" antes do override, o que anularia o override de metas open-ended, que não têm alvo). Para metas de valor fixo a ordem da spec é mantida.
  3. `getPendingClosure`: sem nenhum fechamento gravado, a pendência começa no período que **contém** `enabledAt` (como diz o parêntese da spec); com fechamentos, usa `P.start > maior periodEnd`. A fórmula literal `P.start > enabledAt − 1` excluiria o período de `enabledAt` quando a ativação acontece no meio dele.
- **Atenção para a fase 1.3 (Y vs. mudança de D):** `Y(período)` é "última entrada com `effectiveFrom ≤ período.start`". Se o usuário trocar o dia de virada de 20 para 1 no meio do mês, o período atual passa a começar antes da única entrada do histórico e o Y vira 0. O reducer de `SET_BUDGET_SETTINGS` (1.3) deve, quando `rolloverDay` mudar com budget ativo, regravar o Y vigente em `amountHistory` ancorado no início do novo período atual.
- **Arquivos:** frontend/utils/budget/*.ts, frontend/tests/budget/*.test.ts (+ helpers.ts)
- **Próximo passo:** fase 1.3.

#### 2026-11-20 — Fase 1.1 — Claude (agente sprint-1)
- **Feito:**
  - Tipos nos dois lados (`frontend/types/index.ts` e `backend/src/types/index.ts`, idênticos): `Expense.purchaseDate`, `Goal.reserveFromBudget`/`budgetReserveOverride`, `BudgetAmountEntry`, `BudgetGoalAllocation`, `BudgetPeriodClosure`, `BudgetSettings`, `UserPlan.budget`.
  - `backend/database/migrations/budget_migration.sql` (idempotente; colunas via `information_schema` + `PREPARE`; 3 tabelas; backfill D4) e `schema.sql` atualizado. A migração não tem `USE`: aplica no banco de `DB_NAME`.
  - `backend/src/routes/plan.ts`: `ensureBudgetSchema()` (memoizado; roda antes do `beginTransaction`, porque `ALTER TABLE` faz commit implícito; faz o backfill D4 quando cria `purchase_date`), GET monta `userPlan.budget`, POST grava `purchase_date`, `reserve_from_budget`, `budget_reserve_override` e faz upsert/delete+reinsert das 3 tabelas na mesma transação. Mapeamento puro em `backend/src/domain/budgetMapping.ts` (13 testes em `backend/tests/budgetMapping.test.ts`; script `npm test` do backend agora lista os 2 arquivos).
  - Frontend: `utils/budget/normalize.ts` (defaults, `normalizeBudget`, backfill D4 com data local, defaults de meta), usado em `initialState.ts`, `storage.ts` (`migrateUserPlan`; `isValidUserPlan` aceita `budget` opcional) e `dataImport.ts` (`sanitizeUserPlan`); `dataExport.ts` já serializa `budget` no JSON (spread) e agora declara `"budget"` em `dataTypes`; `app/expenses/page.tsx` grava `purchaseDate` (cartão = data informada; demais = `dueDate`) e, ao editar, usa `expense.purchaseDate ?? expense.dueDate`. Testes: `frontend/tests/budget/normalize.test.ts`.
- **Verificação real (banco descartável):** havia um MySQL 8.0.46 local acessível. Criei e removi `finance_planner_s1_test` (nunca toquei em `finance_planner`): (a) schema ANTIGO + `budget_migration.sql` 2x sem erro, backfill correto (cartão sem `purchase_date` preenchido pelo `created_at`, pix intacto, cartão já preenchido preservado); (b) `schema.sql` novo num banco limpo + migração por cima; (c) backend real em `127.0.0.1:3101` contra o schema antigo (criado em runtime pelo `ensureBudgetSchema`): GET ok, POST 2x ok, GET devolve `budget` (histórico, fechamento com `allocations` JSON), metas com `reserveFromBudget`/override 412.5 e despesa com `purchaseDate`; POST sem `budget` (cliente antigo) não apaga o budget; fechamentos sobrevivem ao delete+reinsert de metas. Servidor encerrado e banco removido.
- **Decisões:** (1) CSV **não** recebe seção de budget: budget é configuração/estado e o CSV é tabular; só o JSON preserva (a importação de CSV deixa o budget com os defaults). Despesas/metas no CSV também não exportam `purchaseDate`/`reserveFromBudget` (o import de cartão recebe backfill D4 pelo `createdAt`). (2) `POST` sem `budget` no payload não mexe nas tabelas de budget (conservador, para clientes antigos). (3) `budget_settings.updated_at` usa `plan.updatedAt`. (4) `overrideToDb` aceita 0 como override válido (Z = 0 manual) e descarta negativos (viram automático).
- **Desvios:** o subitem opcional "Compra: dd/mm" na lista/calendário de despesas **não foi feito** (opcional, e `expenses/page.tsx` é reescrita na Sprint 2). A validação "num dump de `seeds/local/`" não foi feita (não li nem usei dumps pessoais); ver Bloqueios.
- **Arquivos:** types (2), backend/database/{schema.sql,migrations/budget_migration.sql}, backend/src/{routes/plan.ts,domain/budgetMapping.ts}, backend/tests/budgetMapping.test.ts, frontend/utils/budget/normalize.ts, context/{initialState,storage}.ts, utils/{dataImport,dataExport}.ts, app/expenses/page.tsx
- **Próximo passo:** fase 1.2 (engine).

#### 2026-11-20 — Fase 1.0 — Claude (agente sprint-1)
- **Feito:** `frontend/utils/dates.ts` (parseLocalDate, toLocalISODate/Month, todayLocalISO, currentMonthLocalISO, daysInMonth, clampDay, addMonthsClamped, addDays/addDaysISO, diffInDays/diffInDaysISO, compareISO, isWithinISO). `parseDateSafe` delega para `parseLocalDate` (assinatura intacta). Parses UTC trocados em `expenseOperations.ts`, `creditCardRules.ts`, `installmentCalculator.ts`, `forecastCalculator.ts` e `app/expenses/page.tsx` (hoje, `purchaseDate`, filtros de data, `monthData.month`). `npm test` no frontend com `tsx --test "tests/**/*.test.ts"`; 21 testes (15 de `dates`, 6 de regressão de fuso) passam com TZ padrão, `America/Sao_Paulo` e `Pacific/Auckland`.
- **Decisões:** o glob entre aspas funciona no Windows com Node 24 (o Node expande o glob; o `cmd` do npm não). Em Node 20 `--test` não expande glob: se o projeto precisar rodar em Node 20, trocar por `node --import tsx --test tests/dates.test.ts ...` ou listar os arquivos. O script manual `tests/forecastCalculator.test.ts` (sem asserts) foi **movido**, não apagado, para `tests/manual/forecastCalculator.manual.ts`.
- **Desvios:** (1) em `forecastCalculator.ts` removi os `console.log` de debug de `isExpenseActiveInMonth` junto com a troca para comparação por (ano*12+mês) local; (2) o `monthsFromStart` do `installmentInfo` do forecast usava `ms / 30.44 dias` (aproximação sujeita a erro de 1 mês); agora é a diferença exata de meses de calendário; (3) `goal.targetDate`/`income.endDate` no forecast agora também são parseados localmente (antes UTC); (4) `app/expenses/page.tsx:1866` usava `"...-01T00:00:00Z"` com getters locais (mês anterior em UTC-3), corrigido para `parseLocalDate`. Não toquei em `dataExport.ts`, `app/car`, `app/goals`, `app/page.tsx`, `app/settings` etc. (restam `new Date("YYYY-MM-DD")` lá; fora do escopo listado; ver Handoff).
- **Arquivos:** frontend/utils/dates.ts, utils/dateFormatting.ts, utils/expenseOperations.ts, utils/creditCardRules.ts, utils/installmentCalculator.ts, utils/forecastCalculator.ts, app/expenses/page.tsx, tests/dates.test.ts, tests/datesRegression.test.ts, tests/manual/forecastCalculator.manual.ts, package.json
- **Próximo passo:** fase 1.1.

#### 2026-11-20 — Planejamento — Claude (sessão de planejamento)
- **Feito:** levantamento do código (frontend, backend, banco), sessão de perguntas com o usuário (D1–D16) e escrita deste plano e de `docs/BUDGET_LOGIC.md`.
- **Descobertas relevantes:** a data da compra não é persistida (o formulário só usa para calcular o `dueDate`); não existe status "pago"; recorrentes viram média mensal no forecast; há vários bugs de fuso UTC-3; o frontend não tem test runner.
- **Próximo passo:** fase 1.0.

### Handoff

- Fase 1.0 concluída. Regra daqui em diante: nenhum `new Date("YYYY-MM-DD")` nem `toISOString().split("T")[0]` em código novo; use `frontend/utils/dates.ts`.
- Ficaram `new Date("YYYY-MM-DD")`/`toISOString()` fora do escopo da 1.0 em: `utils/dataExport.ts`, `utils/dataImport.ts`, `app/car/page.tsx`, `app/goals/page.tsx`, `app/page.tsx`, `app/settings/page.tsx`, `app/income/page.tsx`, `components/charts/*`, `context/*` (só `toISOString()` de timestamps, que é correto). A Sprint 2 reescreve várias dessas páginas; trocar quando passar por elas.
- Leia `docs/BUDGET_LOGIC.md` inteiro antes da fase 1.2.
- A branch atual de trabalho do usuário é `chore/reorganize-backend-frontend`. Confirme com o usuário a partir de qual branch criar `feat/s1-*` (provavelmente `main` depois do merge dela).

### Bloqueios / perguntas ao usuário

- **[Usuário] Banco real / dump (fase 1.1):** a migração e o round-trip foram validados só num banco descartável criado a partir do schema antigo. Falta o usuário rodar `cd backend && npm run db:migrate -- budget_migration.sql` (2x) no `finance_planner` real, ou deixar o backend aplicar sozinho no primeiro GET/POST (`ensureBudgetSchema`), e conferir que `expenses.purchase_date` foi preenchido nas despesas de cartão. Recomenda-se fazer um dump antes.
- **[Usuário] QA manual no navegador:** nenhum fluxo de UI foi testado em browser real por este agente (sem acesso ao banco real nem às portas 3000/3001).
