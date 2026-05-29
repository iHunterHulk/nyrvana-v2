// src/providers/adapters/searxng.provider.ts
import type { ServiceProvider, UserContext, HealthStatus } from '../types';
import { CircuitBreaker } from '../../lib/circuit-breaker';
import { getEnvVar } from '../../lib/env';

export class SearXNGProvider implements ServiceProvider {
  id = 'searxng';
  name = 'SearXNG';
  category: 'other' = 'other';
  icon = 'search';
  
  capabilities = [
    'search.web',
    'search.autocomplete'
  ];
  
  authMethod: 'api-key' = 'api-key';
  
  private circuitBreaker = new CircuitBreaker({
    failureThreshold: 3,
    timeout: 60000, // 1 minute
    resetTimeout: 30000 // 30 seconds
  });
  
  constructor() {}
  
  async health(ctx: UserContext): Promise<HealthStatus> {
    try {
      // Check for credentials in ctx first
      const creds = (ctx.credentials[this.id] as any);
      let url: string;
      
      if (creds && typeof creds === 'object' && 'url' in creds && typeof creds.url === 'string') {
        url = creds.url;
      } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
        url = getEnvVar('NYRVANA_SEARXNG_URL');
      } else {
        return { 
          status: 'down', 
          message: 'credentials not configured for this user' 
        };
      }
      
      const response = await this.circuitBreaker.execute(() => 
        ctx.fetch(`${url}/stats`, {
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );
      
      if (response.ok) {
        return { status: 'healthy' };
      } else {
        return { 
          status: 'degraded', 
          message: `SearXNG returned status ${response.status}` 
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
    search: async (params: unknown, ctx: UserContext) => {
      try {
        // Type guard for params
        if (!params || typeof params !== 'object' || !('query' in params) || typeof params.query !== 'string') {
          throw new Error('Invalid parameters: query is required and must be a string');
        }
        
        // Check for credentials in ctx first
        const creds = (ctx.credentials[this.id] as any);
        let url: string;
        
        if (creds && typeof creds === 'object' && 'url' in creds && typeof creds.url === 'string') {
          url = creds.url;
        } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
          url = getEnvVar('NYRVANA_SEARXNG_URL');
        } else {
          throw new Error('credentials not configured for this user');
        }
        
        // Build search query parameters
        const searchParams = new URLSearchParams({
          q: params.query,
          format: 'json'
        });
        
        // Add optional parameters if provided
        if ('categories' in params && typeof params.categories === 'string') {
          searchParams.append('categories', params.categories);
        }
        
        if ('engines' in params && typeof params.engines === 'string') {
          searchParams.append('engines', params.engines);
        }
        
        if ('language' in params && typeof params.language === 'string') {
          searchParams.append('language', params.language);
        }
        
        if ('pageno' in params && typeof params.pageno === 'number') {
          searchParams.append('pageno', params.pageno.toString());
        }
        
        if ('time_range' in params && typeof params.time_range === 'string') {
          searchParams.append('time_range', params.time_range);
        }
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/search?${searchParams.toString()}`, {
            headers: {
              'Content-Type': 'application/json'
            }
          })
        );
        
        if (!response.ok) {
          throw new Error(`SearXNG API error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        ctx.logger.error('SearXNG search failed', { error });
        throw error;
      }
    },
    
    autocomplete: async (params: unknown, ctx: UserContext) => {
      try {
        // Type guard for params
        if (!params || typeof params !== 'object' || !('query' in params) || typeof params.query !== 'string') {
          throw new Error('Invalid parameters: query is required and must be a string');
        }
        
        // Check for credentials in ctx first
        const creds = (ctx.credentials[this.id] as any);
        let url: string;
        
        if (creds && typeof creds === 'object' && 'url' in creds && typeof creds.url === 'string') {
          url = creds.url;
        } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
          url = getEnvVar('NYRVANA_SEARXNG_URL');
        } else {
          throw new Error('credentials not configured for this user');
        }
        
        const searchParams = new URLSearchParams({
          q: params.query
        });
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/autocompleter?${searchParams.toString()}`, {
            headers: {
              'Content-Type': 'application/json'
            }
          })
        );
        
        if (!response.ok) {
          throw new Error(`SearXNG autocomplete API error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        ctx.logger.error('SearXNG autocomplete failed', { error });
        throw error;
      }
    }
  };
  
  mutation = {};
  
  widgets = [
    {
      id: 'searxng-search',
      name: 'SearXNG Search',
      description: 'Universal search using SearXNG'
    }
  ];
}