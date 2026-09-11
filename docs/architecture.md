# SyloCRM 2.0 — Contrato Arquitetural

> Fonte de verdade técnica do projeto. Atualizar este documento a cada decisão arquitetural relevante.

---

## Visão geral

O SyloCRM 2.0 é um SaaS CRM multi-tenant reconstruído do zero. O sistema antigo não é migrado. A nova arquitetura é independente e preparada para escala, mobilidade e observabilidade.

---

## Estrutura do monorepo

Gerenciador de pacotes: **pnpm**. Orquestração de builds: **Turborepo**.

```
sylocrm/
├── apps/
│   ├── web/              # Frontend React + TypeScript
│   └── api/              # Backend Node.js + TypeScript
├── packages/
│   ├── domain/           # Regras de negócio puras (zero dependências externas)
│   ├── application/      # Casos de uso e orquestração
│   ├── infrastructure/   # Adapters: Drizzle, Supabase, Storage, Auth
│   ├── ui/               # Design system e componentes compartilhados
│   ├── shared/           # Tipos, DTOs, schemas, utilitários compartilhados
│   ├── config/           # Configurações compartilhadas (tsconfig, biome, etc.)
│   └── testing/          # Utilitários e fixtures de teste compartilhados
├── docs/
│   ├── architecture.md   # Este arquivo
│   └── decisions/        # ADRs
├── AGENTS.md
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

### Critério para criar um novo package
Um novo package é criado quando o código precisa ser compartilhado entre dois ou mais apps, ou quando representa uma camada arquitetural distinta. Não criar packages por antecipação.

---

## Arquitetura em camadas

### Diagrama geral

```
┌─────────────────────────────────────────────┐
│                  Presentation               │
│    (React, componentes, UI state,           │
│     TanStack Query como server state)       │
└────────────────────┬────────────────────────┘
                     │ consome (via API HTTP)
┌────────────────────▼────────────────────────┐
│                  Application                │
│        (use cases, orquestração)            │
└────────────────────┬────────────────────────┘
                     │ usa
┌────────────────────▼────────────────────────┐
│                    Domain                   │
│   (entidades, value objects, políticas,     │
│    invariantes, interfaces de repository)   │
└────────────────────┬────────────────────────┘
                     │ implementado por
┌────────────────────▼────────────────────────┐
│                Infrastructure               │
│   (Drizzle ORM, Supabase, Storage,          │
│    Auth providers, APIs externas)           │
└─────────────────────────────────────────────┘
```

### Regras de dependência

| Camada         | Pode importar de          | Não pode importar de                         |
|----------------|---------------------------|----------------------------------------------|
| Presentation   | Application, Domain       | Infrastructure diretamente                   |
| Application    | Domain                    | Infrastructure diretamente (usa ports)       |
| Domain         | —                         | Tudo (zero dependências externas)            |
| Infrastructure | Domain, Application       | Presentation                                 |

O Domain é o núcleo imutável. Nenhuma camada externa pode influenciar suas definições.

---

## Domain

### Responsabilidades
- Entidades com identidade e ciclo de vida (ex: `Lead`, `Organization`, `User`)
- Value objects imutáveis (ex: `Email`, `OrganizationCode`, `OrganizationType`)
- Políticas e regras de negócio que não dependem de infraestrutura
- Invariantes: condições que nunca podem ser violadas
- Interfaces de repository (ports): definem contratos sem implementação

### Restrições absolutas
- Sem imports de React, Supabase, Drizzle, PostgreSQL, HTTP, Express
- Sem efeitos colaterais de infraestrutura
- Testável com Vitest puro, sem mocks de frameworks externos

### Exemplo de estrutura

```
packages/domain/
├── entities/
│   ├── organization.ts
│   ├── user.ts
│   ├── lead.ts
│   └── membership.ts
├── value-objects/
│   ├── email.ts
│   ├── organization-type.ts
│   └── organization-code.ts
├── policies/
│   ├── data-visibility.policy.ts
│   └── lead-assignment.policy.ts
├── repositories/
│   ├── organization.repository.ts   # interface pura
│   ├── user.repository.ts           # interface pura
│   └── lead.repository.ts           # interface pura
└── errors/
    ├── domain.error.ts
    └── validation.error.ts
