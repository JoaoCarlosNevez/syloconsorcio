// Auth error codes — taxonomia de erros de autenticação/autorização.
//
// ADR-12: define a separação clara entre 401 e 403.
//
// 401 Unauthorized — requisição sem autenticação válida
// 400 Bad Request  — header obrigatório ausente
// 403 Forbidden    — autenticado mas sem autorização para o recurso

export const AuthErrorCode = {
  // 401 — token ausente ou inválido
  TOKEN_MISSING: 'AUTH_TOKEN_MISSING',
  TOKEN_INVALID: 'AUTH_TOKEN_INVALID',

  // 400 — header obrigatório ausente
  TENANT_HEADER_MISSING: 'TENANT_HEADER_MISSING',

  // 403 — membership inválida ou suspensa
  MEMBERSHIP_NOT_FOUND: 'MEMBERSHIP_NOT_FOUND',
  MEMBERSHIP_INACTIVE: 'MEMBERSHIP_INACTIVE',

  // 403 — permission insuficiente
  PERMISSION_DENIED: 'PERMISSION_DENIED',
} as const

export type AuthErrorCode = (typeof AuthErrorCode)[keyof typeof AuthErrorCode]
