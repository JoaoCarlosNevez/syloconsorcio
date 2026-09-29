import { AuthError } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '../lib/supabase'
import { ChangePasswordError, changePassword } from './useChangePassword'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      updateUser: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))

const auth = vi.mocked(supabase.auth)
const INPUT = { currentPassword: 'senha-atual', newPassword: 'NovaSenha#2026' }

function authError(code: string, message = code) {
  return new AuthError(message, 400, code)
}

beforeEach(() => {
  vi.resetAllMocks()
  auth.getUser.mockResolvedValue({
    data: { user: { email: 'maria@empresa.com' } },
    error: null,
  } as never)
  auth.signInWithPassword.mockResolvedValue({ data: {}, error: null } as never)
  auth.updateUser.mockResolvedValue({ data: {}, error: null } as never)
  auth.signOut.mockResolvedValue({ error: null })
})

describe('changePassword', () => {
  it('checks the current password, updates it and signs out the other sessions', async () => {
    await changePassword(INPUT)

    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'maria@empresa.com',
      password: 'senha-atual',
    })
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'NovaSenha#2026' })
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'others' })
  })

  it('rejects a wrong current password without changing anything', async () => {
    auth.signInWithPassword.mockResolvedValue({
      data: {},
      error: authError('invalid_credentials', 'Invalid login credentials'),
    } as never)

    await expect(changePassword(INPUT)).rejects.toEqual(
      new ChangePasswordError('Senha atual incorreta.', 'current'),
    )
    expect(auth.updateUser).not.toHaveBeenCalled()
  })

  it('explains when the new password equals the old one', async () => {
    auth.updateUser.mockResolvedValue({ data: {}, error: authError('same_password') } as never)

    await expect(changePassword(INPUT)).rejects.toThrow(
      'A nova senha precisa ser diferente da atual.',
    )
    expect(auth.signOut).not.toHaveBeenCalled()
  })

  it('still succeeds when signing out the other sessions fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    auth.signOut.mockResolvedValue({ error: authError('unexpected_failure') })

    await expect(changePassword(INPUT)).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalled()
  })
})
