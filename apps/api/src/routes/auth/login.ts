import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { verifyPassword, signToken } from '@opentrurnalite/auth'
import { getJwtSecret } from '../../lib/jwt-secret.js'

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// Pre-computed hash of a dummy password — ensures bcrypt always runs to prevent timing attacks
const DUMMY_HASH = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewVyNkMEAa4WQe4K'

const authLoginRoute: FastifyPluginAsync = async (app) => {
  app.post('/login', async (request, reply) => {
    const body = loginBody.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation failed', details: body.error.flatten() })
    }

    const { email, password } = body.data

    const user = await app.prisma.user.findUnique({ where: { email } })

    // Always run bcrypt to prevent timing-based user enumeration
    const hashToCompare = user?.passwordHash ?? DUMMY_HASH
    const valid = await verifyPassword(password, hashToCompare)

    if (!user || !valid) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const jwtSecret = getJwtSecret()
    const token = signToken({ sub: user.id, email: user.email }, jwtSecret)

    return reply.status(200).send({
      token,
      user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
    })
  })
}

export default authLoginRoute
