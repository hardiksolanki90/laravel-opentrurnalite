import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import authRegisterRoute from '../src/routes/auth/register.js'

// In-memory mock prisma store
function buildTestApp(): FastifyInstance {
  const app = Fastify()
  const users: Array<{ id: string; email: string; passwordHash: string; name: string; createdAt: Date; updatedAt: Date }> = []

  // Mock prisma decorator
  app.decorate('prisma', {
    user: {
      findUnique: async ({ where }: { where: { email: string } }) => {
        return users.find(u => u.email === where.email) ?? null
      },
      create: async ({ data, select }: { data: any; select?: any }) => {
        const user = {
          id: `id_${Date.now()}`,
          email: data.email,
          passwordHash: data.passwordHash,
          name: data.name,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        users.push(user)
        if (select) {
          return Object.fromEntries(
            Object.keys(select).map((k) => [k, (user as any)[k]])
          )
        }
        return user
      },
    },
  } as any)

  return app
}

describe('POST /auth/register', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = buildTestApp()
    await app.register(authRegisterRoute, { prefix: '/auth' })
    await app.ready()
  })

  afterEach(async () => {
    await app.close()
  })

  it('creates user and returns 201 with token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'test@example.com', password: 'password123', name: 'Test User' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body).toHaveProperty('token')
    expect(body.user.email).toBe('test@example.com')
  })

  it('returns 409 if email already exists', async () => {
    const payload = { email: 'dup@example.com', password: 'password123', name: 'Dup' }
    await app.inject({ method: 'POST', url: '/auth/register', payload })
    const res = await app.inject({ method: 'POST', url: '/auth/register', payload })
    expect(res.statusCode).toBe(409)
  })
})
