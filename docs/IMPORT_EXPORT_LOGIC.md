# Documentação: Lógica e Cálculos da Seção "Importar / Exportar"

Este documento detalha como a plataforma lida com a mobilidade patrimonial do usuário. Para garantir que o usuário seja dono dos seus próprios dados sem depender de nuvem, o aplicativo prevê rotinas de manipilação completas (`frontend/utils/dataExport.ts` e `frontend/utils/dataImport.ts`) para injetar e extrair informações do banco de memória.

## 1. O Motor de Exportação (`dataExport.ts`)

A estrutura empacota o "User Plan" atual - o arquivo Mestre que contém as Receitas, Despesas, Metas, Projeções e Configurações Ativas - e cria strings textuais de cópia de segurança. O exportador atua em três frentes:

### 1.1 JSON File (Cópia Integral)
A exportação em JSON é a via recomendada de backup sistêmico. 
- Ele varre de ponta a ponta todos os cadastros virtuais sem perdas semânticas;
- Acopla uma aba de MetaDados (`metadata`) atestando a *Data Oficial da Extração*, a suposta *Versão* do modelo do app e uma identificação de integridade.
- Cria a tag principal exportando todo o mapa de memória e criptografando num arquivo `.json` gerado inteiramente por FrontEnd.

### 1.2 CSV Export (Cópia para Excel/Planilhas)
Lidar com um banco de dados relacional inteiro via `.csv` usando arquivos estáticos é complexo, já que num banco real, Receitas e Metas seriam planilhas diferentes.
A solução arquitetural da Engine (`serializeToCSV`) do app resolve isso fatiando o CSV em *seções delimitadas*:
1. Ele escreve os cabeçalhos de *Summary* e plota o sumário executivo;
2. Ele prega marcações duras e fixas (Ex: `=== INCOME ===`, `=== EXPENSES ===`);
3. Ele escreve os títulos de colunas logo abaixo e roda o array inteiro imprimindo linha a linha e "escapando caracteres invasivos" no parser próprio (`escapeCSVValue`) para não quebrar tabelas se você usou vírgulas nos nomes das metas.

### 1.3 Formato do CSV em pt-BR
O CSV foi pensado para abrir direto no Excel/Planilhas em português:
- **Seções**: `## RECEITAS`, `## DESPESAS`, `## METAS` e `## RESUMO` (linhas iniciadas por `#` com um só `#` são comentários).
- **Cabeçalhos** em português ("Nome", "Valor", "Data de Início", "Ativo"...), **delimitador `;`**, **datas `DD/MM/AAAA`**, **números com vírgula decimal** sem separador de milhar (`1234,5`) e **`Sim`/`Não`** nos booleanos. O resumo usa `R$`.
- Os valores técnicos (frequência, categoria, prioridade, forma de pagamento) continuam como **códigos** (`monthly`, `housing`, `high`, `pix`) para a importação ser fiel.
- O **JSON** continua sendo o backup técnico e estável (datas ISO, números puros). Só o `metadata.appName` mudou para "Planner Financeiro".
- A exportação "Monthly Goal Allocation" (`exportGoalAllocationToCSV`/`ToJSON`) foi removida: não tinha nenhum ponto de entrada na interface.

## 2. O Motor de Importação (`dataImport.ts`)

O módulo de entrada possui mecanismos extensos de Autoproteção (Failsafes) para impedir que o aplicativo engasgue lendo dados velhos, e arquivos hackeados ou incompletos. Ele engata na função de entrada cruzada `importFinancialData()`.

### 2.1 Autodetecção (`detectFileFormat()`)
Não se confia na extensão escrita no clique do usuário. O aplicativo primeiro tenta efetuar um `.parse()` no string que subiu do Desktop. 
- Se a estrutura abrir com uma chave mestra Mapeada, declara e envia à Engine de JSON.
- Se a estrutura tiver falha no parse estrito, engata a regex tentando identificar os blocos de tabelas. Sendo provado o formato, engata a Engine de CSV.

### 2.2 Reconstrução de Banco de Dados CSV
A ferramenta `parseCSVImport()` lê os títulos de seção (`## RECEITAS`, `## DESPESAS`, `## METAS`; o resumo é só leitura) e desmonta as partições uma a uma. Ela entende **os dois formatos**:
- **Novo (pt-BR):** delimitador `;`, cabeçalhos em português, datas `DD/MM/AAAA`, números `1234,5`, `Sim`/`Não`.
- **Antigo (inglês):** delimitador `,`, seções `## INCOME`/`## EXPENSES`/`## GOALS`, datas ISO, números `1234.5`, `Yes`/`No`.

O delimitador é detectado pela primeira linha de dados (`detectCSVDelimiter`), os cabeçalhos em português são traduzidos para os nomes que o parser usa (`HEADER_ALIASES`), os números passam por `parseNumberCell` e as datas por `parseDateCell` (que converte `DD/MM/AAAA` em `AAAA-MM-DD`). Os valores técnicos viram *Enums* vivos em funções como `parseExpensesFromCSV`, e `Sim`/`Yes` viram booleanos via `parseBoolean()`.

> Os títulos de seção (`## ...`) precisam ser checados **antes** dos comentários (`# ...`), porque também começam com `#`. Antes dessa correção o import de CSV descartava todas as seções.

### 2.3 Sanitize and Normalize (`validateImportedUserPlan` e `sanitizeUserPlan`)
Nunca se injeta a importação seca de arquivos para a memória de App. O algoritmo segue o último funil:
- Injeta IDs genéricos autogerados para o que veio sem identificador interno;
- Mapeia faltas numéricas cobrindo os buracos do Excel jogando arrays vazios `[]` nas caixinhas nulas ou `0` nos dinheiros inválidos, prevenindo o temido `Undefined TypeError`.
- Restabelece parâmetros faltantes no objeto `forecastConfig` emulando as travas padrão do ForecastCalculator caso o backup antigo do usuário seja de uma versão em que este recurso era inexistente.

Após este túnel de verificações o app é resetado com as propriedades injetadas e o dashboard recalcula na vida real tudo que acabou de receber!
