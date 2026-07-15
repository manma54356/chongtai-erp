import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const SEED_ACCOUNTS = [
  { code: '1101', name: '庫存現金',       category: 'ASSET' },
  { code: '1111', name: '銀行存款－公司帳', category: 'ASSET' },
  { code: '1112', name: '銀行存款－信託專戶', category: 'ASSET' },
  { code: '1121', name: '應收帳款',       category: 'ASSET' },
  { code: '1122', name: '應收工程款',     category: 'ASSET' },
  { code: '1141', name: '土地',           category: 'ASSET' },
  { code: '1142', name: '在建工程成本',   category: 'ASSET' },
  { code: '1143', name: '待售房地',       category: 'ASSET' },
  { code: '1151', name: '辦公設備',       category: 'ASSET' },
  { code: '1152', name: '累計折舊',       category: 'ASSET' },
  { code: '2101', name: '應付帳款',       category: 'LIABILITY' },
  { code: '2102', name: '應付工程款',     category: 'LIABILITY' },
  { code: '2111', name: '預收訂金',       category: 'LIABILITY' },
  { code: '2112', name: '預收簽約金',     category: 'LIABILITY' },
  { code: '2113', name: '預收工程期款',   category: 'LIABILITY' },
  { code: '2114', name: '預收交屋尾款',   category: 'LIABILITY' },
  { code: '2121', name: '代收款',         category: 'LIABILITY' },
  { code: '2131', name: '短期借款',       category: 'LIABILITY' },
  { code: '2132', name: '長期借款－土建融', category: 'LIABILITY' },
  { code: '2141', name: '應付稅款－營業稅', category: 'LIABILITY' },
  { code: '2151', name: '保固準備',       category: 'LIABILITY' },
  { code: '3101', name: '股本',           category: 'EQUITY' },
  { code: '3102', name: '保留盈餘',       category: 'EQUITY' },
  { code: '4101', name: '建物銷售收入',   category: 'REVENUE' },
  { code: '4102', name: '土地銷售收入',   category: 'REVENUE' },
  { code: '4103', name: '客變追加收入',   category: 'REVENUE' },
  { code: '4104', name: '利息收入',       category: 'REVENUE' },
  { code: '5101', name: '土地成本',       category: 'COGS' },
  { code: '5102', name: '營造工程成本',   category: 'COGS' },
  { code: '5103', name: '規劃設計成本',   category: 'COGS' },
  { code: '5104', name: '廣告銷售成本',   category: 'COGS' },
  { code: '6101', name: '薪資支出',       category: 'EXPENSE' },
  { code: '6102', name: '伙食費',         category: 'EXPENSE' },
  { code: '6103', name: '租金費用',       category: 'EXPENSE' },
  { code: '6104', name: '廣告費用',       category: 'EXPENSE' },
  { code: '6105', name: '折舊費用',       category: 'EXPENSE' },
  { code: '6106', name: '利息支出',       category: 'EXPENSE' },
  { code: '6107', name: '交際費',         category: 'EXPENSE' },
  { code: '6108', name: '其他費用',       category: 'EXPENSE' },
] as const

export default async function accountRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  app.get('/accounts', auth, async (req) => {
    const { category } = req.query as any
    return prisma.chartOfAccount.findMany({
      where: { companyId: req.companyId, isActive: true, ...(category ? { category } : {}) },
      orderBy: { code: 'asc' },
    })
  })

  // 初始化建設業科目表
  app.post('/accounts/seed', auth, async (req, reply) => {
    const existing = await prisma.chartOfAccount.count({ where: { companyId: req.companyId } })
    if (existing > 0) return reply.code(400).send({ message: '科目表已存在，請直接編輯' })
    await prisma.chartOfAccount.createMany({
      data: SEED_ACCOUNTS.map(a => ({ ...a, companyId: req.companyId })),
    })
    return { message: `已建立 ${SEED_ACCOUNTS.length} 個科目` }
  })

  app.post('/accounts', auth, async (req, reply) => {
    const body = z.object({
      code: z.string(), name: z.string(),
      category: z.enum(['ASSET','LIABILITY','EQUITY','REVENUE','COGS','EXPENSE']),
      parentCode: z.string().optional(),
    }).parse(req.body)
    const account = await prisma.chartOfAccount.create({ data: { ...body, companyId: req.companyId } })
    return reply.code(201).send(account)
  })
}
