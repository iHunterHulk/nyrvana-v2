import { Elysia } from 'elysia';
import { providerRegistry } from '../../providers/registry-singleton';

export const health = new Elysia({ prefix: '/api/v2/health' })
  .get('/', () => {
    const providers = providerRegistry.list().map(provider => provider.id);
    return {
      status: 'ok',
      uptime: process.uptime(),
      adapters: {
        adguard: providers.includes('adguard'),
        ntfy: providers.includes('ntfy'),
        memos: providers.includes('memos')
      }
    };
  });