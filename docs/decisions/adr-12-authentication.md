# ADR-12 — Arquitetura de autenticação e autorização

**Status:** Aceito
**Data:** 2026-09-09

---

## Contexto

O SyloCRM 2.0 é um SaaS multi-tenant com hierarquia organizacional de quatro níveis
(Incorporadora → Master → Representação → Vendedor). O mesmo usuário pode ser membro de
múltiplas organizações com roles diferentes em cada uma.

Esta decisão define como autenticação, sessão e autorização funcionam — desde a verificação
de identidade até a construção do contexto que os use cases recebem.

A Etapa 06 é estritamente arquitetural: nenhum fluxo de login, signup ou RBAC é implementado
aqui. O objetivo é definir os contratos que a implementação futura deve respeitar.

---

## Modelo conceitual

```
Quem é o usuário?          → Authentication  (IAuthProvider / JWT)
O que ele pode fazer?      → Authorization   (Permission derivada de Role no Membership)
Quais registros acessa?    → Data Scope      (calculado por OrganizationType + Role)
Quais campos visualiza?    → Data Visibility (serialização da resposta)
```

Esses quatro conceitos são independentes e evoluem separadamente.
Consulte ADR-04 para a definição completa de cada um.

---

## Decisões

### 1. Supabase Auth como provider de identidade

O Supabase Auth gerencia credenciais e emite JWTs. Ele fica isolado na camada Infrastructure,
atrás do port `IAuthProvider`. O resto da aplicação não importa nenhum tipo do SDK Supabase.

```
Infrastructure → SupabaseAuthAdapter implements IAuthProvider
Application    → usa IAuthProvider (não conhece Supabase)
Domain         → não tem dependência alguma de auth
```

### 2. ID do Supabase Auth == ID do usuário no domínio

`auth.users.id` (Supabase) é reutilizado como `users.id` (domínio). Não existe mapeamento
separado entre os dois IDs. Isso é intencional: simplifica queries, elimina JOINs desnecessários
e mantém a identidade do JWT diretamente rastreável no banco.

Consequência: ao criar um usuário no domínio, o `id` deve ser o mesmo gerado pelo Supabase Auth.

### 3. Sessão: Supabase Auth + httpOnly cookies via @supabase/ssr

- O Supabase Auth emite access token (JWT, 1h) e refresh token (rotativo)
- O frontend usa `@supabase/ssr` para armazenar tokens em cookies httpOnly
- A API recebe o access token no header `Authorization: Bearer <token>`
- A API valida o token via `IAuthProvider.verifyToken()` — sem conhecer o Supabase diretamente

O frontend nunca armazena tokens em `localStorage`. Cookies httpOnly são a única estratégia
de armazenamento aceita.

### 4. Multi-tenancy via header X-Organization-Id

Cada requisição autenticada inclui o header `X-Organization-Id`. O backend valida que o
organization_id recebido pertence de fato ao usuário autenticado antes de construir o contexto.

O frontend nunca determina permissões — apenas informa qual organização está em uso.

### 5. Pipeline de autenticação e autorização

```
Request
  ↓
authMiddleware
  → verifica Bearer token via IAuthProvider.verifyToken()
  → extrai AuthIdentity { id, email }
  → retorna 401 se inválido
  ↓
tenantMiddleware
  → lê X-Organization-Id header
  → busca memberships do usuário no banco
  → valida que o organization_id pertence ao usuário
  → calcula DataScope (OrganizationType + Role)
  → calcula Permissions (Role → Permission[])
  → constrói AuthenticatedContext
  → retorna 403 se organização inválida ou sem membership ativo
  ↓
Use Case
  → recebe AuthenticatedContext
  → verifica permissions necessárias
  → aplica data scope nos filtros
  → retorna dados; a serialização aplica data visibility
```

### 6. AuthenticatedContext como contrato interno

Após os middlewares resolverem autenticação e tenant, o restante da aplicação trabalha
exclusivamente com `AuthenticatedContext`. Nenhum use case recebe objetos do SDK Supabase.

```typescript
// packages/application/src/auth/auth-context.ts

interface MembershipContext {
  organizationId: string
  organizationType: OrganizationType    // do @sylocrm/domain
  role: Role                            // do @sylocrm/domain
  dataScope: DataScope                  // calculado
  permissions: readonly Permission[]    // calculado
}

interface AuthenticatedContext {
  identityId: string                              // = userId (ver decisão 2)
  userId: string
  currentMembership: MembershipContext            // organização desta requisição
  availableMemberships: readonly MembershipContext[] // para troca de contexto no frontend
}
```

### 7. IAuthProvider como port da camada Application

