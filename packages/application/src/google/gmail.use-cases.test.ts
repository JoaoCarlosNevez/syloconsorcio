// Tests: GmailUseCases — conectar pela volta do Google e mandar a ficha.

import { DataScope, OrganizationType, Role } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import type { MembershipContext } from '../auth/auth-context'
import type { IActivityLogRepository } from '../ports/activity-log.repository'
import {
  GmailNotConnectedError,
  type IGmailGateway,
  type IGoogleAccountRepository,
  type IOAuthStateSigner,
  type OAuthStateClaims,
} from '../ports/gmail.ports'
import type { LeadRecord } from '../ports/lead.repository'
import { GMAIL_MAX_ATTACHMENTS_BYTES, GmailUseCases } from './gmail.use-cases'

const ORG = 'org-1'
const USER = 'user-1'
const LEAD = { id: 'lead-1', organizationId: ORG, name: 'Maria' } as LeadRecord
const PORTO = {
  id: 'adm-1',
  organizationId: ORG,
  name: 'Porto',
  emails: ['cadastro@porto.com.br'],
  createdAt: new Date(),
  updatedAt: new Date(),
}
const MEMBERSHIP: MembershipContext = {
  organizationId: ORG,
  organizationType: OrganizationType.REPRESENTACAO,
  organizationName: 'Rep',
  organizationIconUrl: null,
  organizationSecondaryColor: null,
  tier: 'bronze',
  sectors: [],
  role: Role.BACKOFFICE,
  dataScope: DataScope.REPRESENTATION,
  permissions: [],
}

function setup(options: { connected?: boolean; sendError?: Error; documentBytes?: number } = {}) {
  const connected = options.connected ?? true
  const accounts: IGoogleAccountRepository = {
    find: vi
      .fn()
      .mockResolvedValue(
        connected ? { userId: USER, googleEmail: 'ana@gmail.com', connectedAt: new Date() } : null,
      ),
    findRefreshToken: vi.fn().mockResolvedValue(connected ? 'refresh-1' : null),
    save: vi.fn(),
    remove: vi.fn(),
  }
  const gateway: IGmailGateway = {
    authorizationUrl: vi.fn((state: string) => `https://google/auth?state=${state}`),
    exchangeCode: vi
      .fn()
      .mockResolvedValue({ googleEmail: 'ana@gmail.com', refreshToken: 'r', scopes: 's' }),
    send: options.sendError ? vi.fn().mockRejectedValue(options.sendError) : vi.fn(),
    revoke: vi.fn(),
  }
  const claims: OAuthStateClaims = {
    userId: USER,
    returnTo: 'https://app/config',
    expiresAt: new Date(Date.now() + 60_000),
  }
  const stateSigner: IOAuthStateSigner = {
    sign: vi.fn(() => 'signed-state'),
    verify: vi.fn((state: string) => (state === 'signed-state' ? claims : null)),
  }
  const activityLog: IActivityLogRepository = { record: vi.fn(), list: vi.fn() }
  const useCases = new GmailUseCases(
    accounts,
    gateway,
    stateSigner,
    { findById: vi.fn(async (id: string) => (id === LEAD.id ? LEAD : null)) } as never,
    { findChildOrganizationIds: vi.fn().mockResolvedValue([]) } as never,
    { list: vi.fn().mockResolvedValue([PORTO]) },
    {
      listDocuments: vi
        .fn()
        .mockResolvedValue([
          { fileName: 'rg.jpg', contentType: 'image/jpeg', storagePath: `${ORG}/lead-1/rg.jpg` },
        ]),
    },
    {
      downloadPrivateFile: vi.fn().mockResolvedValue(Buffer.alloc(options.documentBytes ?? 10, 1)),
    },
    activityLog,
  )
  return { useCases, accounts, gateway, activityLog }
}

