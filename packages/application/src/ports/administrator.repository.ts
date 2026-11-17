// IAdministratorRepository — administradoras de consórcio da organização
// (Configurações → Administradoras). Implementação concreta em
// packages/infrastructure/src/database/repositories/.

export interface AdministratorRecord {
  id: string
  organizationId: string
  name: string
  /** Um ou mais e-mails, já em minúsculas e sem repetição. */
  emails: string[]
  createdAt: Date
  updatedAt: Date
}

export interface AdministratorInput {
  name: string
  emails: string[]
}

export interface IAdministratorRepository {
  /** Em ordem alfabética. */
  list(organizationId: string): Promise<AdministratorRecord[]>

  /** Lança ConflictError se já existe uma com o mesmo nome (sem diferenciar
   * maiúsculas) na organização. */
  create(organizationId: string, input: AdministratorInput): Promise<AdministratorRecord>

  /** null se não existe na organização. ConflictError no nome repetido. */
  update(
    id: string,
    organizationId: string,
    input: AdministratorInput,
  ): Promise<AdministratorRecord | null>

  /** false se não existe na organização. */
  delete(id: string, organizationId: string): Promise<boolean>
}
