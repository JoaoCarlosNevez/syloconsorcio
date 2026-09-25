// Script de manutenção — apaga do Storage as imagens que nada no banco usa
// mais (ícones de organização e fotos de perfil órfãos).
//
// Uso:
//   pnpm --filter @sylocrm/infrastructure storage:cleanup           # só lista
//   pnpm --filter @sylocrm/infrastructure storage:cleanup --apply   # apaga
//
// "Em uso" = o caminho aparece em organizations.branding.iconUrl ou em
// users.avatar_url (a URL pode ter ?v= de versão — ignorado na comparação).
// Qualquer outro arquivo dos buckets é órfão: sobra de troca de formato
// (icon.svg → icon.webp), foto removida antes da limpeza automática, etc.
//
// Apaga pela API do Storage (não direto em storage.objects), senão o arquivo
// físico continuaria ocupando espaço. Precisa de DATABASE_URL, SUPABASE_URL e
// SUPABASE_SERVICE_KEY — lidos de packages/infrastructure/.env ou, na falta,
// de apps/api/.env.

import { createClient } from '@supabase/supabase-js'
import { STORAGE_BUCKETS } from '@sylocrm/application'
import { config } from 'dotenv'
import { isNotNull, sql } from 'drizzle-orm'
import { createDatabase } from '../client'
import { organizations, users } from '../schema'

config({ path: ['.env', '../../apps/api/.env'] })

const BUCKETS: string[] = Object.values(STORAGE_BUCKETS)

/** ".../object/public/<bucket>/<path>?v=123" → { bucket, path }. */
function parsePublicUrl(url: string): { bucket: string; path: string } | null {
  const match = /\/object\/public\/([^/]+)\/([^?#]+)/.exec(url)
  if (!match?.[1] || !match[2]) return null
  return { bucket: match[1], path: decodeURIComponent(match[2]) }
}

async function main() {
  const apply = process.argv.includes('--apply')
  const databaseUrl = process.env.DATABASE_URL
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY
  if (!databaseUrl || !supabaseUrl || !supabaseServiceKey) {
    throw new Error('DATABASE_URL, SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórios.')
  }

  const db = createDatabase({ url: databaseUrl, ssl: 'require', maxConnections: 1 })

  const [orgRows, userRows, objectRows] = await Promise.all([
    db
      .select({ iconUrl: sql<string | null>`${organizations.branding}->>'iconUrl'` })
      .from(organizations),
    db.select({ avatarUrl: users.avatarUrl }).from(users).where(isNotNull(users.avatarUrl)),
    db.execute(
      sql`select bucket_id, name from storage.objects where bucket_id in ${BUCKETS}`,
    ) as unknown as Promise<{ bucket_id: string; name: string }[]>,
  ])

  const inUse = new Set<string>()
  for (const url of [...orgRows.map((r) => r.iconUrl), ...userRows.map((r) => r.avatarUrl)]) {
    const parsed = url ? parsePublicUrl(url) : null
    if (parsed) inUse.add(`${parsed.bucket}/${parsed.path}`)
  }

  const orphans = objectRows.filter((o) => !inUse.has(`${o.bucket_id}/${o.name}`))
  console.log(`${objectRows.length} arquivo(s) nos buckets, ${inUse.size} em uso.`)

  if (orphans.length === 0) {
    console.log('Nenhum arquivo órfão — nada a apagar.')
    process.exit(0)
  }

  console.log(`${orphans.length} arquivo(s) órfão(s):`)
  for (const o of orphans) console.log(`  - ${o.bucket_id}/${o.name}`)

  if (!apply) {
    console.log('\nNada foi apagado. Rode com --apply para apagar.')
    process.exit(0)
  }

  const storage = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }).storage

  for (const bucket of BUCKETS) {
    const paths = orphans.filter((o) => o.bucket_id === bucket).map((o) => o.name)
    if (paths.length === 0) continue
    const { error } = await storage.from(bucket).remove(paths)
    if (error) throw new Error(`Falha ao apagar em ${bucket}: ${error.message}`)
    console.log(`Apagado(s) ${paths.length} arquivo(s) de ${bucket}.`)
  }
  process.exit(0)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
