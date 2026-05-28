// src/providers/registry.ts
import type { ServiceProvider } from './types';

export class ProviderRegistry {
  private providers: Map<string, ServiceProvider> = new Map();
  
  /**
   * Register a provider with the registry
   */
  register(provider: ServiceProvider): void {
    if (this.providers.has(provider.id)) {
      throw new Error(`Provider with id '${provider.id}' is already registered`);
    }
    this.providers.set(provider.id, provider);
  }
  
  /**
   * Get a provider by ID
   */
  get(id: string): ServiceProvider | undefined {
    return this.providers.get(id);
  }
  
  /**
   * List all registered providers
   */
  list(): ServiceProvider[] {
    return Array.from(this.providers.values());
  }
  
  /**
   * Check health of all registered providers
   */
  async healthAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const [id, provider] of this.providers.entries()) {
      try {
        const health = await provider.health({
          userId: 'system',
          wrappedDEK: '',
          oidcToken: '',
          fetch: fetch,
          logger: {
            info: () => {},
            warn: () => {},
            error: () => {},
            debug: () => {}
          },
          audit: async () => {},
      credentials: {}
        });
        results[id] = health.status === 'healthy';
      } catch (error) {
        results[id] = false;
      }
    }
    
    return results;
  }
  
  /**
   * Clear all registered providers (mainly for testing)
   */
  clear(): void {
    this.providers.clear();
  }
}