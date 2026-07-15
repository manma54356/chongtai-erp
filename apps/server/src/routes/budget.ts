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
      // P1: removed invalid vendor include (ProjectCost has no vendor relation in schema)
      prisma.projectCost.findMany({ where: { projectId } }),
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

  // P0: verify project belongs to company before upsert
  app.put('/projects/:projectId/budget', auth, async (req, reply) => {
    const { projectId } = req.params as { projectId: string }
    const project = await prisma.project.findFirst({ where: { id: projectId, companyId: req.companyId } })
    if (!project) return reply.code(404).send({ message: '找不到建案' })
    const body = budgetSchema.parse(req.body)
    const result = await prisma.projectBudget.upsert({
      where: { projectId_category: { projectId, category: body.category } },
      create: { projectId, ...body, budgetAmount: body.budgetAmount },
      update: { budgetAmount: body.budgetAmount, notes: body.notes },
    })
    return result
  })

  // P0: verify project belongs to company
  app.get('/projects/:projectId/costs', auth, async (req, reply) => {
    const { projectId } = req.params as { projectId: string }
    const project = await prisma.project.findFirst({ where: { id: projectId, companyId: req.companyId } })
    if (!project) return reply.code(404).send({ message: '找不到建案' })
    const { category } = req.query as any
    const costs = await prisma.projectCost.findMany({
      where: { projectId, ...(category ? { category } : {}) },
      orderBy: { costDate: 'desc' },
    })
    return costs
  })

  // P0: verify project belongs to company
  app.post('/projects/:projectId/costs', auth, async (req, reply) => {
    const { projectId } = req.params as { projectId: string }
    const project = await prisma.project.findFirst({ where: { id: projectId, companyId: req.companyId } })
    if (!project) return reply.code(404).send({ message: '找不到建案' })
    const body = costSchema.parse(req.body)
    const cost = await prisma.projectCost.create({
      data: { projectId, ...body, costDate: new Date(body.costDate), amount: body.amount },
    })
    return reply.code(201).send(cost)
  })

  // P0: verify both projectId and costId belong to this company
  app.delete('/projects/:projectId/costs/:costId', auth, async (req, reply) => {
    const { projectId, costId } = req.params as { projectId: string; costId: string }
    const project = await prisma.project.findFirst({ where: { id: projectId, companyId: req.companyId } })
    if (!project) return reply.code(404).send({ message: '找不到建案' })
    const cost = await prisma.projectCost.findFirst({ where: { id: costId, projectId } })
    if (!cost) return reply.code(404).send({ message: '找不到此費用' })
    await prisma.projectCost.delete({ where: { id: costId } })
    return reply.code(204).send()
  })
}
