# Research & Technical Decisions: Sistema de Vendas e Comissões de Papelaria

**Feature**: `001-sales-commission-system`
**Date**: 2026-09-17
**Status**: Completed

---

## 1. Backend Framework & Architecture

- **Decision**: Python 3.11+ com Django 5.x e Django REST Framework (DRF).
- **Rationale**:
  - Django fornece o Django Admin nativo e seguro para gestão administrativa de produtos, clientes, vendedores e configuração de regras de comissão por dia da semana sem necessidade de desenvolvimento de painéis extras.
  - O Django REST Framework oferece serialização robusta, validação automática nas fronteiras e integração direta com o ORM.
  - A arquitetura adotará uma camada explícita de serviços de domínio (`services/commission_service.py`), separando as regras de negócio das views e serializers.
- **Alternatives Considered**:
  - *FastAPI*: Excelente desempenho assíncrono, mas não possui módulo de administração integrado equivalente ao Django Admin, exigindo desenvolvimento de painéis administrativos adicionais ou bibliotecas de terceiros menos maduras (ex.: SQLAdmin).
  - *Flask*: Abordagem minimalista que exigiria montagem manual de ORM, migrações, autenticação e admin, aumentando o esforço sem ganho técnico no escopo do teste.

---

## 2. Database & Persistence Layer

- **Decision**: PostgreSQL 16+ via container Docker como banco principal de desenvolvimento e produção, utilizando driver `psycopg` 3.
- **Rationale**:
  - Banco relacional robusto, padrão em aplicações empresariais e compatível com ACID.
  - Suporte nativo e de alta precisão ao tipo `NUMERIC` / `DECIMAL`, eliminando divergências de arredondamento.
  - Para execução de testes automatizados unitários no CI/local, o Django suporta rodar a suíte diretamente no PostgreSQL ou em banco em memória isolado para velocidade máxima.
- **Alternatives Considered**:
  - *SQLite em produção*: Descartado por restrições de concorrência e por contrariar o requisito de prontidão para execução em ambiente produtivo.
  - *MySQL/MariaDB*: Totalmente viável, mas o PostgreSQL é mais alinhado aos padrões modernos de Django e ao ecossistema do teste técnico.

---

## 3. API Documentation & OpenAPI Specification

- **Decision**: `drf-spectacular` gerando especificação OpenAPI 3.0 com interface interativa Swagger UI (`/api/docs/`) e visualização alternativa via Redoc (`/api/redoc/`).
- **Rationale**:
  - `drf-spectacular` é o padrão da comunidade Django REST Framework para OpenAPI 3, com suporte completo a tipagem, schemas aninhados, serializers e parâmetros de query.
  - Cumpre com exatidão o Princípio VI da Constituição e os requisitos de documentação interativa.
- **Alternatives Considered**:
  - *drf-yasg*: Suporta apenas OpenAPI 2.0 (Swagger 2.0 legado), sem suporte atualizado para tipos modernos e schemas complexos.

---

## 4. Financial Calculations & Precision Strategy

- **Decision**: Utilização estrita de `decimal.Decimal` no Python, com `DecimalField(max_digits=12, decimal_places=2)` para valores monetários e `DecimalField(max_digits=5, decimal_places=2)` para percentuais.
- **Rationale**:
  - Tipos de ponto flutuante binário (`float` no Python ou `number` no JS) sofrem com representações inexatas (ex.: `0.1 + 0.2 != 0.3`).
  - As operações de cálculo (valor total do item e comissão do item) realizam arredondamento financeiro padronizado (`ROUND_HALF_UP` ou `ROUND_HALF_EVEN`) para 2 casas decimais.
  - O percentual nominal do produto é limitado entre 0,00% e 10,00%, e o percentual efetivo é delimitado pelos limites mínimo e máximo configurados para o dia da semana da venda.
