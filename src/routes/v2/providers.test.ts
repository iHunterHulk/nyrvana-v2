process.env.NYRVANA_JWT_SECRET = process.env.NYRVANA_JWT_SECRET || 'test-jwt-secret';
import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { Elysia } from 'elysia';
import { providers } from './providers';
import { providerRegistry } from '../../providers/registry-singleton';
import { AdGuardProvider } from '../../providers/adapters/adguard.provider';
import { NtfyProvider } from '../../providers/adapters/ntfy.provider';
import { MemosProvider } from '../../providers/adapters/memos.provider';
import { signAccessToken } from '../../lib/jwt';

// Create a test app
const testApp = new Elysia()
  .use(providers);

// Mock environment for testing
const TEST_USER_ID = 'test-user-123';
const TEST_SECRET = 'test-secret-key';

describe('Providers API', () => {
  beforeAll(() => {
    // Register mock providers for testing
    providerRegistry.clear();
    providerRegistry.register(new AdGuardProvider());
    providerRegistry.register(new NtfyProvider());
    providerRegistry.register(new MemosProvider());
    
    // Set test secret in env
    process.env.NYRVANA_DEV_SECRET = TEST_SECRET;
  });

  afterAll(() => {
    // Clear providers after tests
    providerRegistry.clear();
    delete process.env.NYRVANA_DEV_SECRET;
  });

  it('should list all registered providers', async () => {
    const response = await testApp.handle(
      new Request('http://localhost:3002/api/v2/providers', { headers: { 'Authorization': `Bearer ${signAccessToken(TEST_USER_ID, 'admin')}` } }));
    
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    
    const body = await response.json();
    expect(body).toEqual(['adguard', 'ntfy', 'memos']);
  });

  it('should reject unauthenticated requests', async () => {
    const response = await testApp.handle(
      new Request('http://localhost:3002/api/v2/providers/adguard/testOp', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({ test: 'data' })
      })
    );
    
    expect(response.status).toBe(401);
  });

  it('should reject requests with invalid signature', async () => {
    const response = await testApp.handle(
      new Request('http://localhost:3002/api/v2/providers/adguard/testOp', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          
          'Authorization': 'Bearer invalid.token.here'
        },
        body: JSON.stringify({ test: 'data' })
      })
    );
    
    expect(response.status).toBe(401);
  });

  it('should accept requests with valid signature', async () => {
    // Create a valid signature
    const validJWT = signAccessToken(TEST_USER_ID, 'admin');
    
    // This will still fail because the provider doesn't have the operation,
    // but it should pass authentication
    const response = await testApp.handle(
      new Request('http://localhost:3002/api/v2/providers/adguard/nonExistentOp', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          
          'Authorization': `Bearer ${validJWT}`
        },
        body: JSON.stringify({ test: 'data' })
      })
    );
    
    // Should get 500 (internal server error) or similar from the provider not existing,
    // but not 401 (unauthorized) which would indicate auth failure
    expect(response.status).not.toBe(401);
  });

  // Note: We can't easily test successful provider operations without mocking
  // the actual provider methods, which would be better done in the provider-specific tests
});