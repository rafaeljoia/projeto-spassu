# Quickstart & Validation Guide: Sistema de Vendas e Comissões

**Feature**: `001-sales-commission-system`
**Date**: 2026-09-17
**Status**: Completed

---

## 1. Pré-Requisitos e Ambiente

Para executar e validar a solução localmente, certifique-se de possuir instalado:
- **Docker** e **Docker Compose** (recomendado para execução em containers) OU
- **Python 3.11+**, **Node.js 20+** e **PostgreSQL 16+** (para execução bare-metal local).

---

## 2. Execução Rápida via Docker Compose

### Passo 1: Configuração das Variáveis de Ambiente
Copie o arquivo de exemplo para inicialização do ambiente:
```bash
# Na raiz do projeto:
cp .env.example .env.local
```

### Passo 2: Inicialização dos Serviços
Execute o build e a inicialização dos contêineres:
```bash
docker compose -f docker-compose.yml --env-file .env.local up --build
```
Os seguintes serviços estarão disponíveis:
- **Backend REST API**: `http://localhost:8000/api/v1/`
- **Documentação Swagger**: `http://localhost:8000/api/docs/`
- **Django Admin**: `http://localhost:8000/admin/`
- **Frontend Web SPA**: `http://localhost:3000/`
- **PostgreSQL Database**: `localhost:5432`

---

## 3. Carga Inicial de Dados (Seed Data)

Para testar imediatamente com catálogo, parceiros e regras dos dias da semana populadas:
```bash
# Executa as migrações e o comando de seed inicial:
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py seed_data
```

O comando de seed popula:
1. **Regras de Comissão**: Configuração para os 7 dias da semana (ex.: Segunda-feira com mínimo de 3% e máximo de 5%).
2. **Produtos**: Caderno (10% comissão), Caneta (2% comissão), Borracha (4% comissão), etc.
3. **Clientes**: 3 clientes de teste com dados completos.
4. **Vendedores**: 3 vendedores de teste (Carlos, Mariana, Roberto).
5. **Superusuário do Admin**: `admin` / `admin123`.

---

## 4. Roteiro de Validação Ponta a Ponta

### Cenário 1: Validação do Cálculo Dinâmico de Comissões por Dia
1. Acesse o frontend em `http://localhost:3000` e clique em **Vendas > Nova Venda**.
2. Preencha:
   - **Nota Fiscal**: `NF-99001`
   - **Data da Venda**: Selecione uma **segunda-feira** (onde o limite é Min 3% e Max 5%).
   - **Cliente**: Selecione qualquer cliente.
   - **Vendedor**: Selecione "Carlos Eduardo".
   - **Item 1**: Produto com 10% de comissão (ex.: Caderno de R$ 50,00), Quantidade = 2.
     - *Resultado Esperado*: Valor total do item = R$ 100,00. A comissão nominal de 10% é limitada ao teto da segunda-feira (5%), gerando R$ 5,00 de comissão.
   - **Item 2**: Produto com 2% de comissão (ex.: Caneta de R$ 100,00), Quantidade = 1.
     - *Resultado Esperado*: Valor total do item = R$ 100,00. A comissão nominal de 2% é elevada ao piso da segunda-feira (3%), gerando R$ 3,00 de comissão.
3. Clique em **Salvar Venda**.
4. Verifique na listagem de Vendas que a `NF-99001` foi registrada com Total de Venda = R$ 200,00 e Total de Comissão = R$ 8,00.

### Cenário 2: Validação da Unicidade da Nota Fiscal
1. Tente registrar uma nova venda utilizando o mesmo número de nota `NF-99001`.
2. *Resultado Esperado*: O sistema deve recusar o salvamento, exibindo mensagem de validação: "Já existe uma venda com este número de nota fiscal."

### Cenário 3: Validação da Apuração de Comissões por Período
1. No menu superior do frontend, clique em **Comissões**.
2. Informe o intervalo de datas abrangendo a venda recém-criada (ex.: de `2026-09-01` até `2026-09-30`).
3. Clique em **Consultar Comissões**.
4. *Resultado Esperado*:
   - A tabela deve listar exclusivamente o vendedor "Carlos Eduardo" com o valor de R$ 8,00.
   - Vendedores sem vendas no período não devem poluir a listagem.
   - O card de destaque deve exibir o **Total Geral de Comissões** = R$ 8,00.

### Cenário 4: Validação dos Testes Automatizados
Execute a suíte de testes de backend e frontend para validar as regras e componentes:
```bash
# Testes do Backend (Django):
docker compose exec backend pytest

# Testes do Frontend (Vitest):
docker compose exec frontend npm test -- --run
```
*Resultado Esperado*: 100% dos testes devem passar com sucesso.
