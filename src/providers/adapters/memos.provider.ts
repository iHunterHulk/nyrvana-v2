// src/providers/adapters/memos.provider.ts
import type { ServiceProvider, UserContext, HealthStatus, IndexableDocument } from '../types';
import { CircuitBreaker } from '../../lib/circuit-breaker';
import { getEnvVar } from '../../lib/env';

export class MemosProvider implements ServiceProvider {
  id = 'memos';
  name = 'Memos';
  category: 'notes' = 'notes';
  icon = ' StickyNote';
  
  capabilities = [
    'read.notes',
    'write.notes',
    'search.notes.semantic'
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
      const url = getEnvVar('NYRVANA_MEMOS_URL', 'http://localhost:5230');
      
      const response = await this.circuitBreaker.execute(() => 
        ctx.fetch(`${url}/api/v1/status`, {
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
          message: `Memos returned status ${response.status}` 
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
    getMemos: async (params: unknown, ctx: UserContext) => {
      try {
        const url = getEnvVar('NYRVANA_MEMOS_URL', 'http://localhost:5230');
        
        // Type guard for params
        const limit = params && typeof params === 'object' && 'limit' in params && typeof params.limit === 'number' 
          ? params.limit 
          : 10;
        const offset = params && typeof params === 'object' && 'offset' in params && typeof params.offset === 'number' 
          ? params.offset 
          : 0;
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/api/v1/memo?limit=${limit}&offset=${offset}`, {
            headers: {
              'Content-Type': 'application/json'
            }
          })
        );
        
        if (!response.ok) {
          throw new Error(`Memos API error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        ctx.logger.error('Memos query failed', { error });
        throw error;
      }
    },
    
    getMemo: async (params: unknown, ctx: UserContext) => {
      try {
        // Type guard for params
        if (!params || typeof params !== 'object' || !('id' in params) || typeof params.id !== 'string') {
          throw new Error('Invalid parameters: id is required and must be a string');
        }
        
        const url = getEnvVar('NYRVANA_MEMOS_URL', 'http://localhost:5230');
        const id = params.id;
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/api/v1/memo/${id}`, {
            headers: {
              'Content-Type': 'application/json'
            }
          })
        );
        
        if (!response.ok) {
          throw new Error(`Memos API error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        ctx.logger.error('Memos get memo failed', { error });
        throw error;
      }
    },
    
    searchMemos: async (params: unknown, ctx: UserContext) => {
      try {
        // Type guard for params
        if (!params || typeof params !== 'object' || !('query' in params) || typeof params.query !== 'string') {
          throw new Error('Invalid parameters: query is required and must be a string');
        }
        
        const url = getEnvVar('NYRVANA_MEMOS_URL', 'http://localhost:5230');
        const query = params.query;
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/api/v1/memo?content=${encodeURIComponent(query)}`, {
            headers: {
              'Content-Type': 'application/json'
            }
          })
        );
        
        if (!response.ok) {
          throw new Error(`Memos API error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        ctx.logger.error('Memos search failed', { error });
        throw error;
      }
    }
  };
  
  mutation = {
    createMemo: async (params: unknown, ctx: UserContext) => {
      try {
        // Type guard for params
        if (!params || typeof params !== 'object' || !('content' in params) || typeof params.content !== 'string') {
          throw new Error('Invalid parameters: content is required and must be a string');
        }
        
        const url = getEnvVar('NYRVANA_MEMOS_URL', 'http://localhost:5230');
        const content = params.content;
        const visibility = params && typeof params === 'object' && 'visibility' in params && typeof params.visibility === 'string' 
          ? params.visibility 
          : 'PRIVATE';
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/api/v1/memo`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              content,
              visibility
            })
          })
        );
        
        if (!response.ok) {
          throw new Error(`Memos API error: ${response.status}`);
        }
        
        const result = await response.json();
        
        await ctx.audit({
          action: 'memos.memo.create',
          resource: `memos:memo:${result.id}`,
          metadata: { contentLength: content.length }
        });
        
        return result;
      } catch (error) {
        ctx.logger.error('Memos create memo failed', { error });
        throw error;
      }
    },
    
    updateMemo: async (params: unknown, ctx: UserContext) => {
      try {
        // Type guard for params
        if (!params || typeof params !== 'object' || 
            !('id' in params) || typeof params.id !== 'string' ||
            !('content' in params) || typeof params.content !== 'string') {
          throw new Error('Invalid parameters: id and content are required and must be strings');
        }
        
        const url = getEnvVar('NYRVANA_MEMOS_URL', 'http://localhost:5230');
        const id = params.id;
        const content = params.content;
        const visibility = params && typeof params === 'object' && 'visibility' in params && typeof params.visibility === 'string' 
          ? params.visibility 
          : 'PRIVATE';
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/api/v1/memo/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              content,
              visibility
            })
          })
        );
        
        if (!response.ok) {
          throw new Error(`Memos API error: ${response.status}`);
        }
        
        const result = await response.json();
        
        await ctx.audit({
          action: 'memos.memo.update',
          resource: `memos:memo:${id}`,
          metadata: { contentLength: content.length }
        });
        
        return result;
      } catch (error) {
        ctx.logger.error('Memos update memo failed', { error });
        throw error;
      }
    },
    
    deleteMemo: async (params: unknown, ctx: UserContext) => {
      try {
        // Type guard for params
        if (!params || typeof params !== 'object' || !('id' in params) || typeof params.id !== 'string') {
          throw new Error('Invalid parameters: id is required and must be a string');
        }
        
        const url = getEnvVar('NYRVANA_MEMOS_URL', 'http://localhost:5230');
        const id = params.id;
        
        const response = await this.circuitBreaker.execute(() => 
          ctx.fetch(`${url}/api/v1/memo/${id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json'
            }
          })
        );
        
        if (!response.ok) {
          throw new Error(`Memos API error: ${response.status}`);
        }
        
        await ctx.audit({
          action: 'memos.memo.delete',
          resource: `memos:memo:${id}`,
          metadata: {}
        });
        
        return { success: true };
      } catch (error) {
        ctx.logger.error('Memos delete memo failed', { error });
        throw error;
      }
    }
  };
  
  index = async function* (this: MemosProvider, ctx: UserContext): AsyncIterable<IndexableDocument> {
    try {
      // Fetch memos for this user
      const memos = await this.query.getMemos({ limit: 100 }, ctx);
      
      if (Array.isArray(memos)) {
        for (const memo of memos) {
          yield {
            id: `memos:memo:${memo.id}`,
            type: 'note',
            userId: ctx.userId,
            title: memo.content.substring(0, 50) + (memo.content.length > 50 ? '...' : ''),
            body: memo.content,
            url: `${getEnvVar('NYRVANA_MEMOS_URL', 'http://localhost:5230')}/m/${memo.id}`,
            createdAt: memo.createdTs ? new Date(memo.createdTs * 1000).toISOString() : new Date().toISOString(),
            updatedAt: memo.updatedTs ? new Date(memo.updatedTs * 1000).toISOString() : new Date().toISOString()
          };
        }
      }
    } catch (error) {
      ctx.logger.error('Memos indexing failed', { error });
      // Don't throw, just yield nothing
    }
  };
  
  widgets = [
    {
      id: 'memos-recent',
      name: 'Recent Memos',
      description: 'Shows recently created memos'
    },
    {
      id: 'memos-search',
      name: 'Memos Search',
      description: 'Search through your memos'
    }
  ];
}