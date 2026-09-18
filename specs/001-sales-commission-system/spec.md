# Feature Specification: Sistema de Vendas e Comissões de Papelaria

**Feature Branch**: `001-sales-commission-system`

**Created**: 2026-09-17

**Status**: Draft

**Input**: User description: "Cria a especificação funcional deste projeto. O sistema é para uma papelaria e deve permitir registrar vendas e calcular comissões de vendedores."

## Clarifications

### Session 2026-09-17
- Q: Como o número da nota fiscal da venda deve ser definido no momento do cadastro? (FR-006) → A: Preenchimento manual obrigatório pelo operador com validação de unicidade no backend (Opção A).
- Q: Na consulta de comissões por período, como devem ser tratados os vendedores cadastrados que não realizaram nenhuma venda no intervalo pesquisado? (FR-009) → A: Listar apenas os vendedores que possuem vendas e comissões no período (Opção A).
- Q: No momento da adição de um item na venda, o valor unitário deve ser sempre fixo e herdado do produto ou pode ser alterado pelo operador? (FR-013) → A: Somente leitura: preenchido automaticamente com o valor de catálogo do produto selecionado, sem permitir edição (Opção A).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registro de Venda com Cálculo Dinâmico de Comissão (Priority: P1)

Como operador de vendas da papelaria, desejo registrar uma nova venda vinculando cliente, vendedor, número da nota fiscal, data/hora e itens de produtos com suas quantidades, para que o sistema registre a transação e calcule automaticamente a comissão de cada item e da venda com base nas regras do dia da semana.

**Why this priority**: É o fluxo transacional central do negócio. Sem o registro de vendas e o cálculo de comissões por item, nenhuma outra funcionalidade (consultas, relatórios ou comissões) pode operar.

**Independent Test**: Pode ser testado de forma isolada registrando uma venda completa via interface ou API e verificando se os totais de venda e de comissão calculados correspondem exatamente à aplicação das regras do dia da semana.

**Acceptance Scenarios**:

1. **Given** que a segunda-feira possui limites de comissão configurados entre 3,00% (mínimo) e 5,00% (máximo), **When** o operador registra uma venda em uma segunda-feira contendo 2 unidades de um produto de R$ 50,00 com percentual nominal de 10,00%, **Then** o sistema aplica o teto de 5,00%, totalizando R$ 100,00 para o item e R$ 5,00 de comissão para o item.
2. **Given** que a segunda-feira possui limites configurados entre 3,00% (mínimo) e 5,00% (máximo), **When** o operador registra uma venda contendo 1 unidade de um produto de R$ 100,00 com percentual nominal de 2,00%, **Then** o sistema aplica o piso de 3,00%, resultando em R$ 3,00 de comissão para o item.
3. **Given** que a segunda-feira possui limites configurados entre 3,00% (mínimo) e 5,00% (máximo), **When** o operador registra uma venda contendo 1 unidade de um produto com percentual nominal de 4,00%, **Then** o sistema mantém 4,00% de comissão para o item.
4. **Given** uma venda com múltiplos itens, **When** a venda é concluída, **Then** o valor total da venda deve ser a soma exata dos valores dos itens e a comissão total da venda deve ser a soma exata das comissões calculadas para cada item.
5. **Given** tentativa de salvar venda sem itens ou com quantidade menor ou igual a zero, **When** o operador submete o formulário, **Then** o sistema bloqueia o envio e apresenta erro de validação claro.

---

### User Story 2 - Consulta e Listagem de Vendas Realizadas (Priority: P1)

Como atendente ou gestor da papelaria, desejo visualizar uma lista com as vendas cadastradas, exibindo data/hora, cliente, vendedor e valor total, para acompanhar as operações comerciais realizadas.

**Why this priority**: Fornece visibilidade operacional imediata das vendas efetuadas, permitindo auditar o histórico e navegar até os detalhes de cada transação.

