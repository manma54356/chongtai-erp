import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import Decimal from 'decimal.js'

const createSchema = z.object({
  contractNo: z.string().min(1),
  customerId: z.string(),
  unitId: z.string(),
  salesPersonId: z.string().optional(),
  totalPrice: z.number().positive(),
  buildingPrice: z.number().positive().optional(),
  landPrice: z.number().positive().optional(),
  signDate: z.string().optional(),
  loanBank: z.string().optional(),
  loanAmount: z.number().optional(),
  deliveryDate: z.string().optional(),
  notes: z.string().optional(),
})

const scheduleSchema = z.array(z.object({
  periodCode: z.string(),
  periodType: z.enum(['DEPOSIT','CONTRACT_FEE','PROGRESS','DELIVERY','BANK_LOAN']),
  calcMethod: z.enum(['FIXED','PCT']),
  fixedAmount: z.number().optional(),
  percentage: z.number().optional(),
  calcBase: z.enum(['TOTAL_PRICE','BUILDING_PRICE']).default('TOTAL_PRICE'),
  triggerType: z.enum(['DATE','MILESTONE','EVENT']).default('MILESTONE'),
  milestoneId: z.string().optional(),
  receiverAccount: z.enum(['TRUST','COMPANY']).default('TRUST'),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
}))

export default async function contractRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  // 列表
  app.get('/contracts', auth, async (req) => {
    const { page = 1, pageSize = 20, status, customerId } = req.query as any
    const where = {
      companyId: req.companyId,
      ...(status ? { status } : {}),
      ...(customerId ? { customerId } : {}),
    }
    const [data, total] = await Promise.all([
      prisma.contract.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          unit: { include: { project: { select: { id: true, name: true, code: true } } } },
          _count: { select: { paymentSchedules: true } },
        },
      }),
      prisma.contract.count({ where }),
    ])
    return { data, total, page, pageSize }
  })

  // 新增合約
  app.post('/contracts', auth, async (req, reply) => {
    const body = createSchema.parse(req.body)
    const contract = await prisma.contract.create({
      data: {
        ...body,
        companyId: req.companyId,
        totalPrice: new Decimal(body.totalPrice),
        buildingPrice: body.buildingPrice ? new Decimal(body.buildingPrice) : undefined,
        landPrice: body.landPrice ? new Decimal(body.landPrice) : undefined,
        loanAmount: body.loanAmount ? new Decimal(body.loanAmount) : undefined,
        signDate: body.signDate ? new Date(body.signDate) : undefined,
        deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : undefined,
        status: 'NEGOTIATING',
      },
    })
    // 更新戶別狀態
    await prisma.unit.update({ where: { id: body.unitId }, data: { status: 'RESERVED' } })
    return reply.code(201).send(contract)
  })

  // 單筆（含付款排程）
  app.get('/contracts/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const contract = await prisma.contract.findFirst({
      where: { id, companyId: req.companyId },
      include: {
        customer: true,
        unit: { include: { project: true } },
        paymentSchedules: { orderBy: { periodCode: 'asc' }, include: { milestone: true } },
        changeOrders: { orderBy: { requestDate: 'desc' } },
        invoices: true,
      },
    })
    if (!contract) return reply.code(404).send({ message: '找不到此合約' })
    return contract
  })

  // 更新狀態
  app.put('/contracts/:id/status', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { status } = req.body as { status: string }
    const exists = await prisma.contract.findFirst({ where: { id, companyId: req.companyId } })
    if (!exists) return reply.code(404).send({ message: '找不到此合約' })
    const contract = await prisma.contract.update({ where: { id }, data: { status: status as any } })
    // 交屋時更新戶別狀態
    if (status === 'DELIVERED') {
      await prisma.unit.update({ where: { id: exists.unitId }, data: { status: 'DELIVERED' } })
    }
    return contract
  })

  // 設定付款排程
  app.post('/contracts/:id/schedules', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const contract = await prisma.contract.findFirst({ where: { id, companyId: req.companyId } })
    if (!contract) return reply.code(404).send({ message: '找不到此合約' })

    const items = scheduleSchema.parse(req.body)

    // 刪除舊排程（尚未收款的）
    await prisma.paymentSchedule.deleteMany({
      where: { contractId: id, receivedAmount: { equals: 0 } },
    })

    const schedules = items.map((item) => {
      const base = item.calcBase === 'BUILDING_PRICE'
        ? Number(contract.buildingPrice ?? contract.totalPrice)
        : Number(contract.totalPrice)

      const scheduled = item.calcMethod === 'FIXED'
        ? item.fixedAmount!
        : Math.round(base * (item.percentage! / 100))

      return {
        contractId: id,
        ...item,
        scheduledAmount: new Decimal(scheduled),
        finalAmount: new Decimal(scheduled),
        fixedAmount: item.fixedAmount ? new Decimal(item.fixedAmount) : undefined,
        dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
      }
    })

    await prisma.paymentSchedule.createMany({ data: schedules as any })
    return reply.code(201).send({ message: `已建立 ${schedules.length} 筆付款排程` })
  })

  // 記錄收款
  app.put('/contracts/:id/schedules/:scheduleId/receive', auth, async (req, reply) => {
    const { scheduleId } = req.params as { id: string; scheduleId: string }
    const { receivedAmount, receivedDate, trustConfirmed } = req.body as any
    const updated = await prisma.paymentSchedule.update({
      where: { id: scheduleId },
      data: {
        receivedAmount: new Decimal(receivedAmount),
        receivedDate: new Date(receivedDate),
        trustConfirmed: trustConfirmed ?? false,
      },
    })
    return updated
  })
}
