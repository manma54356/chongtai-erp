import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import { prisma } from '../lib/prisma.js'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
  interface FastifyRequest {
    userId: string
    companyId: string
    role: string
  }
}

export default fp(async (app: FastifyInstance) => {
  app.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const payload = await req.jwtVerify<{ userId: string; companyId: string; role: string }>()
      req.userId = payload.userId
      req.companyId = payload.companyId
      req.role = payload.role
    } catch {
      reply.code(401).send({ message: '請先登入' })
    }
  })
})
