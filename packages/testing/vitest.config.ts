import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'arch',
    include: ['src/arch/**/*.test.ts'],
    environment: 'node',
  },
})
