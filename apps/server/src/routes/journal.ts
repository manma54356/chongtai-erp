import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import Decimal from 'decimal.js'

const lineSchema = z.object({
  accountId: z.string(),
  description: z.string().optional(),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
  order: z.number().int(),
})

const entrySchema = z.object({
  entryDate: z.string(),
  description: z.string().min(1),
  source: z.enum(['AR','AP','BANK','TRUST','REVENUE','COST','MANUAL']).default('MANUAL'),
  sourceId: z.string().optional(),
  projectId: z.string().optional(),
  lines: z.array(lineSchema).min(2),
})

export default async function journalRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  app.get('/journal', auth, async (req) => {
    // P1: convert querystring values to numbers
    const page = Number((req.query as any).page ?? 1)
    const pageSize = Number((req.query as any).pageSize ?? 20)
    const { projectId, status } = req.query as any
    const where = {
      companyId: req.companyId,
      ...(projectId ? { projectId } : {}),
      ...(status ? { status } : {}),
    }
    const [data, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { entryDate: 'desc' },
        include: { lines: { include: { account: { select: { code: true, name: true } } } } },
      }),
      prisma.journalEntry.count({ where }),
    ])
    return { data, total, page, pageSize }
  })

  app.post('/journal', auth, async (req, reply) => {
    const body = entrySchema.parse(req.body)

    // 驗證借貸平衡
    const totalDebit  = body.lines.reduce((s, l) => s + l.debit, 0)
    const totalCredit = body.lines.reduce((s, l) => s + l.credit, 0)
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return reply.code(400).send({ message: `借貸不平衡：借方 ${totalDebit}，貸方 ${totalCredit}` })
    }

    const count = await prisma.journalEntry.count({ where: { companyId: req.companyId } })
    const entryNo = `JE${String(count + 1).padStart(6, '0')}`

    const entry = await prisma.journalEntry.create({
      data: {
        companyId: req.companyId, entryNo,
        entryDate: new Date(body.entryDate),
        description: body.description, source: body.source,
        sourceId: body.sourceId, projectId: body.projectId,
        createdBy: req.userId,
        lines: {
          create: body.lines.map(l => ({
            accountId: l.accountId,
            description: l.description,
            debit: new Decimal(l.debit),
            credit: new Decimal(l.credit),
            order: l.order,
          })),
        },
      },
      include: { lines: { include: { account: true } } },
    })
    return reply.code(201).send(entry)
  })

  app.put('/journal/:id/post', auth, async (req, reply) => {
    const { id } = req.params as any
    const exists = await prisma.journalEntry.findFirst({ where: { id, companyId: req.companyId } })
    if (!exists) return reply.code(404).send({ message: '找不到傳票' })
    if (exists.status === 'POSTED') return reply.code(400).send({ message: '已過帳' })
    return prisma.journalEntry.update({
      where: { id },
      data: { status: 'POSTED', approvedBy: req.userId, approvedAt: new Date() },
    })
  })

  // 建案別損益
  app.get('/journal/project-pl/:projectId', auth, async (req) => {
    const { projectId } = req.params as any
    const lines = await prisma.journalEntryLine.findMany({
      where: { entry: { companyId: req.companyId, projectId, status: 'POSTED' } },
      include: { account: { select: { code: true, name: true, category: true } } },
    })
    const summary: Record<string, { name: string; category: string; debit: number; credit: number }> = {}
    for (const l of lines) {
      const key = l.account.code
      if (!summary[key]) summary[key] = { name: l.account.name, category: l.account.category, debit: 0, credit: 0 }
      summary[key].debit  += Number(l.debit)
      summary[key].credit += Number(l.credit)
    }
    return Object.entries(summary).map(([code, v]) => ({ code, ...v, net: v.credit - v.debit }))
  })
}
