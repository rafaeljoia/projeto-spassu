<!--
Sync Impact Report
Version change: None (Template) → 1.0.0
List of modified principles:
  - Initialized 16 mandatory core principles tailored for fullstack technical evaluation
Added sections:
  - Core Principles (I through XVI)
  - Mandatory Technology Stack
  - Development Workflow & Quality Gates
  - Governance
Removed sections:
  - Template placeholders
Follow-up TODOs:
  - None
-->

# Spassu Fullstack Challenge Constitution

## Core Principles

### I. Clean Code & Maintainability
Code MUST be clean, readable, expressive, and easily maintainable. All identifiers (variables, functions, methods, classes, modules, database columns, and API payloads) MUST be written in English following standard idioms (PEP 8 for Python, camelCase/PascalCase for TypeScript/React). Code structures MUST be intuitive, keeping cognitive complexity low and eliminating dead or duplicated code.

### II. Pragmatic Simplicity & YAGNI
Simplicity MUST be prioritized over speculative complexity. Unnecessary layers of abstraction, premature optimizations, speculative generalization, and boilerplate patterns are strictly prohibited. Every abstraction MUST deliver direct, tangible value to the solution.

### III. Separation of Concerns & Layered Architecture
The application MUST strictly isolate domain business rules, data access/persistence, HTTP/REST handling, and frontend user presentation into distinct layers. Business logic MUST NOT reside in database migrations, raw SQL queries within controllers, or frontend UI components.

### IV. Pragmatic SOLID Principles
SOLID principles MUST be applied with pragmatic balance. Single responsibility MUST govern classes, modules, and components. Abstractions and dependency inversion SHOULD be leveraged where they provide measurable testability or maintainability benefits, avoiding unnecessary indirection for straightforward CRUD operations.

### V. Targeted Automated Testing
Automated tests MUST comprehensively validate core business rules, commission and monetary calculations, edge cases, and critical execution paths. Backend unit and integration tests MUST verify API contracts and service correctness. Tests MUST be deterministic, fast, isolated, and runnable via standard commands.

