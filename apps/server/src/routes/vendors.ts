import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const schema = z.object({
  name: z.string().min(1),
  taxId: z.string().optional(),
  category: z.enum(['CONSTRUCTION','MATERIAL','DESIGN','ADVERTISING','BROKER','LEGAL','OTHER']),
  contact: z.string().optional(),
  phone: z.string().optional(),
})

export default async function vendorRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  app.get('/vendors', auth, async (req) => {
    const { category } = req.query as any
    return prisma.vendor.findMany({
      where: { companyId: req.companyId, isActive: true, ...(category ? { category } : {}) },
      orderBy: { name: 'asc' },
    })
  })

  app.post('/vendors', auth, async (req, reply) => {
    const body = schema.parse(req.body)
    const vendor = await prisma.vendor.create({ data: { ...body, companyId: req.companyId } as any })
    return reply.code(201).send(vendor)
  })

  app.put('/vendors/:id', auth, async (req, reply) => {
    const { id } = req.params as any
    const body = schema.partial().parse(req.body)
    const exists = await prisma.vendor.findFirst({ where: { id, companyId: req.companyId } })
    if (!exists) return reply.code(404).send({ message: '找不到廠商' })
    return prisma.vendor.update({ where: { id }, data: body })
  })
}
