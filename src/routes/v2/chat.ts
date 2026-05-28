import { Elysia, t } from 'elysia';
import { requireUser } from '../../middleware/requireUser';
import { providerRegistry } from '../../providers/registry-singleton';
import type { ServiceProvider, UserContext } from '../../providers/types';
import { createUserContext } from '../../lib/user-context';

const chat = new Elysia({ prefix: '/api/v2/chat' })
  .post(
    '/',
    async ({ body, set, headers }) => {
      const ollama = providerRegistry.get('ollama');
      if (!ollama) {
        set.status = 500;
        return { error: 'Ollama provider not available' };
      }

      // Type assertion for the ollama provider
      const typedOllama = ollama as ServiceProvider & { 
        subscribe?: (op: string, params: unknown, ctx: UserContext) => AsyncIterable<unknown> 
      };

      if (!typedOllama.subscribe) {
        set.status = 500;
        return { error: 'Ollama provider does not support streaming' };
      }

      set.headers['Content-Type'] = 'text/event-stream';
      set.headers['Cache-Control'] = 'no-cache';
      set.headers['Connection'] = 'keep-alive';

      // Create user context using the factory
      const context = createUserContext({ headers });

      return new Response(
        new ReadableStream({
          async start(controller) {
            try {
              // Check if subscribe method exists before calling it
              const subscribeFn = typedOllama.subscribe;
              if (!subscribeFn) {
                throw new Error('Ollama provider does not support streaming');
              }

              const stream = subscribeFn('chat', {
                model: body.model || process.env['NYRVANA_LLM_MODEL'],
                messages: body.messages
              }, context);

              const encoder = new TextEncoder();
              for await (const delta of stream) {
                // Type assertion for the delta object
                const typedDelta = delta as { content: string };
                if (typedDelta && typedDelta.content) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: typedDelta.content })}\n\n`));
                }
              }

              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            } catch (error: unknown) {
              console.error('Chat stream error:', error);
              const encoder = new TextEncoder();
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: (error as Error).message || 'Unknown error' })}\n\n`));
              controller.close();
            }
          }
        }),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          }
        }
      );
    },
    {
      body: t.Object({
        messages: t.Array(
          t.Object({
            role: t.String(),
            content: t.String()
          })
        ),
        model: t.Optional(t.String())
      }),
      beforeHandle: requireUser
    }
  );

export { chat };