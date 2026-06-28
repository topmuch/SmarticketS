#!/bin/bash
# ──────────────────────────────────────────────────────────────
# deploy-services.sh — Deploy & manage SmarticketS mini-services
# ──────────────────────────────────────────────────────────────
# Usage:
#   ./scripts/deploy-services.sh start      # Start all services
#   ./scripts/deploy-services.sh stop       # Stop all services
#   ./scripts/deploy-services.sh restart    # Restart all services
#   ./scripts/deploy-services.sh status     # Show status
#   ./scripts/deploy-services.sh logs       # Tail all logs
#   ./scripts/deploy-services.sh install     # Install PM2 + setup startup
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo -e "${CYAN}[INFO]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_err()   { echo -e "${RED}[ERR]${NC} $1"; }

SERVICES=("kiosk-service" "alert-service")

check_pm2() {
  if command -v pm2 >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

install_pm2() {
  log_info "Installing PM2 globally..."
  npm install -g pm2
  if [ $? -eq 0 ]; then
    log_ok "PM2 installed successfully"
  else
    log_err "Failed to install PM2"
    exit 1
  fi
}

do_start() {
  cd "$PROJECT_DIR"
  
  if ! check_pm2; then
    install_pm2
  fi

  # Install mini-service dependencies
  for svc in "${SERVICES[@]}"; do
    local svc_dir="$PROJECT_DIR/mini-services/$svc"
    if [ -d "$svc_dir" ] && [ -f "$svc_dir/package.json" ]; then
      log_info "Installing dependencies for $svc..."
      cd "$svc_dir" && bun install && cd "$PROJECT_DIR"
    fi
  done

  log_info "Starting all mini-services with PM2..."
  pm2 start ecosystem.config.js
  
  log_info "Saving PM2 process list..."
  pm2 save
  
  log_ok "All mini-services started. Use 'pm2 monit' to monitor."
}

do_stop() {
  cd "$PROJECT_DIR"
  log_info "Stopping all mini-services..."
  pm2 delete ecosystem.config.js 2>/dev/null || pm2 stop all
  log_ok "All mini-services stopped."
}

do_restart() {
  do_stop
  sleep 2
  do_start
}

do_status() {
  echo ""
  echo "═══════════════════════════════════════════════"
  echo "  SmarticketS — Mini-Services Status"
  echo "═══════════════════════════════════════════════"
  echo ""

  if ! check_pm2; then
    log_err "PM2 is not installed. Run: ./scripts/deploy-services.sh install"
    return
  fi

  pm2 list

  echo ""
  echo "───────────────────────────────────────────────"
  echo "  Port Checks"
  echo "───────────────────────────────────────────────"

  # Check kiosk service (port 3004)
  if ss -tlnp 2>/dev/null | grep -q ':3004 '; then
    log_ok "Kiosk service (port 3004): LISTENING"
  else
    log_err "Kiosk service (port 3004): NOT LISTENING"
  fi

  # Check alert service (port 3003)
  if ss -tlnp 2>/dev/null | grep -q ':3003 '; then
    log_ok "Alert service (port 3003): LISTENING"
  else
    log_err "Alert service (port 3003): NOT LISTENING"
  fi

  echo ""
}

do_logs() {
  if ! check_pm2; then
    log_err "PM2 is not installed."
    return
  fi
  pm2 logs --lines 50
}

do_install() {
  if ! check_pm2; then
    install_pm2
  else
    log_ok "PM2 already installed"
  fi

  log_info "Setting up PM2 startup script..."
  pm2 startup 2>/dev/null || log_warn "pm2 startup may need sudo"
  
  log_info "Starting all services and saving process list..."
  cd "$PROJECT_DIR"
  pm2 start ecosystem.config.js
  pm2 save
  
  echo ""
  log_ok "Setup complete!"
  echo ""
  echo "  Commands:"
  echo "    pm2 list              — View running services"
  echo "    pm2 logs               — View logs"
  echo "    pm2 monit              — Monitor dashboard"
  echo "    pm2 restart all        — Restart all services"
  echo ""
}

# ── Main ──
case "${1:-}" in
  start)
    do_start
    ;;
  stop)
    do_stop
    ;;
  restart)
    do_restart
    ;;
  status)
    do_status
    ;;
  logs)
    do_logs
    ;;
  install)
    do_install
    ;;
  *)
    echo ""
    echo "Usage: $0 {start|stop|restart|status|logs|install}"
    echo ""
    echo "Commands:"
    echo "  start    — Start all mini-services with PM2"
    echo "  stop     — Stop all mini-services"
    echo "  restart  — Restart all mini-services"
    echo "  status   — Show service status + port checks"
    echo "  logs     — Tail PM2 logs"
    echo "  install  — Install PM2 + setup auto-start on reboot"
    echo ""
    ;;
esac
