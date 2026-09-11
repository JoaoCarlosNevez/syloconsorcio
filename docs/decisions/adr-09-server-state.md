# ADR-09 — TanStack Query para server state no frontend

**Status:** Aceito
**Data:** 2026-09-08

---

## Contexto

O MVP do SyloCRM apresentou um problema crítico de performance: ao abrir um Kanban com aproximadamente 6.000 leads, o navegador ficava extremamente pesado, comprometendo a responsividade do computador inteiro.

A causa raiz foi carregar e renderizar milhares de registros simultaneamente no cliente, sem paginação, sem virtualização e sem controle adequado de cache.

O SyloCRM 2.0 precisa suportar **20.000 leads por tenant**. A arquitetura de frontend deve tratar isso como um requisito P0 desde o início.

As opções consideradas para gerenciamento de server state foram:

1. **Estado manual com `useState` + `useEffect` + `fetch`** — frágil, sem cache, propenso a inconsistências
2. **Redux Toolkit Query** — acoplado ao Redux, overhead de boilerplate
3. **SWR** — leve, mas menos features que TanStack Query
4. **TanStack Query** — cache declarativo, paginação, invalidação, otimistic updates, devtools

---

## Decisão

Usar **TanStack Query** (React Query v5+) como solução exclusiva de server state no frontend.

---

## Justificativa

### Problema que resolve diretamente

TanStack Query separa explicitamente server state de UI state. Isso é fundamental para evitar que dados do backend sejam copiados para estado global manual, o que foi a causa do problema do MVP.

### Features que habilitam a arquitetura de performance correta

| Feature                    | Como ajuda no SyloCRM                                          |
|----------------------------|----------------------------------------------------------------|
| `useQuery` com cache       | Dados buscados uma vez e reutilizados entre componentes        |
| `useInfiniteQuery`         | Carregamento incremental de leads sem trazer tudo de uma vez   |
| Stale time configurável    | Controle fino sobre quando revalidar dados                     |
| Query invalidation         | Atualização cirúrgica após mutations sem refetch desnecessário |
| Background refetch         | Interface não trava enquanto revalida dados em background      |
| Devtools integrado         | Visibilidade de cache, queries ativas e estado                 |
| Paginação cursor/offset    | API para paginação server-side nativa                         |

### Separação de responsabilidades

```
Server state (TanStack Query)
  → leads, organizações, memberships, dados do backend

UI state (useState / useReducer / Zustand)
  → modais abertos, tabs ativas, formulários, seleções de UI
```

Os dois nunca se misturam. Dados do backend não são copiados para estado global de UI.

---

## Regras de implementação

### Query keys
- Tipadas e estruturadas: `['leads', orgId, { page, filters, sort }]`
- Invalidação precisa: ao criar/atualizar/deletar um lead, invalidar apenas as queries relacionadas

### Paginação
- Listas com volume potencial alto usam paginação server-side
- `useInfiniteQuery` para carregamento progressivo (infinite scroll ou "carregar mais")
- `useQuery` com parâmetro de página para paginação clássica com navegação

### Kanban
- Cada coluna do Kanban é uma query independente com seu próprio cache
- Colunas são carregadas de forma incremental (lazy por coluna)
- Nunca buscar todos os leads de todas as colunas em uma única query

### Mutations
- `useMutation` com `onSuccess` disparando `queryClient.invalidateQueries`
- Optimistic updates apenas quando a UX justificar a complexidade adicional

### Nunca
- `useState` para armazenar respostas de API diretamente
- `useEffect` + `fetch` manual para buscar dados (usar `useQuery`)
- Zustand ou Context para armazenar listas de leads ou dados do backend
- Buscar todos os leads sem paginação "só para contar" ou filtrar no cliente

---

## Consequências

- Toda feature que busca dados do backend passa obrigatoriamente pelo TanStack Query
- Devtools do TanStack Query devem ser habilitadas em desenvolvimento
- A estrutura de query keys deve ser documentada por recurso
- Performance de queries no frontend é observável e depurável sem adivinhar
- O Kanban do SyloCRM 2.0 nunca replicará o problema de performance do MVP
