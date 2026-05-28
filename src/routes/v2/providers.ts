import { Elysia } from 'elysia';
import { providerRegistry } from '../../providers/registry-singleton';
import { requireUser } from '../../middleware/requireUser';

export const providers = new Elysia({ prefix: '/api/v2/providers' })
  .get('/', () => {
    return providerRegistry.list().map(provider => provider.id);
  })
  .post('/:id/:op', async ({ params, body, headers }) => {
    const { id, op } = params as { id: string, op: string };
    const userId = headers['x-nyrvana-user-id'];
    
    if (typeof userId !== 'string') {
      throw new Error('User ID not found in headers');
    }
    
    const provider = providerRegistry.get(id);
    if (!provider) {
      throw new Error(`Provider not found: ${id}`);
    }
    const fn = provider.query[op] || provider.mutation[op];
    if (!fn) {
      throw new Error(`Op not found: ${op}`);
    }
    return fn(body, { userId } as any);
  }, {
    beforeHandle: requireUser
  });