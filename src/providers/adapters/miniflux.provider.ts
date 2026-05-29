// src/providers/adapters/miniflux.provider.ts
import type { ServiceProvider, UserContext, HealthStatus } from '../types';
import { CircuitBreaker } from '../../lib/circuit-breaker';
import { getEnvVar } from '../../lib/env';

export class MinifluxProvider implements ServiceProvider {
  id = 'miniflux';
  name = 'Miniflux';
  category: 'feeds' = 'feeds';
  icon = 'rss';
  
  capabilities = [
    'read.feeds',
    'mark.feeds'
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
      const creds = ctx.credentials[this.id] as { url: string; token: string } | undefined;
      let url: string, token: string;
      
      if (creds && creds.url && creds.token) {
        url = creds.url;
        token = creds.token;
      } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
        url = getEnvVar('NYRVANA_MINIFLUX_URL', 'http://localhost:8080');
        token = getEnvVar('NYRVANA_MINIFLUX_TOKEN');
      } else {
        return { 
          status: 'down', 
          message: 'credentials not configured for this user' 
        };
      }
      
      if (!token) {
        return { 
          status: 'down', 
          message: 'Miniflux token not configured' 
        };
      }
      
      const response = await this.circuitBreaker.execute(() => 
        ctx.fetch(`${url}/v1/me`, {
          headers: {
            'X-Auth-Token': token,
            'Content-Type': 'application/json'
          }
        })
      );
      
      if (response.ok) {
        return { status: 'healthy' };
      } else {
        return { 
          status: 'degraded', 
          message: `Miniflux returned status ${response.status}` 
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
    getUnread: async (_params: unknown, ctx: UserContext) => {
      try {
        // Check for credentials in ctx first
        const creds = ctx.credentials[this.id] as { url: string; token: string } | undefined;
        let url: string, token: string;
        
        if (creds && creds.url && creds.token) {
          url = creds.url;
          token = creds.token;
        } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
          url = getEnvVar('NYRVANA_MINIFLUX_URL', 'http://localhost:8080');
          token = getEnvVar('NYRVANA_MINIFLUX_TOKEN');
        } else {
          throw new Error('credentials not configured for this user');
        }
        
        if (!token) {
          throw new Error('Miniflux token not configured');
        }
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/v1/entries?status=unread`, {
            headers: {
              'X-Auth-Token': token,
              'Content-Type': 'application/json'
            }
          })
        );
        
        if (!response.ok) {
          throw new Error(`Miniflux API error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        ctx.logger.error('Miniflux getUnread failed', { error });
        throw error;
      }
    },
    
    getFeeds: async (_params: unknown, ctx: UserContext) => {
      try {
        // Check for credentials in ctx first
        const creds = ctx.credentials[this.id] as { url: string; token: string } | undefined;
        let url: string, token: string;
        
        if (creds && creds.url && creds.token) {
          url = creds.url;
          token = creds.token;
        } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
          url = getEnvVar('NYRVANA_MINIFLUX_URL', 'http://localhost:8080');
          token = getEnvVar('NYRVANA_MINIFLUX_TOKEN');
        } else {
          throw new Error('credentials not configured for this user');
        }
        
        if (!token) {
          throw new Error('Miniflux token not configured');
        }
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/v1/feeds`, {
            headers: {
              'X-Auth-Token': token,
              'Content-Type': 'application/json'
            }
          })
        );
        
        if (!response.ok) {
          throw new Error(`Miniflux API error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        ctx.logger.error('Miniflux getFeeds failed', { error });
        throw error;
      }
    }
  };
  
  mutation = {
    markRead: async (params: unknown, ctx: UserContext) => {
      try {
        // Type guard for params
        if (!params || typeof params !== 'object' || !('entryIds' in params) || !Array.isArray(params.entryIds)) {
          throw new Error('Invalid parameters: entryIds is required and must be an array');
        }
        
        // Check for credentials in ctx first
        const creds = ctx.credentials[this.id] as { url: string; token: string } | undefined;
        let url: string, token: string;
        
        if (creds && creds.url && creds.token) {
          url = creds.url;
          token = creds.token;
        } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
          url = getEnvVar('NYRVANA_MINIFLUX_URL', 'http://localhost:8080');
          token = getEnvVar('NYRVANA_MINIFLUX_TOKEN');
        } else {
          throw new Error('credentials not configured for this user');
        }
        
        if (!token) {
          throw new Error('Miniflux token not configured');
        }
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/v1/entries`, {
            method: 'PUT',
            headers: {
              'X-Auth-Token': token,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              entry_ids: params.entryIds,
              status: 'read'
            })
          })
        );
        
        if (!response.ok) {
          throw new Error(`Miniflux API error: ${response.status}`);
        }
        
        await ctx.audit({
          action: 'miniflux.entries.markRead',
          resource: `miniflux:entries:${params.entryIds.length}`,
          metadata: { entryIds: params.entryIds }
        });
        
        return { success: true, count: params.entryIds.length };
      } catch (error) {
        ctx.logger.error('Miniflux markRead failed', { error });
        throw error;
      }
    }
  };
  
  widgets = [
    {
      id: 'miniflux-unread',
      name: 'Unread RSS Entries',
      description: 'Shows unread entries from Miniflux'
    },
    {
      id: 'miniflux-feeds',
      name: 'RSS Feeds',
      description: 'Shows RSS feeds from Miniflux'
    }
  ];
}