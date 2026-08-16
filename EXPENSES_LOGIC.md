# Documentação: Lógica e Cálculos da Seção de Despesas (Expenses)

Este documento detalha o funcionamento, as regras de negócio e a matemática aplicada por trás da seção de Despesas (`app/expenses/page.tsx`) e do motor de cálculo de despesas (`utils/expenseOperations.ts` e `utils/installmentCalculator.ts`) do Personal Finance Planner.

## 1. Estrutura de Dados da Despesa

Cada despesa possui as seguintes propriedades principais:
- **Nome** (`name`): Identificador da despesa (ex: "Aluguel", "Celular novo").
- **Valor** (`amount`): O valor monetário *total* da despesa no seu lançamento original.
- **Categoria** (`category`): Classificação do gasto (ex: Moradia, Alimentação, Transporte).
- **Recorrente?** (`recurring`): Define se a despesa se repete ciclicamente.
- **Frequência** (`frequency`): Se for recorrente, especifica a periodicidade (ex: Mensal, Semanal, Anual).
- **Parcelado?** (`isInstallment`): Usado para compras fracionadas (ex: Cartão de Crédito).
  - **Quantidade de Parcelas** (`installmentMonths`): O número de meses do parcelamento.
  - **Mês de Início da Parcela** (`installmentStartMonth`): O mês de vencimento da primeira parcela.
- **Pagamento** (`paymentMethod` & `creditCardAccount`): Qual a via de pagamento, e preenche a data de vencimento (`dueDate`) automaticamente em casos de Cartão de Crédito baseando-se na data de corte cadastrada da operadora.
- **Ativo** (`isActive`): Define se a despesa entra nos cálculos matemáticos de projeção e resumos mensais.

## 2. Cálculo do "Equivalente Mensal" 

O cerne do cálculo financeiro consiste em transformar as rendas e despesas inseridas pelos usuários num formato "Mensal" (visando fluxo de caixa do Mês a Mês). Em código, isso é gerido por `calculateMonthlyAmount` em `utils/expenseOperations.ts`.

Existem 3 tipos diferentes de "comportamentos" para transformar um gasto em Custo Mensal: Despesas Únicas, Despesas Recorrentes e Despesas Parceladas.

### 2.1 Despesas Simples e Recorrentes
Para despesas que **não são parceladas**, a fórmula é muito semelhante à de Rendas:

| Frequência (`frequency`) | Fator de Conversão / Equivalência                          | Explicação Matemática                                           |
|--------------------------|-----------------------------------------------------------|-----------------------------------------------------------------|
| **Diário (DAILY)**       | `amount * 30.44`                                          | Média de dias por mês.                                          |
| **Semanal (WEEKLY)**     | `amount * 4.33` (média) ou checagem exata por meta de data| Multiplica por ~4,33 (se não passarmos um Mês Alvo), ou varre o calendário exato em semanas.|
| **Mensal (MONTHLY)**     | `amount`                                                  | Mantém-se inalterado.                                           |
| **Trimestral (QUARTERLY)**| Verificação Exata (Módulo 3)                             | Aplica a cobrança apenas se a distância entre meses for múltipla de 3.|
| **Anual (YEARLY)**       | `amount / 12` ou Verificação Exata (Mês == Mês Original) | Distribui caso o usuário não olhe um mês alvo, ou aplica 100% da dívida no mês exato da recorrência anual.|
| **Despesa Única**        | Varia conforme pesquisa                                   | Demonstra a conta integral caso não tenha Recorrência ativada. |

### 2.2 Despesas Parceladas (Installments)
Despesas com a aba `isInstallment` possuem uma regra muito específica: a engine pega o valor **Total (`amount`)** informado e divide pelo **Número de Parcelas (`installmentMonths`)**.

Exemplo: Compra de TV (Valor = R$ 1.200 / Parcelas = 12).
- Custo Mensal = R$ 100 por mês.
- Início: Baseado em `installmentStartMonth`.