```

---

## Application

### Responsabilidades
- Implementar casos de uso concretos
- Orquestrar entidades e repositories do Domain
- Aplicar políticas de negócio em fluxos reais
- Emitir eventos de domínio quando necessário

### Exemplo de estrutura

```
packages/application/
├── use-cases/
│   ├── create-organization.use-case.ts
│   ├── invite-member.use-case.ts
│   ├── assign-lead.use-case.ts
│   └── process-onboarding.use-case.ts
└── dtos/
    ├── create-organization.dto.ts
    └── assign-lead.dto.ts
```

---

## Infrastructure

### Responsabilidades
- Implementar as interfaces de repository definidas no Domain
- Adaptar respostas do banco para entidades do Domain
- Gerenciar conexões externas (banco, storage, auth)
- Isolar completamente Drizzle e `supabase.from(...)` nesta camada

### Fluxo de acesso ao banco de dados

```
Domain (interface LeadRepository)
  ↓
Infrastructure (DrizzleLeadRepository implements LeadRepository)
  ↓
Drizzle ORM
  ↓
PostgreSQL / Supabase
```

O Domain define a interface. A Infrastructure implementa com Drizzle.
Trocar o banco ou o ORM no futuro exige apenas uma nova implementação — o domínio não muda.

### Por que Drizzle

- Type-safe sem abstrações que escondam SQL importante
- Performance, índices e queries complexas permanecem controláveis
- Próximo do SQL real: o desenvolvedor sabe o que está sendo executado
- Schema-first: schema TypeScript como fonte de verdade, Supabase Migrations para versionamento

### Schema e migrations

- O schema Drizzle fica em `packages/infrastructure/database/schema/`
- As migrations são geradas com `drizzle-kit` e aplicadas via Supabase Migrations
- O schema Drizzle e o schema SQL devem permanecer sincronizados

### Exemplo de estrutura

```
packages/infrastructure/
├── database/
│   ├── client.ts                   # conexão Drizzle
│   ├── schema/
│   │   ├── organizations.ts
│   │   ├── users.ts
│   │   ├── memberships.ts
│   │   └── leads.ts
│   ├── repositories/
│   │   ├── drizzle-organization.repository.ts
│   │   ├── drizzle-lead.repository.ts
│   │   └── drizzle-membership.repository.ts
│   └── migrations/
├── auth/
│   └── supabase-auth.adapter.ts
└── storage/
    └── supabase-storage.adapter.ts
```

---

## Autenticação

### Provider de identidade

O Supabase Auth gerencia credenciais e emite JWTs. Ele fica isolado na camada Infrastructure
atrás do port `IAuthProvider`. O restante da aplicação nunca importa tipos do SDK Supabase.

```
Infrastructure → SupabaseAuthAdapter implements IAuthProvider
Application    → usa IAuthProvider (não conhece Supabase)
Domain         → sem dependência de auth
```

### Sessão

- Access token (JWT, 1h) + refresh token rotativo gerenciados pelo Supabase Auth
- Frontend usa `@supabase/ssr`: tokens armazenados em cookies httpOnly — nunca em localStorage
- API recebe o access token em `Authorization: Bearer <token>`
- API valida via `IAuthProvider.verifyToken()` sem acessar o Supabase diretamente

### Pipeline por requisição

```
Request
  ↓
authMiddleware      → verifica token → extrai identidade → 401 se inválido
  ↓
tenantMiddleware    → valida X-Organization-Id → resolve membership → 403 se ausente
  ↓
Use Case            → recebe AuthenticatedContext → verifica permissions → filtra por scope
  ↓
Response            → serializer aplica Data Visibility antes de retornar
```

### AuthenticatedContext

Após os middlewares, todos os use cases trabalham exclusivamente com `AuthenticatedContext`.
Nenhum use case conhece Supabase.

```typescript
interface AuthenticatedContext {
  identityId: string                                 // = userId (Supabase Auth ID = users.id)
  userId: string
  currentMembership: MembershipContext               // organização desta requisição
  availableMemberships: readonly MembershipContext[] // todas as organizações do usuário
}

