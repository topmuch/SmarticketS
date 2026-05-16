#!/usr/bin/env bash
# Test script for AI Auto Translation (Feature #3)
# Usage: bash scripts/test-ai-translate.sh [BASE_URL]
BASE_URL="${1:-http://localhost:3000}"
echo "=== Testing Auto Translation ==="
# 1. Default (no Accept-Language) → should set cookie with 'fr'
echo "Test 1: No Accept-Language (expect fr cookie)..."
curl -sI "$BASE_URL/api/scan/TEST-REF" | grep -i "set-cookie.*qrtrans_locale"
# 2. English Accept-Language → should detect 'en'
echo -e "\nTest 2: Accept-Language: en (expect en cookie)..."
curl -sI -H "Accept-Language: en-US,en;q=0.9" "$BASE_URL/api/scan/TEST-REF" | grep -i "set-cookie.*qrtrans_locale"
# 3. Arabic Accept-Language → should detect 'ar'
echo -e "\nTest 3: Accept-Language: ar (expect ar cookie)..."
curl -sI -H "Accept-Language: ar-SA,ar;q=0.9" "$BASE_URL/api/scan/TEST-REF" | grep -i "set-cookie.*qrtrans_locale"
# 4. French Accept-Language → should detect 'fr'
echo -e "\nTest 4: Accept-Language: fr (expect fr cookie)..."
curl -sI -H "Accept-Language: fr-FR,fr;q=0.9" "$BASE_URL/api/scan/TEST-REF" | grep -i "set-cookie.*qrtrans_locale"
# 5. Unknown language → should fallback to 'fr'
echo -e "\nTest 5: Accept-Language: de (expect fr fallback)..."
curl -sI -H "Accept-Language: de-DE,de;q=0.9" "$BASE_URL/api/scan/TEST-REF" | grep -i "set-cookie.*qrtrans_locale"
# 6. Cookie persistence → send cookie back
echo -e "\nTest 6: Cookie persistence (send qrtrans_locale=ar)..."
curl -sI -H "Cookie: qrtrans_locale=ar" "$BASE_URL/api/scan/TEST-REF" | grep -i "set-cookie.*qrtrans_locale"
# 7. GET response body
echo -e "\nTest 7: Full GET response..."
curl -s "$BASE_URL/api/scan/TEST-REF" | jq .
echo -e "\n=== Auto Translation tests complete ==="
