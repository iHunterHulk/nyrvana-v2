// src/providers/adapters/index.ts
import { AdGuardProvider } from './adguard.provider';
import { NtfyProvider } from './ntfy.provider';
import { MemosProvider } from './memos.provider';
import { OllamaProvider } from './ollama.provider';
import { providerRegistry as registry } from '../registry-singleton';

export { AdGuardProvider, NtfyProvider, MemosProvider, OllamaProvider };

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

if (!registry.get('ollama')) {
  registry.register(new OllamaProvider());
}