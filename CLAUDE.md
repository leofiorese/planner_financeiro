# CLAUDE.md

Guia para agentes (Claude Code e afins) trabalharem neste repositório.

## ⚠️ PREMISSA — fluxo de branches (inegociável)

**No GitHub existe SOMENTE a `main`. Tudo precisa estar na `main`.**

O usuário sempre inicia o projeto pela `main`, então a `main` tem que conter todo o trabalho concluído.

- **Branches são só locais e temporárias**: servem para não misturar trabalhos (uma por fase/feature/agente). Nunca são o destino final do trabalho.
- **Nunca faça push de branch que não seja a `main`.** Não use `git push -u origin <branch>`, não abra PR a partir de branch publicada e não deixe branch de trabalho no remoto.
- **Todo trabalho concluído é integrado na `main`** (merge local, de preferência `--ff-only` ou merge normal, depois de `typecheck` + `lint` + `test` + `build` passando) e só então publicado com `git push origin main`.
- **Trabalho concluído não pode ficar parado numa branch.** Ao terminar uma fase ou feature: integre na `main`, publique a `main` e apague a branch local (`git branch -d <branch>`) e o worktree associado.
- **Antes de dar uma tarefa por encerrada, confira**: `git branch --show-current` deve ser `main`, `git status` limpo e `git log origin/main..main` vazio (nada local sem publicar).
- **Commits sem co-autor:** não adicione `Co-Authored-By` nem qualquer linha de atribuição a commits ou PRs deste repositório. Isso vale também para commits feitos por subagentes.
- **Fluxo de encerramento (quando o usuário manda "subir"):**
  1. Pareie a `main` com todas as últimas mudanças (integre as branches de trabalho, uma de cada vez), faça commit e `git push origin main`.
  2. Exclua toda branch que não seja a `main`, local e remota (`git branch -d`, `git push origin --delete <branch>`), e remova os worktrees (`git worktree remove`). Fluxo: trabalhou → `main` → exclui.
- `git push` e a exclusão de branches remotas só acontecem quando o usuário pede ou autoriza o fluxo acima. Esta premissa define *para onde* o trabalho vai; não dispensa o pedido de publicar.
- Se houver risco de conflito entre branches paralelas, integre uma de cada vez na `main` e resolva os conflitos antes de integrar a seguinte. Nunca deixe a `main` quebrada: ela precisa sempre buildar.

## Visão geral

Planner financeiro pessoal, **single-user e sem autenticação**. Dois projetos npm independentes:

| Pasta | Stack | Porta |
|---|---|---|
| `frontend/` | Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Recharts | 3000 |
| `backend/` | Express 5 + TypeScript (`tsx` em dev) + mysql2 → MySQL 8 | 3001 |

O frontend chama URLs relativas (`fetch("/api/plan/")`). O `rewrites` em `frontend/next.config.ts` faz o proxy de `/api/*` para `BACKEND_URL` (default `http://localhost:3001`), então não há CORS.

## Comandos

```bash
# tudo de uma vez (Windows, na raiz)
powershell -ExecutionPolicy Bypass -File .\start-dev.ps1   # -Install, -SkipDbCheck, -BackendPort, -FrontendPort

# backend/
npm run dev          # tsx watch src/server.ts
npm run typecheck    # tsc --noEmit
npm run build        # compila para dist/
npm test             # node:test via tsx (tests/*.test.ts)
npm run db:migrate -- <arquivo.sql>   # aplica um arquivo de database/migrations/

# frontend/
npm run dev | build | start
npm run typecheck
npm run lint
```

O frontend tem `npm test` (`tsx --test "tests/**/*.test.ts" "tests/**/*.test.tsx"`, o Node expande o glob; em Node 20 liste os arquivos). O script de console sem asserts `forecastCalculator.test.ts` foi movido para `frontend/tests/manual/`. Para validar no fuso do usuário: `TZ=America/Sao_Paulo npm test` (bash) ou `$env:TZ="America/Sao_Paulo"; npm test` (PowerShell).

Antes de dar uma tarefa por concluída, rode `typecheck` + `lint` + `build` no frontend e `typecheck` + `test` no backend.

## Arquitetura e fluxo de dados