**Independent Test**: Pode ser testado cadastrando vendas e verificando se a listagem exibe corretamente as colunas exigidas com valores formatados em moeda brasileira (R$ pt-BR).

**Acceptance Scenarios**:

1. **Given** que existem vendas registradas no sistema, **When** o usuário acessa a opção "Vendas" no menu principal, **Then** o sistema exibe a tabela com as colunas: Data/Hora, Cliente, Vendedor e Valor Total formatado em Real (R$).
2. **Given** a listagem de vendas, **When** o usuário clica em uma venda específica, **Then** os detalhes da venda são apresentados, incluindo itens, quantidades, valores unitários, subversões de comissão e totalizadores.

---

### User Story 3 - Consulta de Total de Comissões por Período (Priority: P2)

Como gestor da papelaria, desejo informar um período (data inicial e data final) para consultar o total de comissões auferidas por cada vendedor e o total geral pago pela papelaria no período, para gerenciar pagamentos e desempenho da equipe.

**Why this priority**: Entrega o principal valor gerencial do negócio (apuração financeira de comissões), permitindo fechamento semanal/mensal de vendas.

**Independent Test**: Pode ser testado filtrando períodos pré-definidos com vendas de diferentes vendedores e verificando a exatidão das somas individuais e do total geral consolidado.

**Acceptance Scenarios**:

1. **Given** vendas registradas no período de 01/09/2026 a 15/09/2026 para os vendedores "Carlos" e "Mariana", **When** o gestor pesquisa pelo período de 01/09/2026 a 15/09/2026 no menu "Comissões", **Then** o sistema exibe cada vendedor com sua respectiva soma de comissões e apresenta em destaque o total geral consolidado de comissões do período.
2. **Given** um período sem nenhuma venda registrada, **When** o gestor efetua a busca por esse intervalo, **Then** o sistema exibe a lista vazia de comissões por vendedor e o total geral igual a R$ 0,00, sem erros de processamento.
3. **Given** período com data inicial maior que a data final, **When** o gestor submete a busca, **Then** o sistema exibe uma mensagem de validação impedindo a consulta inválida.

---

### User Story 4 - Gestão Administrativa de Cadastros e Regras de Comissão (Priority: P2)

Como administrador do sistema, desejo cadastrar e manter produtos, clientes, vendedores e as faixas de comissão (mínimo e máximo) para cada dia da semana, para garantir que as operações de venda disponham dos dados corretos e das diretrizes comerciais atualizadas.

**Why this priority**: Habilita a parametrização do catálogo de produtos, parceiros e a flexibilidade comercial exigida pelo negócio (as comissões por dia podem mudar com frequência).

**Independent Test**: Pode ser testado alterando os limites de comissão de um dia da semana e confirmando que novas vendas registradas naquele dia utilizam imediatamente os novos limites configurados.

**Acceptance Scenarios**:

1. **Given** o módulo administrativo, **When** o administrador altera a comissão mínima da quarta-feira para 2,50% e máxima para 6,00%, **Then** as novas vendas gravadas para quartas-feiras passam a respeitar os novos limites.
2. **Given** o cadastro de produtos, **When** o administrador tenta cadastrar um produto com comissão nominal de 15,00% ou -1,00%, **Then** o sistema recusa a gravação informando que a comissão deve estar estritamente entre 0,00% e 10,00%.
3. **Given** a configuração de limites de comissão, **When** o administrador tenta definir um percentual mínimo maior do que o percentual máximo para um dia, **Then** o sistema impede a gravação informando inconsistência lógica.

---

### Edge Cases

