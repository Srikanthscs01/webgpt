# Security Policy

## Overview

WebGPT is designed with security as a core principle. This document outlines our security practices, vulnerability reporting procedures, and data handling policies.

## Security Architecture

### Multi-Tenancy Isolation

- **Workspace Scoping**: All database queries are scoped by `workspaceId` derived from authentication context
- **No Client Trust**: `workspaceId` is never accepted from client input
- **Row-Level Security**: Critical operations enforce tenant boundaries at the query level

### Authentication & Authorization

#### Admin Portal (NextAuth)
- Email/password authentication with bcrypt password hashing (cost factor: 12)
- JWT session tokens with configurable expiration
- HttpOnly, Secure, SameSite cookies

#### API Authentication
- JWT tokens for admin access
- API keys for server-to-server communication
- API keys are hashed (SHA-256) before storage
- Keys are shown only once at creation

#### Widget Authentication
- Public `siteKey` for identification (not secret)
- Origin/Referer validation against allowed domains
- Rate limiting per IP and siteKey
- Anonymous visitor sessions with UUID

### Role-Based Access Control (RBAC)

| Role | Permissions |
|------|-------------|
| OWNER | Full access, manage workspace settings, billing, delete workspace |
| ADMIN | Manage users, sites, API keys, crawls, view analytics |
| MEMBER | Manage sites and content, start crawls, view analytics |
| VIEWER | Read-only access to sites and analytics |

## API Security

### Input Validation
- All inputs validated with Zod schemas
- Type coercion with strict validation
- Maximum length limits on all string fields
- Pattern validation for URLs, emails, colors

### Rate Limiting
- Configurable per-site rate limits
- Redis-backed distributed rate limiting
- Per-IP and per-siteKey limiting
- Burst protection with token bucket algorithm

### CORS Policy
- Admin portal: Restricted to configured origins
- Widget API: Validates against `WidgetConfig.allowedDomains`
- No wildcard (`*`) origins in production

### Request Security
- Request ID tracking for audit trails
- Structured logging with PII redaction
- Request timeout enforcement
- Maximum request body size limits

## Data Security

### Secrets Management
- Environment variables for all secrets
- Never expose `OPENAI_API_KEY` to clients
- API keys hashed before database storage
- Secrets excluded from logs and error responses

### Database Security
- Parameterized queries via Prisma ORM
- No raw SQL without explicit parameterization
- Connection encryption (SSL/TLS)
- Principle of least privilege for DB users

### Data at Rest
- Sensitive fields encrypted where applicable
- Regular automated backups
- Secure backup storage with encryption

### Data in Transit
- TLS 1.2+ for all connections
- HSTS headers in production
- Secure WebSocket connections

## Crawling Security

### Robots.txt Compliance
- Respects `robots.txt` directives by default
- Configurable per-site override
- Crawl-delay honored when specified

### Content Sanitization
- HTML content parsed with Readability
- Scripts and styles stripped
- Hidden text patterns detected and removed
- No external resource fetching from indexed content

### URL Validation
- Same-origin enforcement by default
- URL normalization to prevent duplicate crawling
- Tracking parameter removal
- Path traversal prevention

## Chat Security

### Prompt Injection Prevention
- System prompts instruct model to ignore injections
- Source content sanitization
- Hidden text pattern detection
- Response filtering for sensitive data

### Context Isolation
- Each chat scoped to specific site
- No cross-workspace data access
- Conversation history isolation
- Rate limiting on chat endpoints

### Safety Measures
- No external web browsing from LLM
- No secret leakage in responses
- Content filtering for harmful responses
- Logging of flagged content

## Audit Logging

### Logged Events
- User authentication (login/logout)
- API key creation/revocation
- Site creation/deletion
- Crawl start/cancel
- User role changes
- Settings modifications

### Log Security
- Structured JSON logging
- Request ID correlation
- PII redaction in logs
- Log retention policies
- Tamper-evident log storage

## Vulnerability Reporting

### Reporting Process

1. **Email**: Send details to security@webgpt.example.com
2. **Subject**: Use `[SECURITY]` prefix
3. **Include**:
   - Vulnerability description
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

| Stage | Timeframe |
|-------|-----------|
| Acknowledgment | 24 hours |
| Initial Assessment | 72 hours |
| Resolution (Critical) | 7 days |
| Resolution (High) | 30 days |
| Resolution (Medium/Low) | 90 days |

### Responsible Disclosure

- We practice coordinated disclosure
- Credit given to reporters (unless anonymity requested)
- No legal action against good-faith reporters
- Security advisories published after fix

## Security Hardening Checklist

### Production Deployment

- [ ] Set strong `NEXTAUTH_SECRET` (32+ random bytes)
- [ ] Enable HTTPS with valid certificates
- [ ] Configure restrictive CORS origins
- [ ] Set appropriate rate limits
- [ ] Enable database SSL
- [ ] Use production Redis with authentication
- [ ] Set up log aggregation
- [ ] Enable security headers (CSP, X-Frame-Options, etc.)
- [ ] Regular dependency updates
- [ ] Automated security scanning

### Environment Variables

```bash
# Required for production
NODE_ENV=production
NEXTAUTH_SECRET=<random-32-bytes>
NEXTAUTH_URL=https://admin.yourdomain.com

# Database (use SSL in production)
DATABASE_URL=postgres://user:pass@host:5432/db?sslmode=require

# Redis (use authentication)
REDIS_URL=redis://:password@host:6379

# OpenAI (never expose to client)
OPENAI_API_KEY=sk-...

# CORS (specific origins only)
ADMIN_CORS_ORIGIN=https://admin.yourdomain.com
API_CORS_ORIGINS=https://admin.yourdomain.com,https://www.yourclient.com
```

## Compliance Considerations

### GDPR
- Right to data export
- Right to deletion (soft delete with purge)
- Consent management for cookies
- Data processing agreements

### SOC 2
- Access controls documented
- Audit logging implemented
- Encryption at rest and in transit
- Regular security reviews

### HIPAA (if applicable)
- Business associate agreements
- PHI handling procedures
- Audit trail maintenance
- Access logging

## Security Updates

This document is reviewed and updated quarterly. Last updated: January 2026.

## Contact

- Security issues: security@webgpt.example.com
- General inquiries: support@webgpt.example.com
- PGP key: Available on request
