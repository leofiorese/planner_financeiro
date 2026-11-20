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

- [ ] Criar `frontend/utils/dates.ts` com funções puras, sem dependências:
  - `parseLocalDate(iso: string): Date`: `"YYYY-MM-DD"` vira `new Date(y, m-1, d)` local. Também aceita `"YYYY-MM"` (dia 1) e strings ISO completas (usa só a parte da data).
  - `toLocalISODate(d: Date): string`: devolve `YYYY-MM-DD` usando getters locais.
  - `todayLocalISO(): string`.
  - `daysInMonth(year, monthIndex): number`.
  - `clampDay(year, monthIndex, day): Date`: `day > daysInMonth` vira o último dia.
  - `addMonthsClamped(date, n): Date`: mantém o dia, com clamp (31/jan + 1 = 28 ou 29/fev).
  - `addDays(date, n): Date`, `diffInDays(a, b): number` (ignorando horário de verão: usar meio-dia ou UTC dos componentes locais).
  - `compareISO(a, b)`, `isWithinISO(date, start, end)`: comparação lexicográfica de `YYYY-MM-DD`, que é segura e rápida.
- [ ] `utils/dateFormatting.ts`: fazer o `parseDateSafe` delegar para `parseLocalDate` (sem mudar a assinatura pública).
- [ ] Substituir os parses UTC nos arquivos listados acima por `parseLocalDate` / `todayLocalISO`.
- [ ] Adicionar `tsx` como devDependency do frontend e o script `"test": "tsx --test tests/**/*.test.ts"`.
  - O glob no Windows: se o `tsx --test` não expandir o glob, listar os arquivos ou usar `node --import tsx --test`. Registrar no Log o que funcionou.
  - Avaliar mover `tests/forecastCalculator.test.ts`, que é um script sem asserts, para `tests/manual/` ou convertê-lo. **Não apague** sem registrar.
- [ ] `frontend/tests/dates.test.ts` com `node:test` + `node:assert/strict`:
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

- [ ] Criar `backend/database/migrations/budget_migration.sql`, **seguro para rodar de novo**. O MySQL 8 não tem `ADD COLUMN IF NOT EXISTS`, então use um procedure temporário com `information_schema.COLUMNS` ou blocos condicionais via `PREPARE`:
  - `expenses.purchase_date VARCHAR(10) NULL` (depois de `due_date`).
  - `goals.reserve_from_budget TINYINT(1) NOT NULL DEFAULT 0`.
  - `goals.budget_reserve_override DECIMAL(12,2) NULL`.
  - `CREATE TABLE IF NOT EXISTS budget_settings` com `user_plan_id VARCHAR PK` (mesmo tipo de `user_plans.id`), `enabled TINYINT(1)`, `rollover_day INT`, `enabled_at VARCHAR(10)`, `updated_at DATETIME` e FK para `user_plans(id)` ON DELETE CASCADE.
  - `CREATE TABLE IF NOT EXISTS budget_amount_history` com `id INT AUTO_INCREMENT PK`, `user_plan_id`, `amount DECIMAL(12,2)`, `effective_from VARCHAR(10)` e FK com cascade.
  - `CREATE TABLE IF NOT EXISTS budget_period_closures` com `id INT AUTO_INCREMENT PK`, `user_plan_id`, `period_start VARCHAR(10)`, `period_end VARCHAR(10)`, `status VARCHAR(16)`, `income DECIMAL(12,2)`, `spent DECIMAL(12,2)`, `budget_amount DECIMAL(12,2)`, `allocations JSON`, `closed_at DATETIME`, FK com cascade e `UNIQUE(user_plan_id, period_start)`.
  - **Não** criar uma FK de `allocations`/closures para `goals`: o `POST /api/plan` apaga e reinsere as metas a cada save.
  - Backfill: `UPDATE expenses SET purchase_date = DATE_FORMAT(created_at, '%Y-%m-%d') WHERE payment_method = 'credit_card' AND (purchase_date IS NULL OR purchase_date = '');`
