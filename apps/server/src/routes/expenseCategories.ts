import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const DEFAULT_CATEGORIES = ['差旅費', '材料費', '設備費', '勞務費', '行政費用', '其他']

export default async function expenseCategoryRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  app.get('/expense-categories', auth, async (req) => {
    const custom = await prisma.expenseCategory.findMany({
      where: { companyId: req.companyId },
      orderBy: { createdAt: 'asc' },
    })
    return { defaults: DEFAULT_CATEGORIES, custom }
  })

  app.post('/expense-categories', auth, async (req, reply) => {
    if (!['OWNER', 'FINANCE_CHIEF'].includes(req.role)) {
      return reply.code(403).send({ message: '僅財務長或老闆可新增費用類別' })
    }
    const { name } = z.object({ name: z.string().min(1).max(50) }).parse(req.body)
    if (DEFAULT_CATEGORIES.includes(name)) {
      return reply.code(400).send({ message: '此類別名稱已存在' })
    }
    const cat = await prisma.expenseCategory.create({
      data: { companyId: req.companyId, name },
    })
    return reply.code(201).send(cat)
  })

  app.delete('/expense-categories/:id', auth, async (req, reply) => {
    if (!['OWNER', 'FINANCE_CHIEF'].includes(req.role)) {
      return reply.code(403).send({ message: '僅財務長或老闆可刪除費用類別' })
    }
    const { id } = req.params as { id: string }
    const cat = await prisma.expenseCategory.findFirst({
      where: { id, companyId: req.companyId },
    })
    if (!cat) return reply.code(404).send({ message: '找不到此類別' })
    await prisma.expenseCategory.delete({ where: { id } })
    return reply.code(204).send()
  })
}
