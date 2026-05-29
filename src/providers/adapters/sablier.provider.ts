// src/providers/adapters/sablier.provider.ts
import type { ServiceProvider, UserContext, HealthStatus } from '../types';
import { CircuitBreaker } from '../../lib/circuit-breaker';
import { getEnvVar } from '../../lib/env';

export class SablierProvider implements ServiceProvider {
  id = 'sablier';
  name = 'Sablier';
  category: 'other' = 'other';
  icon = 'timer';
  
  capabilities = [
    'read.services.session',
    'execute.services.wake'
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
      let url: string, token: string;
      
      if (creds && typeof creds === 'object' && 'url' in creds && 'token' in creds &&
          typeof creds.url === 'string' && typeof creds.token === 'string') {
        url = creds.url;
        token = creds.token;
      } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
        url = getEnvVar('NYRVANA_SABLIER_URL', 'http://localhost:10000');
        token = getEnvVar('NYRVANA_SABLIER_TOKEN');
      } else {
        return { 
          status: 'down', 
          message: 'credentials not configured for this user' 
        };
      }
      
      if (!token) {
        return { 
          status: 'down', 
          message: 'Sablier token not configured' 
        };
      }
      
      const response = await this.circuitBreaker.execute(() => 
        ctx.fetch(`${url}/api/health`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      );
      
      if (response.ok) {
        return { status: 'healthy' };
      } else {
        return { 
          status: 'degraded', 
          message: `Sablier returned status ${response.status}` 
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
    getSession: async (params: unknown, ctx: UserContext) => {
      try {
        // Check for credentials in ctx first
        const creds = (ctx.credentials[this.id] as any);
        let url: string, token: string;
        
        if (creds && typeof creds === 'object' && 'url' in creds && 'token' in creds &&
            typeof creds.url === 'string' && typeof creds.token === 'string') {
          url = creds.url;
          token = creds.token;
        } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
          url = getEnvVar('NYRVANA_SABLIER_URL', 'http://localhost:10000');
          token = getEnvVar('NYRVANA_SABLIER_TOKEN');
        } else {
          throw new Error('credentials not configured for this user');
        }
        
        if (!token) {
          throw new Error('Sablier token not configured');
        }
        
        // Extract service name from params
        if (!params || typeof params !== 'object' || !('service' in params) || typeof params.service !== 'string') {
          throw new Error('Invalid parameters: service is required and must be a string');
        }
        
        const service = params.service;
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/api/session/${service}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        );
        
        if (!response.ok) {
          throw new Error(`Sablier API error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        ctx.logger.error('Sablier getSession failed', { error });
        throw error;
      }
    }
  };

  mutation = {
    wakeService: async (params: unknown, ctx: UserContext) => {
      try {
        // Check for credentials in ctx first
        const creds = (ctx.credentials[this.id] as any);
        let url: string, token: string;
        
        if (creds && typeof creds === 'object' && 'url' in creds && 'token' in creds &&
            typeof creds.url === 'string' && typeof creds.token === 'string') {
          url = creds.url;
          token = creds.token;
        } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
          url = getEnvVar('NYRVANA_SABLIER_URL', 'http://localhost:10000');
          token = getEnvVar('NYRVANA_SABLIER_TOKEN');
        } else {
          throw new Error('credentials not configured for this user');
        }
        
        if (!token) {
          throw new Error('Sablier token not configured');
        }
        
        // Extract service name from params
        if (!params || typeof params !== 'object' || !('service' in params) || typeof params.service !== 'string') {
          throw new Error('Invalid parameters: service is required and must be a string');
        }
        
        const service = params.service;
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/api/services/${service}/wake`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        );
        
        if (!response.ok) {
          throw new Error(`Sablier API error: ${response.status}`);
        }
        
        await ctx.audit({
          action: 'sablier.service.wake',
          resource: `sablier:service:${service}`,
          metadata: { service }
        });
        
        return { success: true };
      } catch (error) {
        ctx.logger.error('Sablier wakeService failed', { error });
        throw error;
      }
    }
  };
  
  widgets = [
    {
      id: 'sablier-services',
      name: 'Sablier Services',
      description: 'Shows status of Sablier managed services'
    }
  ];
}