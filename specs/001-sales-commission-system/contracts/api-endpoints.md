# REST API Contracts & OpenAPI Specification: Sistema de Vendas e Comissões

**Feature**: `001-sales-commission-system`
**Date**: 2026-09-17
**Status**: Completed

---

## 1. Visão Geral e Padrões da API

- **Base URL**: `/api/v1`
- **Formato**: `application/json` (UTF-8)
- **Documentação Interativa Swagger**: `/api/docs/`
- **Especificação OpenAPI 3.0**: `/api/schema/`
- **Padrão de Valores Monetários**: Strings com duas casas decimais no JSON (ex.: `"100.50"`) para evitar perda de precisão durante desserialização no cliente.
- **Padrão de Datas**: Formato ISO 8601 UTC (`YYYY-MM-DDTHH:mm:ssZ` para data/hora e `YYYY-MM-DD` para filtros de data).
- **Tratamento de Erros**:
  ```json
  {
    "detail": "Mensagem descritiva do erro ou objeto com campos e listas de erros de validação."
  }
  ```

---

## 2. Endpoints da API

### 2.1. Listagem de Produtos
- **Rota**: `GET /api/v1/products/`
- **Descrição**: Retorna o catálogo de produtos disponíveis para preenchimento de itens na venda.
- **Resposta 200 OK**:
  ```json
  [
    {
      "id": 1,
      "code": "CAD-001",
      "description": "Caderno Universitário 200 Folhas",
      "unit_price": "24.90",
      "commission_percentage": "8.00"
    },
    {
      "id": 2,
      "code": "CAN-002",
      "description": "Caneta Esferográfica Azul 0.7mm",
      "unit_price": "3.50",
      "commission_percentage": "10.00"
    }
  ]
  ```

---

### 2.2. Listagem de Clientes
- **Rota**: `GET /api/v1/customers/`
- **Descrição**: Retorna a lista de clientes para seleção no formulário de venda.
- **Resposta 200 OK**:
  ```json
  [
    {
      "id": 1,
      "name": "Empresa Alfa Papéis",
      "email": "contato@alfa.com.br",
      "phone": "(11) 98765-4321"
    }
  ]
  ```

---

### 2.3. Listagem de Vendedores
- **Rota**: `GET /api/v1/salespeople/`
- **Descrição**: Retorna a lista de vendedores ativos para seleção no formulário de venda.
- **Resposta 200 OK**:
  ```json
  [
    {
      "id": 1,
      "name": "Carlos Eduardo Lima",
      "email": "carlos.lima@papelaria.com.br",
      "phone": "(11) 91234-5678"
    }
  ]
  ```

---

### 2.4. Listagem de Vendas Realizadas
- **Rota**: `GET /api/v1/sales/`
- **Descrição**: Retorna as vendas registradas para exibição na tabela da tela "Vendas".
- **Parâmetros de Consulta Opcionais**:
  - `page`: Número da página (paginação padrão DRF).
  - `search`: Busca textual por número de nota fiscal ou nome do cliente.
- **Resposta 200 OK**:
  ```json
  {
    "count": 1,
    "next": null,
    "previous": null,
    "results": [
      {
        "id": 1,
        "invoice_number": "NF-10520",
        "sold_at": "2026-09-17T15:30:00Z",
        "customer": {
          "id": 1,
          "name": "Empresa Alfa Papéis"
        },
        "salesperson": {
          "id": 1,
          "name": "Carlos Eduardo Lima"
        },
        "total_amount": "249.00",
        "total_commission": "12.45"
      }
    ]
  }
  ```

---

### 2.5. Registro de Nova Venda
- **Rota**: `POST /api/v1/sales/`
- **Descrição**: Registra uma venda com cabeçalho e itens, executando o cálculo atômico de comissões por item baseado na data informada.
- **Corpo da Requisição (Payload)**:
  ```json
  {
    "invoice_number": "NF-10520",
    "sold_at": "2026-09-17T15:30:00Z",
    "customer_id": 1,
    "salesperson_id": 1,
    "items": [
      {
        "product_id": 1,
        "quantity": 10
      }
    ]
  }
  ```
