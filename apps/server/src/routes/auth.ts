import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { verifyPassword, hashPassword } from '../lib/password.js'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  companyId: z.string().optional(),
})

const setupSchema = z.object({
  companyName: z.string().min(1),
  adminName: z.string().min(1),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
})

export default async function authRoutes(app: FastifyInstance) {
  // ── 初始化（第一次建公司+管理員）────────────────────────
  app.post('/auth/setup', async (req, reply) => {
    const count = await prisma.company.count()
    if (count > 0) {
      return reply.code(403).send({ message: '系統已初始化，請直接登入' })
    }

    const body = setupSchema.parse(req.body)

    const company = await prisma.company.create({
      data: { name: body.companyName },
    })

    const user = await prisma.user.create({
      data: {
        name: body.adminName,
        email: body.adminEmail,
        passwordHash: await hashPassword(body.adminPassword),
        companies: {
          create: { companyId: company.id, role: 'OWNER' },
        },
      },
    })

    const token = app.jwt.sign(
      { userId: user.id, companyId: company.id, role: 'OWNER' },
      { expiresIn: '8h' }
    )

    return { token, user: { id: user.id, name: user.name, email: user.email }, company }
  })

  // ── 登入 ─────────────────────────────────────────────
  app.post('/auth/login', async (req, reply) => {
    const { email, password, companyId } = loginSchema.parse(req.body)

    const user = await prisma.user.findUnique({
      where: { email },
      include: { companies: { include: { company: true } } },
    })

    if (!user || !user.isActive) {
      return reply.code(401).send({ message: '帳號或密碼錯誤' })
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      return reply.code(401).send({ message: '帳號或密碼錯誤' })
    }

    // 選擇公司（若只有一間直接用那間）
    const memberships = user.companies
    if (memberships.length === 0) {
      return reply.code(403).send({ message: '此帳號沒有綁定任何公司' })
    }

    let membership = memberships[0]
    if (companyId) {
      membership = memberships.find((m) => m.companyId === companyId) ?? membership
    }

    const token = app.jwt.sign(
      { userId: user.id, companyId: membership.companyId, role: membership.role },
      { expiresIn: '8h' }
    )

    const refreshToken = app.jwt.sign(
      { userId: user.id, companyId: membership.companyId, role: membership.role, type: 'refresh' },
      { expiresIn: '30d' }
    )

    return {
      token,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email },
      company: membership.company,
      role: membership.role,
      features: membership.features ?? [],
    }
  })

  // ── 取得目前使用者 ────────────────────────────────────
  app.get('/auth/me', { preHandler: [app.authenticate] }, async (req) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, phone: true },
    })
    const membership = await prisma.userCompanyRole.findUnique({
      where: { userId_companyId: { userId: req.userId, companyId: req.companyId } },
      select: { features: true },
    })
    const company = await prisma.company.findUnique({
      where: { id: req.companyId },
      select: { id: true, name: true },
    })
    return { user, company, companyId: req.companyId, role: req.role, features: membership?.features ?? [] }
  })

  // ── 修改密碼 ──────────────────────────────────────────
  app.put('/auth/password', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string }
    if (!newPassword || newPassword.length < 8) {
      return reply.code(400).send({ message: '新密碼至少需要 8 個字元' })
    }
    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    if (!user) return reply.code(404).send({ message: '找不到使用者' })
    const valid = await verifyPassword(currentPassword, user.passwordHash)
    if (!valid) return reply.code(400).send({ message: '目前密碼錯誤' })
    await prisma.user.update({
      where: { id: req.userId },
      data: { passwordHash: await hashPassword(newPassword) },
    })
    return { message: '密碼已更新' }
  })

  // ── 修改個人資料（名稱 / Email）──────────────────────
  app.put('/auth/profile', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { name, email } = req.body as { name?: string; email?: string }
    if (email) {
      const exists = await prisma.user.findFirst({ where: { email, NOT: { id: req.userId } } })
      if (exists) return reply.code(400).send({ message: '此 Email 已被使用' })
    }
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { ...(name ? { name } : {}), ...(email ? { email } : {}) },
      select: { id: true, name: true, email: true },
    })
    return user
  })

  // ── Refresh token ─────────────────────────────────────
  app.post('/auth/refresh', async (req, reply) => {
    try {
      const payload = app.jwt.verify<{
        userId: string; companyId: string; role: string; type?: string
      }>(
        (req.body as { refreshToken: string }).refreshToken
      )
      if (payload.type !== 'refresh') throw new Error()

      const token = app.jwt.sign(
        { userId: payload.userId, companyId: payload.companyId, role: payload.role },
        { expiresIn: '8h' }
      )
      return { token }
    } catch {
      return reply.code(401).send({ message: 'Refresh token 無效' })
    }
  })
}
