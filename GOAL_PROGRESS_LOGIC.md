# Documentação: Lógica e Cálculos da Seção "Progresso das Metas" 

O gráfico de "Progresso das Metas" (`GoalProgressChart.tsx`), que reside no centro do Dashboard principal do sistema, é uma representação visual avançada e multifacetada do núcleo do Forecast Calculator. Esta seção detalha como esse componente funciona através das suas 3 visões (Modos de Visualização).

## 1. Fonte de Dados e Processamento (Under The Hood)

Diferente de uma barra de progresso burra, o componente `GoalProgressChart` invoca silenciosamente a função-mãe do aplicativo (`generateForecast()`) simulando **12 meses futuros**. 

Cada uma das metas listadas absorve as saídas do objeto calculado `goalProgress` de dentro desse forecast:
1. **O Progresso Base (%):** 
   - Se a meta for *Fixa (`FIXED_AMOUNT`)*: `(Valor Guardado / Objetivo Final) * 100`. (Travado numericamente a 100% como limite visual para não vazar pra fora do gráfico na tela).
   - Se for *Aberta (`OPEN_ENDED`)*: Marcado como 0% nas barras padronizadas.
2. **Tempo Restante (`monthsUntilTarget`):** Lê o Mês Calendário vs Mês Alvo do Cadastro (Se você estipulou o prazo como o mesmo mês atual, joga zero).
3. **Status do Caminho (`isOnTrack`):** Informação interceptada diretamente da Inteligência do Forecast, atestando se sobrou dinheiro suficiente para arcar com essa meta.
4. **Data Prevista Real (`estimatedCompletionMonth`):** Usando do modelo sugerido, ele escreve exatamente quando a meta baterá os 100% de acordo com as contribuições da bola de cristal matemática.

## 2. A Camada Semântica de Cores (Cromatismo)

Para permitir a digestão mental instantânea do estado financeiro no painel inicial, o arquivo dita um dicionário de cores:
- Verdão Esmeralda (`#10B981`): A meta foi dada como **Concluída** (>=100%) `ou` Seus pagamentos mensais gerenciam manter a meta **No Trilho (On Track)**.
- Vermelhão (`#EF4444`): A meta está oficialmente **Atrasada (Behind Schedule)** com chance de falha devido à pouca renda disponível mensal.
- Roxo Primário (`#8B5CF6`): Alocado para metas Perpétuas (`Open Ended`);

Essas cores primárias contrastam com as Etiquetas (Tags) das **Prioridades**, que usam uma paleta entre Verde Suave (Baixa Prioridade) a Vermelho Negrito (Prioridade Crítica).

## 3. Os 3 Modos Visuais da Seção (View Modes)

O Goal Progress possui um switcher contendo as fatias de processamento abaixo.

### 3.1 Modo Progresso de Barras (`📊 Progress`)
A view inicial clássica. Pinta os *Cards* empilhados para cada meta.
- *Layout*: Mostra o título da Meta, a Tag de Prioridade, e a Tag do "On Track" verde ou vermelho.
- *Interação (Tooltip Oculta)*: Clicar sobre qualquer Card no Dashboard fará ele expandir para baixo (Acordeão) revelando furos técnicos lidos do simulador: 
  - *Alocação Mensal Estimada* gerada na simulação futura em real/dólar.
  - O prazo de fim oficial e os meses físicos de distância.

### 3.2 Modo Linha do Tempo (`📅 Timeline`)
Engata na biblioteca `Recharts` traçando um Gráfico de Barras convencional (BarChart).
- O `Eixo Y` (Vertical) é travado entre 0% e 100%. Pinta e eleva as colunas de acordo com o `progressPercent`.
- A dica fundamental visual é que ele herda e usa o "Cromatismo" supracitado pintando as colunas sólidas de Verde/Vermelho se um sonho está afundando ou no trajeto correto.

### 3.3 Modo Alocação/Composição (`🥧 Allocation`)
Um Gráfico de Fatias (PieChart) totalmente focado em responder: *"Para onde meu dinheiro extra está indo dentro das Metas que tenho ativas?"*
- Filtra estritamente metas em que o simuluador provou que `averageMonthlyAllocation > 0`. 
- Isso significa que, se você tem dezenas de metas acumuladas, o gráfico pizza de Alocação cortará do layout qualquer meta impossível, ignorada ou atrasada para revelar o cenário realista em que quais sonhos estão abocanhando os fatiamentos do Fundo Limpo todo mês faturado durante a priorização Smart do App.

## 4. Estatísticas de Rodapé (Summary Stats)

Independente da vista escolhida acima, após ler as intercepções da *Prediction* em tempo real e aplicar os limites de rendering de Ativos VS Totais do filtro (`showOnlyActive`), o componente sumariza estatísticas de placar consoladoras no pé da dashboard:
1. **TotalGoals:** O teto absoluto de registros sob esse filtro.
2. **OnTrack:** Quantas se mantiveram fiéis às datas dentre as cadastradas.
3. **TotalSaved:** A somatória literal do dinheiro retido (`currentAmount`).
4. **MonthlyAllocation:** A somatória da `monthlyAllocationAveraged` de TODAS as metas somadas, ou seja, o "Aporte Mensal Universal Dedicado" que o investidor envia do seu capital mensal somado à conta da corretora ou da poupança que suporta os seus desejos conjuntos.
