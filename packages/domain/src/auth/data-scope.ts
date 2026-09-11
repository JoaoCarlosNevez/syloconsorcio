// DataScope — alcance dos registros que o usuário pode acessar.
//
// DataScope é calculado pelo backend a partir do tipo da organização + Role do Membership ativo.
// O frontend NUNCA envia ou determina o DataScope.
//
// Hierarquia de acesso:
//   own            → apenas registros do próprio usuário
//   representation → todos os registros da Representação
//   master         → todos os registros das Representações do Master
//   incorporadora  → visão agregada de toda a estrutura hierárquica

export const DataScope = {
  OWN: 'own',
  REPRESENTATION: 'representation',
  MASTER: 'master',
  INCORPORADORA: 'incorporadora',
} as const

export type DataScope = (typeof DataScope)[keyof typeof DataScope]
