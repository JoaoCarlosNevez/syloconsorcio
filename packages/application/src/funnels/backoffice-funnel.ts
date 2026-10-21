// Funil ADM — o pós-venda do backoffice. Fixo e obrigatório: toda
// organização tem exatamente um (criado na migration 0034, na criação da
// representação e, se faltar, na hora do primeiro Ganho). Não renomeia, não
// edita etapas, não vira padrão e não é excluído.
//
// Quando um lead de um funil de vendas é marcado como Ganho, uma cópia dele
// (com a ficha de adesão e os documentos) nasce na primeira etapa daqui, com o
// mesmo vendedor como responsável. O "Ganho" aqui (a partir de "Efetivado")
// marca a cota como efetivada — não conta como venda nas metas/ranking, que
// só olham o funil padrão.
//
// O Vendedor só acompanha: vê os cards dos clientes dele, mas não move, não
// edita, não exclui e não cria leads aqui. Comentários, ficha e documentos
// continuam liberados (é por onde ele resolve uma pendência com o backoffice).

import { AuthorizationError, Role } from '@sylocrm/domain'
import type { MembershipContext } from '../auth/auth-context'
import type {
  FunnelRecord,
  IFunnelRepository,
  NewFunnelStageInput,
} from '../ports/funnel.repository'

export const BACKOFFICE_FUNNEL_NAME = 'ADM'

export const BACKOFFICE_FUNNEL_STAGES: readonly NewFunnelStageInput[] = [
  { name: 'Conferência de documentos', color: '#f59e0b' },
  { name: 'Digitado na administradora', color: '#0ea5e9' },
  { name: 'Pendência', color: '#ef4444' },
  { name: 'Efetivado', color: '#10b981' },
]

/** O funil ADM da organização — cria se ainda não existir. */
export async function ensureBackofficeFunnel(
  funnelRepository: IFunnelRepository,
  organizationId: string,
): Promise<FunnelRecord> {
  const funnels = await funnelRepository.listByOrganization(organizationId)
  const existing = funnels.find((funnel) => funnel.kind === 'BACKOFFICE')
  if (existing) return existing
  return funnelRepository.create({
    organizationId,
    name: BACKOFFICE_FUNNEL_NAME,
    stages: [...BACKOFFICE_FUNNEL_STAGES],
    kind: 'BACKOFFICE',
  })
}

/** Vendedor só acompanha o funil ADM — não move, edita, exclui nem cria. */
export function assertCanChangeLeadsInFunnel(
  funnel: Pick<FunnelRecord, 'kind'> | null,
  membership: Pick<MembershipContext, 'role'>,
): void {
  if (funnel?.kind === 'BACKOFFICE' && membership.role === Role.SELLER) {
    throw new AuthorizationError(
      'O funil ADM é do Administrativo — o vendedor só acompanha os seus clientes por aqui.',
    )
  }
}

export const FIXED_FUNNEL_MESSAGE = 'O funil ADM é fixo — não dá pra alterar nem excluir.'
