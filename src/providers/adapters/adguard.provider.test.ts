// src/providers/adapters/adguard.provider.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdGuardProvider } from './adguard.provider';
import { createMockUserContext, createMockFetch } from './test-helpers';

describe('AdGuardProvider', () => {
  let provider: AdGuardProvider;
  let mockFetch: ReturnType<typeof createMockFetch>;
  
  beforeEach(() => {
    provider = new AdGuardProvider();
    mockFetch = createMockFetch({});
  });
  
  it('should have correct properties', () => {
    expect(provider.id).toBe('adguard');
    expect(provider.name).toBe('AdGuard Home');
    expect(provider.category).toBe('monitoring');
    expect(provider.icon).toBe('shield');
    expect(provider.authMethod).toBe('api-key');
  });
  
  it('should have correct capabilities', () => {
    expect(provider.capabilities).toContain('read.monitoring.dns-queries');
    expect(provider.capabilities).toContain('read.monitoring.block-stats');
    expect(provider.capabilities).toContain('write.monitoring.blocklist');
  });
  
  it('should pass health check when API is healthy', async () => {
    const mockFetch = createMockFetch({
      'GET:http://localhost:3000/control/status': { status: 200, body: { running: true } }
    });
    
    const ctx = createMockUserContext({ fetch: mockFetch });
    
    // Set environment variables for testing
    const originalEnv = process.env;
    process.env = { ...originalEnv, NYRVANA_ADGUARD_API_KEY: 'test-key' };
    
    const result = await provider.health(ctx);
    
    expect(result.status).toBe('healthy');
    
    // Restore environment
    process.env = originalEnv;
  });
  
  it('should fail health check when API key is missing', async () => {
    const ctx = createMockUserContext();
    
    // Set environment variables for testing
    const originalEnv = process.env;
    process.env = { ...originalEnv, NYRVANA_ADGUARD_API_KEY: '' };
    
    const result = await provider.health(ctx);
    
    expect(result.status).toBe('down');
    expect(result.message).toBe('AdGuard API key not configured');
    
    // Restore environment
    process.env = originalEnv;
  });
  
  it('should get stats successfully', async () => {
    const mockStats = { num_dns_queries: 100, num_blocked_filtering: 10 };
    const mockFetch = createMockFetch({
      'GET:http://localhost:3000/control/stats': { status: 200, body: mockStats }
    });
    
    const ctx = createMockUserContext({ fetch: mockFetch });
    
    // Set environment variables for testing
    const originalEnv = process.env;
    process.env = { ...originalEnv, NYRVANA_ADGUARD_API_KEY: 'test-key' };
    
    const result = await provider.query.getStats({}, ctx);
    
    expect(result).toEqual(mockStats);
    
    // Restore environment
    process.env = originalEnv;
  });
  
  it('should add blocklist successfully', async () => {
    const mockFetch = createMockFetch({
      'POST:http://localhost:3000/control/access/set_url': { status: 200, body: { } }
    });
    
    const ctx = createMockUserContext({ fetch: mockFetch });
    
    // Set environment variables for testing
    const originalEnv = process.env;
    process.env = { ...originalEnv, NYRVANA_ADGUARD_API_KEY: 'test-key' };
    
    const result = await provider.mutation.addBlocklist({ url: 'example.com' }, ctx);
    
    expect(result).toEqual({ success: true });
    
    // Restore environment
    process.env = originalEnv;
  });
  
  it('should have correct widgets', () => {
    expect(provider.widgets).toHaveLength(2);
    expect(provider.widgets[0].id).toBe('adguard-dns-stats');
    expect(provider.widgets[1].id).toBe('adguard-block-stats');
  });
});