import { beforeAll, afterAll, describe, it, expect, beforeEach, vi } from 'vitest';
import { Elysia } from 'elysia';
import { health } from './health';
import { providerRegistry } from '../../providers/registry-singleton';
import { AdGuardProvider } from '../../providers/adapters/adguard.provider';
import { NtfyProvider } from '../../providers/adapters/ntfy.provider';
import { MemosProvider } from '../../providers/adapters/memos.provider';

// Create a test app
const testApp = new Elysia()
  .use(health);

describe('Health API', () => {
  beforeEach(() => {
    // Register mock providers for testing
    providerRegistry.clear();
    providerRegistry.register(new AdGuardProvider());
    providerRegistry.register(new NtfyProvider());
    providerRegistry.register(new MemosProvider());
  });

  afterAll(() => {
    // Clear providers after tests
    providerRegistry.clear();
  });

  it('should return health status with all adapters', async () => {
    const response = await testApp.handle(
      new Request('http://localhost:3002/api/v2/health')
    );
    
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    
    const body = await response.json();
    expect(body).toHaveProperty('status', 'ok');
    expect(body).toHaveProperty('uptime');
    expect(body.uptime).toBeGreaterThan(0);
    
    expect(body).toHaveProperty('adapters');
    expect(body.adapters).toHaveProperty('adguard', true);
    expect(body.adapters).toHaveProperty('ntfy', true);
    expect(body.adapters).toHaveProperty('memos', true);
  });
});