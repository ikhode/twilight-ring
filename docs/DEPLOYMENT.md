# Nexus ERP: Production Deployment Guide

This guide details the procedure for deploying Nexus ERP to a professional production environment.

## 🏗️ Environment Setup

### 1. Supabase Provisioning
- Create a new project in the Supabase Dashboard.
- Enable **Auth** with Email/Password (and optionally Google/GitHub).
- Configure **PostgreSQL** extensions: `uuid-ossp`, `pg_stat_statements`.
- Apply all migrations in order: `supabase/migrations/*.sql`.

### 2. Secrets Management
Define the following environment variables in your hosting provider (Vercel, Railway, etc.):
- `DATABASE_URL`: Full Postgres connection string.
- `SUPABASE_URL`: Your project URL.
- `SUPABASE_ANON_KEY`: Public anon key.
- `SUPABASE_SERVICE_ROLE_KEY`: **SECRET** service role key (Backend only).
- `SESSION_SECRET`: Random 32+ character string.
- `NODE_ENV`: Set to `production`.

## 🛡️ Security Checklist
- [ ] **RLS Audit**: Run the validation queries to ensure all tables have RLS enabled.
- [ ] **Rate Limiting**: Verify that the `rateLimit` middleware is active in `server/index.ts`.
- [ ] **JWT**: Ensure cookies are configured as `HttpOnly` and `Secure`.
- [ ] **CORS**: Configure allowed origins if the frontend and backend are on different domains.

## 📊 Maintenance & Monitoring
- **Health Checks**: Monitor `GET /health` for uptime and memory usage.
- **Logs**: Integrate an external logging service (Sentry) by updating `server/lib/observability.ts`.
- **Backups**: Enable Supabase daily backups.

## ⚡ Performance
- Ensure all indexes verified in the `optimize_lending_indexes` migration are present.
- Monitor slow queries via the Supabase Dashboard.