- [ ] Refletir tudo em `backend/database/schema.sql`.
- [ ] `backend/src/routes/plan.ts`:
  - Garantir as tabelas e colunas em runtime seguindo o padrão `ensureCategoriesTable` (`plan.ts:9-24`), para quem não rodou a migração. Isso evita quebrar o GET/POST.
  - GET: ler `budget_settings`, `budget_amount_history` (ORDER BY `effective_from`) e `budget_period_closures`, e montar `userPlan.budget`. Quando não houver linha em `budget_settings`, devolver `budget` indefinido; o frontend aplica o default.
  - GET: converter `reserve_from_budget` e `enabled` para booleanos (helper em `:50-61`), `budget_reserve_override` e os valores decimais para `number`, e fazer o parse de `allocations`, que pode vir como string ou objeto dependendo do driver.
  - POST: incluir `purchase_date` no INSERT de expenses e `reserve_from_budget`/`budget_reserve_override` no de goals (`:179-247`). Fazer upsert de `budget_settings` e delete+reinsert de `budget_amount_history` e `budget_period_closures`, dentro da mesma transação. Datas via `toDbDate`.
- [ ] Teste de backend (`backend/tests/`): se possível, extrair as funções de mapeamento linha → objeto para uma função pura e testá-la. Integração com o banco não é obrigatória.

### Frontend

- [ ] `context/initialState.ts`: default `budget = { enabled: false, rolloverDay: 1, enabledAt: "", amountHistory: [], periodClosures: [] }`.
- [ ] `context/storage.ts` → `migrateUserPlan` (`:207-244`):
  - garantir `budget` com os defaults;
  - para despesas `credit_card` sem `purchaseDate`, usar `createdAt.slice(0,10)`, convertido para data local se o `createdAt` tiver horário;
  - metas sem `reserveFromBudget` ficam com `false`.
- [ ] `isValidUserPlan` (`:249-274`): aceitar `budget` opcional.
- [ ] Import/export: `utils/dataImport.ts` → `sanitizeUserPlan` (`:535-566`) com os defaults do budget; `utils/dataExport.ts` serializa `budget` no JSON. No CSV, decidir se entra uma seção nova (registrar a decisão no Log).
- [ ] `app/expenses/page.tsx`:
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

- [ ] Períodos: D=1, D=20, D=29/30/31 em fevereiro (bissexto e não), virada de ano, data igual ao início, data igual ao fim, offset −1 e +1, `listPeriods(12)`.
- [ ] Ocorrências:
  - avulsa dentro e fora do range;
  - monthly com D=31 em fevereiro;
  - weekly com interval 1 e 3;
  - biweekly; daily (contagem exata de dias);
  - quarterly e yearly cheios na data real;
  - parcelada no cartão 6x a partir da `purchaseDate`;
  - parcelada fora do cartão a partir de `installmentStartMonth`;
  - recorrente+parcelada weekly interval 4;
  - `isActive=false`.
- [ ] `getBudgetDate`: cartão com `purchaseDate`, cartão sem ela (usa `createdAt`), pix (usa `dueDate`).
- [ ] Receita: monthly com `endDate` no meio do período; one_time.
- [ ] Y: histórico com troca no meio (períodos anteriores mantêm o valor antigo); sem histórico dá 0.
- [ ] Z: meta com prazo em 4 períodos dá restante/4; prazo vencido dá restante (1 período); concluída dá 0; open-ended sem override dá 0 (e a UI exige override); override prevalece.
- [ ] Status: gasto vs comprometido em relação a `today`; limiares 79,9% / 80% / 100% / 100,1%; `dailyAllowance` nunca negativa.
- [ ] Viabilidade: receita 6000, Y 5000, ΣZ 1500 dá inviável com sugestão 4500.
- [ ] Fechamento:
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

- [ ] Actions:
  - `SET_BUDGET_SETTINGS`, com `{ enabled, rolloverDay }`. Na primeira ativação, define `enabledAt = todayLocalISO()`.
  - `SET_BUDGET_AMOUNT`, com `{ amount }`. Calcula o período atual: se já existe uma entrada com `effectiveFrom === period.start`, substitui; senão, adiciona `{ amount, effectiveFrom: period.start }`.
  - `CLOSE_BUDGET_PERIOD`, com `{ closure, skipped: BudgetPeriod[] }`. Adiciona o closure e os registros `skipped` e, se `status === "confirmed"`, soma `allocation.amount` em `goal.currentAmount` (atualizando `updatedAt`) **no mesmo update de estado**.
