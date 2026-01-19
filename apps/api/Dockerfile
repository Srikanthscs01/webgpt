# Build stage
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat python3 make g++ openssl

# Enable corepack for pnpm
RUN corepack enable

WORKDIR /app

# Copy root package files first
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.json ./

# Copy all package.json files for workspace packages
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/

# Install all dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source files
COPY packages/shared ./packages/shared
COPY packages/ui ./packages/ui
COPY apps/api ./apps/api

# Generate Prisma client first
WORKDIR /app/apps/api
RUN npx prisma generate

# Build shared package
WORKDIR /app
RUN pnpm --filter @webgpt/shared build || echo "Shared build warning - continuing"

# Build API
RUN pnpm --filter @webgpt/api build

# Production stage
FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat curl openssl

WORKDIR /app

ENV NODE_ENV=production

# Copy the entire built application
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/node_modules ./root_modules

# Merge node_modules
RUN cp -r ./root_modules/.pnpm ./node_modules/.pnpm 2>/dev/null || true
RUN cp -r ./root_modules/@webgpt ./node_modules/@webgpt 2>/dev/null || true
RUN cp -r ./root_modules/@prisma ./node_modules/@prisma 2>/dev/null || true
RUN cp -r ./root_modules/.prisma ./node_modules/.prisma 2>/dev/null || true
RUN rm -rf ./root_modules

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs
RUN chown -R nestjs:nodejs /app
USER nestjs

EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/api/v1/health || exit 1

CMD ["node", "dist/main.js"]
