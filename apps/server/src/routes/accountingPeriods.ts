import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { createAuditLog } from '../lib/auditLog.js'

export default async function accountingPeriodRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }
  const ownerFinance = ['OWNER', 'FINANCE_CHIEF', 'ACCOUNTANT']

  // 列出期間（近 24 個月）
  app.get('/accounting-periods', auth, async (req) => {
    if (!ownerFinance.includes(req.role)) return { data: [], total: 0 }
    const periods = await prisma.accountingPeriod.findMany({
      where: { companyId: req.companyId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 24,
      include: { closedBy: { select: { id: true, name: true } } },
    })
    return { data: periods }
  })

  // 開帳 / 確保期間存在
  app.post('/accounting-periods', auth, async (req, reply) => {
    if (!ownerFinance.includes(req.role)) return reply.code(403).send({ message: '無財務權限' })
    const { year, month } = req.body as { year: number; month: number }
    const period = await prisma.accountingPeriod.upsert({
      where: { companyId_year_month: { companyId: req.companyId, year, month } },
      create: { companyId: req.companyId, year, month, status: 'OPEN' },
      update: {},
    })
    return reply.code(201).send(period)
  })

  // 關帳
  app.put('/accounting-periods/:year/:month/close', auth, async (req, reply) => {
    if (!['OWNER', 'FINANCE_CHIEF'].includes(req.role)) {
      return reply.code(403).send({ message: '僅財務長或老闆可關帳' })
    }
    const { year, month } = req.params as { year: string; month: string }
    const period = await prisma.accountingPeriod.upsert({
      where: { companyId_year_month: { companyId: req.companyId, year: Number(year), month: Number(month) } },
      create: {
        companyId: req.companyId, year: Number(year), month: Number(month),
        status: 'CLOSED', closedById: req.userId, closedAt: new Date(),
      },
      update: { status: 'CLOSED', closedById: req.userId, closedAt: new Date() },
    })
    await createAuditLog({
      companyId: req.companyId, userId: req.userId,
      action: 'STATUS_CHANGE', targetType: 'ACCOUNTING_PERIOD', targetId: period.id,
      after: { year, month, status: 'CLOSED' },
    })
    return period
  })

  // 重開帳（只有 OWNER 可以）
  app.put('/accounting-periods/:year/:month/reopen', auth, async (req, reply) => {
    if (req.role !== 'OWNER') return reply.code(403).send({ message: '僅老闆可重開帳' })
    const { year, month } = req.params as { year: string; month: string }
    const period = await prisma.accountingPeriod.update({
      where: { companyId_year_month: { companyId: req.companyId, year: Number(year), month: Number(month) } },
      data: { status: 'OPEN', closedById: null, closedAt: null },
    })
    await createAuditLog({
      companyId: req.companyId, userId: req.userId,
      action: 'STATUS_CHANGE', targetType: 'ACCOUNTING_PERIOD', targetId: period.id,
      after: { year, month, status: 'OPEN' },
    })
    return period
  })
}
