// src/providers/adapters/plane.provider.ts
import type { ServiceProvider, UserContext, HealthStatus } from '../types';
import { CircuitBreaker } from '../../lib/circuit-breaker';
import { getEnvVar } from '../../lib/env';

export class PlaneProvider implements ServiceProvider {
  id = 'plane';
  name = 'Plane';
  category: 'tasks' = 'tasks';
  icon = 'kanban';
  
  capabilities = [
    'read.tasks.issues',
    'read.tasks.issue',
    'write.tasks.issue'
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
      let url: string, token: string, workspace: string;
      
      if (creds && typeof creds === 'object' && 'url' in creds && 'token' in creds && 'workspace' in creds &&
          typeof creds.url === 'string' && typeof creds.token === 'string' && typeof creds.workspace === 'string') {
        url = creds.url;
        token = creds.token;
        workspace = creds.workspace;
      } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
        url = getEnvVar('NYRVANA_PLANE_URL');
        token = getEnvVar('NYRVANA_PLANE_TOKEN');
        workspace = getEnvVar('NYRVANA_PLANE_WORKSPACE');
      } else {
        return { 
          status: 'down', 
          message: 'credentials not configured for this user' 
        };
      }
      
      if (!url || !token || !workspace) {
        return { 
          status: 'down', 
          message: 'Plane URL, token, or workspace not configured' 
        };
      }
      
      const response = await this.circuitBreaker.execute(() => 
        ctx.fetch(`${url}/api/workspaces/${workspace}`, {
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
          message: `Plane returned status ${response.status}` 
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
    listIssues: async (_params: unknown, ctx: UserContext) => {
      try {
        // Check for credentials in ctx first
        const creds = (ctx.credentials[this.id] as any);
        let url: string, token: string, workspace: string;
        
        if (creds && typeof creds === 'object' && 'url' in creds && 'token' in creds && 'workspace' in creds &&
            typeof creds.url === 'string' && typeof creds.token === 'string' && typeof creds.workspace === 'string') {
          url = creds.url;
          token = creds.token;
          workspace = creds.workspace;
        } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
          url = getEnvVar('NYRVANA_PLANE_URL');
          token = getEnvVar('NYRVANA_PLANE_TOKEN');
          workspace = getEnvVar('NYRVANA_PLANE_WORKSPACE');
        } else {
          throw new Error('credentials not configured for this user');
        }
        
        if (!url || !token || !workspace) {
          throw new Error('Plane URL, token, or workspace not configured');
        }
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/api/workspaces/${workspace}/issues`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        );
        
        if (!response.ok) {
          throw new Error(`Plane API error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        ctx.logger.error('Plane list issues failed', { error });
        throw error;
      }
    },
    
    getIssue: async (params: unknown, ctx: UserContext) => {
      try {
        // Type guard for params
        if (!params || typeof params !== 'object' || !('id' in params) || typeof params.id !== 'string') {
          throw new Error('Invalid parameters: id is required and must be a string');
        }
        
        // Check for credentials in ctx first
        const creds = (ctx.credentials[this.id] as any);
        let url: string, token: string, workspace: string;
        
        if (creds && typeof creds === 'object' && 'url' in creds && 'token' in creds && 'workspace' in creds &&
            typeof creds.url === 'string' && typeof creds.token === 'string' && typeof creds.workspace === 'string') {
          url = creds.url;
          token = creds.token;
          workspace = creds.workspace;
        } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
          url = getEnvVar('NYRVANA_PLANE_URL');
          token = getEnvVar('NYRVANA_PLANE_TOKEN');
          workspace = getEnvVar('NYRVANA_PLANE_WORKSPACE');
        } else {
          throw new Error('credentials not configured for this user');
        }
        
        if (!url || !token || !workspace) {
          throw new Error('Plane URL, token, or workspace not configured');
        }
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/api/workspaces/${workspace}/issues/${params.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        );
        
        if (!response.ok) {
          throw new Error(`Plane API error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        ctx.logger.error('Plane get issue failed', { error });
        throw error;
      }
    }
  };
  
  mutation = {
    createIssue: async (params: unknown, ctx: UserContext) => {
      try {
        // Type guard for params
        if (!params || typeof params !== 'object') {
          throw new Error('Invalid parameters: params must be an object');
        }
        
        // Check for credentials in ctx first
        const creds = (ctx.credentials[this.id] as any);
        let url: string, token: string, workspace: string;
        
        if (creds && typeof creds === 'object' && 'url' in creds && 'token' in creds && 'workspace' in creds &&
            typeof creds.url === 'string' && typeof creds.token === 'string' && typeof creds.workspace === 'string') {
          url = creds.url;
          token = creds.token;
          workspace = creds.workspace;
        } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
          url = getEnvVar('NYRVANA_PLANE_URL');
          token = getEnvVar('NYRVANA_PLANE_TOKEN');
          workspace = getEnvVar('NYRVANA_PLANE_WORKSPACE');
        } else {
          throw new Error('credentials not configured for this user');
        }
        
        if (!url || !token || !workspace) {
          throw new Error('Plane URL, token, or workspace not configured');
        }
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/api/workspaces/${workspace}/issues`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
          })
        );
        
        if (!response.ok) {
          throw new Error(`Plane API error: ${response.status}`);
        }
        
        const result = await response.json();
        
        await ctx.audit({
          action: 'plane.issue.create',
          resource: `plane:issue:${result.id}`,
          metadata: { issueId: result.id }
        });
        
        return result;
      } catch (error) {
        ctx.logger.error('Plane create issue failed', { error });
        throw error;
      }
    }
  };
  
  widgets = [
    {
      id: 'plane-issues',
      name: 'Plane Issues',
      description: 'Shows recent issues from Plane'
    }
  ];
}