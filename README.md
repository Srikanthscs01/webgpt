# WebGPT

A production-ready, multi-tenant website-trained chatbot platform using RAG (Retrieval-Augmented Generation).

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              WebGPT Platform                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │   Admin UI   │    │   Widget     │    │  External    │                  │
│  │  (Next.js)   │    │   (React)    │    │   Clients    │                  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                  │
│         │                   │                   │                           │
│         └───────────────────┼───────────────────┘                           │
│                             │                                                │
│                    ┌────────▼────────┐                                      │
│                    │    NestJS API    │                                      │
│                    │   (REST + SSE)   │                                      │
│                    └────────┬────────┘                                      │
│                             │                                                │
│         ┌───────────────────┼───────────────────┐                           │
│         │                   │                   │                           │
│  ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐                     │
│  │   Postgres   │    │    Redis    │    │   Worker    │                     │
│  │  + pgvector  │    │  + BullMQ   │    │  (BullMQ)   │                     │
│  └─────────────┘    └─────────────┘    └─────────────┘                     │
│                                                                              │
│                    ┌─────────────────┐                                      │
│                    │    OpenAI API    │                                      │
│                    │ (embeddings+chat)│                                      │
│                    └─────────────────┘                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

Data Flow:
──────────

1. INGESTION                    2. RETRIEVAL                  3. CHAT
   Website → Crawler              User Query                    Query + Context
       ↓         ↓                    ↓                             ↓
   Sitemap    robots.txt          Embedding                      LLM (GPT-4o)
       ↓                              ↓                             ↓
   HTML/PDF → Parser              Vector Search                 Response + Citations
       ↓                              ↓
   Chunks → Embeddings            FTS Search
       ↓                              ↓
   Vector DB                      Hybrid Merge
                                      ↓
                                  Context
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Monorepo | pnpm workspaces + Turborepo |
| Backend | NestJS (Node.js + TypeScript) |
| Database | PostgreSQL + pgvector |
| Cache/Queue | Redis + BullMQ |
| ORM | Prisma |
| Admin App | Next.js (App Router) + Tailwind + shadcn/ui |
| Widget | Vite + React + TypeScript |
| Auth | NextAuth (admin) + JWT + API keys |
| LLM | OpenAI (GPT-4o-mini, text-embedding-3-small) |
| Observability | OpenTelemetry + Pino + Prometheus metrics |

## Project Structure

```
webGpt/
├── apps/
│   ├── api/          # NestJS REST API
│   ├── worker/       # BullMQ job workers
│   ├── admin/        # Next.js admin portal
│   └── widget/       # Embeddable chat widget
├── packages/
│   ├── shared/       # Types, validators, utilities
│   └── ui/           # Shared UI components (shadcn/ui)
├── infra/
│   ├── docker-compose.local.yml
│   ├── docker-compose.prod.example.yml
│   └── nginx/
├── README.md
└── SECURITY.md
```

## Prerequisites

- Node.js 20+
- pnpm 8+
- Docker & Docker Compose
- OpenAI API key

## Quick Start

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd webGpt
pnpm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example.txt .env

# Edit .env with your values:
# - DATABASE_URL
# - REDIS_URL
# - OPENAI_API_KEY
# - NEXTAUTH_SECRET
# - SEED_OWNER_EMAIL
# - SEED_OWNER_PASSWORD
```

### 3. Start Infrastructure

```bash
cd infra
docker compose -f docker-compose.local.yml up -d
```

### 4. Database Setup

```bash
cd apps/api

# Generate Prisma client
pnpm prisma generate

# Run migrations
pnpm prisma migrate deploy