interface MembershipContext {
  organizationId: string
  organizationType: OrganizationType    // INCORPORADORA | MASTER | REPRESENTACAO
  role: Role                            // ADMIN | MANAGER | SELLER
  dataScope: DataScope                  // own | representation | master | incorporadora
  permissions: readonly Permission[]    // calculado a partir do role
}
```

### RLS

O backend usa a Supabase service key — ela ignora Row Level Security. A segurança reside
na camada Application (middleware + use cases), não no RLS. Ver ADR-12.

---

## Multi-tenancy

### Princípio

O contexto organizacional do usuário é sempre resolvido pelo backend, nunca pelo frontend.

### Fluxo de autorização

```
Request (JWT)
  ↓
Auth Middleware → extrai user_id do token
  ↓
Tenant Middleware → resolve memberships ativos do usuário
  ↓
Context → { userId, organizationId, role, permissions, dataScope }
  ↓
Use Case → usa o contexto para filtrar e autorizar dados
```

O `organization_id` enviado pelo cliente é validado contra os memberships reais do usuário antes de qualquer operação.

---

## Autorização em camadas

**Role, Permission, Scope e Data Visibility são conceitos distintos.**

### Definições

| Conceito         | Pergunta respondida                           | Exemplo                            |
|------------------|-----------------------------------------------|------------------------------------|
| Authentication   | Quem é o usuário?                             | JWT válido → user_id               |
| Authorization    | O que ele pode fazer?                         | `lead.assign` permitido?           |
| Data Scope       | Quais registros ele pode acessar?             | Apenas da sua representação        |
| Data Visibility  | Quais campos desses registros ele pode ver?   | Telefone visível? CPF mascarado?   |

### Roles (nomes em inglês no código)

| Role    | Descrição                    |
|---------|------------------------------|
| ADMIN   | Administrador da organização |
| MANAGER | Gerência operacional         |
| SELLER  | Vendedor, nível operacional  |

### Permissions (exemplos — não exaustivo)

```
lead.read
lead.create
lead.update
lead.assign
lead.delete
user.invite
reports.read
```

### Data Scope (exemplos)

```
own             → apenas registros do próprio usuário
representation  → todos da representação
master          → todas as representações do Master
incorporadora   → visão agregada da estrutura completa
```

### Regra de implementação
- Roles são abstrações de negócio — não devem carregar lógica de permissão diretamente
- Permissions são derivadas do Role + contexto da Organization no momento da requisição
- Scope é calculado a partir do membership ativo
- Data Visibility é aplicada na camada de apresentação dos dados (serialização da resposta)
- Não implementar RBAC completo no MVP — preservar a capacidade de evolução

---

## Modelo de dados conceitual

### Organizations

```sql
organizations
├── id                      uuid, PK
├── name                    text, NOT NULL
├── type                    enum(INCORPORADORA, MASTER, REPRESENTACAO)
├── parent_organization_id  uuid, FK → organizations.id, nullable
├── branding                jsonb  -- logo, cores, fontes, design tokens
├── created_at              timestamptz
└── updated_at              timestamptz
```

**Invariantes:**
- `INCORPORADORA`: `parent_organization_id` é sempre null
- `MASTER`: `parent_organization_id` aponta para uma `INCORPORADORA`
- `REPRESENTACAO` empresarial: `parent_organization_id` aponta para um `MASTER`
- `REPRESENTACAO` independente: `parent_organization_id` é null

### Users

```sql
users
├── id          uuid, PK (mesmo ID do Supabase Auth)
├── email       text, UNIQUE
├── name        text
├── created_at  timestamptz
└── updated_at  timestamptz
```

### Organization Memberships

```sql
organization_memberships
├── id               uuid, PK
├── user_id          uuid, FK → users.id
├── organization_id  uuid, FK → organizations.id
├── role             enum(ADMIN, MANAGER, SELLER)
├── status           enum(ACTIVE, INVITED, SUSPENDED)
├── created_at       timestamptz
└── updated_at       timestamptz

