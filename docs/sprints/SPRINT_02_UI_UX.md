# Sprint 2 — Redesign UI/UX (polir + refresh, desktop-first)

> **Objetivo:** deixar o app mais responsivo, consistente e amigável sem perder a identidade slate/indigo. Isso inclui:
> - corrigir os bugs da fundação visual (tema, fonte, animações);
> - adotar shadcn/ui + Radix, sidebar colapsável e modais padronizados;
> - deixar a UI só em pt-BR;
> - quebrar as páginas gigantes em componentes;
> - **remover o que é inútil ou redundante**.
>
> **Pré-requisito:** Sprint 1 concluída. Os componentes de `components/budget/` são reestilizados aqui, sem mudar a lógica.
>
> **Protocolo de progresso:** [`README.md`](./README.md).

---

## Sumário

- [Decisões do produto](#decisões-do-produto)
- [Diagnóstico de partida](#diagnóstico-de-partida)
- [Visão geral das fases](#visão-geral-das-fases)
- [Fase 2.0 — Fundação visual](#fase-20--fundação-visual)
- [Fase 2.1 — Somente pt-BR](#fase-21--somente-pt-br)
- [Fase 2.2 — App shell (sidebar)](#fase-22--app-shell-sidebar)
- [Fase 2.3 — Componentes compartilhados](#fase-23--componentes-compartilhados)
- [Fase 2.4 — Refactor e redesign das páginas](#fase-24--refactor-e-redesign-das-páginas)
- [Fase 2.5 — Limpeza](#fase-25--limpeza)
- [Fase 2.6 — Acessibilidade e responsividade](#fase-26--acessibilidade-e-responsividade)
- [Fase 2.7 — QA final e documentação](#fase-27--qa-final-e-documentação)
- [Guia visual](#guia-visual)
- [📋 Progresso](#-progresso)

---

## Decisões do produto

| # | Tema | Decisão |
|---|---|---|
| U1 | Dispositivo | **Desktop-first**. O mobile precisa funcionar bem (≥ 390px, sem scroll horizontal), mas não é o foco |
| U2 | Nível visual | **Polir + refresh**: mantém a identidade slate/indigo, com tokens novos, hierarquia, tipografia maior e componentes novos |
| U3 | Componentes | **shadcn/ui + Radix** em `components/ui/`, **sonner** (já entra na Sprint 1) e **lucide-react** no lugar de SVG inline e emoji em botões |
| U4 | Idioma | **Só pt-BR**: remover EN/TH, `LanguageContext` e `LanguageSelector` |
| U5 | Formulários | **Modal central** padronizado (`FormModal`) para criar e editar |
| U6 | Navegação | **Sidebar lateral colapsável** no desktop e Sheet (drawer) no mobile |
| U7 | Quick-add global | **Não** |
| U8 | Refactor | Quebrar as páginas gigantes **junto com o redesign**, otimizando e simplificando o que é inútil ou redundante |

---

## Diagnóstico de partida

Resumo do audit de 20/11/2026. As linhas se referem ao código antes da Sprint 1 e podem ter deslocado.

**Bugs de fundação**
- Dark mode quebrado. O Tailwind v4 usa `prefers-color-scheme` para `dark:` porque não há `@custom-variant dark`, enquanto o toggle só troca a classe `.dark` (que alimenta `.surface-card`, `body` e inputs). Quando o SO e o app discordam, a tela fica mista.
- O tema começa como `"dark"` e é aplicado depois do mount, o que causa flash. Não existe a opção "Sistema".
- A Geist é carregada, mas `font-sans` não aponta para ela (`layout.tsx:14-22,47`).
- `animate-in`, `fade-in`, `slide-in-*` e `zoom-in-95` são usados em 8 arquivos, mas o plugin não está instalado.
- Regras CSS fora de layer (`globals.css:134-144`) sobrescrevem as utilities `bg-*`/`focus:ring-*` dos inputs.
- Classes inexistentes: `bg-slate-750`, `dark:bg-slate-850`, `py-0.2`.

**Estrutura**
- `expenses/page.tsx` tem 2148 linhas e 21 `useState`; `settings` tem 1546 e 28; `car` tem 1541 e 18; o dashboard tem 810.
- Os formulários inline ficam no topo da página. Editar um item no fim da lista salta para o topo, e o botão "Adicionar" alterna o formulário (fecha a edição).

**Feedback e erros**
- Não há toasts.
- `window.confirm`/`alert` aparecem em todas as páginas.
- O erro do Carro é setado e nunca exibido. Os saves do Carro e da Wishlist não têm catch.

**i18n**
- Mistura de `t()`, ternários `isEn` e pt fixo. A chave crua `expenses.totalInvoice` aparece na tela.
- `<html lang="en">`.

**Navegação**
- Não há item "Dashboard".
- No mobile não há como trocar de idioma (irrelevante depois da 2.1).
- O drawer não tem foco preso, Esc nem scroll lock.

**Mobile e acessibilidade**
- Inputs de 12px fazem o iOS dar zoom ao focar.
- Alvos de toque de 12 a 28px.
- Nenhum `htmlFor`.
- Modais sem `role="dialog"`.
- `<div>` clicáveis.
- O DatePicker fica fora do Tab.
- `text-[9px]`/`[10px]`/`[11px]` aparecem em mais de 150 lugares.

**Desempenho**
- `generateForecast` roda várias vezes por render no dashboard e uma vez por meta por render em Metas.

---

## Visão geral das fases

| Fase | Nome | Depende de | Tamanho |
|---|---|---|---|
| 2.0 Fundação visual | 🔍 | Claude (agente Sprint 2) | `feat/sprint-2-ui-ux` | 2026-11-20 | 2026-11-20 |
| 2.1 Somente pt-BR | 🔍 | Claude (agente Sprint 2) | `feat/sprint-2-ui-ux` | 2026-11-20 | 2026-11-20 |
| 2.2 App shell | 🔍 | Claude (agente Sprint 2) | `feat/sprint-2-ui-ux` | 2026-11-20 | 2026-11-20 |
| 2.3 Componentes compartilhados | 🔍 | Claude (agente Sprint 2) | `feat/sprint-2-ui-ux` | 2026-11-20 | 2026-11-20 |
| 2.4 | Refactor e redesign das páginas (sub-fases por página) | 2.1, 2.2, 2.3 | GG |
| 2.5 | Limpeza (remover o inútil e o redundante) | durante a 2.4, fechamento depois | M |
| 2.6 | Acessibilidade e responsividade | 2.4 | M |
| 2.7 | QA final e docs | todas | P |

A 2.1, a 2.2 e a 2.3 podem rodar em paralelo depois da 2.0, se forem feitas por agentes diferentes em arquivos diferentes. Atenção: a 2.1 toca quase todos os arquivos. Prefira fazer a **2.1 antes** da 2.2 e da 2.3 para evitar conflitos.

---

## Fase 2.0 — Fundação visual

- [x] **Dark mode:** em `app/globals.css`, adicionar `@custom-variant dark (&:where(.dark, .dark *));`.
- [x] **Tokens:** migrar as variáveis RGB de `:root`/`.dark` (`globals.css:4-76`) para o formato do shadcn (oklch ou hsl) e registrá-las em `@theme inline`, para que existam como utilities: `bg-background`, `bg-card`, `text-muted-foreground`, `border-border`, `bg-primary`, `ring-ring`, mais os tokens de domínio `--success`, `--warning`, `--danger`, `--income`, `--expense`. Manter a paleta slate/indigo como base.
- [x] **Fonte:** em `@theme`, `--font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, ...`, e o mesmo para mono. Usar `tabular-nums` nos valores monetários.
- [x] **Layers:** mover as regras de `input, select, textarea` e `:focus-visible` (`globals.css:134-144`) para `@layer base`.
- [x] **Animações:** instalar `tw-animate-css` e fazer `@import "tw-animate-css";`, o que faz os `animate-in` existentes passarem a funcionar.
- [x] **Tema:** `context/ThemeContext.tsx` com os modos `light | dark | system` (default `system`). Script inline no `<head>` (`app/layout.tsx`) que lê o localStorage (com try/catch) e aplica a classe antes da hidratação, sem flash.
- [x] **shadcn:** `npx shadcn@latest init` (Tailwind v4, alias `@/components/ui`, base color slate). Adicionar: `button input label textarea select checkbox switch dialog alert-dialog sheet tabs toggle-group dropdown-menu popover tooltip badge card progress skeleton table separator scroll-area sonner calendar`.
  - Instalar `lucide-react`.
  - O Toaster da Sprint 1 passa a usar o wrapper `components/ui/sonner.tsx`.
- [x] **Tipografia e densidade** (ver [Guia visual](#guia-visual)): texto base `text-sm` (14px), meta `text-xs` (12px) como mínimo, inputs com `text-base md:text-sm` para evitar o zoom do iOS, botões com `h-9` no desktop e `h-11` em telas touch.
- [x] Remover as classes inválidas (`bg-slate-750`, `dark:bg-slate-850`, `py-0.2`).

**Aceite:**
- Alternar claro/escuro/sistema muda **tudo** de forma consistente, inclusive com o SO no modo oposto.
- Recarregar não pisca o tema errado.
- O DevTools mostra a Geist aplicada.
- `npm run build` passa.

---

## Fase 2.1 — Somente pt-BR

- [x] Substituir todos os `t("chave")` pelo texto pt-BR literal correspondente, tirado do dicionário `pt` em `context/LanguageContext.tsx:792+`.
  - Interpolações `{{param}}` viram template strings.
  - Dica: gere um script auxiliar temporário (no scratchpad, **não commitar**) que lista os pares chave → texto pt.
- [x] Remover os ternários `isEn ? ... : ...` e `language === "pt" ? ... : ...`, mantendo o ramo pt.
- [x] Remover `context/LanguageContext.tsx`, `components/LanguageSelector.tsx`, o `LanguageProvider` do layout, o `getDateLocale(language)` (`utils/dateFormatting.ts:6`, que passa a ser fixo `pt-BR`) e as funções `*WithTranslations` que perderem o sentido.
- [x] `<html lang="pt-BR">`. `metadata` em pt-BR (título "Planner Financeiro").
- [x] Corrigir a chave crua `expenses.totalInvoice` (`expenses/page.tsx:963`).
- [x] `components/CategoryIcon.tsx` `PriorityBadge`: labels pt.
- [ ] `utils/categoryRules.ts`: o campo `nameEn` de `ExpenseCategoryConfig` deixa de ser usado. **Não** remova a coluna do banco nesta fase; registre no Log como candidato.
- [x] Moeda: **manter** `CurrencyContext` (BRL/USD/EUR). Padronizar `formatCurrency` com 2 casas fixas para valores com centavos, ou sempre 2 casas; decidir e registrar no Log.

**Aceite:**
- `grep -rn "useLanguage\|isEn\|language ===" frontend/app frontend/components frontend/context frontend/utils` vazio.
- Nenhum texto em inglês visível na UI, exceto nomes próprios.

---

## Fase 2.2 — App shell (sidebar)

- [x] `components/layout/AppSidebar.tsx`:
  - Grupos e itens (ícones lucide):
    - **Visão geral:** Dashboard (`/`), Budget (`/budget`)
    - **Movimentações:** Receitas (`/income`), Despesas (`/expenses`)
    - **Planejamento:** Metas (`/goals`), Wishlist (`/wishlist`)
    - **Patrimônio:** Carro (`/car`)
    - **Rodapé:** Configurações (`/settings`), seletor de tema
  - Colapsável: 256px ↔ 64px (só ícones, com tooltip). O estado fica no localStorage `fp-sidebar-collapsed` (com try/catch). Atalho `Ctrl+B` (opcional).
  - Item ativo com fundo `primary/10`, texto `primary` e uma barra lateral.
  - O budget aparece compacto no rodapé ou no topo da sidebar (mini `BudgetProgress` com "65%"), substituindo o indicador do header da Sprint 1. Avaliar se o indicador fica na sidebar **ou** na topbar, não nos dois.
  - Pode-se usar o bloco `sidebar` do shadcn, se ele simplificar; registrar a escolha no Log.
- [x] `components/layout/Topbar.tsx`: título/breadcrumb da página atual, ações contextuais (via slot ou prop do `PageHeader`) e o botão de menu no mobile.
- [x] Mobile (< lg): a sidebar vira um `Sheet` lateral, que já resolve foco, Esc e scroll lock.
- [x] `app/layout.tsx`: grid `sidebar | conteúdo`. `main` com `max-w-screen-2xl` e padding consistente. Remove o header atual.
- [x] Remover `components/Navigation.tsx`, `components/SettingsHeaderButton.tsx` e o `ThemeToggle` isolado (vira parte da sidebar).

**Aceite:**
- Todas as rotas acessíveis pela sidebar, com o colapso persistindo.
- No mobile, o Sheet abre e fecha com o teclado.
- Nenhum layout shift ao colapsar.

---

## Fase 2.3 — Componentes compartilhados

Pasta `components/common/`. Cada componente tipado e sem lógica de negócio.

| Componente | Substitui | Notas |
|---|---|---|
| `PageHeader` | 7 headers copiados (`page.tsx:172`, `expenses:934`, `income:185`, `goals:227`, `wishlist:211`, `car:404`, `settings:537`) | `title`, `description`, `actions`, `children` (KPIs). Sempre `flex-wrap` |
| `StatCard` | KPI cards (`page.tsx:335-449`, `goals:282-322`, `wishlist:261-335`, `car:511-559`) | `label`, `value`, `hint`, `trend`, `icon`, `tone`. `min-w-0` + `truncate`, valor com `tabular-nums` |
| `EmptyState` | `expenses:1942`, `income:400`, `goals:520`, `wishlist:391`, `car:591,967,1229,1337` | `icon`, `title`, `description`, `action`, `variant="dashed"` |
| `FormModal` | os formulários inline e os modais ad-hoc (`wishlist:555`, `car:1382`) | shadcn `Dialog`: título, descrição, corpo com `ScrollArea` (`max-h-[85vh]`), footer fixo (Cancelar / Salvar com loading), `onSubmit`, `size="md" \| "lg"`. Fecha com Esc, prende o foco e restaura o foco no gatilho |
| `Field` | dezenas de label+input | `label`, `htmlFor` (gera `id` com `useId`), `hint`, `error`, `required`; wrappers `MoneyInput`, `NumberInput` e `DateField` (o `DatePicker` existente acessível ou o `Calendar` do shadcn; decidir na 2.4) |
| `ConfirmDialog` + `useConfirm()` | todos os `window.confirm`/`alert` (`settings:150,167,178,290`, `expenses:436`, `income:107`, `goals:154`, `car:348`, `wishlist:144`) | API promise: `await confirm({ title, description, confirmText, tone: "danger" })` |
| `SegmentedControl` | `expenses:1009,1510`, `AskAIButton:216`, `ExpenseCategoryChart:207`, `GoalProgressChart`, `car:429` | `ToggleGroup` do shadcn com `aria-pressed` |
| `RowActions` | botões de editar/excluir copiados (`expenses:907-924`, `income:510-529`, `goals:583-600`, `wishlist:458-495`, `car:1030-1051,1284-1305`) | ícones lucide (Pencil/Trash2) com `aria-label`, alvo ≥ 36px, ou `DropdownMenu` "⋯" em linhas densas |
| `LoadingState` / `PageSkeleton` | spinners (`page.tsx:158`, `wishlist:197`, `car:392`) | skeletons por layout de página |
| `MoneyText` | `formatCurrency` espalhado | `value`, `tone="income" \| "expense" \| "auto"`, `compact` |
| `SectionCard` | `surface-card` + título | Card do shadcn com header e ações |

- [x] **Padrão de erro:** toda mutação assíncrona usa `try { await ...; toast.success(...) } catch (e) { toast.error("Não foi possível salvar ...") }`. Criar o helper `withToast(promise, { loading, success, error })` sobre o `toast.promise` do sonner.
- [x] **Utils deduplicados:** `utils/format.ts` com `formatDate` (substitui `fmtDate` em `wishlist:21`, `car:385`), `getFrequencyLabel` (substitui `expenses:476`, `income:130`) e `formatPeriod`.

**Aceite:** os componentes têm um exemplo de uso numa página real (adotados na 2.4) e o typecheck passa.

---

## Fase 2.4 — Refactor e redesign das páginas

Cada página vira um `page.tsx` enxuto (orquestração, idealmente < 200 linhas) mais `components/<feature>/` e hooks em `components/<feature>/hooks/` ou `hooks/`. **Comportamento e regras de negócio não mudam**: só estrutura, UI e a remoção de redundâncias (2.5). Faça **uma sub-fase por PR**.

### 2.4.a — Despesas (`app/expenses/page.tsx`, 2148 linhas)

- [x] Estrutura:
  ```
  components/expenses/
    ExpensesHeader.tsx        # PageHeader + StatCards (total do mês, fatura atual) + botão "Nova despesa"
    ExpensesToolbar.tsx       # SegmentedControl Lista/Calendário, busca, botão Filtros, ordenar, agrupar
    ExpenseFilters.tsx        # Popover (desktop) / Sheet (mobile) com os 7 filtros + chips ativos removíveis
    ExpenseList.tsx           # agrupamento + paginação; ExpenseRow.tsx com RowActions
    ExpenseCalendar.tsx       # grid de 12 meses; itens como <button>
    ExpenseFormModal.tsx      # FormModal: método de pagamento, cartão, Única/Recorrente/Parcelada, datas (inclui purchaseDate)
    hooks/useExpenseFilters.ts
    hooks/useExpenseForm.ts   # estado do form, defaults únicos (hoje há 4 cópias: :203, :390, :449, :976), validação, submit
  ```
- [x] O formulário sai do topo e vai para o modal. "Nova despesa" sempre abre vazio; "Editar" abre preenchido (corrige o toggle e o scroll quebrados).
- [ ] `BudgetBanner` (Sprint 1) reestilizado com tokens.
- [x] Remover os ternários de idioma restantes e o `max-w-7xl` exclusivo da página (usa o container do layout).

### 2.4.b — Configurações (`app/settings/page.tsx`, 1546 linhas)

- [ ] Layout com navegação lateral interna (desktop) ou `Tabs` (mobile) entre as seções: **Budget**, **Categorias**, **Cartões**, **Moeda**, **Dados (importar/exportar)**, **Aparência (tema)**. Um arquivo por seção em `components/settings/`.
- [x] Categorias: o formulário de adicionar/editar vai para o modal. O emoji picker vira um `Popover` (com colisão, sem estourar a borda). O reordenamento ↑↓ ganha alvos maiores (ou drag-and-drop, se for barato; registrar).
- [x] Cartões: o formulário vai para o modal. O simulador de fatura passa a reusar `calculateCreditCardDueDate` / `calculateCreditCardBillingMonth` de `utils/creditCardRules.ts`, removendo a cópia em `settings:325-360`.
- [x] Dados: a drop zone vira um `<button>`/`<label>` acessível com um `<input type="file">` real. O status da importação vira toast + resumo inline.

### 2.4.c — Carro (`app/car/page.tsx`, 1541 linhas)

- [ ] `components/car/`: `VehicleSwitcher`, `MaintenanceAlerts`, `CarStats`, `FuelTab`, `MaintenanceTab`, `CarExpensesTab`, `VehicleFormModal`, `FuelLogFormModal`, `MaintenanceFormModal`.
- [ ] `Tabs` do shadcn com `role=tab`.
- [ ] Tabela de combustível: `Table` do shadcn no desktop; abaixo de `md`, uma lista de cards (sem os 9 colunas com scroll horizontal).
- [ ] Tipar os formulários (remover `any` e `/* eslint-disable */` das linhas 1-2). Exibir os erros (o `error` hoje nunca é renderizado) e envolver os saves em try/catch com toast.
- [ ] Sparkline e barras próprias (`car:125-193`): substituir por Recharts responsivo ou manter com o SVG em `viewBox` responsivo (sem `width=220` fixo).

### 2.4.d — Receitas, Metas, Wishlist

- [ ] **Receitas:** `PageHeader` + `StatCard` + `IncomeList` + `IncomeFormModal`. Remover o `calculateMonthlyAmount` local (`income:151`) e usar o de `utils/`. O erro do contexto vira toast (hoje aparece no rodapé, longe do formulário).
- [ ] **Metas:** `GoalsHeader`, `GoalFilters`, `GoalCard`, `GoalFormModal` (com o toggle de reserva do budget da Sprint 1). **Memoizar o forecast** uma vez por página (`useMemo`) e passar para os cards (hoje `getGoalForecast` roda 1× por meta por render, `goals:179-198, 547`).
- [ ] **Wishlist:** `WishlistGrid`, `WishlistCard`, `WishlistFormModal`. Corrigir o backdrop que não reseta `editingItem` (`wishlist:558`), o "+" duplicado (`:254`) e os erros silenciosos (`:81,130,137,145`).

### 2.4.e — Dashboard (`app/page.tsx`, 810 linhas)

- [ ] Ordem: `PageHeader` → **`BudgetCard`** (Sprint 1, reestilizado) → KPIs (`StatCard`, grid `2 / 4` com `min-w-0`) → gráficos (Receita × Despesas e Categorias) → próximas metas + maiores meses → transações recentes → sugestões.
- [ ] `generateForecast` calculado **uma vez** em `useMemo` (hoje são 2 chamadas na página `:27-52, :73-98`, mais as dos charts) e passado por props aos charts.
- [ ] Remover a pill "Plano Ativo" (`:177`). O onboarding de primeiro uso (`:191-288`) passa a usar `EmptyState`/cards com tokens.
- [ ] Charts (`components/charts/*`): `ResponsiveContainer`, eixo Y com moeda compacta ("R$ 12 mil"), tooltips com tokens e controles com `flex-wrap`.

### 2.4.f — Budget (`app/budget/page.tsx` e `components/budget/*`)

- [ ] Reestilizar com os tokens, `StatCard` e `SectionCard`. `PeriodClosureModal` passa a usar o `FormModal`/`Dialog`. A lógica não muda.

**Aceite (cada sub-fase):**
- Paridade funcional, com o roteiro manual da página registrado no Log.
- `page.tsx` enxuto.
- Nenhum `window.confirm`.
- Typecheck, lint e build passando.

---

## Fase 2.5 — Limpeza

Conduzida **durante** a 2.4 e fechada aqui. Cada item removido é registrado no Log.

**Remover (morto ou redundante, confirmado no audit):**
- [ ] `getEffectiveBillingMonth` e `isExpenseBilledInMonth` (`utils/creditCardRules.ts:122-193`): sem uso e com lógica inconsistente.
- [ ] `isExpenseActiveInMonth` (`utils/forecastCalculator.ts:200-306`): exportado e não usado por `generateForecast`. Confirmar com grep.
- [ ] `context/storage.ts`: o fallback de leitura do localStorage `finance-planner-user-plan`, que nunca é escrito como fonte, e a chave `APP_SETTINGS` (`:18`). Revisar se o "backup" escrito no save tem algum uso real; se não tiver, remover.
- [ ] `storage.deleteUserPlan` (`:159-176`): chama `DELETE /api/plan`, que retorna 405.
- [ ] Checkbox "mostrar projeção" sem efeito (`components/charts/IncomeVsExpensesChart.tsx:41,199-208`): remover ou implementar. Remover é o padrão.
- [ ] Comentário "THESIS/OWN-WORLD..." em `app/layout.tsx:49-56`.
- [ ] Ícone de "+" duplicado com o texto "+" nos botões (`wishlist:254`, `car:465,820,1088`).
- [ ] O `calculateMonthlyAmount` duplicado (`income/page.tsx:151`, `AskAIButton.tsx:85`) passa a usar o de `utils/expenseOperations.ts`.
- [ ] `AskAIButton`: "R$" fixo (`:124-137`) vira `formatCurrency`.

**Candidatos: perguntar ao usuário antes de remover** (listar em Bloqueios):
- `AskAIButton` (gera um prompt para copiar para um LLM): manter, simplificar ou remover?
- `ExpenseCategoryChart` com 4 visualizações (donut, pie, bar, treemap): reduzir para 1–2?
- `GoalProgressChart` com 3 visualizações: reduzir?
- "Top meses de despesa" e "Sugestões inteligentes" no dashboard: ainda são úteis?
- Coluna `nameEn` das categorias (sem uso após a 2.1).
- Seção de moeda: o usuário usa algo além de BRL?

**Aceite:** os itens confirmados foram removidos, os candidatos foram respondidos pelo usuário, e build e lint passam.

---

## Fase 2.6 — Acessibilidade e responsividade

- [ ] Todo input tem um `<label htmlFor>` (via `Field`). Busca e selects de ordenação com label (visível ou `sr-only`).
- [ ] Controles de estado com semântica: `ToggleGroup` com `aria-pressed`, `Tabs` com `role=tab`/`aria-selected`, `Switch` com `role=switch`.
- [ ] Nenhum `<div onClick>` interativo (`expenses:1831` no calendário, `settings:1516` na drop zone). Usar `<button>`.
- [ ] DatePicker: remover o `tabIndex={-1}` (`components/DatePicker.tsx:361`) e ter navegação por teclado no grid, ou migrar para o `Calendar` do shadcn (react-day-picker) com input mascarado.
- [ ] Contraste AA:
  - sem `text-[9px]`/`text-[10px]`;
  - `text-[11px]` só em badges;
  - meta-texto no mínimo `text-muted-foreground` com contraste ≥ 4.5:1 nos dois temas.
- [ ] Toasts do sonner (já têm `aria-live`). Erros de formulário com `role="alert"`.
- [ ] Gráficos: `aria-label` com um resumo textual, ou uma tabela `sr-only` com os dados.
- [ ] Popovers e dropdowns via Radix, com colisão: emoji picker, DatePicker e MonthPicker sem estourar a borda direita.
- [ ] **Checagem de larguras:** 1440, 1280, 1024, 768 e 390px em todas as páginas, sem scroll horizontal no `body`. Registrar no Log uma tabela página × largura com ✅/❌.
- [ ] Alvos de toque: ≥ 36px no desktop e ≥ 44px em `pointer: coarse`.
- [ ] `prefers-reduced-motion`: desativar as animações não essenciais.

**Aceite:** a tabela de larguras está toda ✅ e o Lighthouse Accessibility ≥ 95 no Dashboard, em Despesas e no Budget (registrar os números).

---

## Fase 2.7 — QA final e documentação

- [ ] README:
  - remover o aviso "Desktop-First / mobile WIP" e as menções a EN/TH e Thai;
  - atualizar a seção de features (Budget, sidebar), o tech stack (shadcn/ui, Radix, sonner, lucide) e a estrutura de pastas;
  - corrigir as moedas listadas: hoje são BRL/USD/EUR, não 12.
- [ ] Regerar os screenshots em `docs/assets/` (dashboard, budget, despesas), nos temas claro e escuro.
- [ ] `CLAUDE.md`: estrutura `components/ui`, `components/common`, `components/<feature>`, padrões (FormModal, useConfirm, withToast, Field) e regra de pt-BR.
- [ ] `docs/PRODUCT.md` / `docs/PRD.md`: atualizar se mencionarem navegação ou idiomas.
- [ ] Rodada final de QA, com o roteiro do Log: todas as páginas, claro/escuro/sistema, larguras da 2.6, CRUD em cada entidade e importar/exportar.

---

## Guia visual

**Identidade**
- Slate como neutro e indigo como `primary`.
- Semânticos: emerald para receita e ok, rose para despesa e estouro, amber para alerta.

**Tipografia** (Geist)

| Uso | Classe |
|---|---|
| Título da página | `text-2xl font-semibold tracking-tight` |
| Título de seção/card | `text-base font-semibold` |
| Corpo, inputs (desktop), tabelas | `text-sm` |
| Meta, labels secundárias, badges | `text-xs` (mínimo) |
| KPI | `text-2xl font-semibold tabular-nums` |

**Espaçamento**
- Página: `gap-6`.
- Cards: `p-5` / `p-6`.
- Grids de KPI: `gap-4`.
- Container: `max-w-screen-2xl px-4 sm:px-6 lg:px-8`.

**Superfícies**
- `Card` com `border` + `shadow-xs` e `rounded-xl`, sem gradientes decorativos.
- Modal `rounded-2xl`.

**Ícones**
- lucide, 16px em botões e 20px em headers.
- Emoji só para as categorias, que são do usuário.

**Números**
- Sempre `tabular-nums`.
- Valores negativos com sinal e cor.
- Moeda compacta em eixos de gráfico.

**Estados**
- Todo componente de dados tem os estados loading (skeleton), vazio (`EmptyState`) e erro (toast + retry quando fizer sentido).

**Movimento**
- 150–200ms, `ease-out`.
- Respeitar `prefers-reduced-motion`.

---

## 📋 Progresso

> Siga o protocolo de [`README.md`](./README.md#protocolo-de-progresso-como-os-agentes-se-comunicam). Entradas do Log ficam em ordem decrescente.

### Status por fase

| Fase | Status | Responsável | Branch / PR | Início | Fim |
|---|---|---|---|---|---|
| 2.0 Fundação visual | ⬜ | — | — | — | — |
| 2.1 Somente pt-BR | ⬜ | — | — | — | — |
| 2.2 App shell | ⬜ | — | — | — | — |
| 2.3 Componentes compartilhados | ⬜ | — | — | — | — |
| 2.4.a Despesas | 🔍 | Claude (agente Sprint 2) | `feat/sprint-2-ui-ux` | 2026-11-20 | 2026-11-20 |
| 2.4.b Configurações | 🔍 | Claude (agente Sprint 2) | `feat/sprint-2-ui-ux` | 2026-11-20 | 2026-11-20 |
| 2.4.c Carro | ⬜ | — | — | — | — |
| 2.4.d Receitas / Metas / Wishlist | ⬜ | — | — | — | — |
| 2.4.e Dashboard | ⬜ | — | — | — | — |
| 2.4.f Budget | ⬜ | — | — | — | — |
| 2.5 Limpeza | ⬜ | — | — | — | — |
| 2.6 Acessibilidade e responsividade | ⬜ | — | — | — | — |
| 2.7 QA final e docs | ⬜ | — | — | — | — |

### Log do agente

#### 2026-11-20 — Fase 2.4.b (Configurações) — Claude (agente Sprint 2)
- **Feito:** `app/settings/page.tsx` caiu de 1546 para 78 linhas. Navegação por `Tabs` (vertical à esquerda em lg, horizontal rolável no mobile) entre **Categorias, Cartões, Moeda, Dados e Aparência**; uma seção por arquivo em `components/settings/`: `CategoriesSection` + `CategoryFormModal` + `EmojiPicker` (Popover Radix com colisão), `CardsSection` + `CardFormModal` + `InvoiceSimulator`, `CurrencySection`, `DataSection`, `AppearanceSection`.
- **Mudanças de comportamento/UX:** formulários de categoria e cartão vão para o `FormModal`; `window.confirm`/`alert` → `useConfirm()`/toast; reordenar categorias ganhou botões de seta de 36px (sem DnD: não é barato o bastante, ver Decisões); o simulador de fatura agora reutiliza `calculateCreditCardDueDate`/`calculateCreditCardBillingMonth` (a cópia de `settings:325-360` foi removida); a drop zone virou `<label htmlFor>` + `<input type="file">` real (focável por teclado, com ring de foco), e o status da importação/exportação vira toast + resumo inline (`role="alert"`/`status`); import usa `actions.loadSuccess` (sem `as any` e sem o `eslint-disable` do topo do arquivo). Seção **Aparência** nova com o seletor de tema (Claro/Escuro/Sistema).
- **Decisões:** (1) Drag-and-drop de categorias NÃO implementado (exigiria dependência nova); ficam as setas maiores. (2) O `CardFormModal` ganhou um `Switch` "Cartão ativo": o campo `isActive` já existia no estado do formulário original, mas não havia controle na UI. (3) Seção de moeda mantida (BRL/USD/EUR); a pergunta sobre ela continua em Bloqueios.
- **Pendente da Sprint 1:** a seção **Budget** das Configurações (primeiro item da lista `SECTIONS` em `app/settings/page.tsx`, marcada com comentário) não foi criada.
- **Verificação:** `typecheck`, `lint`, `build` passam. NÃO executado o roteiro manual (criar/editar/remover/reordenar categoria; criar/editar/remover cartão; simulador; trocar moeda; exportar JSON/CSV; importar JSON/CSV por clique e por arrastar).
- **Arquivos:** `frontend/app/settings/page.tsx`, `frontend/components/settings/**`. **Risco de conflito com Sprint 1:** `app/settings/page.tsx` (a Sprint 1 adiciona a seção Budget ao arquivo antigo de 1546 linhas): reaplicar como um `BudgetSection` novo em `components/settings/` + um item em `SECTIONS`.
- **Próximo passo:** fase 2.4.c (Carro).

#### 2026-11-20 — Fase 2.4.a (Despesas) — Claude (agente Sprint 2)
- **Feito:** `app/expenses/page.tsx` caiu de 2148 para 99 linhas (orquestração). Novo `components/expenses/`: `ExpensesHeader` (PageHeader + 2 StatCards + "Nova despesa"), `ExpensesToolbar` (SegmentedControl Lista/Calendário, busca com label `sr-only`, selects de ordenar/agrupar com `aria-label`), `ExpenseFilters` (Popover ≥ md / Sheet < md + `ActiveFilterChips` removíveis), `ExpenseList` (agrupamento, paginação com `nav`/`aria-current`, `EmptyState`), `ExpenseRow` (RowActions com aria-label), `ExpenseCalendar` (12 meses; itens viraram `<button>`), `ExpenseFormModal` (FormModal `size="lg"`, `Field`, SegmentedControl de forma de pagamento/tipo, seletor de cartão com `aria-pressed`), `expense-labels.ts`, e hooks `useExpenseFilters`, `useExpenseForm` (um único `createEmptyExpenseForm()` no lugar das 4 cópias), `useExpenseStats`/`useLastInsertedExpense`.
- **Comportamento corrigido:** "Nova despesa" sempre abre o modal vazio; "Editar" abre preenchido e o scroll não pula para o topo (não há mais formulário inline nem toggle). `window.confirm` → `useConfirm()`; salvar/excluir usam `withToast` (erro vira toast e o modal continua aberto). Removido o `max-w-7xl` próprio da página (usa o container do layout). Tamanhos de texto `text-[9px]/[10px]/[11px]` removidos desta página.
- **Regras de negócio inalteradas:** filtros, ordenação, agrupamento, paginação e cálculo de fatura/parcelas foram movidos sem alteração de lógica (`matchesFilters` é a cópia fiel dos 8 critérios).
- **Desvios:** (1) `BudgetBanner` (Sprint 1) não existe nesta branch: item da 2.4.a adiado, ver Handoff. (2) Os defaults de data do form continuam com `new Date().toISOString()` (bug UTC-3 após 21h conhecido); marcado com TODO para trocar por `utils/dates` depois do merge da Sprint 1. (3) O badge "✨ Último" do calendário virou "Último".
- **Verificação:** `typecheck`, `lint` e `build` passam. NÃO executado o roteiro manual (criar única/recorrente/parcelada/cartão, editar, excluir com confirmação, cada filtro, ordenar/agrupar, paginação, calendário 12 meses, abrir editar pelo calendário): falta navegador/backend neste ambiente.
- **Arquivos:** `frontend/app/expenses/page.tsx`, `frontend/components/expenses/**`, `frontend/hooks/useMediaQuery.ts`. **Risco de conflito com Sprint 1:** `app/expenses/page.tsx` (a Sprint 1 adiciona BudgetBanner e mexe no formulário/datas). Resolver mantendo a nova estrutura e reaplicando a mudança da Sprint 1 em `ExpenseFormModal`/`useExpenseForm`.
- **Próximo passo:** fase 2.4.b (Configurações).

#### 2026-11-20 — Fase 2.3 — Claude (agente Sprint 2)
- **Feito:** `components/common/`: `PageHeader`, `StatCard` (tom, trend, `min-w-0` + `truncate`, `tabular-nums`), `EmptyState`, `FormModal` (Dialog; foco restaurado ao elemento que abriu, bloqueia fechar durante o submit), `Field` (+ `MoneyInput`, `NumberInput`, `DateField` sobre o `DatePicker` existente; `useId`, `aria-describedby`, erro com `role="alert"`), `ConfirmProvider` + `useConfirm()` (API em promise, montado no layout), `SegmentedControl` (ToggleGroup), `RowActions` (inline ou menu "⋯"), `PageSkeleton`/`LoadingState`, `MoneyText`, `SectionCard`, e `index.ts` com os exports. `lib/toast.ts` com `withToast(promise, {loading, success, error})` sobre `toast.promise`. `utils/format.ts` com `formatDate`, `getFrequencyLabel`, `formatPeriod` e `formatMonth`.
- **Decisões:** (1) O corpo do `FormModal` rola com `overflow-y-auto` + `min-h-0` dentro de um flex `max-h-[85vh]`, em vez do `ScrollArea` do Radix (que exige altura fixa e quebra o `max-h`). (2) `DateField` ficou um wrapper fino do `DatePicker` atual; a decisão entre DatePicker acessível × `Calendar` do shadcn fica para a 2.6. (3) O `Field` aceita elemento (clone com `id`/`aria-*`) ou função-filho.
- **Desvios:** os pontos de adoção (aceite da fase) acontecem na 2.4. As substituições de `fmtDate` (wishlist/car) e `getFrequencyLabel` (expenses/income) por `utils/format.ts` também.
- **Verificação:** `typecheck` e `lint` passam.
- **Arquivos:** `frontend/components/common/*`, `frontend/lib/toast.ts`, `frontend/utils/format.ts`, `frontend/app/layout.tsx` (ConfirmProvider).
- **Próximo passo:** fase 2.4.a (Despesas).

#### 2026-11-20 — Fase 2.2 — Claude (agente Sprint 2)
- **Feito:** `components/layout/{AppSidebar,AppShell,Topbar,ThemeMenu,nav-items,sidebar-state}`. Sidebar com grupos (Visão geral / Movimentações / Planejamento / Patrimônio) e rodapé (Configurações + seletor de tema Claro/Escuro/Sistema), colapsável 256px ↔ 64px com tooltip nos ícones, item ativo `bg-primary/10 text-primary` + barra lateral, atalho `Ctrl+B`. Mobile (< lg): `Sheet` lateral (foco preso, Esc e scroll lock do Radix). `app/layout.tsx` agora é `AppShell` (grid sidebar | conteúdo) com `main` em `max-w-screen-2xl px-4 sm:px-6 lg:px-8`. Removidos `Navigation.tsx`, `SettingsHeaderButton.tsx` e `ThemeToggle.tsx`.
- **Decisões:** (1) Não usei o bloco `sidebar` do shadcn (construí a sidebar própria: menos código e sem dependência de cookies/contexto extra). (2) O estado recolhido fica em `localStorage["fp-sidebar-collapsed"]` e é espelhado em `html[data-sidebar="collapsed"]` por um script inline no `<head>`; o CSS (`[[data-sidebar=collapsed]_&]:...`) reage a esse atributo, então não há layout shift nem flash ao carregar. (3) Topbar só tem breadcrumb + botões de menu/recolher; ações contextuais ficam no `PageHeader` (2.3).
- **Desvios / pendente da Sprint 1:** o item **Budget** (`/budget`) existe em `nav-items.ts` mas fica oculto por `BUDGET_ROUTE_ENABLED = false`, porque a rota é criada pela Sprint 1. O mini `BudgetProgress` na sidebar também depende da Sprint 1 e NÃO foi feito (ver Handoff).
- **Verificação:** `typecheck`, `lint`, `build` passam. NÃO verificado visualmente: colapso persistindo, Sheet por teclado, ausência de layout shift.
- **Arquivos:** `frontend/components/layout/*`, `frontend/app/layout.tsx`. **Risco de conflito com Sprint 1:** `app/layout.tsx` (a Sprint 1 mexe no header/Toaster).
- **Próximo passo:** fase 2.3.

#### 2026-11-20 — Fase 2.1 — Claude (agente Sprint 2)
- **Feito:** todos os `t("chave")` e ternários `isEn`/`language === ...` viraram texto pt-BR literal (script AST temporário, não commitado, que lê o dicionário `pt` de `LanguageContext.tsx`). Removidos `context/LanguageContext.tsx`, `components/LanguageSelector.tsx` e o `LanguageProvider` do layout. `getDateLocale`/`LanguageCode` saíram de `utils/dateFormatting.ts` (agora `DATE_LOCALE = "pt-BR"`; `formatLocalizedDate(date, options?)` e `formatLocalizedMonth(month, options?)` perderam o parâmetro de idioma). `getCategoryInfo` perdeu o parâmetro `language`. `<html lang="pt-BR">` e `metadata` em pt-BR ("Planner Financeiro"). `PriorityBadge` já tinha labels pt.
- **Chaves cruas corrigidas:** `expenses.totalInvoice` (agora "Fatura Atual") e as 12 chaves `ai.quick.*` do `AskAIButton`, que não existiam em nenhum dicionário e apareciam cruas na tela (textos pt criados).
- **Novo:** `utils/labels.ts` com rótulos de enums (forma de pagamento, categoria de meta, prioridade, tipo de despesa), no lugar das chaves dinâmicas `t(\`...${x}\`)`.
- **Decisões:** (1) Moeda: manter `CurrencyContext` (BRL/USD/EUR); `formatCurrency` agora **sempre 2 casas decimais** e o modo `compact` passa a valer a partir de 1.000 (para eixos de gráfico: "R$ 12 mil"). (2) `suggestionGenerator.ts` (texto exibido no dashboard e escrito em inglês, com `Intl` fixo em `en-US`/USD) foi traduzido para pt-BR e passou a formatar em BRL, e o nome da categoria usa `getCategoryInfo` em vez do enum cru. (3) `toLocaleDateString("en-US")` de `expenseOperations.ts` e `forecastCalculator.ts` (rótulos de mês exibidos) virou `pt-BR`. (4) `dataExport.ts` (formato dos arquivos exportados, com `en-US`) NÃO foi alterado: é formato de arquivo, não UI; ver Bloqueios.
- **Candidatos a remoção registrados:** coluna/campo `nameEn` de `ExpenseCategoryConfig` (campo continua nos tipos e em `categoryRules.ts` para manter a cópia do backend em sincronia); `getSortByLabel`/`getGroupByLabel` de `utils/expenseOperations.ts` (agora sem uso na UI; confirmar na 2.5); `getMonthName`/`formatDateWithTranslations` já removidos de `dateFormatting.ts` (não tinham chamadores).
- **Desvios:** `Navigation.tsx` usa um mapa local de rótulos (provisório; o componente é removido na 2.2).
- **Verificação:** `typecheck`, `lint` e `build` passam; `grep -rn "useLanguage\|isEn\|language ===" frontend/app frontend/components frontend/context frontend/utils` vazio. NÃO verificado visualmente (sem navegador/backend): varredura manual por texto em inglês restante na UI.
- **Arquivos:** `frontend/app/**/page.tsx`, `components/*`, `components/charts/*`, `context/CurrencyContext.tsx`, `utils/{dateFormatting,categoryRules,labels,suggestionGenerator,expenseOperations,forecastCalculator}.ts`, `app/layout.tsx`.
- **Próximo passo:** fase 2.2.

#### 2026-11-20 — Fase 2.0 — Claude (agente Sprint 2, paralelo à Sprint 1)
- **Feito:** `@custom-variant dark` + tokens shadcn (oklch, base slate/indigo) em `@theme inline`, incluindo os tokens de domínio `success/warning/danger/income/expense`; `--font-sans/--font-mono` apontando para Geist; regras de `input/select/textarea` e foco movidas para `@layer base`; `tw-animate-css`; `ThemeContext` com `light|dark|system` (default `system`) + script inline no `<head>` (sem flash); componentes shadcn em `components/ui/` (button input label textarea select checkbox switch dialog alert-dialog sheet tabs toggle toggle-group dropdown-menu popover tooltip badge card progress skeleton table separator scroll-area sonner calendar); `lucide-react`; `lib/utils.ts` (`cn`); `Toaster` (wrapper shadcn) e `TooltipProvider` montados no layout; classes inválidas (`bg-slate-750`, `dark:bg-slate-850`, `py-0.2`) corrigidas.
- **Decisões:** `npx shadcn@latest init` não foi usado; criei `components.json` e usei `shadcn add` (o CLI gerou imports `from "cn"` e instalou `next-themes`/`cn` por engano; corrigi para `@/lib/utils` e removi os dois pacotes). O wrapper do sonner usa o `useTheme` próprio em vez de `next-themes`. `--muted-foreground` = slate-600 no claro (contraste AA) / slate-400 no escuro. Botões/inputs: `h-9` no desktop e `pointer-coarse:h-11` em touch; inputs com `text-base md:text-sm` (já vindo do shadcn) e `font-size:16px` em `pointer: coarse` para evitar zoom do iOS.
- **Desvios:** (1) as variáveis legadas em RGB (`--surface`, `--muted-light`, ...) foram removidas; só `.surface-card`/`.glass-header` as usavam e agora usam os tokens novos. (2) Sprint 1 também monta `<Toaster/>` do sonner; no merge, manter só o `components/ui/sonner` (ver Handoff). (3) O `ThemeToggle` provisório agora cicla claro → escuro → sistema; ele sai na 2.2.
- **Verificação:** `typecheck`, `lint` e `build` passam. NÃO verificado visualmente (sem navegador/backend): troca claro/escuro/sistema com SO oposto, ausência de flash, Geist no DevTools.
- **Arquivos:** `frontend/app/globals.css`, `app/layout.tsx`, `context/ThemeContext.tsx`, `components/ThemeToggle.tsx`, `components/ui/*`, `lib/utils.ts`, `components.json`, `package.json`.
- **Próximo passo:** fase 2.1.

#### 2026-11-20 — Planejamento — Claude (sessão de planejamento)
- **Feito:** audit de UI/UX do frontend (responsividade, acessibilidade, duplicações, bugs de fundação), decisões U1–U8 com o usuário e escrita deste plano.
- **Próximo passo:** aguardar a conclusão da Sprint 1. Depois, fase 2.0.

### Handoff

- Esta sprint **só começa depois da Sprint 1 ✅**.
- As referências de linha deste documento são de antes da Sprint 1: reconfirme com grep antes de editar.
- A Sprint 1 já instala o `sonner`. Na 2.0, apenas troque pelo wrapper do shadcn.

### Bloqueios / perguntas ao usuário

- _(os candidatos a remoção da fase 2.5 serão listados aqui quando a fase começar)_
