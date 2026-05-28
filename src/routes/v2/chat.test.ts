process.env.NYRVANA_JWT_SECRET = process.env.NYRVANA_JWT_SECRET || 'test-jwt-secret';
import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { Elysia } from 'elysia';
import { chat } from './chat';
import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { Elysia } from 'elysia';
import { chat } from './chat';
import { providerRegistry } from '../../providers/registry-singleton';
import { signAccessToken } from '../../lib/jwt';

// Create a test app
const testApp = new Elysia()
  .use(chat);

// Mock environment for testing
const TEST_USER_ID = 'test-user-123';
const TEST_SECRET = 'test-secret-key';

describe('POST /api/v2/chat', () => {
  beforeAll(() => {
    // Set test secret in env
    process.env.NYRVANA_DEV_SECRET = TEST_SECRET;
    process.env.NYRVANA_LLM_MODEL = 'llama3';
  });

  afterAll(() => {
    delete process.env.NYRVANA_DEV_SECRET;
    delete process.env.NYRVANA_LLM_MODEL;
  });

  it('should stream chat responses via SSE', async () => {
    // Mock ollama provider with a subscribe method that yields three deltas
    const mockOllama = {
      subscribe: vi.fn().mockImplementation(async function* (_op: string, _params: unknown) {
        yield { content: 'Hello' };
        yield { content: ' World' };
        yield { content: '!' };
        return;
      })
    };

    // Mock the provider registry to return our mock ollama provider
    vi.spyOn(providerRegistry, 'get').mockReturnValue(mockOllama);

    // Create a valid signature
    const validJWT = signAccessToken(TEST_USER_ID, 'admin');

    const response = await testApp.handle(
      new Request('http://localhost:3002/api/v2/chat', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          
          'Authorization': `Bearer ${validJWT}`
        },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Hello' }
          ]
        })
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    
    const text = await response.text();
    const lines = text.split('\n\n').filter(line => line.startsWith('data: '));
    
    expect(lines[0]).toBe('data: {"delta":"Hello"}');
    expect(lines[1]).toBe('data: {"delta":" World"}');
    expect(lines[2]).toBe('data: {"delta":"!"}');
    expect(lines[3]).toBe('data: [DONE]');
  });

  it('should handle errors gracefully', async () => {
    // Mock ollama provider that throws an error
    const mockOllama = {
      subscribe: vi.fn().mockImplementation(async function* (_op: string, _params: unknown) {
        throw new Error('Provider error');
      })
    };

    // Mock the provider registry to return our mock ollama provider
    vi.spyOn(providerRegistry, 'get').mockReturnValue(mockOllama);

    // Create a valid signature
    const validJWT = signAccessToken(TEST_USER_ID, 'admin');

    const response = await testApp.handle(
      new Request('http://localhost:3002/api/v2/chat', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          
          'Authorization': `Bearer ${validJWT}`
        },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Hello' }
          ]
        })
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    
    const text = await response.text();
    const lines = text.split('\n\n').filter(line => line.startsWith('data: '));
    
    expect(lines[0]).toContain('data: {"error":"Provider error"}');
  });

  it('should reject unauthenticated requests', async () => {
    const response = await testApp.handle(
      new Request('http://localhost:3002/api/v2/chat', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Hello' }
          ]
        })
      })
    );

    expect(response.status).toBe(401);
  });
});