import fp from 'fastify-plugin'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import type { FastifyPluginAsync } from 'fastify'
import { config } from '../config.js'

const prismaPlugin: FastifyPluginAsync = fp(async (app) => {
  const pool = new Pool({ connectionString: config.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })
  await prisma.$connect()
  app.decorate('prisma', prisma)
  app.addHook('onClose', async () => {
    await prisma.$disconnect()
    await pool.end()
  })
})

export default prismaPlugin

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}
