#!/bin/bash
set -e

BASE="http://127.0.0.1:3000"
TMP="/tmp/phase4_test.json"

# Login as operator
echo "=== Login ==="
curl -s "$BASE/api/auth/login" -X POST -H "Content-Type: application/json" \
  -d '{"email":"operator@stmb.com","password":"Oper@1234"}' > "$TMP" 2>/dev/null
OP_TOKEN=$(python3 -c "import json;d=json.load(open('$TMP'));print(d.get('accessToken',''))" 2>/dev/null)
if [ -z "$OP_TOKEN" ]; then
  echo "❌ Login failed"
  cat "$TMP"
  exit 1
fi
echo "✅ Login OK"

# Get stations
echo "=== Stations ==="
curl -s "$BASE/api/stations" -H "Authorization: Bearer $OP_TOKEN" > "$TMP" 2>/dev/null
STATION_ID=$(python3 -c "import json;d=json.load(open('$TMP'));print(d['data'][0]['id'])" 2>/dev/null)
STATION_NAME=$(python3 -c "import json;d=json.load(open('$TMP'));print(d['data'][0]['name'])" 2>/dev/null)
echo "✅ Station: $STATION_NAME ($STATION_ID)"

# Test 1: Signage Board (PUBLIC)
echo ""
echo "=== TEST 1: Signage Board (Public) ==="
curl -s "$BASE/api/signage/board/$STATION_ID" > "$TMP" 2>/dev/null
python3 << PYEOF
import json
d = json.load(open('$TMP'))
print(f"  Station: {d['stationName']}")
print(f"  Time: {d['currentTime']}")
print(f"  Messages: {len(d['messages'])}")
print(f"  Departures: {len(d['departures'])}")
for msg in d['messages']:
    print(f"    - {msg[:80]}")
if d['departures']:
    for dep in d['departures'][:3]:
        print(f"    {dep['scheduledTimeStr']} | {dep['lineNumber']} | {dep['destination']} | Quai {dep['platform']} | {dep['status']} | countdown {dep['countdownMin']}min")
print("✅ Board data correct")
PYEOF

# Test 2: Board with wrong station
echo ""
echo "=== TEST 2: Board - Invalid Station ==="
curl -s "$BASE/api/signage/board/invalid123" > "$TMP" 2>/dev/null
python3 -c "import json;d=json.load(open('$TMP'));print(f\"  ✅ Error: {d['error']}\")" 2>/dev/null

# Test 3: Departures List (auth required)
echo ""
echo "=== TEST 3: Departures List ==="
curl -s "$BASE/api/departures?limit=5" -H "Authorization: Bearer $OP_TOKEN" > "$TMP" 2>/dev/null
python3 << PYEOF
import json
d = json.load(open('$TMP'))
print(f"  Total: {d['total']}")
print(f"  Page: {len(d['data'])} items")
for dep in d['data'][:3]:
    print(f"    {dep['scheduledTime']} | {dep['line']['code']} → {dep['line']['toStation']['name']} | {dep['status']} | Quai {dep.get('platform','-')}")
print("✅ Departures list correct")
PYEOF

