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

    const { data } = this.client.storage.from(input.bucket).getPublicUrl(input.path)
    return { url: data.publicUrl }
  }
}
