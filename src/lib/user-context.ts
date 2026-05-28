import type { UserContext, Logger } from "../providers/types";
import { decrypt } from "./crypto";

export async function createUserContext({ headers }: { headers: Record<string, string | undefined> }): Promise<UserContext> {
  const userId = headers['x-nyrvana-user-id'];

  if (!userId) {
    throw new Error('userId missing');
  }

  // Initialize credentials as empty object
  const credentials: Record<string, unknown> = {};

  // Only attempt DB load if a master key is configured.
  // The db import is dynamic so vitest (in Node) does not fail loading bun:sqlite
  // at test time; chat/search/models tests do not exercise this code path.
  const masterKey = process.env['NYRVANA_MASTER_KEY'];
  if (masterKey) {
    try {
      const { db } = await import("../db");
      const rows = db
        .prepare('SELECT adapter_id, encrypted_blob, iv, auth_tag FROM service_credentials WHERE user_id = ?')
        .all(userId) as Array<{ adapter_id: string; encrypted_blob: Buffer; iv: Buffer; auth_tag: Buffer }>;

      for (const row of rows) {
        try {
          const decrypted = decrypt(
            { ciphertext: row.encrypted_blob, iv: row.iv, authTag: row.auth_tag },
            masterKey
          );
          credentials[row.adapter_id] = JSON.parse(decrypted);
        } catch (decryptError) {
          console.error(`Failed to decrypt credential for adapter ${row.adapter_id}:`, decryptError);
        }
      }
    } catch (dbError) {
      // db module load failed (e.g. running under vitest without bun:sqlite) or query failed.
      // ctx.credentials stays as the empty object initialized above.
    }
  }

  const logger: Logger = {
    debug: (message: string, meta?: Record<string, any>) => {
      console.log(JSON.stringify({ level: 'debug', message, userId, ts: new Date().toISOString(), ...meta }));
    },
    info: (message: string, meta?: Record<string, any>) => {
      console.log(JSON.stringify({ level: 'info', message, userId, ts: new Date().toISOString(), ...meta }));
    },
    warn: (message: string, meta?: Record<string, any>) => {
      console.log(JSON.stringify({ level: 'warn', message, userId, ts: new Date().toISOString(), ...meta }));
    },
    error: (message: string, meta?: Record<string, any>) => {
      console.log(JSON.stringify({ level: 'error', message, userId, ts: new Date().toISOString(), ...meta }));
    }
  };

  return {
    userId,
    credentials,
    wrappedDEK: '',
    oidcToken: '',
    fetch: globalThis.fetch,
    logger,
    audit: async (_event: { action: string; resource: string; metadata?: Record<string, any> }) => {}
  };
}
