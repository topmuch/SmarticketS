#!/usr/bin/env bash
# Test script for AI Scan Guard Anti-Doublon (Feature #2)
# Usage: bash scripts/test-ai-scan-guard.sh [BASE_URL]
BASE_URL="${1:-http://localhost:3000}"
REF="TEST-GUARD-$(date +%s)"
echo "=== Testing Scan Guard Anti-Doublon ==="
echo "Reference: $REF"
# 1. First scan (should succeed)
echo "Test 1: First scan (expect 200)..."
curl -s -X POST "$BASE_URL/api/scan/$REF" -H "Content-Type: application/json" \
  -d '{"location":"Aéroport CDG","finderName":"Alice","finderPhone":"+33612345678"}' | jq .
# 2. Second scan from same IP within 30s (may be flagged by AI)
echo -e "\nTest 2: Second scan from same IP (may be flagged)..."
curl -s -X POST "$BASE_URL/api/scan/$REF" -H "Content-Type: application/json" \
  -d '{"location":"Aéroport CDG","finderName":"Bob","finderPhone":"+33698765432"}' | jq .
# 3. Non-existent reference
echo -e "\nTest 3: Non-existent reference (expect 404)..."
curl -s -X POST "$BASE_URL/api/scan/NONEXISTENT-999" -H "Content-Type: application/json" \
  -d '{"location":"Somewhere","finderName":"Test","finderPhone":"+33600000000"}' | jq .
# 4. GET scan info
echo -e "\nTest 4: GET scan info (expect baggage data or not_found)..."
curl -s "$BASE_URL/api/scan/$REF" | jq .
# 5. Check qrtrans_locale cookie is set
echo -e "\nTest 5: Check qrtrans_locale cookie..."
curl -sI "$BASE_URL/api/scan/$REF" | grep -i "set-cookie.*qrtrans_locale"
echo -e "\n=== Scan Guard tests complete ==="
