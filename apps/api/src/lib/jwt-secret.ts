export function getJwtSecret(): string {
  return process.env.JWT_SECRET ?? 'dev-secret-change-me-minimum-32-chars'
}
