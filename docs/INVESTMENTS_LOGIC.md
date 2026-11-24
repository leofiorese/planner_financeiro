# Investimentos — regras de negócio

Módulo em **Patrimônio → Investimentos** (`/investments`). Mede a evolução da carteira e a rentabilidade contra uma meta, a partir de um **lançamento mensal** feito pelo usuário. Planejamento e decisões: [`sprints/SPRINT_03_INVESTMENTS.md`](./sprints/SPRINT_03_INVESTMENTS.md).

Onde está o código:

| O quê | Onde |
|---|---|
| Cálculos puros (nenhum lê o relógio) | `frontend/utils/investments/` (`totals`, `returns`, `target`, `reminder`, `series`, `snapshotForm`, `csv`, `normalize`, `months`) |
| Testes | `frontend/tests/investments/`, `backend/tests/investmentMapping.test.ts` |
| API | `backend/src/routes/investments.ts` + `backend/src/domain/investmentMapping.ts` (mapeamento, validação, seed) |
| Estado | `components/investments/InvestmentsProvider.tsx` (um carregamento para o app inteiro), hook `useInvestments` |
| UI | `app/investments/page.tsx`, `components/investments/`, aba em `components/settings/Investment*.tsx`, card em `components/dashboard/InvestmentsCard.tsx` |

Persistência: **fora do `UserPlan`**, em tabelas próprias (`investment_classes`, `investment_snapshots`, `investment_snapshot_entries`, `investment_settings`), pelo mesmo molde do Carro. O histórico não pode passar pelo "apaga e reinsere" do `POST /api/plan/`.

## 1. Classes de ativos

- Árvore de **2 níveis**, editável em Configurações → Investimentos. Padrão: Renda Fixa (Nacional, Internacional), Ações (Nacional, Internacional), Fundos Imobiliários (Real Estate), Alternativos (Ouro, Criptomoedas, Previdência Privada).
- **Só as folhas recebem valores** (subclasse, ou a categoria que não tem subclasses). Uma categoria com filhos é sempre a soma deles.
- Classe com lançamentos **não é excluída: é arquivada**. Some do formulário novo, mas continua nos históricos, na alocação e nos gráficos. Arquivar uma categoria arquiva as subclasses.
- Uma categoria que já tem lançamentos não pode ganhar subclasses (os valores existentes ficariam escondidos).

## 2. Lançamento mensal

- Um por mês (`YYYY-MM`, único). A data do lançamento fica **dentro** do mês: hoje, se for o mês corrente; senão o último dia do mês.
- Por classe-folha: **saldo** (na data), **aportes** e **resgates** do mês (todos ≥ 0). Linha totalmente vazia é ignorada; saldo vazio com aporte/resgate vale 0.
- Um lançamento novo já vem com o saldo do lançamento anterior preenchido, para o usuário só ajustar o que mudou.
- Patrimônio do lançamento = soma dos saldos.
- Moeda: só BRL. Ativo internacional entra já convertido.

## 3. Rentabilidade

Método **Modified Dietz**, por período entre dois lançamentos consecutivos:

```
r = (Vf − Vi − F) / (Vi + F/2),     F = aportes − resgates do lançamento final
```

- O **primeiro lançamento é só a base**: não tem retorno.
- Os aportes e resgates de um lançamento valem para o período desde o lançamento anterior. Se houver meses sem lançar, o intervalo inteiro é um período (`periodMonths > 1`).
- O fluxo é considerado no **meio do período** (por isso `F/2` no denominador). Um aporte sem rendimento dá 0%, não "retorno inflado".
- Se `Vi + F/2 ≤ 0` (nada exposto) o período não tem retorno (`null`) e fica **fora** do acumulado e do número de meses.
- **Acumulado** = `Π(1 + r) − 1`. **Anualizado** = `(1 + acumulado)^(12 / meses) − 1`, com `meses` = soma dos meses dos períodos válidos.
- **Ganho** do período = `Vf − Vi − F`. **Total investido** = patrimônio do 1º lançamento + soma dos aportes líquidos seguintes. Ganho acumulado = patrimônio atual − total investido.
- Vale para a carteira inteira e para cada classe (categoria = soma das folhas sob ela). Uma classe que nasce no meio do histórico só tem retorno a partir do período em que tinha capital.
- Todas as taxas internas são **frações** (0,012 = 1,2%); metas e formulários usam **%**.

