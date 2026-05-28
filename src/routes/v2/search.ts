import { Elysia, t } from 'elysia';
import { requireUser } from '../../middleware/requireUser';
import { providerRegistry } from '../../providers/registry-singleton';
import type { UserContext } from '../../providers/types';

const search = new Elysia({ prefix: '/api/v2/search' })
  .post(
    '/',
    async ({ body, set, headers }) => {
      const ollama = providerRegistry.get('ollama');
      if (!ollama || !ollama.mutation || !ollama.mutation['chat']) {
        set.status = 500;
        return { error: 'Ollama provider not available or does not support chat' };
      }

      // Create a mock context for testing purposes
      // In a real implementation, this would come from the authenticated user context
      const mockContext: UserContext = {
        userId: headers['x-nyrvana-user-id'] || 'test-user',
        wrappedDEK: '',
        oidcToken: '',
        fetch: fetch,
        logger: {
          info: console.info,
          warn: console.warn,
          error: console.error,
          debug: console.debug
        },
        audit: async () => {}
      };

      // Build a tool-spec from the registry
      const registry = providerRegistry.list();
      const toolSpecs: Record<string, string[]> = {};
      
      for (const provider of registry) {
        const queryOps = Object.keys(provider.query || {});
        if (queryOps.length > 0) {
          toolSpecs[provider.id] = queryOps;
        }
      }

      // Format the tool specs for the prompt
      const toolSpecString = Object.entries(toolSpecs)
        .map(([id, ops]) => `${id}: ${ops.join(', ')}`)
        .join('\n');

      // Send a system + user prompt to ollama chat (non-streaming)
      try {
        // Check if mutation and chat exist before calling
        if (!ollama.mutation || !ollama.mutation['chat']) {
          throw new Error('Ollama provider does not support chat mutation');
        }

        const response = await ollama.mutation['chat'](
          {
            model: process.env['NYRVANA_LLM_MODEL'],
            messages: [
              {
                role: 'system',
                content: 'You are a router. Given the user\'s query and the list of available adapter ops, choose at most one to call, with arguments. Reply as JSON: {"adapter":"<id>","op":"<op>","args":{...}} OR {"result":"no-route"}.'
              },
              {
                role: 'user',
                content: `Query: ${body.query}\n\nAvailable operations:\n${toolSpecString}`
              }
            ]
          }, 
          mockContext
        );

        // Type assertion for the response
        const typedResponse = response as { message?: { content: string } };
        if (!typedResponse.message?.content) {
          throw new Error('Invalid response from Ollama');
        }

        // Parse the JSON reply
        let routingDecision: { adapter?: string; op?: string; args?: Record<string, unknown>; result?: string };
        try {
          routingDecision = JSON.parse(typedResponse.message.content);
        } catch (parseError) {
          throw new Error('Failed to parse routing decision from Ollama');
        }

        // If no-route, return empty results
        if (routingDecision.result === 'no-route') {
          return { results: [], reason: 'no-route' };
        }

        // Otherwise call the provider's query op
        if (routingDecision.adapter && routingDecision.op) {
          const targetProvider = providerRegistry.get(routingDecision.adapter);
          if (!targetProvider) {
            throw new Error(`Provider ${routingDecision.adapter} not found`);
          }

          if (!targetProvider.query || !targetProvider.query[routingDecision.op]) {
            throw new Error(`Operation ${routingDecision.op} not found for provider ${routingDecision.adapter}`);
          }

          // Get the query function
          const queryFn = targetProvider.query[routingDecision.op] as (params: unknown, ctx: UserContext) => Promise<unknown>;
          if (!queryFn) {
            throw new Error(`Operation ${routingDecision.op} not found for provider ${routingDecision.adapter}`);
          }

          const results = await queryFn(
            routingDecision.args || {},
            mockContext
          );

          return { results, adapter: routingDecision.adapter, op: routingDecision.op };
        }

        // If we get here, the routing decision was malformed
        throw new Error('Invalid routing decision from Ollama');
      } catch (error: unknown) {
        console.error('Search routing error:', error);
        set.status = 500;
        return { error: (error as Error).message || 'Unknown error' };
      }
    },
    {
      body: t.Object({
        query: t.String()
      }),
      beforeHandle: requireUser
    }
  );

export { search };