- **Ausência de configuração para o dia da semana**: Se um dia da semana não possuir limites explicitamente configurados, o sistema deve impedir a venda ou utilizar valores padrão seguros pré-estabelecidos (0% a 10%), garantindo que a aplicação nunca entre em estado de erro inesperado.
- **Vendas com itens repetidos do mesmo produto**: O sistema deve permitir itens adicionais ou consolidar a quantidade, mantendo o cálculo unitário e percentual consistente.
- **Valores decimais e arredondamento monetário**: Em cálculos fracionados (ex.: item de R$ 10,55 com 3,33% de comissão = R$ 0,351315), o sistema deve utilizar arredondamento padronizado de duas casas decimais sem perda de precisão ou distorção acumulada.
- **Alteração posterior de dados mestres**: Se o preço ou a comissão nominal de um produto for alterado no futuro, o histórico das vendas passadas e suas respectivas comissões calculadas devem permanecer inalterados (imutabilidade do fato histórico da venda).
- **Datas retroativas ou futuras**: A data/hora da venda pode ser informada pelo usuário (para lançar notas emitidas) ou assumir o momento atual por padrão; o cálculo do dia da semana deve ser derivado estritamente da data da venda informada, e não da data do cadastro no sistema.
- **Tentativa de duplicidade de nota fiscal**: Se o operador tentar registrar uma venda com um número de nota fiscal que já foi cadastrado anteriormente, o sistema DEVE recusar a gravação e retornar erro 400 Bad Request indicando a duplicidade.

---

## Requirements *(mandatory)*

### Regras de Negócio (Business Rules)

- **RN-001 (Atributos do Produto)**: Todo produto possui código único, descrição, valor unitário (monetário positivo) e percentual de comissão nominal.
- **RN-002 (Faixa de Comissão do Produto)**: O percentual de comissão cadastrado no produto deve estar obrigatoriamente entre 0,00% e 10,00%.
- **RN-003 (Atributos de Clientes e Vendedores)**: Clientes e vendedores possuem nome, e-mail válido e telefone para contato.
- **RN-004 (Configuração de Limites por Dia da Semana)**: Deve existir configuração de percentual mínimo e máximo de comissão para cada um dos 7 dias da semana (domingo a sábado). O valor mínimo deve ser menor ou igual ao valor máximo, e ambos devem pertencer ao intervalo de 0,00% a 10,00%.
- **RN-005 (Atributos da Venda)**: Toda venda é composta por número da nota fiscal (informado obrigatoriamente pelo operador com garantia de unicidade global no sistema), data/hora da transação, um cliente associado, um vendedor responsável e um ou mais itens.
- **RN-006 (Atributos do Item da Venda)**: Cada item vincula um produto e sua respectiva quantidade vendida (número inteiro positivo). O valor unitário é obrigatoriamente herdado do catálogo do produto selecionado (campo de somente leitura no formulário de venda, impedindo alterações arbitrárias pelo operador). O valor unitário e o percentual de comissão aplicado são registrados no item no momento da venda.
- **RN-007 (Cálculo de Comissão Efetiva do Item)**:
  1. Identifica-se o dia da semana da data da venda (ex.: segunda-feira).
  2. Obtêm-se os limites mínimo ($L_{min}$) e máximo ($L_{max}$) do dia da semana correspondente.
  3. O percentual efetivo ($P_{efetivo}$) é derivado do percentual nominal do produto ($P_{nominal}$):
     - Se $P_{nominal} > L_{max}$, então $P_{efetivo} = L_{max}$.
     - Se $P_{nominal} < L_{min}$, então $P_{efetivo} = L_{min}$.
     - Caso contrário, $P_{efetivo} = P_{nominal}$.
  4. O valor total do item é: $Valor_{total\_item} = Quantidade \times Valor_{unitário}$.
  5. O valor de comissão do item é: $Comissão_{item} = Valor_{total\_item} \times (P_{efetivo} / 100)$.
