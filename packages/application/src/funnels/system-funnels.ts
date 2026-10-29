// Funis fixos do sistema — toda organização tem um de cada (migrations 0034,
// 0036 e 0041, criação da representação e, se faltar, na hora do Ganho):
//
//   Comercial (COMMERCIAL) → ADM (BACKOFFICE) → Pós-venda (POST_SALE)
//
// - Comercial: o funil padrão. Não renomeia, não exclui, não deixa de ser o
//   padrão; as etapas o Dono ajusta.
// - ADM e Pós-venda: etapas fixas — não renomeia, não edita, não exclui.
// - Ganho no Comercial (ou num funil de vendas extra) copia o lead pro ADM;
//   Ganho no ADM ("Efetivado") copia pro Pós-venda. As cópias levam a ficha
//   de adesão e os documentos e mantêm o vendedor como responsável.
//
// Funil ADM:
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
  FunnelKind,
  FunnelRecord,
  IFunnelRepository,
  NewFunnelStageInput,
} from '../ports/funnel.repository'

export const BACKOFFICE_FUNNEL_NAME = 'ADM'

export const BACKOFFICE_FUNNEL_STAGES: readonly NewFunnelStageInput[] = [
  { name: 'Conferência de documentos', color: '#f59e0b' },
  { name: 'Checado', color: '#8b5cf6' },
  { name: 'Enviado', color: '#0ea5e9' },
  { name: 'Pendência', color: '#ef4444' },
  { name: 'Efetivado', color: '#10b981' },
]

export const POST_SALE_FUNNEL_NAME = 'Pós-venda'

/** Etapa do Pós-venda que conta como inadimplência no painel. */
export const POST_SALE_LATE_STAGE = 'Atrasado'

export const POST_SALE_FUNNEL_STAGES: readonly NewFunnelStageInput[] = [
  { name: 'Boas-vindas', color: '#8b5cf6' },
  { name: 'Aguardando 1º boleto', color: '#f59e0b' },
  { name: 'Em dia', color: '#10b981' },
  { name: POST_SALE_LATE_STAGE, color: '#ef4444' },
  { name: 'Contemplado', color: '#0ea5e9' },
]

const SYSTEM_FUNNELS = {
  BACKOFFICE: { name: BACKOFFICE_FUNNEL_NAME, stages: BACKOFFICE_FUNNEL_STAGES },
  POST_SALE: { name: POST_SALE_FUNNEL_NAME, stages: POST_SALE_FUNNEL_STAGES },
} as const

/** Funil fixo (ADM ou Pós-venda) da organização — cria se ainda não existir. */
export async function ensureSystemFunnel(
  funnelRepository: IFunnelRepository,
  organizationId: string,
  kind: keyof typeof SYSTEM_FUNNELS,
): Promise<FunnelRecord> {
  const funnels = await funnelRepository.listByOrganization(organizationId)
  const existing = funnels.find((funnel) => funnel.kind === kind)
  if (existing) return existing
  return funnelRepository.create({
    organizationId,
    name: SYSTEM_FUNNELS[kind].name,
    stages: [...SYSTEM_FUNNELS[kind].stages],
    kind,
  })
}

/** Pra onde vai a cópia do lead ganho neste funil (null = fim da linha). */
export function nextFunnelKindOnWin(kind: FunnelKind): 'BACKOFFICE' | 'POST_SALE' | null {
  if (kind === 'COMMERCIAL' || kind === 'SALES') return 'BACKOFFICE'
  if (kind === 'BACKOFFICE') return 'POST_SALE'
  return null
}

/** Etapas travadas (ADM e Pós-venda). */
export function hasFixedStages(kind: FunnelKind): boolean {
  return kind === 'BACKOFFICE' || kind === 'POST_SALE'
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

export const FIXED_FUNNEL_MESSAGE = 'Este funil é fixo — não dá pra alterar nem excluir.'