O port é definido em `packages/application/src/ports/auth.provider.ts`. A camada Application
é quem define a interface — a Infrastructure apenas a implementa. Isso segue o princípio de
inversão de dependência: o consumidor define o contrato.

```typescript
// packages/application/src/ports/auth.provider.ts

interface AuthIdentity {
  id: string     // = users.id no domínio
  email: string
}

interface IAuthProvider {
  verifyToken(token: string): Promise<AuthIdentity | null>
  signOut(token: string): Promise<void>
}
```

### 8. RLS não é o mecanismo primário de segurança

O backend usa a Supabase service key, que ignora Row Level Security. A segurança é aplicada
na camada Application:

- `authMiddleware` garante identidade válida
- `tenantMiddleware` garante membership ativo para a organização requisitada
- Use cases verificam permissions explicitamente
- Queries incluem filtros de `organization_id` e `dataScope` — não confiam no RLS

RLS pode ser configurado como defesa em profundidade, mas nunca como única barreira.

### 9. Logout

O fluxo de logout invalida a sessão no Supabase Auth via `IAuthProvider.signOut(token)`.
Cookies httpOnly são removidos pelo backend. O frontend não gerencia tokens diretamente.

### 10. Recuperação de senha

Delegada ao Supabase Auth (email de reset). O domínio não implementa lógica de senha.
O adapter `SupabaseAuthAdapter` expõe o método quando necessário — fora do escopo do MVP.

---

## Tipos e arquivos criados nesta etapa

```
packages/domain/src/auth/
├── role.ts              — Role: ADMIN | MANAGER | SELLER
├── permission.ts        — Permission: lead.read | lead.create | ... | reports.read
├── data-scope.ts        — DataScope: own | representation | master | incorporadora
├── organization-type.ts — OrganizationType: INCORPORADORA | MASTER | REPRESENTACAO
└── index.ts             — barrel: export * de todos os arquivos acima

packages/application/src/auth/
└── auth-context.ts      — MembershipContext, AuthenticatedContext

packages/application/src/ports/
└── auth.provider.ts     — AuthIdentity, IAuthProvider
```

Exports públicos atualizados:
- `packages/domain/src/index.ts` → `export * from './auth'`
- `packages/application/src/index.ts` → exports de IAuthProvider, AuthIdentity, AuthenticatedContext, MembershipContext

---

## Taxonomia de erros de autenticação

| Situação                              | HTTP | Código interno        |
|---------------------------------------|------|-----------------------|
| Token ausente                         | 401  | AUTH_TOKEN_MISSING    |
| Token inválido ou expirado            | 401  | AUTH_TOKEN_INVALID    |
| Header X-Organization-Id ausente      | 400  | TENANT_HEADER_MISSING |
| Membership não encontrado             | 403  | MEMBERSHIP_NOT_FOUND  |
| Membership suspenso ou inativo        | 403  | MEMBERSHIP_INACTIVE   |
| Permission insuficiente para a ação   | 403  | PERMISSION_DENIED     |

---

## Observabilidade e auditoria

- Eventos de auth (login, logout, token inválido) são emitidos via OpenTelemetry (ADR-06)
- Dados sensíveis nunca aparecem em logs: tokens, senhas, refresh tokens
- Contexto de erro sempre inclui `{ userId, organizationId, action }` — nunca o token
- Eventos de auditoria registram: quem, o quê, em qual organização, quando

---

## O que NÃO está neste ADR

- Implementação concreta do `SupabaseAuthAdapter` (Etapa 07)
- Implementação de `authMiddleware` e `tenantMiddleware` no Fastify (Etapa 07)
- Lógica de cálculo de permissions a partir de roles (a definir na implementação)
- Lógica de cálculo de data scope (a definir na implementação)
- Telas de Login, Signup, Recuperação de senha (escopo de produto futuro)

---

## Consequências

- Nenhum use case conhece Supabase — todos recebem `AuthenticatedContext`
- Trocar o provider de auth (Supabase → Auth0, Keycloak, etc.) exige apenas um novo adapter
- O frontend nunca recebe mais informação de permissão do que precisa — apenas o contexto resolvido
- Testes de use case não precisam mockar Supabase — apenas `AuthenticatedContext` e `IAuthProvider`

---

## Referências

- ADR-01 — Supabase como infra inicial, isolado via ports
- ADR-04 — Membership como entidade central; Role vs Permission vs Scope vs Visibility
- ADR-06 — OpenTelemetry como abstração de observabilidade
- `docs/architecture.md` — seção "Autenticação"
- `packages/application/src/ports/auth.provider.ts`
- `packages/application/src/auth/auth-context.ts`
- `packages/domain/src/auth/`
