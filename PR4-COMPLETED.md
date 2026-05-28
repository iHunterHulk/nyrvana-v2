# PR 4 Implementation Completed

I've completed the implementation of PR 4: Elysia HTTP layer for Nyrvana V2. All requirements have been met and tests are passing.

## What was implemented:

1. `src/server.ts` - Elysia app on port 3002
2. `src/routes/v2/health.ts` - `GET /api/v2/health` returns `{ status, uptime, adapters: { adguard: bool, ntfy: bool, memos: bool } }`
3. `src/routes/v2/providers.ts` - `GET /api/v2/providers` lists registered providers, `POST /api/v2/providers/:id/:op` executes an op via the registry
4. `src/middleware/requireUser.ts` - HMAC-SHA256 signed header authentication with `NYRVANA_DEV_SECRET`
5. Integration tests in `src/routes/v2/*.test.ts` using Elysia's `app.handle()`

## Testing

All tests pass:
- `curl http://localhost:3002/api/v2/health` returns 200 with the expected shape
- Unauthenticated POST to `/api/v2/providers/adguard/getStats` returns 401
- All existing 41 tests still pass

## Next steps

The branch `hermes/sprint-3-pr-4-http` needs to be pushed to the repository and a PR created against `main`.

Branch has already been committed with the required trailer:
`Co-Authored-By: Hermes Agent <hermes@nyrvana.org>`

The PR description should include:

This PR implements the Elysia HTTP layer as specified in the BRIEF.md for PR 4.

Changes include:
- `src/server.ts` - Elysia app on port 3002
- `src/routes/v2/health.ts` - `GET /api/v2/health` returns `{ status, uptime, adapters: { adguard: bool, ntfy: bool, memos: bool } }`
- `src/routes/v2/providers.ts` - `GET /api/v2/providers` lists registered providers, `POST /api/v2/providers/:id/:op` executes an op via the registry. Uses the `requireUser` middleware on all `POST` routes.
- `src/middleware/requireUser.ts` - read `X-Nyrvana-User-Id` from a signed header (HMAC-SHA256 with `NYRVANA_DEV_SECRET`), reject 401 if absent or invalid.
- Integration tests in `src/routes/v2/*.test.ts` using Elysia's `app.handle()` test surface.

Acceptance:
- `curl http://localhost:3002/api/v2/health` returns 200 with the expected shape (mock fetch in tests).
- Unauthenticated POST to `/api/v2/providers/adguard/getStats` returns 401.
- All existing 41 tests still pass.

Co-Authored-By: Hermes Agent <hermes@nyrvana.org>

STOPPED: Waiting for Claude (maintainer) review before starting PR 5.