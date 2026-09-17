# ADR-05 — Modelo de autorização: Role, Permission, Data Scope e Data Visibility

**Status:** Aceito
**Data:** 2026-09-17

---

## Contexto

O SyloCRM 2.0 tem hierarquia organizacional (Incorporadora → Master → Representação), Roles
por organização e regras de visibilidade de dados que variam por nível. Tratar Role como único
mecanismo de autorização leva a condicionais espalhadas (`if role === 'ADMIN'`) que ficam
inconsistentes conforme o produto cresce.

---

## Decisão

Separar explicitamente quatro conceitos, cada um respondendo uma pergunta diferente:

| Conceito | Pergunta | Onde é calculado |
|---|---|---|
| **Role** | Quem o usuário é nesta organização? | Coluna `role` da Membership |
| **Permission** | O que ele pode fazer? | `getPermissionsForRole(role)` |
| **Data Scope** | Quais registros ele acessa? | `calculateDataScope(organizationType, role)` |
| **Data Visibility** | Quais campos desses registros ele vê? | Na serialização da resposta |

**Membership** (`organization_memberships`) é a entidade central: o mesmo usuário pode ter
Roles diferentes em organizações diferentes, e toda autorização deriva da Membership ativa da
requisição (resolvida via header `X-Organization-Id` — ver ADR-06).

---

## Role

```typescript
// packages/domain/src/auth/role.ts
export const Role = { ADMIN: 'ADMIN', MANAGER: 'MANAGER', SELLER: 'SELLER' } as const
```

Role é só uma abstração de negócio — nunca é verificado diretamente no código de autorização
(`if (context.role === Role.ADMIN)` é incorreto; o correto é checar a Permission derivada).

### Hierarquia entre Roles

```typescript
// packages/domain/src/auth/role-hierarchy.ts
export function canGrantRole(granterRole: Role, targetRole: Role): boolean
```

Um Role só concede papéis estritamente abaixo do seu: ADMIN (Dono) concede MANAGER/SELLER;
MANAGER (Supervisor) concede só SELLER; SELLER não concede nada. Essa regra vale tanto para
convidar quanto para desativar/reativar um membro — ver ADR-08.

---

## Permission

```typescript
// packages/domain/src/auth/permission.ts
export const Permission = {
  LEAD_READ: 'lead.read',
  LEAD_CREATE: 'lead.create',
  LEAD_UPDATE: 'lead.update',
  LEAD_ASSIGN: 'lead.assign',
  LEAD_DELETE: 'lead.delete',
  USER_INVITE: 'user.invite',
  USER_REMOVE: 'user.remove',
  REPORTS_READ: 'reports.read',
  ORGANIZATION_UPDATE: 'organization.update',
} as const
```

`apps/api/src/auth/permissions.ts` mapeia Role → Permission[]. ADMIN recebe automaticamente
toda Permission existente (`Object.values(Permission)`) — uma Permission nova adicionada à
lista já vale para ADMIN sem precisar editar o mapeamento. MANAGER e SELLER têm listas
explícitas, mais restritas.

Rotas usam `requirePermission(Permission.X)` como preHandler; a checagem fina de hierarquia
(quem pode conceder/remover qual Role) fica dentro do use case, não do middleware — são
invariantes de negócio diferentes (ver ADR-08).

---

## Data Scope

```typescript
// packages/domain/src/auth/data-scope.ts
export const DataScope = {
  OWN: 'own',                    // só os próprios registros
  REPRESENTATION: 'representation', // toda a Representação
  MASTER: 'master',               // todas as Representações do Master
  INCORPORADORA: 'incorporadora', // visão agregada de toda a estrutura
} as const
```

```typescript
// apps/api/src/auth/data-scope.ts
calculateDataScope(organizationType, role)
```

Regra: o **tipo da organização** tem precedência sobre o Role. INCORPORADORA e MASTER sempre
dão o scope correspondente independente do Role; numa REPRESENTACAO, SELLER fica em `own` e
ADMIN/MANAGER em `representation`.

---

## Data Visibility

Diferente de Data Scope (quais *registros*), Data Visibility decide quais *campos* desses
registros aparecem. Hoje só uma regra existe, implementada em
`packages/application/src/leads/lead-visibility.ts`:

```typescript
export function applyLeadVisibility(lead: LeadRecord, dataScope: DataScope): LeadRecord {
  if (dataScope !== DataScope.INCORPORADORA) return lead
  return { ...lead, phone: '', email: null }
}
```

Uma Incorporadora vê os leads agregados mas não telefone/e-mail — visão gerencial, não
operacional. Não existe um sistema genérico de visibilidade por campo; a regra é aplicada
pontualmente onde é necessária, sem generalizar antes de haver um segundo caso real.

---

## AuthenticatedContext

Depois que os middlewares resolvem tudo isso, o resto da aplicação recebe só este contrato —
nenhum use case conhece Supabase, HTTP, ou objetos crus de membership:

```typescript
// packages/application/src/auth/auth-context.ts
interface MembershipContext {
  organizationId: string
  organizationType: OrganizationType
  organizationName: string
  organizationIconUrl: string | null
  role: Role
  dataScope: DataScope
  permissions: readonly Permission[]
}

interface AuthenticatedContext {
  identityId: string
  userId: string                                    // = identityId (ver ADR-06)
  currentMembership: MembershipContext              // organização desta requisição
  availableMemberships: readonly MembershipContext[] // todas as orgs do usuário
}
```

---

## O que não existe (de propósito)

- RBAC configurável pelo usuário final (roles/permissions customizáveis por organização)
- Hierarquia de permissões herdadas configurável
- Sistema genérico de visibilidade de campo — só a regra concreta acima existe

A arquitetura (Role → Permission derivada, DataScope calculado, Visibility na serialização)
permite evoluir para isso sem reescrever nada — mas não foi construído antes de haver um
segundo caso real que justifique a generalização.

---

## Consequências

- Nunca `if (role === 'ADMIN')` espalhado — sempre `permissions.includes(Permission.X)`
- Frontend nunca decide scope nem visibility — só recebe o que o backend já filtrou
- Adicionar uma feature nova começa pela pergunta "qual Permission esta ação exige?", não "qual Role?"

---

## Referências

- `packages/domain/src/auth/` (`role.ts`, `role-hierarchy.ts`, `permission.ts`, `data-scope.ts`, `organization-type.ts`)
- `apps/api/src/auth/permissions.ts`, `apps/api/src/auth/data-scope.ts`
- `packages/application/src/auth/auth-context.ts`
- `packages/application/src/leads/lead-visibility.ts`
- ADR-06 — Autenticação e sessão (como a Membership ativa é resolvida)
- ADR-08 — Ciclo de vida de membros (canGrantRole aplicado a convite/remoção)
