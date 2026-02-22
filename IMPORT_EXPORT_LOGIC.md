# Documentação: Lógica e Cálculos da Seção "Importar / Exportar"

Este documento detalha como a plataforma lida com a mobilidade patrimonial do usuário. Para garantir que o usuário seja dono dos seus próprios dados sem depender de nuvem, o aplicativo prevê rotinas de manipilação completas (`utils/dataExport.ts` e `utils/dataImport.ts`) para injetar e extrair informações do banco de memória.

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

### 1.3 Monthly Goal Allocation Export (CSV Analítico Avançado)
A ferramenta inclui o `exportGoalAllocationToCSV`, que diferente das extrações acima, exporta o "Futuro".
- O motor intercepta toda a matemática da sua projeção que roda os conselhos inteligentes e formata a *previsão* numa planilha para auditagem separada focada especificamente nas parcelas simuladas em `Goal Breakdown`.

## 2. O Motor de Importação (`dataImport.ts`)

O módulo de entrada possui mecanismos extensos de Autoproteção (Failsafes) para impedir que o aplicativo engasgue lendo dados velhos, e arquivos hackeados ou incompletos. Ele engata na função de entrada cruzada `importFinancialData()`.

### 2.1 Autodetecção (`detectFileFormat()`)
Não se confia na extensão escrita no clique do usuário. O aplicativo primeiro tenta efetuar um `.parse()` no string que subiu do Desktop. 
- Se a estrutura abrir com uma chave mestra Mapeada, declara e envia à Engine de JSON.
- Se a estrutura tiver falha no parse estrito, engata a regex tentando identificar os blocos de tabelas. Sendo provado o formato, engata a Engine de CSV.

### 2.2 Reconstrução de Banco de Dados CSV
A ferramenta `parseCSVImport()` lê os separadores e desmonta as partições `=== SUMMARY ===`, `=== INCOME ===`, varrendo os pedaços separados por vez.
Para converter o arquivo em Tipagens (Types) funcionais restritas de TypeScript (transformando as palavras "MEDIUM", "FIXED_AMOUNT", "MONTHLY" da tabela em *Tipos Numéricos* ou *Enums* vivos), funções atacadistas exclusivas foram configuradas (ex: `parseExpensesFromCSV`). Ele faz as conversões pesadas transformando *Yes/No* da célula de CSV em propulsores booleanos do FrontEnd via `parseBoolean()`.

### 2.3 Sanitize and Normalize (`validateImportedUserPlan` e `sanitizeUserPlan`)
Nunca se injeta a importação seca de arquivos para a memória de App. O algoritmo segue o último funil:
- Injeta IDs genéricos autogerados para o que veio sem identificador interno;
- Mapeia faltas numéricas cobrindo os buracos do Excel jogando arrays vazios `[]` nas caixinhas nulas ou `0` nos dinheiros inválidos, prevenindo o temido `Undefined TypeError`.
- Restabelece parâmetros faltantes no objeto `forecastConfig` emulando as travas padrão do ForecastCalculator caso o backup antigo do usuário seja de uma versão em que este recurso era inexistente.

Após este túnel de verificações o app é resetado com as propriedades injetadas e o dashboard recalcula na vida real tudo que acabou de receber!
