// src/providers/adapters/sablier.provider.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SablierProvider } from './sablier.provider';
import { createMockUserContext, createMockFetch } from './test-helpers';

describe('SablierProvider', () => {
  let provider: SablierProvider;
  let mockFetch: ReturnType<typeof createMockFetch>;
  
  beforeEach(() => {
    provider = new SablierProvider();
    mockFetch = createMockFetch({});
  });
  
  it('should have correct properties', () => {
    expect(provider.id).toBe('sablier');
    expect(provider.name).toBe('Sablier');
    expect(provider.category).toBe('other');
    expect(provider.icon).toBe('timer');
    expect(provider.authMethod).toBe('api-key');
  });
  
  it('should have correct capabilities', () => {
    expect(provider.capabilities).toContain('read.services.session');
    expect(provider.capabilities).toContain('execute.services.wake');
  });
  
  it('should pass health check when API is healthy', async () => {
    const mockFetch = createMockFetch({
      'GET:http://localhost:10000/api/health': { status: 200, body: { status: 'ok' } }
    });
    
    const ctx = createMockUserContext({ 
      fetch: mockFetch,
      credentials: {
        sablier: {
          url: 'http://localhost:10000',
          token: 'test-token'
        }
      }
    });
    
    const result = await provider.health(ctx);
    
    expect(result.status).toBe('healthy');
  });
  
  it('should fail health check when token is missing', async () => {
    const ctx = createMockUserContext({
      credentials: {}
    });
    
    const result = await provider.health(ctx);
    
    expect(result.status).toBe('down');
    expect(result.message).toBe('credentials not configured for this user');
  });
  
  it('should get session successfully', async () => {
    const mockSession = { service: 'test-service', status: 'running', uptime: '10m' };
    const mockFetch = createMockFetch({
      'GET:http://localhost:10000/api/session/test-service': { status: 200, body: mockSession }
    });
    
    const ctx = createMockUserContext({ 
      fetch: mockFetch,
      credentials: {
        sablier: {
          url: 'http://localhost:10000',
          token: 'test-token'
        }
      }
    });
    
    const result = await provider.query.getSession({ service: 'test-service' }, ctx);
    
    expect(result).toEqual(mockSession);
  });
  
  it('should wake service successfully', async () => {
    const mockFetch = createMockFetch({
      'POST:http://localhost:10000/api/services/test-service/wake': { status: 200, body: { } }
    });
    
    const ctx = createMockUserContext({ 
      fetch: mockFetch,
      credentials: {
        sablier: {
          url: 'http://localhost:10000',
          token: 'test-token'
        }
      }
    });
    
    const result = await provider.mutation.wakeService({ service: 'test-service' }, ctx);
    
    expect(result).toEqual({ success: true });
  });
  
  it('should have correct widgets', () => {
    expect(provider.widgets).toHaveLength(1);
    expect(provider.widgets[0].id).toBe('sablier-services');
  });
});