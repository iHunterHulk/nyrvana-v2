// src/providers/adapters/umami.provider.ts
import type { ServiceProvider, UserContext, HealthStatus } from '../types';
import { CircuitBreaker } from '../../lib/circuit-breaker';
import { getEnvVar } from '../../lib/env';

export class UmamiProvider implements ServiceProvider {
  id = 'umami';
  name = 'Umami';
  category: 'analytics' = 'analytics';
  icon = 'bar-chart';
  
  capabilities = [
    'read.analytics.stats',
    'read.analytics.pageviews'
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
      let url: string, username: string, password: string;
      
      if (creds && typeof creds === 'object' && 'url' in creds && 'username' in creds && 'password' in creds &&
          typeof creds.url === 'string' && typeof creds.username === 'string' && typeof creds.password === 'string') {
        url = creds.url;
        username = creds.username;
        password = creds.password;
      } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
        url = getEnvVar('NYRVANA_UMAMI_URL');
        username = getEnvVar('NYRVANA_UMAMI_USERNAME');
        password = getEnvVar('NYRVANA_UMAMI_PASSWORD');
      } else {
        return { 
          status: 'down', 
          message: 'credentials not configured for this user' 
        };
      }
      
      if (!username || !password) {
        return { 
          status: 'down', 
          message: 'Umami username or password not configured' 
        };
      }
      
      // First, authenticate to get a token
      const authResponse = await this.circuitBreaker.execute(() => 
        ctx.fetch(`${url}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username,
            password
          })
        })
      );
      
      if (!authResponse.ok) {
        return { 
          status: 'down', 
          message: `Umami authentication failed: ${authResponse.status}` 
        };
      }
      
      const authData = await authResponse.json();
      const token = authData.token;
      
      // Then check health with the token
      const response = await this.circuitBreaker.execute(() => 
        ctx.fetch(`${url}/api/websites`, {
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
          message: `Umami returned status ${response.status}` 
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
    getStats: async (params: unknown, ctx: UserContext) => {
      try {
        // Check for credentials in ctx first
        const creds = (ctx.credentials[this.id] as any);
        let url: string, username: string, password: string;
        
        if (creds && typeof creds === 'object' && 'url' in creds && 'username' in creds && 'password' in creds &&
            typeof creds.url === 'string' && typeof creds.username === 'string' && typeof creds.password === 'string') {
          url = creds.url;
          username = creds.username;
          password = creds.password;
        } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
          url = getEnvVar('NYRVANA_UMAMI_URL');
          username = getEnvVar('NYRVANA_UMAMI_USERNAME');
          password = getEnvVar('NYRVANA_UMAMI_PASSWORD');
        } else {
          throw new Error('credentials not configured for this user');
        }
        
        if (!username || !password) {
          throw new Error('Umami username or password not configured');
        }
        
        // Authenticate to get a token
        const authResponse = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              username,
              password
            })
          })
        );
        
        if (!authResponse.ok) {
          throw new Error(`Umami authentication failed: ${authResponse.status}`);
        }
        
        const authData = await authResponse.json();
        const token = authData.token;
        
        // Get stats using the token
        // Type guard for params
        if (!params || typeof params !== 'object') {
          throw new Error('Invalid parameters: params must be an object');
        }
        
        const websiteId = 'websiteId' in params && typeof params.websiteId === 'string' ? params.websiteId : undefined;
        const startAt = 'startAt' in params && typeof params.startAt === 'number' ? params.startAt : undefined;
        const endAt = 'endAt' in params && typeof params.endAt === 'number' ? params.endAt : undefined;
        const urlPath = 'url' in params && typeof params.url === 'string' ? params.url : undefined;
        const referrer = 'referrer' in params && typeof params.referrer === 'string' ? params.referrer : undefined;
        const title = 'title' in params && typeof params.title === 'string' ? params.title : undefined;
        const host = 'host' in params && typeof params.host === 'string' ? params.host : undefined;
        const os = 'os' in params && typeof params.os === 'string' ? params.os : undefined;
        const browser = 'browser' in params && typeof params.browser === 'string' ? params.browser : undefined;
        const device = 'device' in params && typeof params.device === 'string' ? params.device : undefined;
        const country = 'country' in params && typeof params.country === 'string' ? params.country : undefined;
        const region = 'region' in params && typeof params.region === 'string' ? params.region : undefined;
        const city = 'city' in params && typeof params.city === 'string' ? params.city : undefined;
        
        const queryParams = new URLSearchParams();
        if (websiteId) queryParams.append('websiteId', websiteId);
        if (startAt) queryParams.append('startAt', startAt.toString());
        if (endAt) queryParams.append('endAt', endAt.toString());
        if (urlPath) queryParams.append('url', urlPath);
        if (referrer) queryParams.append('referrer', referrer);
        if (title) queryParams.append('title', title);
        if (host) queryParams.append('host', host);
        if (os) queryParams.append('os', os);
        if (browser) queryParams.append('browser', browser);
        if (device) queryParams.append('device', device);
        if (country) queryParams.append('country', country);
        if (region) queryParams.append('region', region);
        if (city) queryParams.append('city', city);
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/api/websites/${websiteId}/stats?${queryParams.toString()}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        );
        
        if (!response.ok) {
          throw new Error(`Umami API error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        ctx.logger.error('Umami get stats failed', { error });
        throw error;
      }
    },
    
