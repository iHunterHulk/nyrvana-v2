// src/providers/adapters/ollama.provider.ts
import { ServiceProvider, UserContext, HealthStatus, ProviderCategory } from '../types';

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

interface OllamaTagsResponse {
  models: OllamaModel[];
}

interface OllamaChatRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
}

interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: { role: string; content: string };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OllamaChatStreamResponse {
  model: string;
  created_at: string;
  message: { role: string; content: string };
  done: boolean;
}

export class OllamaProvider implements ServiceProvider {
  id = 'ollama';
  name = 'Ollama Cloud';
  category: ProviderCategory = 'other';
  icon = 'sparkles';
  capabilities = ['llm.chat', 'llm.stream', 'llm.list-models'];
  authMethod: 'api-key' = 'api-key';
  widgets = [];

  async health(ctx: UserContext): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      // Check for credentials in ctx first
      const creds = (ctx.credentials[this.id] as any);
      let apiBase: string;
      let apiKey: string;
      
      if (creds && typeof creds === 'object' && 'baseUrl' in creds && typeof creds.baseUrl === 'string') {
        apiBase = creds.baseUrl;
        apiKey = creds.apiKey || '';
      } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
        apiBase = process.env['OLLAMA_API_BASE'] || '';
        apiKey = process.env['OLLAMA_API_KEY'] || '';
      } else {
        return { 
          status: 'down', 
          message: 'credentials not configured for this user' 
        };
      }
      
      if (!apiBase) {
        return { 
          status: 'down', 
          message: 'OLLAMA_API_BASE not configured' 
        };
      }
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await ctx.fetch(`${apiBase}/api/tags`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        return { 
          status: 'degraded', 
          latencyMs: Date.now() - startTime,
          message: `HTTP ${response.status}: ${response.statusText}` 
        };
      }

      return { 
        status: 'healthy', 
        latencyMs: Date.now() - startTime 
      };
    } catch (error) {
      return { 
        status: 'down', 
        latencyMs: Date.now() - startTime,
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  query = {
    'list-models': async (_params: unknown, ctx: UserContext): Promise<string[]> => {
      try {
        // Check for credentials in ctx first
        const creds = (ctx.credentials[this.id] as any);
        let apiBase: string;
        let apiKey: string;
        
        if (creds && typeof creds === 'object' && 'baseUrl' in creds && typeof creds.baseUrl === 'string') {
          apiBase = creds.baseUrl;
          apiKey = creds.apiKey || '';
        } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
          apiBase = process.env['OLLAMA_API_BASE'] || '';
          apiKey = process.env['OLLAMA_API_KEY'] || '';
        } else {
          throw new Error('credentials not configured for this user');
        }
        
        if (!apiBase) {
          throw new Error('OLLAMA_API_BASE not configured');
        }
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const response = await ctx.fetch(`${apiBase}/api/tags`, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: OllamaTagsResponse = await response.json();
        return data.models.map(model => model.name);
      } catch (error) {
        ctx.logger.error('Failed to list Ollama models', { error });
        throw error;
      }
    }
  };

  mutation = {
    chat: async (params: unknown, ctx: UserContext): Promise<{ content: string }> => {
      try {
        const typedParams = params as { model?: string; messages: Array<{ role: string; content: string }> };
        
        // Check for credentials in ctx first
        const creds = (ctx.credentials[this.id] as any);
        let apiBase: string;
        let apiKey: string;
        let defaultModel: string;
        
        if (creds && typeof creds === 'object' && 'baseUrl' in creds && typeof creds.baseUrl === 'string') {
          apiBase = creds.baseUrl;
          apiKey = creds.apiKey || '';
          defaultModel = creds.defaultModel || 'llama3';
        } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
          apiBase = process.env['OLLAMA_API_BASE'] || '';
          apiKey = process.env['OLLAMA_API_KEY'] || '';
          defaultModel = process.env['NYRVANA_LLM_MODEL'] || 'llama3';
        } else {
          throw new Error('credentials not configured for this user');
        }
        
        if (!apiBase) {
          throw new Error('OLLAMA_API_BASE not configured');
        }
        
        const model = typedParams.model || defaultModel;
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const requestBody: OllamaChatRequest = {
          model,
          messages: typedParams.messages,
          stream: false
        };

        const response = await ctx.fetch(`${apiBase}/api/chat`, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: OllamaChatResponse = await response.json();
        return { content: data.message.content };
      } catch (error) {
        ctx.logger.error('Failed to chat with Ollama', { error });
        throw error;
      }
    }
  };

  subscribe = async function* (this: any, op: string, params: unknown, ctx: UserContext): AsyncIterable<{ content: string }> {
    if (op !== 'chat') {
      throw new Error(`Unsupported operation: ${op}`);
    }

    try {
      const typedParams = params as { model?: string; messages: Array<{ role: string; content: string }> };
      
      // Check for credentials in ctx first
      const creds = (ctx.credentials[this.id] as any);
      let apiBase: string;
      let apiKey: string;
      let defaultModel: string;
      
      if (creds && typeof creds === 'object' && 'baseUrl' in creds && typeof creds.baseUrl === 'string') {
        apiBase = creds.baseUrl;
        apiKey = creds.apiKey || '';
        defaultModel = creds.defaultModel || 'llama3';
      } else if (process.env['NYRVANA_FALLBACK_TO_ENV'] === '1') {
        apiBase = process.env['OLLAMA_API_BASE'] || '';
        apiKey = process.env['OLLAMA_API_KEY'] || '';
        defaultModel = process.env['NYRVANA_LLM_MODEL'] || 'llama3';
      } else {
        throw new Error('credentials not configured for this user');
      }
      
      if (!apiBase) {
        throw new Error('OLLAMA_API_BASE not configured');
      }
      
      const model = typedParams.model || defaultModel;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const requestBody: OllamaChatRequest = {
        model,
        messages: typedParams.messages,
        stream: true
      };

      const response = await ctx.fetch(`${apiBase}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            try {
              const data: OllamaChatStreamResponse = JSON.parse(line);
              if (data.message && data.message.content) {
                yield { content: data.message.content };
              }
              if (data.done) {
                return;
              }
            } catch (parseError) {
              ctx.logger.warn('Failed to parse Ollama stream line', { line, error: parseError });
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      ctx.logger.error('Failed to stream chat with Ollama', { error });
      throw error;
    }
  };
}