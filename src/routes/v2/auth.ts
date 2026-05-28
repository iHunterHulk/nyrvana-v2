import { Elysia, t } from 'elysia';
import { db } from '../../db';
import { hashPassword, verifyPassword } from '../../lib/crypto';
import { signAccessToken, signRefreshToken } from '../../lib/jwt';
import { requireJWT } from '../../middleware/requireJWT';

// Open routes plugin (no authentication required)
export const authOpen = new Elysia({ prefix: '/api/v2/auth' })
  .post('/login', async ({ body, set }) => {
    const { email, password } = body as { email: string; password: string };

    try {
      const user = db.prepare('SELECT id, email, password_hash, role FROM users WHERE email = ?').get(email) as 
        { id: string; email: string; password_hash: string; role: string } | undefined;

      if (!user || !(await verifyPassword(password, user.password_hash))) {
        set.status = 401;
        return { error: 'Invalid credentials' };
      }

      const accessToken = signAccessToken(user.id, user.role as any);
      const { token: refreshToken, hash: refreshTokenHash } = signRefreshToken(user.id);

      // Store refresh token hash in database
      db.prepare(
        'INSERT INTO refresh_tokens (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
      ).run(refreshTokenHash, user.id, Date.now() + 30 * 24 * 60 * 60 * 1000, Date.now());

      return { accessToken, refreshToken };
    } catch (error) {
      set.status = 500;
      return { error: 'Internal server error' };
    }
  }, {
    body: t.Object({
      email: t.String(),
      password: t.String()
    })
  })
  .post('/refresh', ({ body, set }) => {
    const { refreshToken } = body as { refreshToken: string };

    try {
      const refreshTokenHash = require('crypto').createHash('sha256').update(refreshToken).digest('hex');
      
      // Look up refresh token
      const tokenRow = db.prepare(
        'SELECT user_id, expires_at FROM refresh_tokens WHERE token_hash = ? AND revoked = 0'
      ).get(refreshTokenHash) as { user_id: string; expires_at: number } | undefined;

      if (!tokenRow || tokenRow.expires_at < Date.now()) {
        set.status = 401;
        return { error: 'Invalid or expired refresh token' };
      }

      // Rotate token (revoke old, create new)
      db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?').run(refreshTokenHash);
      
      const newAccessToken = signAccessToken(tokenRow.user_id, 'user'); // Assuming default role for refresh
      const { token: newRefreshToken, hash: newRefreshTokenHash } = signRefreshToken(tokenRow.user_id);

      // Store new refresh token
      db.prepare(
        'INSERT INTO refresh_tokens (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
      ).run(newRefreshTokenHash, tokenRow.user_id, Date.now() + 30 * 24 * 60 * 60 * 1000, Date.now());

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (error) {
      set.status = 500;
      return { error: 'Internal server error' };
    }
  }, {
    body: t.Object({
      refreshToken: t.String()
    })
  });

// Protected routes plugin (requires authentication)
export const authProtected = new Elysia({ prefix: '/api/v2/auth' })
  .guard({
    beforeHandle: requireJWT
  })
  .post('/register', async ({ body, set, request }) => {
    // Check if user is admin
    const userRole = request.headers.get('x-nyrvana-role');
    if (userRole !== 'admin') {
      set.status = 403;
      return { error: 'Admin access required' };
    }

    const { email, password, role = 'user' } = body as { email: string; password: string; role?: 'user' | 'admin' };

    try {
      const passwordHash = await hashPassword(password);
      const userId = crypto.randomUUID();
      
      db.prepare(
        'INSERT INTO users (id, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(userId, email, passwordHash, role, Date.now(), Date.now());

      return { message: 'User registered successfully' };
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed')) {
        set.status = 409;
        return { error: 'Email already exists' };
      }
      set.status = 500;
      return { error: 'Internal server error' };
    }
  }, {
    body: t.Object({
      email: t.String(),
      password: t.String(),
      role: t.Optional(t.Union([t.Literal('user'), t.Literal('admin')]))
    })
  })
  .post('/logout', ({ body, set, request }) => {
    // Check if user is authenticated
    const userId = request.headers.get('x-nyrvana-user-id');
    if (!userId) {
      set.status = 401;
      return { error: 'Authentication required' };
    }

    const { refreshToken } = body as { refreshToken: string };

    try {
      const refreshTokenHash = require('crypto').createHash('sha256').update(refreshToken).digest('hex');
      
      // Revoke refresh token
      db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ? AND user_id = ?').run(
        refreshTokenHash, userId
      );

      return { message: 'Logged out successfully' };
    } catch (error) {
      set.status = 500;
      return { error: 'Internal server error' };
    }
  }, {
    body: t.Object({
      refreshToken: t.String()
    })
  });