// Set required environment variables before importing modules
process.env['NYRVANA_JWT_SECRET'] = 'test-secret-key-for-jwt-signing';
process.env['NYRVANA_MASTER_KEY'] = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'; // 64 hex chars = 32 bytes

import { describe, it, expect, beforeEach } from 'vitest';
import { credentials } from './credentials';
import { Elysia } from 'elysia';
import { encrypt, decrypt } from '../../lib/crypto';
import { signAccessToken } from '../../lib/jwt';

// Clear mock database before each test
beforeEach(() => {
  // Reset the mock database
  mockDb = {};
});

// Mock database operations
let mockDb: Record<string, any> = {};

// Mock the database module
const mockDbModule = {
  db: {
    prepare: (sql: string) => {
      return {
        run: (...params: any[]) => {
          if (sql.includes('INSERT OR REPLACE')) {
            // Insert/replace operation
            const [userId, adapterId, encryptedBlob, iv, authTag, updatedAt] = params;
            const key = `${userId}-${adapterId}`;
            mockDb[key] = { user_id: userId, adapter_id: adapterId, encrypted_blob: encryptedBlob, iv, auth_tag: authTag, updated_at: updatedAt };
          } else if (sql.includes('DELETE')) {
            // Delete operation
            const [userId, adapterId] = params;
            const key = `${userId}-${adapterId}`;
            delete mockDb[key];
          }
        },
        get: (...params: any[]) => {
          if (sql.includes('SELECT encrypted_blob')) {
            // Select operation
            const [userId, adapterId] = params;
            const key = `${userId}-${adapterId}`;
            return mockDb[key] || null;
          }
          return null;
        }
      };
    }
  }
};

// Since we can't use vi.mock in Vitest, we'll patch the module directly
// by creating a proxy that returns our mock
const originalRequire = require;
require = new Proxy(originalRequire, {
  apply: (target, thisArg, argumentsList) => {
    const modulePath = argumentsList[0];
    if (modulePath.endsWith('/db')) {
      return mockDbModule;
    }
    return target.apply(thisArg, argumentsList);
  }
}) as any;

const app = new Elysia().use(credentials);

describe('Credentials CRUD', () => {
  const userIdA = 'user-a';
  const userIdB = 'user-b';
  const adapter = 'test-adapter';
  const validToken = signAccessToken(userIdA, 'user');
  const testCredentials = {
    api_key: 'test-key',
    api_secret: 'test-secret',
    access_token: 'test-token'
  };

  it('PUT creates encrypted row', async () => {
    const response = await app
      .handle(
        new Request(`http://localhost:3000/api/v2/credentials/${adapter}`, {
          method: 'PUT',
          headers: {
            'x-nyrvana-user-id': userIdA,
            'Authorization': `Bearer ${validToken}`
          },
          body: JSON.stringify(testCredentials)
        })
      )
      .then(res => res.json());

    expect(response).toEqual({ ok: true });
    
    // Verify the data was stored encrypted
    const key = `${userIdA}-${adapter}`;
    expect(mockDb[key]).toBeDefined();
    expect(mockDb[key].encrypted_blob).toBeDefined();
    expect(mockDb[key].iv).toBeDefined();
    expect(mockDb[key].auth_tag).toBeDefined();
  });

  it('GET decrypts and masks credentials', async () => {
    // First create a credential to retrieve
    await app.handle(
      new Request(`http://localhost:3000/api/v2/credentials/${adapter}`, {
        method: 'PUT',
        headers: {
          'x-nyrvana-user-id': userIdA,
          'Authorization': `Bearer ${validToken}`
        },
        body: JSON.stringify(testCredentials)
      })
    );

    const response = await app
      .handle(
        new Request(`http://localhost:3000/api/v2/credentials/${adapter}`, {
          method: 'GET',
          headers: {
            'x-nyrvana-user-id': userIdA,
            'Authorization': `Bearer ${validToken}`
          }
        })
      )
      .then(res => res.json());

    // Verify sensitive fields are masked
    expect(response.api_key).toEqual('***');
    expect(response.api_secret).toEqual('***');
    expect(response.access_token).toEqual('***');
  });

  it('GET returns 404 for non-existing credentials', async () => {
    const response = await app.handle(
      new Request('http://localhost:3000/api/v2/credentials/nonexistent', {
        method: 'GET',
        headers: {
          'x-nyrvana-user-id': userIdA,
          'Authorization': `Bearer ${validToken}`
        }
      })
    );

    expect(response.status).toEqual(404);
  });

  it('DELETE removes credentials', async () => {
    // First create a credential to delete
    await app.handle(
      new Request(`http://localhost:3000/api/v2/credentials/${adapter}-delete`, {
        method: 'PUT',
        headers: {
          'x-nyrvana-user-id': userIdA,
          'Authorization': `Bearer ${validToken}`
        },
        body: JSON.stringify(testCredentials)
      })
    );

    // Verify it exists
    const key = `${userIdA}-${adapter}-delete`;
    expect(mockDb[key]).toBeDefined();

    // Delete it
    const response = await app
      .handle(
        new Request(`http://localhost:3000/api/v2/credentials/${adapter}-delete`, {
          method: 'DELETE',
          headers: {
            'x-nyrvana-user-id': userIdA,
            'Authorization': `Bearer ${validToken}`
          }
        })
      )
      .then(res => res.json());

    expect(response).toEqual({ ok: true });
    
    // Verify it's deleted
    expect(mockDb[key]).toBeUndefined();
  });
});