- [ ] Funções no contexto: `setBudgetSettings`, `setBudgetAmount`, `closeBudgetPeriod`.
- [ ] Hook `frontend/hooks/useBudget.ts` (ou `context/useBudget.ts`, conforme o padrão do repo):
  - `useBudget(offset = 0)` devolve `{ enabled, status, history, feasibility, breakdown }`, com `useMemo` sobre `state.userPlan` e `todayISO`;
  - `todayISO` é recalculado quando a aba volta ao foco (`visibilitychange`), para virar o dia sem reload.
- [ ] O auto-save existente já persiste: confirmar que o `budget` vai no POST.

### Critérios de aceite

- Alterar Y e o dia em Configurações (fase 1.4) persiste após reload.
- Confirmar um fechamento atualiza `currentAmount` das metas e persiste.

---

## Fase 1.4 — Configurações: seção Budget Mensal

Arquivo: `frontend/app/settings/page.tsx`. Adicionar `"budget"` ao `SectionKey` (`:43`) e criar a seção **como a primeira** da página, no mesmo padrão de accordion das outras (`:559`).

> Para não engordar a página de 1546 linhas, implemente o conteúdo em `frontend/components/budget/BudgetSettingsSection.tsx` e só monte o accordion na página.

- [ ] Cabeçalho do accordion: ícone, título "Budget Mensal" e badge com "R$ 5.000 · vira dia 20" ou "Desativado".
- [ ] Conteúdo:
  - toggle "Ativar budget mensal";
  - campo "Valor do budget (Y)": numérico, moeda via `useCurrency().formatCurrency` no preview, > 0;
  - campo "Dia de virada": 1–31, com a nota "Se o mês não tiver esse dia, a virada acontece no último dia do mês";
  - preview: "Período atual: 20 nov – 19 dez · faltam 30 dias";
  - preview de reservas: "Metas reservando: R$ 800 → disponível para gastar: R$ 4.200", com link para Metas;
  - histórico de Y: lista "a partir de 20 out 2026: R$ 4.500";
  - botão Salvar: chama `setBudgetSettings` + `setBudgetAmount` (só se o valor mudou), com feedback inline (os toasts entram na 1.7; se a 1.7 já estiver pronta, use toast).
- [ ] Validação: Y > 0 para ativar; dia inteiro entre 1 e 31.

### Critérios de aceite

- Ativar, salvar e recarregar mantém os valores.
- Mudar Y cria uma entrada nova no histórico (ou substitui a do período atual).
- Mudar o dia de virada atualiza o preview na hora.

---

## Fase 1.5 — Metas: reserva do budget

Arquivo: `frontend/app/goals/page.tsx` (formulário `:363-509`, lista `:520-680`).

- [ ] No formulário:
  - toggle "Reservar do budget mensal" (`reserveFromBudget`);
  - quando ligado e a meta tem prazo: "Reserva sugerida: R$ 412/período (faltam 6 períodos)", calculado com `getSuggestedGoalReserve`, e um link "Definir valor manualmente" que mostra o input do override, com a opção "voltar ao automático";
  - quando ligado e a meta é `open_ended`: o input manual é obrigatório (validação);
  - se o budget estiver desativado: aviso "Ative o budget em Configurações para usar a reserva", com link. O toggle continua permitido.
- [ ] Na lista: badge "🎯 Reserva R$ 412/período" (ou "manual") nas metas com opt-in.
- [ ] Na página: um resumo "Total reservado do budget: R$ 800/período", no header ou acima da lista.

### Critérios de aceite

- Ligar e desligar o opt-in muda o Y efetivo mostrado nas superfícies (1.6).
- O override persiste e prevalece sobre o sugerido.
- Uma meta open-ended sem valor não salva com o opt-in ligado.

---

## Fase 1.6 — Superfícies do budget

Todos os componentes ficam em `frontend/components/budget/`, recebem `BudgetStatus` por props (apresentacionais) e são alimentados por `useBudget()`.

- [ ] **`BudgetProgress.tsx`**:
  - barra com dois segmentos: **gasto** (cor sólida por nível: emerald/amber/rose) e **comprometido** (mesma cor com transparência ou listrado);
  - acima de 100%, a barra fica cheia em vermelho e mostra "+R$ 350 acima";
  - textos: "R$ 3.250 de R$ 4.200" (Y efetivo), "+ R$ 600 previstos", "faltam 12 dias · R$ 29/dia";
  - variantes `size="lg" | "md" | "sm"`;
  - acessibilidade: `role="progressbar"`, `aria-valuenow/min/max` e um `aria-label` descritivo.
