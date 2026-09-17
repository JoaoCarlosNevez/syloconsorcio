# ADR-06 — Autenticação e sessão: Supabase Auth + Bearer token

**Status:** Aceito
**Data:** 2026-09-17

---

## Contexto

O SyloCRM 2.0 é um SPA React puro (sem SSR) hospedado separado da API Fastify — domínios
distintos, sem cookie compartilhado nativo. Era preciso decidir como autenticar, como manter a
identidade isolada do resto da aplicação, e como propagar a sessão do frontend pra API em cada
requisição.

Uma versão anterior desta decisão propunha `@supabase/ssr` com cookies httpOnly — inviável sem
SSR e sem domínio próprio compartilhado entre front e back (exigiria `SameSite=None; Secure` e
fica sujeito a bloqueio de third-party cookie pelos navegadores). Essa direção foi abandonada
antes de qualquer implementação; a decisão que segue é a que está implementada.

---

## Decisão

### 1. Supabase Auth como provider de identidade, isolado via port

O login em si (`supabase.auth.signInWithPassword`) acontece **direto do frontend para o
Supabase** — não existe endpoint `/auth/login` na API. A API só *verifica* tokens já emitidos.

```
Infrastructure → SupabaseAuthAdapter implements IAuthProvider
Application    → usa IAuthProvider, nunca importa @supabase/supabase-js
Domain         → não tem dependência alguma de auth
```

```typescript
// packages/application/src/ports/auth.provider.ts
interface AuthIdentity { id: string; email: string }
interface CreateAuthUserInput { email: string; password: string }

interface IAuthProvider {
  verifyToken(token: string): Promise<AuthIdentity | null>
  signOut(token: string): Promise<void>
  createUser(input: CreateAuthUserInput): Promise<AuthIdentity>  // convite/criação em nome de outro
  deleteUser(id: string): Promise<void>                          // exclusão de conta (ver ADR-08)
}
```

`packages/infrastructure/src/auth/supabase-auth.adapter.ts` é a única implementação — usa o
Admin SDK do Supabase com a **service key** (nunca exposta ao frontend).

### 2. ID do Supabase Auth == ID do usuário no domínio

`auth.users.id` é reaproveitado como `public.users.id`. Não existe mapeamento separado — ao
criar um usuário no domínio, o `id` é o mesmo que o Supabase Auth já gerou. Isso elimina JOINs
desnecessários e mantém o JWT diretamente rastreável no banco.

### 3. Sessão: Supabase JS SDK no browser, tokens em `sessionStorage`

```
Frontend (SPA)
  ↓ supabase.auth.signInWithPassword()
Supabase retorna access_token (JWT, ~1h) + refresh_token (rotativo)
  ↓
SDK guarda a sessão via um storage adapter customizado — sessionStorage, não localStorage
  ↓
apps/web/src/hooks/useAuth.ts expõe a sessão como server state (useQuery)
  ↓
apps/web/src/lib/api-client.ts injeta Authorization: Bearer <access_token> em toda chamada à API
  ↓
authMiddleware valida o token via IAuthProvider.verifyToken()
```

`sessionStorage` em vez do padrão (`localStorage`) do SDK: tokens somem quando a aba fecha,
reduzindo a janela de exposição a XSS. Trade-off aceito: cada aba tem sessão independente, e
não há refresh entre fechamentos do navegador — considerado aceitável neste estágio do produto
(sem domínio próprio, sem SSR, sem exigência de "lembrar entre sessões").

O SDK renova o `access_token` automaticamente antes de expirar, usando o `refresh_token`
(rotativo — o anterior é invalidado a cada renovação).

Cookies httpOnly cross-domain via `@supabase/ssr` continuam sendo o caminho natural **quando**
o produto tiver domínio próprio compartilhado (`app.sylocrm.com` + `api.sylocrm.com` sob o
mesmo eTLD+1) — nesse ponto a API passaria a ler sessão via cookie em vez de header
`Authorization`, sem precisar mudar `IAuthProvider`.

### 4. Multi-tenancy via header `X-Organization-Id`

