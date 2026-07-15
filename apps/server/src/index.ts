process.on('uncaughtException', (err) => { console.error('UNCAUGHT:', err); process.exit(1) })
process.on('unhandledRejection', (err) => { console.error('REJECTION:', err); process.exit(1) })
console.log('BOOT: process started, NODE_VERSION=' + process.version)
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import authenticate from './plugins/authenticate.js'
import authRoutes      from './routes/auth.js'
import projectRoutes   from './routes/projects.js'
import unitRoutes      from './routes/units.js'
import milestoneRoutes from './routes/milestones.js'
import customerRoutes  from './routes/customers.js'
import contractRoutes  from './routes/contracts.js'
import vendorRoutes    from './routes/vendors.js'
import payableRoutes   from './routes/payables.js'
import accountRoutes   from './routes/accounts.js'
import journalRoutes   from './routes/journal.js'
import userRoutes      from './routes/users.js'
import dashboardRoutes from './routes/dashboard.js'
import budgetRoutes    from './routes/budget.js'
import auditLogRoutes           from './routes/auditLogs.js'
import paymentRequestRoutes     from './routes/paymentRequests.js'
import accountingPeriodRoutes   from './routes/accountingPeriods.js'
import invoiceRoutesDef         from './routes/invoiceRoutes.js'

const app = Fastify({ logger: true })

await app.register(cors, { origin: process.env.FRONTEND_URL ?? true })
await app.register(jwt, { secret: process.env.JWT_SECRET ?? 'dev-secret-min-32-characters-here' })
await app.register(authenticate)

const prefix = { prefix: '/api' }
await app.register(authRoutes,      prefix)
await app.register(projectRoutes,   prefix)
await app.register(unitRoutes,      prefix)
await app.register(milestoneRoutes, prefix)
await app.register(customerRoutes,  prefix)
await app.register(contractRoutes,  prefix)
await app.register(vendorRoutes,    prefix)
await app.register(payableRoutes,   prefix)
await app.register(accountRoutes,   prefix)
await app.register(journalRoutes,   prefix)
await app.register(userRoutes,      prefix)
await app.register(dashboardRoutes, prefix)
await app.register(budgetRoutes,    prefix)
await app.register(auditLogRoutes,         prefix)
await app.register(paymentRequestRoutes,   prefix)
await app.register(accountingPeriodRoutes, prefix)
await app.register(invoiceRoutesDef,       prefix)

app.get('/health', async () => ({ status: 'ok' }))

const port = Number(process.env.PORT) || 3000
try {
  await app.listen({ port, host: '0.0.0.0' })
  console.log(`✅ Server running on http://localhost:${port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
