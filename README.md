# Nyrvana V2

Nyrvana V2 is the next generation of the personal knowledge hub, rebuilt with a focus on privacy, performance, and extensibility. This backend service provides a unified API layer over multiple self-hosted services using the provider/adapter pattern.

## Purpose

Nyrvana V2 serves as the central API layer for a self-hosted super-app that integrates ~14 open-source services (Immich, Nextcloud, Memos, Miniflux, Paperless, etc.) into a single cohesive experience. It provides:

- Unified API access to all integrated services
- Per-user encryption at rest with audit capabilities
- Real-time data synchronization
- AI-powered features
- Mobile-ready API

For detailed architecture, see [ARCHITECTURE-V2.md](/host/nyrvana/docs/ARCHITECTURE-V2.md)

## Prerequisites

- Bun v1.0+
- Node.js 18+ (for development tools)

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/iHunterHulk/nyrvana-v2.git
   cd nyrvana-v2
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Copy and configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

## Development

Start the development server with hot reloading:
```bash
bun run dev
```

Run tests:
```bash
bun test
```

Run tests with coverage:
```bash
bun run test:coverage
```

Type checking:
```bash
bun run typecheck
```

## Project Structure

```
src/
├── server.ts          # Elysia application entry point
├── providers/         # Service provider implementations
├── routes/            # API route handlers
├── middleware/        # Authentication and other middleware
├── lib/               # Shared utilities and services
└── types/             # Shared TypeScript types
```

## API Documentation

The API is documented with OpenAPI/Swagger. When the server is running, visit `/swagger` for interactive documentation.

## Testing

Tests are written with Vitest and can be run with:
```bash
bun test
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## Production

For production deployment, you can use PM2 process manager with the provided ecosystem configuration:

```bash
# Start the application
pm2 start ecosystem.config.cjs

# View application logs
pm2 logs nyrvana-v2

# Restart the application
pm2 restart nyrvana-v2
```

Note: PM2 must be installed globally first (`npm install -g pm2`).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.