Toda requisição a uma rota de negócio inclui `X-Organization-Id`. O backend valida que essa
organização realmente pertence ao usuário autenticado (ou que ele é Super Admin — ver ADR-07)
antes de construir qualquer contexto. O frontend nunca decide permissão — só informa qual
organização está ativa.

### 5. Pipeline de autenticação e autorização

```
Request
  ↓
authMiddleware
  → verifica Bearer token via IAuthProvider.verifyToken()
  → injeta AuthIdentity { id, email } em request.authIdentity
  → 401 se ausente/inválido
  ↓
tenantMiddleware (só em rotas escopadas por organização)
  → lê X-Organization-Id
  → busca membership real do usuário nessa organização
  → sem membership real + isPlatformAdmin → sintetiza ADMIN (ver ADR-07)
  → calcula DataScope e Permissions (ver ADR-05)
  → injeta AuthenticatedContext em request.authContext
  → 400 se header ausente, 403 se organização inválida/sem membership
  ↓
Use Case
  → recebe AuthenticatedContext, verifica permissions, filtra por dataScope
```

### 6. `AuthenticatedContext` como único contrato interno

Depois dos middlewares, nenhum use case ou rota conhece Supabase — só o `AuthenticatedContext`
definido em `packages/application/src/auth/auth-context.ts` (ver ADR-05 para o shape completo).

### 7. Logout

`POST /auth/logout` chama `IAuthProvider.signOut(token)` (invalida a sessão no Supabase Auth
server-side); o frontend também chama `supabase.auth.signOut()` localmente e limpa todo o
cache do TanStack Query (`queryClient.clear()`).

### 8. Troca de senha

Acontece **direto do frontend para o Supabase** via `supabase.auth.updateUser({ password })` —
não existe rota na API para isso; o backend nunca vê a senha em texto. Usado tanto no fluxo de
"Alterar senha" em `/app/perfil` quanto (futuro) em recuperação de senha.

### 9. Perfil do usuário (`GET`/`PATCH /auth/me`)

Diferente da sessão (Supabase), o **perfil de negócio** (nome, Instagram, cidade/região, data
de criação) vive em `public.users` e é acessado via:

- `GET /auth/me` — identidade + perfil do usuário autenticado
- `PATCH /auth/me` — autoatualização; nunca aceita `email` nem `isPlatformAdmin` (e-mail é
  gerenciado pelo administrador da organização; a flag de Super Admin não é autoatribuível)

---

## Taxonomia de erros

| Situação | HTTP | Código |
|---|---|---|
| Token ausente | 401 | `AUTH_TOKEN_MISSING` |
| Token inválido ou expirado | 401 | `AUTH_TOKEN_INVALID` |
| Header `X-Organization-Id` ausente | 400 | `TENANT_HEADER_MISSING` |
| Sem membership (real ou sintetizável) na organização | 403 | `MEMBERSHIP_NOT_FOUND` |
| Membership suspensa/inativa | 403 | `MEMBERSHIP_INACTIVE` |
| Permission insuficiente | 403 | `PERMISSION_DENIED` |

`apps/api/src/auth/errors.ts` é a fonte de verdade desses códigos.

---

## Consequências

- Nenhum use case conhece Supabase — todos recebem `AuthenticatedContext`
- Trocar o provider de auth (Auth0, Keycloak, etc.) exige só um novo adapter atrás de
  `IAuthProvider`
- Testes de use case mockam `IAuthProvider`/`AuthenticatedContext`, nunca um Supabase real
- Migrar pra cookies httpOnly no futuro é uma mudança isolada em `SupabaseAuthAdapter` +
  `apiClient` — o contrato `IAuthProvider` não muda

---

## Referências

- `packages/application/src/ports/auth.provider.ts`
- `packages/infrastructure/src/auth/supabase-auth.adapter.ts`
- `apps/web/src/hooks/useAuth.ts`, `apps/web/src/lib/supabase.ts`, `apps/web/src/lib/api-client.ts`
- `apps/api/src/middleware/auth.middleware.ts`, `apps/api/src/middleware/tenant.middleware.ts`
- `apps/api/src/routes/auth.route.ts`
- ADR-05 — Modelo de autorização (Role/Permission/DataScope/AuthenticatedContext)
- ADR-07 — Super Admin da plataforma e acesso cross-tenant
