import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'

const app = Fastify({ logger: true })

// ── Plugins ───────────────────────────────
await app.register(cors, { origin: process.env.FRONTEND_URL ?? true })
await app.register(jwt, { secret: process.env.JWT_SECRET ?? 'dev-secret' })

// ── Health check ──────────────────────────
app.get('/health', async () => ({ status: 'ok' }))

// ── Routes（之後逐步掛上來）──────────────
// await app.register(import('./routes/auth.js'))
// await app.register(import('./routes/companies.js'))
// await app.register(import('./routes/projects.js'))
// await app.register(import('./routes/customers.js'))
// await app.register(import('./routes/contracts.js'))

// ── Start ─────────────────────────────────
const port = Number(process.env.PORT) || 3000

try {
  await app.listen({ port, host: '0.0.0.0' })
  console.log(`Server running on http://localhost:${port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
