import { Elysia, t } from 'elysia';
import { requireJWT } from '../../middleware/requireJWT';
import { encrypt, decrypt } from '../../lib/crypto';
import { db } from '../../db';

export const credentials = new Elysia({ prefix: '/api/v2/credentials' })
  .guard({
    beforeHandle: requireJWT
  })
  .put(
    '/:adapter',
    async ({ params, body, headers }) => {
      const userId = headers['x-nyrvana-user-id'];
      const { adapter } = params;
      const masterKey = process.env['NYRVANA_MASTER_KEY'];
      
      if (!masterKey) {
        throw new Error('NYRVANA_MASTER_KEY not configured');
      }
      
      const encrypted = encrypt(JSON.stringify(body), masterKey);
      
      // Upsert the credentials
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO service_credentials (user_id, adapter_id, encrypted_blob, iv, auth_tag, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const now = Date.now();
      stmt.run(userId, adapter, encrypted.ciphertext, encrypted.iv, encrypted.authTag, now);
      
      return { ok: true };
    },
    {
      params: t.Object({
        adapter: t.String()
      }),
      body: t.Record(t.String(), t.Any()),
      headers: t.Object({
        'x-nyrvana-user-id': t.String()
      })
    }
  )
  .get(
    '/:adapter',
    async ({ params, headers }) => {
      const userId = headers['x-nyrvana-user-id'];
      const { adapter } = params;
      const masterKey = process.env['NYRVANA_MASTER_KEY'];
      
      if (!masterKey) {
        throw new Error('NYRVANA_MASTER_KEY not configured');
      }
      
      // Select the credentials
      const stmt = db.prepare(`
        SELECT encrypted_blob, iv, auth_tag FROM service_credentials
        WHERE user_id = ? AND adapter_id = ?
      `);
      
      const row = stmt.get(userId, adapter) as { encrypted_blob: Buffer; iv: Buffer; auth_tag: Buffer } | null;
      
      if (!row) {
        return new Response('Not Found', { status: 404 });
      }
      
      const encryptedData = {
        ciphertext: row.encrypted_blob,
        iv: row.iv,
        authTag: row.auth_tag
      };
      
      const decrypted = JSON.parse(decrypt(encryptedData, masterKey));
      
      // Mask sensitive fields
      const masked = Object.fromEntries(
        Object.entries(decrypted).map(([key, value]) => [
          key,
          /token|pass|key|secret/i.test(key) ? '***' : value
        ])
      );
      
      return masked;
    },
    {
      params: t.Object({
        adapter: t.String()
      }),
      headers: t.Object({
        'x-nyrvana-user-id': t.String()
      })
    }
  )
  .delete(
    '/:adapter',
    async ({ params, headers }) => {
      const userId = headers['x-nyrvana-user-id'];
      const { adapter } = params;
      
      // Delete the credentials
      const stmt = db.prepare(`
        DELETE FROM service_credentials
        WHERE user_id = ? AND adapter_id = ?
      `);
      
      stmt.run(userId, adapter);
      
      return { ok: true };
    },
    {
      params: t.Object({
        adapter: t.String()
      }),
      headers: t.Object({
        'x-nyrvana-user-id': t.String()
      })
    }
  );