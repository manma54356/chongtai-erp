import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const categoryLabel: Record<string, string> = {
  LAND: '土地成本', CONSTRUCTION: '建造成本', DESIGN: '設計費',
  ADVERTISING: '廣告費', ADMIN: '管理費', FINANCE: '財務費用', OTHER: '其他',
}
const CATEGORIES = Object.keys(categoryLabel)

const budgetSchema = z.object({
  category: z.enum(['LAND','CONSTRUCTION','DESIGN','ADVERTISING','ADMIN','FINANCE','OTHER']),
  budgetAmount: z.number().positive(),
  notes: z.string().optional(),
})

const costSchema = z.object({
  category: z.enum(['LAND','CONSTRUCTION','DESIGN','ADVERTISING','ADMIN','FINANCE','OTHER']),
  description: z.string().min(1),
  amount: z.number().positive(),
  costDate: z.string(),
  vendorId: z.string().optional(),
})

export default async function budgetRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  // 預算 summary（預算 vs 實際）
  app.get('/projects/:projectId/budget/summary', auth, async (req, reply) => {
    const { projectId } = req.params as { projectId: string }

    const project = await prisma.project.findFirst({
      where: { id: projectId, companyId: req.companyId },
      select: { id: true, name: true },
    })
    if (!project) return reply.code(404).send({ message: '找不到建案' })

    const [budgets, costs] = await Promise.all([
      prisma.projectBudget.findMany({ where: { projectId } }),
      prisma.projectCost.findMany({
        where: { projectId },
        include: { project: false },
      }),
    ])

    const summary = CATEGORIES.map(cat => {
      const budget = budgets.find(b => b.category === cat)
      const actual = costs
        .filter(c => c.category === cat)
        .reduce((s, c) => s + Number(c.amount), 0)
      const budgetAmt = Number(budget?.budgetAmount ?? 0)
      return {
        category: cat,
        label: categoryLabel[cat],
        budgetAmount: budgetAmt,
        actualAmount: actual,
        variance: budgetAmt - actual,
        usageRate: budgetAmt > 0 ? Math.round((actual / budgetAmt) * 100) : null,
      }
    })

    const totalBudget = summary.reduce((s, r) => s + r.budgetAmount, 0)
    const totalActual = summary.reduce((s, r) => s + r.actualAmount, 0)

    return { project, summary, totalBudget, totalActual, totalVariance: totalBudget - totalActual }
  })

  // 設定/更新預算
  app.put('/projects/:projectId/budget', auth, async (req, reply) => {
    const { projectId } = req.params as { projectId: string }
    const body = budgetSchema.parse(req.body)
    const result = await prisma.projectBudget.upsert({
      where: { projectId_category: { projectId, category: body.category } },
      create: { projectId, ...body, budgetAmount: body.budgetAmount },
      update: { budgetAmount: body.budgetAmount, notes: body.notes },
    })
    return result
  })

  // 費用列表
  app.get('/projects/:projectId/costs', auth, async (req, reply) => {
    const { projectId } = req.params as { projectId: string }
    const { category } = req.query as any
    const costs = await prisma.projectCost.findMany({
      where: { projectId, ...(category ? { category } : {}) },
      orderBy: { costDate: 'desc' },
      include: { vendor: { select: { id: true, name: true } } } as any,
    })
    return costs
  })

  // 登錄費用
  app.post('/projects/:projectId/costs', auth, async (req, reply) => {
    const { projectId } = req.params as { projectId: string }
    const body = costSchema.parse(req.body)
    const cost = await prisma.projectCost.create({
      data: { projectId, ...body, costDate: new Date(body.costDate), amount: body.amount },
    })
    return reply.code(201).send(cost)
  })

  // 刪除費用
  app.delete('/projects/:projectId/costs/:costId', auth, async (req, reply) => {
    const { costId } = req.params as { projectId: string; costId: string }
    await prisma.projectCost.delete({ where: { id: costId } })
    return reply.code(204).send()
  })
}
