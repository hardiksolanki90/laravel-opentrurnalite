import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@opentrurnalite/auth': path.resolve(__dirname, '../../packages/auth/src/index.ts'),
      '@opentrurnalite/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
  },
})
