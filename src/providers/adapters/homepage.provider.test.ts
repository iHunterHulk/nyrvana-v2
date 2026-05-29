// src/providers/adapters/homepage.provider.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { HomepageProvider } from './homepage.provider';
import { createMockUserContext, createMockFetch } from './test-helpers';

describe('HomepageProvider', () => {
  let provider: HomepageProvider;
  
  beforeEach(() => {
    provider = new HomepageProvider();
  });
  
  it('should have correct provider properties', () => {
    expect(provider.id).toBe('homepage');
    expect(provider.name).toBe('Homepage');
    expect(provider.category).toBe('other');
    expect(provider.icon).toBe('layout-grid');
    expect(provider.authMethod).toBe('api-key');
  });
  
  it('should have correct capabilities', () => {
    expect(provider.capabilities).toContain('read.other.services');
  });
  
  it('should have getServices query operation', () => {
    expect(provider.query.getServices).toBeDefined();
    expect(typeof provider.query.getServices).toBe('function');
  });
  
  it('should have widgets', () => {
    expect(provider.widgets).toHaveLength(1);
    expect(provider.widgets[0].id).toBe('homepage-services');
  });
  
  it('should pass health check when API is healthy', async () => {
    const mockFetch = createMockFetch({
      'GET:http://localhost:3003/api/health': { status: 200, body: { status: 'ok' } }
    });
    
    const ctx = createMockUserContext({ 
      fetch: mockFetch,
      credentials: {
        homepage: {
          url: 'http://localhost:3003'
        }
      }
    });
    
    const result = await provider.health(ctx);
    
    expect(result.status).toBe('healthy');
  });
  
  it('should get services successfully', async () => {
    const mockServices = [
      {
        name: 'Test Service',
        href: 'http://test.com'
      }
    ];
    
    const mockFetch = createMockFetch({
      'GET:http://localhost:3003/api/services': { status: 200, body: mockServices }
    });
    
    const ctx = createMockUserContext({ 
      fetch: mockFetch,
      credentials: {
        homepage: {
          url: 'http://localhost:3003'
        }
      }
    });
    
    const result = await provider.query.getServices({}, ctx);
    
    expect(result).toEqual(mockServices);
  });
  
  it('should use environment variable when no credentials provided', async () => {
    // Set environment variable
    process.env.NYRVANA_HOMEPAGE_URL = 'http://test-env:3003';
    
    const mockServices = [
      {
        name: 'Test Service',
        href: 'http://test.com'
      }
    ];
    
    const mockFetch = createMockFetch({
      'GET:http://test-env:3003/api/services': { status: 200, body: mockServices }
    });
    
    const ctx = createMockUserContext({ 
      fetch: mockFetch,
      credentials: {}
    });
    
    const result = await provider.query.getServices({}, ctx);
    
    expect(result).toEqual(mockServices);
    
    // Clean up environment variable
    delete process.env.NYRVANA_HOMEPAGE_URL;
  });
});