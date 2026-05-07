FROM oven/bun:1-alpine AS deps
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM deps AS builder
WORKDIR /app
COPY . .
RUN bun run build

FROM oven/bun:1-alpine AS runner
WORKDIR /app

RUN apk add --no-cache curl wget sqlite

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/app/data/app.db

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src/server ./src/server
COPY --from=builder /app/assets ./assets

# Persistent SQLite location — mount a Coolify volume here
RUN mkdir -p /app/data && chown -R bun:bun /app/data
VOLUME /app/data

USER bun
EXPOSE 3000

CMD ["bun", "run", "start"]
