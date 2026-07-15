import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'

export default async function auditLogRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  app.get('/audit-logs', auth, async (req, reply) => {
    if (req.role !== 'OWNER') return reply.code(403).send({ message: '僅老闆可查看修改紀錄' })

    const { page = 1, pageSize = 50, targetType, keyword, startDate, endDate } = req.query as any
    const where: any = {
      companyId: req.companyId,
      ...(targetType ? { targetType } : {}),
      ...(keyword ? {
        OR: [
          { action: { contains: keyword } },
          { targetId: { contains: keyword } },
        ],
      } : {}),
      ...(startDate || endDate ? {
        createdAt: {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate ? { lte: new Date(endDate) } : {}),
        },
      } : {}),
    }

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ])

    return { data, total, page: Number(page), pageSize: Number(pageSize) }
  })
}
