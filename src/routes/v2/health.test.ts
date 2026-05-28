import { beforeAll, afterAll, describe, it, expect, beforeEach, vi } from 'vitest';
import { Elysia } from 'elysia';
import { health } from './health';
import { providerRegistry } from '../../providers/registry-singleton';
import { AdGuardProvider } from '../../providers/adapters/adguard.provider';
import { NtfyProvider } from '../../providers/adapters/ntfy.provider';
import { MemosProvider } from '../../providers/adapters/memos.provider';
import { signAccessToken } from '../../lib/jwt';

// Mock the health methods to return specific values for testing
const mockAdGuardHealth = vi.fn();
const mockNtfyHealth = vi.fn();
const mockMemosHealth = vi.fn();

// Create a test app
const testApp = new Elysia()
  .use(health);

describe('Health API', () => {
  beforeEach(() => {
    // Reset mocks
    mockAdGuardHealth.mockReset();
    mockNtfyHealth.mockReset();
    mockMemosHealth.mockReset();
    
    // Create mock providers with mocked health methods
    const adGuardProvider = new AdGuardProvider();
    adGuardProvider.health = mockAdGuardHealth;
    
    const ntfyProvider = new NtfyProvider();
    ntfyProvider.health = mockNtfyHealth;
    
    const memosProvider = new MemosProvider();
    memosProvider.health = mockMemosHealth;
    
    // Register mock providers for testing
    providerRegistry.clear();
    providerRegistry.register(adGuardProvider);
    providerRegistry.register(ntfyProvider);
    providerRegistry.register(memosProvider);
  });

  afterAll(() => {
    // Clear providers after tests
    providerRegistry.clear();
  });

  it('should return health status with all adapters when healthy', async () => {
    // Mock health responses
    mockAdGuardHealth.mockResolvedValue({ status: 'healthy' });
    mockNtfyHealth.mockResolvedValue({ status: 'healthy' });
    mockMemosHealth.mockResolvedValue({ status: 'healthy' });
    
    // Create a valid JWT token for testing
    const token = signAccessToken('test-user-id', 'admin');
    
    const response = await testApp.handle(
      new Request('http://localhost:3002/api/v2/health', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
    );
    
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    
    const body = await response.json();
    expect(body).toHaveProperty('status', 'ok');
    expect(body).toHaveProperty('uptime');
    expect(body.uptime).toBeGreaterThan(0);
    
    expect(body).toHaveProperty('adapters');
    expect(body.adapters).toHaveProperty('adguard');
    expect(body.adapters.adguard).toEqual({ status: 'healthy' });
    expect(body.adapters).toHaveProperty('ntfy');
    expect(body.adapters.ntfy).toEqual({ status: 'healthy' });
    expect(body.adapters).toHaveProperty('memos');
    expect(body.adapters.memos).toEqual({ status: 'healthy' });
  });
  
  it('should return health status with degraded adapters', async () => {
    // Mock health responses
    mockAdGuardHealth.mockResolvedValue({ status: 'healthy' });
    mockNtfyHealth.mockResolvedValue({ status: 'degraded', message: 'High latency' });
    mockMemosHealth.mockResolvedValue({ status: 'down', message: 'Service unavailable' });
    
    // Create a valid JWT token for testing
    const token = signAccessToken('test-user-id', 'admin');
    
    const response = await testApp.handle(
      new Request('http://localhost:3002/api/v2/health', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
    );
    
    expect(response.status).toBe(200);
    
    const body = await response.json();
    expect(body).toHaveProperty('adapters');
    expect(body.adapters).toHaveProperty('adguard');
    expect(body.adapters.adguard).toEqual({ status: 'healthy' });
    expect(body.adapters).toHaveProperty('ntfy');
    expect(body.adapters.ntfy).toEqual({ status: 'degraded', message: 'High latency' });
    expect(body.adapters).toHaveProperty('memos');
    expect(body.adapters.memos).toEqual({ status: 'down', message: 'Service unavailable' });
  });
  
  it('should return 401 when no Authorization header is provided', async () => {
    const response = await testApp.handle(
      new Request('http://localhost:3002/api/v2/health')
    );
    
    expect(response.status).toBe(401);
  });
});

// Test the actual boot-time import path
describe('Health API - Boot-time import', () => {
  beforeEach(() => {
    // Clear the singleton to ensure we're testing the import
    providerRegistry.clear();
  });

  afterAll(() => {
    // Clear providers after tests
    providerRegistry.clear();
  });

  it('should register adapters at boot time', async () => {
    // Import the adapters module which should register them
    await import('../../providers/adapters/index.ts');
    
    // Mock the health methods for the real providers
    const providers = providerRegistry.list();
    for (const provider of providers) {
      vi.spyOn(provider, 'health').mockResolvedValue({ status: 'healthy' });
    }
    
    // Create a valid JWT token for testing
    const token = signAccessToken('test-user-id', 'admin');
    
    const response = await testApp.handle(
      new Request('http://localhost:3002/api/v2/health', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
    );
    
    expect(response.status).toBe(200);
    
    const body = await response.json();
    expect(body).toHaveProperty('adapters');
    expect(body.adapters).toHaveProperty('adguard');
    expect(body.adapters).toHaveProperty('ntfy');
    expect(body.adapters).toHaveProperty('memos');
  });
});