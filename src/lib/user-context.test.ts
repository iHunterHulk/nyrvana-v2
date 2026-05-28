import { describe, it, expect, vi } from 'vitest';
import { createUserContext } from './user-context';

describe('createUserContext', () => {
  it('throws error when userId is missing', () => {
    expect(() => createUserContext({ headers: {}, env: {} })).toThrow('userId missing');
  });

  it('produces full UserContext shape with valid headers', () => {
    const headers = { 'x-nyrvana-user-id': 'user-123' };
    const context = createUserContext({ headers, env: {} });
    
    expect(context).toEqual({
      userId: 'user-123',
      wrappedDEK: '',
      oidcToken: '',
      fetch: globalThis.fetch,
      logger: expect.any(Object),
      audit: expect.any(Function)
    });
  });

  it('logger emits JSON lines', () => {
    const headers = { 'x-nyrvana-user-id': 'user-123' };
    const context = createUserContext({ headers, env: {} });
    
    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (...args) => logs.push(args[0] as string);
    
    try {
      context.logger.info('Test message', { foo: 'bar' });
      
      expect(logs.length).toBe(1);
      const parsed = JSON.parse(logs[0]);
      expect(parsed).toEqual({
        level: 'info',
        message: 'Test message',
        userId: 'user-123',
        ts: expect.any(String),
        foo: 'bar'
      });
    } finally {
      console.log = originalLog;
    }
  });
});