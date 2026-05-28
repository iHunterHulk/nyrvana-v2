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
      // Check for credentials in ctx first
      const creds = (ctx.credentials[this.id] as any);
      let url: string, user: string, pass: string;
      
      if (creds && typeof creds === 'object' && 'url' in creds && 'user' in creds && 'pass' in creds &&
          typeof creds.url === 'string' && typeof creds.user === 'string' && typeof creds.pass === 'string') {
        url = creds.url;
        user = creds.user;
        pass = creds.pass;
      } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
        url = getEnvVar('NYRVANA_ADGUARD_URL', 'http://localhost:8080');
        user = getEnvVar('NYRVANA_ADGUARD_USER');
        pass = getEnvVar('NYRVANA_ADGUARD_PASS');
      } else {
        return { 
          status: 'down', 
          message: 'credentials not configured for this user' 
        };
      }
      
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
        // Check for credentials in ctx first
        const creds = (ctx.credentials[this.id] as any);
        let url: string, user: string, pass: string;
        
        if (creds && typeof creds === 'object' && 'url' in creds && 'user' in creds && 'pass' in creds &&
            typeof creds.url === 'string' && typeof creds.user === 'string' && typeof creds.pass === 'string') {
          url = creds.url;
          user = creds.user;
          pass = creds.pass;
        } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
          url = getEnvVar('NYRVANA_ADGUARD_URL', 'http://localhost:8080');
          user = getEnvVar('NYRVANA_ADGUARD_USER');
          pass = getEnvVar('NYRVANA_ADGUARD_PASS');
        } else {
          throw new Error('credentials not configured for this user');
        }
        
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
        // Check for credentials in ctx first
        const creds = (ctx.credentials[this.id] as any);
        let url: string, user: string, pass: string;
        
        if (creds && typeof creds === 'object' && 'url' in creds && 'user' in creds && 'pass' in creds &&
            typeof creds.url === 'string' && typeof creds.user === 'string' && typeof creds.pass === 'string') {
          url = creds.url;
          user = creds.user;
          pass = creds.pass;
        } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
          url = getEnvVar('NYRVANA_ADGUARD_URL', 'http://localhost:8080');
          user = getEnvVar('NYRVANA_ADGUARD_USER');
          pass = getEnvVar('NYRVANA_ADGUARD_PASS');
        } else {
          throw new Error('credentials not configured for this user');
        }
        
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
        
        // Check for credentials in ctx first
        const creds = (ctx.credentials[this.id] as any);
        let url: string, apiKey: string;
        
        if (creds && typeof creds === 'object' && 'url' in creds && 'apiKey' in creds &&
            typeof creds.url === 'string' && typeof creds.apiKey === 'string') {
          url = creds.url;
          apiKey = creds.apiKey;
        } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
          url = getEnvVar('NYRVANA_ADGUARD_URL', 'http://localhost:3000');
          apiKey = getEnvVar('NYRVANA_ADGUARD_API_KEY');
        } else {
          throw new Error('credentials not configured for this user');
        }
        
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