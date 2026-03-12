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

## 3. Dinâmica das Faturas do Cartão de Crédito

Se o campo `paymentMethod` da Despesa estiver assinado como `'credit_card'`, o front-end detectará qual Instituição Cartão (CreditCardAccount) o usuário usa e ativará a função indireta `calculateCreditCardDueDate()`.

- **Inter**: Tem fechamento no dia 11 e vencimento no dia 18 (a partir de Maio/2026). Antes disso, o fechamento e vencimento eram estimados por volta do dia 10.
- **XP / Nubank**: Tem vencimento num dia diferente (ex: dia 20).

Essa função pega o dia que o usuário forneceu em **Data de Compra (`purchaseDate`)** e compara com o dia de fechamento do cartão. 
- Se Compra ANTERIOR ao Corte -> Cai para o dia do vencimento do mês `Atual`.
- Se Compra POSTERIOR ao Corte -> Adiciona 1 mês (+1) na base, e vence no mês `Seguinte`.

No Dashboard e Forecast, a despesa entrará na competência e no custo do **Mês Seguinte** invés do mês que a compra ocorreu por ter cruzado a barreira do cartão.

## 4. Agrupamentos e Listas

A aba de UI `/expenses/` possui capacidades robustas (lista x calendário). Quando ativado o layout de Cartões/Linhas do Calendário de um determinado ano:
- `aggregateExpensesByMonth()` roda 12 vezes, uma para cada Mês, de Janeiro a Dezembro.
- Acumula as categorias cruzando com `isInstallment`, se a dívida estourou naquele mês ou não.
- A função ignora meses não pertencentes à vida útil de um cartão e não puxa dívidas desativadas pelo botão `isActive`.
