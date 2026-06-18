import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { hashPassword, signToken } from '@opentrurnalite/auth'
import { ConflictError } from '@opentrurnalite/shared'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me-minimum-32-chars'

const registerBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
})

const authRegisterRoute: FastifyPluginAsync = async (app) => {
  app.post('/register', async (request, reply) => {
    const body = registerBody.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation failed', details: body.error.flatten() })
    }

    const { email, password, name } = body.data

    const existing = await app.prisma.user.findUnique({ where: { email } })
    if (existing) {
      throw new ConflictError('Email already registered')
    }

    const passwordHash = await hashPassword(password)
    const user = await app.prisma.user.create({
      data: { email, passwordHash, name },
      select: { id: true, email: true, name: true, createdAt: true },
    })

    const token = signToken({ sub: user.id, email: user.email }, JWT_SECRET)

    return reply.status(201).send({ token, user })
  })
}

export default authRegisterRoute
