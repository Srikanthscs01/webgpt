# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.14.2 --activate

# Copy root workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY turbo.json ./

# Copy packages
COPY packages ./packages

# Copy widget app
COPY apps/widget ./apps/widget

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build packages first
RUN pnpm --filter @webgpt/shared build
RUN pnpm --filter @webgpt/ui build

# Build widget
RUN pnpm --filter @webgpt/widget build

# Production stage - serve static files with nginx
FROM nginx:alpine AS production

# Copy built widget files
COPY --from=builder /app/apps/widget/dist /usr/share/nginx/html

# Copy nginx configuration
COPY apps/widget/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]



