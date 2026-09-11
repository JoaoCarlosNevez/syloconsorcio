# SyloCRM 2.0 — Handoff

**Data:** 2026-09-08
**Sessão:** Fundação técnica do monorepo

---

## O que foi feito nesta sessão

### 1. Contrato arquitetural
Criamos e consolidamos dois documentos que funcionam como fonte de verdade para o projeto:

- `/AGENTS.md` — regras operacionais para desenvolvedores, agentes de IA e futuras equipes
- `/docs/architecture.md` — detalhamento técnico da arquitetura em camadas

E quatro ADRs em `/docs/decisions/`:

| ADR | Decisão |
|-----|---------|
| ADR-04 | Role ≠ Permission ≠ Scope ≠ Data Visibility |
| ADR-07 | pnpm + Turborepo (por que não Nx) |
| ADR-08 | Drizzle ORM + Supabase Migrations (por que não Prisma) |
| ADR-09 | TanStack Query para server state (raiz do problema do MVP) |

### 2. Fundação técnica implementada

Monorepo funcionando do zero com 64 arquivos. Tudo testado e passando.

---

## Estado atual do repositório

```
sylocrm/
├── apps/
│   ├── api/           Fastify 5 + TypeScript strict + Zod
│   └── web/           React 19 + Vite 6 + TanStack Query v5
├── packages/
│   ├── domain/        Zero dependências externas
│   ├── application/   Depende só de @sylocrm/domain
│   ├── infrastructure/ Drizzle + observability ports
│   ├── shared/        Tipos compartilhados (ApiResponse, Pagination)
│   ├── ui/            Vazio — aguarda design system
│   ├── config/        tsconfig/base|node|react.json
│   └── testing/       Testes arquiteturais (30 assertions)
├── .github/workflows/ci.yml
├── docs/
│   ├── architecture.md
│   └── decisions/ (4 ADRs)
├── AGENTS.md
└── [config files: biome, turbo, commitlint, knip, pnpm-workspace]
```

---

## Resultados dos testes (última execução)

```
Arch — domain isolation       15/15 ✓
Arch — application isolation  15/15 ✓
API  — GET /health             4/4  ✓
Web  — App renders             2/2  ✓
─────────────────────────────────────
Total                         36/36 ✓

Biome (lint + format)         ✓ 57 files, 0 errors
TypeScript strict             ✓ 0 errors
Build (Vite + tsc)            ✓
```

---

## Como rodar amanhã

```bash
# Entrar no projeto
cd "C:\Users\Ennyo Cafe\Downloads\Sylocom"

# Instalar dependências (já instalado, mas caso precise)
pnpm install

# Rodar API e web em paralelo
pnpm dev
# API:  http://localhost:3001
# Web:  http://localhost:5173

# Verificar que a fundação está sã
pnpm lint
pnpm typecheck
pnpm test
```

Abrir no browser:
- `http://localhost:3001/health` → deve retornar `{ status: "ok", timestamp, version }`
- `http://localhost:5173` → página técnica mostrando status da API

---

## Scripts disponíveis

| Comando | O que faz |
|---------|-----------|
| `pnpm dev` | Inicia api + web em paralelo |
| `pnpm lint` | Biome check em todos os arquivos |
| `pnpm lint:fix` | Biome check --write (auto-fix) |
| `pnpm typecheck` | tsc --noEmit em todos os workspaces |
| `pnpm test` | Unit tests + architecture tests |
| `pnpm test:unit` | Só unit tests |
| `pnpm test:arch` | Só architecture tests |
| `pnpm build` | Build completo |
| `pnpm knip` | Detecta código morto |

---

## Stack decidida (definitiva)

| Camada | Tecnologia |
|--------|-----------|
| Package manager | pnpm 9.x |
| Build orchestration | Turborepo 2.x |
| Frontend | React 19 + Vite 6 + TypeScript |
| Backend | Node.js 22 + Fastify 5 + TypeScript |
| Server state | TanStack Query v5 |
| ORM | Drizzle ORM (só em packages/infrastructure) |
| Banco | PostgreSQL via Supabase |
| Migrations | Drizzle Kit → Supabase Migrations |
| Lint/format | Biome 1.9.4 |
| Commits | Conventional Commits em inglês |
| CI | GitHub Actions |
| Deploy API | Railway |
| Deploy Web | Vercel |

