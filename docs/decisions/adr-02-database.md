# ADR-02 — Drizzle ORM + migrations versionadas para acesso ao banco

**Status:** Aceito
**Data:** 2026-09-17

---

## Contexto

O SyloCRM 2.0 usa PostgreSQL hospedado no Supabase. Era preciso decidir como acessar o banco
de forma tipada no backend, como versionar o schema, e como manter a Domain isolada de
qualquer detalhe de infraestrutura de banco.

Opções consideradas: Prisma (type-safe mas gera cliente próprio e abstrai o SQL), Drizzle ORM
(type-safe, próximo do SQL), Supabase SDK direto (`supabase.from(...)`, acopla a aplicação
inteira ao Supabase), e Knex (sem type-safety nativa).

---

## Decisão

Usar **Drizzle ORM** como camada tipada de acesso ao PostgreSQL, com **Drizzle Kit** para
gerar e versionar migrations SQL a partir do schema TypeScript.

Drizzle fica **exclusivamente na camada Infrastructure**. Domain e Application nunca importam
`drizzle-orm` nem `@supabase/supabase-js` — só conhecem os *ports* (interfaces de repositório)
que a Infrastructure implementa.

---

## Justificativa

- Drizzle não gera cliente proprietário — usa o driver `postgres` padrão
- Schema TypeScript é a fonte de verdade, próxima do SQL real; sem processo de `generate` de
  cliente separado (diferente do Prisma)
- Acessar o Supabase diretamente (`supabase.from(...)`) espalhado pela aplicação criaria
  acoplamento total e tornaria os use cases impossíveis de testar sem um Supabase real —
  violaria a regra de que Supabase é infraestrutura, nunca domínio

---

## Estrutura real

```
packages/infrastructure/src/database/
├── client.ts                 # createDatabase() — factory do client Drizzle (postgres-js)
├── schema/*.ts                # fonte de verdade TypeScript de cada tabela
├── migrations/*.sql           # gerado por drizzle-kit generate, versionado no git
└── repositories/*.ts          # Drizzle*Repository implements I*Repository (ports da Application)
```

Cada repositório implementa uma interface (*port*) definida em `packages/application/src/ports/`
— é a Application que define o contrato; a Infrastructure só o implementa (inversão de
dependência: quem consome define a interface).

Tabelas atuais: `users`, `organizations`, `organization_memberships`, `leads`,
`lead_assignment_history`.

---

## Fluxo de schema e migrations

```
1. Editar packages/infrastructure/src/database/schema/*.ts
2. pnpm --filter @sylocrm/infrastructure db:generate
     → gera um novo SQL em src/database/migrations/NNNN_*.sql (revisável, versionado no git)
3. pnpm --filter @sylocrm/infrastructure db:push
     → aplica o diff direto no banco (Session Pooler do Supabase via DATABASE_URL)
```

`db:push` é **interativo** (pede confirmação antes de aplicar DDL) — por isso é sempre rodado
manualmente por quem está no terminal, nunca de forma automatizada/silenciosa. O comando não
lê nem aplica os arquivos de `migrations/*.sql` diretamente (isso seria `drizzle-kit migrate`,
não usado aqui) — ele faz um diff live entre o schema TypeScript e o banco atual; os arquivos
`.sql` gerados servem como histórico revisável em code review, não como mecanismo de aplicação.

**Nunca alterar o schema direto pelo Supabase Dashboard** — toda mudança nasce do schema
TypeScript.

---

## Row Level Security

O backend acessa o banco com a Supabase **service key**, que ignora RLS (`BYPASSRLS`) — a
autorização de verdade acontece na camada Application (ver ADR-06). Ainda assim, RLS está
**ativado em todas as tabelas do schema `public`**, sem nenhuma policy — isso bloqueia o acesso
direto via PostgREST para quem só tem a `anon key` (pública, embutida no bundle do frontend).
Ver ADR-03 para o incidente que motivou isso e o raciocínio completo.

---

## Regras de implementação

- Repositórios em `packages/infrastructure/src/database/repositories/`, um por agregado
- Queries explícitas com objeto de colunas — nunca `select()` sem argumentos (equivalente a
  `SELECT *`)
- `import { ... } from 'drizzle-orm'` e `from '@supabase/supabase-js'` só existem dentro de
  `packages/infrastructure/` — testes de arquitetura (`packages/testing`) falham o build se
  isso vazar para `domain` ou `application`

---

## Consequências

- Toda nova tabela/coluna exige: (1) editar o schema Drizzle, (2) `db:generate`, (3) pedir pro
  humano rodar `db:push` no terminal (nunca assumir que foi aplicado sem confirmar)
- Trocar Postgres/Supabase no futuro exige só novas implementações de repository — Domain e
  Application não mudam
- Um schema TypeScript alterado sem a migration correspondente aplicada quebra em runtime com
  erro de "column does not exist" — sempre confirmar que `db:push` rodou antes de considerar
  uma mudança de schema concluída

---

## Referências

- `packages/infrastructure/drizzle.config.ts`
- `packages/infrastructure/src/database/`
- ADR-03 — Row Level Security como defesa em profundidade
- ADR-06 — Autenticação e sessão (service key vs. anon key)
