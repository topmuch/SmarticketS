#!/bin/bash
# ============================================
# SmartTicketQR — Production Health Check Script
# Usage: ./scripts/health-check.sh [--verbose]
# ============================================

set -euo pipefail

VERBOSE=false
[[ "${1:-}" == "--verbose" || "${1:-}" == "-v" ]] && VERBOSE=true

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

log_pass() { echo -e "  ${GREEN}✓ PASS${NC}  $1"; ((PASS++)); }
log_fail() { echo -e "  ${RED}✗ FAIL${NC}  $1"; ((FAIL++)); }
log_warn() { echo -e "  ${YELLOW}⚠ WARN${NC}  $1"; ((WARN++)); }
log_info() { echo -e "  ${CYAN}ℹ INFO${NC}  $1"; }

echo ""
echo "========================================="
echo "  SmartTicketQR — Health Check"
echo "  $(date -Iseconds)"
echo "========================================="
echo ""

# --- 1. Docker Services ---
echo "── Docker Services ─────────────────────"

services=("stqr-db" "stqr-redis" "stqr-app" "stqr-caddy")
for svc in "${services[@]}"; do
    STATUS=$(docker inspect -f '{{.State.Status}}' "$svc" 2>/dev/null || echo "missing")
    if [ "$STATUS" == "running" ]; then
        log_pass "$svc is running"
    else
        log_fail "$svc is NOT running (status: $STATUS)"
    fi
done

echo ""

# --- 2. Database ---
echo "── PostgreSQL ──────────────────────────"

DB_HEALTH=$(docker exec stqr-db pg_isready -U smartticketqr -d smartticketqr_prod 2>/dev/null || echo "FAILED")
if echo "$DB_HEALTH" | grep -q "accepting connections"; then
    log_pass "PostgreSQL is accepting connections"
else
    log_fail "PostgreSQL is NOT accepting connections: $DB_HEALTH"
fi

DB_SIZE=$(docker exec stqr-db psql -U smartticketqr -d smartticketqr_prod -t -c "SELECT pg_size_pretty(pg_database_size('smartticketqr_prod'));" 2>/dev/null | xargs || echo "?")
if [ "$DB_SIZE" != "?" ]; then
    log_info "Database size: $DB_SIZE"
fi

# Check indexes
INDEX_COUNT=$(docker exec stqr-db psql -U smartticketqr -d smartticketqr_prod -t -c "SELECT count(*) FROM pg_indexes WHERE schemaname = 'public';" 2>/dev/null | xargs || echo "?")
log_info "Indexes: ${INDEX_COUNT:-?} defined"

echo ""

# --- 3. Redis ---
echo "── Redis ──────────────────────────────"

REDIS_PING=$(docker exec stqr-redis redis-cli -a "${REDIS_PASSWORD:-stqr_redis_change_me}" ping 2>/dev/null || echo "FAILED")
if [ "$REDIS_PING" == "PONG" ]; then
    log_pass "Redis is responding"
else
    log_fail "Redis is NOT responding: $REDIS_PING"
fi

REDIS_MEMORY=$(docker exec stqr-redis redis-cli -a "${REDIS_PASSWORD:-stqr_redis_change_me}" info memory 2>/dev/null | grep "used_memory_human:" | cut -d: -f2 | xargs || echo "?")
log_info "Redis memory: ${REDIS_MEMORY:-?}"

REDIS_KEYS=$(docker exec stqr-redis redis-cli -a "${REDIS_PASSWORD:-stqr_redis_change_me}" dbsize 2>/dev/null | xargs || echo "?")
log_info "Redis keys: ${REDIS_KEYS:-?}"

echo ""

# --- 4. Application ---
echo "── Next.js Application ────────────────"

# Health endpoint
HEALTH=$(curl -sf --max-time 10 http://localhost:3000/api/health 2>/dev/null || echo "FAILED")
if echo "$HEALTH" | grep -q "ok\|healthy\|status"; then
    log_pass "/api/health returns 200"
    $VERBOSE && log_info "Response: $HEALTH"
else
    log_fail "/api/health NOT responding: $HEALTH"
fi

# Check response time
RESP_TIME=$(curl -so /dev/null -w '%{time_total}' --max-time 10 http://localhost:3000/api/health 2>/dev/null || echo "999")
if (( $(echo "$RESP_TIME < 2.0" | bc -l 2>/dev/null || echo 0) )); then
    log_pass "Response time: ${RESP_TIME}s (< 2s)"
else
    log_warn "Response time: ${RESP_TIME}s (≥ 2s)"
fi

echo ""

# --- 5. Caddy / TLS ---
echo "── Caddy & TLS ────────────────────────"

# Check if Caddy is serving HTTPS
TLS_CHECK=$(curl -sI --max-time 10 https://smartticketqr.com 2>/dev/null | grep -i "strict-transport\|HTTP/2\|HTTP/3" || echo "")
if [ -n "$TLS_CHECK" ]; then
    log_pass "HTTPS + HSTS active on smartticketqr.com"
else
    log_warn "HTTPS check skipped (domain may not resolve locally)"
fi

# Check security headers
SECURITY_HEADERS=$(curl -sI --max-time 10 https://smartticketqr.com 2>/dev/null || echo "")
for HEADER in "strict-transport" "x-content-type-options" "x-frame-options" "referrer-policy"; do
    if echo "$SECURITY_HEADERS" | grep -qi "$HEADER"; then
        log_pass "Header $HEADER present"
    else
        $VERBOSE && log_warn "Header $HEADER not found (domain may not resolve locally)"
    fi
done

echo ""

# --- 6. Disk & Backups ---
echo "── Disk & Backups ─────────────────────"

# Disk usage
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$DISK_USAGE" -lt 80 ]; then
    log_pass "Disk usage: ${DISK_USAGE}% (< 80%)"
elif [ "$DISK_USAGE" -lt 90 ]; then
    log_warn "Disk usage: ${DISK_USAGE}% (80-90%, consider cleanup)"
else
    log_fail "Disk usage: ${DISK_USAGE}% (> 90%, CRITICAL)"
fi

# Backup existence
BACKUP_COUNT=$(ls -1 ./backups/*.dump.gz 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 0 ]; then
    LATEST=$(ls -t ./backups/*.dump.gz 2>/dev/null | head -1)
    LATEST_AGE=$(( ( $(date +%s) - $(stat -c %Y "$LATEST" 2>/dev/null || echo 0) ) / 3600 ))
    log_pass "Backups: $BACKUP_COUNT found, latest ${LATEST_AGE}h ago"
else
    log_warn "No backup files found in ./backups/"
fi

echo ""

# --- 7. Docker Resource Usage ---
echo "── Docker Resources ───────────────────"

for svc in "${services[@]}"; do
    MEM=$(docker stats --no-stream --format "{{.MemUsage}}" "$svc" 2>/dev/null || echo "N/A")
    CPU=$(docker stats --no-stream --format "{{.CPUPerc}}" "$svc" 2>/dev/null || echo "N/A")
    if [ "$MEM" != "N/A" ]; then
        log_info "$svc: CPU=${CPU} MEM=${MEM}"
    fi
done

echo ""

# --- Summary ---
echo "========================================="
echo -e "  Results: ${GREEN}${PASS} passed${NC} / ${YELLOW}${WARN} warnings${NC} / ${RED}${FAIL} failed${NC}"
echo "========================================="
echo ""

# Exit with failure if any critical checks failed
if [ "$FAIL" -gt 0 ]; then
    exit 1
fi
exit 0
