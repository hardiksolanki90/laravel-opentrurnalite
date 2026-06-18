import fp from 'fastify-plugin'
import { Redis as IORedis } from 'ioredis'
import type { FastifyPluginAsync } from 'fastify'
import { config } from '../config.js'

const redisPlugin: FastifyPluginAsync = fp(async (app) => {
  const redis = new IORedis(config.REDIS_URL)
  redis.on('error', (err: Error) => app.log.error({ err }, 'Redis error'))
  app.decorate('redis', redis)
  app.addHook('onClose', async () => {
    await redis.quit()
  })
})

export default redisPlugin

declare module 'fastify' {
  interface FastifyInstance {
    redis: IORedis
  }
}
