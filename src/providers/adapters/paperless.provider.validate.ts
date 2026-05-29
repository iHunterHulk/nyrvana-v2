// Validation script to ensure PaperlessProvider implements ServiceProvider correctly
import { PaperlessProvider } from './paperless.provider';
import type { ServiceProvider } from '../types';

// This will cause a compile error if PaperlessProvider doesn't implement ServiceProvider correctly
const provider: ServiceProvider = new PaperlessProvider();

// Output some basic info to verify
console.log('Provider ID:', provider.id);
console.log('Provider Name:', provider.name);
console.log('Provider Category:', provider.category);
console.log('Provider Icon:', provider.icon);
console.log('Provider Auth Method:', provider.authMethod);
console.log('Provider Capabilities:', provider.capabilities);
console.log('Provider Widgets:', provider.widgets);