// src/providers/adapters/adguard.provider.ts
import type { ServiceProvider, UserContext, HealthStatus } from '../types';
import { CircuitBreaker } from '../../lib/circuit-breaker';
import { getEnvVar } from '../../lib/env';

export class AdGuardProvider implements ServiceProvider {
  id = 'adguard';
  name = 'AdGuard Home';
  category: 'monitoring' = 'monitoring';
  icon = 'shield';
  
  capabilities = [
    'read.monitoring.dns-queries',
    'read.monitoring.block-stats',
    'write.monitoring.blocklist'
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
      const url = getEnvVar('NYRVANA_ADGUARD_URL', 'http://localhost:8080');
      const user = getEnvVar('NYRVANA_ADGUARD_USER');
      const pass = getEnvVar('NYRVANA_ADGUARD_PASS');
      
      if (!user || !pass) {
        return { 
          status: 'down', 
          message: 'AdGuard user or password not configured' 
        };
      }
      
      const credentials = btoa(`${user}:${pass}`);
      
      const response = await this.circuitBreaker.execute(() => 
        ctx.fetch(`${url}/control/status`, {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json'
          }
        })
      );
      
      if (response.ok) {
        return { status: 'healthy' };
      } else {
        return { 
          status: 'degraded', 
          message: `AdGuard returned status ${response.status}` 
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
    getStats: async (_params: unknown, ctx: UserContext) => {
      try {
        const url = getEnvVar('NYRVANA_ADGUARD_URL', 'http://localhost:8080');
        const user = getEnvVar('NYRVANA_ADGUARD_USER');
        const pass = getEnvVar('NYRVANA_ADGUARD_PASS');
        
        if (!user || !pass) {
          throw new Error('AdGuard user or password not configured');
        }
        
        const credentials = btoa(`${user}:${pass}`);
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/control/stats`, {
            headers: {
              'Authorization': `Basic ${credentials}`,
              'Content-Type': 'application/json'
            }
          })
        );
        
        if (!response.ok) {
          throw new Error(`AdGuard API error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        ctx.logger.error('AdGuard query failed', { error });
        throw error;
      }
    },
    
    getBlockStats: async (_params: unknown, ctx: UserContext) => {
      try {
        const url = getEnvVar('NYRVANA_ADGUARD_URL', 'http://localhost:8080');
        const user = getEnvVar('NYRVANA_ADGUARD_USER');
        const pass = getEnvVar('NYRVANA_ADGUARD_PASS');
        
        if (!user || !pass) {
          throw new Error('AdGuard user or password not configured');
        }
        
        const credentials = btoa(`${user}:${pass}`);
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/control/stats_top`, {
            headers: {
              'Authorization': `Basic ${credentials}`,
              'Content-Type': 'application/json'
            }
          })
        );
        
        if (!response.ok) {
          throw new Error(`AdGuard API error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        ctx.logger.error('AdGuard block stats query failed', { error });
        throw error;
      }
    }
  };
  
  mutation = {
    addBlocklist: async (params: unknown, ctx: UserContext) => {
      try {
        // Type guard for params
        if (!params || typeof params !== 'object' || !('url' in params) || typeof params.url !== 'string') {
          throw new Error('Invalid parameters: url is required and must be a string');
        }
        
        const url = getEnvVar('NYRVANA_ADGUARD_URL', 'http://localhost:3000');
        const apiKey = getEnvVar('NYRVANA_ADGUARD_API_KEY');
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/control/access/set_url`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              allowed: [],
              disallowed: [params.url],
              blocked_services: []
            })
          })
        );
        
        if (!response.ok) {
          throw new Error(`AdGuard API error: ${response.status}`);
        }
        
        await ctx.audit({
          action: 'adguard.blocklist.add',
          resource: `adguard:blocklist:${params.url}`,
          metadata: { url: params.url }
        });
        
        return { success: true };
      } catch (error) {
        ctx.logger.error('AdGuard add blocklist failed', { error });
        throw error;
      }
    }
  };
  
  widgets = [
    {
      id: 'adguard-dns-stats',
      name: 'DNS Query Statistics',
      description: 'Shows DNS query statistics from AdGuard Home'
    },
    {
      id: 'adguard-block-stats',
      name: 'Ad Blocking Statistics',
      description: 'Shows ad blocking statistics from AdGuard Home'
    }
  ];
}