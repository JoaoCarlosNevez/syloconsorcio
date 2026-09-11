# ADR-13 — Estratégia de sessão: SPA + API separada

**Status:** Aceito
**Data:** 2026-09-10
**Substitui parcialmente:** ADR-12 (seção 3 — Sessão)

---

## Contexto

A ADR-12 definiu a estratégia de sessão como "cookies httpOnly via @supabase/ssr".
Durante a Etapa 07 (implementação), identificou-se uma tensão arquitetural concreta:

- O frontend é um **SPA puro** hospedado na Vercel (sem SSR)
- O backend é uma **API Fastify** hospedada no Railway
- São domínios distintos: `app.sylocrm.com` (futuro) e `api.railway.app`
- `@supabase/ssr` com cookies httpOnly requer SSR ou mesmo domínio

### Por que httpOnly cookies cross-domain não funcionam no MVP

Cookies httpOnly só podem ser definidos pelo servidor. Para que o browser envie esses cookies
automaticamente em requisições cross-origin, é necessário:

1. `SameSite=None; Secure` no cookie (HTTPS obrigatório)
2. CORS com `credentials: true` e origem explícita (não wildcard)
3. Não ser bloqueado como "third-party cookie"

O problema: navegadores modernos (Safari, Firefox, Chrome em evolução) bloqueiam
third-party cookies para combater rastreamento. Para fins de auth de app própria,
o mecanismo funciona — mas é frágil e depende de configuração de domínio personalizado
(`api.sylocrm.com` sob o mesmo eTLD+1 que `app.sylocrm.com`).

Para o MVP, não temos domínio personalizado configurado nem SSR. Implementar httpOnly
cookies agora introduziria complexidade desnecessária e fragilidade cross-browser.

---

## Decisão

### Estratégia escolhida: Supabase JS SDK + Bearer token em memória

```
Frontend (SPA)
  ↓
supabase.auth.signInWithPassword()   ← autenticação direta no Supabase
  ↓
Supabase retorna access_token (JWT, 1h) + refresh_token (rotativo)
  ↓
SDK armazena internamente (sessionStorage via custom adapter)
  ↓
Frontend extrai access_token da sessão ativa
  ↓
API calls: Authorization: Bearer <access_token>
  ↓
API verifica via SupabaseAuthAdapter.verifyToken()
```

### Armazenamento de tokens

O Supabase JS SDK por padrão usa localStorage. Nesta implementação, usamos
**sessionStorage** via custom storage adapter:

- Vantagem: tokens são limpos quando o browser fecha (menor janela de exposição)
- Desvantagem: cada aba tem sessão independente (tradeoff aceitável para MVP)
- O SDK gerencia refresh automático antes do access token expirar (a cada ~1h)

### Por que não httpOnly via API proxy

Embora mais seguro contra XSS, implementar auth proxy no backend introduz:

1. Endpoint `/auth/login` que proxia para Supabase (duplicação)
2. Gerenciamento de refresh token no servidor
3. Cross-domain cookie issues no MVP (detalhado acima)
4. Complexidade sem benefício real antes de ter domínio personalizado

---

## Mitigações de segurança para sessionStorage

| Risco | Mitigação |
|-------|-----------|
| XSS lê token do sessionStorage | React JSX escapa automaticamente; CSP via `helmet` na API |
| Token expira em 1h | SDK faz refresh automático transparente |
| Logout não invalida server-side | Chamar `supabase.auth.signOut()` invalida sessão no Supabase Auth |
| Múltiplas abas = múltiplas sessões | Aceitável para MVP; pode ser resolvido com BroadcastChannel |

---

## Fluxo de autenticação

### Login

```
1. Usuário preenche email + senha no LoginPage
2. useMutation chama supabase.auth.signInWithPassword()
3. SDK armazena sessão em sessionStorage
4. QueryClient invalida cache de sessão
5. React Router redireciona para /app/dashboard
```

### Requisição autenticada

```
1. useAuth() retorna o access_token da sessão Supabase ativa
2. apiClient injeta Authorization: Bearer <token> em toda requisição
3. authMiddleware valida token via SupabaseAuthAdapter.verifyToken()
4. authIdentity é injetado no request
5. (rotas de negócio) tenantMiddleware valida X-Organization-Id + membership
6. AuthenticatedContext é injetado e passado ao use case
```

### Logout

```
1. Usuário clica em Logout
2. supabase.auth.signOut() — invalida sessão local + no Supabase Auth
3. QueryClient.clear() — limpa todo o cache de servidor
4. React Router redireciona para /login
```

### Refresh automático

```
O Supabase JS SDK detecta que o access_token está prestes a expirar
  ↓
SDK chama automaticamente a API do Supabase Auth com o refresh_token
  ↓
Novo access_token é emitido (refresh_token rotativo: o anterior é invalidado)
  ↓
SDK atualiza sessionStorage com o novo par de tokens
```

---

## Implicações para Web (MVP)

- Sem SSR: tokens gerenciados 100% pelo Supabase JS SDK no browser
- sessionStorage: sessão por aba; não persiste entre fechamentos do browser
- TanStack Query: `useQuery` para buscar e manter sessão (server state)
- `ProtectedRoute`: verifica sessão antes de renderizar; redireciona se inválida

---

## Implicações para Mobile (futuro)

A arquitetura suporta mobile nativamente:

```
Mobile app
  ↓
supabase.auth.signInWithPassword()  (mesmo SDK)
  ↓
Tokens armazenados em Secure Storage (iOS Keychain / Android Keystore)
  ↓
API calls: Authorization: Bearer <token>  (mesmo backend)
```

A API não precisa mudar. O mobile usa o mesmo contrato Bearer token.
A única diferença é o adapter de storage do SDK Supabase (SecureStore em vez de sessionStorage).

---

## Caminho para httpOnly cookies (pós-MVP)

Quando o produto tiver domínio personalizado (`sylocrm.com`):

1. Configurar `app.sylocrm.com` (Vercel) e `api.sylocrm.com` (Railway)
2. Migrar para `@supabase/ssr` com `createBrowserClient` que seta cookies
3. API lê cookie via `@fastify/cookie` em vez de Authorization header
4. Eliminar risco de XSS via sessionStorage completamente

---

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|-------------|------------------------|
| httpOnly cookies via proxy no servidor (MVP) | Cross-domain issue; complexidade desnecessária sem domínio próprio |
| localStorage | Persiste entre sessões mas mesmo risco de XSS; sem vantagem sobre sessionStorage |
| Tokens somente em memória (React state) | Perdidos no refresh da página; UX inaceitável |
| JWT próprio (sem Supabase) | Reimplementa o que Supabase já resolve; fora do escopo |

---

## Consequências

- **Supabase Auth continua isolado**: o backend só usa o Admin SDK para validação de JWT
- **IAuthProvider permanece o contrato**: troca de provider (Auth0, etc.) só muda o adapter
- **API não gerencia sessão**: ela apenas valida Bearer tokens, sem estado de sessão próprio
- **Logout é confiável**: `supabase.auth.signOut()` invalida no servidor Supabase Auth
- **Mobile-first**: a mesma API funciona para web e mobile sem alterações

---

## Referências

- ADR-12 — Arquitetura de autenticação (seções 1, 2, 4-10 permanecem vigentes)
- ADR-01 — Supabase como infra inicial, isolado via ports
- `packages/application/src/ports/auth.provider.ts`
- `packages/infrastructure/src/auth/supabase-auth.adapter.ts`
