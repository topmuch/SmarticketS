#!/bin/bash
cd "$(dirname "$0")/mini-services/kiosk-service" && setsid bun index.ts > /tmp/kiosk-service.log 2>&1 < /dev/null &
cd "$(dirname "$0")/mini-services/alert-service" && setsid bun index.ts > /tmp/alert-service.log 2>&1 < /dev/null &
echo "Services starting..."
sleep 2
echo "Kiosk-service (3004): $(lsof -i :3004 2>/dev/null | grep LISTEN | wc -l) listener(s)"
echo "Alert-service (3003): $(lsof -i :3003 2>/dev/null | grep LISTEN | wc -l) listener(s)"
