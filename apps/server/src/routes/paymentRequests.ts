import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import Decimal from 'decimal.js'
import { createAuditLog } from '../lib/auditLog.js'

const createSchema = z.object({
  prNo: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  amount: z.number().positive(),
  projectId: z.string().optional(),
  notes: z.string().optional(),
})

export default async function paymentRequestRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  // 列表
  app.get('/payment-requests', auth, async (req) => {
    const { page = 1, pageSize = 20, status } = req.query as any
    const where: any = {
      companyId: req.companyId,
      ...(status ? { status } : {}),
    }
    // 非老闆/財務只能看自己的
    if (!['OWNER', 'FINANCE_CHIEF', 'ACCOUNTANT'].includes(req.role)) {
      where.requesterId = req.userId
    }
    const [data, total] = await Promise.all([
      prisma.paymentRequest.findMany({
        where, skip: (Number(page) - 1) * Number(pageSize), take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: {
          requester: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.paymentRequest.count({ where }),
    ])
    return { data, total, page: Number(page), pageSize: Number(pageSize) }
  })

  // 新增請款單
  app.post('/payment-requests', auth, async (req, reply) => {
    const body = createSchema.parse(req.body)
    const pr = await prisma.paymentRequest.create({
      data: {
        ...body,
        amount: new Decimal(body.amount),
        companyId: req.companyId,
        requesterId: req.userId,
      },
    })
    await createAuditLog({
      companyId: req.companyId, userId: req.userId,
      action: 'CREATE', targetType: 'PAYMENT_REQUEST', targetId: pr.id,
      after: { prNo: pr.prNo, amount: body.amount, category: body.category },
    })
    return reply.code(201).send(pr)
  })

  // 審核（OWNER / FINANCE_CHIEF 才能）
  app.put('/payment-requests/:id/approve', auth, async (req, reply) => {
    if (!['OWNER', 'FINANCE_CHIEF'].includes(req.role)) {
      return reply.code(403).send({ message: '無審核權限' })
    }
    const { id } = req.params as { id: string }
    const { approved, notes } = req.body as { approved: boolean; notes?: string }
    const before = await prisma.paymentRequest.findFirst({ where: { id, companyId: req.companyId } })
    if (!before) return reply.code(404).send({ message: '找不到此請款單' })
    if (before.status !== 'PENDING') return reply.code(400).send({ message: '此請款單已審核' })

    const newStatus = approved ? 'APPROVED' : 'REJECTED'
    const pr = await prisma.paymentRequest.update({
      where: { id },
      data: { status: newStatus, approvedById: req.userId, approvedAt: new Date(), notes: notes ?? before.notes },
    })
    await createAuditLog({
      companyId: req.companyId, userId: req.userId,
      action: 'STATUS_CHANGE', targetType: 'PAYMENT_REQUEST', targetId: id,
      before: { status: 'PENDING' }, after: { status: newStatus },
    })
    return pr
  })

  // 標記已付款（OWNER / CASHIER 才能）
  app.put('/payment-requests/:id/pay', auth, async (req, reply) => {
    if (!['OWNER', 'CASHIER'].includes(req.role)) {
      return reply.code(403).send({ message: '無出納權限' })
    }
    const { id } = req.params as { id: string }
    const before = await prisma.paymentRequest.findFirst({ where: { id, companyId: req.companyId } })
    if (!before) return reply.code(404).send({ message: '找不到此請款單' })
    if (before.status !== 'APPROVED') return reply.code(400).send({ message: '請款單未通過審核' })

    const pr = await prisma.paymentRequest.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date() },
    })
    await createAuditLog({
      companyId: req.companyId, userId: req.userId,
      action: 'STATUS_CHANGE', targetType: 'PAYMENT_REQUEST', targetId: id,
      before: { status: 'APPROVED' }, after: { status: 'PAID' },
    })
    return pr
  })

  // 刪除（只能刪自己的 PENDING 單）
  app.delete('/payment-requests/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const pr = await prisma.paymentRequest.findFirst({ where: { id, companyId: req.companyId } })
    if (!pr) return reply.code(404).send({ message: '找不到此請款單' })
    if (pr.requesterId !== req.userId && req.role !== 'OWNER') {
      return reply.code(403).send({ message: '無刪除權限' })
    }
    if (pr.status !== 'PENDING') return reply.code(400).send({ message: '非待審核狀態無法刪除' })
    await prisma.paymentRequest.delete({ where: { id } })
    return reply.code(204).send()
  })
}
