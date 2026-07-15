import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import Decimal from 'decimal.js'
import { createAuditLog } from '../lib/auditLog.js'

const createSchema = z.object({
  contractId: z.string().optional(),
  invoiceNo: z.string().min(1),
  type: z.enum(['ADVANCE', 'SALES', 'INPUT']),
  issueDate: z.string(),
  amount: z.number(),
  taxAmount: z.number().default(0),
  totalAmount: z.number(),
})

export default async function invoiceRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }
  const financeRoles = ['OWNER', 'FINANCE_CHIEF', 'ACCOUNTANT', 'CASHIER']

  app.get('/invoices', auth, async (req) => {
    const { page = 1, pageSize = 20, type, status, contractId } = req.query as any
    const [data, total] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          companyId: req.companyId,
          ...(type ? { type } : {}),
          ...(status ? { status } : {}),
          ...(contractId ? { contractId } : {}),
        },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { issueDate: 'desc' },
        include: {
          contract: { select: { contractNo: true, customer: { select: { name: true } } } },
        },
      }),
      prisma.invoice.count({ where: { companyId: req.companyId } }),
    ])
    return { data, total, page: Number(page), pageSize: Number(pageSize) }
  })

  app.post('/invoices', auth, async (req, reply) => {
    if (!financeRoles.includes(req.role)) return reply.code(403).send({ message: '無開票權限' })
    const body = createSchema.parse(req.body)
    const inv = await prisma.invoice.create({
      data: {
        ...body,
        companyId: req.companyId,
        issueDate: new Date(body.issueDate),
        amount: new Decimal(body.amount),
        taxAmount: new Decimal(body.taxAmount),
        totalAmount: new Decimal(body.totalAmount),
      },
    })
    await createAuditLog({
      companyId: req.companyId, userId: req.userId,
      action: 'CREATE', targetType: 'INVOICE', targetId: inv.id,
      after: { invoiceNo: inv.invoiceNo, totalAmount: body.totalAmount },
    })
    return reply.code(201).send(inv)
  })

  // 作廢
  app.put('/invoices/:id/void', auth, async (req, reply) => {
    if (!['OWNER', 'FINANCE_CHIEF', 'ACCOUNTANT'].includes(req.role)) {
      return reply.code(403).send({ message: '無作廢權限' })
    }
    const { id } = req.params as { id: string }
    const inv = await prisma.invoice.findFirst({ where: { id, companyId: req.companyId } })
    if (!inv) return reply.code(404).send({ message: '找不到此發票' })
    if (inv.status === 'VOIDED') return reply.code(400).send({ message: '已作廢' })
    const updated = await prisma.invoice.update({ where: { id }, data: { status: 'VOIDED' } })
    await createAuditLog({
      companyId: req.companyId, userId: req.userId,
      action: 'STATUS_CHANGE', targetType: 'INVOICE', targetId: id,
      before: { status: 'VALID' }, after: { status: 'VOIDED' },
    })
    return updated
  })
}
