// src/providers/adapters/homepage.provider.ts
import type { ServiceProvider, UserContext, HealthStatus } from '../types';
import { CircuitBreaker } from '../../lib/circuit-breaker';
import { getEnvVar } from '../../lib/env';

export class HomepageProvider implements ServiceProvider {
  id = 'homepage';
  name = 'Homepage';
  category: 'other' = 'other';
  icon = 'layout-grid';
  
  capabilities = [
    'read.other.services'
  ];
  
  authMethod: 'none' = 'none';
  
  private circuitBreaker = new CircuitBreaker({
    failureThreshold: 3,
    timeout: 60000, // 1 minute
    resetTimeout: 30000 // 30 seconds
  });
  
  constructor() {}
  
  async health(ctx: UserContext): Promise<HealthStatus> {
    try {
      // Get URL from context or environment
      const creds = (ctx.credentials[this.id] as any);
      let url: string;
      
      if (creds && typeof creds === 'object' && 'url' in creds && typeof creds.url === 'string') {
        url = creds.url;
      } else {
        url = getEnvVar('NYRVANA_HOMEPAGE_URL', 'http://localhost:3003');
      }
      
      const response = await this.circuitBreaker.execute(() => 
        ctx.fetch(`${url}/api/health`, {
          method: 'GET',
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
          message: `Homepage returned status ${response.status}` 
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
    getServices: async (_params: unknown, ctx: UserContext) => {
      try {
        // Get URL from context or environment
        const creds = (ctx.credentials[this.id] as any);
        let url: string;
        
        if (creds && typeof creds === 'object' && 'url' in creds && typeof creds.url === 'string') {
          url = creds.url;
        } else {
          url = getEnvVar('NYRVANA_HOMEPAGE_URL', 'http://localhost:3003');
        }
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/api/services`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          })
        );
        
        if (!response.ok) {
          throw new Error(`Homepage API error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        ctx.logger.error('Homepage getServices failed', { error });
        throw error;
      }
    }
  };
  
  mutation = {};
  
  widgets = [
    {
      id: 'homepage-services',
      name: 'Homepage Services',
      description: 'Shows configured services from Homepage'
    }
  ];
}