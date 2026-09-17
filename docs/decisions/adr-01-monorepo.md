# ADR-01 — pnpm + Turborepo como monorepo toolchain

**Status:** Aceito
**Data:** 2026-09-17

---

## Contexto

O SyloCRM 2.0 é composto por dois apps (`apps/web`, `apps/api`) e vários packages compartilhados
(`domain`, `application`, `infrastructure`, `ui`, `shared`, `config`, `testing`). Era preciso
decidir como organizar e orquestrar esse monorepo.

Opções consideradas: npm workspaces (nativo, sem cache de build), pnpm workspaces sozinho,
pnpm + Turborepo, e Nx (mais opinativo, com geração de código).

---

## Decisão

Usar **pnpm** como package manager e **Turborepo** como orquestrador de build/test/lint.

---

## Justificativa

### pnpm
- Instalação bem mais rápida que npm/yarn; content-addressable storage (sem duplicar pacotes no disco)
- Isolamento estrito por padrão — um package só acessa o que declarou como dependência
- Suporte nativo e maduro a workspaces

### Turborepo
- Cache incremental por task: `pnpm test`/`pnpm build`/`pnpm lint:fix` não re-executam o que não mudou
- Paralelização entre packages, pipeline declarado em `turbo.json`
- Sem opinião sobre estrutura de código — só orquestra scripts do `package.json` de cada workspace

### Por que não Nx
Mais complexo e opinativo (geração de código, plugins) sem necessidade real neste estágio do produto.

---

## Estrutura real

```
sylocrm/
├── apps/
│   ├── web/              # React 19 + Vite 6 + TypeScript strict
│   └── api/               # Fastify 5 + TypeScript strict
├── packages/
│   ├── domain/            # Regras de negócio puras — zero deps externas
│   ├── application/       # Use cases, ports (interfaces de repositório/provider)
│   ├── infrastructure/    # Adapters: Drizzle, Supabase Auth/Storage
│   ├── ui/                # Design system compartilhado (componentes + tokens)
│   ├── shared/             # Tipos/utilitários genéricos sem lógica de negócio
│   ├── config/             # tsconfig, configs compartilhadas
│   └── testing/            # Testes de arquitetura — impedem imports entre camadas erradas
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

---

## Regras de implementação

- `pnpm install` na raiz instala as dependências de todos os workspaces
- Scripts via `turbo run <task>` (ex: `pnpm test`, `pnpm build`, `pnpm lint:fix` na raiz) ou
  `pnpm --filter <package> <script>` para um workspace específico
- `turbo.json` declara as dependências entre tasks (ex: `build` depende do `build` dos packages
  que o workspace importa)
- Lint/format é feito por **Biome** (não ESLint + Prettier) — `pnpm lint:fix` roda `biome check --write .`

---

## Consequências

- Todo o time (e todo agente) usa pnpm — nunca `npm install` ou `yarn add` neste repositório
- Antes de considerar uma tarefa concluída: `pnpm lint:fix`, `pnpm test` e `pnpm build` na raiz
  devem passar limpos (cobre os 9 workspaces de uma vez via Turborepo)
- `packages/testing` roda testes de arquitetura que falham o build se `domain` importar algo de
  `infrastructure`, ou se `application` importar Drizzle/Supabase diretamente — ver ADR-05

---

## Referências

- `pnpm-workspace.yaml`, `turbo.json`
- `packages/testing/src/arch/` — testes que impõem as regras de dependência entre camadas
- `AGENTS.md` — regras de arquitetura em camadas (Domain → Application → Infrastructure)
