import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { hashPassword, signToken } from '@opentrurnalite/auth'
import { ConflictError } from '@opentrurnalite/shared'
import { getJwtSecret } from '../../lib/jwt-secret.js'

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
    let user
    try {
      user = await app.prisma.user.create({
        data: { email, passwordHash, name },
        select: { id: true, email: true, name: true, createdAt: true },
      })
    } catch (err: any) {
      if (err?.code === 'P2002') throw new ConflictError('Email already registered')
      throw err
    }

    const jwtSecret = getJwtSecret()
    const token = signToken({ sub: user.id, email: user.email }, jwtSecret)

    return reply.status(201).send({ token, user })
  })
}

export default authRegisterRoute