---

## Decisões arquiteturais gravadas

### Camadas (não violar)

```
Presentation (React)
    ↓
Application (use cases) — só pode importar domain
    ↓
Domain (entidades, erros, interfaces) — ZERO dependências externas
    ↓
Infrastructure (Drizzle, Supabase) — única camada que importa ORM
```

### Autorização (não confundir)

```
Role    → quem o usuário é (ADMIN, MANAGER, SELLER)
Permission → o que pode fazer (lead.read, user.invite)
Scope   → quais dados acessa (own, representation, master, incorporadora)
Visibility → quais campos pode ver
```

### Multi-tenancy
- `organization_id` enviado pelo frontend **nunca é confiado diretamente**
- Backend resolve sempre a partir do JWT + membership real

### Performance P0
- 20.000 leads por tenant
- Paginação sempre server-side
- TanStack Query gerencia cache — nunca `useState` para dados de API
- Kanban: lazy loading por coluna, nunca carregar tudo

---

## O que NÃO foi implementado (próxima etapa)

Nada de negócio foi tocado. Não existe:

- Login / autenticação
- Supabase Auth conectado
- Schema SQL de produção (leads, users, organizations, memberships)
- Rotas de CRM
- Organização / hierarquia
- RBAC
- Kanban
- Dashboard
- Onboarding

---

## Próximos passos sugeridos (em ordem)

### Etapa 2 — Autenticação
1. Conectar Supabase Auth no backend
2. Middleware JWT no Fastify
3. Rota `POST /auth/login` e `POST /auth/refresh`
4. Hook `useAuth` no frontend com TanStack Query
5. Rota protegida de exemplo

### Etapa 3 — Schema de banco
1. Criar schema Drizzle: `organizations`, `users`, `organization_memberships`
2. Gerar migration: `pnpm --filter @sylocrm/infrastructure db:generate`
3. Aplicar no Supabase
4. Repositories: `DrizzleOrganizationRepository`, `DrizzleMembershipRepository`

### Etapa 4 — Multi-tenancy e contexto
1. Tenant middleware (resolve membership a partir do JWT)
2. Contexto de request: `{ userId, organizationId, role, permissions, dataScope }`
3. Use case base com contexto

### Etapa 5 — Leads
1. Schema `leads` + `lead_assignment_history`
2. Listagem com paginação server-side (P0)
3. Kanban com lazy loading por coluna

---

## Arquivos-chave para ler antes de continuar

| Arquivo | Por que ler |
|---------|-------------|
| `/AGENTS.md` | Regras operacionais do projeto |
| `/docs/architecture.md` | Contratos técnicos e modelo de dados |
| `/docs/decisions/adr-08-database.md` | Workflow de migrations Drizzle |
| `/docs/decisions/adr-09-server-state.md` | Regras do TanStack Query |
| `apps/api/src/app.ts` | Ponto de entrada da API |
| `packages/domain/src/index.ts` | O que o domain exporta hoje |
| `packages/testing/src/arch/` | Como os testes arquiteturais funcionam |

---

## Observações técnicas

- **Node 24 instalado** (projeto pede 22.x no `.nvmrc`). Warning cosmético — tudo funciona. Para alinhar: instalar nvm e rodar `nvm use` na raiz.
- **Git não inicializado**. O Husky está configurado mas só ativa após `git init && pnpm install`.
- **Sem `.env`**. Criar `apps/api/.env` copiando de `apps/api/.env.example` com as variáveis necessárias para rodar localmente.
- **Supabase não conectado**. A infrastructure está estruturada mas `DATABASE_URL` e `SUPABASE_*` são opcionais por enquanto — a API sobe sem elas.

---

## Contexto do produto (para não esquecer)

**SyloCRM 2.0** — SaaS CRM B2B, multi-tenant, para gestão de leads imobiliários.

Hierarquia organizacional:
```
INCORPORADORA → MASTER → REPRESENTACAO → VENDEDOR
```

Ou representação independente (sem pai).

Um vendedor pode pertencer a múltiplas representações com roles diferentes em cada uma.

O problema crítico do MVP antigo: abrir Kanban com ~6.000 leads travava o browser. A arquitetura atual foi desenhada para nunca repetir isso (20.000 leads por tenant, tudo server-side).
