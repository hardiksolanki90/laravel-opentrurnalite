import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { verifyPassword, signToken } from '@opentrurnalite/auth'

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const authLoginRoute: FastifyPluginAsync = async (app) => {
  app.post('/login', async (request, reply) => {
    const body = loginBody.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation failed', details: body.error.flatten() })
    }

    const { email, password } = body.data

    const user = await app.prisma.user.findUnique({ where: { email } })
    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const jwtSecret = process.env.JWT_SECRET ?? 'dev-secret-change-me-minimum-32-chars'
    const token = signToken({ sub: user.id, email: user.email }, jwtSecret)

    return reply.status(200).send({
      token,
      user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
    })
  })
}

export default authLoginRoute
