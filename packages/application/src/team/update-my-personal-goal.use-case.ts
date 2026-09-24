// UpdateMyPersonalGoalUseCase — o próprio membro define (ou limpa) a sua meta
// pessoal do mês na organização ativa, pelo Perfil. É um objetivo dele,
// separado da meta que o gestor define em Configurações → Equipe; qualquer
// papel pode, e só pra si mesmo (o userId vem do contexto autenticado).

import type { IMembershipRepository } from '../ports/membership.repository'
import type { UseCase } from '../ports/use-case'

export interface UpdateMyPersonalGoalInput {
  userId: string
  organizationId: string
  /** Centavos de crédito (inteiro ≥ 0, validado na rota); null remove a meta. */
  personalGoalCents: number | null
}

export class UpdateMyPersonalGoalUseCase implements UseCase<UpdateMyPersonalGoalInput, void> {
  constructor(private readonly membershipRepository: IMembershipRepository) {}

  async execute(input: UpdateMyPersonalGoalInput): Promise<void> {
    await this.membershipRepository.updatePersonalGoal(
      input.userId,
      input.organizationId,
      input.personalGoalCents,
    )
  }
}
