import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'

export default async function dashboardRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  app.get('/dashboard/stats', auth, async (req) => {
    const cid = req.companyId
    const today = new Date()
    const thirtyDaysLater = new Date(today); thirtyDaysLater.setDate(today.getDate() + 30)

    const [
      totalProjects, totalCustomers, totalContracts,
      overdueSchedules, upcomingSchedules,
      contractsByStatus, pendingAP,
    ] = await Promise.all([
      prisma.project.count({ where: { companyId: cid, status: { not: 'COMPLETED' } } }),
      prisma.customer.count({ where: { companyId: cid } }),
      prisma.contract.count({ where: { companyId: cid, status: { not: 'CLOSED' } } }),
      // 逾期未收款
      prisma.paymentSchedule.findMany({
        where: {
          contract: { companyId: cid },
          paymentDeadline: { lt: today },
          receivedAmount: { equals: 0 },
        },
        include: { contract: { include: { customer: { select: { name: true } } } } },
        take: 10,
      }),
      // 30 天內到期
      prisma.paymentSchedule.findMany({
        where: {
          contract: { companyId: cid },
          dueDate: { gte: today, lte: thirtyDaysLater },
          receivedAmount: { equals: 0 },
        },
        include: { contract: { include: { customer: { select: { name: true } } } } },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
      // 合約狀態分佈
      prisma.contract.groupBy({
        by: ['status'],
        where: { companyId: cid },
        _count: true,
      }),
      // 未付應付帳款
      prisma.accountPayable.aggregate({
        where: { companyId: cid, status: { in: ['PENDING', 'APPROVED'] } },
        _sum: { amount: true },
        _count: true,
      }),
    ])

    return {
      totalProjects, totalCustomers, totalContracts,
      overdueSchedules, upcomingSchedules,
      contractsByStatus,
      pendingAP: { count: pendingAP._count, total: pendingAP._sum.amount },
    }
  })
}
