# Documentação: Lógica e Cálculos da Seção "Smart Financial Suggestions"

As **Sugestões Financeiras Inteligentes** formam o sistema "Analista" embutido no Dashboard e no Goal Plan. Em vez de utilizar inteligências artificiais externas com alto custo e lentidão para analisar as suas finanças, o Personal Finance Planner conta com uma *Rule-based Engine* (Motor Baseado em Regras) ultra-rápida construída inteiramente na aplicação. 

Toda essa matemática preditiva vive dentro do arquivo controlador `utils/suggestionGenerator.ts`.

## 1. O Algoritmo de Geração (`generateSuggestions`)

As sugestões baseiam-se em comparar recortes da sua situação real registrada VS situações futuras tiradas do simulador global (Forecast). Sempre que alguma página pede um conselho à ferramenta, o seguinte pipeline é acionado:

1. **Configuração Limitadora:**
   - O algoritmo possui a trava de mostrar no máximo 5 dicas simultâneas (`maxSuggestions`).
   - Há um filtro de irrelevância mínima (`minImpactThreshold` = 10 dólares/reais). Se uma sugestão propor que você economize menos de R$ 10, ela é descartada silenciosamente para não encher a interface com centavos inúteis.

2. **A Execução Preditiva Sombra:**
   - Para saber os furos no seu barco financeiro, a engine de Sugestão invoca `generateForecast()` secretamente com a variável limitadora ativada ou não, lendo 12 meses no futuro sem avisar o usuário, gerando arrays de *onde a falência ocorrerá se a gestão não mudar*.

## 2. Interface da Regra (Como uma Ideia Nasce?)

Cada conselho é criado obrigatoriamente exigindo que satisfaça 5 amarras (`SuggestionRule`):

- **ID**: Um texto único interno para não repetir mensagens.
- **Categoria**: Em qual área o conselho é útil (`income` [Renda], `expense` [Despesa], `goal` [Metas], `general` [Caixa Geral]).
- **Prioridade**: Uma etiqueta que define o nível de emergência dessa mensagem.
  - *Crítica* (`CRITICAL`): 🚨 Vermelho
  - *Alta* (`HIGH`): ⚠️ Laranja
  - *Média* (`MEDIUM`): 📋 Amarelo
- **Condição** (`condition`): Uma fórmula matemática do tipo Verdadeiro ou Falso. Só avança se der VERBALMENTE SIM (e.g., só gera limite de dívida de cartão se *Gasto Com Cartão > X*).
- **Gerador** (`generate`): A função matemática que formata os textos dinâmicos que o usuário lê nas caixinhas contendo os números mastigados e o `estimatedImpact` real a abater da dívida.

## 3. As 8 Regras Financeiras Base Atuais

Abaixo detalha-se o núcleo matemático (A Condição de cada Gatilho) que ensina o App a pensar financeiramente:

### 💼 Categoria de Caixa Geral
- **Address Negative Cash Flow (Crítico):** 
  - *Condição:* O simulador encontrou *pelo menos 1 mês* nos próximos 12 cuja Conta bancária terminará negativada.
  - *Geração:* Averígua qual o valor médio desse déficit no túnel dos 12 meses e sugere estancar a sangria cortando esse exato número em média todo mês.

- **Improve Your Savings Rate (Médio):**
  - *Condição:* O fluxo líquido mensal livre (AverageNet) pelo total de Renda for Menor que 20% do que entra de dinheiro. 
  - *Geração:* A regra do 50-30-20. Calcula o *gap* monetário que falta para chegar a 20% do faturamento e sugere guardá-lo.

### 📉 Categoria de Despesas (Expenses)
- **Reduce Top Expense Spending (Médio):**
  - *Condição:* A engine ranqueia todas as despesas da residência e testa se o Top #1 custa mais que 30% do custo de vida sozinho.
  - *Geração:* Sugere focar 100% do sacrifício em cima de baixar somente esse peso-pesado pedindo gentilmente um corte modesto de 10% unicamente em cima dele.

### 💰 Categoria de Renda (Income)
- **Consider Increasing Your Income (Alto):**
  - *Condição:* Avalia se o usuário tem Metas Vencendo/Atrasadas.
  - *Geração:* Extrai o montante que falta para "Tirar o Atraso" contra o tempo que falta e propõe isso como o Valor Mínimo para perseguir um aumento no salário, renda secundária ou Freelances.

### 🎯 Categoria de Metas e Crescimento (Goals)
- **Build Your Emergency Fund (Alto):**
  - *Condição:* Bate os saldos e alvos cadastrados na categoria de fundo de reserva. Exige um gatilho de que a meta final contemple pelo menos 6x a fatura bruta da sua vida mensal inteira.
  - *Geração:* Fixa o "Gap" e exige criar a parcela poupadora por 12 meses.
- **Prioritize Debt Payoff (Alto):**
  - *Condição:* Ter despesas e metas marcadas com `DEBT`.
  - *Geração:* Exige que o app force o usuário em destinar 30% de todo dinheiro limpo que sobrar todo mês a incinerar estas pendências (Dívidas com Juros Compostos envenenam o portfólio muito rápido).
- **Accelerate Your Goal Progress (Médio):**
  - *Condição:* Metas estritamente positivas mas ainda abaixo da linha de conclusão de 80%.
  - *Geração:* "Siga apertando", tomando entre 20% do restante da meta limitados a 50% de todo dinheiro que está sobrando pra antecipar a realização.
- **Consider Starting to Invest (Médio):**
  - *Condição:* Sobrar em caixa constante R$ 500, tendo fundo de reserva criado, mas nada catalogado e depositado em 'Investment'. 
  - *Geração:* Sugere abrir posições pegando 40% só desse excesso (Surplus) para garantir aposentadoria precoce ou lucro de patrimônio passivo.

## 4. O Sistema de Filtragem e Renderização

### A Triagem (Sorting)
Mesmo se 8 conselhos diferentes derem gatilho verdadeiro simulado entre seu Caixa x Sua Fatura, o Código fará uma peneira baseada no campo lógico abaixo na reta final em `utils/suggestionGenerator.ts`:

1.  **Ordem de Prioridade Ponderada:** Todos os problemas marcados com `CRITICAL (Nível 4)` passam na frente dos `HIGH (Nível 3)` indiferente aos valores.
2.  **Desempate por Impacto Monetário:** Se há 2 metas de Conselhos marcados como Grau "Alto", os Cards desempateiam usando o tamanho do impacto financeiro delas listados em formato reverso. Você receberá como leitura N1 o aviso da dívida alta (Alta, Impacto -R$ 4.000) e como leitura N2 o de Fundo de Reserva (Alta, R$ 100).
3.  **A Guilhotina:** Após ordená-las de urgência para bobeira, o Array final sofre um "slice(0, 5)". Ele decepa tudo a baixo do Limite imposto (Deixando vivo estritamente os conselhos N1 até N5).

### A UI (`app/page.tsx`)
Quando chegam no Dashboard principal, os "Cartões" são pintados graficamente traduzindo as propriedades internas do objeto daquele conselho salvo:
- Cores de Background são processados por *Switches* no arquivo de page (Por exemplo: o objeto retornando prioridade "CRITICAL" fará a folha de estilo aplicar Background Vermelho e ícone "🚨").
- Soma o status da `estimatedImpact` acumulando em formato Monetário (+ R$ 4,500 de impacto previsto na vida) servindo apenas como uma estimativa e estímulo mental focado à ação.
