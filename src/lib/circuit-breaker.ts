// src/lib/circuit-breaker.ts
export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  timeout: number;
  resetTimeout: number;
}

export class CircuitBreaker {
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private state: CircuitBreakerState = 'closed';
  
  constructor(private config: CircuitBreakerConfig = {
    failureThreshold: 3,
    timeout: 60000, // 1 minute
    resetTimeout: 30000 // 30 seconds
  }) {}
  
  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'open') {
      // Check if timeout has elapsed
      if (Date.now() - this.lastFailureTime >= this.config.timeout) {
        // Move to half-open state
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await fn();
      
      // Success - reset failure count and close circuit
      this.failureCount = 0;
      this.state = 'closed';
      
      return result;
    } catch (error) {
      // Record failure
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      // Check if we should open the circuit
      if (this.failureCount >= this.config.failureThreshold) {
        this.state = 'open';
      }
      
      throw error;
    }
  }
  
  /**
   * Get current state of the circuit breaker
   */
  getState(): CircuitBreakerState {
    return this.state;
  }
  
  /**
   * Get current failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }
  
  /**
   * Reset the circuit breaker to closed state
   */
  reset(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }
}