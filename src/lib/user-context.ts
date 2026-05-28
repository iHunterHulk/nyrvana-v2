import { UserContext, Logger } from "../providers/types";

export function createUserContext({ headers }: { headers: Record<string, string | undefined> }): UserContext {
  const userId = headers['x-nyrvana-user-id'];
  
  if (!userId) {
    throw new Error('userId missing');
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
    wrappedDEK: '',
    oidcToken: '',
    fetch: globalThis.fetch,
    logger,
    audit: async (_event: { action: string; resource: string; metadata?: Record<string, any> }) => {}
  };
}