UNIQUE (user_id, organization_id)
```

### Leads

```sql
leads
├── id               uuid, PK
├── organization_id  uuid, FK → organizations.id
├── assigned_to      uuid, FK → users.id, nullable
├── name             text
├── phone            text
├── email            text
├── status           text
├── kanban_column    text
├── position         integer
├── created_at       timestamptz
└── updated_at       timestamptz

INDEX (organization_id, kanban_column, position)
INDEX (organization_id, assigned_to)
```

### Lead Assignment History

```sql
lead_assignment_history
├── id              uuid, PK
├── lead_id         uuid, FK → leads.id
├── from_user_id    uuid, FK → users.id, nullable
├── to_user_id      uuid, FK → users.id, nullable
├── changed_by      uuid, FK → users.id
├── reason          text
└── created_at      timestamptz
```

---

## Hierarquia organizacional

```
INCORPORADORA
    ├── visão administrativa agregada
    ├── pode possuir vários Masters
    └── não visualiza detalhes sensíveis de leads (ex: telefones) por padrão

MASTER
    ├── pertence a exatamente uma Incorporadora
    ├── pode possuir múltiplas Representações
    └── ao criar vendedor, deve vincular a uma ou mais Representações suas

REPRESENTACAO
    ├── pertence a exatamente um Master (estrutura empresarial)
    │   ou não possui pai (independente)
    ├── pode possuir vendedores
    └── gerencia seus próprios leads

VENDEDOR (role SELLER)
    ├── nível operacional
    ├── pode pertencer a múltiplas Representações
    └── visualiza apenas seus próprios leads
```

---

## Visibilidade de dados

| Scope           | Leads acessíveis                                         | Detalhes sensíveis |
|-----------------|----------------------------------------------------------|--------------------|
| own             | Apenas os seus próprios                                  | Sim                |
| representation  | Todos os leads da representação                          | Sim                |
| master          | Todos os leads das representações do Master              | Sim                |
| incorporadora   | Visão agregada de toda a estrutura                       | Não (por padrão)   |

Data Scope é calculado no backend com base no membership + role do usuário autenticado.

---

## Performance — requisito P0

Target: **20.000 leads por tenant**.

### Backend
- Paginação server-side obrigatória em todas as listagens
- Filtros, ordenação e busca processados no banco via Drizzle
- Seleção explícita de colunas (nunca `SELECT *`)
- Índices em colunas de filtragem e ordenação frequente
- Cache em consultas de alta frequência e baixa volatilidade

### Frontend (TanStack Query)
- Toda chamada à API passa por TanStack Query
- Server state isolado de UI state
- Cache, stale time e invalidação controlados explicitamente por recurso
- Kanban com carregamento incremental por coluna (lazy por coluna)
- Virtualização de listas longas quando necessário
- Nunca buscar "todos os leads" para filtrar no cliente
- Debounce em campos de busca antes de disparar queries

---

## Frontend server state — TanStack Query

TanStack Query é o único mecanismo de server state no frontend.

### Princípios
- `useQuery` para leitura — nunca armazenar respostas de API em `useState` diretamente
- `useMutation` para escrita — com invalidação explícita de queries relacionadas
- Query keys são estruturadas e tipadas (ex: `['leads', orgId, filters]`)
- Paginação via `useInfiniteQuery` ou cursor-based conforme o caso
- Dados de listagem nunca vivem em estado global manual (Zustand, Context)

### Separação de estados
- **Server state**: dados do backend — gerenciados por TanStack Query
- **UI state**: modais, tabs, inputs — gerenciados por `useState` / `useReducer` / Zustand conforme complexidade

---

## Identidade visual (Branding)

### Herança de tema

```
Configuração da Representação
  ↓ (fallback)
Configuração do Master
  ↓ (fallback)
Configuração da Incorporadora
  ↓ (fallback)
Tema padrão Sylo
```

### Implementação
- Design tokens em variáveis CSS (ex: `--color-primary`, `--color-surface`)
- Branding armazenado como `jsonb` em `organizations.branding`
- Resolução de tema feita server-side ou no carregamento da sessão
- Nunca: `if (organization.name === 'Empresa X') { ... }`

---

## Onboarding

```
Usuário se cadastra
  ↓
