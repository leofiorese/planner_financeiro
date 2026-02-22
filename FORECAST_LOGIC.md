# Documentação: Lógica e Cálculos da Seção de Projeções (Forecast)

Este documento destrincha o coração intelectual do Personal Finance Planner: a página de Projeções (`app/forecast/page.tsx`) e seu motor matemático (`utils/forecastCalculator.ts`). 

A funcionalidade de Forecast não é apenas uma tabela estática; é um simulador dinâmico de Fluxo de Caixa que tenta projetar o balanço financeiro do usuário mês a mês, levando a vida útil de cada cadastro em consideração.

## 1. Variáveis de Configuração (`ForecastConfig`)

O usuário possui certos controles que alteram a premissa de como a projeção deve rodar:
- **Starting Balance** (`startingBalance`): Qual o valor que o usuário tem HOJE na conta bancária. É o ponto de partida que sofrerá débito e crédito.
- **Start Date** (`startDate`): Qual é o mês inicial da simulação de Fluxo de Caixa.
- **Horizonte de Meses** (`months`): Até onde no futuro a bola de cristal financeira deve ir (ex: Projetar os próximos 6, 12, ou 24 meses).
- **Incluir Metas** (`includeGoalContributions`): Um gatilho para ligar/desligar o subsistema de **Smart Goal Allocation** do painel da simulação de gastos.
- **Conservative Mode** (`conservativeMode`): Um modo pessimista para garantir margens de erro: se ativo, todo ganho (Income) futuro sofre um **corte de 10%** e todo gasto fixo (Expense) futuro sofre um **acréscimo de 10%**. Protege o usuário financeiramente contra surpresas não cadastradas na vida real inflacionando o custo de vida artificialmente nos cálculos.

## 2. A Esteira de Simulação Mensal

O algoritmo roda uma esteira de repetição baseando-se na variável de **Horizonte de Meses**. Se a configuração tem 6 meses, o código roda as seguintes etapas 6 vezes — avançando a data base de um mês para o outro a cada loop, e repassando o "Saldo Final" de um como se fosse o "Saldo Inicial" do ciclo sucessor.

### 2.1 Processamento de Entradas (Income)
Por cada mês `X` simulado sob a data cronológica:
1. Filtra-se toda lista de Rendas que estão marcadas como ativas (`isActive`);
2. Aciona o verificador `isIncomeActiveInMonth()`, testando se o `Mês Cronológico Atual` já ultrapassou a `Data Fim` (endDate) cadastrada pelo usuário na Renda. Ou seja, se um contrato PJ caduca em Outubro, a partir da projeção do Mês de Novembro, o valor daquela renda cai para Zero.
3. Se o mês é válido para a Renda existir, sua Frequência é unificada matematicamente pelo `calculateMonthlyAmount()` (detalhada no documento de INCOME_LOGIC). 
4. Por fim, a renda validada sofre os efeitos do `Conservative Mode` (caso ativo, toma -10%) e se injeta na caixinha **Total Anual** (`totalIncome`) gerada para esse "Mês Virtual".

### 2.2 Processamento de Saídas (Expenses)
O cálculo segue a premissa:
1. Puxa os gastos ativos para este Mês Virtual via `getExpensesForMonth()`;
2. A aplicação faz um extenso cálculo contra a data de faturas de **Cartão de Crédito**. Uma compra feita hoje não consome Saldo hoje nas projeções de Forecast, na verdade consumirá o saldo livre somente no "Mês de Fluxo" correspondente ao vencimento do cartão que se fechará sobre esta compra (detalhado em EXPENSES_LOGIC).
3. A aplicação mapeará dívidas exclusivas daquele Mês Virtual que sejam Parceladas (Parcela 3/10 vai acontecer ali, ignorando se outras faturas já finalizaram no passado).
4. O valor sofre a punição do `Conservative Mode` (caso ativo, sofre +10% em cada gasto).
5. O acúmulo gera a despesa bruta final do mês `X`, batizada como `totalExpenses`.

## 3. Dinâmica do Fluxo e Metas (Cash Flow + Goals)

Depois de entender "Quanto entrou" e "Quanto já tem na Conta", mas "Quanto tem que sair pagando boletos" num determinado Mês Virtual, o aplicativo descobre se nós geramos um excedente financeiro.

`Saldo Restante Disponível = (Saldo Herdado do Mês Passado + Receitas) - Despesas`

Se este Excedente for positivo (sobrar dinheiro livre neste Mês Virtual), o algoritmo libera o portal do **Smart Goal Allocation**:
- Todo o montante que sobrou vai para a fila de prioridades das Metas Patrimoniais;
- A fila toma os recursos primeiro pagando metas Vencidas de Maneira Agressiva ou infla metas Abertas através das Prioridades ordenadas (`priorityOrder`).
- O aporte é feito usando o "Arredondamento da Vida Real", sugerindo depositar um valor arredondado à melhor centena/milhar (Ex: R$ 400 em vez de 391,20) usando `roundToThousand()`.
- O que o aplicativo extrai sob o nome de Aportes é subtraído do Saldo Restante e engarrafado na variável de `totalGoalContributions`.

*(A lógica detalhada da alocação de saldo reside explicitamente em `GOALS_LOGIC.md`)*.

---

## 4. Conclusão do Mês Virtual e Balanço (Net Change)

Para encerrar o cálculo de um mês da linha cronológica:

**Net Change (Balanço Mensal Final)** = `totalIncome` - `totalExpenses` - `totalGoalContributions`

O "Balanço Mensal Final" reflete quanto o Caixa realmente engordou (ou emagreceu) descontando sua inflação particular, seus cartões daquele mês, as assinaturas e o quanto mandou forçadamente pros investimentos/metas na simulação.

Este valor reage à conta principal:
**Ending Balance (Saldo Final do Mês)** = `startingBalance (Mês Inicial)` + `Net Change`

O Processador avança para o Mês de cronologia Seguinte, mas desta vez informando ao Software que `startingBalance` não é mais o saldo lido da carteira real do celular, e sim o **Ending Balance** virtualizado simulado até então, garantindo continuidade e simulação de Acumulação Constante Patrimonial real ao longo dos anos ou em direção à eventual falência simulada.
