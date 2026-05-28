import { Elysia } from 'elysia';
import './providers/adapters';
import { health } from './routes/v2/health';
import { providers } from './routes/v2/providers';
import { chat } from './routes/v2/chat';
import { search } from './routes/v2/search';
import { models } from './routes/v2/models';
import { auth } from './routes/v2/auth';
import { credentials } from './routes/v2/credentials';

const app = new Elysia()
  .use(health)
  .use(providers)
  .use(chat)
  .use(search)
  .use(models)
  .use(auth)
  .use(credentials)
  .listen(3002);

console.log(`Nyrvana V2 server running on port 3002`);

export type App = typeof app;