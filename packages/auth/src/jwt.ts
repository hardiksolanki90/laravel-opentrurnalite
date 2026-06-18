import jwt from 'jsonwebtoken'
import { UnauthorizedError } from '@opentrurnalite/shared'

export interface JwtPayload {
  sub: string   // user id
  email: string
}

export function signToken(payload: JwtPayload, secret: string): string {
  return jwt.sign(payload, secret, { expiresIn: '7d' })
}

export function verifyToken(token: string, secret: string): JwtPayload {
  try {
    return jwt.verify(token, secret) as JwtPayload
  } catch {
    throw new UnauthorizedError('Invalid or expired token')
  }
}
