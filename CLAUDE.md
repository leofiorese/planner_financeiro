# CLAUDE.md

Guia para agentes (Claude Code e afins) trabalharem neste repositório.

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

O frontend ainda **não tem test runner**: `frontend/tests/forecastCalculator.test.ts` é um script de console sem asserts. A Sprint 1 (fase 1.0) adiciona `npm test` com `tsx --test`, no mesmo padrão do backend.

Antes de dar uma tarefa por concluída, rode `typecheck` + `lint` + `build` no frontend e `typecheck` + `test` no backend.

## Arquitetura e fluxo de dados

- **Estado global:** `frontend/context/FinancialProvider.tsx`, com reducer em `reducer.ts`, actions em `actions.ts` e tipos em `context/types.ts`. Todo o plano do usuário fica num único objeto `UserPlan`: income, expenses, goals, forecast, forecastConfig, creditCardAccounts, expenseCategories.
- **Load:** no mount, `storage.loadUserPlan` (`context/storage.ts`) faz `GET /api/plan/` e depois `migrateUserPlan` + `isValidUserPlan`, terminando em `LOAD_SUCCESS`.
- **Save:** um auto-save com debounce de 1s após qualquer mudança faz `POST /api/plan/` com o **UserPlan inteiro**. No backend (`backend/src/routes/plan.ts`), numa transação, ele faz upsert de `user_plans`/`forecast_configs` e **apaga e reinsere todas as tabelas filhas**.
  - Consequência: nunca crie uma FK com `ON DELETE CASCADE` apontando para `goals`, `expenses` ou outras tabelas filhas. Os dados dependentes seriam apagados a cada save.
  - Coluna nova numa tabela filha precisa ser adicionada nos INSERTs hard-coded de `plan.ts`. O GET usa `SELECT *`. Booleanos são convertidos manualmente; veja o helper perto do topo de `plan.ts`.
- **Carro e Wishlist** têm rotas próprias (`/api/car`, `/api/wishlist`) com CRUD por item e não fazem parte do `UserPlan`.
- **Tipos duplicados:** `frontend/types/index.ts` e `backend/src/types/index.ts` são cópias mantidas à mão. **Altere os dois juntos.** O mesmo vale para `frontend/utils/categoryRules.ts` e `backend/src/domain/categoryRules.ts`.
- **Lógica de negócio** (pura, em `frontend/utils/`):
  - `expenseOperations.ts`: `getExpensesForMonth` e `calculateMonthlyAmount`, que viram a média mensal das recorrentes;
  - `forecastCalculator.ts`: `generateForecast`, a projeção multi-mês;
  - `creditCardRules.ts`: fechamento e vencimento de fatura;
  - `installmentCalculator.ts`: parcelas e ciclos sobrepostos;
  - `suggestionGenerator.ts`, `dataImport.ts`/`dataExport.ts` (JSON/CSV).
- **Documentação de regras:** `docs/*_LOGIC.md` (despesas, forecast, metas, import/export, renda, sugestões) e `docs/BUDGET_LOGIC.md` (budget mensal).

## Datas — cuidado

- Datas de negócio são **strings**: `YYYY-MM-DD` (`dueDate`, `startDate`, `purchaseDate`) e `YYYY-MM` (`installmentStartMonth`, `forecastConfig.startDate`). No MySQL elas ficam como `VARCHAR`.
- O usuário está em **UTC-3**. `new Date("YYYY-MM-DD")` é interpretado como meia-noite **UTC**; lido com `getDate()`/`getMonth()` locais, vira o dia anterior. `new Date().toISOString().split("T")[0]` dá "amanhã" depois das 21h.
  - Use os helpers de data local (`frontend/utils/dates.ts`, criado na Sprint 1 fase 1.0). Até lá, use o `parseDateSafe` de `utils/dateFormatting.ts`.
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
