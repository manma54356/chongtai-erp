import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

export default async function milestoneRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  // 取得建案里程碑
  app.get('/projects/:projectId/milestones', auth, async (req, reply) => {
    const { projectId } = req.params as any
    const project = await prisma.project.findFirst({ where: { id: projectId, companyId: req.companyId } })
    if (!project) return reply.code(404).send({ message: '找不到建案' })
    return prisma.projectMilestone.findMany({ where: { projectId }, orderBy: { order: 'asc' } })
  })

  // 批次設定里程碑（覆寫）
  app.post('/projects/:projectId/milestones/batch', auth, async (req, reply) => {
    const { projectId } = req.params as any
    const project = await prisma.project.findFirst({ where: { id: projectId, companyId: req.companyId } })
    if (!project) return reply.code(404).send({ message: '找不到建案' })

    const items = z.array(z.object({
      order: z.number().int(),
      name: z.string().min(1),
      plannedDate: z.string().optional(),
    })).parse(req.body)

    await prisma.projectMilestone.deleteMany({ where: { projectId } })
    await prisma.projectMilestone.createMany({
      data: items.map(i => ({
        projectId, order: i.order, name: i.name,
        plannedDate: i.plannedDate ? new Date(i.plannedDate) : undefined,
      })),
    })
    return reply.code(201).send({ message: `已建立 ${items.length} 個里程碑` })
  })

  // P0: verify milestone belongs to this company before updating
  app.put('/milestones/:id', auth, async (req, reply) => {
    const { id } = req.params as any
    const body = z.object({
      status: z.enum(['PENDING','IN_PROGRESS','COMPLETED','DELAYED']).optional(),
      actualDate: z.string().optional(),
      completionPct: z.number().int().min(0).max(100).optional(),
    }).parse(req.body)

    const existing = await prisma.projectMilestone.findFirst({
      where: { id, project: { companyId: req.companyId } },
    })
    if (!existing) return reply.code(404).send({ message: '找不到此里程碑' })

    const milestone = await prisma.projectMilestone.update({
      where: { id },
      data: {
        ...body,
        actualDate: body.actualDate ? new Date(body.actualDate) : undefined,
      },
    })

    // 若完成，觸發付款排程的請款提醒（更新 dueDate）
    if (body.status === 'COMPLETED' && body.actualDate) {
      await prisma.paymentSchedule.updateMany({
        where: { milestoneId: id, dueDate: null },
        data: { dueDate: new Date(body.actualDate) },
      })
    }
    return milestone
  })

  // 里程碑範本
  app.get('/milestone-templates', auth, async () => {
    return prisma.milestoneTemplate.findMany({ include: { items: { orderBy: { order: 'asc' } } } })
  })

  app.post('/milestone-templates', auth, async (req, reply) => {
    const body = z.object({
      name: z.string().min(1),
      items: z.array(z.object({ order: z.number(), name: z.string() })),
    }).parse(req.body)

    const template = await prisma.milestoneTemplate.create({
      data: { name: body.name, items: { create: body.items } },
      include: { items: true },
    })
    return reply.code(201).send(template)
  })
}
