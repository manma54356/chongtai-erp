import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { hashPassword } from '../lib/password.js'

export default async function userRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  app.get('/users', auth, async (req) => {
    return prisma.userCompanyRole.findMany({
      where: { companyId: req.companyId },
      include: { user: { select: { id: true, name: true, email: true, phone: true, isActive: true } } },
    })
  })

  app.post('/users', auth, async (req, reply) => {
    const body = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(8),
      phone: z.string().optional(),
      role: z.enum(['OWNER','FINANCE_CHIEF','ACCOUNTANT','CASHIER','SALES','SALES_ADMIN','PM','ENGINEER','CUSTOMER_SERVICE']),
    }).parse(req.body)

    const existing = await prisma.user.findUnique({ where: { email: body.email } })
    if (existing) {
      // 已有帳號，直接加入此公司
      const member = await prisma.userCompanyRole.create({
        data: { userId: existing.id, companyId: req.companyId, role: body.role },
      })
      return reply.code(201).send(member)
    }

    const user = await prisma.user.create({
      data: {
        name: body.name, email: body.email, phone: body.phone,
        passwordHash: await hashPassword(body.password),
        companies: { create: { companyId: req.companyId, role: body.role } },
      },
    })
    return reply.code(201).send({ id: user.id, name: user.name, email: user.email })
  })

  app.put('/users/:userId/role', auth, async (req, reply) => {
    const { userId } = req.params as any
    const { role } = req.body as any
    const member = await prisma.userCompanyRole.findUnique({
      where: { userId_companyId: { userId, companyId: req.companyId } },
    })
    if (!member) return reply.code(404).send({ message: '找不到此成員' })
    return prisma.userCompanyRole.update({
      where: { userId_companyId: { userId, companyId: req.companyId } },
      data: { role },
    })
  })

  app.put('/users/:userId/deactivate', auth, async (req, reply) => {
    const { userId } = req.params as any
    return prisma.user.update({ where: { id: userId }, data: { isActive: false } })
  })

  // 設定額外功能權限（僅 OWNER）
  app.put('/users/:userId/features', auth, async (req, reply) => {
    if (req.role !== 'OWNER') return reply.code(403).send({ message: '僅老闆可調整成員權限' })
    const { userId } = req.params as any
    const { features } = req.body as { features: string[] }
    const member = await prisma.userCompanyRole.findUnique({
      where: { userId_companyId: { userId, companyId: req.companyId } },
    })
    if (!member) return reply.code(404).send({ message: '找不到此成員' })
    return prisma.userCompanyRole.update({
      where: { userId_companyId: { userId, companyId: req.companyId } },
      data: { features },
    })
  })

  // 啟用帳號
  app.put('/users/:userId/activate', auth, async (req, reply) => {
    if (req.role !== 'OWNER') return reply.code(403).send({ message: '僅老闆可啟用帳號' })
    const { userId } = req.params as any
    return prisma.user.update({ where: { id: userId }, data: { isActive: true } })
  })
}
