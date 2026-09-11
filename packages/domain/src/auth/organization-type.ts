// OrganizationType — tipo de organização na hierarquia do SyloCRM.
//
// Hierarquia:
//   INCORPORADORA → MASTER → REPRESENTACAO
//
// Uma REPRESENTACAO com parent_organization_id = null é uma Representação Independente.
// Não há tipo separado para isso — a independência é expressa pela ausência de pai.
//
// Invariantes:
//   INCORPORADORA: parent_organization_id é sempre null
//   MASTER:        parent_organization_id aponta para uma INCORPORADORA
//   REPRESENTACAO: parent_organization_id aponta para um MASTER ou é null (independente)

export const OrganizationType = {
  INCORPORADORA: 'INCORPORADORA',
  MASTER: 'MASTER',
  REPRESENTACAO: 'REPRESENTACAO',
} as const

export type OrganizationType = (typeof OrganizationType)[keyof typeof OrganizationType]
