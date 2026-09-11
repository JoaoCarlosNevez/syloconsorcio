// API client — wrapper de fetch para a API backend.
//
// Injeta automaticamente o Bearer token de autenticação em todas as requisições.
// Todas as chamadas à API passam por aqui — nunca fetch() direto para a API.
//
// O token é obtido da sessão Supabase ativa. Se não houver sessão,
// requisições autenticadas retornarão 401.

import { supabase } from './supabase'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  organizationId?: string
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, organizationId, ...fetchOptions } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  }

  const token = await getAccessToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  if (organizationId) {
    headers['X-Organization-Id'] = organizationId
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      error?: string
      code?: string
    }
    throw new ApiError(
      response.status,
      errorData.code ?? 'UNKNOWN_ERROR',
      errorData.error ?? `Request failed with status ${String(response.status)}`,
    )
  }

  return response.json() as Promise<T>
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
}
