# syntax=docker/dockerfile:1
FROM oven/bun:1.4.0 AS base
WORKDIR /app

# Install dependencies - optimized for caching
FROM base AS install
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
COPY packages /temp/prod/packages/
COPY apps /temp/prod/apps/
RUN cd /temp/prod && bun install --frozen-lockfile

# Build stage - only copy what's needed
FROM base AS build
RUN apt-get update && apt-get install -y zip && rm -rf /var/lib/apt/lists/*
COPY --from=install /temp/prod /app
COPY . .
RUN bun run build

# Production runner - minimal final image
FROM base AS runner
WORKDIR /app
COPY --from=build /app .

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

CMD ["bun", "run", "start"]
