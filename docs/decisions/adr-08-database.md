# ADR-08 — Drizzle ORM + Supabase Migrations para acesso ao banco

**Status:** Aceito
**Data:** 2026-09-08

---

## Contexto

O SyloCRM 2.0 usa PostgreSQL hospedado no Supabase. Era necessário decidir:

1. Como acessar o banco de forma tipada no backend
2. Como versionar o schema do banco
3. Como manter a separação entre a camada de domínio e a infraestrutura de banco

As opções de ORM/query builder consideradas foram:

1. **Prisma** — popular, type-safe, mas gera um cliente próprio e abstrai demais o SQL
2. **Drizzle ORM** — type-safe, próximo do SQL, sem magia
3. **Supabase SDK direto** — conveniente, mas acopla toda a aplicação ao Supabase
4. **Knex** — query builder maduro, mas sem type-safety nativa

---

## Decisão

Usar **Drizzle ORM** como camada tipada de acesso ao PostgreSQL, com **Supabase Migrations** para versionamento de schema.

Drizzle fica **exclusivamente na camada Infrastructure**. O Domain nunca importa Drizzle.

---

## Justificativa

### Por que Drizzle e não Prisma
- Drizzle não gera um cliente proprietário — usa drivers PostgreSQL padrão
- SQL permanece legível e controlável: sem abstração que esconda queries importantes
- Performance e índices permanecem completamente visíveis e controláveis
- Schema em TypeScript é a fonte de verdade — muito mais próximo do SQL real
- Drizzle não exige um processo separado de geração de cliente (`prisma generate`)
- Mais leve e com menos overhead de runtime

### Por que não usar Supabase SDK diretamente
- `supabase.from('table').select(...)` espalhado pela aplicação cria acoplamento total
- Impossível testar sem um cliente Supabase real
- Trocar o Supabase futuramente exigiria reescrita de todo o acesso a dados
- Violaria o princípio de que Supabase é infraestrutura, não domínio

### Por que Supabase Migrations
- As migrations ficam sob controle de versão no repositório
- O Supabase Dashboard pode aplicar migrations via CLI
- Compatível com Drizzle Kit para geração de migrations a partir do schema TypeScript

---

## Fluxo de acesso ao banco

```
Domain (interface LeadRepository — TypeScript puro)
  ↓
Infrastructure (DrizzleLeadRepository implements LeadRepository)
  ↓
Drizzle ORM (query builder type-safe)
  ↓
PostgreSQL / Supabase
```

---

## Fluxo de schema e migrations

```
packages/infrastructure/database/schema/*.ts   ← fonte de verdade TypeScript
  ↓
drizzle-kit generate                           ← gera SQL de migration
  ↓
supabase/migrations/*.sql                      ← versionado no repositório
  ↓
supabase db push / supabase migration up       ← aplicado no banco
```

---

## Regras de implementação

- Schema Drizzle em `packages/infrastructure/database/schema/`
- Repositories em `packages/infrastructure/database/repositories/`
- Cada repository implementa a interface do Domain
- Imports de `drizzle-orm` e `@supabase/supabase-js` (SDK de banco) apenas em `packages/infrastructure/`
- Queries explícitas: sem `SELECT *`, sempre especificar colunas
- Índices definidos no schema Drizzle e presentes nas migrations

---

## Consequências

- O schema TypeScript e o schema SQL devem permanecer sincronizados
- Toda nova tabela ou coluna exige: (1) atualização do schema Drizzle, (2) geração de migration, (3) aplicação no banco
- Performance de queries é responsabilidade do desenvolvedor — Drizzle não otimiza automagicamente
- Trocar o PostgreSQL/Supabase no futuro requer apenas nova implementação dos repositories — o Domain não muda