- [ ] **Card no Dashboard** (`app/page.tsx`, logo abaixo do header `:188` e antes dos KPIs `:333`): `BudgetCard` com `BudgetProgress lg`, rótulo do período, linha "Budget R$ 5.000 − Metas R$ 800 = R$ 4.200" e link "Ver detalhes" para `/budget`. Desativado: um card discreto "Defina um budget mensal" com CTA para Configurações.
- [ ] **Banner em Despesas** (`app/expenses/page.tsx`, abaixo do header `:934-1003`): `BudgetBanner` compacto (uma linha, com `BudgetProgress sm`) e link para `/budget`. Não aparece se o budget estiver desativado.
- [ ] **Indicador no header** (`app/layout.tsx`, controles à direita `:93-105`):
  - `BudgetHeaderIndicator`, um pill com mini barra e "65%";
  - tooltip/title com "R$ 3.250 de R$ 4.200";
  - clicável para `/budget`; escondido quando desativado;
  - no mobile, só o pill com o percentual.
  - Precisa ser client component, porque o layout é server: crie um wrapper.
- [ ] **Página `app/budget/page.tsx`**:
  1. Header: "Budget Mensal" + rótulo do período + navegação ← → (`offset`, com limite de −11 até +1) + "Período atual".
  2. `BudgetProgress lg` + KPIs: Y, ΣZ, Y efetivo, gasto, comprometido, disponível/dia.
  3. **Painel Receita × Despesas × Metas** (`BudgetFlowPanel`): três barras horizontais ou uma barra empilhada comparando receita do período vs (gasto + comprometido) vs ΣZ, com a economia inferida. Se `checkFeasibility` der inviável: um alerta âmbar "Sua receita do período (R$ 6.000) menos as metas (R$ 1.500) não cobre o budget de R$ 5.000. Budget realista: R$ 4.500", com o botão "Ajustar budget para R$ 4.500" chamando `setBudgetAmount`.
  4. **Breakdown por categoria**: lista ordenada com emoji/cor (`getCategoryInfo`), valor e % do total, mais uma barra fina.
  5. **Metas que reservam**: lista com Z, automático/manual e progresso da meta.
  6. **Histórico**: gráfico de barras Recharts com os 12 últimos períodos (barra = gasto total; linha ou marcador = Y efetivo; cor por estouro) e a lista abaixo, "20 out – 19 nov · R$ 4.380 de R$ 4.500 · ✅ dentro" / "❌ +R$ 230" · aporte confirmado R$ X.
  7. **Lançamentos do período** (opcional, colapsável): as ocorrências que compõem X.
  - Estado vazio (budget desativado): explicação curta + CTA para Configurações.
- [ ] **Navegação** (`components/Navigation.tsx` `navItems :14-62`): adicionar **Dashboard** (`/`, que hoje não existe no menu) e **Budget** (`/budget`). As chaves i18n existentes `nav.dashboard` (e `nav.budget`, a ser adicionada) vêm antes de a Sprint 2 remover o i18n. Aceite um texto pt-BR direto se preferir, mas mantenha os dois idiomas funcionando nesta sprint.

### Critérios de aceite

- As quatro superfícies mostram números consistentes entre si para o mesmo instante.
- Navegar entre períodos na `/budget` mostra o histórico correto: um Y antigo em período antigo.
- O layout não quebra em 1440, 1024 e 390px.

---

## Fase 1.7 — Alertas

- [ ] Adicionar `sonner` ao frontend e montar `<Toaster richColors position="top-right" />` dentro dos providers em `app/layout.tsx`. A Sprint 2 reaproveita a mesma lib através do shadcn.
- [ ] No `FinancialProvider` (`addExpense :255`, `updateExpense :281`, `deleteExpense :313`):
  - antes do dispatch, calcular `computeBudgetStatus(planAntes, today).percentSpent` e `percentProjected`;
  - depois, calcular sobre o plano resultante;
  - ao **cruzar** 0,8 ou 1,0 (antes < limiar ≤ depois), usar `percentProjected` quando a despesa nova é futura e `percentSpent` quando é de hoje ou anterior; decida e registre a regra no Log;
  - toasts: `toast.warning("Você atingiu 80% do budget: R$ 3.400 de R$ 4.200")` e `toast.error("Budget estourado: R$ 4.350 de R$ 4.200")`;
  - só disparar se o budget estiver ativo e a ocorrência cair no período atual.
