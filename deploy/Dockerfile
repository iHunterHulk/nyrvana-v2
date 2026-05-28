# Build stage
FROM oven/bun:1.1.30-alpine as builder

WORKDIR /app
COPY package.json bun.lock ./ 
COPY . .

# Install dependencies and build
RUN bun install --frozen-lockfile
RUN bun run build

# Production stage
FROM oven/bun:1.1.30-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1000 -S bunuser && \
    adduser -u 1000 -S bunuser -G bunuser

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Change ownership to non-root user
RUN chown -R bunuser:bunuser /app
USER bunuser

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3002/api/v2/health || exit 1

# Start the application
CMD ["bun", "dist/server.js"]