# SyloCRM 2.0 — AGENTS.md

Este arquivo é a fonte de verdade para desenvolvedores, agentes de IA, code review, CI e futuras equipes.

Leia completamente antes de implementar qualquer coisa.

---

## 1. O que é este projeto

SyloCRM 2.0 é um SaaS CRM multi-tenant reconstruído do zero com arquitetura limpa, modular, escalável, testável e observável.

O sistema antigo não será migrado. O novo é independente.

---

## 2. Stack

### Monorepo
- pnpm workspaces
- Turborepo

### Frontend
- React + TypeScript (strict)
- TanStack Query para server state
- Biome para lint e format

### Backend
- Node.js + TypeScript (strict)
- API REST independente do frontend
- Biome para lint e format

### Banco de dados
- PostgreSQL (hospedado no Supabase inicialmente)
- Supabase Auth para autenticação
- Supabase Storage para arquivos
- Supabase Migrations para versionamento de schema
- Drizzle ORM como camada tipada de acesso ao PostgreSQL (somente na Infrastructure)

### Deploy
- Frontend: Vercel
- Backend: Railway
- Banco/Auth/Storage: Supabase

### Qualidade
- TypeScript strict
- Biome
- Commitlint (Conventional Commits, em inglês)
- Knip (dead code detection)
- Vitest (unit e integration)
- Playwright (E2E)
- Codecov
- Stryker (mutation testing, quando apropriado)
- Testes arquiteturais

### Observabilidade
- OpenTelemetry
- Sentry (primeiro provider — outros podem ser adicionados)
- Logs, métricas, traces, error monitoring, performance monitoring

---

## 3. Arquitetura em camadas

```
Presentation
    ↓
Application
    ↓
Domain
    ↓
Infrastructure
```

### Presentation
- UI, interação, apresentação
- Gerenciamento de estado de interface (UI state)
- Server state via TanStack Query
- Nunca contém regras de negócio

### Application
- Casos de uso
- Orquestração de fluxos
- Aplicação das regras de negócio vindas do Domain

### Domain
- Regras de negócio puras
- Entidades, value objects, políticas, invariantes
- **Completamente isolado**: sem React, sem Supabase, sem PostgreSQL, sem Drizzle, sem HTTP
- Deve ser testável sem nenhum framework ou infraestrutura

### Infrastructure
- PostgreSQL, Supabase, Drizzle, APIs externas, Storage, Auth providers
- Implementa as interfaces (ports) definidas pelo Domain
- Nunca é importada diretamente pelo Domain ou Application

### Fluxo de dependência com banco de dados

```
Domain
  ↓
Application
  ↓
Port / Repository (interface TypeScript pura)
  ↓
Infrastructure
  ↓
Drizzle ORM
  ↓
PostgreSQL / Supabase
```

`supabase.from(...)` e imports do Drizzle nunca aparecem fora da camada Infrastructure.

---

## 4. API-first

- O backend é uma API independente consumida pelo frontend web
- A futura aplicação mobile usará a mesma API sem alterações arquiteturais
- Regras críticas de negócio ficam no backend, nunca no frontend
- O frontend é um cliente da API, não um repositório de lógica

---

## 5. Multi-tenancy

- Isolamento organizacional existe desde a arquitetura inicial
- O backend determina o contexto autorizado do usuário autenticado
- O `organization_id` enviado pelo frontend **nunca é confiado diretamente**
- O contexto é sempre resolvido a partir do token JWT + membership do usuário

---

## 6. Hierarquia organizacional

```
INCORPORADORA
    ↓
MASTER
    ↓
REPRESENTACAO
    ↓
VENDEDORES
```

### Tipos de organização (`organizations.type`)
- `INCORPORADORA`: nível mais alto, visão administrativa agregada
- `MASTER`: pertence a uma Incorporadora, possui múltiplas Representações
- `REPRESENTACAO`: pertence a exatamente um Master (ou é independente)

### Representação independente
- Usuário que não pertence a Master ou Incorporadora
- Cria uma `REPRESENTACAO` sem `parent_organization_id`
- Usa identidade visual Sylo por padrão
- Não é um sistema paralelo: é a mesma entidade `organization`

### Modelo de organizations

```
organizations
├── id
├── type                    (INCORPORADORA | MASTER | REPRESENTACAO)
├── parent_organization_id  (null para independentes e incorporadoras)
└── ...
```

### Invariantes
- Master possui exatamente uma Incorporadora
- Representação empresarial possui exatamente um Master
- Representação independente não possui pai
- Representação não pertence a dois Masters
- Master não pertence a duas Incorporadoras

---

## 7. Membership e roles

Modelo:

```
users
organizations
organization_memberships
```

- Um usuário pode pertencer a várias organizações
- O role está no membership, não no usuário
- O mesmo usuário pode ter roles diferentes em organizações diferentes

Exemplo:
```
João
├── Master A    → ADMIN
├── Representação B → SELLER
└── Representação C → MANAGER
```

Quando um Master cria um vendedor:
- Deve escolher obrigatoriamente uma ou mais Representações daquele Master
- Não pode selecionar Representações de outro Master

---

## 8. Autorização em camadas

**Role, Permission, Scope e Data Visibility são conceitos distintos e não devem ser confundidos.**

```
User
  ↓
Membership
  ↓
Organization
  ↓
Role               → abstração de negócio (ADMIN, MANAGER, SELLER)
  ↓
Permissions        → ações autorizadas (lead.read, lead.assign, ...)
  ↓
Data Scope         → alcance dos dados (own, representation, master, incorporadora)
  ↓
Data Visibility    → quais campos/detalhes podem ser visualizados
```

### Definições

**Authentication** — quem é o usuário?

**Authorization** — o que ele pode fazer?

