// src/providers/adapters/plane.provider.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlaneProvider } from './plane.provider';
import { createMockUserContext, createMockFetch } from './test-helpers';

describe('PlaneProvider', () => {
  let provider: PlaneProvider;
  let mockFetch: ReturnType<typeof createMockFetch>;
  
  beforeEach(() => {
    provider = new PlaneProvider();
    mockFetch = createMockFetch({});
  });
  
  it('should have correct properties', () => {
    expect(provider.id).toBe('plane');
    expect(provider.name).toBe('Plane');
    expect(provider.category).toBe('tasks');
    expect(provider.icon).toBe('kanban');
    expect(provider.authMethod).toBe('api-key');
  });
  
  it('should have correct capabilities', () => {
    expect(provider.capabilities).toContain('read.tasks.issues');
    expect(provider.capabilities).toContain('read.tasks.issue');
    expect(provider.capabilities).toContain('write.tasks.issue');
  });
  
  it('should pass health check when API is healthy', async () => {
    const mockFetch = createMockFetch({
      'GET:http://t/api/workspaces/w': { status: 200, body: { id: 'w', name: 'Test Workspace' } }
    });
    
    const ctx = createMockUserContext({ 
      fetch: mockFetch,
      credentials: {
        plane: {
          url: 'http://t',
          token: 'x',
          workspace: 'w'
        }
      }
    });
    
    const result = await provider.health(ctx);
    
    expect(result.status).toBe('healthy');
  });
  
  it('should fail health check when API key is missing', async () => {
    const ctx = createMockUserContext({
      credentials: {}
    });
    
    const result = await provider.health(ctx);
    
    expect(result.status).toBe('down');
    expect(result.message).toBe('credentials not configured for this user');
  });
  
  it('should list issues successfully', async () => {
    const mockIssues = [
      { id: '1', name: 'Test Issue 1' },
      { id: '2', name: 'Test Issue 2' }
    ];
    const mockFetch = createMockFetch({
      'GET:http://t/api/workspaces/w/issues': { status: 200, body: mockIssues }
    });
    
    const ctx = createMockUserContext({ 
      fetch: mockFetch,
      credentials: {
        plane: {
          url: 'http://t',
          token: 'x',
          workspace: 'w'
        }
      }
    });
    
    const result = await provider.query.listIssues({}, ctx);
    
    expect(result).toEqual(mockIssues);
  });
  
  it('should get issue successfully', async () => {
    const mockIssue = { id: '1', name: 'Test Issue 1', description: 'Test Description' };
    const mockFetch = createMockFetch({
      'GET:http://t/api/workspaces/w/issues/1': { status: 200, body: mockIssue }
    });
    
    const ctx = createMockUserContext({ 
      fetch: mockFetch,
      credentials: {
        plane: {
          url: 'http://t',
          token: 'x',
          workspace: 'w'
        }
      }
    });
    
    const result = await provider.query.getIssue({ id: '1' }, ctx);
    
    expect(result).toEqual(mockIssue);
  });
  
  it('should create issue successfully', async () => {
    const newIssue = { id: '3', name: 'New Issue' };
    const mockFetch = createMockFetch({
      'POST:http://t/api/workspaces/w/issues': { status: 201, body: newIssue }
    });
    
    const ctx = createMockUserContext({ 
      fetch: mockFetch,
      credentials: {
        plane: {
          url: 'http://t',
          token: 'x',
          workspace: 'w'
        }
      }
    });
    
    const result = await provider.mutation.createIssue({ name: 'New Issue' }, ctx);
    
    expect(result).toEqual(newIssue);
  });
  
  it('should have correct widgets', () => {
    expect(provider.widgets).toHaveLength(1);
    expect(provider.widgets[0].id).toBe('plane-issues');
  });
});