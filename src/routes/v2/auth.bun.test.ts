import { describe, it, expect, beforeEach } from 'bun:test';
import { db } from '../db';
import { hashPassword } from '../lib/crypto';
import { signAccessToken, signRefreshToken } from '../lib/jwt';

describe('Auth API', () => {
  beforeEach(() => {
    // Clear test data
    db.exec('DELETE FROM refresh_tokens');
    db.exec('DELETE FROM users');
  });

  it('should register a new user (admin only)', async () => {
    // First create an admin user
    const adminPasswordHash = await hashPassword('adminpass');
    const adminId = crypto.randomUUID();
    db.prepare(
      'INSERT INTO users (id, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(adminId, 'admin@example.com', adminPasswordHash, 'admin', Date.now(), Date.now());

    // Create auth header for admin
    const adminToken = signAccessToken(adminId, 'admin');

    const response = await fetch('http://localhost:3000/api/v2/auth/register', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpass',
        role: 'user'
      })
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toBe('User registered successfully');
  });

  it('should not allow non-admin to register users', async () => {
    // Create a regular user
    const userPasswordHash = await hashPassword('userpass');
    const userId = crypto.randomUUID();
    db.prepare(
      'INSERT INTO users (id, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId, 'user@example.com', userPasswordHash, 'user', Date.now(), Date.now());

    // Create auth header for regular user
    const userToken = signAccessToken(userId, 'user');

    const response = await fetch('http://localhost:3000/api/v2/auth/register', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test2@example.com',
        password: 'testpass',
        role: 'user'
      })
    });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Admin access required');
  });

  it('should login and return tokens', async () => {
    // Create a user
    const passwordHash = await hashPassword('testpass');
    const userId = crypto.randomUUID();
    db.prepare(
      'INSERT INTO users (id, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId, 'login@example.com', passwordHash, 'user', Date.now(), Date.now());

    const response = await fetch('http://localhost:3000/api/v2/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'login@example.com',
        password: 'testpass'
      })
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.accessToken).toBeDefined();
    expect(data.refreshToken).toBeDefined();
  });

  it('should refresh tokens', async () => {
    // Create a user
    const passwordHash = await hashPassword('testpass');
    const userId = crypto.randomUUID();
    db.prepare(
      'INSERT INTO users (id, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId, 'refresh@example.com', passwordHash, 'user', Date.now(), Date.now());

    // Create refresh token
    const { token: refreshToken, hash: refreshTokenHash } = signRefreshToken(userId);
    db.prepare(
      'INSERT INTO refresh_tokens (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
    ).run(refreshTokenHash, userId, Date.now() + 30 * 24 * 60 * 60 * 1000, Date.now());

    const response = await fetch('http://localhost:3000/api/v2/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken
      })
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.accessToken).toBeDefined();
    expect(data.refreshToken).toBeDefined();
  });

  it('should logout and revoke refresh token', async () => {
    // Create a user
    const passwordHash = await hashPassword('testpass');
    const userId = crypto.randomUUID();
    db.prepare(
      'INSERT INTO users (id, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId, 'logout@example.com', passwordHash, 'user', Date.now(), Date.now());

    // Create auth token and refresh token
    const accessToken = signAccessToken(userId, 'user');
    const { token: refreshToken, hash: refreshTokenHash } = signRefreshToken(userId);
    db.prepare(
      'INSERT INTO refresh_tokens (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
    ).run(refreshTokenHash, userId, Date.now() + 30 * 24 * 60 * 60 * 1000, Date.now());

    const response = await fetch('http://localhost:3000/api/v2/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken
      })
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toBe('Logged out successfully');

    // Verify token is revoked
    const tokenRow = db.prepare(
      'SELECT revoked FROM refresh_tokens WHERE token_hash = ?'
    ).get(refreshTokenHash) as { revoked: number } | undefined;
    
    expect(tokenRow).toBeDefined();
    expect(tokenRow!.revoked).toBe(1);
  });
});