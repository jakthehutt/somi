import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode ?? 'test', process.cwd(), '')
  return {
    test: {
      environment: 'node',
      globals: true,
      testTimeout: 30_000,
      hookTimeout: 30_000,
      env: {
        VITE_SUPABASE_URL: 'https://ctcpjumkyxcgskmqrrpv.supabase.co',
        ...env,
      },
    },
  }
})
