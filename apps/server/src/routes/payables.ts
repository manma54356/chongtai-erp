import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import Decimal from 'decimal.js'

const schema = z.object({
  vendorId: z.string(),
  projectId: z.string().optional(),
  apNo: z.string().min(1),
  description: z.string().min(1),
  amount: z.number().positive(),
  dueDate: z.string(),
  notes: z.string().optional(),
})

export default async function payableRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  app.get('/payables', auth, async (req) => {
    const { page = 1, pageSize = 20, status, projectId } = req.query as any
    const where = {
      companyId: req.companyId,
      ...(status ? { status } : {}),
      ...(projectId ? { projectId } : {}),
    }
    const [data, total] = await Promise.all([
      prisma.accountPayable.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { dueDate: 'asc' },
        include: { vendor: { select: { id: true, name: true, category: true } } },
      }),
      prisma.accountPayable.count({ where }),
    ])
    return { data, total, page, pageSize }
  })

  app.post('/payables', auth, async (req, reply) => {
    const body = schema.parse(req.body)
    const ap = await prisma.accountPayable.create({
      data: {
        ...body, companyId: req.companyId,
        amount: new Decimal(body.amount),
        dueDate: new Date(body.dueDate),
      },
    })
    return reply.code(201).send(ap)
  })

  app.put('/payables/:id/pay', auth, async (req, reply) => {
    const { id } = req.params as any
    const { paidAmount, paidDate } = req.body as any
    const exists = await prisma.accountPayable.findFirst({ where: { id, companyId: req.companyId } })
    if (!exists) return reply.code(404).send({ message: '找不到應付帳款' })
    return prisma.accountPayable.update({
      where: { id },
      data: {
        paidAmount: new Decimal(paidAmount),
        paidDate: new Date(paidDate),
        status: 'PAID',
      },
    })
  })

  app.put('/payables/:id/approve', auth, async (req, reply) => {
    const { id } = req.params as any
    const exists = await prisma.accountPayable.findFirst({ where: { id, companyId: req.companyId } })
    if (!exists) return reply.code(404).send({ message: '找不到應付帳款' })
    return prisma.accountPayable.update({ where: { id }, data: { status: 'APPROVED' } })
  })
}
