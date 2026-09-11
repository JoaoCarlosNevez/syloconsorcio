import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// @testing-library/react cleanup requires the global afterEach to be available.
// Since vitest is configured with globals: false, we register it explicitly.
afterEach(() => {
  cleanup()
})
