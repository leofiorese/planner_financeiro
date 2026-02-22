# Documentação: Lógica e Cálculos da Seção "Plano de Metas / Goal Plan"

Este documento detalha o funcionamento matemático e lógico da tela do **Goal Plan** (`app/goal-plan/page.tsx`), a qual age como uma interface ampliada de Business Intelligence (BI) e uma ferramenta de sugestão de otimização patrimonial impulsionada por regras de negócio simulando uma "Inteligência Artificial de Planejamento" (`utils/suggestionGenerator.ts`).

## 1. O Motor de Sugestões (Suggestion Generator)

No topo da aba de Plano de Metas, o usuário recebe "Cards" contendo ideias ou alertas formatados.

Essas sugestões NÃO são geradas por LLMs externas. Elas são computadas e ativadas a partir de um poderoso analisador interno de Regras (Rule-based Engine) em `utils/suggestionGenerator.ts` que roda imediatamente em cima dos dados projetados do seu Forecast atual.

A estrutura avalia a **Condição (`condition`)** e, se verdadeira, extrai a **Geração de Sugestão (`generate`)**, incluindo o Cálculo de Impacto de Economia ou Ganho.

### 1.1 Regras do Motor (Rules)

Abaixo estão os gatilhos das sugestões pré-programadas:

1. **Aviso de Falência (Negative Cash Flow Warning)**
   - *Gatilho:* Se alguma balança mensal prever fechar **abaixo de zero** nos próximos 12 meses.
   - *Sugestão:* Alerta de grau 'CRITICAL'. Mensura o déficit médio do período negativo e sugere contenções imediatas na mesma proporção do furo de caixa projetado.

2. **Priorizar Pagamento de Dívidas (Debt Payoff Priority)**
   - *Gatilho:* O usuário indicou ter alguma despesa categorizada como 'DEBT_PAYMENTS' ativa E alguma meta financeira categorizada como 'DEBT_PAYOFF'.
   - *Sugestão:* A engine avalia um grau 'HIGH' e sugere redirecionar pelo menos 30% do *Salto Total Liquido Mensal Esperado* (Average Monthly Net) focado na eliminação antecipada dessas dívidas ativas para evitar a rolagem de juros compostos.

3. **Fundo de Emergência (Build Emergency Fund)**
   - *Gatilho:* Quando o patrimônio somado nas caixinhas de "Emergency Fund" do usuário for inferior a **6 vezes** a somatória das `Despesas Mensais Constantes` geradas durante o mês.
   - *Sugestão:* Identifica a lacuna financeira entre o Valor Atual do Fundo e a Meta de Proteção de 6 Meses, pedindo aportes focados (divididos por 12 meses) para alcançar a estabilidade patrimonial base recomendada.

4. **Taxa Mínima de Poupança (Improve Savings Rate)**
   - *Gatilho:* O fluxo de caixa totalizado informa que as Sobras/Excedentes Líquidos de cada mês em caixa (AverageNet) dividos pela Renda Mensal original são estritamente MENORES QUE 20%.
   - *Sugestão:* Baseado na regra do 50-30-20, sugere ao usuário que ele eleve sua poupança aos 20% mínimos fundamentais e propõe o valor em dólares/reais necessário por mês para equiparar a margem mínima global.

5. **Aumentar Renda Primária (Increase Income)**
   - *Gatilho:* Há renda preenchida, porém pelo menos *1 das metas do usuário está fora do trilho temporal (Behind Tracker)* — i.e., ela não será alcançada a tempo segundo as projeções matemáticas das faturas e dos excedentes do ano.
   - *Sugestão:* Calcula quanto dinheiro global falta para colocar a meta em dia e divide este furo por 12, estipulando e sugerindo quanto o usuário deveria buscar levantar em Bicos/Side-Hustles por mês só para salvar a meta deficitária.

6. **Cortar Despesas Inundantes (Reduce Top Expense Category)**
   - *Gatilho:* Se 1 única categoria no orçamento do usuário consome exorbitantes **30%+** do seu gasto absoluto mensal total.
   - *Sugestão:* Identifica o "Mesoralo" financeiro daquele gasto de peso-pesado e estipula que o foco de economia deve ser em torno de cortar 10% unicamente daquela categoria avassaladora.

7. **Acelerador de Metas Livres (Accelerate Goal Progress)**
   - *Gatilho:* Se há Metas que já estão com a saúde intacta ("On Track") cujo grau de conclusão está abaixo de 80%, mas paradoxalmente está sobrando dinheiro limpo na conta ao fim das simulações mensais.
   - *Sugestão:* Manda aumentar o aporte com 20% do restante da dívida da meta faturando em cima de no máx 50% de todo o excedente desovado mensalmente.

8. **Hora de Investir (Investment Opportunity)**
   - *Gatilho:* Se o Saldo Livre Excedente nas contas > 500 dinheiros constante TODO MÊS, o "Fundo de Emergência" (Emergency Fund) já existe com pelo menos 80% preenchido e NADA da verba estipulada em 'Investment', indicando dinheiro dormindo.
   - *Sugestão:* Estipula sugestão agressiva de direcionar 40% das eventuais sobras puras contínuas em papéis futuros e index funds.


## 2. A Lógica Visual de Alocações (Schedules)

Na metade inferior da página do Plano de Metas, os usuários encontram as visualizações do "Goal Allocation Breakdown": **Calendário, Tabelas e Gráficos**.

Esta visão é renderizada solicitando as informações matemáticas precalculadas da função `generateForecast()` que está profundamente detalhada já no `FORECAST_LOGIC.md` e os passos explicados em `GOALS_LOGIC.md`. No entanto, na tela do Goal Plan o componente aplica uma camada visual sobre estes dados cruzados:

### 2.1 Calculo Acumulativo de Interface
O componente varre os meses retornados do simulador. Para que possa exibir, por exemplo, o texto *("Atingiu R$ 6.000 / R$ 10.000 com 60% Concluído")* debaixo do mês de Agosto:
1. Ele guarda na memória a posição da Meta em "Julho";
2. Quando entra na tabela de Agosto, ele intercepta o array `goalBreakdown` sugerido para pagar em Agosto via Projeção (e.g. R$ 500);
3. Ele adiciona esse valor ao balanço *acumulado* na simulação local e gera a porcentagem (`novoBalanço / targetAmount * 100`).

### 2.2 Regra de Exibição de Sobras "Lightbulb / Insights"
Ao varrer um Mês para ser plotado em tela, a aba varre as `Receitas(Mês) - Despesas(Mês)` e depois subtrai as alocações sugeridas. 
- *Se a Verba Alocada = À Verba do Surperávit:* Plota que todas as Metas tomaram todos os fundos livres.
- *Se ainda sobrar Surperávit Limpo:* Coloca a etiqueta condicional (em formato de Lâmpada 💡 na UI) informando ao usuário na tabela exatamente quanto do dinheiro sobrou, alertando que está sem uso na simulação que avançou.
- *Se o Saldo der Negativo ou 0:* Mostra alertas de que nenhum fundo restou.
