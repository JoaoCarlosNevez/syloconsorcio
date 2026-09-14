// generateTemporaryPassword — senha inicial gerada pelo backend ao criar uma
// conta para outra pessoa (dono de Representação, ou convite de equipe).
//
// Retornada uma única vez na resposta da API para quem fez a criação
// compartilhar com o novo usuário — nunca é logada nem persistida em texto puro
// (a própria senha do Supabase Auth já é hasheada pelo provider).

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
const LENGTH = 12

export function generateTemporaryPassword(): string {
  let password = ''
  for (let i = 0; i < LENGTH; i++) {
    password += CHARSET[Math.floor(Math.random() * CHARSET.length)]
  }
  return password
}
