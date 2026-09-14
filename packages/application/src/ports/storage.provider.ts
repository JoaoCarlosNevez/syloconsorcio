// IStorageProvider — port para upload de arquivos (ex: ícone de organização).
//
// AGENTS.md: "avaliar o uso do Supabase Storage em vez de criar armazenamento
// próprio." Este port isola o SDK de Storage na camada Infrastructure — a
// Application nunca importa @supabase/supabase-js diretamente.
// Implementação concreta: packages/infrastructure/src/storage/

export interface UploadFileInput {
  bucket: string
  path: string
  data: Buffer
  contentType: string
}

export interface IStorageProvider {
  /** Envia um arquivo para um bucket público e retorna sua URL pública. */
  uploadPublicFile(input: UploadFileInput): Promise<{ url: string }>
}
