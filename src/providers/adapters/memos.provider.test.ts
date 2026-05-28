// src/providers/adapters/memos.provider.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { MemosProvider } from './memos.provider';
import { createMockUserContext, createMockFetch } from './test-helpers';

describe('MemosProvider', () => {
  let provider: MemosProvider;
  
  beforeEach(() => {
    provider = new MemosProvider();
  });
  
  it('should have correct properties', () => {
    expect(provider.id).toBe('memos');
    expect(provider.name).toBe('Memos');
    expect(provider.category).toBe('notes');
    expect(provider.icon).toBe(' StickyNote');
    expect(provider.authMethod).toBe('api-key');
  });
  
  it('should have correct capabilities', () => {
    expect(provider.capabilities).toContain('read.notes');
    expect(provider.capabilities).toContain('write.notes');
    expect(provider.capabilities).toContain('search.notes.semantic');
  });
  
  it('should pass health check when API is healthy', async () => {
    const mockFetch = createMockFetch({
      'GET:http://localhost:5230/api/v1/status': { status: 200, body: { status: 'OK' } }
    });
    
    const ctx = createMockUserContext({ fetch: mockFetch });
    
    const result = await provider.health(ctx);
    
    expect(result.status).toBe('healthy');
  });
  
  it('should get memos successfully', async () => {
    const mockMemos = [{ id: '1', content: 'Test memo' }];
    const mockFetch = createMockFetch({
      'GET:http://localhost:5230/api/v1/memo?limit=10&offset=0': { status: 200, body: mockMemos }
    });
    
    const ctx = createMockUserContext({ fetch: mockFetch });
    
    const result = await provider.query.getMemos({}, ctx);
    
    expect(result).toEqual(mockMemos);
  });
  
  it('should create memo successfully', async () => {
    const mockMemo = { id: '123', content: 'Test memo', visibility: 'PRIVATE' };
    const mockFetch = createMockFetch({
      'POST:http://localhost:5230/api/v1/memo': { status: 200, body: mockMemo }
    });
    
    const ctx = createMockUserContext({ fetch: mockFetch });
    
    const result = await provider.mutation.createMemo({ content: 'Test memo' }, ctx);
    
    expect(result).toEqual(mockMemo);
  });
  
  it('should update memo successfully', async () => {
    const mockMemo = { id: '123', content: 'Updated memo', visibility: 'PRIVATE' };
    const mockFetch = createMockFetch({
      'PUT:http://localhost:5230/api/v1/memo/123': { status: 200, body: mockMemo }
    });
    
    const ctx = createMockUserContext({ fetch: mockFetch });
    
    const result = await provider.mutation.updateMemo({ id: '123', content: 'Updated memo' }, ctx);
    
    expect(result).toEqual(mockMemo);
  });
  
  it('should delete memo successfully', async () => {
    const mockFetch = createMockFetch({
      'DELETE:http://localhost:5230/api/v1/memo/123': { status: 200, body: {} }
    });
    
    const ctx = createMockUserContext({ fetch: mockFetch });
    
    const result = await provider.mutation.deleteMemo({ id: '123' }, ctx);
    
    expect(result).toEqual({ success: true });
  });
  
  it('should search memos successfully', async () => {
    const mockMemos = [{ id: '1', content: 'Test memo with search term' }];
    const mockFetch = createMockFetch({
      'GET:http://localhost:5230/api/v1/memo?content=search': { status: 200, body: mockMemos }
    });
    
    const ctx = createMockUserContext({ fetch: mockFetch });
    
    const result = await provider.query.searchMemos({ query: 'search' }, ctx);
    
    expect(result).toEqual(mockMemos);
  });
  
  it('should have correct widgets', () => {
    expect(provider.widgets).toHaveLength(2);
    expect(provider.widgets[0].id).toBe('memos-recent');
    expect(provider.widgets[1].id).toBe('memos-search');
  });
  
  it('should index memos correctly', async () => {
    const mockMemos = [
      { 
        id: '1', 
        content: 'Test memo content', 
        createdTs: Math.floor(Date.now() / 1000),
        updatedTs: Math.floor(Date.now() / 1000)
      }
    ];
    
    // Mock the getMemos method to return our test data
    const originalGetMemos = provider.query.getMemos;
    provider.query.getMemos = async () => mockMemos;
    
    const ctx = createMockUserContext();
    
    const results = [];
    for await (const doc of provider.index!(ctx)) {
      results.push(doc);
    }
    
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('memos:memo:1');
    expect(results[0].type).toBe('note');
    expect(results[0].body).toBe('Test memo content');
    
    // Restore original method
    provider.query.getMemos = originalGetMemos;
  });
});