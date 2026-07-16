import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const SEED_ACCOUNTS = [
  // 資產 (1xxx)
  { code: '1111',   name: '現金',                     category: 'ASSET' },
  { code: '1112',   name: '銀行存款',                 category: 'ASSET' },
  { code: '111201', name: '銀行存款-中信#2017',       category: 'ASSET' },
  { code: '111202', name: '銀行存款-陽信#5677',       category: 'ASSET' },
  { code: '1113',   name: '約當現金',                 category: 'ASSET' },
  { code: '1121',   name: '應收票據',                 category: 'ASSET' },
  { code: '1123',   name: '應收帳款',                 category: 'ASSET' },
  { code: '1125',   name: '合約資產－流動',           category: 'ASSET' },
  { code: '1129',   name: '其他應收款',               category: 'ASSET' },
  { code: '1131',   name: '商品存貨',                 category: 'ASSET' },
  { code: '1133',   name: '在製品(在建工程)存貨',     category: 'ASSET' },
  { code: '1141',   name: '預付費用',                 category: 'ASSET' },
  { code: '1143',   name: '預付貨款',                 category: 'ASSET' },
  { code: '1144',   name: '進項稅額',                 category: 'ASSET' },
  { code: '1145',   name: '留抵稅額',                 category: 'ASSET' },
  { code: '1191',   name: '暫付款',                   category: 'ASSET' },
  { code: '1192',   name: '股東往來',                 category: 'ASSET' },
  { code: '1410',   name: '土地',                     category: 'ASSET' },
  { code: '1431',   name: '房屋及建築',               category: 'ASSET' },
  { code: '1432',   name: '累計折舊-房屋及建築',      category: 'ASSET' },
  { code: '1441',   name: '機器設備',                 category: 'ASSET' },
  { code: '1442',   name: '累計折舊-機器設備',        category: 'ASSET' },
  { code: '1451',   name: '運輸設備',                 category: 'ASSET' },
  { code: '1452',   name: '累計折舊-運輸設備',        category: 'ASSET' },
  { code: '1461',   name: '辦公設備',                 category: 'ASSET' },
  { code: '1462',   name: '累計折舊-辦公設備',        category: 'ASSET' },
  { code: '1470',   name: '未完工程及待驗設備',       category: 'ASSET' },
  { code: '1901',   name: '存出保證金',               category: 'ASSET' },
  { code: '1903',   name: '預付設備款',               category: 'ASSET' },
  // 負債 (2xxx)
  { code: '2111',   name: '銀行透支',                 category: 'LIABILITY' },
  { code: '2112',   name: '銀行借款',                 category: 'LIABILITY' },
  { code: '2119',   name: '其他短期借款',             category: 'LIABILITY' },
  { code: '2120',   name: '應付票據',                 category: 'LIABILITY' },
  { code: '2121',   name: '應付帳款',                 category: 'LIABILITY' },
  { code: '2126',   name: '合約負債－流動',           category: 'LIABILITY' },
  { code: '2131',   name: '應付費用',                 category: 'LIABILITY' },
  { code: '2132',   name: '應付稅捐',                 category: 'LIABILITY' },
  { code: '2133',   name: '應付股利',                 category: 'LIABILITY' },
  { code: '2134',   name: '銷項稅額',                 category: 'LIABILITY' },
  { code: '2135',   name: '其他應付款',               category: 'LIABILITY' },
  { code: '2136',   name: '預收款項',                 category: 'LIABILITY' },
  { code: '2137',   name: '預收貨款',                 category: 'LIABILITY' },
  { code: '2191',   name: '暫收款',                   category: 'LIABILITY' },
  { code: '2195',   name: '代收款',                   category: 'LIABILITY' },
  { code: '2220',   name: '長期借款',                 category: 'LIABILITY' },
  { code: '2280',   name: '長期應付票據及款項',       category: 'LIABILITY' },
  { code: '2281',   name: '合約負債－非流動',         category: 'LIABILITY' },
  { code: '2282',   name: '租賃負債',                 category: 'LIABILITY' },
  { code: '2910',   name: '存入保證金',               category: 'LIABILITY' },
  { code: '2940',   name: '退休金準備',               category: 'LIABILITY' },
  // 權益 (3xxx)
  { code: '3110',   name: '資本(登記)',               category: 'EQUITY' },
  { code: '3300',   name: '資本公積',                 category: 'EQUITY' },
  { code: '3412',   name: '法定公積',                 category: 'EQUITY' },
  { code: '3422',   name: '特別公積',                 category: 'EQUITY' },
  { code: '3432',   name: '累積盈虧',                 category: 'EQUITY' },
  { code: '3440',   name: '本期損益(稅後)',           category: 'EQUITY' },
  { code: '3600',   name: '減:庫藏股票',             category: 'EQUITY' },
  // 營業收入 (4xxx)
  { code: '4101',   name: '營業收入',                 category: 'REVENUE' },
  { code: '4102',   name: '外匯收入',                 category: 'REVENUE' },
  { code: '4201',   name: '銷貨退回',                 category: 'REVENUE' },
  { code: '4202',   name: '銷貨折讓',                 category: 'REVENUE' },
  // 營業成本 (5xxx)
  { code: '5021',   name: '進貨',                     category: 'COGS' },
  { code: '5022',   name: '進貨退出',                 category: 'COGS' },
  { code: '5121',   name: '原料',                     category: 'COGS' },
  { code: '5221',   name: '物料',                     category: 'COGS' },
  { code: '5300',   name: '直接人工',                 category: 'COGS' },
  { code: '5570',   name: '產銷成本',                 category: 'COGS' },
  { code: '5600',   name: '勞務成本',                 category: 'COGS' },
  { code: '5700',   name: '修理成本',                 category: 'COGS' },
  { code: '5810',   name: '業務成本',                 category: 'COGS' },
  { code: '5900',   name: '其他營業成本',             category: 'COGS' },
  // 營業費用 (6xxx)
  { code: '6110',   name: '薪資支出',                 category: 'EXPENSE' },
  { code: '6111',   name: '租金支出',                 category: 'EXPENSE' },
  { code: '6112',   name: '文具用品',                 category: 'EXPENSE' },
  { code: '6113',   name: '旅費',                     category: 'EXPENSE' },
  { code: '6114',   name: '運費',                     category: 'EXPENSE' },
  { code: '6115',   name: '郵電費',                   category: 'EXPENSE' },
  { code: '6116',   name: '修繕費',                   category: 'EXPENSE' },
  { code: '6117',   name: '廣告費',                   category: 'EXPENSE' },
  { code: '6118',   name: '水電瓦斯費',               category: 'EXPENSE' },
  { code: '6119',   name: '保險費',                   category: 'EXPENSE' },
  { code: '6120',   name: '交際費',                   category: 'EXPENSE' },
  { code: '6121',   name: '捐贈',                     category: 'EXPENSE' },
  { code: '6122',   name: '稅捐',                     category: 'EXPENSE' },
  { code: '6123',   name: '呆帳損失',                 category: 'EXPENSE' },
  { code: '6124',   name: '折舊',                     category: 'EXPENSE' },
  { code: '6125',   name: '各項耗竭及攤提',           category: 'EXPENSE' },
  { code: '6127',   name: '伙食費',                   category: 'EXPENSE' },
  { code: '6128',   name: '職工福利',                 category: 'EXPENSE' },
  { code: '6130',   name: '佣金支出',                 category: 'EXPENSE' },
  { code: '6131',   name: '訓練費',                   category: 'EXPENSE' },
  { code: '6132',   name: '其他費用',                 category: 'EXPENSE' },
  { code: '613201', name: '什費',                     category: 'EXPENSE' },
  { code: '613202', name: '管理費用',                 category: 'EXPENSE' },
  { code: '613207', name: '勞工退休金',               category: 'EXPENSE' },
  { code: '613208', name: '勞務費',                   category: 'EXPENSE' },
  { code: '613209', name: '加班費',                   category: 'EXPENSE' },
  { code: '613210', name: '教育訓練費用',             category: 'EXPENSE' },
  { code: '613212', name: '交通費用',                 category: 'EXPENSE' },
  // 非營業收入 (7xxx)
  { code: '7038',   name: '利息收入',                 category: 'REVENUE' },
  { code: '7039',   name: '租賃收入',                 category: 'REVENUE' },
  { code: '7040',   name: '出售資產盈餘',             category: 'REVENUE' },
  { code: '7041',   name: '佣金收入',                 category: 'REVENUE' },
  { code: '7043',   name: '兌換盈益',                 category: 'REVENUE' },
  { code: '7044',   name: '其他收入',                 category: 'REVENUE' },
  { code: '7097',   name: '退稅收入',                 category: 'REVENUE' },
  { code: '7098',   name: '國外投資收益',             category: 'REVENUE' },
  // 非營業損失 (8xxx)
  { code: '8046',   name: '利息支出',                 category: 'EXPENSE' },
  { code: '8047',   name: '投資損失',                 category: 'EXPENSE' },
  { code: '8048',   name: '出售資產損失',             category: 'EXPENSE' },
  { code: '8049',   name: '災害損失',                 category: 'EXPENSE' },
  { code: '8050',   name: '商品盤損',                 category: 'EXPENSE' },
  { code: '8051',   name: '兌換虧損',                 category: 'EXPENSE' },
  { code: '8052',   name: '其它損失',                 category: 'EXPENSE' },
  // 所得稅 (9xxx)
  { code: '9999',   name: '所得稅費用',               category: 'EXPENSE' },
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

  // 匯入重泰科目表（已存在則略過，新增不足的科目）
  app.post('/accounts/seed', auth, async (req) => {
    const result = await prisma.chartOfAccount.createMany({
      data: SEED_ACCOUNTS.map(a => ({ ...a, companyId: req.companyId })),
      skipDuplicates: true,
    })
    return { message: `已新增 ${result.count} 個科目（共 ${SEED_ACCOUNTS.length} 筆，略過重複）` }
  })

  app.post('/accounts', auth, async (req, reply) => {
    const body = z.object({
      code: z.string(),
      name: z.string(),
      category: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'COGS', 'EXPENSE']),
      parentCode: z.string().optional(),
    }).parse(req.body)
    const account = await prisma.chartOfAccount.create({ data: { ...body, companyId: req.companyId } })
    return reply.code(201).send(account)
  })

  app.patch('/accounts/:id', auth, async (req, reply) => {
    const { id } = req.params as any
    const body = z.object({
      name: z.string().optional(),
      isActive: z.boolean().optional(),
    }).parse(req.body)
    const existing = await prisma.chartOfAccount.findFirst({ where: { id, companyId: req.companyId } })
    if (!existing) return reply.code(404).send({ message: '找不到科目' })
    return prisma.chartOfAccount.update({ where: { id }, data: body })
  })
}
