# ============================================
# SmartTicketQR — Production Deployment Guide
# ============================================

## Architecture

```
                    ┌──────────────┐
                    │   Internet   │
                    └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │  Caddy (TLS) │ :443
                    │  HTTP/3 QUIC │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────────┐
              │            │                │
     smartticketqr.com  api.*.com   signage.*.com
              │            │                │
              └────────────┼────────────────┘
                           │
                    ┌──────┴───────┐
                    │  Next.js App  │ :3000
                    │  (standalone) │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │                         │
       ┌──────┴───────┐       ┌───────┴──────┐
       │  PostgreSQL   │       │    Redis     │
       │   :5432      │       │    :6379     │
       └──────────────┘       └──────────────┘
```

## Prerequisites

- Server: Ubuntu 22.04+ (4 vCPU / 8 Go RAM minimum)
- Docker: >= 24.0
- Docker Compose: >= 2.20
- Domain: smartticketqr.com (with DNS A records)
- DNS Records:
  - `smartticketqr.com` → server IP
  - `api.smartticketqr.com` → server IP
  - `signage.smartticketqr.com` → server IP

## Quick Start

```bash
# 1. Clone
git clone https://github.com/votre-org/smartticketqr.git
cd smartticketqr

# 2. Configure environment
cp .env.production.example .env.production
nano .env.production  # Edit with your secrets!

# 3. Generate strong secrets
echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env.production
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 32)" >> .env.production
echo "DB_PASSWORD=$(openssl rand -hex 24)" >> .env.production
echo "REDIS_PASSWORD=$(openssl rand -hex 24)" >> .env.production

# 4. Start services
docker compose up -d

# 5. Run database migrations
docker compose exec app npx prisma migrate deploy

# 6. Seed initial data (first time only)
docker compose exec app npx prisma db seed

# 7. Verify
curl -s https://smartticketqr.com/api/health | python3 -m json.tool
```

## First-Time Setup

### 1. DNS Configuration

```
smartticketqr.com           A       your-server-ip
api.smartticketqr.com       A       your-server-ip
signage.smartticketqr.com   A       your-server-ip
```

### 2. Firewall (UFW)

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 443/udp   # HTTP/3 (QUIC)
sudo ufw enable
```

### 3. Environment Variables

Edit `.env.production` with production values:

| Variable | Required | Description |
|----------|----------|-------------|
| `DB_PASSWORD` | ✅ | Strong PostgreSQL password (32+ chars) |
| `JWT_SECRET` | ✅ | JWT access token secret (32+ chars) |
| `JWT_REFRESH_SECRET` | ✅ | JWT refresh token secret (32+ chars) |
| `REDIS_PASSWORD` | ✅ | Redis password (32+ chars) |
| `NEXT_PUBLIC_SUPPORT_PHONE` | ✅ | Support phone number |
| `NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER` | ✅ | WhatsApp business number |

### 4. TLS/HTTPS

Caddy automatically provisions Let's Encrypt certificates.
First certificate may take 1-2 minutes.

Verify:
```bash
curl -sI https://smartticketqr.com | head -5
# HTTP/2 200
# strict-transport-security: max-age=31536000; includeSubDomains
```

## Common Operations

### Database Migrations

```bash
# Apply pending migrations
docker compose exec app npx prisma migrate deploy

# Create a new migration (dev only)
docker compose exec app npx prisma migrate dev --name your_migration_name
```

### Manual Backup

```bash
# Using the backup script
./scripts/backup-db.sh

# Direct pg_dump
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker compose exec postgres pg_dump -U smartticketqr smartticketqr_prod -F c -b | gzip > "backups/manual_${TIMESTAMP}.dump.gz"
```

### Restore Backup

```bash
# Stop app
docker compose stop app

# Restore from latest backup
LATEST=$(ls -t backups/*.dump.gz | head -1)
gunzip -c "$LATEST" | docker compose exec -T postgres pg_restore -U smartticketqr -d smartticketqr_prod -c

# Restart app
docker compose start app
```

### View Logs

```bash
# All services
docker compose logs -f

# App only
docker compose logs -f app

# Database
docker compose logs -f postgres

# Last 100 lines
docker compose logs --tail=100 app
```

### Update Deployment

```bash
cd /opt/smartticketqr
git pull origin main
docker compose build --no-cache app
docker compose up -d --no-deps app
docker compose exec app npx prisma migrate deploy
```

### Health Check Script

```bash
./scripts/health-check.sh          # Standard check
./scripts/health-check.sh --verbose # Detailed output
```

### Scaling

```bash
# Scale app instances (requires load balancer or Redis session store)
docker compose up -d --scale app=3

# For >5000 tickets/jour, consider PostgreSQL read replicas
```

## Monitoring

### Health Check

```bash
curl -s https://smartticketqr.com/api/health | python3 -m json.tool
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "uptime": 86400,
  "checks": {
    "database": { "status": "ok", "latencyMs": 2 },
    "memory": { "usedMB": 128, "totalMB": 512, "percent": 25 }
  }
}
```

### Resource Monitoring

```bash
# Docker stats
docker stats --no-stream

# Disk usage
docker system df
du -sh /opt/smartticketqr/backups/
```

## Security Checklist

- [ ] `.env.production` file is NOT committed to git
- [ ] `DB_PASSWORD` is 32+ characters, random
- [ ] `JWT_SECRET` is 32+ characters, random
- [ ] `JWT_REFRESH_SECRET` is 32+ characters, random
- [ ] `REDIS_PASSWORD` is set and matches docker-compose
- [ ] HTTPS is active (TLS 1.3, verify with `curl -sI`)
- [ ] HSTS header is present with `includeSubDomains`
- [ ] Firewall allows only 22, 80, 443
- [ ] SSH uses keys (not passwords)
- [ ] Database is not exposed to the internet
- [ ] Redis is not exposed to the internet (password protected)
- [ ] Regular backups are running (check `backups/`)
- [ ] CSP headers are configured correctly
- [ ] `bun.lock` is committed for reproducible builds

## Troubleshooting

### App won't start

```bash
docker compose logs app --tail=50
# Check DATABASE_URL format
# Check JWT_SECRET is set
# Check REDIS_URL is correct
```

### Database connection failed

```bash
docker compose exec postgres pg_isready -U smartticketqr
docker compose logs postgres --tail=20
```

### Redis connection failed

```bash
docker compose exec redis redis-cli -a YOUR_PASSWORD ping
# Should return PONG
```

### TLS certificate issues

```bash
docker compose logs caddy --tail=50
# Check DNS records are correct
# Check ports 80/443 are open
# Check firewall allows HTTP/3 (443/udp)
```

### Memory issues

```bash
docker stats --no-stream
# Consider increasing Docker memory limit
# Check Redis maxmemory setting
```

## More Documentation

- [Runbook d'Exploitation](./docs/runbook.md) — Guide operationnel complet
- [Procedures de Rollback](./docs/rollback.md) — Retour en arriere en cas de probleme
