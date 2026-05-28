import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUserContext } from './user-context';
import { db } from '../db';

// Mock the db module
vi.mock('../db', () => ({
  db: {
    all: vi.fn()
  }
}));

// Mock the crypto module
vi.mock('../lib/crypto', () => ({
  crypto: {
    decrypt: vi.fn()
  }
}));

describe('createUserContext', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  it('throws error when userId is missing', async () => {
    await expect(createUserContext({ headers: {} })).rejects.toThrow('userId missing');
  });

  it('produces UserContext with empty credentials when user has no credentials', async () => {
    const headers = { 'x-nyrvana-user-id': 'user-123' };
    
    // Mock database to return no rows
    (db.all as vi.Mock).mockResolvedValue([]);
    
    const context = await createUserContext({ headers });
    
    expect(context).toEqual({
      userId: 'user-123',
      credentials: {},
      wrappedDEK: '',
      oidcToken: '',
      fetch: globalThis.fetch,
      logger: expect.any(Object),
      audit: expect.any(Function)
    });
  });

  it('produces UserContext with decrypted credentials', async () => {
    const headers = { 'x-nyrvana-user-id': 'user-123' };
    
    // Mock database to return credential rows
    (db.all as vi.Mock).mockResolvedValue([
      {
        adapter_id: 'adapter-1',
        encrypted_blob: 'encrypted-data-1',
        iv: 'iv-1',
        auth_tag: 'auth-tag-1'
      },
      {
        adapter_id: 'adapter-2',
        encrypted_blob: 'encrypted-data-2',
        iv: 'iv-2',
        auth_tag: 'auth-tag-2'
      }
    ]);
    
    // Mock crypto.decrypt to return specific values
    const mockDecrypt = vi.fn()
      .mockReturnValueOnce('{"key1":"value1"}')
      .mockReturnValueOnce('{"key2":"value2"}');
    vi.mocked(require('../lib/crypto').crypto).decrypt = mockDecrypt;
    
    const context = await createUserContext({ headers });
    
    expect(context).toEqual({
      userId: 'user-123',
      credentials: {
        'adapter-1': { key1: 'value1' },
        'adapter-2': { key2: 'value2' }
      },
      wrappedDEK: '',
      oidcToken: '',
      fetch: globalThis.fetch,
      logger: expect.any(Object),
      audit: expect.any(Function)
    });
  });

  it('handles decryption errors gracefully', async () => {
    const headers = { 'x-nyrvana-user-id': 'user-123' };
    
    // Mock database to return credential rows
    (db.all as vi.Mock).mockResolvedValue([
      {
        adapter_id: 'adapter-1',
        encrypted_blob: 'encrypted-data-1',
        iv: 'iv-1',
        auth_tag: 'auth-tag-1'
      }
    ]);
    
    // Mock crypto.decrypt to throw an error
    vi.mocked(require('../lib/crypto').crypto).decrypt = vi.fn().mockImplementation(() => {
      throw new Error('Decryption failed');
    });
    
    const context = await createUserContext({ headers });
    
    expect(context).toEqual({
      userId: 'user-123',
      credentials: {},  // Should be empty due to decryption error
      wrappedDEK: '',
      oidcToken: '',
      fetch: globalThis.fetch,
      logger: expect.any(Object),
      audit: expect.any(Function)
    });
  });

  it('handles database errors gracefully', async () => {
    const headers = { 'x-nyrvana-user-id': 'user-123' };
    
    // Mock database to throw an error
    (db.all as vi.Mock).mockRejectedValue(new Error('Database error'));
    
    const context = await createUserContext({ headers });
    
    expect(context).toEqual({
      userId: 'user-123',
      credentials: {},  // Should be empty due to database error
      wrappedDEK: '',
      oidcToken: '',
      fetch: globalThis.fetch,
      logger: expect.any(Object),
      audit: expect.any(Function)
    });
  });

  it('logger emits JSON lines', async () => {
    const headers = { 'x-nyrvana-user-id': 'user-123' };
    
    // Mock database to return no rows
    (db.all as vi.Mock).mockResolvedValue([]);
    
    const context = await createUserContext({ headers });
    
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