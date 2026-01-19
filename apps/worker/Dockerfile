# Build stage
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.14.2 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps/worker/package.json ./apps/worker/
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/shared ./packages/shared
COPY apps/api/prisma ./apps/api/prisma
COPY apps/worker ./apps/worker

# Generate Prisma client
RUN pnpm --filter @webgpt/api prisma generate

# Build packages
RUN pnpm --filter @webgpt/shared build
RUN pnpm --filter @webgpt/worker build

# Production stage
FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.14.2 --activate

WORKDIR /app

ENV NODE_ENV=production

# Copy built application
COPY --from=builder /app/apps/worker/dist ./dist
COPY --from=builder /app/apps/worker/package.json ./
COPY --from=builder /app/apps/worker/node_modules ./node_modules
COPY --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 worker
RUN chown -R worker:nodejs /app
USER worker

CMD ["node", "dist/main.js"]



