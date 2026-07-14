import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import authenticate from './plugins/authenticate.js'
import authRoutes from './routes/auth.js'
import projectRoutes from './routes/projects.js'
import customerRoutes from './routes/customers.js'
import contractRoutes from './routes/contracts.js'

const app = Fastify({ logger: true })

await app.register(cors, { origin: process.env.FRONTEND_URL ?? true })
await app.register(jwt, { secret: process.env.JWT_SECRET ?? 'dev-secret-min-32-characters-here' })
await app.register(authenticate)

await app.register(authRoutes,     { prefix: '/api' })
await app.register(projectRoutes,  { prefix: '/api' })
await app.register(customerRoutes, { prefix: '/api' })
await app.register(contractRoutes, { prefix: '/api' })

app.get('/health', async () => ({ status: 'ok' }))

const port = Number(process.env.PORT) || 3000
try {
  await app.listen({ port, host: '0.0.0.0' })
  console.log(`✅ Server running on http://localhost:${port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
