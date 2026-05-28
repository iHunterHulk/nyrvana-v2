// src/providers/adapters/index.ts
import { AdGuardProvider } from './adguard.provider';
import { NtfyProvider } from './ntfy.provider';
import { MemosProvider } from './memos.provider';
import { providerRegistry as registry } from '../registry-singleton';

export { AdGuardProvider, NtfyProvider, MemosProvider };

// Auto-register providers on import
// Only register if not already registered (for testing purposes)
if (!registry.get('adguard')) {
  registry.register(new AdGuardProvider());
}

if (!registry.get('ntfy')) {
  registry.register(new NtfyProvider());
}

if (!registry.get('memos')) {
  registry.register(new MemosProvider());
}