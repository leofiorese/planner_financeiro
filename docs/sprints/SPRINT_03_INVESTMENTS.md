# Sprint 3 — Investimentos (evolução patrimonial da carteira)

> **Objetivo:** nova seção **Investimentos** dentro de **Patrimônio** (`/investments`) para medir a evolução patrimonial da carteira e a rentabilidade contra uma meta, com um lançamento mensal guiado por um popup no dia X.
>
> **Protocolo de progresso:** [`README.md`](./README.md). Regras de negócio (a criar na fase 3.5): `docs/INVESTMENTS_LOGIC.md`.

---

## Decisões do produto

Respostas do usuário (2026-11-23) e decisões de design registradas a partir delas.

| # | Tema | Decisão |
|---|---|---|
| I1 | Lançamento mensal | **Valor por classe de ativo** (só nas classes-folha). O total é a soma. |
| I2 | Aporte × ganho | Cada lançamento traz, **por classe**, `saldo`, `aportes` e `resgates` do mês. A rentabilidade vem da variação do saldo menos o fluxo líquido. |
| I3 | Meta de rentabilidade | **% ao ano da carteira inteira** (nominal). Sem meta por classe, sem alocação-alvo e sem IPCA/CDI (YAGNI). |
| I4 | Benchmark | Nenhum. Compara só com a meta. Nenhuma integração externa. |
| I5 | Popup | A partir do dia X do mês, ao abrir o app, mostra o popup até o mês estar lançado. "Lembrar depois" esconde só no dia atual. |
| I6 | Dia X | Configurável (1–31). Mês curto usa o último dia (`clampDay`). |
| I7 | Carro | Fora do total de Investimentos. |
| I8 | Histórico | Começa do zero. Mesmo assim, o lançamento permite escolher o mês e editar/excluir antigos. |
| I9 | Extras da v1 | Card no Dashboard, **meta de patrimônio** (R$ alvo + data, com projeção), exportação CSV e gráfico de alocação atual. |
| I10 | Moeda | Só BRL (como no resto do app). Ativos internacionais são informados já convertidos. |
| I11 | Classes | Árvore de **2 níveis**, editável em Configurações. Padrão abaixo. |
| I12 | Persistência | **API própria `/api/investments`** (padrão do Carro/Wishlist), **fora do `UserPlan`**. O histórico de lançamentos não pode passar pelo "apaga e reinsere" do `POST /api/plan/`. |

### Classes padrão (seed)

- Renda Fixa → Nacional, Internacional
- Ações → Nacional, Internacional
- Fundos Imobiliários (Real Estate) *(folha, sem filhos)*
- Alternativos → Ouro, Criptomoedas, Previdência Privada

Só folhas recebem valores. Um pai é sempre a soma dos filhos. Classe com lançamentos não é excluída, e sim **arquivada** (some do formulário novo, mas continua nos históricos e gráficos).

---

## Modelo de dados

Alterar os **dois** `types/index.ts` (frontend e backend).

```ts
interface InvestmentClass {
  id: string;
  parentId: string | null;   // null = categoria raiz
  name: string;
  sortOrder: number;
  archived: boolean;
}
interface InvestmentEntry { classId: string; balance: number; contributions: number; withdrawals: number; }
interface InvestmentSnapshot { id: string; month: string /* YYYY-MM */; date: string /* YYYY-MM-DD */; entries: InvestmentEntry[]; }
interface InvestmentSettings {
  reminderDay: number;              // 1–31
  targetReturnAnnual: number | null; // % a.a.
  wealthTargetAmount: number | null;
  wealthTargetDate: string | null;   // YYYY-MM
}
```

Tabelas (MySQL 8, idempotentes; atualizar `schema.sql` e criar `migrations/investments_migration.sql`): `investment_classes`, `investment_snapshots` (um por `month`, `UNIQUE`), `investment_snapshot_entries` (FK para o snapshot com `ON DELETE CASCADE`, **permitido aqui** porque estas tabelas não passam pelo POST do plano; FK para a classe **sem** cascade), `investment_settings` (linha única). Seed das classes padrão e do `reminderDay` na criação.