# Seed initial data (creates owner user)
pnpm prisma db seed
```

### 5. Start Development Servers

```bash
# From root directory
pnpm dev
```

This starts:
- API: http://localhost:3001
- Admin: http://localhost:3000
- Widget dev: http://localhost:5173

### 6. Login to Admin

Open http://localhost:3000 and login with:
- Email: (SEED_OWNER_EMAIL from .env)
- Password: (SEED_OWNER_PASSWORD from .env)

## Creating Your First Site

### 1. Create a Site

1. Go to **Sites** in the admin portal
2. Click **Add Site**
3. Enter:
   - Name: "My Documentation"
   - Base URL: https://docs.example.com
4. Configure crawl settings:
   - Max pages: 100
   - Max depth: 5
   - Respect robots.txt: Yes
5. Click **Create**

### 2. Start Crawling

1. On the site card, click **Start Crawl**
2. Monitor progress in the crawl history
3. Wait for status to change to "Ready"

### 3. Test Chat

1. Go to **Chat Testing** in the admin portal
2. Select your site
3. Ask a question about your site's content
4. View citations and retrieved chunks

## Embedding the Widget

### 1. Configure Widget

1. Go to **Sites** → select your site
2. Click **Widget Settings**
3. Configure:
   - Theme colors
   - Greeting message
   - Allowed domains
   - Rate limits

### 2. Get Embed Code

```html
<script>
  window.webGptConfig = {
    siteKey: 'YOUR_SITE_KEY',
    apiUrl: 'https://your-api-domain.com'
  };
</script>
<script src="https://your-cdn.com/widget.js" async></script>
```

### 3. Add to Your Website

Paste the embed code before the closing `</body>` tag on your website.

## API Keys

For server-to-server integrations:

1. Go to **API Keys** in admin
2. Click **Create API Key**
3. Copy the key (shown only once!)
4. Use in requests:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://api.example.com/sites
```

## Development

### Building Packages

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @webgpt/shared build
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific package tests
pnpm --filter @webgpt/shared test
```

### Linting

```bash
pnpm lint
pnpm lint:fix
```

### Type Checking

```bash
pnpm typecheck
```

## Troubleshooting

### pgvector Extension Not Found

```sql
-- Connect to your database and run:
CREATE EXTENSION IF NOT EXISTS vector;
```

### Redis Connection Issues

```bash
# Check Redis is running
docker ps | grep redis

# Test connection
redis-cli ping
```

### OpenAI API Errors

1. Verify `OPENAI_API_KEY` is set correctly
2. Check API key has sufficient credits
3. Verify rate limits aren't exceeded

### Migration Issues

```bash
# Reset database (development only!)
pnpm prisma migrate reset

# Force push schema (dangerous!)
pnpm prisma db push --force-reset
```

### Build Errors

```bash
# Clear caches
pnpm clean
rm -rf node_modules
pnpm install
pnpm build
```

## Production Deployment

### 1. Build Images

```bash
# Build all Docker images
docker compose -f infra/docker-compose.prod.example.yml build
```

### 2. Configure Production Environment

Create production `.env` with:
- Strong secrets
- Production database URL
- Redis cluster URL
- CDN URLs for widget

### 3. Deploy

```bash
docker compose -f infra/docker-compose.prod.example.yml up -d
```

### 4. Run Migrations

```bash
docker compose exec api pnpm prisma migrate deploy
```

## Scaling Notes

### Multiple Workers

Scale crawling and embedding capacity:

```bash
docker compose up -d --scale worker=4
```

### Vector Index Tuning

For large datasets (>100k chunks), tune HNSW index:

```sql
-- Increase lists for better recall
DROP INDEX IF EXISTS chunks_embedding_idx;
CREATE INDEX chunks_embedding_idx ON "Chunk" 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

### Connection Pooling

Use PgBouncer for production:

```yaml
services:
  pgbouncer:
    image: edoburu/pgbouncer
    environment:
      DATABASE_URL: postgres://...
      POOL_MODE: transaction
```

### Redis Cluster

For high availability:

```yaml
services:
  redis:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes
```

## Security

See [SECURITY.md](./SECURITY.md) for:
- Security practices
- Vulnerability reporting
- Data handling policies

## License

MIT

## Support

- Documentation: [docs.webgpt.example.com](https://docs.webgpt.example.com)
- Issues: [GitHub Issues](https://github.com/example/webgpt/issues)
- Email: support@webgpt.example.com