- **RN-008 (Totalizadores da Venda)**: O valor total da venda é a soma dos valores totais dos itens. A comissão total da venda é a soma das comissões de todos os seus itens.
- **RN-009 (Apuração de Comissões por Período)**: A consulta de comissões por período filtra vendas com data/hora compreendida entre a data inicial (00:00:00) e a data final (23:59:59), agrupando e somando as comissões exclusivamente dos vendedores que realizaram vendas no período, omitindo vendedores sem vendas no intervalo pesquisado, e calculando o somatório geral de todas as comissões apuradas.
- **RN-010 (Imutabilidade Histórica)**: Valores unitários e percentuais de comissão aplicados aos itens da venda são congelados no momento da criação da venda, garantindo que alterações cadastrais futuras não modifiquem relatórios ou apurações retroativas.

---

### Functional Requirements

- **FR-001 (Administração de Produtos)**: O sistema DEVE fornecer interface administrativa para criar, listar, atualizar e desativar produtos com código, descrição, valor unitário e percentual de comissão (0% a 10%).
- **FR-002 (Administração de Clientes)**: O sistema DEVE fornecer interface administrativa para gerenciar clientes com nome, e-mail e telefone.
- **FR-003 (Administração de Vendedores)**: O sistema DEVE fornecer interface administrativa para gerenciar vendedores com nome, e-mail e telefone.
- **FR-004 (Administração de Limites por Dia)**: O sistema DEVE permitir ao administrador configurar e atualizar percentuais mínimos e máximos de comissão para cada um dos 7 dias da semana.
- **FR-005 (API REST de Cadastros)**: O sistema DEVE disponibilizar endpoints REST para operações completas de produtos, clientes, vendedores e regras de limites.
- **FR-006 (API REST de Registro de Venda)**: O sistema DEVE disponibilizar endpoint REST para registro de novas vendas contendo cabeçalho (nota fiscal informada manualmente com validação de unicidade, data/hora, cliente, vendedor) e lista de itens (produto, quantidade), retornando os cálculos efetuados e status 201 Created.
- **FR-007 (API REST de Listagem de Vendas)**: O sistema DEVE disponibilizar endpoint REST para listar vendas cadastradas com filtros e dados resumidos (nota fiscal, data/hora, cliente, vendedor, valor total).
- **FR-008 (API REST de Detalhes da Venda)**: O sistema DEVE disponibilizar endpoint REST para recuperar os detalhes completos de uma venda específica, incluindo seus itens e comissões calculadas.
- **FR-009 (API REST de Consulta de Comissões)**: O sistema DEVE disponibilizar endpoint REST dedicado para consultar o total de comissões agrupado exclusivamente por vendedores que tiveram vendas no intervalo de datas informado (início e fim obrigatórios), juntamente com o valor total geral consolidado.
- **FR-010 (Documentação OpenAPI/Swagger)**: Todas as rotas da API REST DEVEM ser documentadas e interativas via OpenAPI Specification / Swagger.
- **FR-011 (Navegação no Frontend)**: A interface do usuário DEVE conter menu principal com acesso às funcionalidades "Vendas" e "Comissões".
- **FR-012 (Tela de Listagem de Vendas)**: A interface DEVE exibir tabela com as vendas contendo: data/hora, cliente, vendedor e valor total da venda em formato monetário Real (R$).
- **FR-013 (Tela de Cadastro de Venda)**: A interface DEVE fornecer formulário para inclusão de nova venda com campos para digitação do número da nota fiscal (obrigatório e validado quanto à duplicidade), seleção de cliente, vendedor, data/hora e inserção dinâmica de itens (seleção de produto que preenche automaticamente o valor unitário como campo de somente leitura, e entrada de quantidade), calculando e exibindo os subtotais e totais dinamicamente.
- **FR-014 (Tela de Consulta de Comissões)**: A interface DEVE conter campos para informar data inicial e data final, botão de consulta, tabela listando apenas os vendedores que realizaram vendas no período e suas respectivas comissões acumuladas, e card/linha de destaque exibindo o total geral do período.
- **FR-015 (Validação de Entrada nas Fronteiras)**: O sistema DEVE validar todos os dados de entrada na interface antes do envio e validar no backend antes de qualquer persistência, retornando mensagens de erro estruturadas para o usuário.
- **FR-016 (Formatação pt-BR)**: Todos os valores monetários apresentados na interface DEVEM seguir o padrão brasileiro de moeda (`R$ 1.234,56`), e todas as datas exibidas devem seguir o padrão brasileiro (`DD/MM/AAAA` ou `DD/MM/AAAA HH:mm`).

