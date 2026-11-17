// AdministratorUseCases — cadastro das administradoras de consórcio da
// organização. A permissão (organization.update pra gravar; qualquer membro
// pra listar, já que a ficha de adesão usa a lista) é checada na rota.

import { ValidationError } from '@sylocrm/domain'
import type {
  AdministratorInput,
  AdministratorRecord,
  IAdministratorRepository,
} from '../ports/administrator.repository'

export const MAX_ADMINISTRATOR_EMAILS = 10
const MAX_NAME_LENGTH = 80
// Simples de propósito: o objetivo é pegar erro de digitação, não validar RFC.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Nome aparado e e-mails em minúsculas, sem repetição; ValidationError se
 * algo não serve. */
export function normalizeAdministrator(input: AdministratorInput): AdministratorInput {
  const name = input.name.trim().replace(/\s+/g, ' ')
  if (!name) throw new ValidationError([{ field: 'name', message: 'Informe o nome.' }])
  if (name.length > MAX_NAME_LENGTH) {
    throw new ValidationError([{ field: 'name', message: 'Nome muito longo.' }])
  }
  const emails = [
    ...new Set(input.emails.map((email) => email.trim().toLowerCase()).filter(Boolean)),
  ]
  if (emails.length === 0) {
    throw new ValidationError([{ field: 'emails', message: 'Informe pelo menos um e-mail.' }])
  }
  if (emails.length > MAX_ADMINISTRATOR_EMAILS) {
    throw new ValidationError([
      { field: 'emails', message: `No máximo ${MAX_ADMINISTRATOR_EMAILS} e-mails.` },
    ])
  }
  const invalid = emails.find((email) => !EMAIL_PATTERN.test(email))
  if (invalid) {
    throw new ValidationError([{ field: 'emails', message: `E-mail inválido: ${invalid}` }])
  }
  return { name, emails }
}

export class AdministratorUseCases {
  constructor(private readonly repository: IAdministratorRepository) {}

  list(organizationId: string): Promise<AdministratorRecord[]> {
    return this.repository.list(organizationId)
  }

  create(organizationId: string, input: AdministratorInput): Promise<AdministratorRecord> {
    return this.repository.create(organizationId, normalizeAdministrator(input))
  }

  update(
    id: string,
    organizationId: string,
    input: AdministratorInput,
  ): Promise<AdministratorRecord | null> {
    return this.repository.update(id, organizationId, normalizeAdministrator(input))
  }

  delete(id: string, organizationId: string): Promise<boolean> {
    return this.repository.delete(id, organizationId)
  }
}
