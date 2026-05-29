// src/providers/adapters/paperless.provider.ts
import type { ServiceProvider, UserContext, HealthStatus } from '../types';
import { CircuitBreaker } from '../../lib/circuit-breaker';
import { getEnvVar } from '../../lib/env';

export class PaperlessProvider implements ServiceProvider {
  id = 'paperless';
  name = 'Paperless-ngx';
  category: 'docs' = 'docs';
  icon = 'file-text';
  
  capabilities = [
    'read.docs',
    'search.docs'
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
        url = getEnvVar('NYRVANA_PAPERLESS_URL');
        token = getEnvVar('NYRVANA_PAPERLESS_TOKEN');
      } else {
        return { 
          status: 'down', 
          message: 'credentials not configured for this user' 
        };
      }
      
      if (!token) {
        return { 
          status: 'down', 
          message: 'Paperless-ngx token not configured' 
        };
      }
      
      const response = await this.circuitBreaker.execute(() => 
        ctx.fetch(`${url}/api/documents/`, {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          }
        })
      );
      
      if (response.ok) {
        return { status: 'healthy' };
      } else {
        return { 
          status: 'degraded', 
          message: `Paperless-ngx returned status ${response.status}` 
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
    searchDocs: async (params: unknown, ctx: UserContext) => {
      try {
        // Type guard for params
        const searchParams = params as { query?: string; tags?: number[]; [key: string]: unknown } | undefined;
        
        // Check for credentials in ctx first
        const creds = ctx.credentials[this.id] as { url: string; token: string } | undefined;
        let url: string, token: string;
        
        if (creds && creds.url && creds.token) {
          url = creds.url;
          token = creds.token;
        } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
          url = getEnvVar('NYRVANA_PAPERLESS_URL');
          token = getEnvVar('NYRVANA_PAPERLESS_TOKEN');
        } else {
          throw new Error('credentials not configured for this user');
        }
        
        if (!token) {
          throw new Error('Paperless-ngx token not configured');
        }
        
        // Build query parameters
        const queryParams = new URLSearchParams();
        if (searchParams?.query) {
          queryParams.append('query', searchParams.query);
        }
        if (searchParams?.tags) {
          queryParams.append('tags__id__in', searchParams.tags.join(','));
        }
        
        const queryString = queryParams.toString();
        const apiUrl = `${url}/api/documents/${queryString ? `?${queryString}` : ''}`;
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(apiUrl, {
            headers: {
              'Authorization': `Token ${token}`,
              'Content-Type': 'application/json'
            }
          })
        );
        
        if (!response.ok) {
          throw new Error(`Paperless-ngx API error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        ctx.logger.error('Paperless-ngx searchDocs failed', { error });
        throw error;
      }
    },
    
    getDoc: async (params: unknown, ctx: UserContext) => {
      try {
        // Type guard for params
        if (!params || typeof params !== 'object' || !('id' in params) || typeof params.id !== 'number') {
          throw new Error('Invalid parameters: id is required and must be a number');
        }
        
        // Check for credentials in ctx first
        const creds = ctx.credentials[this.id] as { url: string; token: string } | undefined;
        let url: string, token: string;
        
        if (creds && creds.url && creds.token) {
          url = creds.url;
          token = creds.token;
        } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
          url = getEnvVar('NYRVANA_PAPERLESS_URL');
          token = getEnvVar('NYRVANA_PAPERLESS_TOKEN');
        } else {
          throw new Error('credentials not configured for this user');
        }
        
        if (!token) {
          throw new Error('Paperless-ngx token not configured');
        }
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/api/documents/${params.id}/`, {
            headers: {
              'Authorization': `Token ${token}`,
              'Content-Type': 'application/json'
            }
          })
        );
        
        if (!response.ok) {
          throw new Error(`Paperless-ngx API error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        ctx.logger.error('Paperless-ngx getDoc failed', { error });
        throw error;
      }
    },
    
    getTags: async (_params: unknown, ctx: UserContext) => {
      try {
        // Check for credentials in ctx first
        const creds = ctx.credentials[this.id] as { url: string; token: string } | undefined;
        let url: string, token: string;
        
        if (creds && creds.url && creds.token) {
          url = creds.url;
          token = creds.token;
        } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
          url = getEnvVar('NYRVANA_PAPERLESS_URL');
          token = getEnvVar('NYRVANA_PAPERLESS_TOKEN');
        } else {
          throw new Error('credentials not configured for this user');
        }
        
        if (!token) {
          throw new Error('Paperless-ngx token not configured');
        }
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/api/tags/`, {
            headers: {
              'Authorization': `Token ${token}`,
              'Content-Type': 'application/json'
            }
          })
        );
        
        if (!response.ok) {
          throw new Error(`Paperless-ngx API error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        ctx.logger.error('Paperless-ngx getTags failed', { error });
        throw error;
      }
    }
  };
  
  mutation = {};
  
  widgets = [
    {
      id: 'paperless-docs',
      name: 'Paperless Documents',
      description: 'Shows documents from Paperless-ngx'
    },
    {
      id: 'paperless-tags',
      name: 'Paperless Tags',
      description: 'Shows tags from Paperless-ngx'
    }
  ];
}