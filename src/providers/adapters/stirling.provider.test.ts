// src/providers/adapters/stirling.provider.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { StirlingProvider } from './stirling.provider';
import { createMockUserContext, createMockFetch } from './test-helpers';

describe('StirlingProvider', () => {
  let provider: StirlingProvider;
  
  beforeEach(() => {
    provider = new StirlingProvider();
  });
  
  it('should have correct properties', () => {
    expect(provider.id).toBe('stirling');
    expect(provider.name).toBe('Stirling PDF');
    expect(provider.category).toBe('docs');
    expect(provider.icon).toBe('file');
    expect(provider.authMethod).toBe('api-key');
  });
  
  it('should have correct capabilities', () => {
    expect(provider.capabilities).toContain('write.docs.convert');
    expect(provider.capabilities).toContain('read.docs.info');
  });
  
  it('should pass health check when API is healthy', async () => {
    const mockFetch = createMockFetch({
      'GET:http://t/api/v1/info': { status: 200, body: { version: '1.0.0' } }
    });
    
    const ctx = createMockUserContext({ 
      fetch: mockFetch,
      credentials: {
        stirling: {
          url: 'http://t'
        }
      }
    });
    
    const result = await provider.health(ctx);
    
    expect(result.status).toBe('healthy');
  });
  
  it('should get info successfully', async () => {
    const mockInfo = { version: '1.0.0', features: ['convert', 'merge'] };
    const mockFetch = createMockFetch({
      'GET:http://t/api/v1/info': { status: 200, body: mockInfo }
    });
    
    const ctx = createMockUserContext({ 
      fetch: mockFetch,
      credentials: {
        stirling: {
          url: 'http://t'
        }
      }
    });
    
    const result = await provider.query.getInfo({}, ctx);
    
    expect(result).toEqual(mockInfo);
  });
  
  it('should convert file to PDF successfully', async () => {
    const mockResult = { pdfUrl: 'http://t/output.pdf', jobId: '123' };
    const mockFetch = createMockFetch({
      'POST:http://t/api/v1/convert': { status: 200, body: mockResult }
    });
    
    const ctx = createMockUserContext({ 
      fetch: mockFetch,
      credentials: {
        stirling: {
          url: 'http://t'
        }
      }
    });
    
    const result = await provider.mutation.convertToPdf({ 
      fileUrl: 'http://example.com/document.docx'
    }, ctx);
    
    expect(result).toEqual(mockResult);
  });
  
  it('should have correct widgets', () => {
    expect(provider.widgets).toHaveLength(1);
    expect(provider.widgets[0].id).toBe('stirling-conversion-stats');
  });
});