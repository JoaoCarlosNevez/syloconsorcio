import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'ui',
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    globals: false,
    css: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
