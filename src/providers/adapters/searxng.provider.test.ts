// src/providers/adapters/searxng.provider.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearXNGProvider } from './searxng.provider';
import { createMockUserContext, createMockFetch } from './test-helpers';

describe('SearXNGProvider', () => {
  let provider: SearXNGProvider;
  let mockFetch: ReturnType<typeof createMockFetch>;
  
  beforeEach(() => {
    provider = new SearXNGProvider();
    mockFetch = createMockFetch({});
  });
  
  it('should have correct properties', () => {
    expect(provider.id).toBe('searxng');
    expect(provider.name).toBe('SearXNG');
    expect(provider.category).toBe('other');
    expect(provider.icon).toBe('search');
    expect(provider.authMethod).toBe('api-key');
  });
  
  it('should have correct capabilities', () => {
    expect(provider.capabilities).toContain('search.web');
    expect(provider.capabilities).toContain('search.autocomplete');
  });
  
  it('should pass health check when API is healthy', async () => {
    const mockFetch = createMockFetch({
      'GET:http://localhost:8080/stats': { status: 200, body: { version: '2024.5.0' } }
    });
    
    const ctx = createMockUserContext({ 
      fetch: mockFetch,
      credentials: {
        searxng: {
          url: 'http://localhost:8080'
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
  
  it('should search successfully', async () => {
    const mockResults = { 
      query: 'test', 
      results: [
        { title: 'Test Result 1', url: 'https://example.com/1' },
        { title: 'Test Result 2', url: 'https://example.com/2' }
      ] 
    };
    const mockFetch = createMockFetch({
      'GET:http://localhost:8080/search?q=test&format=json': { status: 200, body: mockResults }
    });
    
    const ctx = createMockUserContext({ 
      fetch: mockFetch,
      credentials: {
        searxng: {
          url: 'http://localhost:8080'
        }
      }
    });
    
    const result = await provider.query.search({ query: 'test' }, ctx);
    
    expect(result).toEqual(mockResults);
  });
  
  it('should get autocomplete suggestions successfully', async () => {
    const mockSuggestions = ['test', 'testing', 'tester'];
    const mockFetch = createMockFetch({
      'GET:http://localhost:8080/autocompleter?q=test': { status: 200, body: mockSuggestions }
    });
    
    const ctx = createMockUserContext({ 
      fetch: mockFetch,
      credentials: {
        searxng: {
          url: 'http://localhost:8080'
        }
      }
    });
    
    const result = await provider.query.autocomplete({ query: 'test' }, ctx);
    
    expect(result).toEqual(mockSuggestions);
  });
  
  it('should have correct widgets', () => {
    expect(provider.widgets).toHaveLength(1);
    expect(provider.widgets[0].id).toBe('searxng-search');
  });
});