- [ ] Toast de sucesso opcional ao salvar uma despesa: "Despesa salva · budget em 65%".
- [ ] Extrair a lógica de cruzamento para uma função pura `detectThresholdCrossing(before, after)` e testá-la.

### Critérios de aceite

- Uma despesa que leva de 75% a 85% dispara um único toast de 80%.
- De 95% a 110% dispara o toast de estouro.
- Editar sem mudar o valor não dispara nada.

---

## Fase 1.8 — Fechamento do período e aporte

- [ ] `frontend/components/budget/PeriodClosureModal.tsx`, montado globalmente (num client component dentro do layout, junto do Toaster):
  - depois que o `LOAD_SUCCESS` termina, chama `getPendingClosure(plan, today)`;
  - se houver pendência, abre o modal: "Período 20 out – 19 nov encerrado";
  - resumo: Receita R$ 6.000 · Gasto R$ 4.380 · **Economia inferida R$ 1.620** · Budget R$ 4.500 (✅ dentro / ❌ estourou);
  - lista de metas com opt-in e input do aporte sugerido (`suggestClosureAllocations`), editável, com o total;
  - se a economia for menor que ΣZ: a nota "A economia estimada não cobre todas as reservas; os valores foram distribuídos proporcionalmente";
  - ações: **Confirmar aporte** (`closeBudgetPeriod` com `confirmed` + `olderToSkip` como `skipped`) e **Pular este período** (`skipped`);
  - fechar no X equivale a "lembrar depois": não grava nada e pergunta de novo no próximo load;
  - acessibilidade: `role="dialog"`, `aria-modal`, foco inicial no primeiro input, Esc fecha.
- [ ] Na `/budget`, o histórico mostra o status do fechamento por período: "Aporte confirmado R$ 1.200", "Pulado" ou "Pendente". Um período pendente tem o botão "Registrar aporte", que abre o mesmo modal.
- [ ] Sem metas com opt-in: o modal mostra só o resumo e um botão "Ok" (grava `confirmed` com `allocations: []`), ou nem abre. Decidir e registrar no Log. Sugestão: mostrar, porque o resumo do período tem valor.

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
| 1.0 Fundação de datas | ⬜ | — | — | — | — |
| 1.1 Modelo de dados e persistência | ⬜ | — | — | — | — |
| 1.2 Engine de budget | ⬜ | — | — | — | — |
| 1.3 Estado e contexto | ⬜ | — | — | — | — |
| 1.4 Configurações: Budget | ⬜ | — | — | — | — |
| 1.5 Metas: reserva | ⬜ | — | — | — | — |
| 1.6 Superfícies | ⬜ | — | — | — | — |
| 1.7 Alertas | ⬜ | — | — | — | — |
| 1.8 Fechamento e aporte | ⬜ | — | — | — | — |
| 1.9 Docs e QA | ⬜ | — | — | — | — |

### Log do agente

#### 2026-11-20 — Planejamento — Claude (sessão de planejamento)
- **Feito:** levantamento do código (frontend, backend, banco), sessão de perguntas com o usuário (D1–D16) e escrita deste plano e de `docs/BUDGET_LOGIC.md`.
- **Descobertas relevantes:** a data da compra não é persistida (o formulário só usa para calcular o `dueDate`); não existe status "pago"; recorrentes viram média mensal no forecast; há vários bugs de fuso UTC-3; o frontend não tem test runner.
- **Próximo passo:** fase 1.0.

### Handoff

- Comece pela **fase 1.0**: sem ela, a engine de budget herda os bugs de fuso.
- Leia `docs/BUDGET_LOGIC.md` inteiro antes da fase 1.2.
- A branch atual de trabalho do usuário é `chore/reorganize-backend-frontend`. Confirme com o usuário a partir de qual branch criar `feat/s1-*` (provavelmente `main` depois do merge dela).

### Bloqueios / perguntas ao usuário

- _(nenhum no momento)_