---

### Requisitos Não Funcionais (Non-Functional Requirements)

- **NFR-001 (Precisão Numérica)**: O cálculo e armazenamento de valores monetários e taxas DEVE utilizar representação decimal exata (sem uso de tipos de ponto flutuante binário), prevenindo erros de arredondamento financeiro.
- **NFR-002 (Testabilidade e Cobertura)**: O backend e o frontend DEVEM possuir suítes de testes automatizados cobrindo os cálculos de comissão, regras de dia da semana, endpoints REST e componentes principais.
- **NFR-003 (Usabilidade e Referência de UX/UI)**: A interface do usuário DEVE seguir a estrutura, navegação, componentes, estados visuais, tipografia e espaçamentos do protótipo Figma fornecido pela Spassu.
- **NFR-004 (Resiliência e Tratamento de Erros)**: Falhas de validação ou exceções devem retornar códigos HTTP semânticos (400, 404, 422, 500) com mensagens de erro claras e amigáveis ao usuário.
- **NFR-005 (Tempo de Resposta)**: As consultas de listagem e de apuração de comissões devem retornar resultados em menos de 1 segundo para volumes típicos de operação local.
- **NFR-006 (Configuração e Portabilidade)**: Parâmetros e credenciais devem ser carregados via variáveis de ambiente, permitindo execução local simplificada e preparação para produção (Twelve-Factor App).

---

### Key Entities

- **Product (Produto)**:
  - Identificador único (`id`)
  - Código do produto (`code`, ex.: string única)
  - Descrição (`description`)
  - Valor unitário (`unit_price`, valor monetário positivo)
  - Percentual de comissão (`commission_percentage`, decimal entre 0,00% e 10,00%)
- **Customer (Cliente)**:
  - Identificador único (`id`)
  - Nome completo (`name`)
  - E-mail (`email`)
  - Telefone (`phone`)
- **Salesperson (Vendedor)**:
  - Identificador único (`id`)
  - Nome completo (`name`)
  - E-mail (`email`)
  - Telefone (`phone`)
- **DayCommissionRule (Regra de Comissão do Dia da Semana)**:
  - Dia da semana (`day_of_week`, 0 = Segunda a 6 = Domingo ou 0 = Domingo a 6 = Sábado)
  - Percentual mínimo (`min_percentage`, decimal entre 0,00% e 10,00%)
  - Percentual máximo (`max_percentage`, decimal entre 0,00% e 10,00%, maior ou igual ao mínimo)
- **Sale (Venda)**:
  - Identificador único (`id`)
  - Número da nota fiscal (`invoice_number`, identificador único informado pelo operador, obrigatório e não vazio)
  - Data e hora da venda (`sold_at` / `sale_date`, data e hora do fato comercial)
  - Cliente associado (`customer`, vínculo com o cliente)
  - Vendedor responsável (`salesperson`, vínculo com o vendedor)
  - Valor total da venda (`total_amount`, soma monetária dos itens)
  - Total de comissão da venda (`total_commission`, soma monetária das comissões dos itens)
  - Data de criação do registro (`created_at`)
- **SaleItem (Item da Venda)**:
  - Identificador único (`id`)
  - Venda associada (`sale`, vínculo com a venda)
  - Produto vendido (`product`, vínculo com o produto)
  - Quantidade (`quantity`, número inteiro >= 1)
  - Valor unitário no momento da venda (`unit_price`, valor monetário unitário)
  - Percentual de comissão aplicado (`applied_commission_percentage`, percentual efetivo)
  - Valor total do item (`total_price`, quantidade * valor unitário)
  - Valor da comissão do item (`commission_amount`, total do item * percentual aplicado / 100)

