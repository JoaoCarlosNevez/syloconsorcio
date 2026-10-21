// IStorageProvider — port para upload de arquivos (ex: ícone de organização).
//
// AGENTS.md: "avaliar o uso do Supabase Storage em vez de criar armazenamento
// próprio." Este port isola o SDK de Storage na camada Infrastructure — a
// Application nunca importa @supabase/supabase-js diretamente.
// Implementação concreta: packages/infrastructure/src/storage/

/** Buckets públicos do Storage. Cada dono (organização/usuário) tem uma
 * pasta com o próprio id, com um único arquivo vigente dentro. */
export const STORAGE_BUCKETS = {
  organizationIcons: 'organization-icons',
  userAvatars: 'user-avatars',
} as const

/** Buckets PRIVADOS — documentos de cliente (LGPD). Nunca têm URL pública:
 * leitura só por link assinado de curta duração, gerado pela API pra quem
 * enxerga o lead. Pasta por "<organizationId>/<leadId>". */
export const PRIVATE_STORAGE_BUCKETS = {
  leadDocuments: 'lead-documents',
} as const

export interface UploadFileInput {
  bucket: string
  path: string
  data: Buffer
  contentType: string
}

export interface IStorageProvider {
  /**
   * Envia um arquivo para um bucket público (sobrescrevendo o mesmo caminho) e
   * retorna sua URL pública versionada — muda a cada envio, pra navegador e CDN
   * não continuarem servindo a versão anterior do arquivo.
   */
  uploadPublicFile(input: UploadFileInput): Promise<{ url: string }>

  /**
   * Apaga os arquivos de uma pasta do bucket (ex: "<orgId>"), exceto
   * `keepPath` quando informado — usado pra manter só o arquivo vigente
   * (ex: trocou o ícone de SVG pra PNG → apaga o icon.svg antigo) e pra apagar
   * a foto quando ela é removida.
   */
  deleteFolderFiles(input: { bucket: string; folder: string; keepPath?: string }): Promise<void>

  /** Envia um arquivo para um bucket privado (sobrescrevendo o caminho). */
  uploadPrivateFile(input: UploadFileInput): Promise<void>

  /** Link temporário pra ler um arquivo de bucket privado. */
  createSignedUrl(input: {
    bucket: string
    path: string
    expiresInSeconds: number
  }): Promise<string>

  /** Copia um arquivo dentro do mesmo bucket. */
  copyFile(input: { bucket: string; from: string; to: string }): Promise<void>

  /** Apaga arquivos específicos de um bucket. */
  deleteFiles(input: { bucket: string; paths: string[] }): Promise<void>
}