- **Estado global:** `frontend/context/FinancialProvider.tsx`, com reducer em `reducer.ts`, actions em `actions.ts` e tipos em `context/types.ts`. Todo o plano do usuário fica num único objeto `UserPlan`: income, expenses, goals, forecast, forecastConfig, creditCardAccounts, expenseCategories.
- **Load:** no mount, `storage.loadUserPlan` (`context/storage.ts`) faz `GET /api/plan/` e depois `migrateUserPlan` + `isValidUserPlan`, terminando em `LOAD_SUCCESS`.
- **Save:** um auto-save com debounce de 1s após qualquer mudança faz `POST /api/plan/` com o **UserPlan inteiro**. No backend (`backend/src/routes/plan.ts`), numa transação, ele faz upsert de `user_plans`/`forecast_configs` e **apaga e reinsere todas as tabelas filhas**.
  - Consequência: nunca crie uma FK com `ON DELETE CASCADE` apontando para `goals`, `expenses` ou outras tabelas filhas. Os dados dependentes seriam apagados a cada save.
  - Coluna nova numa tabela filha precisa ser adicionada nos INSERTs hard-coded de `plan.ts`. O GET usa `SELECT *`. Booleanos são convertidos manualmente; veja o helper perto do topo de `plan.ts`.
  - O budget (`UserPlan.budget`) vive em `budget_settings`, `budget_amount_history` e `budget_period_closures`, gravadas no mesmo POST. Elas **não** têm FK para `goals` (os fechamentos guardam o `goalId` num JSON). `ensureBudgetSchema()` em `plan.ts` cria colunas/tabelas na primeira requisição; o mapeamento puro está em `backend/src/domain/budgetMapping.ts`.
- **Carro e Wishlist** têm rotas próprias (`/api/car`, `/api/wishlist`) com CRUD por item e não fazem parte do `UserPlan`.
- **Tipos duplicados:** `frontend/types/index.ts` e `backend/src/types/index.ts` são cópias mantidas à mão. **Altere os dois juntos.** O mesmo vale para `frontend/utils/categoryRules.ts` e `backend/src/domain/categoryRules.ts`.
- **Lógica de negócio** (pura, em `frontend/utils/`):
  - `expenseOperations.ts`: `getExpensesForMonth` e `calculateMonthlyAmount`, que viram a média mensal das recorrentes;
  - `forecastCalculator.ts`: `generateForecast`, a projeção multi-mês;
  - `creditCardRules.ts`: fechamento e vencimento de fatura;
  - `installmentCalculator.ts`: parcelas e ciclos sobrepostos;
  - `dataImport.ts`/`dataExport.ts` (JSON/CSV; o CSV exportado é pt-BR e o import também aceita os arquivos antigos em inglês);
  - `format.ts`: `formatCurrency` (fixo em BRL), `CURRENCY_SYMBOL`, `formatDate` e rótulos;
  - `dates.ts`: helpers de data **local** (`parseLocalDate`, `todayLocalISO`, `clampDay`, `addMonthsClamped`...). Use sempre estes em vez de `new Date("YYYY-MM-DD")`;
  - `budget/`: engine do Budget Mensal, independente do forecast. `period.ts` (períodos com dia de virada), `occurrences.ts` (ocorrências reais por dia), `goalReservation.ts` (Z das metas), `budgetCalculator.ts` (`computeBudgetStatus`, histórico, viabilidade, fechamento), `alerts.ts` (cruzamento de 80%/100%), `planUpdates.ts` (transições puras usadas pelo reducer), `normalize.ts` (defaults/backfill). **Nenhuma função lê o relógio**: `today` é sempre parâmetro. UI em `frontend/components/budget/`, estado em `frontend/hooks/useBudget.ts`.
- **Documentação de regras:** `docs/*_LOGIC.md` (despesas, forecast, metas, import/export, renda) e `docs/BUDGET_LOGIC.md` (budget mensal).

## Datas — cuidado

- Datas de negócio são **strings**: `YYYY-MM-DD` (`dueDate`, `startDate`, `purchaseDate`) e `YYYY-MM` (`installmentStartMonth`, `forecastConfig.startDate`). No MySQL elas ficam como `VARCHAR`.
- O usuário está em **UTC-3**. `new Date("YYYY-MM-DD")` é interpretado como meia-noite **UTC**; lido com `getDate()`/`getMonth()` locais, vira o dia anterior. `new Date().toISOString().split("T")[0]` dá "amanhã" depois das 21h.
  - Use os helpers de data local (`frontend/utils/dates.ts`). `parseDateSafe` de `utils/dateFormatting.ts` delega para `parseLocalDate`.