const SEND = {
  userId: USER,
  membership: MEMBERSHIP,
  leadId: LEAD.id,
  administratorId: PORTO.id,
  subject: 'Ficha de adesão — Maria',
  body: 'Segue a ficha.',
}

describe('GmailUseCases — conexão', () => {
  it('builds the Google URL with a signed state', () => {
    const { useCases } = setup()
    expect(useCases.connectUrl(USER, 'https://app/config')).toBe(
      'https://google/auth?state=signed-state',
    )
  })

  it('saves the account when the Google callback comes back with a code', async () => {
    const { useCases, accounts } = setup({ connected: false })
    const result = await useCases.handleCallback({
      code: 'code-1',
      state: 'signed-state',
      error: null,
    })
    expect(result).toEqual({ returnTo: 'https://app/config', connected: true })
    expect(accounts.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER, googleEmail: 'ana@gmail.com' }),
    )
  })

  it('ignores a forged state and reports a denied consent', async () => {
    const { useCases, accounts } = setup({ connected: false })
    expect(await useCases.handleCallback({ code: 'c', state: 'forged', error: null })).toBeNull()
    expect(
      await useCases.handleCallback({ code: null, state: 'signed-state', error: 'access_denied' }),
    ).toEqual({ returnTo: 'https://app/config', connected: false })
    expect(accounts.save).not.toHaveBeenCalled()
  })

  it('removes and revokes on disconnect', async () => {
    const { useCases, accounts, gateway } = setup()
    await useCases.disconnect(USER)
    expect(accounts.remove).toHaveBeenCalledWith(USER)
    expect(gateway.revoke).toHaveBeenCalledWith('refresh-1')
  })
})

describe('GmailUseCases.sendAdhesion', () => {
  it('sends to the registered administrator with the documents and logs it', async () => {
    const { useCases, gateway, activityLog } = setup()
    const result = await useCases.sendAdhesion(SEND)
    expect(result).toEqual({
      ok: true,
      administratorName: 'Porto',
      to: ['cadastro@porto.com.br'],
      attachments: 1,
      from: 'ana@gmail.com',
    })
    expect(gateway.send).toHaveBeenCalledWith('refresh-1', {
      to: ['cadastro@porto.com.br'],
      subject: SEND.subject,
      text: SEND.body,
      attachments: [expect.objectContaining({ filename: 'rg.jpg', contentType: 'image/jpeg' })],
    })
    expect(activityLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'lead.adhesion_emailed', entityId: LEAD.id }),
    )
  })

  it('asks to connect when there is no Google account', async () => {
    const { useCases, gateway } = setup({ connected: false })
    expect(await useCases.sendAdhesion(SEND)).toEqual({ ok: false, reason: 'not_connected' })
    expect(gateway.send).not.toHaveBeenCalled()
  })

  it('refuses a lead out of reach or an administrator from elsewhere', async () => {
    const { useCases } = setup()
    expect(await useCases.sendAdhesion({ ...SEND, leadId: 'other' })).toEqual({
      ok: false,
      reason: 'lead_not_found',
    })
    expect(await useCases.sendAdhesion({ ...SEND, administratorId: 'other' })).toEqual({
      ok: false,
      reason: 'administrator_not_found',
    })
  })

  it('drops a dead Google token so the screen asks to reconnect', async () => {
    const { useCases, accounts } = setup({ sendError: new GmailNotConnectedError() })
    expect(await useCases.sendAdhesion(SEND)).toEqual({ ok: false, reason: 'not_connected' })
    expect(accounts.remove).toHaveBeenCalledWith(USER)
  })

  it('refuses documents over the Gmail limit', async () => {
    const { useCases, gateway } = setup({ documentBytes: GMAIL_MAX_ATTACHMENTS_BYTES + 1 })
    await expect(useCases.sendAdhesion(SEND)).rejects.toThrow('limite do Gmail')
    expect(gateway.send).not.toHaveBeenCalled()
  })
})
