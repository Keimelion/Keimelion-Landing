// Any var prefixed PUBLIC_* is embedded in the client bundle. Never put a secret behind PUBLIC_*.
// Server-only secrets require a Vercel Edge/Serverless Function, not static output.
//
// This module is the ONLY place that reads `import.meta.env`. Everything else consumes `env`.
import { z } from 'zod'

const envSchema = z.object({
  PUBLIC_API_BASE_URL: z.url(),
})

export type Env = z.infer<typeof envSchema>

function loadEnv(): Env {
  // Astro types import.meta.env as a loose record; Zod validates the subset we care about.
  const source: unknown = import.meta.env
  const parsed = envSchema.safeParse(source)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ')
    throw new Error(`Invalid environment configuration — ${issues}`)
  }
  return parsed.data
}

export const env: Env = loadEnv()
