# SyloCRM — Instruções para Agentes de IA

Este arquivo é lido automaticamente pelo Claude Code e qualquer agente compatível.
**Todas as regras aqui definidas são obrigatórias** — nenhum agente deve ignorá-las.

---

## Stack

- **Monorepo**: pnpm 9 + Turborepo 2
- **Frontend**: React 19 + Vite 6 + TypeScript strict + CSS Modules
- **Backend**: Fastify 5 + TypeScript strict
- **ORM**: Drizzle ORM
- **Auth**: Supabase Auth (sessionStorage adapter)
- **Server state**: TanStack Query v5
- **Lint/format**: Biome 1.9
- **Commits**: Conventional Commits em inglês

Ver também: `docs/architecture.md`, `docs/design-system.md`, `docs/decisions/`

---

## Workflow — commit direto, sem Issue/PR obrigatório

Time é o próprio dev solo, revisando o código antes de subir. **Issue e PR não são obrigatórios** —
commitar direto na `main` é o fluxo padrão. Não crie issues nem PRs por conta própria; só abra um PR
se o usuário pedir explicitamente (ex: pra revisar algo pontual antes de mesclar).

- Commits vão direto pra `main` (ou pra um branch de trabalho, se o usuário pedir), sem passar por PR
- Nunca dar push sem o usuário ter pedido explicitamente
- Sem squash artificial de histórico — cada commit já deve ser atômico e ter mensagem clara

---

## Padrões de código

### Geral
- TypeScript strict — sem `any`, sem `@ts-ignore`
- Async/await sempre, nunca callbacks
- Variáveis de ambiente via `process.env` / `import.meta.env`, nunca hardcoded
- Erros tratados explicitamente — nunca silenciar um `catch`

### Frontend
- CSS Modules para estilização — sem inline styles exceto valores dinâmicos (ex: gradiente por tier)
- Componentes de UI sem lógica de negócio — lógica em hooks
- Design tokens via `packages/ui/src/tokens/index.css`
- Ícones como componentes SVG inline — sem bibliotecas de ícones externas
- Skeletons em todos os estados de loading

### Commits
- Em inglês, imperativo, Conventional Commits
- `feat:`, `fix:`, `design:`, `chore:`, `docs:`, `test:`
- Referenciar issue quando existir: `feat: add notification bell (#8)`

---

## Design System

Patentes (tiers) do membro, definidas pelo gestor em Configurações → Equipe.
Fonte única de cores/rótulos: `packages/ui/src/components/tier-badge/tiers.ts`.

- Tier 1 — **Bronze**: gradiente `#F2C29B → #9A5424`
- Tier 2 — **Prata**: gradiente `#E5E9F0 → #6B7686`
- Tier 3 — **Ouro**: gradiente `#FFE083 → #C08A00`
- Tier 4 — **Platina**: gradiente `#9ECBFF → #005ECC`
- Tier 5 — **Diamante**: gradiente `#B69EFF → #4B00CC`

Arquivo Figma: `u9GSQPJHgNmTY64fgFXkFT` (SYLOAPP)

---

## Segurança

- `.env` e `.env.local` nunca comitados
- `SUPABASE_SERVICE_KEY` apenas no backend
- Toda rota autenticada usa `authMiddleware`
- Queries sempre parametrizadas via Drizzle — nunca SQL concatenado
