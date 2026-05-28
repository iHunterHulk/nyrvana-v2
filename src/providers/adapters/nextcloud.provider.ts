// src/providers/adapters/nextcloud.provider.ts
import type { ServiceProvider, UserContext, HealthStatus } from '../types';
import { CircuitBreaker } from '../../lib/circuit-breaker';
import { getEnvVar } from '../../lib/env';

export class NextcloudProvider implements ServiceProvider {
  id = 'nextcloud';
  name = 'Nextcloud';
  category: 'files' = 'files';
  icon = 'cloud';
  
  capabilities = [
    'read.files',
    'write.files'
  ];
  
  authMethod: 'basic' = 'basic';
  
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
        url = getEnvVar('NYRVANA_NEXTCLOUD_URL', 'http://localhost:8080');
        user = getEnvVar('NYRVANA_NEXTCLOUD_USER');
        pass = getEnvVar('NYRVANA_NEXTCLOUD_PASS');
      } else {
        return { 
          status: 'down', 
          message: 'credentials not configured for this user' 
        };
      }
      
      if (!user || !pass) {
        return { 
          status: 'down', 
          message: 'Nextcloud user or password not configured' 
        };
      }
      
      const credentials = Buffer.from(`${user}:${pass}`).toString('base64');
      
      const response = await this.circuitBreaker.execute(() => 
        ctx.fetch(`${url}/ocs/v2.php/cloud/capabilities?format=json`, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json',
            'OCS-APIRequest': 'true'
          }
        })
      );
      
      if (response.ok) {
        return { status: 'healthy' };
      } else {
        return { 
          status: 'degraded', 
          message: `Nextcloud returned status ${response.status}` 
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
    listFiles: async (params: unknown, ctx: UserContext) => {
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
          url = getEnvVar('NYRVANA_NEXTCLOUD_URL', 'http://localhost:8080');
          user = getEnvVar('NYRVANA_NEXTCLOUD_USER');
          pass = getEnvVar('NYRVANA_NEXTCLOUD_PASS');
        } else {
          throw new Error('credentials not configured for this user');
        }
        
        if (!user || !pass) {
          throw new Error('Nextcloud user or password not configured');
        }
        
        const path = params?.path || '';
        const webdavUrl = `${url}/remote.php/webdav${path}`;
        const credentials = Buffer.from(`${user}:${pass}`).toString('base64');
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(webdavUrl, {
            method: 'PROPFIND',
            headers: {
              'Authorization': `Basic ${credentials}`,
              'Content-Type': 'application/xml',
              'Depth': '1'
            }
          })
        );
        
        if (!response.ok) {
          throw new Error(`Nextcloud WebDAV error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        ctx.logger.error('Nextcloud list files query failed', { error });
        throw error;
      }
    },
    
    getShares: async (_params: unknown, ctx: UserContext) => {
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
          url = getEnvVar('NYRVANA_NEXTCLOUD_URL', 'http://localhost:8080');
          user = getEnvVar('NYRVANA_NEXTCLOUD_USER');
          pass = getEnvVar('NYRVANA_NEXTCLOUD_PASS');
        } else {
          throw new Error('credentials not configured for this user');
        }
        
        if (!user || !pass) {
          throw new Error('Nextcloud user or password not configured');
        }
        
        const credentials = Buffer.from(`${user}:${pass}`).toString('base64');
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/ocs/v2.php/apps/files_sharing/api/v1/shares?format=json`, {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${credentials}`,
              'Content-Type': 'application/json',
              'OCS-APIRequest': 'true'
            }
          })
        );
        
        if (!response.ok) {
          throw new Error(`Nextcloud shares API error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        ctx.logger.error('Nextcloud get shares query failed', { error });
        throw error;
      }
    },
    
    getQuota: async (_params: unknown, ctx: UserContext) => {
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
          url = getEnvVar('NYRVANA_NEXTCLOUD_URL', 'http://localhost:8080');
          user = getEnvVar('NYRVANA_NEXTCLOUD_USER');
          pass = getEnvVar('NYRVANA_NEXTCLOUD_PASS');
        } else {
          throw new Error('credentials not configured for this user');
        }
        
        if (!user || !pass) {
          throw new Error('Nextcloud user or password not configured');
        }
        
        const credentials = Buffer.from(`${user}:${pass}`).toString('base64');
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/ocs/v2.php/cloud/users/${user}?format=json`, {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${credentials}`,
              'Content-Type': 'application/json',
              'OCS-APIRequest': 'true'
            }
          })
        );
        
        if (!response.ok) {
          throw new Error(`Nextcloud quota API error: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.ocs && data.ocs.data && data.ocs.data.quota) {
          return data.ocs.data.quota;
        } else {
          throw new Error('Nextcloud quota data not found in response');
        }
      } catch (error) {
        ctx.logger.error('Nextcloud get quota query failed', { error });
        throw error;
      }
    }
  };
  
  mutation = {};
  
  widgets = [
    {
      id: 'nextcloud-storage',
      name: 'Storage Usage',
      description: 'Shows storage usage statistics from Nextcloud'
    }
  ];
}