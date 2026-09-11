# ADR-04 — Modelo de autorização: Role, Permission, Scope e Data Visibility

**Status:** Aceito
**Data:** 2026-09-08

---

## Contexto

Sistemas CRM multi-tenant com hierarquias organizacionais têm requisitos de autorização complexos. A tentação comum é tratar Role como o único mecanismo de autorização, resultando em condicionais espalhados (`if role === 'ADMIN'`) e lógica de visibilidade acoplada a componentes de UI.

O SyloCRM 2.0 possui uma hierarquia de quatro níveis (Incorporadora → Master → Representação → Vendedor), memberships múltiplos por usuário, e regras de visibilidade de dados que variam por nível. É necessário um modelo de autorização extensível que não precise ser reescrito à medida que o produto cresce.

---

## Decisão

Separar explicitamente quatro conceitos de autorização:

1. **Role** — abstração de negócio (quem o usuário é na organização)
2. **Permission** — ação autorizada (o que o usuário pode fazer)
3. **Data Scope** — alcance dos dados (quais registros o usuário pode acessar)
4. **Data Visibility** — visibilidade de campos (quais detalhes o usuário pode ver)

Usar **Membership** como entidade central de autorização.

---

## Definições

### Authentication
**Pergunta:** Quem é o usuário?
**Resposta:** JWT válido → `user_id` verificado

### Authorization
**Pergunta:** O que ele pode fazer?
**Resposta:** Permissions derivadas do Role no contexto do Membership ativo

### Data Scope
**Pergunta:** Quais registros ele pode acessar?
**Resposta:** Calculado a partir do tipo de organização + role do membership

### Data Visibility
**Pergunta:** Quais campos/detalhes desses registros ele pode visualizar?
**Resposta:** Aplicada na serialização da resposta da API

---

## Roles definidos (nomes em inglês no código)

| Role    | Código    | Descrição                    |
|---------|-----------|------------------------------|
| Admin   | `ADMIN`   | Administrador da organização |
| Manager | `MANAGER` | Gerência operacional         |
| Seller  | `SELLER`  | Vendedor, nível operacional  |

Roles são abstrações de negócio. Eles não contêm lógica de permissão diretamente.

O mesmo usuário pode ter roles diferentes em organizações diferentes via Membership.

---

## Permissions (exemplos — não exaustivo)

```
lead.read
lead.create
lead.update
lead.assign
lead.delete
user.invite
reports.read
```

Permissions são derivadas do Role + contexto da Organization no momento da requisição.

---

## Data Scope

| Scope            | Registros acessíveis                                  |
|------------------|-------------------------------------------------------|
| `own`            | Apenas os próprios registros do usuário               |
| `representation` | Todos os registros da representação                   |
| `master`         | Todas as representações do Master                     |
| `incorporadora`  | Visão agregada de toda a estrutura                    |

Scope é calculado a partir do tipo da organização + role do membership ativo.

---

## Data Visibility

Exemplo de regra:
- Um usuário com scope `incorporadora` não visualiza telefone de leads por padrão
- Um usuário com scope `own` visualiza todos os campos dos seus leads
- CPFs de sócios são sempre mascarados (`***.***.***-XX`)

Data Visibility é aplicada na camada de serialização da resposta da API (response serializer / DTO transformer). Não é aplicada no banco — os dados são buscados completos e filtrados antes de sair da API.

---

## Membership como entidade central

```sql
organization_memberships
├── user_id
├── organization_id
├── role             ← Role do usuário nesta organização específica
├── status
└── ...
```

No momento de cada requisição:
1. O token JWT identifica o `user_id`
2. O middleware resolve o membership ativo (`user_id` + `organization_id` da requisição)
3. O contexto é construído: `{ userId, organizationId, role, permissions, dataScope }`
4. Cada use case recebe esse contexto e o usa para autorizar e filtrar dados

---

## O que não implementar agora

- Sistema completo de RBAC configurável pelo usuário
- Permissões customizáveis por organização
- Hierarquia complexa de permissões herdadas

A arquitetura deve **preservar a capacidade de evoluir** para isso, mas não implementar agora.

---

## Consequências

- Não usar `if (role === 'ADMIN')` espalhado no código — usar verificações de permission
- Não expor scope ou visibility decisions no frontend — backend decide e serializa
- Ao adicionar novas features, a pergunta é: "qual permission esta ação requer?" — não "qual role?"
- Data Visibility permite que a mesma rota retorne dados diferentes para roles diferentes, sem duplicar endpoints
- A separação clara dos quatro conceitos permite evoluir cada um independentemente

---

## Referências

- `docs/architecture.md` — seção "Autorização em camadas"
- `AGENTS.md` — seção 8, "Autorização em camadas"
