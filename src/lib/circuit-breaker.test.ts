// src/lib/circuit-breaker.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CircuitBreaker } from './circuit-breaker';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;
  
  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      timeout: 100, // 100ms for testing
      resetTimeout: 50 // 50ms for testing
    });
  });
  
  it('should execute successful function calls', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    
    const result = await circuitBreaker.execute(fn);
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(circuitBreaker.getState()).toBe('closed');
    expect(circuitBreaker.getFailureCount()).toBe(0);
  });
  
  it('should track failures and open circuit when threshold is reached', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('failure'));
    
    // First two failures should not open the circuit
    await expect(circuitBreaker.execute(fn)).rejects.toThrow('failure');
    await expect(circuitBreaker.execute(fn)).rejects.toThrow('failure');
    
    expect(circuitBreaker.getState()).toBe('closed');
    expect(circuitBreaker.getFailureCount()).toBe(2);
    
    // Third failure should open the circuit
    await expect(circuitBreaker.execute(fn)).rejects.toThrow('failure');
    
    expect(circuitBreaker.getState()).toBe('open');
    expect(circuitBreaker.getFailureCount()).toBe(3);
  });
  
  it('should reject calls when circuit is open', async () => {
    // Manually set circuit to open state
    (circuitBreaker as any).state = 'open';
    (circuitBreaker as any).lastFailureTime = Date.now() - 50; // Not timed out yet
    
    const fn = vi.fn().mockResolvedValue('success');
    
    await expect(circuitBreaker.execute(fn)).rejects.toThrow('Circuit breaker is open');
    expect(fn).not.toHaveBeenCalled();
  });
  
  it('should move to half-open state after timeout', async () => {
    // Manually set circuit to open state with timeout elapsed
    (circuitBreaker as any).state = 'open';
    (circuitBreaker as any).lastFailureTime = Date.now() - 150; // Timed out
    (circuitBreaker as any).failureCount = 3;
    
    const fn = vi.fn().mockResolvedValue('success');
    
    // This should move to half-open then succeed
    const result = await circuitBreaker.execute(fn);
    
    expect(result).toBe('success');
    expect(circuitBreaker.getState()).toBe('closed');
    expect(circuitBreaker.getFailureCount()).toBe(0);
  });
  
  it('should reset failure count on successful execution', async () => {
    // Set up some failures but not enough to open circuit
    (circuitBreaker as any).failureCount = 2;
    
    const fn = vi.fn().mockResolvedValue('success');
    
    const result = await circuitBreaker.execute(fn);
    
    expect(result).toBe('success');
    expect(circuitBreaker.getState()).toBe('closed');
    expect(circuitBreaker.getFailureCount()).toBe(0);
  });
  
  it('should reset to closed state', () => {
    // Set up some failures
    (circuitBreaker as any).failureCount = 2;
    (circuitBreaker as any).state = 'open';
    
    circuitBreaker.reset();
    
    expect(circuitBreaker.getState()).toBe('closed');
    expect(circuitBreaker.getFailureCount()).toBe(0);
  });
});