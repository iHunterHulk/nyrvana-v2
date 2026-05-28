// src/providers/adapters/test-helpers.ts
import type { UserContext, Logger, AuditEvent } from '../types';

export const createMockUserContext = (overrides: Partial<UserContext> = {}): UserContext => ({
  userId: 'test-user',
  wrappedDEK: 'test-dek',
  oidcToken: 'test-token',
  fetch: fetch,
  logger: createMockLogger(),
  audit: async (_event: AuditEvent) => {},
  credentials: {},
  ...overrides
});

export const createMockLogger = (): Logger => ({
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {}
});

export const createMockFetch = (responses: Record<string, { status: number, body: any }>) => {
  return async (url: string, options?: RequestInit) => {
    const key = `${options?.method || 'GET'}:${url}`;
    const response = responses[key] || responses[url] || { status: 200, body: {} };
    
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      json: async () => response.body,
      text: async () => JSON.stringify(response.body)
    } as unknown as Response;
  };
};