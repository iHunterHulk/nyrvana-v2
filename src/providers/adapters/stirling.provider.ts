// src/providers/adapters/stirling.provider.ts
import type { ServiceProvider, UserContext, HealthStatus } from '../types';
import { CircuitBreaker } from '../../lib/circuit-breaker';
import { getEnvVar } from '../../lib/env';

export class StirlingProvider implements ServiceProvider {
  id = 'stirling';
  name = 'Stirling PDF';
  category: 'docs' = 'docs';
  icon = 'file';
  
  capabilities = [
    'write.docs.convert',
    'read.docs.info'
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
      // Check for URL in ctx credentials first
      const creds = (ctx.credentials[this.id] as any);
      let url: string;
      
      if (creds && typeof creds === 'object' && 'url' in creds && typeof creds.url === 'string') {
        url = creds.url;
      } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
        url = getEnvVar('NYRVANA_STIRLING_URL', 'http://localhost:8080');
      } else {
        return { 
          status: 'down', 
          message: 'Stirling PDF URL not configured for this user' 
        };
      }
      
      const response = await this.circuitBreaker.execute(() => 
        ctx.fetch(`${url}/api/v1/info`, {
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
          message: `Stirling PDF returned status ${response.status}` 
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
    getInfo: async (_params: unknown, ctx: UserContext) => {
      try {
        // Check for URL in ctx credentials first
        const creds = (ctx.credentials[this.id] as any);
        let url: string;
        
        if (creds && typeof creds === 'object' && 'url' in creds && typeof creds.url === 'string') {
          url = creds.url;
        } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
          url = getEnvVar('NYRVANA_STIRLING_URL', 'http://localhost:8080');
        } else {
          throw new Error('Stirling PDF URL not configured for this user');
        }
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/api/v1/info`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          })
        );
        
        if (!response.ok) {
          throw new Error(`Stirling PDF API error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        ctx.logger.error('Stirling PDF info query failed', { error });
        throw error;
      }
    }
  };
  
  mutation = {
    convertToPdf: async (params: unknown, ctx: UserContext) => {
      try {
        // Type guard for params
        if (!params || typeof params !== 'object' || !('fileUrl' in params) || typeof params.fileUrl !== 'string') {
          throw new Error('Invalid parameters: fileUrl is required and must be a string');
        }
        
        // Check for URL in ctx credentials first
        const creds = (ctx.credentials[this.id] as any);
        let url: string;
        
        if (creds && typeof creds === 'object' && 'url' in creds && typeof creds.url === 'string') {
          url = creds.url;
        } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
          url = getEnvVar('NYRVANA_STIRLING_URL', 'http://localhost:8080');
        } else {
          throw new Error('Stirling PDF URL not configured for this user');
        }
        
        // Send the file URL to Stirling for conversion
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/api/v1/convert`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              url: params.fileUrl
            })
          })
        );
        
        if (!response.ok) {
          throw new Error(`Stirling PDF API error: ${response.status}`);
        }
        
        const result = await response.json();
        
        await ctx.audit({
          action: 'stirling.convert',
          resource: `stirling:conversion:${params.fileUrl}`,
          metadata: { fileUrl: params.fileUrl }
        });
        
        return result;
      } catch (error) {
        ctx.logger.error('Stirling PDF convert to PDF failed', { error });
        throw error;
      }
    }
  };
  
  widgets = [
    {
      id: 'stirling-conversion-stats',
      name: 'Document Conversion Stats',
      description: 'Shows document conversion statistics from Stirling PDF'
    }
  ];
}