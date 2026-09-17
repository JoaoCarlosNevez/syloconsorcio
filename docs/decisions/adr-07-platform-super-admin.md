# ADR-07 — Super Admin da plataforma e acesso cross-tenant

**Status:** Aceito
**Data:** 2026-09-17

---

## Contexto

O SyloCRM precisa de uma capacidade de operador da plataforma — alguém que cria novas
Representações, gerencia usuários de qualquer organização e, em geral, precisa enxergar o
sistema inteiro, não uma organização específica. Isso é ortogonal ao modelo de Role (ADR-05):
Role vive numa Membership (organização específica); "Super Admin" é uma capacidade de nível
plataforma, independente de pertencer a alguma organização.

Sem isso, uma conta puramente administrativa — sem nenhuma Membership — não conseguia nem
selecionar uma organização no seletor da sidebar (ficava travada em "Carregando..." pra
sempre), nem operar Início/Kanban/Configurações, porque toda rota de negócio exige uma
Membership real resolvida via `X-Organization-Id`.

---

## Decisão

### 1. `users.isPlatformAdmin` — flag de plataforma, não um Role

```typescript
// packages/infrastructure/src/database/schema/users.ts
isPlatformAdmin: boolean('is_platform_admin').notNull().default(false)
```

Não é um Role de Membership — é um booleano na identidade global do usuário. `requirePlatformAdmin`
(`apps/api/src/middleware/platform-admin.middleware.ts`) é o preHandler que a exige; roda depois
de `authMiddleware`, checa a flag e retorna 403 (`PERMISSION_DENIED`) se ausente.

Rotas exclusivas de Super Admin (`apps/api/src/routes/organizations.route.ts`, todas atrás de
`requirePlatformAdmin`, **não** escopadas por tenant):

- `POST /organizations` — cria Representação + Dono
- `GET /organizations` — lista todas as organizações da plataforma
- `PATCH /organizations/:id`, `POST /organizations/:id/icon`
- `GET /organizations/:id/members` — equipe de uma organização qualquer
- `GET /organizations/members` — todos os membros da plataforma, cross-org
- `POST /organizations/members` — cria um usuário com qualquer Role em qualquer organização
- `DELETE /organizations/members/:userId` — apaga a conta de alguém da plataforma inteira (ver ADR-08)

### 2. Membership sintética para navegar em qualquer organização

Um Super Admin sem Membership real numa organização ainda precisa conseguir *operar* nela
(Início, Kanban, Configurações) — não só nas telas exclusivas acima. `tenantMiddleware`
(`apps/api/src/middleware/tenant.middleware.ts`) resolve isso assim:

```
1. Busca a Membership real (userId, organizationId) — igual pra qualquer usuário
2. Se não existe:
     Se isPlatformAdmin: busca a organização direto (IOrganizationRepository.findById)
                          e sintetiza uma Membership com role = ADMIN — nunca persistida
     Senão: 403 MEMBERSHIP_NOT_FOUND
3. Segue o pipeline normal (DataScope, Permissions) com essa Membership, real ou sintética
```

Quando o Super Admin **tem** uma Membership real na organização (ex: também é o Dono dela), o
Role real prevalece — a sintética é só um fallback para quando não há vínculo nenhum.

`GET /auth/memberships` espelha a mesma lógica: para um Super Admin, a lista inclui toda
organização da plataforma (as que ele não é membro real entram com `role: ADMIN` sintético),
não só as que ele participa de fato. É isso que alimenta o seletor de organização na sidebar —
sem essa lista, o seletor não tem o que mostrar pra uma conta sem Membership nenhuma.

### 3. `canGrantRole` não se aplica ao Super Admin

A hierarquia de concessão de Role (ADR-05: ADMIN concede MANAGER/SELLER, nunca outro ADMIN) é
uma regra entre Roles de Membership. O Super Admin ignora essa hierarquia inteira — pode criar,
remover ou reativar qualquer Role, incluindo outro ADMIN, em qualquer organização (ver ADR-08).
Isso é verificado por um parâmetro `removerIsPlatformAdmin`/`reactivatorIsPlatformAdmin`
explícito nos use cases correspondentes, não por reaproveitar `canGrantRole`.

---

## Por que não modelar Super Admin como um Role

Um Role vive numa Membership — presume uma organização. Super Admin é, por definição, sobre
*não* estar preso a uma organização. Modelar como um quinto valor de `Role` (ex:
`SUPER_ADMIN`) forçaria toda Membership sintética a existir persistida em algum lugar, e
misturaria dois conceitos que respondem perguntas diferentes: "quem sou eu nesta organização"
(Role) vs. "que capacidades de plataforma eu tenho, independente de organização" (a flag).

---

## Consequências

- Uma conta pode ser só Super Admin, sem nenhuma Membership real — Administração continua
  funcionando (não depende de tenant), e agora Início/Kanban/Configurações também funcionam,
  operando como ADMIN sintético em qualquer organização escolhida
- `IOrganizationRepository` e `IUserRepository` viraram dependências de `tenantMiddleware`
  (antes só recebia `IMembershipRepository`) — toda rota que usa `createTenantMiddleware` passa
  os três
- Testar esse caminho exige mockar `userRepository.findById` retornando `isPlatformAdmin: true`
  e `organizationRepository.findById` retornando a organização — ver
  `apps/api/src/middleware/tenant.middleware.test.ts`

---

## Referências

- `apps/api/src/middleware/platform-admin.middleware.ts`
- `apps/api/src/middleware/tenant.middleware.ts`
- `apps/api/src/routes/auth.route.ts` (`GET /auth/memberships`)
- `apps/api/src/routes/organizations.route.ts`
- ADR-05 — Modelo de autorização
- ADR-06 — Autenticação e sessão
- ADR-08 — Ciclo de vida de membros (remoção/reativação/exclusão ignorando `canGrantRole`)
