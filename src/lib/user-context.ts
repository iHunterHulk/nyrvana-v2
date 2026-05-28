import { UserContext, Logger } from "../providers/types";
import { db } from "../db";
import { crypto } from "../lib/crypto";

export async function createUserContext({ headers }: { headers: Record<string, string | undefined> }): Promise<UserContext> {
  const userId = headers['x-nyrvana-user-id'];
  
  if (!userId) {
    throw new Error('userId missing');
  }

  // Initialize credentials as empty object
  let credentials: Record<string, unknown> = {};

  try {
    // Query service credentials from database
    const rows = await db.all(
      'SELECT adapter_id, encrypted_blob, iv, auth_tag FROM service_credentials WHERE user_id = ?',
      [userId]
    );

    // Process each credential row
    for (const row of rows) {
      try {
        // Decrypt the encrypted blob
        const decrypted = crypto.decrypt(
          {
            ciphertext: row.encrypted_blob,
            iv: row.iv,
            authTag: row.auth_tag
          },
          process.env.NYRVANA_MASTER_KEY!
        );
        
        // Parse the decrypted JSON and store in credentials object
        const parsed = JSON.parse(decrypted);
        credentials[row.adapter_id] = parsed;
      } catch (decryptError) {
        console.error(`Failed to decrypt credential for adapter ${row.adapter_id}:`, decryptError);
        // Continue processing other credentials even if one fails
      }
    }
  } catch (dbError) {
    console.error('Database query failed:', dbError);
    // Return empty credentials object if database query fails
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