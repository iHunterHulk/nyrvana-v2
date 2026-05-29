// src/providers/adapters/n8n.provider.ts
import type { ServiceProvider, UserContext, HealthStatus } from '../types';
import { CircuitBreaker } from '../../lib/circuit-breaker';
import { getEnvVar } from '../../lib/env';

export class N8nProvider implements ServiceProvider {
  id = 'n8n';
  name = 'n8n';
  category: 'automations' = 'automations';
  icon = 'workflow';
  
  capabilities = [
    'execute.workflow'
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
      let url: string, apiKey: string;
      
      if (creds && typeof creds === 'object' && 'url' in creds && 'apiKey' in creds &&
          typeof creds.url === 'string' && typeof creds.apiKey === 'string') {
        url = creds.url;
        apiKey = creds.apiKey;
      } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
        url = getEnvVar('NYRVANA_N8N_URL');
        apiKey = getEnvVar('NYRVANA_N8N_API_KEY');
      } else {
        return { 
          status: 'down', 
          message: 'credentials not configured for this user' 
        };
      }
      
      if (!url || !apiKey) {
        return { 
          status: 'down', 
          message: 'n8n URL or API key not configured' 
        };
      }
      
      const response = await this.circuitBreaker.execute(() => 
        ctx.fetch(`${url}/api/v1/workflows`, {
          headers: {
            'X-N8N-API-KEY': apiKey,
            'Content-Type': 'application/json'
          }
        })
      );
      
      if (response.ok) {
        return { status: 'healthy' };
      } else {
        return { 
          status: 'degraded', 
          message: `n8n returned status ${response.status}` 
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
    listWorkflows: async (_params: unknown, ctx: UserContext) => {
      try {
        // Check for credentials in ctx first
        const creds = (ctx.credentials[this.id] as any);
        let url: string, apiKey: string;
        
        if (creds && typeof creds === 'object' && 'url' in creds && 'apiKey' in creds &&
            typeof creds.url === 'string' && typeof creds.apiKey === 'string') {
          url = creds.url;
          apiKey = creds.apiKey;
        } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
          url = getEnvVar('NYRVANA_N8N_URL');
          apiKey = getEnvVar('NYRVANA_N8N_API_KEY');
        } else {
          throw new Error('credentials not configured for this user');
        }
        
        if (!url || !apiKey) {
          throw new Error('n8n URL or API key not configured');
        }
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/api/v1/workflows`, {
            headers: {
              'X-N8N-API-KEY': apiKey,
              'Content-Type': 'application/json'
            }
          })
        );
        
        if (!response.ok) {
          throw new Error(`n8n API error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        ctx.logger.error('n8n listWorkflows query failed', { error });
        throw error;
      }
    },
    
    getExecutions: async (params: unknown, ctx: UserContext) => {
      try {
        // Type guard for params
        if (!params || typeof params !== 'object') {
          throw new Error('Invalid parameters: params must be an object');
        }
        
        // Check for credentials in ctx first
        const creds = (ctx.credentials[this.id] as any);
        let url: string, apiKey: string;
        
        if (creds && typeof creds === 'object' && 'url' in creds && 'apiKey' in creds &&
            typeof creds.url === 'string' && typeof creds.apiKey === 'string') {
          url = creds.url;
          apiKey = creds.apiKey;
        } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
          url = getEnvVar('NYRVANA_N8N_URL');
          apiKey = getEnvVar('NYRVANA_N8N_API_KEY');
        } else {
          throw new Error('credentials not configured for this user');
        }
        
        if (!url || !apiKey) {
          throw new Error('n8n URL or API key not configured');
        }
        
        // Create query parameters for filtering
        const queryParams = new URLSearchParams();
        if ('workflowId' in params && typeof params.workflowId === 'string') {
          queryParams.append('filter[workflowId]', params.workflowId);
        }
        if ('limit' in params && typeof params.limit === 'number') {
          queryParams.append('limit', params.limit.toString());
        }
        
        const queryString = queryParams.toString();
        const endpoint = queryString 
          ? `${url}/api/v1/executions?${queryString}` 
          : `${url}/api/v1/executions`;
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(endpoint, {
            headers: {
              'X-N8N-API-KEY': apiKey,
              'Content-Type': 'application/json'
            }
          })
        );
        
        if (!response.ok) {
          throw new Error(`n8n API error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        ctx.logger.error('n8n getExecutions query failed', { error });
        throw error;
      }
    }
  };

  mutation = {
    triggerWorkflow: async (params: unknown, ctx: UserContext) => {
      try {
        // Type guard for params
        if (!params || typeof params !== 'object' || !('workflowId' in params) || typeof params.workflowId !== 'string') {
          throw new Error('Invalid parameters: workflowId is required and must be a string');
        }
        
        // Check for credentials in ctx first
        const creds = (ctx.credentials[this.id] as any);
        let url: string, apiKey: string;
        
        if (creds && typeof creds === 'object' && 'url' in creds && 'apiKey' in creds &&
            typeof creds.url === 'string' && typeof creds.apiKey === 'string') {
          url = creds.url;
          apiKey = creds.apiKey;
        } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
          url = getEnvVar('NYRVANA_N8N_URL');
          apiKey = getEnvVar('NYRVANA_N8N_API_KEY');
        } else {
          throw new Error('credentials not configured for this user');
        }
        
        if (!url || !apiKey) {
          throw new Error('n8n URL or API key not configured');
        }
        
        const workflowId = params.workflowId;
        const inputData = 'inputData' in params && typeof params.inputData === 'object' ? params.inputData : {};
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/api/v1/workflows/${workflowId}/run`, {
            method: 'POST',
            headers: {
              'X-N8N-API-KEY': apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              webhookData: inputData
            })
          })
        );
        
        if (!response.ok) {
          throw new Error(`n8n API error: ${response.status}`);
        }
        
        const result = await response.json();
        
        await ctx.audit({
          action: 'n8n.workflow.trigger',
          resource: `n8n:workflow:${workflowId}`,
          metadata: { workflowId, result }
        });
        
        return result;
      } catch (error) {
        ctx.logger.error('n8n triggerWorkflow mutation failed', { error });
        throw error;
      }
    }
  };

  widgets = [];
}