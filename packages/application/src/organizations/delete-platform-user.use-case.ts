// DeletePlatformUserUseCase — Super Admin apaga a conta de uma pessoa da
// plataforma inteira.
//
// "Apagar" aqui significa: a pessoa nunca mais consegue logar (identidade no
// Supabase Auth apagada) e deixa de pertencer a qualquer organização (todos
// os memberships apagados). O registro em `users` (nome/e-mail) NÃO é
// apagado — lead_assignment_history.changed_by_user_id referencia `users` e
// é um rastro de auditoria que nunca é apagado ou atualizado (ver schema),
// então apagar a linha quebraria essa referência para qualquer pessoa que já
// tenha mexido em um lead. O registro fica como um identificador "morto":
// sem login, sem organização, mas ainda resolvível no histórico.
//
// A checagem de "é Super Admin" acontece na camada HTTP.

import { AuthorizationError } from '@sylocrm/domain'
import type { IAuthProvider } from '../ports/auth.provider'
import type { IMembershipRepository } from '../ports/membership.repository'
import type { UseCase } from '../ports/use-case'

export interface DeletePlatformUserInput {
  actorUserId: string
  targetUserId: string
}

export class DeletePlatformUserUseCase implements UseCase<DeletePlatformUserInput, void> {
  constructor(
    private readonly authProvider: IAuthProvider,
    private readonly membershipRepository: IMembershipRepository,
  ) {}

  async execute(input: DeletePlatformUserInput): Promise<void> {
    if (input.actorUserId === input.targetUserId) {
      throw new AuthorizationError('Você não pode apagar a própria conta.')
    }

    await this.membershipRepository.removeAllForUser(input.targetUserId)
    await this.authProvider.deleteUser(input.targetUserId)
  }
}
