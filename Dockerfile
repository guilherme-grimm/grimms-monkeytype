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

RUN apk add --no-cache curl wget

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts

USER bun
EXPOSE 3000

CMD ["bun", "run", "start"]