O sistema mapeia se o `Mês Alvo` verificado no gráfico, dashboard ou projeção está **entre** a "Data Inicial da Parcela" e a "Data Final" e aplica a conta de divisão. Caso o mês em análise seja antes da compra ou depois da última parcela ter sido quitada, o custo aplicado pro mês retrocede a `0`.

### 2.3 Parcelamentos Recorrentes (Ciclos Sobrepostos)
A aplicação tem um motor complexo para lidar com itens que são *Parcelados* E *Recorrentes* ao mesmo tempo (ex: Uma assinatura anual cobrada todo ano, que o usuário sempre parcela de 12 em 12 vezes pra não pesar no bolso).

Essa lógica está no arquivo `utils/installmentCalculator.ts` (`detectOverlappingCycles` e `calculateOverlappingAmount`).

1. Para cada ciclo (ex: de ano em ano), cria-se um espectro de parcelas novo.
2. A engine varre todos os ciclos passados a partir da Data de Compra Principal (`dueDate`) até a Data Alvo.
3. Soma-se o quanto do "Ciclo 1" resbala na "Mensalidade Atual", somado a quanto do "Ciclo 2" está operando e assim por diante.
- Se uma compra parcelada de 6x for efetuada num ciclo Trimestral, no 4º mês você estaria pagando a Parcela 4/6 do primeiro ciclo + Parcela 1/6 do segundo ciclo, resultando na soma exata da dívida rodando na fatura.

## 3. Dinâmica das Faturas do Cartão de Crédito ("Fatura Atual")

Se o campo `paymentMethod` da Despesa estiver assinado como `'credit_card'`, o front-end detectará qual Instituição Cartão (CreditCardAccount) o usuário usa e ativará as funções `calculateCreditCardDueDate()` e `calculateCreditCardBillingMonth()`.

- **Inter**: Tem fechamento no dia 11 e vencimento no dia 18 (a partir de Maio/2026).
- **XP / Outros**: Tem fechamento no dia 12 e vencimento no dia 20.

Essas funções pegam o dia atual ou o dia fornecido em **Data de Compra (`purchaseDate`)** e comparam com o dia de fechamento do cartão:
- Se Compra **ANTERIOR ou IGUAL** ao Corte (ex: até dia 11) -> A fatura aberta é do mês `Atual`.
- Se Compra **POSTERIOR** ao Corte (ex: a partir do dia 12) -> A fatura aberta avança para o mês `Seguinte` (+1 mês).

### 3.1 Sincronização em `/expenses`
- **Mês de Início das Parcelas**: Ao selecionar Cartão de Crédito e Despesa Parcelada, o `installmentStartMonth` é automaticamente inicializado e sincronizado com o mês da "Fatura Atual" da compra, evitando inconsistências.
- **Componente `MonthPicker`**: Oferece botões de atalho rápido tanto para o **Mês Atual** (calendário) quanto para a **Fatura Atual** (competência do cartão conforme dia de fechamento).
- **Visão de Calendário (12M)**: O cartão de mês correspondente à fatura aberta recebe badge e destaque roxo `💳 Fatura Atual` (além de `Mês Atual` no mês civil), e exibe o somatório dedicado de gastos no cartão naquele ciclo.
- **Header Executivo**: Exibe um card KPI dedicado para `Fatura Atual (Cartão)` com o valor total e quantidade de lançamentos na fatura aberta.

## 4. Agrupamentos, Listas e Destaque da "Última Inserção"

A aba de UI `/expenses/` possui capacidades robustas (lista x calendário):
- **Marcação da Última Inserção**: O lançamento mais recente adicionado pelo usuário (rastreado por `createdAt` e persistência de sessão) recebe um badge visual destacado (`✨ Última Inserção`) e realce na listagem, tanto na visualização em lista, quanto nos grupos por categoria/mês e nos cartões do calendário.
- **Visão em Calendário**: `aggregateExpensesByMonth()` roda para os meses subsequentes, acumulando despesas simples, recorrentes e parceladas conforme suas janelas de vigência.
- **Agrupamento por Mês**: Ao agrupar por mês, os cabeçalhos dos grupos do Mês Atual e da Fatura Atual são identificados com seus respectivos badges temáticos.
