import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import Decimal from 'decimal.js'
import { createAuditLog } from '../lib/auditLog.js'

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

// P1: valid contract status enum with legal transitions
const CONTRACT_STATUS_ENUM = z.enum([
  'NEGOTIATING','DEPOSITED','SIGNED','SEALED',
  'LOAN_APPROVED','READY_DELIVER','DELIVERED','WARRANTY','CLOSED',
])

// Legal forward transitions (any status can be reached from prior ones)
const VALID_TRANSITIONS: Record<string, string[]> = {
  NEGOTIATING:   ['DEPOSITED','SIGNED','SEALED','LOAN_APPROVED','READY_DELIVER','DELIVERED','WARRANTY','CLOSED'],
  DEPOSITED:     ['SIGNED','SEALED','LOAN_APPROVED','READY_DELIVER','DELIVERED','WARRANTY','CLOSED'],
  SIGNED:        ['SEALED','LOAN_APPROVED','READY_DELIVER','DELIVERED','WARRANTY','CLOSED'],
  SEALED:        ['LOAN_APPROVED','READY_DELIVER','DELIVERED','WARRANTY','CLOSED'],
  LOAN_APPROVED: ['READY_DELIVER','DELIVERED','WARRANTY','CLOSED'],
  READY_DELIVER: ['DELIVERED','WARRANTY','CLOSED'],
  DELIVERED:     ['WARRANTY','CLOSED'],
  WARRANTY:      ['CLOSED'],
  CLOSED:        [],
}

export default async function contractRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  // 列表
  app.get('/contracts', auth, async (req) => {
    const page = Number((req.query as any).page ?? 1)
    const pageSize = Number((req.query as any).pageSize ?? 20)
    const { status, customerId, projectId } = req.query as any
    const where: any = {
      companyId: req.companyId,
      ...(status ? { status } : {}),
      ...(customerId ? { customerId } : {}),
      ...(projectId ? { unit: { projectId } } : {}),
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
    // P0: verify customerId and unitId belong to this company
    const customer = await prisma.customer.findFirst({ where: { id: body.customerId, companyId: req.companyId } })
    if (!customer) return reply.code(404).send({ message: '找不到此客戶' })
    const unit = await prisma.unit.findFirst({ where: { id: body.unitId, project: { companyId: req.companyId } } })
    if (!unit) return reply.code(404).send({ message: '找不到此戶別' })
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
    await createAuditLog({
      companyId: req.companyId, userId: req.userId,
      action: 'CREATE', targetType: 'CONTRACT', targetId: contract.id,
      after: { contractNo: contract.contractNo, totalPrice: body.totalPrice, unitId: body.unitId, customerId: body.customerId },
    })
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

  // P1: use zod enum + legal transition validation
  app.put('/contracts/:id/status', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { status } = z.object({ status: CONTRACT_STATUS_ENUM }).parse(req.body)
    const exists = await prisma.contract.findFirst({ where: { id, companyId: req.companyId } })
    if (!exists) return reply.code(404).send({ message: '找不到此合約' })

    const allowed = VALID_TRANSITIONS[exists.status] ?? []
    if (!allowed.includes(status)) {
      return reply.code(400).send({ message: `不能從 ${exists.status} 轉換到 ${status}` })
    }

    const contract = await prisma.contract.update({ where: { id }, data: { status } })
    if (status === 'DELIVERED') {
      await prisma.unit.update({ where: { id: exists.unitId }, data: { status: 'DELIVERED' } })
    }
    await createAuditLog({
      companyId: req.companyId, userId: req.userId,
      action: 'STATUS_CHANGE', targetType: 'CONTRACT', targetId: id,
      before: { status: exists.status }, after: { status },
    })
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

  // P0: verify schedule belongs to this contract + validate amount
  app.put('/contracts/:id/schedules/:scheduleId/receive', auth, async (req, reply) => {
    const { id, scheduleId } = req.params as { id: string; scheduleId: string }

    // Verify contract belongs to this company
    const contract = await prisma.contract.findFirst({ where: { id, companyId: req.companyId } })
    if (!contract) return reply.code(404).send({ message: '找不到此合約' })

    // Verify schedule belongs to this contract
    const schedule = await prisma.paymentSchedule.findFirst({
      where: { id: scheduleId, contractId: id },
    })
    if (!schedule) return reply.code(404).send({ message: '找不到此收款排程' })

    const { receivedAmount, receivedDate, trustConfirmed } = z.object({
      receivedAmount: z.number().positive(),
      receivedDate: z.string(),
      trustConfirmed: z.boolean().optional(),
    }).parse(req.body)

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
