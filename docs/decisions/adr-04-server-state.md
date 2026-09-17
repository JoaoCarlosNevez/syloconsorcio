# ADR-04 — TanStack Query para server state no frontend

**Status:** Aceito
**Data:** 2026-09-17

---

## Contexto

O MVP anterior do SyloCRM apresentou um problema crítico de performance: um Kanban com
milhares de leads carregava e renderizava tudo de uma vez no cliente, sem paginação nem
controle de cache, deixando o navegador extremamente pesado. A causa raiz foi tratar dados do
backend como estado de UI comum (`useState` + `useEffect` + `fetch`).

---

## Decisão

Usar **TanStack Query** (React Query v5) como solução exclusiva de server state no frontend.

```
Server state (TanStack Query)
  → leads, organizações, memberships, equipe, dados do backend em geral

UI state (useState / useReducer)
  → modais abertos, tabs ativas, valor de formulário antes de salvar, seleções de UI
```

Os dois nunca se misturam: dados vindos da API nunca são copiados para um `useState` que vive
independente da query que os buscou.

---

## Regras de implementação

- Todo hook que busca dados do backend é um `useQuery`; toda escrita é um `useMutation` com
  `onSuccess` chamando `queryClient.invalidateQueries` (ou `setQueryData` quando a resposta da
  mutation já é o objeto atualizado — ex: `useUpdateMyProfile` grava direto no cache de
  `['auth', 'me']`, evitando um refetch desnecessário)
- Query keys estruturadas e escopadas por organização quando fizer sentido, ex:
  `['team', 'members', organizationId]`, `['admin', 'organizations']`
- `apps/web/src/hooks/*.ts` é o único lugar onde `useQuery`/`useMutation` aparecem — páginas
  consomem hooks, nunca chamam `apiClient` diretamente

### Nunca

- `useState` para guardar a resposta de uma chamada de API
- `useEffect` + `fetch` manual para buscar dados
- Buscar uma lista inteira sem paginação só para filtrar/contar no cliente

---

## Estado atual vs. aspiração original

A decisão original (ao adotar TanStack Query) previa paginação via `useInfiniteQuery` e
carregamento incremental por coluna no Kanban, para suportar dezenas de milhares de leads por
organização. **Isso ainda não foi implementado** — hoje as listas usam `useQuery` simples com
paginação clássica (página + tamanho de página) onde existe paginação, e o Kanban carrega as
colunas de uma vez. `useInfiniteQuery` não é usado em nenhum lugar do código ainda.

Isso não invalida a decisão de usar TanStack Query (que já resolve deduplicação de cache,
invalidação cirúrgica e evita o antipattern que causou o problema original) — só significa que
a paginação incremental do Kanban continua como trabalho futuro, não como algo já entregue.

---

## Consequências

- Toda feature nova que busca dados do backend passa por um hook próprio em `hooks/`, nunca por
  `fetch`/`useEffect` ad-hoc
- TanStack Query Devtools ficam habilitadas em desenvolvimento (visível no canto inferior
  direito do app)
- Quando o volume de leads justificar, migrar a listagem/Kanban para paginação incremental é uma
  extensão do padrão já existente, não uma reescrita

---

## Referências

- `apps/web/src/hooks/`
- `apps/web/src/lib/api-client.ts`
