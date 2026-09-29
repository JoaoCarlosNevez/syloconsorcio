// useChangePassword — troca de senha do próprio usuário (Configurações >
// Segurança), direto no Supabase Auth (ADR-06).
//
// 1. Confere a senha atual refazendo o login com ela — o Supabase não tem uma
//    chamada só pra "verificar senha".
// 2. Troca pela nova (auth.updateUser).
// 3. Encerra as sessões nos outros navegadores/dispositivos: quem trocou a
//    senha por suspeita de acesso indevido não quer a sessão antiga viva.
//    A sessão atual continua.

import { AuthError } from '@supabase/supabase-js'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

/** Erro já com a mensagem pronta pra mostrar na tela. */
export class ChangePasswordError extends Error {
  constructor(
    message: string,
    public readonly field: 'current' | 'next' | null,
  ) {
    super(message)
    this.name = 'ChangePasswordError'
  }
}

function toChangePasswordError(error: AuthError): ChangePasswordError {
  switch (error.code) {
    case 'same_password':
      return new ChangePasswordError('A nova senha precisa ser diferente da atual.', 'next')
    case 'weak_password':
      return new ChangePasswordError(
        'Senha fraca. Use letras, números e símbolos, com pelo menos 8 caracteres.',
        'next',
      )
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return new ChangePasswordError(
        'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.',
        null,
      )
    case 'reauthentication_needed':
      return new ChangePasswordError(
        'Por segurança, saia e entre de novo na sua conta antes de trocar a senha.',
        null,
      )
    default:
      return new ChangePasswordError(`Não foi possível trocar a senha: ${error.message}`, null)
  }
}

export async function changePassword({ currentPassword, newPassword }: ChangePasswordInput) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError) throw toChangePasswordError(userError)
  if (!user?.email) {
    throw new ChangePasswordError('Sessão expirada. Entre de novo na sua conta.', null)
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })
  if (verifyError) {
    if (verifyError.code === 'invalid_credentials') {
      throw new ChangePasswordError('Senha atual incorreta.', 'current')
    }
    throw toChangePasswordError(verifyError)
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
  if (updateError) throw toChangePasswordError(updateError)

  const { error: signOutError } = await supabase.auth.signOut({ scope: 'others' })
  if (signOutError) {
    // A senha já foi trocada — só as outras sessões que não caíram.
    console.warn('Senha trocada, mas não foi possível encerrar as outras sessões:', signOutError)
  }
}

export function useChangePassword() {
  return useMutation<void, Error, ChangePasswordInput>({
    mutationFn: async (input) => {
      try {
        await changePassword(input)
      } catch (error) {
        if (error instanceof ChangePasswordError) throw error
        if (error instanceof AuthError) throw toChangePasswordError(error)
        throw error
      }
    },
  })
}