- **Alternatives Considered**:
  - *Armazenamento em centavos inteiros (Integer cents)*: Embora comum em gateways de pagamento, adiciona complexidade e conversões constantes entre representações monetárias e percentuais de comissão fracionados, sem vantagem no Django que já possui `DecimalField` nativo de alta precisão.

---

## 5. Frontend Architecture & Tooling

- **Decision**: Single Page Application (SPA) com React 18+, TypeScript e Vite.
- **Rationale**:
  - Inicialização e compilação ultra-rápidas com Vite.
  - TypeScript em modo estrito (`strict: true`) garante tipagem estática de ponta a ponta, espelhando os contratos de dados da API.
  - Componentização modular separando componentes de UI (tabelas, cards, formulários, botões) de componentes de página/contêineres de lógica.
  - Seguirá fielmente o design system, layout, tipografia, cores e espaçamentos do protótipo Figma fornecido pela Spassu.
- **Alternatives Considered**:
  - *Next.js*: Adiciona complexidade de servidor Node.js (SSR/SSG), roteamento no servidor e dependências extras para um sistema administrativo de papelaria que opera de forma ideal como SPA desacoplada consumindo a API REST do Django.
  - *Create React App (CRA)*: Descontinuado e obsoleto.

---

## 6. Frontend State Management & API Communication

- **Decision**: Camada de serviços HTTP com `Axios` (ou `Fetch` tipado) combinada com custom hooks (`useSales`, `useCommissions`, `useProducts`, `useCustomers`, `useSalespeople`).
- **Rationale**:
  - Desacopla a interface visual das chamadas de rede.
  - Centraliza tratamento de erros HTTP (400, 404, 500) e interceptores para URLs base e headers.
  - Fornece estados previsíveis (`loading`, `error`, `data`) sem a necessidade de bibliotecas de estado global pesadas como Redux, preservando o princípio YAGNI.
- **Alternatives Considered**:
  - *Redux Toolkit*: Complexidade excessiva para 2 funcionalidades operacionais (Vendas e Comissões).
  - *TanStack Query*: Excelente ferramenta, mas custom hooks encapsulando `fetch/axios` fornecem a simplicidade e leveza ideais para o desafio técnico sem sobrecarregar o bundle.

---

## 7. Frontend Testing Suite

- **Decision**: `Vitest` com `React Testing Library` (`@testing-library/react`) e `@testing-library/jest-dom` rodando em ambiente `jsdom`.
- **Rationale**:
  - Integração nativa com Vite (compartilha configurações e plugins), inicialização instantânea e suporte nativo a TypeScript e JSX.
  - React Testing Library foca em testar o comportamento do usuário e renderização de acessibilidade em vez de detalhes internos de implementação.
- **Alternatives Considered**:
  - *Jest*: Exigiria configurações adicionais complexas de Babel/ts-jest para funcionar em sincronia com o build do Vite.

---

## 8. Containers & Environment Strategy

- **Decision**:
  - Orquestração com Docker Compose contendo 3 serviços principais:
    1. `backend`: Imagem Python 3.11 com Django/Gunicorn, expondo porta 8000.
    2. `frontend`: Imagem Node/Vite (dev) ou Nginx servindo build estático (prod), expondo porta 3000/80.
    3. `db`: Imagem PostgreSQL 16 Alpine com volume persistente de dados, expondo porta 5432.
  - Estratégia de variáveis de ambiente:
    - `.env.example`: Arquivo versionado contendo todas as chaves necessárias com valores de exemplo seguros.
    - `.env.local` / `.env`: Arquivos ignorados pelo Git contendo configurações para o ambiente local.
    - `.env.prod`: Arquivo contendo parametrizações para produção (sem segredos em versionamento).
- **Rationale**:
  - Garante execução reproduzível com um único comando (`docker compose up --build`).
  - Total isolamento de dependências no host local.
  - Aderência aos princípios do Twelve-Factor App (Configuração externalizada no ambiente).
