// src/providers/adapters/n8n.provider.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { N8nProvider } from './n8n.provider';
import { createMockUserContext, createMockFetch } from './test-helpers';

describe('N8nProvider', () => {
  let provider: N8nProvider;
  
  beforeEach(() => {
    provider = new N8nProvider();
  });
  
  it('should have correct properties', () => {
    expect(provider.id).toBe('n8n');
    expect(provider.name).toBe('n8n');
    expect(provider.category).toBe('automations');
    expect(provider.icon).toBe('workflow');
    expect(provider.authMethod).toBe('api-key');
  });
  
  it('should have correct capabilities', () => {
    expect(provider.capabilities).toContain('execute.workflow');
  });
  
  it('should pass health check when API is healthy', async () => {
    const mockFetch = createMockFetch({
      'GET:http://localhost:5678/api/v1/workflows': { status: 200, body: [] }
    });
    
    const ctx = createMockUserContext({ 
      fetch: mockFetch,
      credentials: {
        n8n: {
          url: 'http://localhost:5678',
          apiKey: 'test-key'
        }
      }
    });
    
    const result = await provider.health(ctx);
    
    expect(result.status).toBe('healthy');
  });
  
  it('should fail health check when credentials are missing', async () => {
    const mockFetch = createMockFetch({
      'GET:http://localhost:5678/api/v1/workflows': { status: 401, body: {} }
    });
    
    const ctx = createMockUserContext({ 
      fetch: mockFetch,
      credentials: {}
    });
    
    const result = await provider.health(ctx);
    
    expect(result.status).toBe('down');
  });
  
  it('should list workflows successfully', async () => {
    const mockWorkflows = [{ id: '1', name: 'Test Workflow' }];
    const mockFetch = createMockFetch({
      'GET:http://localhost:5678/api/v1/workflows': { status: 200, body: mockWorkflows }
    });
    
    const ctx = createMockUserContext({ 
      fetch: mockFetch,
      credentials: {
        n8n: {
          url: 'http://localhost:5678',
          apiKey: 'test-key'
        }
      }
    });
    
    const result = await provider.query.listWorkflows({}, ctx);
    
    expect(result).toEqual(mockWorkflows);
  });
  
  it('should get executions successfully', async () => {
    const mockExecutions = [{ id: '1', workflowId: '1', status: 'success' }];
    const mockFetch = createMockFetch({
      'GET:http://localhost:5678/api/v1/executions': { status: 200, body: mockExecutions }
    });
    
    const ctx = createMockUserContext({ 
      fetch: mockFetch,
      credentials: {
        n8n: {
          url: 'http://localhost:5678',
          apiKey: 'test-key'
        }
      }
    });
    
    const result = await provider.query.getExecutions({}, ctx);
    
    expect(result).toEqual(mockExecutions);
  });
  
  it('should filter executions by workflowId', async () => {
    const mockExecutions = [{ id: '1', workflowId: 'workflow-1', status: 'success' }];
    const mockFetch = createMockFetch({
      'GET:http://localhost:5678/api/v1/executions?filter[workflowId]=workflow-1': { status: 200, body: mockExecutions }
    });
    
    const ctx = createMockUserContext({ 
      fetch: mockFetch,
      credentials: {
        n8n: {
          url: 'http://localhost:5678',
          apiKey: 'test-key'
        }
      }
    });
    
    const result = await provider.query.getExecutions({ workflowId: 'workflow-1' }, ctx);
    
    expect(result).toEqual(mockExecutions);
  });
  
  it('should trigger workflow successfully', async () => {
    const mockResponse = { executionId: 'exec-1', status: 'running' };
    const mockFetch = createMockFetch({
      'POST:http://localhost:5678/api/v1/workflows/workflow-1/run': { status: 200, body: mockResponse }
    });
    
    const ctx = createMockUserContext({ 
      fetch: mockFetch,
      credentials: {
        n8n: {
          url: 'http://localhost:5678',
          apiKey: 'test-key'
        }
      }
    });
    
    const result = await provider.mutation.triggerWorkflow({ workflowId: 'workflow-1' }, ctx);
    
    expect(result).toEqual(mockResponse);
  });
  
  it('should reject trigger workflow without workflowId', async () => {
    const ctx = createMockUserContext({ 
      credentials: {
        n8n: {
          url: 'http://localhost:5678',
          apiKey: 'test-key'
        }
      }
    });
    
    await expect(provider.mutation.triggerWorkflow({}, ctx))
      .rejects
      .toThrow('Invalid parameters: workflowId is required and must be a string');
  });
});