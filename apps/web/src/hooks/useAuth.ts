// useAuth — hook de autenticação do frontend.
//
// ADR-13: autenticação via Supabase JS SDK.
// ADR-09: server state via TanStack Query — sessão é server state.
//
// Expõe:
//   session      — sessão Supabase ativa (null se não autenticado)
//   user         — usuário autenticado (null se não autenticado)
//   isLoading    — carregando estado inicial
//   signIn       — mutation para login com email/senha
//   signOut      — mutation para logout
//   isSignedIn   — boolean conveniente

import type { AuthError, Session, User } from '@supabase/supabase-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const SESSION_QUERY_KEY = ['auth', 'session'] as const

// ── Session query ─────────────────────────────────────────────────────────────

/** Busca a sessão ativa do Supabase SDK. Null se não autenticado. */
async function fetchSession(): Promise<Session | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) throw error
  return session
}

// ── Sign-in mutation ──────────────────────────────────────────────────────────

interface SignInCredentials {
  email: string
  password: string
}

interface SignInResult {
  session: Session
  user: User
}

async function signInWithPassword(credentials: SignInCredentials): Promise<SignInResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  })

  if (error) throw error
  if (!data.session || !data.user) {
    throw new Error('Login falhou: sessão não retornada.')
  }

  return { session: data.session, user: data.user }
}

// ── Sign-out mutation ─────────────────────────────────────────────────────────

async function signOutUser(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth() {
  const queryClient = useQueryClient()

  const {
    data: session,
    isLoading,
    error: sessionError,
  } = useQuery<Session | null, AuthError>({
    queryKey: SESSION_QUERY_KEY,
    queryFn: fetchSession,
    staleTime: 60 * 1000, // 1 minute — session doesn't change often
    retry: false,
  })

  const signInMutation = useMutation<SignInResult, AuthError, SignInCredentials>({
    mutationFn: signInWithPassword,
    onSuccess: (data) => {
      // Update session cache immediately after login
      queryClient.setQueryData(SESSION_QUERY_KEY, data.session)
    },
  })

  const signOutMutation = useMutation<void, AuthError>({
    mutationFn: signOutUser,
    onSuccess: () => {
      // Clear all server state on logout
      queryClient.clear()
    },
  })

  return {
    session: session ?? null,
    user: session?.user ?? null,
    isLoading,
    sessionError,
    isSignedIn: Boolean(session),

    signIn: signInMutation.mutateAsync,
    isSigningIn: signInMutation.isPending,
    signInError: signInMutation.error,

    signOut: signOutMutation.mutateAsync,
    isSigningOut: signOutMutation.isPending,
  }
}
