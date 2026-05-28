import { Elysia } from 'elysia';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { models } from './models';
import { providerRegistry } from '../../providers/registry-singleton';
import { createHmac } from 'crypto';

// Mock the provider registry
vi.mock('../../providers/registry-singleton', () => ({
  providerRegistry: {
    list: vi.fn(),
    get: vi.fn()
  }
}));

// Create a test app
const testApp = new Elysia()
  .use(models);

// Mock environment for testing
const TEST_USER_ID = 'test-user-123';
const TEST_SECRET = 'test-secret-key';

describe('GET /api/v2/models', () => {
  beforeEach(() => {
    // Set test secret in env
    process.env.NYRVANA_DEV_SECRET = TEST_SECRET;
    
    // Reset mocks before each test
    vi.resetAllMocks();
  });

  it('should return an empty array when no providers are registered', async () => {
    (providerRegistry.list as ReturnType<typeof vi.fn>).mockReturnValue([]);

    // Create a valid signature
    const validSignature = createHmac('sha256', TEST_SECRET)
      .update(TEST_USER_ID)
      .digest('hex');

    const response = await testApp.handle(
      new Request('http://localhost:3002/api/v2/models', {
        method: 'GET',
        headers: {
          'x-nyrvana-user-id': TEST_USER_ID,
          'x-nyrvana-signature': validSignature
        }
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    const data = await response.json();
    expect(data).toEqual([]);
  });

  it('should return model list from ollama provider when it has list-models capability', async () => {
    // Mock the ollama provider with list-models query operation
    const mockOllamaProvider = {
      id: 'ollama',
      query: {
        'list-models': vi.fn().mockResolvedValue(['qwen3-coder:480b-cloud', 'llama3.2'])
      }
    };

    (providerRegistry.list as ReturnType<typeof vi.fn>).mockReturnValue([mockOllamaProvider]);

    // Create a valid signature
    const validSignature = createHmac('sha256', TEST_SECRET)
      .update(TEST_USER_ID)
      .digest('hex');

    const response = await testApp.handle(
      new Request('http://localhost:3002/api/v2/models', {
        method: 'GET',
        headers: {
          'x-nyrvana-user-id': TEST_USER_ID,
          'x-nyrvana-signature': validSignature
        }
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    const data = await response.json();
    expect(data).toEqual([
      { id: 'qwen3-coder:480b-cloud', name: 'qwen3-coder:480b-cloud', provider: 'ollama' },
      { id: 'llama3.2', name: 'llama3.2', provider: 'ollama' }
    ]);

    // Verify that the list-models method was called
    expect(mockOllamaProvider.query['list-models']).toHaveBeenCalledWith({}, expect.any(Object));
  });

  it('should handle providers that throw errors during list-models call', async () => {
    // Mock a provider that throws an error
    const mockErrorProvider = {
      id: 'error-provider',
      query: {
        'list-models': vi.fn().mockRejectedValue(new Error('Failed to fetch models'))
      }
    };

    (providerRegistry.list as ReturnType<typeof vi.fn>).mockReturnValue([mockErrorProvider]);

    // Create a valid signature
    const validSignature = createHmac('sha256', TEST_SECRET)
      .update(TEST_USER_ID)
      .digest('hex');

    const response = await testApp.handle(
      new Request('http://localhost:3002/api/v2/models', {
        method: 'GET',
        headers: {
          'x-nyrvana-user-id': TEST_USER_ID,
          'x-nyrvana-signature': validSignature
        }
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    const data = await response.json();
    expect(data).toEqual([]); // Should return empty array when provider throws error
  });

  it('should handle providers without list-models query operation', async () => {
    // Mock a provider without list-models query operation
    const mockProviderWithoutListModels = {
      id: 'no-list-models-provider',
      query: {}
    };

    (providerRegistry.list as ReturnType<typeof vi.fn>).mockReturnValue([mockProviderWithoutListModels]);

    // Create a valid signature
    const validSignature = createHmac('sha256', TEST_SECRET)
      .update(TEST_USER_ID)
      .digest('hex');

    const response = await testApp.handle(
      new Request('http://localhost:3002/api/v2/models', {
        method: 'GET',
        headers: {
          'x-nyrvana-user-id': TEST_USER_ID,
          'x-nyrvana-signature': validSignature
        }
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    const data = await response.json();
    expect(data).toEqual([]); // Should return empty array when provider has no list-models operation
  });

  it('should reject unauthenticated requests', async () => {
    const response = await testApp.handle(
      new Request('http://localhost:3002/api/v2/models', {
        method: 'GET'
        // No authentication headers
      })
    );

    // Should return 401 Unauthorized when no user ID is provided
    expect(response.status).toBe(401);
  });
});