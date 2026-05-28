// src/providers/adapters/immich.provider.ts
import type { ServiceProvider, UserContext, HealthStatus } from '../types';
import { CircuitBreaker } from '../../lib/circuit-breaker';
import { getEnvVar } from '../../lib/env';

export class ImmichProvider implements ServiceProvider {
  id = 'immich';
  name = 'Immich';
  category: 'photos' = 'photos';
  icon = 'image';
  
  capabilities = [
    'read.photos.albums',
    'read.photos.recent',
    'search.photos'
  ];
  
  authMethod: 'api-key' = 'api-key';
  
  private circuitBreaker = new CircuitBreaker({
    failureThreshold: 3,
    timeout: 60000, // 1 minute
    resetTimeout: 30000 // 30 seconds
  });
  
  constructor() {}
  
  private resolveAuth(ctx: UserContext): { url: string; apiKey: string } {
    // Check for credentials in ctx first
    const creds = ctx.credentials[this.id] as { url?: string; apiKey?: string } | undefined;
    
    if (creds && typeof creds === 'object' && creds.url && creds.apiKey) {
      return { url: creds.url, apiKey: creds.apiKey };
    } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
      const url = getEnvVar('NYRVANA_IMMICH_URL');
      const apiKey = getEnvVar('NYRVANA_IMMICH_API_KEY');
      
      if (!url || !apiKey) {
        throw new Error('Immich URL or API key not configured in environment');
      }
      
      return { url, apiKey };
    } else {
      throw new Error(`credentials not configured for this user for provider ${this.id}`);
    }
  }
  
  async health(ctx: UserContext): Promise<HealthStatus> {
    try {
      const { url, apiKey } = this.resolveAuth(ctx);
      
      const response = await this.circuitBreaker.execute(() => 
        ctx.fetch(`${url}/api/server-info`, {
          headers: {
            'Accept': 'application/json',
            'X-Api-Key': apiKey
          }
        })
      );
      
      if (response.ok) {
        return { status: 'healthy' };
      } else {
        return { 
          status: 'degraded', 
          message: `Immich returned status ${response.status}` 
        };
      }
    } catch (error) {
      return { 
        status: 'down', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  query = {
    getAlbums: async (_params: unknown, ctx: UserContext) => {
      try {
        const { url, apiKey } = this.resolveAuth(ctx);
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/api/albums`, {
            headers: {
              'Accept': 'application/json',
              'X-Api-Key': apiKey
            }
          })
        );
        
        if (!response.ok) {
          throw new Error(`Immich API error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        ctx.logger.error('Immich getAlbums query failed', { error });
        throw error;
      }
    },
    
    getRecentAssets: async (_params: unknown, ctx: UserContext) => {
      try {
        const { url, apiKey } = this.resolveAuth(ctx);
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/api/assets?take=20`, {
            headers: {
              'Accept': 'application/json',
              'X-Api-Key': apiKey
            }
          })
        );
        
        if (!response.ok) {
          throw new Error(`Immich API error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        ctx.logger.error('Immich getRecentAssets query failed', { error });
        throw error;
      }
    },
    
    search: async (params: { query: string }, ctx: UserContext) => {
      try {
        // Type guard for params
        if (!params || typeof params !== 'object' || !params.query || typeof params.query !== 'string') {
          throw new Error('Invalid parameters: query is required and must be a string');
        }
        
        const { url, apiKey } = this.resolveAuth(ctx);
        
        const searchParams = new URLSearchParams({
          q: params.query
        });
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/api/search?${searchParams.toString()}`, {
            headers: {
              'Accept': 'application/json',
              'X-Api-Key': apiKey
            }
          })
        );
        
        if (!response.ok) {
          throw new Error(`Immich API error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        ctx.logger.error('Immich search query failed', { error });
        throw error;
      }
    }
  };
  
  mutation = {};
  
  widgets = [
    {
      id: 'immich-recent-photos',
      name: 'Recent Photos',
      description: 'Shows recent photos from Immich'
    },
    {
      id: 'immich-albums',
      name: 'Photo Albums',
      description: 'Shows albums from Immich'
    }
  ];
}