- No backend, `created_at`/`updated_at` passam por `toDbDate` (`backend/src/db/dates.ts`), que grava DATETIME em hora local. Não "corrija" isso para UTC: veja o commit `bd796c3`.

## Banco e migrações

- O schema completo fica em `backend/database/schema.sql` e as migrações incrementais em `backend/database/migrations/`. **Não há controle de versão de migrações**, então os arquivos precisam ser seguros para rodar de novo.
- MySQL 8 **não** tem `ADD COLUMN IF NOT EXISTS`. Use uma checagem em `information_schema` ou o padrão "ensure on request" de `ensureCategoriesTable` em `plan.ts`.
- Ao criar uma migração, atualize também o `schema.sql`.
- Dumps e exports com dados pessoais ficam em `backend/database/seeds/local/`, que é git-ignored. `backend/.env` e `frontend/.env.local` contêm segredos: **nunca commitar**.

## Convenções

- **Idioma:** UI só em **pt-BR** (EN/TH e o `LanguageContext` foram removidos na Sprint 2). Escreva textos pt-BR literais; não crie chaves `t()` nem ternários de idioma. Rótulos de enums ficam em `utils/labels.ts` e `utils/format.ts`.
- **Commits:** Conventional Commits em pt-BR, por exemplo `feat(budget): adiciona engine de períodos`, `fix(frontend): ...`, `refactor: ...`.
- **Estilo:** Tailwind v4 com tokens no formato shadcn em `app/globals.css` (`bg-background`, `bg-card`, `text-muted-foreground`, `border-border`, `bg-primary`, mais os de domínio `success/warning/danger/income/expense`). O dark mode usa `@custom-variant dark` com a classe `.dark`; o tema (`light|dark|system`) vem de `context/ThemeContext.tsx`. Paleta slate/indigo, texto mínimo `text-xs`, números com `tabular-nums`.
- **Estrutura de componentes (frontend):**
  - `components/ui/`: primitivos shadcn/Radix (não editar sem motivo);
  - `components/common/`: compartilhados e sem regra de negócio (`PageHeader`, `StatCard`, `EmptyState`, `FormModal`, `Field`/`MoneyInput`/`DateField`, `ConfirmDialog`/`useConfirm`, `SegmentedControl`, `RowActions`, `SectionCard`, `MoneyText`, `PageSkeleton`);
  - `components/layout/`: shell (sidebar colapsável, topbar). Itens da navegação em `components/layout/nav-items.ts`;
  - `components/<feature>/` (+ `hooks/`): um conjunto por página (`expenses`, `settings`, `car`, `income`, `goals`, `wishlist`, `dashboard`). Cada `page.tsx` só orquestra.
- **Padrões de UI:**
  - criar/editar em **`FormModal`** (modal central, nunca formulário inline no topo);
  - confirmações com **`await useConfirm()({ title, tone: "danger" })`**;
  - mutações assíncronas com **`withToast(promise, { loading, success, error })`** (`lib/toast.ts`, sobre o sonner) e `try/catch` para manter o modal aberto em erro;
  - todo input dentro de **`Field`** (`label`/`htmlFor` via `useId`); estados de loading (`PageSkeleton`), vazio (`EmptyState`) e erro (toast ou alerta com "Tentar novamente").
- **Não use** `window.alert`/`confirm`/`prompt`: use `useConfirm()` e toasts.
- Desktop-first, mas o layout precisa funcionar a partir de 390px sem scroll horizontal.

## Trabalho planejado (sprints)

O roadmap ativo está em **`docs/sprints/`**. Leia `docs/sprints/README.md` antes de começar qualquer fase. Ele explica o protocolo de progresso que os agentes usam para se comunicar.

- `docs/sprints/SPRINT_01_BUDGET.md`: Budget Mensal com dia de virada e integração com Metas.
- `docs/sprints/SPRINT_02_UI_UX.md`: redesign UI/UX (shadcn, sidebar, pt-BR, refactor das páginas gigantes).

Ao pegar uma fase: marque 🟡 na tabela de status, trabalhe numa branch própria, registre decisões e desvios no **Log do agente** e preencha o **Handoff** ao terminar.
