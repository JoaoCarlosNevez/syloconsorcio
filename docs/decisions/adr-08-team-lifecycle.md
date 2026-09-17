# ADR-08 — Ciclo de vida de membros: convite, desativação, reativação e exclusão

**Status:** Aceito
**Data:** 2026-09-17

---

## Contexto

Uma organização precisa poder adicionar pessoas à equipe, tirá-las quando necessário, trazê-las
de volta se a remoção foi um engano, e — só a nível de plataforma — apagar uma conta por
completo. Eram necessárias quatro operações distintas com regras de autorização e
reversibilidade diferentes.

A primeira implementação de "remover" fazia `DELETE` direto na linha de
`organization_memberships`. Dois problemas concretos apareceram: (1) não dava pra distinguir
"nunca foi convidado" de "foi removido", e (2) reconvidar o mesmo e-mail pra mesma organização
quebrava por causa da constraint `UNIQUE(user_id, organization_id)` — a linha antiga continuava
lá, apagada mas sem deixar rastro de que existiu.

---

## Decisão

Quatro operações, cada uma com sua própria regra de autorização:

### 1. Convidar — `InviteTeamMemberUseCase`

`POST /team/members`, exige `Permission.USER_INVITE`. Hierarquia fina aplicada via
`canGrantRole(inviterRole, targetRole)` (ADR-05): ADMIN convida MANAGER/SELLER, MANAGER convida
só SELLER. Cria a identidade no Supabase Auth (`IAuthProvider.createUser`) com senha temporária
gerada (`generateTemporaryPassword()`, retornada uma única vez na resposta) e a Membership com
`status: ACTIVE`.

### 2. Desativar (não apagar) — `RemoveTeamMemberUseCase`

`DELETE /team/members/:userId`, exige `Permission.USER_REMOVE`. Mesma hierarquia (`canGrantRole`)
do convite — quem pode convidar um Role também pode desativá-lo. **Não apaga a linha** —
atualiza `organization_memberships.status` para `SUSPENDED`:

```typescript
// packages/infrastructure/src/database/repositories/drizzle-membership.repository.ts
async deactivate(userId: string, organizationId: string): Promise<void> {
  await this.db.update(organizationMemberships)
    .set({ status: 'SUSPENDED', updatedAt: new Date() })
    .where(and(eq(organizationMemberships.userId, userId), eq(organizationMemberships.organizationId, organizationId)))
}
```

Ninguém pode desativar a si mesmo (evita, entre outras coisas, o próprio Dono se desvincular e
deixar a organização sem ADMIN). `GET /team/members` e `GET /organizations/members` retornam
membros de **qualquer status**, não só `ACTIVE` — a pessoa desativada continua visível na lista
(com um badge "Desativado"), em vez de desaparecer sem explicação.

### 3. Reativar — `ReactivateTeamMemberUseCase`

`POST /team/members/:userId/reactivate`, mesma permission e mesma hierarquia da desativação —
quem pode desativar um Role também pode reativá-lo. Volta o `status` para `ACTIVE`. Como a
linha nunca foi apagada, isso é só um `UPDATE`, sem violar a constraint de unicidade.

### 4. Apagar conta (Super Admin, plataforma inteira) — `DeletePlatformUserUseCase`

`DELETE /organizations/members/:userId`, exclusivo de Super Admin (ADR-07) — a única das quatro
operações que **não** é escopada a uma organização. Faz duas coisas, nessa ordem:

```typescript
await this.membershipRepository.removeAllForUser(input.targetUserId)  // apaga TODAS as memberships, hard delete
await this.authProvider.deleteUser(input.targetUserId)                 // apaga o login (Supabase Auth)
```

**O registro em `public.users` (nome, e-mail) não é apagado.** `lead_assignment_history` tem
FKs obrigatórias (`changed_by_user_id NOT NULL`) para `users`, e é rastro de auditoria que por
definição nunca é atualizado ou apagado (ver schema) — apagar a linha de `users` quebraria essa
referência pra qualquer pessoa que já tenha mexido num lead. A pessoa fica com login morto e
sem nenhum vínculo organizacional, mas seu nome continua aparecendo corretamente no histórico
de quem fez o quê. Ninguém pode apagar a própria conta.

---

## Por que quatro operações e não um único "remover" configurável

Desativar/reativar é uma operação de organização (qualquer ADMIN/MANAGER pode fazer, reversível,
não perde histórico). Apagar conta é uma operação de plataforma (só Super Admin, irreversível
pro login, mas preserva o registro de identidade por causa da auditoria). São níveis de
consequência genuinamente diferentes — misturar os dois num único endpoint com uma flag
"apagar de vez? sim/não" esconderia essa diferença de quem está lendo o código ou a API.

---

## Consequências

- `IMembershipRepository` expõe `deactivate`, `reactivate` e `removeAllForUser` como operações
  distintas (não um `remove` genérico) — o nome do método já diz a consequência
- Toda tela que lista equipe (Configurações → Equipe, Administração → Usuários) busca todos os
  status, nunca só `ACTIVE` — omitir isso faz pessoas desativadas desaparecerem sem rastro
- Reconvidar alguém que já foi desativado nunca deveria criar um convite novo do zero — hoje
  isso não está automatizado (o fluxo de convite continua sendo `INSERT`); se a mesma pessoa
  precisar voltar, o caminho correto é reativar, não reconvidar

---

## Referências

- `packages/application/src/team/invite-team-member.use-case.ts`
- `packages/application/src/team/remove-team-member.use-case.ts`
- `packages/application/src/team/reactivate-team-member.use-case.ts`
- `packages/application/src/organizations/delete-platform-user.use-case.ts`
- `apps/api/src/routes/team.route.ts`, `apps/api/src/routes/organizations.route.ts`
- ADR-05 — Modelo de autorização (`canGrantRole`, Permission)
- ADR-07 — Super Admin da plataforma
