# Documentação: Lógica e Cálculos da Seção de Renda (Income)

Este documento detalha o funcionamento, as regras de negócio e a matemática aplicada por trás da seção de Rendas (`app/income/page.tsx`) do Personal Finance Planner.

## 1. Estrutura de Dados da Renda

Cada entrada de renda possui as seguintes propriedades principais:
- **Nome** (`name`): Identificador da fonte de renda (ex: "Salário").
- **Valor** (`amount`): O valor monetário da renda na sua frequência original.
- **Frequência** (`frequency`): Com que frequência essa renda ocorre (ex: Mensal, Semanal).
- **Data de Início** (`startDate`): Quando essa renda começou (padrão: data de hoje).
- **Data de Fim** (`endDate`): Opcional. Indica quando a fonte de renda expira ou terminou. Se vazio, é considerada "Contínua" (Ongoing).
- **Ativo** (`isActive`): Um interruptor (boolean) para a fonte de renda contar ou não nos cálculos ativos sem a necessidade de deletá-la.

## 2. Cálculo do "Equivalente Mensal"

Para padronizar e fornecer uma visão unificada sobre os ganhos no Dashboard e totais, a aplicação converte toda e qualquer frequência de receita para um valor **Mensal Equivalente**. 

A função responsável por essa conversão é a `calculateMonthlyAmount`, e os multiplicadores médios que a aplicação utiliza são:

| Frequência (`frequency`) | Fator de Conversão / Cálculo Aplicado                     | Explicação Matemática                                           |
|--------------------------|-----------------------------------------------------------|-----------------------------------------------------------------|
| **Diário (DAILY)**       | `amount * 30.44`                                          | Média de dias por mês (365,25 / 12 = ~30,44).                   |
| **Semanal (WEEKLY)**     | `amount * 4.33`                                           | Média de semanas por mês (52 / 12 = ~4,33).                     |
| **Quinzenal (BIWEEKLY)** | `amount * 2.17`                                           | Média de quinzenas em um mês (equivale a 26 letivos / 12 meses).|
| **Mensal (MONTHLY)**     | `amount`                                                  | Mantém-se inalterado (a base primária do cálculo).            |
| **Trimestral (QUARTERLY)**| `amount / 3`                                             | Divide-se o valor cobrindo os 3 meses contemplados.             |
| **Anual (YEARLY)**       | `amount / 12`                                             | Divide-se para formar o ganho de 1 mês de uma fatia de 12 meses.|
| **Despesa Única (ONE_TIME)**| `0`                                                    | Rendas únicas não impactam o fluxo mensal constante de caixa. |

## 3. Total Mensal no Cabeçalho

A variável `totalMonthlyIncome` visível na página de Rendas usa a seguinte regra:

1. A lista de rendas cadastradas (`state.userPlan.income`) é **filtrada** ignorando cadastros via `isActive === false`.
2. O aplicativo percorre toda a lista filtrada fazendo o cálculo equivalente acima para cada entrada, via a função `calculateMonthlyAmount(income.amount, income.frequency)`.
3. Todos esses valores convertidos são **somados** (`reduce`).

Isso garante que, caso o usuário cadastre 1 renda mensal de R$1.000 e 1 renda semanal de R$100, o mostrador irá exibir o total consolidado padronizado (R$1.000 + R$433 = R$1.433/mês).

## 4. Regras Visuais e de UI Adicionais

- **"Em andamento" vs Data Fim:** Ao visualizar os cartões das rendas, caso a `endDate` não tenha sido configurada, o sistema marca a receita como "Ongoing" (Contínua). Mas se houver `endDate` estipulada e essa data já tiver passado do *dia corrente*, o mostrador passa a ficar avermelhado alertando que o prazo de entrada de fundos dessa renda específica pode ter expirado.
- **Inativo:** Fontes inativas (com o checkbox desativado) recebem a etiqueta cinza na interface ("Inactive") e seus totais são extirpados do grande medidor (Total Monthly) da página, funcionando também como um simulador "E se minha renda de freelance pausar esse mês?".
