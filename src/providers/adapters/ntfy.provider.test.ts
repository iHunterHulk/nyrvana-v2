// src/providers/adapters/ntfy.provider.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { NtfyProvider } from './ntfy.provider';
import { createMockUserContext, createMockFetch } from './test-helpers';

describe('NtfyProvider', () => {
  let provider: NtfyProvider;
  
  beforeEach(() => {
    provider = new NtfyProvider();
  });
  
  it('should have correct properties', () => {
    expect(provider.id).toBe('ntfy');
    expect(provider.name).toBe('Ntfy');
    expect(provider.category).toBe('monitoring');
    expect(provider.icon).toBe('bell');
    expect(provider.authMethod).toBe('api-key');
  });
  
  it('should have correct capabilities', () => {
    expect(provider.capabilities).toContain('read.notifications');
    expect(provider.capabilities).toContain('write.notifications');
    expect(provider.capabilities).toContain('subscribe.notifications');
  });
  
  it('should pass health check when API is healthy', async () => {
    const mockFetch = createMockFetch({
      'GET:http://localhost:80/v1/health': { status: 200, body: { healthy: true } }
    });
    
    const ctx = createMockUserContext({ 
      fetch: mockFetch,
      credentials: {
        ntfy: {
          url: 'http://localhost:80'
        }
      }
    });
    
    const result = await provider.health(ctx);
    
    expect(result.status).toBe('healthy');
  });
  
  it('should get notifications successfully', async () => {
    const mockNotifications = [{ id: '1', message: 'Test notification' }];
    const mockFetch = createMockFetch({
      'GET:http://localhost:80/default/json?poll=1&limit=10': { status: 200, body: mockNotifications }
    });
    
    const ctx = createMockUserContext({ 
      fetch: mockFetch,
      credentials: {
        ntfy: {
          url: 'http://localhost:80'
        }
      }
    });
    
    const result = await provider.query.getNotifications({ topic: 'default' }, ctx);
    
    expect(result).toEqual(mockNotifications);
  });
  
  it('should send notification successfully', async () => {
    const mockFetch = createMockFetch({
      'POST:http://localhost:80/test-topic': { status: 200, body: 'message-id-123' }
    });
    
    const ctx = createMockUserContext({ 
      fetch: mockFetch,
      credentials: {
        ntfy: {
          url: 'http://localhost:80'
        }
      }
    });
    
    const result = await provider.mutation.sendNotification({ 
      topic: 'test-topic', 
      message: 'Test message' 
    }, ctx);
    
    expect(result).toEqual({ success: true, messageId: '"message-id-123"' });
  });
  
  it('should have correct widgets', () => {
    expect(provider.widgets).toHaveLength(2);
    expect(provider.widgets[0].id).toBe('ntfy-notifications');
    expect(provider.widgets[1].id).toBe('ntfy-topics');
  });
  
  it('should subscribe to notifications', async () => {
    const ctx = createMockUserContext();
    
    const iterator = provider.subscribe!('notifications', { topic: 'test' }, ctx);
    
    const results = [];
    for await (const item of iterator) {
      results.push(item);
      break; // Only get the first item for testing
    }
    
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ 
      type: 'notification', 
      data: { 
        topic: 'test', 
        message: 'Mock notification event' 
      } 
    });
  });
});