- **Resposta 201 Created**:
  ```json
  {
    "id": 1,
    "invoice_number": "NF-10520",
    "sold_at": "2026-09-17T15:30:00Z",
    "customer": {
      "id": 1,
      "name": "Empresa Alfa Papéis"
    },
    "salesperson": {
      "id": 1,
      "name": "Carlos Eduardo Lima"
    },
    "items": [
      {
        "id": 1,
        "product_id": 1,
        "product_code": "CAD-001",
        "product_description": "Caderno Universitário 200 Folhas",
        "quantity": 10,
        "unit_price": "24.90",
        "applied_commission_percentage": "5.00",
        "total_price": "249.00",
        "commission_amount": "12.45"
      }
    ],
    "total_amount": "249.00",
    "total_commission": "12.45",
    "created_at": "2026-09-17T15:30:05Z"
  }
  ```
- **Respostas de Erro**:
  - `400 Bad Request` (Nota fiscal duplicada):
    ```json
    {
      "invoice_number": ["Já existe uma venda com este número de nota fiscal."]
    }
    ```
  - `400 Bad Request` (Venda sem itens ou quantidade inválida):
    ```json
    {
      "items": ["A venda deve conter pelo menos um item válido com quantidade superior a zero."]
    }
    ```

---

### 2.6. Detalhes de uma Venda Específica
- **Rota**: `GET /api/v1/sales/{id}/`
- **Descrição**: Retorna o detalhamento completo de uma venda existente.
- **Resposta 200 OK**: Mesma estrutura do retorno 201 Created acima.
- **Resposta 404 Not Found**:
  ```json
  {
    "detail": "Venda não encontrada."
  }
  ```

---

### 2.7. Consulta e Apuração de Comissões por Período
- **Rota**: `GET /api/v1/commissions/`
- **Descrição**: Retorna a consolidação de comissões auferidas exclusivamente por vendedores que tiveram vendas no intervalo de datas especificado, juntamente com o somatório geral.
- **Parâmetros de Consulta Obrigatórios**:
  - `start_date`: Data de início do período (`YYYY-MM-DD`).
  - `end_date`: Data de término do período (`YYYY-MM-DD`).
- **Exemplo de Chamada**: `GET /api/v1/commissions/?start_date=2026-09-01&end_date=2026-09-17`
- **Resposta 200 OK**:
  ```json
  {
    "start_date": "2026-09-01",
    "end_date": "2026-09-17",
    "salespeople": [
      {
        "salesperson_id": 1,
        "salesperson_name": "Carlos Eduardo Lima",
        "sales_count": 3,
        "total_commission": "345.80"
      },
      {
        "salesperson_id": 2,
        "salesperson_name": "Mariana Santos",
        "sales_count": 5,
        "total_commission": "612.40"
      }
    ],
    "grand_total_commission": "958.20"
  }
  ```
- **Resposta 200 OK (Período sem vendas)**:
  ```json
  {
    "start_date": "2026-08-01",
    "end_date": "2026-08-10",
    "salespeople": [],
    "grand_total_commission": "0.00"
  }
  ```
- **Respostas de Erro**:
  - `400 Bad Request` (Parâmetros ausentes):
    ```json
    {
      "detail": "Os parâmetros start_date e end_date são obrigatórios no formato YYYY-MM-DD."
    }
    ```
  - `400 Bad Request` (Data inicial maior que data final):
    ```json
    {
      "detail": "A data inicial (start_date) não pode ser posterior à data final (end_date)."
    }
    ```

---

### 2.8. Consulta de Regras de Comissão por Dia
- **Rota**: `GET /api/v1/commission-rules/`
- **Descrição**: Retorna os limites mínimo e máximo configurados para os dias da semana (0 = Segunda-feira ... 6 = Domingo).
- **Resposta 200 OK**:
  ```json
  [
    { "day_of_week": 0, "day_name": "Segunda-feira", "min_percentage": "3.00", "max_percentage": "5.00" },
    { "day_of_week": 1, "day_name": "Terça-feira", "min_percentage": "2.50", "max_percentage": "6.00" },
    { "day_of_week": 2, "day_name": "Quarta-feira", "min_percentage": "3.00", "max_percentage": "5.00" },
    { "day_of_week": 3, "day_name": "Quinta-feira", "min_percentage": "2.00", "max_percentage": "7.00" },
    { "day_of_week": 4, "day_name": "Sexta-feira", "min_percentage": "4.00", "max_percentage": "8.00" },
    { "day_of_week": 5, "day_name": "Sábado", "min_percentage": "1.00", "max_percentage": "4.00" },
    { "day_of_week": 6, "day_name": "Domingo", "min_percentage": "0.00", "max_percentage": "3.00" }
  ]
  ```
