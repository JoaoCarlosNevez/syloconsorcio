# ADR-07 — pnpm + Turborepo como monorepo toolchain

**Status:** Aceito
**Data:** 2026-09-08

---

## Contexto

O SyloCRM 2.0 é composto por múltiplos apps (web, api) e múltiplos packages compartilhados (domain, application, infrastructure, ui, shared, config, testing). Era necessário decidir como organizar e orquestrar esse monorepo.

As opções consideradas foram:

1. **npm workspaces** — nativo, simples, sem caching de build
2. **pnpm workspaces** — mais rápido que npm, melhor isolamento, suporte nativo a workspaces
3. **pnpm + Turborepo** — pnpm para package management, Turborepo para orquestração e caching de build
4. **Nx** — mais complexo, com geração de código, mais opinativo

---

## Decisão

Usar **pnpm** como package manager e **Turborepo** como orquestrador de build.

---

## Justificativa

### pnpm
- Significativamente mais rápido que npm e yarn na instalação
- Content-addressable storage: não duplica pacotes no disco
- Isolamento estrito por padrão (não permite acesso a packages não declarados)
- Suporte nativo e maduro a workspaces
- Compatível com todas as ferramentas do ecossistema Node.js

### Turborepo
- Caching de build incremental: tasks que não mudaram não são reexecutadas
- Paralelização inteligente de tasks entre packages
- Pipeline declarativo em `turbo.json`: fácil de entender e manter
- Remote caching disponível (Vercel) para acelerar CI
- Sem opinião sobre estrutura de código: apenas orquestra scripts do `package.json`
- Muito menor curva de aprendizado que Nx

### Por que não Nx
- Mais complexo e opinativo
- Geração de código e plugins que não são necessários agora
- Maior dificuldade de saída se precisar migrar

---

## Estrutura definida

```
sylocrm/
├── apps/
│   ├── web/           # Frontend React + TypeScript
│   └── api/           # Backend Node.js + TypeScript
├── packages/
│   ├── domain/        # Regras de negócio puras
│   ├── application/   # Casos de uso e orquestração
│   ├── infrastructure/# Adapters: Drizzle, Supabase, Storage, Auth
│   ├── ui/            # Design system e componentes compartilhados
│   ├── shared/        # Tipos, DTOs, schemas, utilitários
│   ├── config/        # Configurações compartilhadas (tsconfig, biome)
│   └── testing/       # Utilitários e fixtures de teste
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

---

## Consequências

- Todos os desenvolvedores devem usar pnpm (não npm, não yarn)
- `pnpm install` na raiz instala dependências de todos os workspaces
- Scripts são executados via `turbo run <task>` ou `pnpm --filter <package> <script>`
- O `turbo.json` define o pipeline e as dependências entre tasks
- `.npmrc` deve conter `shamefully-hoist=false` para manter isolamento correto
