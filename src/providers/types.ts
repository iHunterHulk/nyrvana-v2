// src/providers/types.ts
export type ProviderCategory =
  | 'photos' | 'files' | 'notes' | 'docs' | 'feeds'
  | 'tasks' | 'passwords' | 'media' | 'automations'
  | 'monitoring' | 'auth' | 'analytics' | 'other';

export type Capability =
  | 'read.photos' | 'write.photos' | 'search.photos.semantic'
  | 'read.files' | 'write.files'
  | 'read.notes' | 'write.notes'
  | 'read.docs' | 'write.docs' | 'ocr.docs'
  | 'read.feeds' | 'mark.feeds'
  | 'execute.workflow'
  | 'embed.editor' /* deep-link, not iframe */
  | string;

export interface UserContext {
  userId: string;
  /** per-adapter decrypted credentials loaded by createUserContext */
  credentials: Record<string, unknown>;
  /** wrapped DEK for this provider; unwrap inside provider with crypto helper */
  wrappedDEK: string;
  /** OIDC access token forwarded from Authelia */
  oidcToken: string;
  /** keep-alive pool */
  fetch: typeof fetch;
  /** structured logger with userId+requestId baked in */
  logger: Logger;
  /** audit log writer */
  audit: (event: AuditEvent) => Promise<void>;
}

export interface IndexableDocument {
  id: string;        // 'memos:note:<uid>'
  type: string;      // 'note', 'photo', 'doc'
  userId: string;
  title?: string;
  body?: string;
  url: string;       // deep-link back to native UI / our shell
  createdAt: string;
  updatedAt: string;
  embedding?: number[];  // 768-dim from nomic-embed-text
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  latencyMs?: number;
  message?: string;
}

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  configSchema?: Record<string, unknown>;
}

export interface Logger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
  debug: (message: string, meta?: Record<string, unknown>) => void;
}

export interface AuditEvent {
  action: string;
  resource: string;
  metadata?: Record<string, unknown>;
}// src/providers/types.ts (continued)
export interface ServiceProvider {
  /** Stable identifier; used in URLs, audit log, provider registry */
  id: string;
  name: string;
  category: ProviderCategory;
  icon: string;  // Lucide name
  
  capabilities: Capability[];
  
  authMethod: 'oidc' | 'oidc-with-token' | 'api-key' | 'basic' | 'header';
  
  /** Liveness check; called by /api/health */
  health(ctx: UserContext): Promise<HealthStatus>;
  
  /** Read-only operations; cached by API layer */
  query: Record<string, (params: unknown, ctx: UserContext) => Promise<unknown>>;
  
  /** State-changing operations; idempotency-key-aware */
  mutation: Record<string, (params: unknown, ctx: UserContext) => Promise<unknown>>;
  
  /** Real-time event stream; emits to SSE via API layer */
  subscribe?(op: string, params: unknown, ctx: UserContext): AsyncIterable<unknown>;
  
  /** For deep-link providers, returns a same-origin URL with SSO session preserved */
  deepLink?(view: string, params: unknown, ctx: UserContext): string;
  
  /** For unified search; iterator over user's content for indexing */
  index?(ctx: UserContext): AsyncIterable<IndexableDocument>;
  
  /** Erasure: called on user account deletion */
  erase?(ctx: UserContext): Promise<{ residuals: string[] }>;
  
  /** Quota: returns user's used bytes for this service */
  usage?(ctx: UserContext): Promise<{ usedBytes: number; quotaBytes?: number }>;
  
  /** Widget definitions; auto-registered into marketplace */
  widgets: WidgetDefinition[];
}