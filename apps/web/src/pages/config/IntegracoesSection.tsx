// Configurações > Integrações — chaves de API da organização e a
// documentação do webhook de criação de leads.
//
// A documentação espelha apps/api/src/routes/webhooks.route.ts — ao mudar
// campos, códigos ou respostas lá, atualize aqui também.

import { Modal, Skeleton, useToast } from '@sylocrm/ui'
import { type FormEvent, useState } from 'react'
import { useApiKeysQuery, useCreateApiKey, useRevokeApiKey } from '../../hooks/useApiKeys'
import { useFunnelsQuery } from '../../hooks/useFunnels'
import { useActiveOrganization } from '../../hooks/useOrganization'
import { API_URL } from '../../lib/api-client'
import type { ApiKey, CreatedApiKey } from '../../lib/api-keys-api'
import styles from './ConfigPage.module.css'
import docs from './IntegracoesSection.module.css'

const WEBHOOK_URL = `${API_URL}/webhooks/leads`

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function CopyButton({ value, label = 'Copiar' }: { value: string; label?: string }) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        type: 'error',
        title: 'Não foi possível copiar.',
        description:
          error instanceof Error ? error.message : 'Selecione o texto e copie manualmente.',
      })
    }
  }

  return (
    <button type="button" className={docs.copyBtn} onClick={handleCopy}>
      {copied ? 'Copiado!' : label}
    </button>
  )
}

function CodeBlock({ code, title }: { code: string; title?: string }) {
  return (
    <div className={docs.codeBlock}>
      <div className={docs.codeHeader}>
        <span>{title ?? ''}</span>
        <CopyButton value={code} />
      </div>
      <pre className={docs.code}>
        <code>{code}</code>
      </pre>
    </div>
  )
}

// ── Chaves ────────────────────────────────────────────────────────────────────