## 4. Metas

**Rentabilidade (% a.a., nominal, da carteira inteira).** Opcional. Compara-se o anualizado realizado com a meta: acima, na meta (tolerância de 0,005 p.p.) ou abaixo, e a diferença em pontos percentuais. A meta do gráfico por período é `(1 + m)^n − 1`, com `m = (1 + a)^(1/12) − 1` e `n` = meses do período. Não há benchmark (CDI/IPCA) nem integração externa.

**Patrimônio (R$ até um mês).** Valor e mês-alvo são preenchidos **juntos** (ou nenhum). A projeção parte do saldo do último lançamento e soma, no fim de cada mês, `V·(1 + r) + c`, onde:

- `r` = taxa mensal equivalente à meta de rentabilidade (sem meta, usa a rentabilidade anualizada realizada; sem nenhuma, 0%);
- `c` = **média mensal dos aportes líquidos dos últimos 6 períodos** (ponderada pelos meses de cada período).

Resultado: saldo projetado no mês-alvo, se está **no caminho**, o mês estimado de chegada (até 100 anos, senão "não alcança") e o **aporte mensal necessário** para chegar no prazo (`≥ 0`; fórmula fechada de anuidade). Prazo vencido: não há aporte necessário.

## 4.1 Dashboard

O card "Investimentos" mostra o patrimônio do último lançamento, a variação contra o lançamento anterior, a rentabilidade anualizada e a diferença para a meta. Some enquanto a API não responde, para não atrapalhar o resto do Dashboard.

## 5. Lembrete mensal (popup)

- Dia X configurável (1–31, padrão 1). Em mês sem o dia X vale o último dia do mês (`clampDay`).
- O popup aparece ao abrir o app **a partir do dia X, enquanto o mês corrente não tiver lançamento**. "Lançar agora" abre o formulário ali mesmo.
- **"Lembrar depois"** (ou fechar o popup, ou cancelar o formulário) esconde o aviso **até o dia seguinte** (`localStorage`, chave `fp-investments-snooze`, com `try/catch`).
- Só o mês corrente conta: um mês que passou sem lançamento não gera um lembrete próprio. O mês pode ser lançado depois pela página (o seletor de mês aceita meses passados).

## 6. Exportação CSV

Botão "Exportar CSV" na página. Mesmo padrão das outras exportações pt-BR: separador `;`, vírgula decimal sem separador de milhar, datas `DD/MM/AAAA`. Uma linha por classe-folha de cada lançamento, em ordem cronológica:

```
Mês;Data;Categoria;Classe;Saldo;Aportes;Resgates
11/2026;05/11/2026;Renda Fixa;Nacional;10000,00;500,00;0,00
```

Categoria sem subclasses sai em `Categoria` com `Classe` vazia. Arquivo: `investimentos-AAAA-MM-DD.csv`. Não há importação (decisão I8: o histórico começa do zero).

## 7. API (`/api/investments`)

| Método | Uso |
|---|---|
| `GET` | `{ classes, snapshots (mês mais novo primeiro), settings }` |
| `POST` `{ type: "class" \| "snapshot" \| "settings", data }` | cria/atualiza. Erros: 400 (validação), 404, 409 (mês duplicado; categoria com lançamentos; categoria com subclasses) |
| `DELETE ?type=class\|snapshot&id=` | exclui o lançamento (entradas vão junto, `ON DELETE CASCADE`). Classe com histórico é arquivada (`{ archived: true }`) |

O schema é criado sob demanda (`ensureInvestmentsSchema`) e também está em `backend/database/migrations/investments_migration.sql` e `schema.sql`. As classes padrão são semeadas só quando a linha de `investment_settings` é criada.

## 8. Limites conhecidos

- Retorno por Modified Dietz é uma aproximação: não conhece o dia exato dos aportes. Quanto mais curto o período, melhor.
- O período é entre **lançamentos**: sem lançar um mês, a rentabilidade daquele mês é diluída no intervalo.
- Rentabilidade de uma classe que muda de uma subclasse para outra (realocação) aparece como resgate + aporte; o retorno da carteira não é afetado.
