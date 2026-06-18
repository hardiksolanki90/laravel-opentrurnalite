import { describe, it, expect } from 'vitest'
import Fastify from 'fastify'
import healthRoute from '../src/routes/health.js'

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const app = Fastify()
    await app.register(healthRoute)
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: 'ok' })
    await app.close()
  })
})
