import { Elysia } from 'elysia';
import { requireUser } from '../../middleware/requireUser';
import { providerRegistry } from '../../providers/registry-singleton';
import type { UserContext } from '../../providers/types';

const models = new Elysia({ prefix: '/api/v2/models' })
  .get(
    '/',
    async ({ headers }) => {
      // Create a mock context for testing purposes
      // In a real implementation, this would come from the authenticated user context
      const mockContext: UserContext = {
        userId: headers['x-nyrvana-user-id'] || 'test-user',
        wrappedDEK: '',
        oidcToken: '',
        fetch: fetch,
        logger: {
          info: console.info,
          warn: console.warn,
          error: console.error,
          debug: console.debug
        },
        audit: async () => {}
      };

      const registry = providerRegistry.list();
      const modelList: Array<{ id: string; name: string; provider: string }> = [];

      for (const provider of registry) {
        // Check if the provider has a 'list-models' query operation
        if (provider.query && provider.query['list-models']) {
          try {
            // Call the provider's list-models operation
            const models = await provider.query['list-models']({}, mockContext);
            
            // Handle the case where the provider returns string[] (like ollama)
            if (Array.isArray(models)) {
              for (const model of models) {
                modelList.push({
                  id: model,
                  name: model,
                  provider: provider.id
                });
              }
            }
          } catch (error) {
            console.error(`Failed to list models for provider ${provider.id}:`, error);
          }
        }
      }

      return modelList;
    },
    {
      beforeHandle: requireUser
    }
  );

export { models };