---

## Engine (pura, `frontend/utils/investments/`, nenhuma função lê o relógio)

- `totals.ts`: total por snapshot, total por classe-pai (soma dos filhos), alocação do último snapshot.
- `returns.ts`: **retorno do mês (Modified Dietz)** `r = (Vf − Vi − F) / (Vi + F/2)`, com `F = aportes − resgates`. O primeiro snapshot é só a base (sem retorno). Acumulado = produto dos `(1 + r)`. Anualizado = `(1 + R)^(12/n) − 1`. Aplica-se à carteira e a cada classe. Se `Vi + F/2 ≤ 0`, o mês não tem retorno (`null`).
- `target.ts`: meta mensal equivalente `(1 + a)^(1/12) − 1`, status (acima/abaixo) e diferença em p.p. Projeção da meta de patrimônio: meses até o alvo com o saldo atual, a média de aportes líquidos dos últimos 6 meses e a rentabilidade-meta; devolve `null` quando inalcançável.
- `reminder.ts`: `shouldShowReminder({ today, reminderDay, snapshotMonths, snoozedOn })`.
- `normalize.ts`: defaults e backfill das configurações.

---

## Fases

| Fase | Escopo | Depende de |
|---|---|---|
| 3.0 | Tipos (2 lados), schema/migração, rota `/api/investments` (CRUD de classes, snapshots e settings), montagem em `server.ts`, `ensure` do schema + seed | — |
| 3.1 | Engine + testes (`frontend/tests/investments/*.test.ts`; backend: acrescentar o arquivo ao script `test`) | 3.0 (só os tipos) |
| 3.2 | Configurações: aba **Investimentos** (classes: criar/renomear/reordenar/arquivar; dia X; meta % a.a.; meta de patrimônio) | 3.0 |
| 3.3 | Página `/investments` (item em Patrimônio): KPIs, evolução do patrimônio, retorno × meta, alocação atual, histórico, `FormModal` do lançamento (mês, saldo/aporte/resgate por classe) | 3.1, 3.2 |
| 3.4 | Popup global no `AppShell` (dia X) + card no Dashboard | 3.3 |
| 3.5 | Exportação CSV (pt-BR), `docs/INVESTMENTS_LOGIC.md`, CLAUDE.md, QA com backend/banco reais | 3.4 |

### Critérios de aceite (todas as fases)

- `frontend`: `npm run typecheck && npm run lint && npm test && npm run build`. `backend`: `npm run typecheck && npm test`.
- UI só em pt-BR, `FormModal` + `Field`, toasts via `withToast`, `useConfirm()` para excluir, sem scroll horizontal a partir de 390px.
- Datas só com `utils/dates.ts`. Nenhum `new Date("YYYY-MM-DD")`.
- Migração segura para rodar de novo.

---

## 📋 Progresso

### Status por fase

| Fase | Status | Responsável | Branch/PR | Datas |
|---|---|---|---|---|
| 3.0 | ✅ | Claude (sessão 2026-11-23) | `feat/s3-f3.0-investments-api` → `main` | 2026-11-23 |
| 3.1 | ✅ | Claude (sessão 2026-11-23) | mesma branch → `main` | 2026-11-23 |
| 3.2 | ✅ | Claude (sessão 2026-11-23) | mesma branch → `main` | 2026-11-23 |
| 3.3 | ✅ | Claude (sessão 2026-11-23) | mesma branch → `main` | 2026-11-23 |
| 3.4 | ✅ | Claude (sessão 2026-11-23) | mesma branch → `main` | 2026-11-23 |
| 3.5 | ✅ | Claude (sessão 2026-11-23) | mesma branch → `main` | 2026-11-23 |

### Log do agente

