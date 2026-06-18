import fp from 'fastify-plugin'
import { Redis } from 'ioredis'
import type { FastifyPluginAsync } from 'fastify'
import { config } from '../config.js'

const redisPlugin: FastifyPluginAsync = fp(async (app) => {
  const redis = new Redis(config.REDIS_URL)
  app.decorate('redis', redis)
  app.addHook('onClose', async () => {
    redis.disconnect()
  })
})

export default redisPlugin

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis
  }
}
