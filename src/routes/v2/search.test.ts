process.env.NYRVANA_JWT_SECRET = process.env.NYRVANA_JWT_SECRET || 'test-jwt-secret';
import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import { Elysia } from 'elysia';
import { search } from './search';
import { providerRegistry } from '../../providers/registry-singleton';
import { signAccessToken } from '../../lib/jwt';

// Create a test app
const testApp = new Elysia().use(search);

// Mock environment for testing
const TEST_USER_ID = 'test-user-123';
const TEST_SECRET = 'test-secret-key';

describe('Search API', () => {
  beforeAll(() => {
    // Set test secret in env
    process.env.NYRVANA_DEV_SECRET = TEST_SECRET;
    process.env.NYRVANA_LLM_MODEL = 'llama3';
  });

  afterAll(() => {
    delete process.env.NYRVANA_DEV_SECRET;
    delete process.env.NYRVANA_LLM_MODEL;
  });

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  it('should return no-route when Ollama provider is not available', async () => {
    // Mock the registry to return no ollama provider
    vi.spyOn(providerRegistry, 'get').mockImplementation((id: string) => {
      if (id === 'ollama') return undefined;
      return undefined;
    });

    // Create a valid signature
    const validJWT = signAccessToken(TEST_USER_ID, 'admin');

    const response = await testApp.handle(
      new Request('http://localhost/api/v2/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          
          'Authorization': `Bearer ${validJWT}`
        },
        body: JSON.stringify({ query: 'test query' })
      })
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: 'Ollama provider not available or does not support chat' });
  });

  it('should return no-route when LLM decides no route is needed', async () => {
    // Mock the ollama provider
    const mockOllamaProvider: any = {
      mutation: {
        chat: vi.fn().mockResolvedValue({
          message: {
            content: JSON.stringify({ result: 'no-route' })
          }
        })
      }
    };

    // Mock the registry to return the ollama provider
    vi.spyOn(providerRegistry, 'get').mockImplementation((id: string) => {
      if (id === 'ollama') return mockOllamaProvider;
      return undefined;
    });

    // Mock the registry list to return some providers
    vi.spyOn(providerRegistry, 'list').mockReturnValue([
      {
        id: 'adguard',
        query: {
          getStats: vi.fn()
        }
      }
    ] as any);

    // Create a valid signature
    const validJWT = signAccessToken(TEST_USER_ID, 'admin');

    const response = await testApp.handle(
      new Request('http://localhost/api/v2/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          
          'Authorization': `Bearer ${validJWT}`
        },
        body: JSON.stringify({ query: 'test query' })
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ results: [], reason: 'no-route' });
  });

  it('should return results when LLM routes to a provider', async () => {
    // Mock data for the provider operation
    const mockResults = [{ id: 1, name: 'test' }];

    // Mock the ollama provider
    const mockOllamaProvider: any = {
      mutation: {
        chat: vi.fn().mockResolvedValue({
          message: {
            content: JSON.stringify({
              adapter: 'adguard',
              op: 'getStats',
              args: {}
            })
          }
        })
      }
    };

    // Mock the target provider
    const mockAdguardProvider: any = {
      query: {
        getStats: vi.fn().mockResolvedValue(mockResults)
      }
    };

    // Mock the registry to return providers
    vi.spyOn(providerRegistry, 'get').mockImplementation((id: string) => {
      if (id === 'ollama') return mockOllamaProvider;
      if (id === 'adguard') return mockAdguardProvider;
      return undefined;
    });

    // Mock the registry list to return some providers
    vi.spyOn(providerRegistry, 'list').mockReturnValue([
      {
        id: 'adguard',
        query: {
          getStats: vi.fn()
        }
      }
    ] as any);

    // Create a valid signature
    const validJWT = signAccessToken(TEST_USER_ID, 'admin');

    const response = await testApp.handle(
      new Request('http://localhost/api/v2/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          
          'Authorization': `Bearer ${validJWT}`
        },
        body: JSON.stringify({ query: 'test query' })
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      results: mockResults,
      adapter: 'adguard',
      op: 'getStats'
    });
  });

  it('should handle errors from the LLM', async () => {
    // Mock the ollama provider to throw an error
    const mockOllamaProvider: any = {
      mutation: {
        chat: vi.fn().mockRejectedValue(new Error('LLM error'))
      }
    };

    // Mock the registry to return the ollama provider
    vi.spyOn(providerRegistry, 'get').mockImplementation((id: string) => {
      if (id === 'ollama') return mockOllamaProvider;
      return undefined;
    });

    // Mock the registry list to return some providers
    vi.spyOn(providerRegistry, 'list').mockReturnValue([
      {
        id: 'adguard',
        query: {
          getStats: vi.fn()
        }
      }
    ] as any);

    // Create a valid signature
    const validJWT = signAccessToken(TEST_USER_ID, 'admin');

    const response = await testApp.handle(
      new Request('http://localhost/api/v2/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          
          'Authorization': `Bearer ${validJWT}`
        },
        body: JSON.stringify({ query: 'test query' })
      })
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: 'LLM error' });
  });
});