// src/providers/adapters/index.ts
import { AdGuardProvider } from './adguard.provider';
import { NtfyProvider } from './ntfy.provider';
import { MemosProvider } from './memos.provider';
import { OllamaProvider } from './ollama.provider';
import { ImmichProvider } from './immich.provider';
import { MinifluxProvider } from './miniflux.provider';
import { PaperlessProvider } from './paperless.provider';
import { StirlingProvider } from './stirling.provider';
import { providerRegistry as registry } from '../registry-singleton';

export { AdGuardProvider, NtfyProvider, MemosProvider, OllamaProvider, ImmichProvider, MinifluxProvider, PaperlessProvider, StirlingProvider };

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

if (!registry.get('immich')) {
  registry.register(new ImmichProvider());
}

if (!registry.get('miniflux')) {
  registry.register(new MinifluxProvider());
}

if (!registry.get('paperless')) {
  registry.register(new PaperlessProvider());
}

if (!registry.get('stirling')) {
  registry.register(new StirlingProvider());
}