#### 2026-11-23 — Fases 3.3, 3.4 e 3.5 — Claude
- **Feito (3.3):** página `/investments` (item "Investimentos" em Patrimônio): KPIs, evolução do patrimônio × total investido, rentabilidade por período × meta, alocação atual (rosca), meta de patrimônio com projeção, desempenho por classe, histórico com editar/excluir e `SnapshotFormModal` (mês, data, saldo/aportes/resgates por classe; saldo vem preenchido do lançamento anterior). Utils novas: `series.ts` (evolução, variação, formatadores), `snapshotForm.ts` (rascunho → payload com validação).
- **Feito (3.4):** `InvestmentsProvider` no layout (um carregamento para página, Configurações, popup e Dashboard; a aba de Configurações passou a usá-lo), `InvestmentReminder` montado no `AppShell` (popup a partir do dia X, "Lembrar depois" até o dia seguinte em `localStorage`) e `InvestmentsCard` no Dashboard.
- **Feito (3.5):** exportação CSV pt-BR (`utils/investments/csv.ts`, botão na página), `docs/INVESTMENTS_LOGIC.md`, CLAUDE.md.
- **Verificado:** `typecheck`, `lint`, `npm test` do frontend (também com `TZ=America/Sao_Paulo`), `typecheck` + `test` do backend e `build`. No navegador, com backend e `next start` reais e MySQL local: popup → lançamento → card do Dashboard atualizado na hora; página com 4 meses (números conferidos à mão: 12,11% a.a., ganho R$ 400, aporte necessário R$ 1.228,30); editar, excluir e validação de mês duplicado; 375px sem scroll horizontal na página e no modal. Dados de teste removidos do banco (ficam as 11 classes padrão).
- **Decisões:** (a) cores dos gráficos: `--income`/`--expense` para ganho/perda (a paleta `--chart-N` é das categorias na alocação) e linha neutra para a meta; (b) o eixo Y da evolução não começa em zero (linhas); (c) o "Total investido" do 1º lançamento é o próprio saldo (base); (d) o popup também some ao fechar/cancelar até o dia seguinte; (e) sem importação de CSV (decisão I8).
- **Desvios:** nenhum de regra de negócio.
- **Não verificado:** o download real do CSV no navegador (só o serializador, por teste unitário), leitor de tela, Lighthouse, e o popup convivendo com o `PeriodClosureManager` do budget quando os dois aparecem no mesmo dia (são dois diálogos modais independentes).
- **Arquivos:** frontend/app/investments/page.tsx, frontend/components/investments/*, frontend/components/dashboard/InvestmentsCard.tsx, frontend/components/layout/{AppShell,nav-items}, frontend/app/{layout,page}.tsx, frontend/utils/investments/{series,snapshotForm,csv}.ts, frontend/tests/investments/seriesFormCsv.test.ts, docs/INVESTMENTS_LOGIC.md.
- **Próximo passo:** sprint concluída; falta só QA do que está em "Não verificado".

#### 2026-11-23 — Fases 3.1 e 3.2 — Claude
- **Feito (3.1):** `frontend/utils/investments/` com `months.ts`, `totals.ts` (árvore, folhas, saldo por categoria, alocação), `returns.ts` (Modified Dietz por carteira e por classe, acumulado, anualizado, média de fluxo), `target.ts` (meta % a.a., projeção da meta de patrimônio), `reminder.ts`, `normalize.ts` (defaults e formulário de configurações). 33 testes em `frontend/tests/investments/`.
- **Feito (3.2):** aba **Investimentos** em Configurações (`components/settings/InvestmentsSection.tsx`, `InvestmentGoalsCard.tsx`, `InvestmentClassesCard.tsx`), modal `components/investments/InvestmentClassFormModal.tsx` e o hook `components/investments/hooks/useInvestments.ts` (molde para a 3.3/3.4). Classes: criar categoria/subclasse, renomear, reordenar (↑↓), arquivar/reativar e excluir (com histórico, a API arquiva). Configurações: dia do lembrete, meta % a.a., meta de patrimônio + mês-alvo.
- **Verificado:** `typecheck`, `lint`, `npm test` (193, também com `TZ=America/Sao_Paulo`) e `build` do frontend passando. No navegador, com backend e `next start` reais: salvar configurações (persistiu no banco), criar categoria, excluir com confirmação, e 375px sem scroll horizontal. Dados de teste revertidos.
- **Decisões:** (a) taxas da engine são **frações** (0,012); metas e formulários usam **%** (12); (b) período com meses sem lançamento: os aportes do lançamento cobrem todo o intervalo e o retorno é anualizado pelo nº de meses do intervalo; (c) período sem capital exposto (`Vi + F/2 ≤ 0`) fica fora do acumulado; (d) reordenação só por botões ↑↓ (sem arrastar); (e) o hook busca os dados sozinho; quando a 3.4 precisar compartilhar o estado entre o popup e a página, promover o hook a um provider; (f) projeção da meta: aportes no fim do mês, rentabilidade = meta % a.a., aporte = média dos últimos 6 períodos (`averageMonthlyNetFlow`).
- **Desvios:** nenhum. A aba não valida o dia do lembrete contra o mês (dia 31 é aceito, `clampDay` resolve).
- **Arquivos:** frontend/utils/investments/*, frontend/tests/investments/*, frontend/components/investments/*, frontend/components/settings/Investment*.tsx, frontend/app/settings/page.tsx.
- **Próximo passo:** 3.3 (página `/investments`).

#### 2026-11-23 — Fase 3.0 — Claude
- **Feito:** tipos nos dois `types/index.ts`; `domain/investmentMapping.ts` (mapeamento, validação, seed, `isLeafClass`); `routes/investments.ts` montada em `server.ts` (`GET`, `POST {type: class|snapshot|settings}`, `DELETE ?type=class|snapshot&id=`); `migrations/investments_migration.sql` + `schema.sql`; `tests/investmentMapping.test.ts` (12 testes, já no script `npm test`). Backend: typecheck OK, 23 testes passando; frontend: typecheck OK.
- **Verificado contra o MySQL local** (servidor na porta 3055): schema e seed criados sob demanda; lançamento em categoria-pai → 400; mês duplicado → 409; excluir classe com histórico arquiva; excluir pai com filhos → 409; configurações gravam; `PUT` → 405. Dados de teste removidos; o banco local ficou só com as tabelas novas e as 11 classes padrão.
- **Decisões:** (a) classes só mudam nome/ordem/arquivada depois de criadas (posição na árvore fixa); (b) arquivar um pai arquiva os filhos; (c) criar subclasse numa classe que já tem lançamentos → 409; (d) o seed roda só quando a linha de `investment_settings` é criada, então apagar todas as classes não recria o padrão; (e) dia do lembrete padrão = 1.
- **Desvios:** nenhum. Lembrete de ambiente: ao testar com `curl` no Git Bash do Windows, caracteres acentuados vão fora de UTF-8; use o frontend ou `--data-binary @arquivo.json`.
- **Arquivos:** backend/src/{types/index.ts,domain/investmentMapping.ts,routes/investments.ts,server.ts}, backend/database/{schema.sql,migrations/investments_migration.sql}, backend/{tests/investmentMapping.test.ts,package.json}, frontend/types/index.ts.
- **Próximo passo:** fases 3.1 (engine) e 3.2 (Configurações) podem começar; 3.1 só depende dos tipos.

#### 2026-11-23 — Planejamento — Claude
- **Feito:** levantou requisitos com o usuário e escreveu esta especificação.
- **Decisões:** I1–I12 acima.
- **Desvios:** nenhum.
- **Próximo passo:** fase 3.0.

### Handoff

Sprint 3 concluída e integrada na `main`. Regras em [`../INVESTMENTS_LOGIC.md`](../INVESTMENTS_LOGIC.md). Para evoluir: ideias deixadas de fora de propósito (I3/I4) são meta por classe, alocação-alvo (rebalanceamento) e benchmark (CDI/IPCA); a engine em `utils/investments/` aceita ser estendida sem mexer na API.

### Bloqueios / perguntas ao usuário

- Nenhum. Pontos de design assumidos por mim, fáceis de mudar: o "Lembrar depois" vale só até o fim do dia (localStorage); a projeção da meta de patrimônio usa a média de aportes dos últimos 6 meses.