Informa: independente ou pertence a estrutura
  ↓ (se estrutura)
Informa código de organização
  ↓
Backend resolve:
  Código → Organization → Membership → Role → Permissions
  ↓
Sessão criada com contexto completo
```

O frontend não determina nenhuma decisão de hierarquia ou permissão.

---

## Observabilidade

### Stack
- **OpenTelemetry**: abstração central (não acoplar ao Sentry no domínio)
- **Sentry**: primeiro provider de error e performance monitoring
- Outros providers adicionados implementando adapters de observabilidade

### O que instrumentar
- Todos os use cases (duração, sucesso, erro)
- Todas as queries ao banco (duração, tabela, operação)
- Chamadas a APIs externas
- Erros com contexto: `{ userId, organizationId, action }`

### Logs
- Logs estruturados (JSON)
- Nunca logar dados sensíveis (senha, token, CPF, telefone completo)
- Nível: `debug` em dev, `info` em prod, `error` sempre

---

## Qualidade e CI

### Pipeline obrigatório (PR e main)

```
lint (Biome)
  ↓
typecheck (tsc --noEmit)
  ↓
unit tests (Vitest)
  ↓
integration tests (Vitest + banco)
  ↓
architecture tests
  ↓
build
  ↓
E2E (Playwright) — em staging
```

### Ferramentas

| Ferramenta  | Uso                                          |
|-------------|----------------------------------------------|
| Biome       | Lint + format (substitui ESLint + Prettier)  |
| Commitlint  | Conventional Commits em inglês               |
| Knip        | Detectar código morto e exports não usados   |
| Vitest      | Unit e integration tests                     |
| Playwright  | E2E                                          |
| Codecov     | Cobertura de testes                          |
| Stryker     | Mutation testing em módulos críticos         |

---

## Git

### Idioma
Tudo em inglês: commits, branches, código, Issues, PRs.

### Conventional Commits

```
feat: add authentication module
fix: prevent duplicate lead assignment
refactor: isolate supabase adapter
test: add lead visibility tests
docs: update architecture contract
chore: configure ci pipeline
```

### Fluxo

```
Issue → Branch → Implementation → Tests → Pull Request → CI → Review → Merge → Deploy
```

Pull Requests referenciam a Issue: `Closes #123`

---

## Decisões arquiteturais registradas

| ID     | Decisão                                                         | Status | ADR                           |
|--------|-----------------------------------------------------------------|--------|-------------------------------|
| ADR-01 | Supabase como infra inicial, isolado via ports                  | Aceito | —                             |
| ADR-02 | Domain package sem dependências externas                        | Aceito | —                             |
| ADR-03 | Biome em lugar de ESLint + Prettier                             | Aceito | —                             |
| ADR-04 | Membership como entidade central de autorização                 | Aceito | decisions/adr-04-auth-model.md|
| ADR-05 | Paginação sempre server-side para listas com volume             | Aceito | —                             |
| ADR-06 | OpenTelemetry como abstração de observabilidade                 | Aceito | —                             |
| ADR-07 | pnpm + Turborepo como monorepo toolchain                        | Aceito | decisions/adr-07-monorepo.md  |
| ADR-08 | Drizzle ORM + Supabase Migrations para acesso ao banco          | Aceito | decisions/adr-08-database.md  |
| ADR-09 | TanStack Query para server state no frontend                    | Aceito | decisions/adr-09-server-state.md |
| ADR-10 | Conventional Commits em inglês                                  | Aceito | —                             |
| ADR-11 | Role != Permission != Scope != Data Visibility                  | Aceito | decisions/adr-04-auth-model.md|
| ADR-12 | Arquitetura de autenticação: Supabase Auth isolado via port     | Aceito | decisions/adr-12-authentication.md |

Novas decisões relevantes devem ser adicionadas aqui e detalhadas em `docs/decisions/`.

---

## O que NÃO está neste documento

Detalhes de implementação específicos (schemas SQL finais, endpoints exatos, componentes de UI) ficam nos documentos de cada módulo. Este documento define os contratos e princípios que nenhum módulo pode violar.
