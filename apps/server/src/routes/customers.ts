import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const createSchema = z.object({
  name: z.string().min(1),
  idNumber: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  source: z.enum(['CALL','VISIT','AD','BROKER','REFERRAL','UNKNOWN']).default('UNKNOWN'),
  grade: z.enum(['PROSPECT','NEGOTIATING','CONTRACTED','DELIVERED']).default('PROSPECT'),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
})

export default async function customerRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  // 列表
  app.get('/customers', auth, async (req) => {
    const page = Number((req.query as any).page ?? 1)
    const pageSize = Number((req.query as any).pageSize ?? 20)
    const { grade, keyword, projectId } = req.query as any
    const where: any = {
      companyId: req.companyId,
      ...(grade ? { grade } : {}),
      ...(keyword ? {
        OR: [
          { name: { contains: keyword } },
          { phone: { contains: keyword } },
        ],
      } : {}),
      ...(projectId ? {
        contracts: { some: { unit: { projectId } } },
      } : {}),
    }
    const [data, total] = await Promise.all([
      prisma.customer.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { contracts: true, followUps: true } },
          contracts: {
            select: {
              id: true,
              contractNo: true,
              unit: { select: { project: { select: { id: true, name: true } } } },
            },
          },
        },
      }),
      prisma.customer.count({ where }),
    ])
    return { data, total, page, pageSize }
  })

  // 新增
  app.post('/customers', auth, async (req, reply) => {
    const body = createSchema.parse(req.body)
    const customer = await prisma.customer.create({
      data: { ...body, companyId: req.companyId },
    })
    return reply.code(201).send(customer)
  })

  // 單筆
  app.get('/customers/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const customer = await prisma.customer.findFirst({
      where: { id, companyId: req.companyId },
      include: {
        contracts: { include: { unit: { include: { project: true } } } },
        followUps: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    })
    if (!customer) return reply.code(404).send({ message: '找不到此客戶' })
    return customer
  })

  // 更新
  app.put('/customers/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = createSchema.partial().parse(req.body)
    const exists = await prisma.customer.findFirst({ where: { id, companyId: req.companyId } })
    if (!exists) return reply.code(404).send({ message: '找不到此客戶' })
    return prisma.customer.update({ where: { id }, data: body })
  })

  // P0: verify customer belongs to this company before adding follow-up
  app.post('/customers/:id/follow-ups', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const customer = await prisma.customer.findFirst({ where: { id, companyId: req.companyId } })
    if (!customer) return reply.code(404).send({ message: '找不到此客戶' })
    const { content, nextFollowUp } = req.body as any
    const record = await prisma.customerFollowUp.create({
      data: {
        customerId: id,
        userId: req.userId,
        content,
        nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : undefined,
      },
    })
    return reply.code(201).send(record)
  })
}
