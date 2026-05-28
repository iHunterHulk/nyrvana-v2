// src/providers/registry.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProviderRegistry } from './registry';
import type { ServiceProvider, HealthStatus } from './types';

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;
  
  beforeEach(() => {
    registry = new ProviderRegistry();
  });
  
  afterEach(() => {
    registry.clear();
  });
  
  it('should register a provider', () => {
    const mockProvider: ServiceProvider = {
      id: 'test-provider',
      name: 'Test Provider',
      category: 'other',
      icon: 'test',
      capabilities: ['read.notes'],
      authMethod: 'api-key',
      health: async () => ({ status: 'healthy' }),
      query: {},
      mutation: {},
      widgets: []
    };
    
    registry.register(mockProvider);
    
    expect(registry.get('test-provider')).toBe(mockProvider);
  });
  
  it('should throw error when registering duplicate provider ID', () => {
    const mockProvider: ServiceProvider = {
      id: 'test-provider',
      name: 'Test Provider',
      category: 'other',
      icon: 'test',
      capabilities: ['read.notes'],
      authMethod: 'api-key',
      health: async () => ({ status: 'healthy' }),
      query: {},
      mutation: {},
      widgets: []
    };
    
    registry.register(mockProvider);
    
    expect(() => {
      registry.register(mockProvider);
    }).toThrow('Provider with id \'test-provider\' is already registered');
  });
  
  it('should list all registered providers', () => {
    const mockProvider1: ServiceProvider = {
      id: 'provider-1',
      name: 'Provider 1',
      category: 'other',
      icon: 'test1',
      capabilities: ['read.notes'],
      authMethod: 'api-key',
      health: async () => ({ status: 'healthy' }),
      query: {},
      mutation: {},
      widgets: []
    };
    
    const mockProvider2: ServiceProvider = {
      id: 'provider-2',
      name: 'Provider 2',
      category: 'other',
      icon: 'test2',
      capabilities: ['read.files'],
      authMethod: 'api-key',
      health: async () => ({ status: 'healthy' }),
      query: {},
      mutation: {},
      widgets: []
    };
    
    registry.register(mockProvider1);
    registry.register(mockProvider2);
    
    const providers = registry.list();
    expect(providers).toHaveLength(2);
    expect(providers).toContain(mockProvider1);
    expect(providers).toContain(mockProvider2);
  });
  
  it('should return undefined for non-existent provider', () => {
    expect(registry.get('non-existent')).toBeUndefined();
  });
  
  it('should check health of all providers', async () => {
    const healthyProvider: ServiceProvider = {
      id: 'healthy-provider',
      name: 'Healthy Provider',
      category: 'other',
      icon: 'healthy',
      capabilities: ['read.notes'],
      authMethod: 'api-key',
      health: async () => ({ status: 'healthy' }),
      query: {},
      mutation: {},
      widgets: []
    };
    
    const unhealthyProvider: ServiceProvider = {
      id: 'unhealthy-provider',
      name: 'Unhealthy Provider',
      category: 'other',
      icon: 'unhealthy',
      capabilities: ['read.files'],
      authMethod: 'api-key',
      health: async () => ({ status: 'down' }),
      query: {},
      mutation: {},
      widgets: []
    };
    
    const errorProvider: ServiceProvider = {
      id: 'error-provider',
      name: 'Error Provider',
      category: 'other',
      icon: 'error',
      capabilities: ['read.photos'],
      authMethod: 'api-key',
      health: async () => { throw new Error('Health check failed'); },
      query: {},
      mutation: {},
      widgets: []
    };
    
    registry.register(healthyProvider);
    registry.register(unhealthyProvider);
    registry.register(errorProvider);
    
    const healthResults = await registry.healthAll();
    
    expect(healthResults['healthy-provider']).toBe(true);
    expect(healthResults['unhealthy-provider']).toBe(false);
    expect(healthResults['error-provider']).toBe(false);
  });
});