    getPageViews: async (params: unknown, ctx: UserContext) => {
      try {
        // Check for credentials in ctx first
        const creds = (ctx.credentials[this.id] as any);
        let url: string, username: string, password: string;
        
        if (creds && typeof creds === 'object' && 'url' in creds && 'username' in creds && 'password' in creds &&
            typeof creds.url === 'string' && typeof creds.username === 'string' && typeof creds.password === 'string') {
          url = creds.url;
          username = creds.username;
          password = creds.password;
        } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
          url = getEnvVar('NYRVANA_UMAMI_URL');
          username = getEnvVar('NYRVANA_UMAMI_USERNAME');
          password = getEnvVar('NYRVANA_UMAMI_PASSWORD');
        } else {
          throw new Error('credentials not configured for this user');
        }
        
        if (!username || !password) {
          throw new Error('Umami username or password not configured');
        }
        
        // Authenticate to get a token
        const authResponse = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              username,
              password
            })
          })
        );
        
        if (!authResponse.ok) {
          throw new Error(`Umami authentication failed: ${authResponse.status}`);
        }
        
        const authData = await authResponse.json();
        const token = authData.token;
        
        // Get page views using the token
        // Type guard for params
        if (!params || typeof params !== 'object') {
          throw new Error('Invalid parameters: params must be an object');
        }
        
        const websiteId = 'websiteId' in params && typeof params.websiteId === 'string' ? params.websiteId : undefined;
        const startAt = 'startAt' in params && typeof params.startAt === 'number' ? params.startAt : undefined;
        const endAt = 'endAt' in params && typeof params.endAt === 'number' ? params.endAt : undefined;
        const unit = 'unit' in params && typeof params.unit === 'string' ? params.unit : 'day';
        const timezone = 'timezone' in params && typeof params.timezone === 'string' ? params.timezone : 'UTC';
        const urlPath = 'url' in params && typeof params.url === 'string' ? params.url : undefined;
        const referrer = 'referrer' in params && typeof params.referrer === 'string' ? params.referrer : undefined;
        const title = 'title' in params && typeof params.title === 'string' ? params.title : undefined;
        const host = 'host' in params && typeof params.host === 'string' ? params.host : undefined;
        const os = 'os' in params && typeof params.os === 'string' ? params.os : undefined;
        const browser = 'browser' in params && typeof params.browser === 'string' ? params.browser : undefined;
        const device = 'device' in params && typeof params.device === 'string' ? params.device : undefined;
        const country = 'country' in params && typeof params.country === 'string' ? params.country : undefined;
        const region = 'region' in params && typeof params.region === 'string' ? params.region : undefined;
        const city = 'city' in params && typeof params.city === 'string' ? params.city : undefined;
        
        const queryParams = new URLSearchParams();
        if (websiteId) queryParams.append('websiteId', websiteId);
        if (startAt) queryParams.append('startAt', startAt.toString());
        if (endAt) queryParams.append('endAt', endAt.toString());
        if (unit) queryParams.append('unit', unit);
        if (timezone) queryParams.append('timezone', timezone);
        if (urlPath) queryParams.append('url', urlPath);
        if (referrer) queryParams.append('referrer', referrer);
        if (title) queryParams.append('title', title);
        if (host) queryParams.append('host', host);
        if (os) queryParams.append('os', os);
        if (browser) queryParams.append('browser', browser);
        if (device) queryParams.append('device', device);
        if (country) queryParams.append('country', country);
        if (region) queryParams.append('region', region);
        if (city) queryParams.append('city', city);
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/api/websites/${websiteId}/pageviews?${queryParams.toString()}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        );
        
        if (!response.ok) {
          throw new Error(`Umami API error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        ctx.logger.error('Umami get page views failed', { error });
        throw error;
      }
    }
  };
  
  mutation = {};
  
  widgets = [
    {
      id: 'umami-stats',
      name: 'Website Analytics',
      description: 'Shows website analytics from Umami'
    },
    {
      id: 'umami-pageviews',
      name: 'Page Views',
      description: 'Shows page views statistics from Umami'
    }
  ];
}