**Data Scope** — quais registros ele pode acessar?

**Data Visibility** — quais campos desses registros ele pode ver?

### Roles (em inglês no código)

| Role    | Descrição                         |
|---------|-----------------------------------|
| ADMIN   | Administrador da organização      |
| MANAGER | Gerência operacional              |
| SELLER  | Vendedor, nível operacional       |

### Permissions (exemplos)

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
own             → apenas seus próprios registros
representation  → todos da representação
master          → todas as representações do Master
incorporadora   → visão agregada da estrutura completa
```

### Regra crítica
- Não implementar RBAC completo agora — apenas preservar a capacidade de evolução
- O sistema deve ser extensível: adicionar permissions e scopes sem alterar o Domain

### Visibilidade de leads

| Role / Scope    | Leads visíveis                                          |
|-----------------|---------------------------------------------------------|
| SELLER          | Apenas os seus próprios                                 |
| MANAGER (Rep.)  | Todos os leads da representação                         |
| ADMIN (Master)  | Todos os leads das representações do Master             |
| ADMIN (Incorp.) | Visão agregada (sem detalhes sensíveis por padrão)      |

A Incorporadora não visualiza dados sensíveis de leads (ex: telefones) por padrão.

---

## 9. Onboarding

No cadastro, o usuário informa se:
- Trabalha de forma independente
- Pertence a uma estrutura (pode informar código de organização)

O backend resolve:
```
Código → Organização → Hierarquia → Membership → Role → Permissions
```

O frontend não determina hierarquia.

---

## 10. Leads

- Target inicial: 20.000 leads por tenant
- Server-side pagination, filtering, sorting, search obrigatórios
- Seleção explícita de campos (nunca `SELECT *`)
- Cache, lazy loading, incremental loading, virtualização
- Server state via TanStack Query, separado de UI state
- O Kanban nunca renderiza milhares de cards simultaneamente
- Toda movimentação relevante de lead deve ser auditável
- O modelo deve permitir histórico de atribuição

---

## 11. Identidade visual

Herança:
```
Representação → Master → Incorporadora → Sylo
```

- Se a organização não tiver identidade própria, herda da superior
- Baseada em configuração e design tokens
- Nunca espalhar condicionais de empresas pelo código (`if isMasterX`)
- Representação independente usa identidade visual Sylo

---

## 12. Performance — regras P0

- Nunca carregar milhares de registros no cliente para filtrar ou renderizar
- Toda listagem com volume potencial deve ter paginação server-side
- Virtualização obrigatória para listas longas no frontend
- Kanban com virtualização ou carregamento incremental por coluna
- TanStack Query gerencia cache, stale time e invalidação de server state

---

## 13. Qualidade de código

- TypeScript strict em todo o projeto
- Biome para lint e formatação (não ESLint, não Prettier)
- Commitlint com Conventional Commits em inglês
- Knip para detectar código morto
- Sem `any` implícito
- Sem imports circulares entre camadas
- Camadas não podem importar para cima na hierarquia
- Drizzle e Supabase SDK apenas na camada Infrastructure

---

## 14. Testes

- Unit tests: Domain e Application (sem infraestrutura)
- Integration tests: Infrastructure com banco real ou container
- E2E: Playwright para fluxos críticos
- Architecture tests: validar que camadas não se violam
- Mutation testing: Stryker em módulos críticos
- Codecov para cobertura

---

## 15. Observabilidade

- OpenTelemetry como abstração (não acoplar ao Sentry diretamente no domínio)
- Sentry como primeiro provider
- Logs estruturados (JSON)
- Traces em fluxos críticos
- Métricas de performance
- Error monitoring com contexto (user, organization, action)
- Nunca logar dados sensíveis (senha, token, CPF, telefone completo)

---

## 16. Git e fluxo de trabalho

### Idioma
Tudo em inglês: commit messages, branch names, código, Issues, PRs.

### Commits — Conventional Commits
```
feat: add authentication module
fix: prevent duplicate lead assignment
refactor: isolate supabase adapter
test: add lead visibility tests
docs: update architecture contract
chore: configure ci pipeline
```

Commitlint garante essa convenção via hook.

### Fluxo
```
Implementation → Tests → Commit direto na main → Deploy
```

Time é dev solo revisando o próprio código antes de subir — Issue e Pull Request não são
obrigatórios. Não crie issues nem PRs por conta própria; só abra um quando o usuário pedir
explicitamente.

---

## 17. Definition of Done

Uma funcionalidade só está concluída quando:

- [ ] Implementação pronta
- [ ] Testes adequados (unit + integration conforme o caso)
- [ ] Lint passando (Biome)
- [ ] Typecheck passando (`tsc --noEmit`)
- [ ] Build passando
- [ ] Architecture checks passando
- [ ] Acessibilidade verificada
- [ ] Loading state implementado
- [ ] Empty state implementado
- [ ] Error state implementado
- [ ] Documentação necessária atualizada

---

## 18. O que nunca fazer

- `supabase.from(...)` fora da camada Infrastructure
- Imports do Drizzle fora da camada Infrastructure
- Confiar em `organization_id` enviado pelo frontend
- Carregar todos os leads no cliente para filtrar ou paginar
- Colocar regras de negócio no frontend
- Importar Infrastructure diretamente no Domain ou Application
- Usar `any` sem justificativa explícita documentada
- Espalhar condicionais de empresas pelo código
- Commitar sem testes passando
- Ignorar estados de loading/empty/error em qualquer tela
- Misturar Role, Permission, Scope e Data Visibility como se fossem a mesma coisa
- Commits em português

---

## 19. Referências

- `docs/architecture.md` — detalhamento técnico da arquitetura
- `docs/decisions/` — ADRs (Architecture Decision Records)
