// src/providers/adapters/ollama.provider.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OllamaProvider } from './ollama.provider';
import { UserContext, HealthStatus } from '../types';

// Mock environment variables
const originalEnv = process.env;

describe('OllamaProvider', () => {
  let provider: OllamaProvider;
  let mockFetch: any;
  let mockLogger: any;
  let mockAudit: any;
  let mockContext: UserContext;

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
    
    // Set required environment variables
    process.env.OLLAMA_API_BASE = 'http://localhost:11434';
    process.env.OLLAMA_API_KEY='test-key';
    process.env.NYRVANA_LLM_MODEL = 'llama3';

    provider = new OllamaProvider();

    // Mock context
    mockFetch = vi.fn();
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };
    mockAudit = vi.fn();
    
    mockContext = {
      userId: 'test-user',
      wrappedDEK: 'test-dek',
      oidcToken: 'test-token',
      fetch: mockFetch as unknown as typeof fetch,
      logger: mockLogger,
      audit: mockAudit,
    };
  });

  afterEach(() => {
    // Restore environment variables
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('health', () => {
    it('should return healthy status when API is reachable', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
      } as Response);

      // Remove environment variables to test credentials path
      delete process.env.OLLAMA_API_BASE;
      delete process.env.OLLAMA_API_KEY;
      delete process.env.NYRVANA_LLM_MODEL;

      // Set up mock context with credentials
      mockContext.credentials = {
        ollama: {
          baseUrl: 'http://localhost:11434',
          apiKey: 'test-key'
        }
      };

      const result: HealthStatus = await provider.health(mockContext);
      
      expect(result.status).toBe('healthy');
      expect(result.latencyMs).toBeDefined();
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-key'
          },
        }
      );
    });

    it('should return degraded status when API returns error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      // Remove environment variables to test credentials path
      delete process.env.OLLAMA_API_BASE;
      delete process.env.OLLAMA_API_KEY;
      delete process.env.NYRVANA_LLM_MODEL;

      // Set up mock context with credentials
      mockContext.credentials = {
        ollama: {
          baseUrl: 'http://localhost:11434',
          apiKey: 'test-key'
        }
      };

      const result: HealthStatus = await provider.health(mockContext);
      
      expect(result.status).toBe('degraded');
      expect(result.latencyMs).toBeDefined();
      expect(result.message).toContain('HTTP 500');
    });

    it('should return down status when API is unreachable', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Remove environment variables to test credentials path
      delete process.env.OLLAMA_API_BASE;
      delete process.env.OLLAMA_API_KEY;
      delete process.env.NYRVANA_LLM_MODEL;

      // Set up mock context with credentials
      mockContext.credentials = {
        ollama: {
          baseUrl: 'http://localhost:11434',
          apiKey: 'test-key'
        }
      };

      const result: HealthStatus = await provider.health(mockContext);
      
      expect(result.status).toBe('down');
      expect(result.latencyMs).toBeDefined();
      expect(result.message).toBe('Network error');
    });

    it('should return down status when baseUrl is not configured', async () => {
      // Remove environment variables to test credentials path
      delete process.env.OLLAMA_API_BASE;
      delete process.env.OLLAMA_API_KEY;
      delete process.env.NYRVANA_LLM_MODEL;

      // Set up mock context with empty credentials
      mockContext.credentials = {
        ollama: {}
      };

      const result: HealthStatus = await provider.health(mockContext);
      
      expect(result.status).toBe('down');
      expect(result.message).toBe('credentials not configured for this user');
    });
  });

  describe('query.list-models', () => {
    it('should return list of models', async () => {
      const mockResponse = {
        models: [
          { name: 'llama3', modified_at: '2023-01-01T00:00:00Z', size: 1000 },
          { name: 'mistral', modified_at: '2023-01-02T00:00:00Z', size: 2000 }
        ]
      };
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      // Remove environment variables to test credentials path
      delete process.env.OLLAMA_API_BASE;
      delete process.env.OLLAMA_API_KEY;
      delete process.env.NYRVANA_LLM_MODEL;

      // Set up mock context with credentials
      mockContext.credentials = {
        ollama: {
          baseUrl: 'http://localhost:11434',
          apiKey: 'test-key'
        }
      };

      const result = await provider.query['list-models']({}, mockContext);
      
      expect(result).toEqual(['llama3', 'mistral']);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-key'
          },
        }
      );
    });

    it('should throw error when API call fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response);

      // Remove environment variables to test credentials path
      delete process.env.OLLAMA_API_BASE;
      delete process.env.OLLAMA_API_KEY;
      delete process.env.NYRVANA_LLM_MODEL;

      // Set up mock context with credentials
      mockContext.credentials = {
        ollama: {
          baseUrl: 'http://localhost:11434',
          apiKey: 'test-key'
        }
      };

      await expect(provider.query['list-models']({}, mockContext)).rejects.toThrow('HTTP 401: Unauthorized');
    });

    it('should throw error when baseUrl is not configured', async () => {
      // Remove environment variables to test credentials path
      delete process.env.OLLAMA_API_BASE;
      delete process.env.OLLAMA_API_KEY;
      delete process.env.NYRVANA_LLM_MODEL;

      // Set up mock context with empty credentials
      mockContext.credentials = {
        ollama: {}
      };

      await expect(provider.query['list-models']({}, mockContext)).rejects.toThrow('credentials not configured for this user');
    });
  });

  describe('mutation.chat', () => {
    it('should return chat response', async () => {
      const mockResponse = {
        model: 'llama3',
        created_at: '2023-01-01T00:00:00Z',
        message: { role: 'assistant', content: 'Hello, how can I help you?' },
        done: true
      };
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      // Remove environment variables to test credentials path
      delete process.env.OLLAMA_API_BASE;
      delete process.env.OLLAMA_API_KEY;
      delete process.env.NYRVANA_LLM_MODEL;

      // Set up mock context with credentials
      mockContext.credentials = {
        ollama: {
          baseUrl: 'http://localhost:11434',
          apiKey: 'test-key',
          defaultModel: 'llama3'
        }
      };

      const params = {
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      };

      const result = await provider.mutation.chat(params, mockContext);
      
      expect(result).toEqual({ content: 'Hello, how can I help you?' });
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-key'
          },
          body: JSON.stringify({
            model: 'llama3',
            messages: params.messages,
            stream: false
          })
        }
      );
    });

    it('should use provided model instead of default', async () => {
      const mockResponse = {
        model: 'mistral',
        created_at: '2023-01-01T00:00:00Z',
        message: { role: 'assistant', content: 'Hello from Mistral!' },
        done: true
      };
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      // Remove environment variables to test credentials path
      delete process.env.OLLAMA_API_BASE;
      delete process.env.OLLAMA_API_KEY;
      delete process.env.NYRVANA_LLM_MODEL;

      // Set up mock context with credentials
      mockContext.credentials = {
        ollama: {
          baseUrl: 'http://localhost:11434',
          apiKey: 'test-key',
          defaultModel: 'llama3'
        }
      };

      const params = {
        model: 'mistral',
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      };

      await provider.mutation.chat(params, mockContext);
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-key'
          },
          body: JSON.stringify({
            model: 'mistral',
            messages: params.messages,
            stream: false
          })
        }
      );
    });

    it('should throw error when API call fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      } as Response);

      // Remove environment variables to test credentials path
      delete process.env.OLLAMA_API_BASE;
      delete process.env.OLLAMA_API_KEY;
      delete process.env.NYRVANA_LLM_MODEL;

      // Set up mock context with credentials
      mockContext.credentials = {
        ollama: {
          baseUrl: 'http://localhost:11434',
          apiKey: 'test-key',
          defaultModel: 'llama3'
        }
      };

      const params = {
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      };

      await expect(provider.mutation.chat(params, mockContext)).rejects.toThrow('HTTP 400: Bad Request');
    });

    it('should throw error when baseUrl is not configured', async () => {
      // Remove environment variables to test credentials path
      delete process.env.OLLAMA_API_BASE;
      delete process.env.OLLAMA_API_KEY;
      delete process.env.NYRVANA_LLM_MODEL;

      // Set up mock context with empty credentials
      mockContext.credentials = {
        ollama: {}
      };

      const params = {
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      };

      await expect(provider.mutation.chat(params, mockContext)).rejects.toThrow('credentials not configured for this user');
    });
  });

  describe('subscribe.chat', () => {
    it('should stream chat responses', async () => {
      // Create a mock ReadableStream with test data
      const encoder = new TextEncoder();
      const mockStreamChunks = [
        '{"model":"llama3","created_at":"2023-01-01T00:00:00Z","message":{"role":"assistant","content":"Hello"},"done":false}\n',
        '{"model":"llama3","created_at":"2023-01-01T00:00:01Z","message":{"role":"assistant","content":" world!"},"done":true}\n'
      ];
      
      let chunkIndex = 0;
      const mockReader = {
        read: vi.fn().mockImplementation(() => {
          if (chunkIndex < mockStreamChunks.length) {
            return Promise.resolve({
              done: false,
              value: encoder.encode(mockStreamChunks[chunkIndex++])
            });
          } else {
            return Promise.resolve({ done: true, value: undefined });
          }
        }),
        releaseLock: vi.fn()
      };
      
      const mockBody = {
        getReader: () => mockReader
      };
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: mockBody
      } as any);

      // Remove environment variables to test credentials path
      delete process.env.OLLAMA_API_BASE;
      delete process.env.OLLAMA_API_KEY;
      delete process.env.NYRVANA_LLM_MODEL;

      // Set up mock context with credentials
      mockContext.credentials = {
        ollama: {
          baseUrl: 'http://localhost:11434',
          apiKey: 'test-key',
          defaultModel: 'llama3'
        }
      };

      const params = {
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      };

      const results = [];
      for await (const chunk of provider.subscribe('chat', params, mockContext)) {
        results.push(chunk);
      }
      
      expect(results).toEqual([
        { content: 'Hello' },
        { content: ' world!' }
      ]);
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-key'
          },
          body: JSON.stringify({
            model: 'llama3',
            messages: params.messages,
            stream: true
          })
        }
      );
    });

    it('should throw error for unsupported operation', async () => {
      const params = {
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      };

      // Wrap the async iterable in a promise to catch the error
      const promise = (async () => {
        // Try to consume the async iterable, which should throw
        for await (const _ of provider.subscribe('unsupported-op', params, mockContext)) {
          // This should not be reached
        }
      })();

      await expect(promise).rejects.toThrow('Unsupported operation: unsupported-op');
    });

    it('should throw error when API call fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response);

      // Remove environment variables to test credentials path
      delete process.env.OLLAMA_API_BASE;
      delete process.env.OLLAMA_API_KEY;
      delete process.env.NYRVANA_LLM_MODEL;

      // Set up mock context with credentials
      mockContext.credentials = {
        ollama: {
          baseUrl: 'http://localhost:11434',
          apiKey: 'test-key',
          defaultModel: 'llama3'
        }
      };

      const params = {
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      };

      // Wrap the async iterable in a promise to catch the error
      const promise = (async () => {
        // Try to consume the async iterable, which should throw
        for await (const _ of provider.subscribe('chat', params, mockContext)) {
          // This should not be reached
        }
      })();

      await expect(promise).rejects.toThrow('HTTP 401: Unauthorized');
    });

    it('should throw error when baseUrl is not configured', async () => {
      // Remove environment variables to test credentials path
      delete process.env.OLLAMA_API_BASE;
      delete process.env.OLLAMA_API_KEY;
      delete process.env.NYRVANA_LLM_MODEL;

      // Set up mock context with empty credentials
      mockContext.credentials = {
        ollama: {}
      };

      const params = {
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      };

      // Wrap the async iterable in a promise to catch the error
      const promise = (async () => {
        // Try to consume the async iterable, which should throw
        for await (const _ of provider.subscribe('chat', params, mockContext)) {
          // This should not be reached
        }
      })();

      await expect(promise).rejects.toThrow('credentials not configured for this user');
    });
  });
});