function ApiKeysCard({ organizationId }: { organizationId: string | null }) {
  const { toast } = useToast()
  const { data: apiKeys, isLoading, isError, refetch } = useApiKeysQuery(organizationId)
  const createKey = useCreateApiKey(organizationId)
  const revokeKey = useRevokeApiKey(organizationId)
  const [name, setName] = useState('')
  const [formError, setFormError] = useState('')
  const [createdKey, setCreatedKey] = useState<CreatedApiKey | null>(null)
  const [revoking, setRevoking] = useState<ApiKey | null>(null)

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setFormError('')
    if (!name.trim()) {
      setFormError('Dê um nome pra chave (ex: "Landing page").')
      return
    }
    try {
      const created = await createKey.mutateAsync(name.trim())
      setCreatedKey(created)
      setName('')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Não foi possível criar a chave.')
    }
  }

  async function handleRevoke() {
    if (!revoking) return
    try {
      await revokeKey.mutateAsync(revoking.id)
      if (createdKey?.id === revoking.id) setCreatedKey(null)
      toast({ type: 'success', title: `Chave “${revoking.name}” revogada.` })
      setRevoking(null)
    } catch (error) {
      toast({
        type: 'error',
        title: 'Não foi possível revogar a chave.',
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  return (
    <div className={styles.settingsCard}>
      <div className={styles.settingsCardHeader}>
        <div className={styles.settingsCardTitle}>Chaves de API</div>
        <div className={styles.settingsCardDesc}>
          Cada sistema que envia leads pro CRM usa uma chave. Crie uma por integração pra poder
          revogar só a que precisar.
        </div>
      </div>
      <div className={styles.settingsCardBody}>
        <form className={docs.createRow} onSubmit={handleCreate}>
          <div className={styles.formRow} style={{ flex: 1 }}>
            <label className={styles.formLabel} htmlFor="api-key-name">
              Nome da chave
            </label>
            <input
              id="api-key-name"
              className={styles.formInput}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex: Landing page, RD Station, Zapier"
              maxLength={80}
              disabled={createKey.isPending}
            />
          </div>
          <button type="submit" className={styles.primaryBtn} disabled={createKey.isPending}>
            {createKey.isPending ? 'Gerando…' : 'Gerar chave'}
          </button>
        </form>
        {formError && (
          <span className={styles.formError} role="alert">
            {formError}
          </span>
        )}

        {createdKey && (
          <output className={docs.newKey}>
            <div className={docs.newKeyTitle}>Chave “{createdKey.name}” criada</div>
            <p className={docs.newKeyWarning}>
              Copie agora e guarde num lugar seguro: por segurança, ela não aparece de novo. Se
              perder, é só revogar e gerar outra.
            </p>
            <div className={docs.newKeyValue}>
              <code>{createdKey.key}</code>
              <CopyButton value={createdKey.key} label="Copiar chave" />
            </div>
            <button type="button" className={docs.linkBtn} onClick={() => setCreatedKey(null)}>
              Já copiei, pode esconder
            </button>
          </output>
        )}

        {isLoading ? (
          <div className={docs.keyList} aria-hidden="true">
            {[0, 1].map((key) => (
              <div key={key} className={docs.keyRow}>
                <Skeleton variant="text" width="40%" height="14px" />
                <Skeleton variant="text" width="25%" height="12px" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className={docs.emptyState}>
            Não foi possível carregar as chaves.{' '}
            <button type="button" className={docs.linkBtn} onClick={() => refetch()}>
              Tentar de novo
            </button>
          </div>
        ) : !apiKeys || apiKeys.length === 0 ? (
          <div className={docs.emptyState}>Nenhuma chave ativa ainda.</div>
        ) : (
          <div className={docs.keyList}>
            {apiKeys.map((apiKey) => (
              <div key={apiKey.id} className={docs.keyRow}>
                <div className={docs.keyInfo}>
                  <span className={docs.keyName}>{apiKey.name}</span>
                  <code className={docs.keyPrefix}>{apiKey.keyPrefix}…</code>
                  <span className={docs.keyMeta}>
                    Criada em {formatDateTime(apiKey.createdAt)}
                    {apiKey.createdBy &&
                      ` por ${apiKey.createdBy.name?.trim() || apiKey.createdBy.email}`}
                    {' · '}
                    {apiKey.lastUsedAt
                      ? `Último uso em ${formatDateTime(apiKey.lastUsedAt)}`
                      : 'Nunca usada'}
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.dangerOutlineBtn}
                  onClick={() => setRevoking(apiKey)}
                >
                  Revogar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={revoking !== null}
        onClose={() => setRevoking(null)}
        title="Revogar chave de API"
        size="sm"
        footer={
          <>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => setRevoking(null)}
              disabled={revokeKey.isPending}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={styles.dangerOutlineBtn}
              onClick={handleRevoke}
              disabled={revokeKey.isPending}
            >
              {revokeKey.isPending ? 'Revogando…' : 'Revogar'}
            </button>
          </>
        }
      >
        <p className={docs.modalText}>
          A chave <strong>“{revoking?.name}”</strong> para de funcionar na hora: tudo que usa ela
          pra enviar leads vai receber erro 401. Não dá pra desfazer — se precisar, gere uma nova.
        </p>
      </Modal>
    </div>
  )
}

// ── Documentação ──────────────────────────────────────────────────────────────

interface FieldDoc {
  name: string
  type: string
  required: boolean
  description: string
}

const FIELDS: FieldDoc[] = [
  { name: 'name', type: 'texto', required: true, description: 'Nome do lead.' },
  {
    name: 'phone',
    type: 'texto',
    required: true,
    description:
      'Telefone com DDD, com ou sem formatação ("(11) 91234-5678" ou "11912345678"). Mínimo de 8 dígitos. Não pode repetir dentro da organização.',
  },
  { name: 'email', type: 'texto', required: false, description: 'E-mail do lead.' },
  {
    name: 'value',
    type: 'número',
    required: false,
    description:
      'Valor do crédito em reais, com ponto decimal (ex: 150000 ou 150000.50). Padrão: 0.',
  },
  {
    name: 'quotaCount',
    type: 'inteiro',
    required: false,
    description: 'Quantidade de cotas. Padrão: 1.',
  },
  {
    name: 'segment',
    type: 'texto',
    required: false,
    description: 'Tipo de crédito (ex: "Imobiliário", "Automóvel"). Padrão: "Não informado".',
  },
  {
    name: 'source',
    type: 'texto',
    required: false,
    description: 'Origem do lead (ex: "Landing page", "Facebook Ads"). Padrão: "Webhook".',
  },
  { name: 'notes', type: 'texto', required: false, description: 'Observações livres.' },
  {
    name: 'funnelId',
    type: 'texto (id)',
    required: false,
    description:
      'Funil onde o lead entra (sempre no primeiro estágio). Padrão: o funil padrão da organização. Os ids estão logo abaixo.',
  },
  {
    name: 'assignedUserEmail',
    type: 'texto',
    required: false,
    description:
      'E-mail de um membro ativo da equipe, que fica como responsável. Sem ele, o lead entra sem responsável.',
  },
]

const EXAMPLE_BODY = `{
  "name": "Maria Souza",
  "phone": "(11) 91234-5678",
  "email": "maria@exemplo.com",
  "value": 150000,
  "segment": "Imobiliário",
  "source": "Landing page",
  "notes": "Quer contemplar em 12 meses"
}`

const CURL_EXAMPLE = `curl -X POST ${WEBHOOK_URL} \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: SUA_CHAVE_AQUI" \\
  -d '${EXAMPLE_BODY.replace(/\n\s*/g, ' ')}'`

const JS_EXAMPLE = `await fetch('${WEBHOOK_URL}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': process.env.SYLO_API_KEY,
  },
  body: JSON.stringify({
    name: 'Maria Souza',
    phone: '(11) 91234-5678',
    source: 'Landing page',
  }),
})`

const RESPONSE_CREATED = `{
  "lead": {
    "id": "c8c47b9e-4ebb-4ffa-9e34-31271c71fb1a",
    "name": "Maria Souza",
    "phone": "(11) 91234-5678",
    "email": "maria@exemplo.com",
    "funnelId": "0fa0681d-04f9-4e2c-8eb5-0c7b58c1bc2d",
    "stageId": "5d1f2b7e-9a41-4c3e-8f0b-2c6d7e8f9a10",
    "assignedUserId": null,
    "createdAt": "2026-09-29T14:03:12.000Z"
  }
}`

const RESPONSES: { status: string; code: string; description: string }[] = [
  { status: '201', code: '—', description: 'Lead criado. O corpo traz o lead (veja o exemplo).' },
  {
    status: '400',
    code: 'VALIDATION_ERROR',
    description:
      'Dados inválidos. O campo "details" diz o problema de cada campo — ex: { "phone": ["Telefone precisa ter pelo menos 8 dígitos."] }.',
  },
  {
    status: '401',
    code: 'INVALID_API_KEY',
    description: 'Chave ausente, errada ou revogada.',
  },
  {
    status: '409',
    code: 'LEAD_ALREADY_EXISTS',
    description:
      'Já existe um lead com esse telefone. Nada é criado; o corpo traz o lead existente em "lead".',
  },
  {
    status: '500',
    code: '—',
    description: 'Erro inesperado do nosso lado. Pode tentar de novo depois.',
  },
]

function WebhookDocsCard({ organizationId }: { organizationId: string | null }) {
  const { data: funnelsData, isLoading: funnelsLoading } = useFunnelsQuery(organizationId)
  const funnels = funnelsData?.funnels ?? []

  return (
    <div className={styles.settingsCard}>
      <div className={styles.settingsCardHeader}>
        <div className={styles.settingsCardTitle}>Webhook de criação de leads</div>
        <div className={styles.settingsCardDesc}>
          Envie leads de landing pages, formulários ou ferramentas como Zapier, Make, n8n e RD
          Station direto pro funil
        </div>
      </div>
      <div className={`${styles.settingsCardBody} ${docs.docs}`}>
        <section>
          <h3 className={docs.docTitle}>Endereço</h3>
          <div className={docs.endpoint}>
            <span className={docs.method}>POST</span>
            <code>{WEBHOOK_URL}</code>
            <CopyButton value={WEBHOOK_URL} />
          </div>
        </section>

        <section>
          <h3 className={docs.docTitle}>Autenticação</h3>
          <p className={docs.docText}>
            Envie a chave no header <code>X-Api-Key</code>. Também aceitamos{' '}
            <code>Authorization: Bearer SUA_CHAVE</code>. O corpo é JSON, com o header{' '}
            <code>Content-Type: application/json</code>.
          </p>
          <p className={docs.callout}>
            A chave dá acesso à criação de leads da organização inteira. Use só em servidores ou
            ferramentas de automação — nunca no código de uma página que roda no navegador do
            visitante, onde qualquer um consegue ver.
          </p>
        </section>

        <section>
          <h3 className={docs.docTitle}>Campos</h3>
          <div className={docs.tableWrap}>
            <table className={docs.table}>
              <thead>
                <tr>
                  <th>Campo</th>
                  <th>Tipo</th>
                  <th>Obrigatório</th>
                  <th>Descrição</th>
                </tr>
              </thead>
              <tbody>
                {FIELDS.map((field) => (
                  <tr key={field.name}>
                    <td>
                      <code>{field.name}</code>
                    </td>
                    <td>{field.type}</td>
                    <td>{field.required ? 'Sim' : 'Não'}</td>
                    <td>{field.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h3 className={docs.docTitle}>Ids dos funis</h3>
          {funnelsLoading ? (
            <Skeleton variant="rect" width="100%" height="64px" />
          ) : funnels.length === 0 ? (
            <p className={docs.docText}>
              A organização ainda não tem funis — crie um em Configurações &gt; Organização antes de
              usar o webhook.
            </p>
          ) : (
            <div className={docs.tableWrap}>
              <table className={docs.table}>
                <thead>
                  <tr>
                    <th>Funil</th>
                    <th>funnelId</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {funnels.map((funnel) => (
                    <tr key={funnel.id}>
                      <td>
                        {funnel.name}
                        {funnel.isDefault && <span className={docs.defaultBadge}>padrão</span>}
                      </td>
                      <td>
                        <code>{funnel.id}</code>
                      </td>
                      <td className={docs.alignRight}>
                        <CopyButton value={funnel.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h3 className={docs.docTitle}>Exemplos</h3>
          <CodeBlock title="cURL" code={CURL_EXAMPLE} />
          <CodeBlock title="JavaScript (servidor / Node.js)" code={JS_EXAMPLE} />
        </section>

        <section>
          <h3 className={docs.docTitle}>Respostas</h3>
          <div className={docs.tableWrap}>
            <table className={docs.table}>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>code</th>
                  <th>Quando</th>
                </tr>
              </thead>
              <tbody>
                {RESPONSES.map((response) => (
                  <tr key={response.status}>
                    <td>
                      <code>{response.status}</code>
                    </td>
                    <td>{response.code === '—' ? '—' : <code>{response.code}</code>}</td>
                    <td>{response.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <CodeBlock title="Exemplo de resposta 201" code={RESPONSE_CREATED} />
        </section>

        <section>
          <h3 className={docs.docTitle}>Como o lead entra no CRM</h3>
          <ul className={docs.list}>
            <li>
              Sempre no primeiro estágio do funil (o padrão, ou o de <code>funnelId</code>).
            </li>
            <li>
              Com responsável só se <code>assignedUserEmail</code> for informado; senão, fica sem
              responsável e visível pra Dono e Supervisores distribuírem.
            </li>
            <li>
              Aparece em Configurações &gt; Atividade como criado pelo “Sistema”, e a chave usada
              ganha a data de “último uso”.
            </li>
            <li>
              Telefones repetidos não criam lead novo (resposta 409) — é seguro reenviar o mesmo
              formulário.
            </li>
          </ul>
        </section>
      </div>
    </div>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────

export function IntegracoesSection() {
  const { organizationId, membership } = useActiveOrganization()
  const canManage = membership?.permissions.includes('integration.manage') ?? false

  if (!canManage) {
    return (
      <div className={styles.settingsContent}>
        <div className={styles.settingsCard}>
          <div className={styles.settingsCardBody}>
            <p className={docs.docText}>Só o Dono da organização pode gerenciar as integrações.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.settingsContent}>
      <ApiKeysCard organizationId={organizationId} />
      <WebhookDocsCard organizationId={organizationId} />
    </div>
  )
}
