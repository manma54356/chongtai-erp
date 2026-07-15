import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const createSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  address: z.string().optional(),
  totalUnits: z.number().int().positive(),
  pmId: z.string().optional(),
  startDate: z.string().optional(),
  completionDate: z.string().optional(),
})

const updateSchema = createSchema.partial().extend({
  status: z.enum(['PLANNING','LAND_ACQUIRED','CONSTRUCTION','SALES','DELIVERING','COMPLETED']).optional(),
})

export default async function projectRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  // 列表
  app.get('/projects', auth, async (req) => {
    // P1: convert querystring values to numbers
    const page = Number((req.query as any).page ?? 1)
    const pageSize = Number((req.query as any).pageSize ?? 20)
    const { status } = req.query as any
    const where = {
      companyId: req.companyId,
      ...(status ? { status } : {}),
    }
    const [data, total] = await Promise.all([
      prisma.project.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { units: true } } },
      }),
      prisma.project.count({ where }),
    ])
    return { data, total, page, pageSize }
  })

  // 新增
  app.post('/projects', auth, async (req, reply) => {
    const body = createSchema.parse(req.body)
    const project = await prisma.project.create({
      data: { ...body, companyId: req.companyId,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        completionDate: body.completionDate ? new Date(body.completionDate) : undefined,
      },
    })
    return reply.code(201).send(project)
  })

  // 單筆
  app.get('/projects/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const project = await prisma.project.findFirst({
      where: { id, companyId: req.companyId },
      include: {
        units: true,
        milestones: { orderBy: { order: 'asc' } },
        caseProgress: true,
        budgets: true,
        _count: { select: { units: true } },
      },
    })
    if (!project) return reply.code(404).send({ message: '找不到此建案' })
    return project
  })

  // 更新
  app.put('/projects/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = updateSchema.parse(req.body)
    const exists = await prisma.project.findFirst({ where: { id, companyId: req.companyId } })
    if (!exists) return reply.code(404).send({ message: '找不到此建案' })
    const project = await prisma.project.update({
      where: { id },
      data: {
        ...body,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        completionDate: body.completionDate ? new Date(body.completionDate) : undefined,
      },
    })
    return project
  })
}
