// SupabaseStorageAdapter — implementação concreta de IStorageProvider.
//
// Isola o SDK de Storage do Supabase na camada Infrastructure.
// Usa a service key — o bucket em si controla acesso público de leitura;
// escrita só acontece através deste adapter (nunca direto do frontend).

import { createClient } from '@supabase/supabase-js'
import type { IStorageProvider, UploadFileInput } from '@sylocrm/application'

export interface SupabaseStorageConfig {
  supabaseUrl: string
  supabaseServiceKey: string
}

export class SupabaseStorageAdapter implements IStorageProvider {
  private readonly client: ReturnType<typeof createClient>

  constructor(config: SupabaseStorageConfig) {
    this.client = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }

  async uploadPublicFile(input: UploadFileInput): Promise<{ url: string }> {
    const { error } = await this.client.storage
      .from(input.bucket)
      .upload(input.path, input.data, { contentType: input.contentType, upsert: true })

    if (error) {
      throw new Error(`Falha ao enviar arquivo para o Storage: ${error.message}`)
    }

    // O caminho é fixo por dono (ex: "<orgId>/icon.webp") e o upload
    // sobrescreve, então a URL pública seria sempre igual e a troca de
    // ícone/foto não apareceria (cache do navegador e da CDN, e o React não
    // re-renderiza um <img> com o mesmo src). O ?v= versiona cada envio.
    const { data } = this.client.storage.from(input.bucket).getPublicUrl(input.path)
    return { url: `${data.publicUrl}?v=${Date.now()}` }
  }

  async deleteFolderFiles(input: {
    bucket: string
    folder: string
    keepPath?: string
  }): Promise<void> {
    const { data, error } = await this.client.storage.from(input.bucket).list(input.folder)
    if (error) {
      throw new Error(`Falha ao listar arquivos do Storage: ${error.message}`)
    }

    const paths = (data ?? [])
      .map((file) => `${input.folder}/${file.name}`)
      .filter((path) => path !== input.keepPath)
    if (paths.length === 0) return

    const { error: removeError } = await this.client.storage.from(input.bucket).remove(paths)
    if (removeError) {
      throw new Error(`Falha ao apagar arquivos do Storage: ${removeError.message}`)
    }
  }
}
