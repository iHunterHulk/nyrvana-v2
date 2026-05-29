// src/providers/adapters/umami.provider.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UmamiProvider } from './umami.provider';
import { createMockUserContext, createMockFetch } from './test-helpers';

describe('UmamiProvider', () => {
  let provider: UmamiProvider;
  let mockFetch: ReturnType<typeof createMockFetch>;
  
  beforeEach(() => {
    provider = new UmamiProvider();
    mockFetch = createMockFetch({});
  });
  
  it('should have correct properties', () => {
    expect(provider.id).toBe('umami');
    expect(provider.name).toBe('Umami');
    expect(provider.category).toBe('analytics');
    expect(provider.icon).toBe('bar-chart');
    expect(provider.authMethod).toBe('api-key');
  });
  
  it('should have correct capabilities', () => {
    expect(provider.capabilities).toContain('read.analytics.stats');
    expect(provider.capabilities).toContain('read.analytics.pageviews');
  });
  
  it('should pass health check when API is healthy', async () => {
    const mockFetch = createMockFetch({
      'POST:http://localhost:3000/api/auth/login': { status: 200, body: { token: 'test-token' } },
      'GET:http://localhost:3000/api/websites': { status: 200, body: [{ id: '1', name: 'Test Website' }] }
    });
    
    const ctx = createMockUserContext({ 
      fetch: mockFetch,
      credentials: {
        umami: {
          url: 'http://localhost:3000',
          username: 'admin',
          password: 'secret'
        }
      }
    });
    
    const result = await provider.health(ctx);
    
    expect(result.status).toBe('healthy');
  });
  
  it('should fail health check when credentials are missing', async () => {
    const ctx = createMockUserContext({
      credentials: {}
    });
    
    const result = await provider.health(ctx);
    
    expect(result.status).toBe('down');
    expect(result.message).toBe('credentials not configured for this user');
  });
  
  it('should get stats successfully', async () => {
    const mockStats = { 
      pageviews: { value: 100, change: 5 },
      visitors: { value: 80, change: 3 },
      visits: { value: 90, change: 4 }
    };
    
    const mockFetch = createMockFetch({
      'POST:http://localhost:3000/api/auth/login': { status: 200, body: { token: 'test-token' } },
      'GET:http://localhost:3000/api/websites/1/stats?websiteId=1': { status: 200, body: mockStats }
    });
    
    const ctx = createMockUserContext({ 
      fetch: mockFetch,
      credentials: {
        umami: {
          url: 'http://localhost:3000',
          username: 'admin',
          password: 'secret'
        }
      }
    });
    
    const result = await provider.query.getStats({ websiteId: '1' }, ctx);
    
    expect(result).toEqual(mockStats);
  });
  
  it('should get page views successfully', async () => {
    const mockPageViews = {
      pageviews: [
        { x: '2023-01-01', y: 100 },
        { x: '2023-01-02', y: 120 }
      ]
    };
    
    const mockFetch = createMockFetch({
      'POST:http://localhost:3000/api/auth/login': { status: 200, body: { token: 'test-token' } },
      'GET:http://localhost:3000/api/websites/1/pageviews?websiteId=1&unit=day&timezone=UTC': { status: 200, body: mockPageViews }
    });
    
    const ctx = createMockUserContext({ 
      fetch: mockFetch,
      credentials: {
        umami: {
          url: 'http://localhost:3000',
          username: 'admin',
          password: 'secret'
        }
      }
    });
    
    const result = await provider.query.getPageViews({ websiteId: '1' }, ctx);
    
    expect(result).toEqual(mockPageViews);
  });
  
  it('should have correct widgets', () => {
    expect(provider.widgets).toHaveLength(2);
    expect(provider.widgets[0].id).toBe('umami-stats');
    expect(provider.widgets[1].id).toBe('umami-pageviews');
  });
});