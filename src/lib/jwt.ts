import jwt, { Secret, JwtPayload } from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';

export type Role = 'admin' | 'user';

function getJwtSecret(): string {
  const s = process.env['NYRVANA_JWT_SECRET'];
  if (!s) throw new Error('NYRVANA_JWT_SECRET is not set');
  return s;
}

export function signAccessToken(userId: string, role: Role): string {
  return jwt.sign({ userId, role }, getJwtSecret() as Secret, { expiresIn: '15m', algorithm: 'HS256' });
}

export function signRefreshToken(_userId: string): { token: string; hash: string } {
  const token = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

export function verifyAccessToken(token: string): { userId: string; role: Role } | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret() as Secret) as JwtPayload;
    return { userId: decoded['userId'] as string, role: decoded['role'] as Role };
  } catch {
    return null;
  }
}