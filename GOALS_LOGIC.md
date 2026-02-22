# Documentação: Lógica e Cálculos da Seção de Metas (Goals)

Este documento detalha o funcionamento, as regras de negócio e a métrica matemática por trás da seção de Metas (`app/goals/page.tsx`) e do motor de Projeção Inteligente de Metas (`utils/forecastCalculator.ts`) do Personal Finance Planner.

## 1. Estrutura de Dados da Meta

Cada meta possui as seguintes propriedades principais:
- **Nome** (`name`): O título do seu objetivo patrimonial.
- **Valor Alvo** (`targetAmount`): O valor necessário para a conclusão da meta.
- **Valor Atual** (`currentAmount`): O valor que o usuário já possui alocado para este fim.
- **Data Alvo** (`targetDate`): A data (mês/ano) na qual o usuário deseja atingir o `targetAmount`.
- **Categoria** (`category`): Reserva de Emergência, Aposentadoria, Compra de Imóvel, etc.
- **Tipo de Meta** (`goalType`):
  - `FIXED_AMOUNT`: Meta com valor e prazo finitos delimitados para chegar a 100% (Ex: Comprar um carro de 50 mil).
  - `OPEN_ENDED`: Meta contínua, sem linha de chegada ou valor fixo final (Ex: Investimentos recorrentes para aposentadoria indefinida).
- **Prioridade** (`priority`): Baixa, Média, Alta ou Crítica.
- **Ordem de Prioridade** (`priorityOrder`): Número de desempate e ordem de "fila" na qual a engine financiará seus sonhos (1 = mais importante).
- **Ativo** (`isActive`): Define se a meta participa do sistema inteligente de pagamentos projetados.

## 2. Indicadores e Cálculos da UI (Dashboard e Goals Page)

A página de metas entrega aos usuários estatísticas diárias baseadas na discrepância entre o status atual (`currentAmount`) e o valor futuro (`targetAmount`).

- **Progresso Individual**: `(currentAmount / targetAmount) * 100`. (Limitado a no máximo 100% nas barras de progresso visando não "quebrar" o layout se o usuário passar da linha de chegada.)
- **Progresso Geral (Overall Progress)**: É a soma de todos os `currentAmount` de **todas** as metas do usuário dividida pela soma de todos os `targetAmount` de **todas** as metas.
- **Dias Restantes**: Calcula a diferença absoluta de tempo baseada na linha de hoje: `Math.ceil((targetDate - hoje) / 1000 * 60 * 60 * 24)`.
- **Dias / Meses Mínimos**: Nos cálculos mensais, se a diferença de meses até a `targetDate` for zero ou negativa, o motor equaliza o tempo restante para **1 mês**, a fim de evitar divisões por zero ou parcelamentos erráticos nas projeções de término.

## 3. "Smart Goal Allocation" (Alocação Inteligente de Metas)

O diferencial matemático deste software é o assistente embutido que destina os "Ecedentes" (Surplus) ou saldo das contas mensalmente para cumprir os objetivos da forma mais otimizada possível, priorizando as ordens configuradas (`priorityOrder`). Essa lógica habita o núcleo de `utils/forecastCalculator.ts`.

### 3.1 Geração de Saldo/Excedente (Surplus)
Todo mês sendo simulado, o motor do Forecast calcula:
**Saldo Disponível** = `(Saldo das Contas + Rendas do Mês) - Despesas Totais do Mês`
Apenas este valor estritamente *positivo* é submetido à engine de metas.

### 3.2 O Multiplicador de Prioridade e Multiplicador de Caixa
As Metas ganham aceleração dependendo de:
1. **PriorityMultiplier**: 
   - Crítico (`CRITICAL`): 1.5x (Aporta 50% a mais na base)
   - Alto (`HIGH`): 1.2x 
   - Médio (`MEDIUM`): 1.0x 
   - Baixo (`LOW`): 0.7x
2. **BalanceMultiplier**: 
   - Caso o Saldo Disponível passivo no mês ultrapasse certos limites (o padrão de balance scaling é até R$10.000), a base constrói uma alavancagem de multiplicador entre 1x e 2x. Caixas mais abundantes resultam em aportes maiores simultaneamente.

### 3.3 Regras de Alocação Específica

Para a meta #1 da fila (`priorityOrder` = 1), a engine calcula quão desesperada é a situação:
- **Já Expirada** (`targetDate` no passado) -> Toma até 60% do Dinheiro Disponível (Surplus) restante de uma só vez para quitá-la o quanto antes.
- **Meta Fixa (`FIXED_AMOUNT`) que está no Prazo** -> Calcula o "Esforço Mensal" (`Valor Restante / Meses Restantes`). É alocado no mês essa fração mínima para mantê-la *On Track*. A taxa varia entre o `Esforço Mensal` fixado e pelo menos 10% ~ 20% do Excedente Geral baseando-se no multiplicador de saldo para inflar metas fáceis de extinguir.
- **Meta Infinita (`OPEN_ENDED`)** -> Toma 15% do Excedente Geral multiplicado pela priorização e o multiplicador de saldos. Se sobrar dinheiro após as fixas, repassa o montante contínuo à meta aberta na fila até zerar a capacidade poupadora do mês.
- **Teto de Contribuição**: Uma meta de valor Fixo **NUNCA** irá capturar dinheiro excedente além do ponto exato no qual ela inteira os `100%`. Se a meta precisar de R$ 50 para terminar e o sistema tiver reservado R$ 51, R$ 1 volta para a esteira e engrena para a base matemática da *próxima* Goal na Ordem Prioritária.

### 3.4 Arredondamento da Vida Real
Ao invés de dar sugestões do Forecast contendo dízimas financeiras (como investir R$ 137,42), o motor aplica a função de usabilidade `roundToThousand`. O número destinado a cada meta mensal é arredondado a dezenas secas ou as centenas mais próximas para valores altos, e.g., apontar uma sugestão de depósito de R$ 3.000,00 ou R$ 400,00.
