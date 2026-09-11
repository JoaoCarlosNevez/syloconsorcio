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

## Workflow obrigatório — GitHub Issues + PRs

**Todo trabalho passa por issue e PR. Sem exceção.**

### 1. Antes de começar qualquer tarefa

- Crie uma issue no GitHub descrevendo o que será feito
- Use labels adequados: `bug`, `enhancement`, `feature`, `design`, `chore`
- Exemplo de título: `feat: implement Kanban board view` / `fix: profile avatar not loading`

### 2. Ao implementar

- Crie um branch a partir de `main` com o padrão:
  - `feat/kanban-board` para features
  - `fix/avatar-loading` para correções
  - `chore/update-deps` para manutenção
  - `design/meta-card-redesign` para ajustes de UI/UX

### 3. Ao abrir o PR

- O título deve seguir Conventional Commits: `feat: ...`, `fix: ...`, `design: ...`
- A descrição **deve mencionar a issue** com `Closes #<número>` ou `Refs #<número>`
- Exemplo de descrição mínima:
  ```
  Closes #12

  ## O que foi feito
  - Implementado card de Meta Pessoal seguindo Figma (node 219-1084)
  - Adicionado background com logo 3D Sylo em 10% de opacidade
  - Barra de progresso com 12px e gradiente azul
  ```

### 4. Merge

- Nunca fazer push direto para `main`
- Sempre via PR com ao menos uma revisão (pode ser auto-aprovado em solo)
- Usar **Squash and Merge** para manter o histórico limpo

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

- Tier 1 — **Turmalina**: gradiente `#9EF5FF → #00D9FF → #00A6CC`
- Tier 2 — **Rubi**: gradiente `#FF6D70 → #CC0003`
- Tier 3 — **Platina**: gradiente `#9ECBFF → #005ECC`
- Tier 4 — **Diamante**: gradiente `#B69EFF → #4B00CC`

Arquivo Figma: `u9GSQPJHgNmTY64fgFXkFT` (SYLOAPP)

---

## Segurança

- `.env` e `.env.local` nunca comitados
- `SUPABASE_SERVICE_KEY` apenas no backend
- Toda rota autenticada usa `authMiddleware`
- Queries sempre parametrizadas via Drizzle — nunca SQL concatenado
