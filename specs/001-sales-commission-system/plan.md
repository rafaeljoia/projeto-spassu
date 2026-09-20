# Implementation Plan: Sistema de Vendas e Comissões de Papelaria

**Branch**: `001-sales-commission-system` | **Date**: 2026-09-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-sales-commission-system/spec.md` and user technical decisions.

---

## Summary

O objetivo é desenvolver uma solução fullstack desacoplada, simples, robusta e demonstrável para uma papelaria, permitindo o registro de vendas com cálculo dinâmico de comissões por dia da semana e a apuração de comissões por período.

- **Backend**: Python 3.11+ com Django e Django REST Framework. Utiliza PostgreSQL 16+ como banco relacional, Django Admin para cadastros administrativos (produtos, clientes, vendedores e limites de comissão por dia da semana), serviço dedicado de domínio para o cálculo de comissões (`CommissionService`), tipos `Decimal` para precisão monetária, documentação interativa OpenAPI 3.0 / Swagger via `drf-spectacular` e testes automatizados com `pytest-django`.
- **Frontend**: SPA em React 18+ com TypeScript estruturada com Vite, consumindo a API REST do backend. Implementa menu com "Vendas" e "Comissões", formulário dinâmico de venda com cálculo de subtotais e tabela consolidada de comissões por período, seguindo fielmente a referência visual e comportamental dos protótipos Figma da Spassu. Testes unitários com Vitest e React Testing Library.
- **Ambientes & Containers**: Orquestração via Docker Compose com 3 serviços isolados (`backend`, `frontend`, `db`), configurações por ambiente através de `.env.example`, `.env.local` e `.env.prod`, sem versionamento de segredos (Twelve-Factor App).

---

## Technical Context

**Language/Version**: Python 3.11+ (Backend) e TypeScript 5.x / Node.js 20+ (Frontend).

**Primary Dependencies**:
- *Backend*: Django 5.x, Django REST Framework (DRF), `drf-spectacular` (OpenAPI 3 / Swagger), `psycopg[binary]` (PostgreSQL driver), `django-cors-headers`, `django-environ` (ou `python-decouple`).
- *Frontend*: React 18+, TypeScript, Vite, Axios, Lucide React (ícones leves), CSS Modules / Vanilla CSS.

**Storage**: PostgreSQL 16+ executado em container Docker com volume persistente.

**Testing**:
- *Backend*: `pytest` e `pytest-django` com cobertura de regras de negócio de comissão, limites diários, transações de venda e endpoints REST.
- *Frontend*: `Vitest`, `@testing-library/react`, `@testing-library/jest-dom` e `jsdom`.

**Target Platform**: Containers Docker (Linux) e navegadores web modernos (Chrome, Firefox, Edge, Safari).

**Project Type**: Aplicação Web Fullstack com serviços independentes (Backend API + Frontend SPA + Banco de dados).

**Performance Goals**:
- Resposta de endpoints de consulta e registro em menos de 1 segundo.
- Carregamento e renderização fluida da SPA (< 500ms).

**Constraints**:
- Proibição estrita de tipos `float` para cálculos e valores monetários (uso obrigatório de `decimal.Decimal` e `DecimalField`).
- Formatação monetária estrita em padrão brasileiro (`R$ 1.234,56`).
- Identificadores de código (variáveis, funções, classes, arquivos, colunas de banco) em inglês; comentários explicativos em português (`pt-BR`).
- Segregação de responsabilidades entre regras de negócio, persistência, controllers de API e apresentação.

**Scale/Scope**: Escopo delimitado aos requisitos funcionais do teste técnico da Spassu, priorizando simplicidade (YAGNI) e qualidade comprovada.

---

## Constitution Check

*GATE: Avaliação de conformidade com a Constituição v1.0.0 do projeto.*

| Princípio da Constituição | Conformidade no Plano | Status |
| :--- | :--- | :---: |
| **I. Clean Code & Maintainability** | Identificadores estritamente em inglês, tipagem estática (Python type hints e TypeScript), PEP 8 e componentes concisos. | **PASS** |
| **II. Pragmatic Simplicity & YAGNI** | Arquitetura direta (Backend + Frontend + DB), sem microserviços desnecessários ou bibliotecas de estado redundantes. | **PASS** |
| **III. Separation of Concerns** | Camada de domínio (`services/commission_service.py`), models ORM, serializers DRF e componentes de apresentação React desacoplados. | **PASS** |
| **IV. Pragmatic SOLID Principles** | Responsabilidade única por classe/módulo; injeção simples de dependências e baixo acoplamento sem abstrações vazias. | **PASS** |
| **V. Targeted Automated Testing** | Testes automatizados cobrindo exaustivamente a regra de cálculo de comissão por dia, unicidade de nota fiscal, endpoints e componentes frontend. | **PASS** |
| **VI. RESTful API & OpenAPI/Swagger** | URLs padronizadas, verbos semânticos, status codes e documentação interativa Swagger via `drf-spectacular`. | **PASS** |
| **VII. Monetary Precision & pt-BR** | `decimal.Decimal` no backend, strings de precisão fixa no JSON e formatação `pt-BR` via `Intl.NumberFormat` no frontend. | **PASS** |
| **VIII. Boundary-Level Data Validation** | Validações nos serializers do DRF (backend) e formulários no cliente (frontend) com respostas 400 estruturadas. | **PASS** |
| **IX. Twelve-Factor & Config Externalization** | Variáveis de ambiente gerenciadas via `.env.local` / `.env.prod`, sem segredos versionados no repositório. | **PASS** |
| **X. Modular Frontend Architecture** | Componentes reutilizáveis (Header, Table, Button, Card, Modal/Form), custom hooks para requisições e estado previsível. | **PASS** |
| **XI. Backend/Frontend Division** | Backend é a única autoridade para persistência e cálculos; Frontend foca exclusivamente em UX e apresentação. | **PASS** |
| **XII. Comprehensive Documentation** | `README.md` completo com pré-requisitos, instruções passo a passo para execução via Docker ou local, migrações e testes. | **PASS** |
| **XIII. Local Usability & Production Ready** | Execução local rápida com Docker Compose e estrutura preparada para ambientes produtivos. | **PASS** |
| **XIV. Strict Scope Discipline** | Apenas as entidades e regras exigidas pelo teste, sem criação de funcionalidades não solicitadas. | **PASS** |
| **XV. English Codebase Identifiers** | Todo o código, schemas, arquivos e variáveis nomeados em inglês. | **PASS** |
| **XVI. pt-BR Comments & Documentation** | Comentários e documentações do projeto redigidos em português do Brasil (`pt-BR`). | **PASS** |

*Resultado do Gate*: **APROVADO (16/16 Princípios Atendidos)**.

---

## Project Structure

### Documentation (Feature Artefacts)

```text
specs/001-sales-commission-system/
├── spec.md              # Especificação funcional refinada
├── checklists/
│   └── requirements.md  # Checklist de qualidade validado
├── plan.md              # Este plano de implementação técnica
├── research.md          # Decisões de arquitetura e tecnologia (Fase 0)
├── data-model.md        # Modelo de dados e entidades ERD (Fase 1)
├── quickstart.md        # Guia de execução e validação ponta a ponta (Fase 1)
├── contracts/
│   └── api-endpoints.md # Contrato detalhado da API REST e schemas (Fase 1)
└── tasks.md             # Tarefas de implementação (Fase 2 - gerado via /speckit-tasks)
```

### Source Code (Repository Root Layout)

```text
projeto-spassu/
├── .env.example                  # Modelo de variáveis de ambiente versionado
├── .env.local                    # Variáveis locais de desenvolvimento (ignorado pelo git)
├── .env.prod                     # Variáveis para execução de produção (ignorado pelo git)
├── .gitignore                    # Regras de exclusão do git
├── docker-compose.local.yml      # Orquestração para ambiente local / desenvolvimento (hot-reload)
├── docker-compose.yml            # Orquestração padrão para ambiente de produção (Nginx + Gunicorn)
├── README.md                     # Documentação completa de instalação, execução e arquitetura
│
├── backend/                      # Serviço Backend (Python + Django + DRF)
│   ├── Dockerfile                # Imagem Docker do backend
│   ├── requirements.txt          # Dependências Python (Django, DRF, etc.)
│   ├── manage.py                 # CLI de gerenciamento do Django
│   ├── core/                     # Configuração central do projeto Django
│   │   ├── __init__.py
│   │   ├── settings.py           # Configurações com leitura de variáveis de ambiente
│   │   ├── urls.py               # Roteamento central e endpoints do Swagger
│   │   └── wsgi.py
│   ├── apps/                     # Módulos de aplicação do domínio
│   │   ├── sales/                # App de vendas e comissões
│   │   │   ├── __init__.py
│   │   │   ├── admin.py          # Configurações do Django Admin
│   │   │   ├── apps.py
│   │   │   ├── models.py         # Product, Customer, Salesperson, Rule, Sale, SaleItem
│   │   │   ├── serializers.py    # Serializadores DRF com validação
│   │   │   ├── views.py          # ViewSets e endpoints da API REST
│   │   │   ├── urls.py           # Roteamento dos endpoints REST
│   │   │   ├── services/
│   │   │   │   ├── __init__.py
│   │   │   │   └── commission_service.py # Lógica de negócio de cálculo de comissão
│   │   │   └── management/
│   │   │       └── commands/
│   │   │           └── seed_data.py      # Carga inicial com 7 dias e dados de teste
│   └── tests/                    # Suíte de testes automatizados do backend
│       ├── __init__.py
│       ├── conftest.py           # Fixtures do pytest
│       ├── test_commission_service.py # Testes unitários das regras de comissão
│       ├── test_sales_api.py          # Testes de integração de endpoints de venda
│       └── test_commission_api.py     # Testes de integração da apuração por período
│
└── frontend/                     # Serviço Frontend (React + TypeScript + Vite)
    ├── Dockerfile                # Imagem Docker do frontend
    ├── nginx.conf                # Configuração do Nginx para build de produção
    ├── package.json              # Dependências e scripts npm
    ├── vite.config.ts            # Configuração do Vite e Vitest
    ├── tsconfig.json             # Configurações do TypeScript (modo estrito)
    ├── index.html                # Ponto de entrada HTML
    ├── src/
    │   ├── main.tsx              # Inicialização da aplicação React
    │   ├── App.tsx               # Componente raiz com navegação/layout
    │   ├── index.css             # Estilos globais e tokens de design (cores/tipografia Figma)
    │   ├── types/
    │   │   └── index.ts          # Interfaces TypeScript (Product, Sale, Commission, etc.)
    │   ├── services/
    │   │   ├── api.ts            # Cliente HTTP Axios configurado
    │   │   ├── saleService.ts    # Chamadas de API para vendas
    │   │   └── commissionService.ts # Chamadas de API para comissões
    │   ├── hooks/
    │   │   ├── useSales.ts       # Hook de listagem e criação de vendas
    │   │   └── useCommissions.ts # Hook de consulta de comissões por período
    │   ├── components/           # Componentes reutilizáveis de UI
    │   │   ├── Navbar/           # Menu de navegação (Vendas / Comissões)
    │   │   ├── Button/
    │   │   ├── Card/
    │   │   ├── Table/
    │   │   ├── Input/
    │   │   └── Alert/
    │   └── pages/                # Telas da aplicação
    │       ├── SalesList/        # Listagem de vendas realizadas
    │       ├── SaleCreate/       # Formulário dinâmico de nova venda
    │       └── Commissions/      # Consulta e relatório de comissões por período
    └── tests/                    # Testes automatizados do frontend
        ├── setup.ts              # Configuração do ambiente de teste com RTL
        ├── components/           # Testes de componentes
        └── pages/                # Testes de telas e fluxos
