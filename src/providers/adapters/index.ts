// src/providers/adapters/index.ts
import { AdGuardProvider } from './adguard.provider';
import { ImmichProvider } from './immich.provider';
import { MemosProvider } from './memos.provider';
import { MinifluxProvider } from './miniflux.provider';
import { NextcloudProvider } from './nextcloud.provider';
import { NtfyProvider } from './ntfy.provider';
import { OllamaProvider } from './ollama.provider';
import { PaperlessProvider } from './paperless.provider';
import { SablierProvider } from './sablier.provider';
import { SearXNGProvider } from './searxng.provider';
import { StirlingProvider } from './stirling.provider';
import { providerRegistry as registry } from '../registry-singleton';

export { AdGuardProvider, ImmichProvider, MemosProvider, MinifluxProvider, NextcloudProvider, NtfyProvider, OllamaProvider, PaperlessProvider, SablierProvider, SearXNGProvider, StirlingProvider };

if (!registry.get('adguard')) { registry.register(new AdGuardProvider()); }
if (!registry.get('immich')) { registry.register(new ImmichProvider()); }
if (!registry.get('memos')) { registry.register(new MemosProvider()); }
if (!registry.get('miniflux')) { registry.register(new MinifluxProvider()); }
if (!registry.get('nextcloud')) { registry.register(new NextcloudProvider()); }
if (!registry.get('ntfy')) { registry.register(new NtfyProvider()); }
if (!registry.get('ollama')) { registry.register(new OllamaProvider()); }
if (!registry.get('paperless')) { registry.register(new PaperlessProvider()); }
if (!registry.get('sablier')) { registry.register(new SablierProvider()); }
if (!registry.get('searxng')) { registry.register(new SearXNGProvider()); }
if (!registry.get('stirling')) { registry.register(new StirlingProvider()); }