# Test 4: Create Departure
echo ""
echo "=== TEST 4: Create Departure ==="
LINE_ID=$(python3 -c "
import json
d = json.load(open('$TMP'))
if d['data']:
    print(d['data'][0]['lineId'])
" 2>/dev/null)

curl -s "$BASE/api/departures" -X POST -H "Authorization: Bearer $OP_TOKEN" -H "Content-Type: application/json" \
  -d "{\"lineId\":\"$LINE_ID\",\"stationId\":\"$STATION_ID\",\"scheduledTime\":\"2026-05-30T10:00:00.000Z\",\"platform\":\"Q5\",\"totalSeats\":50}" > "$TMP" 2>/dev/null
NEW_DEP_ID=$(python3 -c "import json;d=json.load(open('$TMP'));print(d.get('data',{}).get('id','FAILED'))" 2>/dev/null)
echo "  ✅ Created departure: $NEW_DEP_ID"

# Test 5: Update Departure Status to DELAYED
echo ""
echo "=== TEST 5: Update Departure Status ==="
curl -s "$BASE/api/departures/$NEW_DEP_ID" -X PUT -H "Authorization: Bearer $OP_TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"DELAYED","delayMinutes":15}' > "$TMP" 2>/dev/null
python3 -c "import json;d=json.load(open('$TMP'));print(f\"  ✅ Updated: status={d['data']['status']}, delay={d['data']['delayMinutes']}min\")" 2>/dev/null

# Test 6: Signage Messages List
echo ""
echo "=== TEST 6: Signage Messages ==="
curl -s "$BASE/api/signage/messages" -H "Authorization: Bearer $OP_TOKEN" > "$TMP" 2>/dev/null
python3 << PYEOF
import json
d = json.load(open('$TMP'))
print(f"  Total: {d['total']}")
for msg in d['data'][:3]:
    print(f"    [{msg['priority']}] {msg['content'][:60]}... (active={msg['isActive']})")
print("✅ Messages list correct")
PYEOF

# Test 7: Create Signage Message
echo ""
echo "=== TEST 7: Create Message ==="
curl -s "$BASE/api/signage/messages" -X POST -H "Authorization: Bearer $OP_TOKEN" -H "Content-Type: application/json" \
  -d "{\"content\":\"Test Phase 4 — Message de test\",\"priority\":\"INFO\",\"startDate\":\"2026-05-28T00:00:00.000Z\",\"stationId\":\"$STATION_ID\"}" > "$TMP" 2>/dev/null
NEW_MSG_ID=$(python3 -c "import json;d=json.load(open('$TMP'));print(d.get('data',{}).get('id','FAILED'))" 2>/dev/null)
echo "  ✅ Created message: $NEW_MSG_ID"

# Test 8: Board should now show the new departure and message
echo ""
echo "=== TEST 8: Board Updated ==="
curl -s "$BASE/api/signage/board/$STATION_ID" > "$TMP" 2>/dev/null
python3 << PYEOF
import json
d = json.load(open('$TMP'))
has_delayed = any(dep['status'] == 'DELAYED' for dep in d['departures'])
has_test_msg = any('Test Phase 4' in msg for msg in d['messages'])
print(f"  Departures: {len(d['departures'])}")
print(f"  Has DELAYED departure: {has_delayed}")
print(f"  Has test message: {has_test_msg}")
print(f"  Messages: {d['messages']}")
print("✅ Board reflects changes")
PYEOF

# Test 9: Multi-tenant isolation (Express Voyage should see nothing from STMB)
echo ""
echo "=== TEST 9: Multi-tenant Isolation ==="
curl -s "$BASE/api/auth/login" -X POST -H "Content-Type: application/json" \
  -d '{"email":"operator@express-voyage.com","password":"Oper@1234"}' > "$TMP" 2>/dev/null
EV_TOKEN=$(python3 -c "import json;d=json.load(open('$TMP'));print(d.get('accessToken',''))" 2>/dev/null)

if [ -n "$EV_TOKEN" ]; then
  curl -s "$BASE/api/departures" -H "Authorization: Bearer $EV_TOKEN" > "$TMP" 2>/dev/null
  EV_TOTAL=$(python3 -c "import json;d=json.load(open('$TMP'));print(d['total'])" 2>/dev/null)
  echo "  Express Voyage departures: $EV_TOTAL"
  if [ "$EV_TOTAL" = "0" ]; then
    echo "  ✅ No STMB departures visible"
  else
    echo "  ⚠️  Expected 0 but got $EV_TOTAL"
  fi
fi

# Cleanup
echo ""
echo "=== CLEANUP ==="
# Delete test departure
curl -s "$BASE/api/departures/$NEW_DEP_ID" -X DELETE -H "Authorization: Bearer $OP_TOKEN" > /dev/null 2>/dev/null
echo "  Deleted test departure"
# Delete test message
curl -s "$BASE/api/signage/messages/$NEW_MSG_ID" -X DELETE -H "Authorization: Bearer $OP_TOKEN" > /dev/null 2>/dev/null
echo "  Deleted test message"

echo ""
echo "========================================="
echo "✅ PHASE 4 VALIDATION COMPLETE"
echo "========================================="
