import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  workspaces: {
    '.': {
      entry: ['commitlint.config.js', 'knip.config.ts'],
      project: ['*.ts', '*.js'],
    },
    'apps/web': {
      entry: ['src/main.tsx', 'vite.config.ts', 'playwright.config.ts', 'vitest.config.ts'],
      project: ['src/**/*.{ts,tsx}', 'e2e/**/*.ts'],
    },
    'apps/api': {
      entry: ['src/main.ts', 'vitest.config.ts'],
      project: ['src/**/*.ts'],
    },
    'packages/domain': {
      entry: ['src/index.ts'],
      project: ['src/**/*.ts'],
    },
    'packages/application': {
      entry: ['src/index.ts'],
      project: ['src/**/*.ts'],
    },
    'packages/infrastructure': {
      entry: ['src/index.ts', 'drizzle.config.ts'],
      project: ['src/**/*.ts'],
    },
    'packages/shared': {
      entry: ['src/index.ts'],
      project: ['src/**/*.ts'],
    },
    'packages/ui': {
      entry: ['src/index.ts'],
      project: ['src/**/*.{ts,tsx}'],
    },
    'packages/config': {
      entry: [],
      project: [],
    },
    'packages/testing': {
      entry: ['src/index.ts', 'vitest.config.ts'],
      project: ['src/**/*.ts'],
    },
  },
}

export default config