---

## Referência de UX/UI e Diretrizes de Frontend

O frontend deve utilizar os protótipos fornecidos pela Spassu como referência visual e comportamental:
- **Protótipo navegável**: [Figma Prototype](https://www.figma.com/proto/LrQFIRtrRJq1GVzofm07qU/Teste-Python-DEV?page-id=69%253A5896&node-id=830%253A2&viewport=1335%252C779%252C0.5&scaling=min-zoom&starting-point-node-id=830%253A124)
- **Protótipo aberto**: [Figma Arquivo](https://www.figma.com/file/LrQFIRtrRJq1GVzofm07qU/Teste-Python-DEV?node-id=69%253A5896)

**Diretrizes de Alinhamento**:
1. O protótipo é referência para navegação, estrutura de telas, formulários, tabelas, filtros, ações, estados visuais, tipografia, cores e espaçamentos.
2. A análise e reprodução fiel das telas ocorrerá durante o planejamento técnico e implementação frontend.
3. Se houver divergência entre o protótipo visual e as regras de negócio deste documento, a divergência deve ser explicitada antes da implementação, prevalecendo as regras de negócio e integridade financeira.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001 (Precisão Financeira de 100%)**: 100% dos cálculos de comissão e totalizadores de vendas devem coincidir exatamente com as regras matemáticas do dia da semana, com zero discrepâncias ou erros de arredondamento em testes unitários e de integração.
- **SC-002 (Conformidade com os Limites do Dia)**: Em 100% dos casos de teste de venda, nenhum item pode ter comissão aplicada fora da faixa delimitada pela regra do dia da semana correspondente.
- **SC-003 (Agilidade na Consulta de Comissões)**: Usuários devem conseguir gerar o relatório consolidado de comissões por período com resposta visual em menos de 1 segundo para volumes usuais de vendas.
- **SC-004 (Completude do Fluxo de Venda)**: O operador deve conseguir preencher e registrar uma venda com múltiplos itens em menos de 1 minuto em um fluxo contínuo e sem erros.
- **SC-005 (Integridade da Cobertura de Testes)**: Cobertura automatizada cobrindo 100% dos cenários de teste das regras de cálculo de comissão, limites de dia da semana e contratos de serviço do sistema.
- **SC-006 (Contrato e Documentação de Interface)**: 100% das operações e endpoints mapeados devem estar acessíveis e testáveis interativamente via documentação formal de interface.

---

## Assumptions

- **Padrão de Dias da Semana**: O sistema adotará a convenção padrão de 7 dias (Segunda a Domingo ou Domingo a Sábado), garantindo que todos os 7 dias tenham registros iniciais na base de dados (seed/migration inicial) para evitar ausência de regras na primeira execução.
- **Identificação da Data da Venda**: A data e hora da venda podem ser retroativas (para lançamento de notas fiscais já emitidas) ou assumir a data/hora atual por padrão quando não informadas explicitamente. O cálculo do dia da semana é estritamente derivado da data da venda informada.
- **Exclusão de Registros Relacionados**: Produtos, clientes e vendedores que já possuem vendas vinculadas não podem ser excluídos fisicamente do banco de dados (ou devem ser desativados/bloqueados) para preservar a integridade referencial e histórica das transações.
- **Formato Monetário**: O sistema opera exclusivamente em moeda Real brasileira (`BRL - R$`), exibindo duas casas decimais com vírgula como separador decimal e ponto como separador de milhar.
- **Autenticação e Permissões**: Conforme especificado no escopo do teste, o Django Admin gerencia produtos, clientes, vendedores e limites de comissão com autenticação padrão do Django. As telas de Vendas e Comissões do frontend operam de forma direta no escopo operacional do desafio sem barreiras complexas de autenticação além do padrão necessário.
