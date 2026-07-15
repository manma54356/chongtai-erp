import { prisma } from './prisma.js'

export async function createAuditLog(opts: {
  companyId: string
  userId: string
  action: string
  targetType: string
  targetId: string
  before?: Record<string, any> | null
  after?: Record<string, any> | null
  ip?: string
}) {
  try {
    await prisma.auditLog.create({ data: opts as any })
  } catch {
    // non-blocking — audit failure must not break the request
  }
}
