import Fastify from 'fastify'
import cors from '@fastify/cors'
import sensible from '@fastify/sensible'
import prismaPlugin from './plugins/prisma.js'
import redisPlugin from './plugins/redis.js'
import healthRoute from './routes/health.js'

export async function buildApp() {
  const app = Fastify({ logger: true })

  await app.register(cors, { origin: true })
  await app.register(sensible)
  await app.register(prismaPlugin)
  await app.register(redisPlugin)
  await app.register(healthRoute)

  return app
}
