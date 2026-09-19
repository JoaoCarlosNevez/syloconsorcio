# ADR-03 — Row Level Security como defesa em profundidade

**Status:** Aceito
**Data:** 2026-09-17

---

## Contexto

O backend acessa o Supabase Postgres com a **service key**, que ignora Row Level Security
(`BYPASSRLS`). Por causa disso, a decisão original de arquitetura foi que a segurança residiria
inteiramente na camada Application: `authMiddleware` valida identidade, `tenantMiddleware`
valida membership e organização, use cases verificam permissions, queries filtram por
`organization_id`/`dataScope`. RLS foi tratado como algo opcional, "defesa em profundidade" —
e, na prática, nunca foi ativado em nenhuma tabela.

### O incidente

O Supabase expõe **toda tabela do schema `public`** via uma API REST própria (PostgREST),
completamente independente do backend Fastify. A **anon key** — pública por design, embutida
no bundle do frontend porque o Supabase Auth do lado do cliente precisa dela — também é uma
credencial válida para essa API REST.

Sem RLS, qualquer pessoa de posse da anon key (ou seja: qualquer pessoa que abra o DevTools do
navegador) conseguia fazer `GET https://<projeto>.supabase.co/rest/v1/<tabela>` direto, sem
token de sessão, e ler os dados completos — pulando `authMiddleware`, `tenantMiddleware` e toda
a autorização da Application. Confirmado por teste manual antes da correção: `organizations`,
`users` (incluindo `is_platform_admin`), `organization_memberships` (quem é dono/supervisor/
vendedor de qual organização) e `leads` estavam totalmente legíveis dessa forma.

---

## Decisão

Ativar RLS em **todas as tabelas do schema `public`**, sem nenhuma policy.

Isso zera o acesso via PostgREST para os roles `anon`/`authenticated` (nenhuma policy = nenhuma
linha visível), sem exigir nenhuma mudança no backend — a service key continua ignorando RLS
via `BYPASSRLS`, então o Fastify continua funcionando exatamente como antes.

```sql
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignment_history ENABLE ROW LEVEL SECURITY;
```

---

## Por que não escrever policies em vez de bloquear tudo

Nenhum fluxo do produto precisa que o navegador acesse o Postgres diretamente — o frontend
sempre fala com a API Fastify, nunca com `supabase.from(...)`. Bloquear tudo via RLS sem
policies é estritamente mais simples e mais seguro do que tentar espelhar a lógica de
`dataScope`/`Permission` da Application em policies SQL (que teria que ser mantida em dois
lugares, com risco real de os dois divergirem).

Se um dia o frontend precisar ler alguma tabela diretamente via Supabase client (ex: realtime
subscriptions), a policy certa deve ser escrita naquele momento, escopada exatamente ao que
aquele fluxo precisa — não antes.

---

## Consequências

- RLS **não é** o mecanismo de autorização do produto — continua sendo só uma segunda barreira
  contra acesso via PostgREST. A autorização de verdade continua 100% na camada Application
  (ver ADR-06)
- Toda tabela nova deve ativar RLS na mesma migration que a cria — não é um passo separado
  opcional
- Migrations de schema (Drizzle) e RLS são coisas independentes: `db:push` reflete o schema
  TypeScript, mas RLS foi ativado fora desse fluxo (SQL direto, já que Drizzle não modela RLS
  nas tabelas deste projeto) — ver `packages/infrastructure/src/database/migrations-notes/enable_rls.sql`
  para o registro histórico dessa mudança

---

## Referências

- `packages/infrastructure/src/database/migrations-notes/enable_rls.sql`
- ADR-02 — Database (service key vs. RLS)
- ADR-06 — Autenticação e sessão
