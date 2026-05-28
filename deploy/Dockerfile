FROM oven/bun:1.2-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package.json ./
RUN bun install

COPY src ./src
COPY tsconfig.json ./

RUN chown -R bun:bun /app
USER bun

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -fsS http://localhost:3002/api/v2/health || exit 1

CMD ["bun", "src/server.ts"]
