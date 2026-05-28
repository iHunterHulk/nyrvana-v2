// src/providers/adapters/ntfy.provider.ts
import type { ServiceProvider, UserContext, HealthStatus } from '../types';
import { CircuitBreaker } from '../../lib/circuit-breaker';
import { getEnvVar } from '../../lib/env';

export class NtfyProvider implements ServiceProvider {
  id = 'ntfy';
  name = 'Ntfy';
  category: 'monitoring' = 'monitoring';
  icon = 'bell';
  
  capabilities = [
    'read.notifications',
    'write.notifications',
    'subscribe.notifications'
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
      
      if (creds && creds.url) {
        url = creds.url;
      } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
        url = getEnvVar('NYRVANA_NTFY_URL', 'http://localhost:80');
      } else {
        return { 
          status: 'down', 
          message: 'credentials not configured for this user' 
        };
      }
      
      const response = await this.circuitBreaker.execute(() => 
        ctx.fetch(`${url}/v1/health`, {
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
          message: `Ntfy returned status ${response.status}` 
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
    getNotifications: async (params: unknown, ctx: UserContext) => {
      try {
        // Check for credentials in ctx first
        const creds = (ctx.credentials[this.id] as any);
        let url: string;
        
        if (creds && creds.url) {
          url = creds.url;
        } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
          url = getEnvVar('NYRVANA_NTFY_URL', 'http://localhost:80');
        } else {
          throw new Error('credentials not configured for this user');
        }
        
        // Type guard for params
        const topic = params && typeof params === 'object' && 'topic' in params && typeof params.topic === 'string' 
          ? params.topic 
          : 'default';
        const limit = params && typeof params === 'object' && 'limit' in params && typeof params.limit === 'number' 
          ? params.limit 
          : 10;
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/${topic}/json?poll=1&limit=${limit}`, {
            headers: {
              'Content-Type': 'application/json'
            }
          })
        );
        
        if (!response.ok) {
          throw new Error(`Ntfy API error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        ctx.logger.error('Ntfy query failed', { error });
        throw error;
      }
    },
    
    getTopics: async (_params: unknown, ctx: UserContext) => {
      try {
        // Check for credentials in ctx first
        const creds = (ctx.credentials[this.id] as any);
        let url: string;
        
        if (creds && creds.url) {
          url = creds.url;
        } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
          url = getEnvVar('NYRVANA_NTFY_URL', 'http://localhost:80');
        } else {
          throw new Error('credentials not configured for this user');
        }
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/v1/topics`, {
            headers: {
              'Content-Type': 'application/json'
            }
          })
        );
        
        if (!response.ok) {
          throw new Error(`Ntfy API error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        ctx.logger.error('Ntfy topics query failed', { error });
        throw error;
      }
    }
  };
  
  mutation = {
    sendNotification: async (params: unknown, ctx: UserContext) => {
      try {
        // Type guard for params
        if (!params || typeof params !== 'object' || 
            !('topic' in params) || typeof params.topic !== 'string' ||
            !('message' in params) || typeof params.message !== 'string') {
          throw new Error('Invalid parameters: topic and message are required and must be strings');
        }
        
        // Check for credentials in ctx first
        const creds = (ctx.credentials[this.id] as any);
        let url: string;
        
        if (creds && creds.url) {
          url = creds.url;
        } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
          url = getEnvVar('NYRVANA_NTFY_URL', 'http://localhost:80');
        } else {
          throw new Error('credentials not configured for this user');
        }
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        
        // Add any additional headers from params
        if ('title' in params && typeof params.title === 'string') {
          headers['Title'] = params.title;
        }
        if ('priority' in params && typeof params.priority === 'number') {
          headers['Priority'] = params.priority.toString();
        }
        
        const body = typeof params.message === 'string' ? params.message : String(params.message);
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/${params.topic}`, {
            method: 'POST',
            headers,
            body
          })
        );
        
        if (!response.ok) {
          throw new Error(`Ntfy API error: ${response.status}`);
        }
        
        await ctx.audit({
          action: 'ntfy.notification.send',
          resource: `ntfy:notification:${params.topic}`,
          metadata: { topic: params.topic, message: params.message }
        });
        
        return { success: true, messageId: await response.text() };
      } catch (error) {
        ctx.logger.error('Ntfy send notification failed', { error });
        throw error;
      }
    }
  };
  
  subscribe = async function* (_op: string, params: unknown, _ctx: UserContext): AsyncIterable<unknown> {
    // Type guard for params
    const topic = params && typeof params === 'object' && 'topic' in params && typeof params.topic === 'string' 
      ? params.topic 
      : 'default';
    
    // This would be implemented with a real-time subscription mechanism
    // For now, we'll just yield a mock event
    yield { 
      type: 'notification', 
      data: { 
        topic, 
        message: 'Mock notification event' 
      } 
    };
  };
  
  widgets = [
    {
      id: 'ntfy-notifications',
      name: 'Recent Notifications',
      description: 'Shows recent notifications from Ntfy'
    },
    {
      id: 'ntfy-topics',
      name: 'Notification Topics',
      description: 'Shows available notification topics'
    }
  ];
}