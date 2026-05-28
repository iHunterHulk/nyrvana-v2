// src/providers/adapters/nextcloud.provider.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextcloudProvider } from './nextcloud.provider';
import { createMockUserContext, createMockFetch } from './test-helpers';

describe('NextcloudProvider', () => {
  let provider: NextcloudProvider;
  let mockFetch: ReturnType<typeof createMockFetch>;
  
  beforeEach(() => {
    provider = new NextcloudProvider();
    mockFetch = createMockFetch({});
  });
  
  it('should have correct properties', () => {
    expect(provider.id).toBe('nextcloud');
    expect(provider.name).toBe('Nextcloud');
    expect(provider.category).toBe('files');
    expect(provider.icon).toBe('cloud');
    expect(provider.authMethod).toBe('basic');
  });
  
  it('should have correct capabilities', () => {
    expect(provider.capabilities).toContain('read.files');
    expect(provider.capabilities).toContain('write.files');
  });
  
  it('should pass health check when API is healthy', async () => {
    const mockFetch = createMockFetch({
      'GET:http://localhost:8080/ocs/v2.php/cloud/capabilities?format=json': { status: 200, body: { ocs: { meta: { status: 'ok' } } } }
    });
    
    const ctx = createMockUserContext({ 
      fetch: mockFetch as any,
      credentials: {
        nextcloud: {
          url: 'http://localhost:8080',
          user: 'admin',
          pass: 'secret'
        }
      }
    });
    
    const result = await provider.health(ctx);
    
    expect(result.status).toBe('healthy');
  });
  
  it('should fail health check when credentials are missing', async () => {
    const ctx = createMockUserContext({
      credentials: {}
    });
    
    const result = await provider.health(ctx);
    
    expect(result.status).toBe('down');
    expect(result.message).toBe('credentials not configured for this user');
  });
  
  it('should list files successfully', async () => {
    const mockFiles = { files: [{ name: 'test.txt', type: 'file' }] };
    const mockFetch = createMockFetch({
      'PROPFIND:http://localhost:8080/remote.php/webdav/': { status: 200, body: mockFiles }
    });
    
    const ctx = createMockUserContext({ 
      fetch: mockFetch as any,
      credentials: {
        nextcloud: {
          url: 'http://localhost:8080',
          user: 'admin',
          pass: 'secret'
        }
      }
    });
    
    const result = await provider.query.listFiles({}, ctx);
    
    expect(result).toEqual(mockFiles);
  });
  
  it('should get shares successfully', async () => {
    const mockShares = { ocs: { data: [{ id: '1', path: '/test' }] } };
    const mockFetch = createMockFetch({
      'GET:http://localhost:8080/ocs/v2.php/apps/files_sharing/api/v1/shares?format=json': { status: 200, body: mockShares }
    });
    
    const ctx = createMockUserContext({ 
      fetch: mockFetch as any,
      credentials: {
        nextcloud: {
          url: 'http://localhost:8080',
          user: 'admin',
          pass: 'secret'
        }
      }
    });
    
    const result = await provider.query.getShares({}, ctx);
    
    expect(result).toEqual(mockShares);
  });
  
  it('should get quota successfully', async () => {
    const mockQuota = { 
      ocs: { 
        data: { 
          quota: { 
            free: 1000000, 
            used: 500000, 
            total: 1500000, 
            relative: 33 
          } 
        } 
      } 
    };
    const mockFetch = createMockFetch({
      'GET:http://localhost:8080/ocs/v2.php/cloud/users/admin?format=json': { status: 200, body: mockQuota }
    });
    
    const ctx = createMockUserContext({ 
      fetch: mockFetch as any,
      credentials: {
        nextcloud: {
          url: 'http://localhost:8080',
          user: 'admin',
          pass: 'secret'
        }
      }
    });
    
    const result = await provider.query.getQuota({}, ctx);
    
    expect(result).toEqual(mockQuota.ocs.data.quota);
  });
  
  it('should have correct widgets', () => {
    expect(provider.widgets).toHaveLength(1);
    expect(provider.widgets[0].id).toBe('nextcloud-storage');
  });
});