```

**Structure Decision**: Adoção da estrutura desacoplada em duas pastas principais (`backend/` e `frontend/`), orquestradas na raiz por arquivos `docker-compose.local.yml` (desenvolvimento) e `docker-compose.yml` (produção) com variáveis de ambiente independentes. Essa separação garante total independência de ciclo de vida, builds especializados e modularidade.

---

## Complexity Tracking

> Nenhuma violação ou excesso de abstração detectado. A arquitetura segue estritamente o princípio YAGNI e os 16 princípios da Constituição v1.0.0.

| Item Avaliado | Decisão Adotada | Justificativa de Simplicidade |
| :--- | :--- | :--- |
| **Arquitetura de Serviços** | Backend REST + Frontend SPA + DB | Evita microserviços múltiplos ou mensageria assíncrona dispensáveis para este teste. |
| **Administração de Cadastros**| Django Admin Nativo | Elimina necessidade de construir CRUDs manuais de produtos/clientes/vendedores no frontend, permitindo focar a interface do frontend nas telas operacionais de Vendas e Comissões solicitadas. |
| **Gerenciamento de Estado** | React Custom Hooks + Fetch/Axios | Evita complexidade de Redux ou bibliotecas externas pesadas para duas páginas. |
| **Cálculo de Comissão** | Classe de serviço pura no Backend | Isola a lógica matemática em função determinística e facilmente testável sem acoplar ao framework HTTP. |
