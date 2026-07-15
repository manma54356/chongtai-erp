import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import Decimal from 'decimal.js'

const schema = z.object({
  code: z.string().min(1),
  floor: z.number().int().optional(),
  area: z.number().positive().optional(),
  listPrice: z.number().positive().optional(),
})

export default async function unitRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  app.get('/projects/:projectId/units', auth, async (req, reply) => {
    const { projectId } = req.params as any
    const project = await prisma.project.findFirst({ where: { id: projectId, companyId: req.companyId } })
    if (!project) return reply.code(404).send({ message: '找不到建案' })
    return prisma.unit.findMany({ where: { projectId }, orderBy: { code: 'asc' } })
  })

  app.post('/projects/:projectId/units', auth, async (req, reply) => {
    const { projectId } = req.params as any
    const project = await prisma.project.findFirst({ where: { id: projectId, companyId: req.companyId } })
    if (!project) return reply.code(404).send({ message: '找不到建案' })
    const body = schema.parse(req.body)
    const unit = await prisma.unit.create({
      data: { ...body, projectId,
        area: body.area ? new Decimal(body.area) : undefined,
        listPrice: body.listPrice ? new Decimal(body.listPrice) : undefined,
      },
    })
    return reply.code(201).send(unit)
  })

  app.post('/projects/:projectId/units/batch', auth, async (req, reply) => {
    const { projectId } = req.params as any
    const project = await prisma.project.findFirst({ where: { id: projectId, companyId: req.companyId } })
    if (!project) return reply.code(404).send({ message: '找不到建案' })
    const items = z.array(schema).parse(req.body)
    await prisma.unit.createMany({
      data: (items.map(i => ({ ...i, projectId,
        code: i.code!,
        area: i.area ? new Decimal(i.area) : undefined,
        listPrice: i.listPrice ? new Decimal(i.listPrice) : undefined,
      }))) as any,
      skipDuplicates: true,
    })
    return reply.code(201).send({ message: `已建立 ${items.length} 筆戶別` })
  })

  // P0: verify unit belongs to this company before updating
  app.put('/units/:id', auth, async (req, reply) => {
    const { id } = req.params as any
    const unit = await prisma.unit.findFirst({
      where: { id, project: { companyId: req.companyId } },
    })
    if (!unit) return reply.code(404).send({ message: '找不到此戶別' })
    const body = schema.partial().parse(req.body)
    return prisma.unit.update({ where: { id }, data: {
      ...body,
      area: body.area ? new Decimal(body.area) : undefined,
      listPrice: body.listPrice ? new Decimal(body.listPrice) : undefined,
    }})
  })
}
