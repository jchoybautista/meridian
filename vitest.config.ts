import { defineConfig } from 'vitest/config'

// Vitest runs our pure-function unit tests in a node environment. It lives in
// its own config (separate from vite.config.ts) on purpose: the app is on
// Vite 8 (rolldown) while Vitest 3 bundles Vite 7, so sharing one config makes
// the Vite plugin types clash. These tests need no Vite plugins, so this
// config carries none — keeping the type-check clean with no casts.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