### VI. RESTful API Design & OpenAPI/Swagger Specification
Backend APIs MUST conform to REST architectural constraints: resource-oriented URI naming, correct semantic HTTP verbs (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`), consistent status codes (`200`, `201`, `204`, `400`, `404`, `422`, `500`), and uniform JSON envelopes. All endpoints MUST be fully documented and interactively testable using OpenAPI Specification / Swagger interactive UI (via `drf-spectacular`).

### VII. Monetary Precision & pt-BR Currency Standards
Floating-point data types (`float` in Python or native floating-point math in JavaScript without exact scaling) MUST NEVER be used for monetary values, rates, or commission computations. The backend MUST enforce fixed-point arithmetic using Python's `Decimal` type and Django's `DecimalField`. Frontend display MUST format currency strictly according to Brazilian Portuguese standards (`pt-BR`, `BRL`, e.g., `R$ 1.234,56`) without causing rounding discrepancies against backend source data.

### VIII. Boundary-Level Data Validation
Data validation MUST be enforced strictly at system boundaries. Incoming HTTP payloads MUST be validated through Django REST Framework Serializers before reaching business logic. Frontend user inputs MUST be validated before submission to provide immediate visual feedback and prevent malformed requests. Validation failures MUST produce clear, structured `400 Bad Request` responses mapping errors to specific fields.

### IX. Externalized Configuration & Twelve-Factor App
Application configuration and secrets (including `SECRET_KEY`, database credentials, debug flags, allowed hosts, CORS domains, and API base URLs) MUST be completely decoupled from source code and managed via environment variables (`.env`). Hardcoded credentials or environment-specific values in version control are strictly prohibited.

### X. Modular Frontend Architecture & Predictable State
The frontend MUST be organized into modular, reusable UI components adhering to single responsibility. Presentational components MUST be decoupled from data fetching and container logic. Application and UI state MUST be managed predictably (via custom hooks, React Context, or lightweight state management) avoiding prop drilling and unnecessary re-renders.

### XI. Strict Separation of Backend and Frontend Responsibilities
The backend and frontend MUST maintain clear and non-overlapping responsibilities. The backend acts as the authoritative source of truth for business rules, calculations, security, and persistence. The frontend is exclusively responsible for user presentation, interaction, accessibility, and client-side usability. The backend MUST NOT generate HTML or depend on UI state; the frontend MUST NOT bypass backend APIs or replicate core backend logic unsafely.

### XII. Comprehensive Developer Documentation
The project MUST provide complete and unambiguous documentation in `README.md`. It MUST include: prerequisites, step-by-step local development setup instructions, database migration commands, server execution steps for both backend and frontend, test execution commands, and rationale for architectural decisions.

### XIII. Local Usability & Production Readiness
The application MUST be immediately runnable in a local development environment with minimal friction (e.g., standard virtual environment, npm, environment templates `.env.example`). At the same time, the codebase MUST remain production-ready: prepared for production WSGI/ASGI servers, static file management, environment-based configuration, and future containerization.

### XIV. Strict Scope Discipline & Value Delivery
Implementation MUST adhere strictly to the challenge requirements. Adding arbitrary, unrequested features ("gold plating") without technical justification is prohibited. Engineering effort MUST be concentrated on delivering a robust, clean, testable, and demonstrable solution for the required capabilities.

### XV. English Identifiers in Codebase
All programming language identifiers—including variable names, function names, class names, file names, directory names, database columns, and API schemas—MUST be written in English to preserve international software development standards and idiomatic framework consistency.

### XVI. Brazilian Portuguese (pt-BR) Comments & Explanations
Whenever inline comments, docstrings, or explanatory notes are necessary within code or documentation, they MUST be written in Brazilian Portuguese (`pt-BR`). Code MUST remain self-explanatory through expressive naming, reserving comments for non-obvious business rules or architectural trade-offs ("why", not "what").

## Mandatory Technology Stack

The project MUST strictly utilize the following core technologies:

- **Backend**: Python 3.11+ with Django
- **REST API**: Django REST Framework (DRF)
- **API Documentation**: OpenAPI Specification / Swagger (via `drf-spectacular`)
- **Frontend**: React with TypeScript (SPA built with Vite)
- **State & Data Fetching**: Modern React patterns (Custom hooks / Fetch / Axios)
- **Styling**: Clean, responsive, and professional styling (CSS Modules / Vanilla CSS)
- **Data Precision**: `decimal.Decimal` in Python, formatted via `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` in TypeScript

## Development Workflow & Quality Gates

1. **Code Standards Gate**:
   - Backend code MUST conform to PEP 8 standards and pass linting checks.
   - Frontend code MUST compile cleanly with TypeScript strict mode enabled and zero unchecked type errors.
2. **Testing Gate**:
   - Automated tests for backend business services and calculations MUST pass with 100% success before any feature is considered complete.
3. **API Contract Gate**:
   - Every exposed endpoint MUST match its OpenAPI schema specification and provide valid interactive Swagger testing.
4. **Documentation Gate**:
   - Any architectural decision, setup step, or environment dependency MUST be reflected in documentation before submission.

## Governance

This Constitution represents the highest engineering authority for the project. All architectural choices, technical plans, task definitions, pull requests, and implementations MUST strictly comply with these principles.

- **Amendments**: Amendments require documented rationale, impact analysis, and explicit user ratification.
- **Versioning Policy**: Semantic versioning (MAJOR for principle removals/incompatible shifts, MINOR for principle additions or substantive expansions, PATCH for clarifications).
- **Compliance**: Any deviation from this Constitution must be explicitly justified and approved.

**Version**: 1.0.0 | **Ratified**: 2026-09-17 | **Last Amended**: 2026-09-17
