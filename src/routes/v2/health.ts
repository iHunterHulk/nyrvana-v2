import { Elysia } from 'elysia';
import { providerRegistry } from '../../providers/registry-singleton';
import { createUserContext } from '../../lib/user-context';
import { requireJWT } from '../../middleware/requireJWT';
import type { HealthStatus } from '../../providers/types';

export const health = new Elysia({ prefix: '/api/v2/health' })
  .guard({
    beforeHandle: requireJWT
  })
  .get('/', async ({ headers }) => {
    const ctx = await createUserContext({ headers });
    
    // Run health checks for all providers in parallel
    const providers = providerRegistry.list();
    const healthResults = await Promise.all(
      providers.map(async (provider) => {
        try {
          const healthStatus = await provider.health(ctx);
          return { id: provider.id, status: healthStatus };
        } catch (error) {
          return { 
            id: provider.id, 
            status: { 
              status: 'down' as const, 
              message: error instanceof Error ? error.message : 'Unknown error' 
            } 
          };
        }
      })
    );

    // Build the adapters object with the new shape
    const adapters: Record<string, HealthStatus> = {};
    for (const result of healthResults) {
      adapters[result.id] = result.status;
    }

    return {
      status: 'ok',
      uptime: process.uptime(),
      adapters
    };
  });